import re
import json
import asyncio
from decimal import Decimal
from typing import Optional
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup
from fake_useragent import UserAgent
from core.config import get_settings

ua = UserAgent()


class ScraperService:
    def __init__(self):
        self.timeout = httpx.Timeout(7.0, connect=2.0, read=3.0)
        self.headers = {"User-Agent": ua.random}

    async def parse_url(self, url: str) -> dict:
        # 1. SSRF Protection
        if not self._is_safe_url(url):
            return {"url": url, "currency": "BYN"}

        domain = urlparse(url).netloc.lower()

        # 2. Выбор стратегии
        try:
            if "wildberries" in domain:
                return await self._parse_wildberries(url)
            else:
                return await self._parse_generic(url)
        except Exception as e:
            # Fallback при любой ошибке — возвращаем пустые данные
            return {"url": url, "currency": "BYN"}

    def _is_safe_url(self, url: str) -> bool:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        host = parsed.hostname.lower() if parsed.hostname else ""
        # Запрет локальных адресов
        forbidden = ("localhost", "127.0.0.1", "0.0.0.0", "192.168.", "10.", "172.16.")
        return not any(host.startswith(f) for f in forbidden)

    async def _parse_wildberries(self, url: str) -> dict:
        # Извлекаем SKU (артикул) из ссылки
        match = re.search(r"catalog/(\+?\d+)/detail", url)
        if not match:
            return await self._parse_generic(url)

        sku = match.group(1)
        # API WB для получения деталей (используем корзины)
        api_url = f"https://card.wb.ru/cards/v1/detail?appType=1&curr=byn&dest=-1257786&spp=30&nm={sku}"

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(api_url, headers=self.headers)
            if resp.status_code != 200:
                return await self._parse_generic(url)

            data = resp.json()
            products = data.get("data", {}).get("products", [])
            if not products:
                return {"url": url, "currency": "BYN"}

            p = products[0]
            # Генерация ссылки на фото для WB (упрощенно)
            vol = int(sku) // 100000
            part = int(sku) // 1000
            # Выбор хоста (обычно basket-01...15)
            basket = f"{p.get('dist', 1):02d}"
            img_url = f"https://basket-{basket}.wb.ru/vol{vol}/part{part}/{sku}/images/big/1.webp"

            return {
                "title": p.get("name"),
                "price": Decimal(str(p.get("salePriceU", 0))) / 100,
                "currency": "BYN",
                "image_url": img_url,
                "url": url
            }

    async def _parse_generic(self, url: str) -> dict:
        async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
            resp = await client.get(url, headers=self.headers)
            if resp.status_code != 200:
                return {"url": url, "currency": "BYN"}

            html = resp.text
            soup = BeautifulSoup(html, "lxml")

            result = {
                "title": self._get_title(soup),
                "price": self._get_price(soup),
                "currency": "BYN",  # Default
                "image_url": self._get_image(soup, url),
                "url": url
            }
            return result

    def _get_title(self, soup: BeautifulSoup) -> Optional[str]:
        # JSON-LD -> OpenGraph -> Title tag
        # 1. JSON-LD
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string)
                if data.get("@type") == "Product":
                    return data.get("name")
            except:
                continue

        # 2. OpenGraph
        og_title = soup.find("meta", property="og:title")
        if og_title: return og_title.get("content")

        # 3. DOM
        title_tag = soup.find("title")
        return title_tag.string.strip() if title_tag else None

    def _get_price(self, soup: BeautifulSoup) -> Optional[Decimal]:
        # Поиск цены в JSON-LD
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string)
                if data.get("@type") == "Product":
                    offers = data.get("offers")
                    if isinstance(offers, dict): return self._clean_price(offers.get("price"))
                    if isinstance(offers, list): return self._clean_price(offers[0].get("price"))
            except:
                continue

        # Поиск в OpenGraph
        og_price = soup.find("meta", property="product:price:amount") or soup.find("meta", property="og:price:amount")
        if og_price: return self._clean_price(og_price.get("content"))

        return None

    def _get_image(self, soup: BeautifulSoup, base_url: str) -> Optional[str]:
        og_img = soup.find("meta", property="og:image")
        img_path = og_img.get("content") if og_img else None

        if not img_path:
            # Fallback: первая большая картинка
            img_tag = soup.find("img")
            img_path = img_tag.get("src") if img_tag else None

        if img_path:
            return urljoin(base_url, img_path)
        return None

    def _clean_price(self, raw_price) -> Optional[Decimal]:
        if raw_price is None: return None
        # Очистка строки от всего кроме цифр и точек/запятых
        s = str(raw_price).replace(",", ".").replace("\xa0", "").replace(" ", "")
        match = re.search(r"(\d+\.?\d*)", s)
        if match:
            try:
                return Decimal(match.group(1))
            except:
                return None
        return None