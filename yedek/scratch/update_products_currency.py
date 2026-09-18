import json, re

# Load products.json
products_path = "data/products.json"
products = json.load(open(products_path, "r", encoding="utf-8"))

# Load productsData.ts to parse variant prices
with open("src/productsData.ts", "r", encoding="utf-8") as f:
    ts_text = f.read()

variant_prices = {}
for match in re.finditer(r'urun_kodu:\s*"([^"]+)".*?priceText:\s*"([^"]+)"', ts_text, re.DOTALL):
    code = match.group(1)
    price_str = match.group(2)
    # Extract number
    num_match = re.search(r'[\d.,]+', price_str)
    if num_match:
        val = float(num_match.group(0).replace(',', '.'))
        variant_prices[code] = val

usd_categories = [
    "LÜKS KARTON VEYA ÖZEL TASARIM ÇANTALAR",
    "BEZ VE TELA ÇANTALAR",
    "Lüks Karton Çantalar",
    "Ham Bez (Pamuk) Çantalar",
    "Nonwoven (Tela) Çantalar"
]

usd_keywords = ["lüks", "luks", "bez", "tela", "nonwoven", "pamuk"]

for item in products:
    code = item.get("urun_kodu")
    base_price = variant_prices.get(code, 1.85)
    
    cat = item.get("urun_kategorisi", "")
    name = item.get("urun_adi", "")
    
    is_usd = any(k in cat.lower() or k in name.lower() for k in usd_keywords)
    
    if is_usd:
        item["para_birimi"] = "USD"
        # 1 USD approx 35 TL, so convert base_price in TL to USD value
        item["birim_fiyati"] = round(base_price / 35.0, 3)
        if item["birim_fiyati"] < 0.05:
            item["birim_fiyati"] = 0.05
    else:
        item["para_birimi"] = "TL"
        item["birim_fiyati"] = round(base_price, 2)

with open(products_path, "w", encoding="utf-8") as f:
    json.dump(products, f, ensure_ascii=False, indent=2)

print(f"Successfully updated {len(products)} products with birim_fiyati and para_birimi!")
