import re, json, sys

with open("src/productsData.ts", "r", encoding="utf-8") as f:
    text = f.read()

data = json.load(open("data/products.json", "r", encoding="utf-8"))

variant_prices = {}
for match in re.finditer(r'urun_kodu:\s*"([^"]+)".*?priceText:\s*"([^"]+)"', text, re.DOTALL):
    code = match.group(1)
    price = match.group(2)
    variant_prices[code] = price

print(f"Mapped {len(variant_prices)} variant prices")
for item in data[:10]:
    code = item.get("urun_kodu")
    p_text = variant_prices.get(code, "N/A")
    clean_p = p_text.encode('ascii', 'backslashreplace').decode('ascii')
    print(f"{code} -> {clean_p}")
