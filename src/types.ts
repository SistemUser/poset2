export interface Product {
  id: string;
  name: string;
  category: string; // "kargo" | "magaza" | "kraft" | "gıda"
  material: string;
  thickness: string;
  pricePerUnit: number;
  currency: string;
  moq: number;
  imageUrl: string;
  tags: string[];
  capacity: string;
  description: string;
  stokDurumu?: "Var" | "Siparişle" | "Yok";
}

export type ImageType = 
  | "kargo" | "magaza" | "kraft" | "gida" | "bubble"
  | "kargoPlastik" | "kargoCepli" | "kargoKagit" | "faturaCebi" | "balonluZarf"
  | "magazaElGecme" | "magazaSapli" | "marketAtlet" | "doypackKilitli" | "oppJelatin"
  | "biyobozunur" | "kraftCanta" | "luksKarton" | "keseKagidi" | "telaCanta"
  | "hamBez" | "balonluPatpat" | "srinkFilm";

export interface QuoteSpec {
  dimensions: string;
  material: string;
  thickness: string;
  closure: string;
  color: string;
  leadTime: string;
  moq: string;
  unitPrice: string;
  totalPrice: string;
  imageType: ImageType;
  customDetails: string[];
  ecoScore?: number; // 1-100 rating
  baskiDurumu?: "Baskılı" | "Baskısız";
  renkSayisi?: string;
  name?: string;
  stokDurumu?: "Var" | "Siparişle" | "Yok";
  stok_durumu?: "Var" | "Siparişle" | "Yok";
  customerNote?: string;
}

export interface QuoteItem {
  id: string;
  urun_kodu: string;
  urun_adi: string;
  kategori: string;
  olculer: string;
  miktar: number;
  satis_sekli: string;
  baski_durumu: string;
  renk_sayisi: string;
  birim_fiyat: number;
  toplam_fiyat: number;
  logo_dosya_adi: string | null;
  fatura_cebi_dahil?: boolean;
  musteri_notu?: string;
  stok_durumu?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  quoteSpec?: QuoteSpec;
}

export interface FilterState {
  searchQuery: string;
  categories: string[];
  materials: string[];
  minThickness: number;
  maxThickness: number;
  sortBy: "popular" | "price_asc" | "price_desc";
}

export interface AppSettings {
  usd_try_rate: number;
  dolar_kuru?: number;
  usd_try?: number;
  rate_mode: "manual" | "api";
  collect_api_key: string;
  last_updated: string;
}

export interface CategoryFields {
  kargo_bant: boolean;
  irsaliye_cebi: boolean;
  kulp: boolean;
  koruk: boolean;
  baski: boolean;
}

export interface CategorySchema {
  id: string;
  name: string;
  slug?: string;
  units: string[];
  thickness?: string;
  thickness_unit?: string;
  default_moq?: number;
  fields: CategoryFields;
  allowed_materials?: string[];
}

export interface DbProduct {
  sira_no: number;
  urun_kodu: string;
  urun_kategorisi: string;
  urun_adi: string;
  olculer: string;
  satis_sekli: string;
  moq: string;
  fiyat_carpanlari: string;
  hammadde_turu: string;
  kalinlik_seviyesi: string;
  baski_durumu: "Baskılı" | "Baskısız";
  koruk_detayi: string;
  kulp_tipi: string;
  baski_renk_yon: string;
  klise_maliyeti: string;
  zemin_rengi: string;
  kargo_bant_tipi: string;
  irsaliye_cebi_detay: string;
  geridonusum_orani: string;
  termin_suresi: string;
  uyumlu_sektorler: string;
  kullanim_amaci: string;
  stok_durumu: "Var" | "Siparişle" | "Yok";
  birim_fiyat: number;
  birim_fiyati?: number;
  base_price?: number;
  fiyat_aliniz: boolean;
  is_quote_only?: boolean;
  para_birimi?: "TL" | "USD";
  unit?: "Adet" | "Kg" | string;
  allow_custom_dimensions?: boolean;
  allow_custom_size?: boolean;
  custom_size?: { en: string; boy: string; koruk?: string };
  isPremiumPrice?: boolean;
}

