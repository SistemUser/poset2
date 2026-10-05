import { DbProduct } from "../types";
import { TAXONOMY_PRODUCTS } from "../productsData";

export interface ParentProductInfo {
  parentTitle: string;
  parentCategory: string;
  parentHammadde: string;
  parentSatisSekli: string;
  parentMOQ: string;
  prefix: string;
  parentKoruk: string;
}

export function isCustomOnlyProduct(item: any): boolean {
  if (!item) return false;
  if (item.is_custom_only === true) return true;
  const code = String(item.urun_kodu || item.sku || "").trim().toUpperCase();
  if (code.endsWith("-CUSTOM")) return true;
  const olcu = String(item.olculer || item.olcu || "").trim().toLowerCase();
  if (olcu.includes("müşteri ölçüsü") || olcu === "özel imalat (müşteri ölçüsü)") return true;
  return false;
}

export function getParentProductInfo(urunAdi: string, existingItem?: any): ParentProductInfo {
  const cleanName = (urunAdi || existingItem?.urun_adi || "").trim().toLowerCase();

  const matchedTaxonomy = TAXONOMY_PRODUCTS.find(tp => 
    tp.name.trim().toLowerCase() === cleanName || 
    cleanName.includes(tp.name.trim().toLowerCase()) ||
    tp.name.trim().toLowerCase().includes(cleanName)
  );

  let prefix = "PRD";
  if (matchedTaxonomy && matchedTaxonomy.variants?.[0]?.urun_kodu) {
    prefix = matchedTaxonomy.variants[0].urun_kodu.split("-")[0] || "PRD";
  } else if (existingItem?.urun_kodu) {
    prefix = String(existingItem.urun_kodu).split("-")[0] || "PRD";
  }

  // Common known product prefixes for clean codes
  if (cleanName.includes("kese")) prefix = "KSE";
  else if (cleanName.includes("kargo")) prefix = "KRG";
  else if (cleanName.includes("market") || cleanName.includes("atlet")) prefix = "MKT";
  else if (cleanName.includes("mağaza")) prefix = "MGZ";
  else if (cleanName.includes("kilitli") || cleanName.includes("fermuar")) prefix = "KLT";
  else if (cleanName.includes("jelatin") || cleanName.includes("opp")) prefix = "OPP";
  else if (cleanName.includes("biyo")) prefix = "BIO";
  else if (cleanName.includes("kraft")) prefix = "KRF";
  else if (cleanName.includes("karton")) prefix = "KRT";
  else if (cleanName.includes("tela") || cleanName.includes("nonwoven")) prefix = "TLA";
  else if (cleanName.includes("bez") || cleanName.includes("pamuk")) prefix = "BEZ";
  else if (cleanName.includes("patpat") || cleanName.includes("şrink") || cleanName.includes("balonlu")) prefix = "IND";
  else if (cleanName.includes("fatura")) prefix = "FCB";

  const parentTitle = matchedTaxonomy?.name || existingItem?.urun_adi || urunAdi || "Özel Ambalaj Grubu";
  const parentCategory = matchedTaxonomy?.categoryLabel || existingItem?.urun_kategorisi || existingItem?.kategori || "Genel Ambalaj";
  const parentHammadde = matchedTaxonomy?.malzeme || matchedTaxonomy?.variants?.[0]?.hammadde_turu || existingItem?.hammadde_turu || existingItem?.hammadde || "Standart Hammadde";
  const parentSatisSekli = matchedTaxonomy?.variants?.[0]?.satis_sekli || existingItem?.satis_sekli || existingItem?.unit || "Kg";
  const parentMOQ = matchedTaxonomy?.variants?.[0]?.moq || existingItem?.moq || "Siparişe Göre";
  const parentKoruk = matchedTaxonomy?.variants?.[0]?.koruk_detayi || existingItem?.koruk_detayi || "Özel İmalata Göre";

  return {
    parentTitle,
    parentCategory,
    parentHammadde,
    parentSatisSekli,
    parentMOQ,
    prefix,
    parentKoruk
  };
}

export function createMasterCustomRecord(
  parentInfo: ParentProductInfo, 
  siraNo: number = 999
): DbProduct {
  const customSku = `${parentInfo.prefix.toUpperCase()}-CUSTOM`;

  return {
    sira_no: siraNo,
    sku: customSku,
    urun_kodu: customSku,
    urun_adi: parentInfo.parentTitle,
    urun_kategorisi: parentInfo.parentCategory,
    kategori: parentInfo.parentCategory,
    olculer: "Özel İmalat (Müşteri Ölçüsü)",
    olcu: "Özel İmalat (Müşteri Ölçüsü)",
    kalinlik_seviyesi: "İsteğe Bağlı / Standart",
    kalinlik: "İsteğe Bağlı / Standart",
    hammadde_turu: parentInfo.parentHammadde,
    hammadde: parentInfo.parentHammadde,
    satis_sekli: parentInfo.parentSatisSekli || "Kg",
    unit: parentInfo.parentSatisSekli || "Kg",
    moq: parentInfo.parentMOQ || "Siparişe Göre",
    fiyat_aliniz: true,
    is_quote_only: true,
    birim_fiyat: 0,
    birim_fiyati: 0,
    base_price: 0,
    stok_durumu: "Sipariş Üzerine Üretim",
    is_custom_only: true,
    baski_durumu: "Baskısız",
    fiyat_carpanlari: "Hacme Göre İskonto Uygulanır",
    koruk_detayi: parentInfo.parentKoruk || "Özel İmalata Göre",
    kulp_tipi: "Yok",
    baski_renk_yon: "0 + 0 (Düz)",
    klise_maliyeti: "Muaf",
    zemin_rengi: "Standart / Özel",
    kargo_bant_tipi: "Yok",
    irsaliye_cebi_detay: "Yok",
    geridonusum_orani: "%100 Geri Dönüşebilir",
    termin_suresi: "7-10 İş Günü",
    uyumlu_sektorler: "Tüm Sektörler",
    kullanim_amaci: "Özel Ölçü Ambalaj Üretimi",
    allow_custom_dimensions: true,
    allow_custom_size: true
  };
}
