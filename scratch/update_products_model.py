import json

file_path = "data/products.json"
with open(file_path, "r", encoding="utf-8") as f:
    products = json.load(f)

for p in products:
    val = p.get("birim_fiyat") if p.get("birim_fiyat") is not None else p.get("birim_fiyati", 0)
    try:
        price = float(val)
    except (ValueError, TypeError):
        price = 0.0

    p["birim_fiyat"] = price
    p["birim_fiyati"] = price
    
    # If birim_fiyat is 0, fiyat_aliniz is true
    fiyat_aliniz = (price == 0) or p.get("fiyat_aliniz", False) or p.get("isPremiumPrice", False)
    p["fiyat_aliniz"] = bool(fiyat_aliniz)

with open(file_path, "w", encoding="utf-8") as f:
    json.dump(products, f, ensure_ascii=False, indent=2)

print(f"Updated {len(products)} products with birim_fiyat and fiyat_aliniz fields.")