export interface PriceTierOption {
  label: string;
  qtyLabel: string;
  multiplier: number;
  discountPercentage: number;
}

export function parsePriceMultipliers(carpanStr?: string, unitStr: string = "Adet"): PriceTierOption[] {
  if (!carpanStr || !carpanStr.trim()) {
    return [{ label: `Standart Sipariş`, qtyLabel: `Standart Miktar`, multiplier: 1.0, discountPercentage: 0 }];
  }

  const parts = carpanStr.split("/").map(s => s.trim()).filter(Boolean);
  const tiers: PriceTierOption[] = [];

  parts.forEach(part => {
    // Format 1: "5k:1.00" or "10k:0.92" or "5000:1.00" or "5.000 Adet: 1.00"
    const colonMatch = part.match(/^([^:]+):\s*([0-9.,]+)$/);
    if (colonMatch) {
      let qtyStr = colonMatch[1].trim();
      const multVal = parseFloat(colonMatch[2].replace(",", "."));
      if (!isNaN(multVal)) {
        let formattedQty = qtyStr;
        if (/^\d+k$/i.test(qtyStr)) {
          const num = parseInt(qtyStr) * 1000;
          formattedQty = `${num.toLocaleString("tr-TR")} ${unitStr}`;
        } else if (/^\d+$/.test(qtyStr)) {
          formattedQty = `${parseInt(qtyStr).toLocaleString("tr-TR")} ${unitStr}`;
        }
        const discount = Math.round((1 - multVal) * 100);
        const discountText = discount > 0 ? `%${discount} İndirim` : "Standart Fiyat";

        tiers.push({
          label: `${formattedQty} (${discountText})`,
          qtyLabel: formattedQty,
          multiplier: multVal,
          discountPercentage: discount > 0 ? discount : 0
        });
        return;
      }
    }

    // Format 2: "1.00 (5.000)"
    const parenMatch = part.match(/^([0-9.,]+)\s*\(([^)]+)\)$/);
    if (parenMatch) {
      const multVal = parseFloat(parenMatch[1].replace(",", "."));
      const qtyStr = parenMatch[2].trim();
      if (!isNaN(multVal)) {
        const discount = Math.round((1 - multVal) * 100);
        const discountText = discount > 0 ? `%${discount} İndirim` : "Standart Fiyat";
        tiers.push({
          label: `${qtyStr} (${discountText})`,
          qtyLabel: qtyStr,
          multiplier: multVal,
          discountPercentage: discount > 0 ? discount : 0
        });
        return;
      }
    }

    // Fallback: raw text parse
    const rawVal = parseFloat(part.replace(/[^0-9.,]/g, "").replace(",", "."));
    if (!isNaN(rawVal) && rawVal > 0 && rawVal <= 2) {
      const discount = Math.round((1 - rawVal) * 100);
      const discountText = discount > 0 ? `%${discount} İndirim` : "Standart Fiyat";
      tiers.push({
        label: `${part} (${discountText})`,
        qtyLabel: part,
        multiplier: rawVal,
        discountPercentage: discount > 0 ? discount : 0
      });
    }
  });

  if (tiers.length === 0) {
    tiers.push({ label: `Standart Sipariş`, qtyLabel: `Standart Miktar`, multiplier: 1.0, discountPercentage: 0 });
  }

  return tiers;
}

export interface ArticleSssItem {
  soru: string;
  cevap: string;
}

export interface ArticleSeo {
  meta_title?: string;
  meta_description?: string;
  keywords?: string[];
  geo_region?: "Tüm Türkiye" | "İstanbul İçi Hızlı Teslimat" | "Yurt Dışı / İhracat" | string;
}

export interface ArticleGeoAi {
  quick_answer?: string;
  key_takeaways?: string[];
}

export interface Article {
  id: string;
  slug: string;
  kategori: string;
  baslik: string;
  alt_baslik: string;
  ozet: string;
  icerik: string;
  okuma_suresi: string;
  tarih: string;
  related_product?: string;
  gorsel_url?: string;
  sss?: ArticleSssItem[];
  seo?: ArticleSeo;
  geo_ai?: ArticleGeoAi;
}


