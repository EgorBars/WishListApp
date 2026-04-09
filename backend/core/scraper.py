import re
import json
import asyncio
import logging
from decimal import Decimal
from typing import Optional
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup
from fake_useragent import UserAgent
from core.config import get_settings
from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)
ua = UserAgent()


class ScraperService:
    def __init__(self):
        self.timeout = httpx.Timeout(7.0, connect=2.0, read=3.0)
        self.headers = {"User-Agent": ua.random}
        self.playwright_available = True

    async def parse_url(self, url: str) -> dict:
        # 1. SSRF Protection
        if not self._is_safe_url(url):
            logger.warning(f"Unsafe URL attempted: {url}")
            return {"url": url, "currency": "BYN"}

        # 2. Для Wildberries используем Playwright (для рендеринга JS), для других - простой парсинг
        try:
            domain = urlparse(url).netloc.lower()
            if "wildberries" in domain and self.playwright_available:
                return await self._parse_with_playwright(url)
            else:
                return await self._parse_generic(url)
        except Exception as e:
            logger.error(f"Fatal parsing error for {url}: {str(e)}", exc_info=True)
            try:
                # Fallback на обычный парсинг
                return await self._parse_generic(url)
            except:
                return {"url": url, "currency": "BYN"}

    def _is_safe_url(self, url: str) -> bool:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        host = parsed.hostname.lower() if parsed.hostname else ""
        forbidden = ("localhost", "127.0.0.1", "0.0.0.0", "192.168.", "10.", "172.16.")
        return not any(host.startswith(f) for f in forbidden)

    async def _parse_with_playwright(self, url: str) -> dict:
        """Используем Playwright для рендеринга JavaScript (для Wildberries и SPA)"""
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(
                    headless=True,
                    args=[
                        "--disable-blink-features=AutomationControlled",
                        "--no-sandbox",
                        "--disable-setuid-sandbox"
                    ]
                )
                page = await browser.new_page()
                # Увеличиваем timeout до 30 секунд для тяжелых SPA
                page.set_default_timeout(30000)
                
                # Устанавливаем User-Agent
                await page.set_extra_http_headers(self.headers)
                
                # Загружаем страницу с ожиданием DOM (быстрее чем networkidle)
                try:
                    await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                    logger.debug("Page loaded with domcontentloaded")
                except Exception as e:
                    logger.warning(f"Goto with domcontentloaded failed: {str(e)}, trying with load")
                    try:
                        await page.goto(url, wait_until="load", timeout=30000)
                        logger.debug("Page loaded with wait_until='load'")
                    except Exception as e2:
                        logger.error(f"Goto with load also failed: {str(e2)}")
                        raise
                
                # Даем время на загрузку React/Vue компонентов
                await page.wait_for_timeout(2000)
                logger.debug("Waited 2 seconds for component loading")
                
                # Ищем элемент с ценой (для WB это элемент с классом priceBlockFinalPrice)
                try:
                    await page.wait_for_selector("[class*='priceBlockFinalPrice']", timeout=10000)
                    logger.info("Found price element on the page")
                except Exception as e:
                    logger.warning(f"Price element selector timeout: {str(e)}, continuing anyway")
                
                # Ищем элемент с названием
                try:
                    title_found = await page.query_selector("[class*='colorImage']")
                    if title_found:
                        logger.info("Found colorImage element on the page")
                except Exception as e:
                    logger.debug(f"Could not query colorImage selector: {str(e)}")
                
                # Скроллим вниз немного чтобы убедиться что все загружено
                try:
                    await page.evaluate("window.scrollBy(0, 500)")
                    await page.wait_for_timeout(1000)
                    logger.debug("Scrolled down and waiting")
                except:
                    pass
                
                # Получаем HTML после рендеринга
                html = await page.content()
                
                await browser.close()
                
                # Логируем размер HTML для отладки
                logger.debug(f"Received HTML size: {len(html)} bytes")
                
                # Сохраняем HTML для отладки если очень мало контента
                if len(html) < 10000:
                    logger.warning(f"HTML seems too small ({len(html)} bytes), might be incomplete:")
                    logger.warning(f"HTML preview: {html[:1000]}")
                
                soup = BeautifulSoup(html, "lxml")
                
                title = self._get_title(soup)
                price = self._get_price(soup)
                image_url = self._get_image(soup, url)
                
                logger.info(f"Parsed (Playwright) {url}: title={title[:50] if title else None}, price={price}, image={image_url is not None}")
                
                return {
                    "title": title,
                    "price": price,
                    "currency": "BYN",
                    "image_url": image_url,
                    "url": url
                }
        except Exception as e:
            logger.error(f"Playwright error for {url}: {str(e)}", exc_info=True)
            # Fallback на обычный парсинг
            return await self._parse_generic(url)

    async def _parse_generic(self, url: str) -> dict:
        async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
            try:
                resp = await client.get(url, headers=self.headers)
                if resp.status_code != 200:
                    logger.warning(f"Wrong status code {resp.status_code} for {url}")
                    return {"url": url, "currency": "BYN"}

                html = resp.text
                soup = BeautifulSoup(html, "lxml")

                title = self._get_title(soup)
                price = self._get_price(soup)
                image_url = self._get_image(soup, url)
                
                logger.info(f"Parsed {url}: title={title}, price={price}, image={image_url is not None}")

                result = {
                    "title": title,
                    "price": price,
                    "currency": "BYN",
                    "image_url": image_url,
                    "url": url
                }
                return result
            except Exception as e:
                logger.error(f"Error parsing {url}: {str(e)}", exc_info=True)
                return {"url": url, "currency": "BYN"}

    def _get_title(self, soup: BeautifulSoup) -> Optional[str]:
        logger.debug("=" * 80)
        logger.debug("SEARCHING FOR TITLE")
        logger.debug("=" * 80)
        
        # 1. Wildberries - img с class="colorImage" (используем alt атрибут)
        logger.debug("1. Searching for img.colorImage...")
        wb_img = soup.find("img", class_=lambda x: x and "colorImage" in x)
        if wb_img and wb_img.get("alt"):
            title = wb_img.get("alt").strip()
            if title and len(title) > 0 and len(title) < 500:
                logger.info(f"✓ Found title from colorImage alt: {title[:100]}")
                return title
        logger.debug("✗ Not found via colorImage")

        # 2. Ищем по data-qa атрибуту для WB - более специфичные варианты
        logger.debug("2. Searching by data-qa attributes...")
        for data_qa in ["product-title", "product-name", "productTitle", "productName", "detail-title"]:
            logger.debug(f"  Trying data-qa='{data_qa}'...")
            title_elem = soup.find(attrs={"data-qa": data_qa})
            if title_elem:
                title = title_elem.get_text(strip=True)
                if title and len(title) > 0 and len(title) < 500:
                    logger.info(f"✓ Found title via data-qa='{data_qa}': {title[:100]}")
                    return title

        # 2b. Ищем элементы с классами содержащими 'title' или 'name' в WB
        logger.debug("3. Searching by class containing 'title' or 'name'...")
        for elem in soup.find_all(attrs={"class": lambda x: x and ("product-title" in str(x).lower() or "product-name" in str(x).lower()) }):
            title = elem.get_text(strip=True)
            if title and len(title) > 10 and len(title) < 500:
                logger.info(f"✓ Found title via class: {title[:100]}")
                return title

        # 3. JSON-LD
        logger.debug("4. Searching in JSON-LD...")
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                if not script.string:
                    continue
                data = json.loads(script.string)
                if data.get("@type") == "Product":
                    name = data.get("name")
                    if name and len(str(name).strip()) > 0:
                        logger.info(f"✓ Found title in JSON-LD: {str(name).strip()[:100]}")
                        return str(name).strip()
            except Exception as e:
                logger.debug(f"JSON-LD parsing error: {str(e)}")
                continue

        # 4. DOM - h1, h2, h3 tags (before og:title as they're usually more specific)
        logger.debug("5. Searching in h1/h2/h3 tags...")
        for tag in soup.find_all(["h1", "h2", "h3"]):
            title = tag.get_text(strip=True)
            # Minimum 10 chars to avoid picking up short labels like "Валюта", "Цена" etc.
            # Maximum 500 to avoid picking up long multi-section text
            if title and len(title) > 10 and len(title) < 500:
                logger.info(f"✓ Found title in {tag.name}: {title[:100]}")
                return title
            elif title and len(title) <= 10:
                logger.debug(f"✗ {tag.name} text too short: {title}")

        # 5. Title tag (before og:title as it's usually page-specific)
        logger.debug("6. Searching in <title> tag...")
        title_tag = soup.find("title")
        if title_tag and title_tag.string:
            title = title_tag.string.strip()
            # Filter out generic site-wide titles (if it only contains site name + generic phrase)
            if len(title) > 5 and not self._is_generic_title(title):
                logger.info(f"✓ Found title in <title>: {title[:100]}")
                return title
            logger.debug(f"✗ Title tag seems generic: {title[:100]}")

        # 6. OpenGraph (fallback, as it can be generic on some pages)
        logger.debug("7. Searching in OpenGraph meta tags...")
        og_title = soup.find("meta", property="og:title")
        if og_title:
            title = og_title.get("content")
            if title and not self._is_generic_title(str(title).strip()):
                logger.info(f"✓ Found title in OpenGraph: {str(title).strip()[:100]}")
                return str(title).strip()
            logger.debug(f"✗ og:title seems generic: {str(title).strip()[:100] if title else 'None'}")

        logger.warning("✗✗✗ NO TITLE FOUND ✗✗✗")
        logger.warning("Dumping page structure for debugging...")
        
        # Dump all tags with text
        for tag in soup.find_all(["h1", "h2", "h3", "h4", "div", "span", "p"])[:20]:
            text = tag.get_text(strip=True)[:100]
            if text:
                logger.warning(f"  {tag.name} class={tag.get('class')} data-qa={tag.get('data-qa')}: {text}")
        
        return None

    def _get_price(self, soup: BeautifulSoup) -> Optional[Decimal]:
        # 1. Wildberries - ищем любые элементы с классом содержащим "priceBlockFinalPrice"
        # Может быть ins, span, div с любыми модификаторами класса
        price_elem = soup.find(class_=lambda x: x and "priceBlockFinalPrice" in x)
        if price_elem:
            price_text = price_elem.get_text(strip=True)
            logger.debug(f"Found price element: {price_text}")
            cleaned = self._clean_price(price_text)
            if cleaned and cleaned > 0:
                logger.debug(f"Cleaned price: {cleaned}")
                return cleaned

        # 2. Ищем по атрибутам data-* для SPA приложений
        for elem in soup.find_all(attrs={"data-qa": lambda x: x and "price" in str(x).lower()}):
            price_text = elem.get_text(strip=True)
            cleaned = self._clean_price(price_text)
            if cleaned and cleaned > 0:
                logger.debug(f"Found price via data-qa: {cleaned}")
                return cleaned

        # 3. Поиск цены в JSON-LD
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                if not script.string:
                    continue
                data = json.loads(script.string)
                if data.get("@type") == "Product":
                    offers = data.get("offers")
                    if isinstance(offers, dict): 
                        price = self._clean_price(offers.get("price"))
                        if price and price > 0:
                            logger.debug(f"Found price in JSON-LD: {price}")
                            return price
                    if isinstance(offers, list) and offers: 
                        price = self._clean_price(offers[0].get("price"))
                        if price and price > 0:
                            logger.debug(f"Found price in JSON-LD list: {price}")
                            return price
            except:
                continue

        # 4. Поиск в OpenGraph
        og_price = soup.find("meta", property="product:price:amount") or soup.find("meta", property="og:price:amount")
        if og_price:
            price = self._clean_price(og_price.get("content"))
            if price and price > 0:
                logger.debug(f"Found price in OpenGraph: {price}")
                return price

        logger.warning("No price found")
        return None

    def _get_image(self, soup: BeautifulSoup, base_url: str) -> Optional[str]:
        logger.debug("=" * 80)
        logger.debug("SEARCHING FOR IMAGE")
        logger.debug("=" * 80)
        
        # 1. Wildberries - img с class содержащим "colorImage"
        logger.debug("1. Searching for img.colorImage...")
        wb_img = soup.find("img", class_=lambda x: x and "colorImage" in x)
        if wb_img:
            img_path = (wb_img.get("src") or 
                       wb_img.get("data-src") or 
                       wb_img.get("data-webp") or
                       wb_img.get("srcset", "").split(",")[0].split()[0] if wb_img.get("srcset") else None)
            if img_path and "wbbasket" in img_path.lower():
                full_url = urljoin(base_url, img_path)
                if full_url.startswith("http"):
                    logger.info(f"✓ Found image from colorImage: {full_url[:100]}")
                    return full_url
            logger.debug(f"  Found img.colorImage but no valid path. src={wb_img.get('src')}, data-src={wb_img.get('data-src')}")

        # 1b. Ищем все картинки с "wbbasket" в src (это картинки товаров на WB)
        logger.debug("1b. Searching for images with wbbasket domain...")
        for img_tag in soup.find_all("img"):
            src = img_tag.get("src") or img_tag.get("data-src") or img_tag.get("data-webp")
            if src and "wbbasket" in src.lower() and not any(x in src.lower() for x in ["logo", "icon", "favicon", "svg"]):
                full_url = urljoin(base_url, src)
                if full_url.startswith("http"):
                    logger.info(f"✓ Found image from wbbasket URL: {full_url[:100]}")
                    return full_url

        # 2. Ищем по data-qa атрибутам для WB - множество вариантов
        logger.debug("2. Searching by data-qa attributes...")
        for data_qa in ["product-image", "productImage", "detail-image", "catalog-image"]:
            logger.debug(f"  Trying data-qa='{data_qa}'...")
            img_elem = soup.find("img", attrs={"data-qa": lambda x: x and data_qa in str(x).lower()})
            if img_elem:
                img_path = (img_elem.get("src") or 
                           img_elem.get("data-src") or 
                           img_elem.get("data-webp") or
                           img_elem.get("srcset", "").split(",")[0].split()[0] if img_elem.get("srcset") else None)
                if img_path:
                    full_url = urljoin(base_url, img_path)
                    if full_url.startswith("http"):
                        logger.info(f"✓ Found image via data-qa='{data_qa}': {full_url[:100]}")
                        return full_url

        # 2b. Ищем img с class содержащим "product-image" или "catalog-image"
        logger.debug("3. Searching by class containing image keywords...")
        for class_pattern in ["product-image", "catalog-image", "detail-image", "item-image"]:
            img = soup.find("img", class_=lambda x: x and class_pattern in str(x).lower())
            if img:
                img_path = (img.get("src") or 
                           img.get("data-src") or 
                           img.get("data-webp") or
                           img.get("srcset", "").split(",")[0].split()[0] if img.get("srcset") else None)
                if img_path and not any(x in img_path.lower() for x in ["favicon", "logo", "svg", "icon"]):
                    full_url = urljoin(base_url, img_path)
                    if full_url.startswith("http"):
                        logger.info(f"✓ Found image via class containing '{class_pattern}': {full_url[:100]}")
                        return full_url

        # 3. Picture tag (новый способ у WB)
        logger.debug("4. Searching in <picture> tags...")
        picture = soup.find("picture")
        if picture:
            img = picture.find("img")
            if img:
                img_path = (img.get("src") or 
                           img.get("data-src") or 
                           img.get("data-webp") or
                           img.get("srcset", "").split(",")[0].split()[0] if img.get("srcset") else None)
                if img_path:
                    full_url = urljoin(base_url, img_path)
                    if full_url.startswith("http"):
                        logger.info(f"✓ Found image from picture tag: {full_url[:100]}")
                        return full_url
            # Ищем source в picture
            for source in picture.find_all("source"):
                img_path = source.get("srcset") or source.get("data-srcset")
                if img_path:
                    img_path = img_path.split(",")[0].split()[0]
                    full_url = urljoin(base_url, img_path)
                    if full_url.startswith("http"):
                        logger.info(f"✓ Found image from picture source: {full_url[:100]}")
                        return full_url

        # 4. JSON-LD
        logger.debug("5. Searching in JSON-LD...")
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                if not script.string:
                    continue
                data = json.loads(script.string)
                if data.get("@type") == "Product":
                    image = data.get("image")
                    if image:
                        img_path = image[0] if isinstance(image, list) else image
                        if img_path and isinstance(img_path, str):
                            full_url = urljoin(base_url, img_path)
                            if full_url.startswith("http"):
                                logger.info(f"✓ Found image in JSON-LD: {full_url[:100]}")
                                return full_url
            except Exception as e:
                logger.debug(f"JSON-LD image parsing error: {str(e)}")
                continue

        # 5. Fallback: поиск первой большой картинки в основном контенте
        logger.debug("6. Searching for any img tag (fallback)...")
        main_content = soup.find("main") or soup.find(attrs={"role": "main"})
        search_area = main_content if main_content else soup
        
        img_count = 0
        for img_tag in search_area.find_all("img"):
            img_count += 1
            img_path = (img_tag.get("src") or 
                       img_tag.get("data-src") or
                       img_tag.get("data-webp") or
                       img_tag.get("srcset", "").split(",")[0].split()[0] if img_tag.get("srcset") else None)
            
            if img_path and not any(x in img_path.lower() for x in ["favicon", "logo", "svg", "icon", "sprite", "1x1", "pixel", "wb-og-win"]):
                full_url = urljoin(base_url, img_path)
                if full_url.startswith("http"):
                    logger.info(f"✓ Found image fallback (img #{img_count}): {full_url[:100]}")
                    return full_url

        # 6. OpenGraph - LAST RESORT (часто это логотип сайта, а не фото товара)
        logger.debug("7. Searching in OpenGraph (last resort)...")
        og_img = soup.find("meta", property="og:image")
        if og_img:
            img_path = og_img.get("content")
            if img_path and "wbbasket" not in img_path.lower() and "wb-og" not in img_path.lower():
                full_url = urljoin(base_url, img_path)
                if full_url.startswith("http"):
                    logger.info(f"✓ Found image from OpenGraph (fallback): {full_url[:100]}")
                    return full_url
            else:
                logger.debug(f"  Skipping OpenGraph: {img_path}")

        logger.warning(f"✗✗✗ NO IMAGE FOUND (searched {img_count} fallback img tags) ✗✗✗")
        logger.warning("Dumping all img tags for debugging:")
        for idx, img in enumerate(soup.find_all("img")[:10]):  # Show first 10
            logger.warning(f"  img[{idx}]: src={img.get('src', 'N/A')[:80]}, class={img.get('class', 'N/A')}, data-qa={img.get('data-qa', 'N/A')}")
        
        return None

    def _clean_price(self, raw_price) -> Optional[Decimal]:
        if raw_price is None: 
            return None
        
        # Преобразуем в строку
        s = str(raw_price).strip()
        
        # Логируем исходную цену
        logger.debug(f"Cleaning price from: {s}")
        
        # Удаляем HTML entities и спецсимволы валют
        s = s.replace("&nbsp;", "").replace("\xa0", "").replace("\u202f", "")
        s = s.replace("ƃ", "").replace("₽", "").replace("р", "").replace("BYN", "")
        s = s.replace("$", "").replace("€", "").replace("₣", "").replace("£", "")
        s = s.replace(",", ".")  # Запятая на точку (европейский формат)
        
        # Убираем пробелы
        s = s.replace(" ", "")
        
        # Убираем кириллицу и другие буквы, оставляем только цифры и точку
        s = re.sub(r'[^\d.]', '', s)
        
        # Удаляем множественные точки (оставляем только одну)
        parts = s.split('.')
        if len(parts) > 2:
            # Если больше одной точки, может быть разделитель тысяч (1.234.567,89)
            # Объединяем все кроме последней части и снова разбиваем
            s = ''.join(parts[:-1]) + '.' + parts[-1]
        
        logger.debug(f"Cleaned string: {s}")
        
        # Ищем первое число с точкой или без
        match = re.search(r'(\d+\.?\d*)', s)
        if match:
            try:
                result = Decimal(match.group(1))
                logger.debug(f"Final price: {result}")
                return result
            except:
                logger.warning(f"Failed to convert to Decimal: {match.group(1)}")
                return None
        
        logger.warning(f"No price pattern found in: {s}")
        return None

    def _is_generic_title(self, title: str) -> bool:
        """
        Check if a title looks like a generic site description rather than a specific product name.
        Returns True if title seems ONLY generic (no product info), False if it looks like a specific product.
        """
        if not title:
            return True
        
        title_lower = title.lower()
        
        # ONLY site-wide generic descriptions (without any product info)
        # These are patterns that appear in generic meta tags on ANY page, not specific to products
        purely_generic_patterns = [
            "широкий ассортимент товаров - скидки каждый день",  # Exact pattern from main og:title
            "коллекции женской, мужской и детской одежды",  # Exact pattern from main og:title
        ]
        
        # If title EXACTLY matches a known generic pattern, it's generic
        for pattern in purely_generic_patterns:
            if pattern in title_lower:
                logger.debug(f"Title is purely generic (matches pattern): {title[:100]}")
                return True
        
        # If title contains BOTH "интернет-магазин" AND "широкий ассортимент" - it's the generic homepage title
        if ("интернет‑магазин" in title_lower or "интернет-магазин" in title_lower) and \
           ("широкий ассортимент" in title_lower and "коллекции" in title_lower):
            logger.debug(f"Title is generic homepage tagline: {title[:100]}")
            return True
        
        # Check if it has specific product indicators (numbers, quotes, brand names, etc)
        has_product_info = (
            any(char.isdigit() for char in title) or  # Has numbers (price, article number)
            '"' in title or '«' in title or '"'  # Has quotes (product names usually quoted)
        )
        
        if has_product_info:
            logger.debug(f"Title has product-specific info: {title[:100]}")
            return False
        
        # If title is very short, might be generic
        if len(title) < 15:
            logger.debug(f"Title is too short, might be generic: {title}")
            return True
        
        return False