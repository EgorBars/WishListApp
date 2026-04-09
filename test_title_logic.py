#!/usr/bin/env python3
"""Test title extraction with the updated _is_generic_title logic"""

def _is_generic_title(title: str) -> bool:
    """
    Check if a title looks like a generic site description rather than a specific product name.
    Returns True if title seems ONLY generic (no product info), False if it looks like a specific product.
    """
    if not title:
        return True
    
    title_lower = title.lower()
    
    # ONLY site-wide generic descriptions (without any product info)
    purely_generic_patterns = [
        "широкий ассортимент товаров - скидки каждый день",
        "коллекции женской, мужской и детской одежды",
    ]
    
    # If title EXACTLY matches a known generic pattern, it's generic
    for pattern in purely_generic_patterns:
        if pattern in title_lower:
            print(f"  ✗ GENERIC (matches pattern): {pattern}")
            return True
    
    # If title contains BOTH "интернет-магазин" AND "широкий ассортимент" - it's the generic homepage title
    if ("интернет‑магазин" in title_lower or "интернет-магазин" in title_lower) and \
       ("широкий ассортимент" in title_lower and "коллекции" in title_lower):
        print(f"  ✗ GENERIC (homepage tagline)")
        return True
    
    # Check if it has specific product indicators (numbers, quotes, brand names, etc)
    has_product_info = (
        any(char.isdigit() for char in title) or
        '"' in title or '«' in title
    )
    
    if has_product_info:
        print(f"  ✓ SPECIFIC (has product info)")
        return False
    
    # If title is very short, might be generic
    if len(title) < 15:
        print(f"  ✗ GENERIC (too short)")
        return True
    
    print(f"  ✓ SPECIFIC (default)")
    return False


# Test cases
print("="*80)
print("TESTING _is_generic_title()")
print("="*80)

test_cases = [
    # Generic titles (should return True)
    ("Интернет‑магазин Wildberries: широкий ассортимент товаров - скидки каждый день!", True),
    
    # Specific product titles (should return False)
    ("«Sqwore - Aквариум» - картина по номерам TWINKLE ART 187235449 купить за 37,08 ƃ в интернет‑магазине Wildberries", False),
    ("Картина по номерам Евангелион Аниме Аска и Рей Art Кисть 463540873 купить за 40,42 ƃ в интернет‑магазине Wildberries", False),
    
    # Edge cases
    ("валюта", True),  # Too short
    ("Наушники Sony WH-1000XM5", False),  # Has product name with numbers
]

for title, expected_generic in test_cases:
    print(f"\nTitle: {title[:70]}...")
    is_generic = _is_generic_title(title)
    status = "✓ PASS" if is_generic == expected_generic else "✗ FAIL"
    print(f"{status} - Expected generic={expected_generic}, Got generic={is_generic}")

print("\n" + "="*80)
print("SUMMARY")
print("="*80)
print("""
The fix ensures:
1. Product names with quotes and numbers are ALWAYS treated as specific products
2. Generic homepage taglines are ALWAYS rejected
3. Very short titles (< 15 chars) are treated as generic
4. If uncertain, assume it's a specific product name
""")
