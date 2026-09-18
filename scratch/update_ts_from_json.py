import json, re

with open("data/products.json", "r", encoding="utf-8") as f:
    db_products = json.load(f)

# Map urun_kodu -> (birim_fiyati, para_birimi)
prod_map = {}
for p in db_products:
    code = p.get("urun_kodu")
    if code:
        prod_map[code] = (p.get("birim_fiyati", 1.85), p.get("para_birimi", "TL"))

with open("src/productsData.ts", "r", encoding="utf-8") as f:
    text = f.read()

# Update ProductVariant interface
if "birim_fiyati?: number;" not in text:
    text = text.replace(
        "priceText: string;",
        "priceText: string;\n  birim_fiyati?: number;\n  para_birimi?: \"TL\" | \"USD\";"
    )

# Inject birim_fiyati and para_birimi into each variant in TAXONOMY_PRODUCTS
def replace_variant(match):
    variant_block = match.group(0)
    code_match = re.search(r'urun_kodu:\s*"([^"]+)"', variant_block)
    if code_match:
        code = code_match.group(1)
        if code in prod_map:
            bf, pb = prod_map[code]
            if "birim_fiyati:" not in variant_block:
                variant_block = variant_block.replace(
                    f'priceText: "',
                    f'birim_fiyati: {bf},\n        para_birimi: "{pb}",\n        priceText: "'
                )
    return variant_block

new_text = re.sub(r'\{\s*sira_no:[^}]+\}', replace_variant, text)

with open("src/productsData.ts", "w", encoding="utf-8") as f:
    f.write(new_text)

print("Updated src/productsData.ts with birim_fiyati and para_birimi successfully!")
