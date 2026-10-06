import React, { createContext, useContext, useState, useEffect } from "react";
import { QuoteItem, RfqSettings, DEFAULT_RFQ_SETTINGS } from "../types";
import { getApiEndpoint } from "../utils/urlHelper";

export interface CustomerInfo {
  name?: string;
  phone?: string;
  company?: string;
  email?: string;
  monthlyConsumption?: string;
  note?: string;
}

interface QuoteContextType {
  quoteBasket: QuoteItem[];
  setQuoteBasket: React.Dispatch<React.SetStateAction<QuoteItem[]>>;
  addToQuoteBasket: (item: QuoteItem) => void;
  removeFromQuoteBasket: (id: string) => void;
  clearQuoteBasket: () => void;
  clearCart: () => void;
  rfqSettings: RfqSettings;
  updateRfqSettings: (newSettings: Partial<RfqSettings>) => void;
  formatCustomProductTitle: (urun_adi: string) => string;
  formatCustomDimensions: (en: string | number, boy: string | number, koruk?: string | number) => string;
  generateWhatsAppQuoteText: (items?: QuoteItem[], customer?: CustomerInfo, settings?: RfqSettings) => string;
  getWhatsAppQuoteUrl: (items?: QuoteItem[], customer?: CustomerInfo, phoneNumber?: string, settings?: RfqSettings) => string;
}

const QuoteContext = createContext<QuoteContextType | null>(null);

export function getStoredRfqSettings(): RfqSettings {
  try {
    const saved = localStorage.getItem("poset_rfq_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_RFQ_SETTINGS, ...parsed };
    }
  } catch (e) {}
  return DEFAULT_RFQ_SETTINGS;
}

export function formatCustomProductTitle(urun_adi: string): string {
  const cleanName = (urun_adi || "").trim();
  if (cleanName.includes("Özel Ölçü")) return cleanName;
  return `${cleanName} - Özel Ölçü İmalat`;
}

export function formatCustomDimensions(
  en: string | number, 
  boy: string | number, 
  koruk?: string | number
): string {
  const cleanEn = String(en || "").trim();
  const cleanBoy = String(boy || "").trim();
  const cleanKoruk = koruk !== undefined && koruk !== null ? String(koruk).trim() : "";
  const hasKoruk = cleanKoruk !== "" && cleanKoruk !== "0";

  if (hasKoruk) {
    return `${cleanEn} x ${cleanBoy} + ${cleanKoruk} cm`;
  }
  return `${cleanEn} x ${cleanBoy} cm`;
}

export function generateWhatsAppQuoteText(
  items: QuoteItem[] = [], 
  customer: CustomerInfo = {},
  settings?: RfqSettings
): string {
  const dateStr = new Date().toLocaleDateString("tr-TR");
  const timeStr = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const activeSettings = settings || getStoredRfqSettings();

  let text = `*AMBALAJ MARKET - FİYAT TEKLİFİ VE SİPARİŞ TALEBİ*\n`;
  text += `• *Tarih:* ${dateStr} ${timeStr}\n`;
  text += `───────────────────────\n`;

  if (customer.name || customer.company || customer.phone || customer.email || customer.monthlyConsumption) {
    text += `*MÜŞTERİ BİLGİLERİ*\n`;
    if (customer.name) text += `• *Yetkili:* ${customer.name}\n`;
    if (customer.company) text += `• *Firma / Marka:* ${customer.company}\n`;
    if (customer.phone) text += `• *Telefon:* ${customer.phone}\n`;
    if (customer.email) text += `• *E-Posta:* ${customer.email}\n`;
    if (customer.monthlyConsumption) text += `• *Aylık Tüketim Potansiyeli:* ${customer.monthlyConsumption}\n`;
    text += `───────────────────────\n`;
  }

  text += `*TALEP EDİLEN ÜRÜNLER (${items.length} Kalem):*\n\n`;

  items.forEach((item, index) => {
    text += `*${index + 1}. ${item.urun_adi}*\n`;
    text += `   • *Ürün Kodu:* ${item.urun_kodu}\n`;
    text += `   • *Ölçü:* ${item.olculer}\n`;
    text += `   • *Miktar:* ${item.miktar.toLocaleString("tr-TR")} ${item.satis_sekli || "Adet"}\n`;
    if (item.hammadde) text += `   • *Hammadde:* ${item.hammadde}\n`;
    text += `   • *Baskı:* ${item.baski_durumu || "Baskısız"} (${item.renk_sayisi || "Standart"})\n`;
    if (item.fatura_cebi_dahil) text += `   • *İrsaliye / Fatura Cebi:* Dahil (+Cep)\n`;
    text += `   • *Stok / Üretim:* ${item.stok_durumu || "Sipariş Üzerine Üretim"}\n`;

    if (item.birim_fiyat > 0 && item.toplam_fiyat > 0) {
      text += `   • *Birim Fiyat:* ₺${item.birim_fiyat.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} / ${item.satis_sekli || "Adet"}\n`;
      text += `   • *Tutar:* ₺${item.toplam_fiyat.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}\n`;
    } else {
      text += `   • *Fiyat Durumu:* Özel İmalat / Teklif Hazırlanacak\n`;
    }

    if (item.logo_dosya_adi) {
      text += `   • *EKLİ LOGO / TASARIM:* ${item.logo_dosya_adi}\n`;
    }

    if (item.musteri_notu) {
      text += `   • *ÖZEL MÜŞTERİ NOTU:* ${item.musteri_notu}\n`;
    }
    text += `\n`;
  });

  const totalPrice = items.reduce((sum, item) => sum + (item.toplam_fiyat || 0), 0);
  const taxNote = activeSettings.taxNote || "KDV Hariç";
  const validityNote = activeSettings.validityNote || "Fiyatlarımız 15 gün geçerlidir.";

  text += `───────────────────────\n`;
  if (totalPrice > 0) {
    text += `*TOPLAM TAHMİNİ TUTAR:* ₺${totalPrice.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} (${taxNote})\n`;
  } else {
    text += `*TOPLAM TAHMİNİ TUTAR:* Özel İmalat / Teklif İle Belirlenecektir (${taxNote})\n`;
  }

  if (validityNote) {
    text += `• *Teklif Notu:* ${validityNote}\n`;
  }

  if (customer.note) {
    text += `• *MÜŞTERİ NOTU:* ${customer.note}\n`;
  }

  text += `\n_Bu teklif talebi poset.com üzerinden oluşturulmuştur._`;
  return text;
}

export function getWhatsAppQuoteUrl(
  items: QuoteItem[] = [], 
  customer: CustomerInfo = {},
  phoneNumber?: string,
  settings?: RfqSettings
): string {
  const activeSettings = settings || getStoredRfqSettings();
  const rawPhone = phoneNumber || activeSettings.whatsappNumber || DEFAULT_RFQ_SETTINGS.whatsappNumber;
  const cleanPhone = rawPhone.replace(/[^0-9]/g, "");
  const messageText = generateWhatsAppQuoteText(items, customer, activeSettings);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
}

export const QuoteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [quoteBasket, setQuoteBasket] = useState<QuoteItem[]>(() => {
    try {
      const saved = localStorage.getItem("poset_quote_basket");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [rfqSettings, setRfqSettings] = useState<RfqSettings>(() => getStoredRfqSettings());

  useEffect(() => {
    const handleSettingsUpdated = () => {
      setRfqSettings(getStoredRfqSettings());
    };

    const fetchLiveRfqSettings = async () => {
      const endpoints = [
        getApiEndpoint("api/api.php?action=rfq"),
        "/api/api.php?action=rfq",
        getApiEndpoint("api/api.php?action=settings"),
        "/api/api.php?action=settings",
        getApiEndpoint("api/admin.php?action=rfq"),
        "/api/admin.php?action=rfq"
      ];
      for (const ep of endpoints) {
        try {
          const res = await fetch(`${ep}${ep.includes("?") ? "&" : "?"}t=${Date.now()}`);
          if (res.ok) {
            const data = await res.json();
            const rfq = data?.rfq || (data?.smtp ? data.rfq : null);
            if (rfq && rfq.whatsappNumber) {
              setRfqSettings(prev => ({ ...prev, ...rfq }));
              localStorage.setItem("poset_rfq_settings", JSON.stringify({ ...DEFAULT_RFQ_SETTINGS, ...rfq }));
              break;
            }
          }
        } catch (e) {}
      }
    };

    fetchLiveRfqSettings();

    window.addEventListener("rfq_settings_updated", handleSettingsUpdated);
    window.addEventListener("storage", handleSettingsUpdated);
    return () => {
      window.removeEventListener("rfq_settings_updated", handleSettingsUpdated);
      window.removeEventListener("storage", handleSettingsUpdated);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("poset_quote_basket", JSON.stringify(quoteBasket));
    } catch (e) {}
  }, [quoteBasket]);

  const addToQuoteBasket = (item: QuoteItem) => {
    setQuoteBasket(prev => [...prev, item]);
  };

  const removeFromQuoteBasket = (id: string) => {
    setQuoteBasket(prev => prev.filter(item => item.id !== id));
  };

  const clearQuoteBasket = () => {
    setQuoteBasket([]);
  };

  const updateRfqSettings = (newSettings: Partial<RfqSettings>) => {
    const updated = { ...rfqSettings, ...newSettings };
    setRfqSettings(updated);
    try {
      localStorage.setItem("poset_rfq_settings", JSON.stringify(updated));
      window.dispatchEvent(new Event("rfq_settings_updated"));
    } catch (e) {}
  };

  return (
    <QuoteContext.Provider
      value={{
        quoteBasket,
        setQuoteBasket,
        addToQuoteBasket,
        removeFromQuoteBasket,
        clearQuoteBasket,
        clearCart: clearQuoteBasket,
        rfqSettings,
        updateRfqSettings,
        formatCustomProductTitle,
        formatCustomDimensions,
        generateWhatsAppQuoteText,
        getWhatsAppQuoteUrl
      }}
    >
      {children}
    </QuoteContext.Provider>
  );
};

export function useQuote(): QuoteContextType {
  const context = useContext(QuoteContext);
  if (!context) {
    const defaultSettings = getStoredRfqSettings();
    return {
      quoteBasket: [],
      setQuoteBasket: () => {},
      addToQuoteBasket: () => {},
      removeFromQuoteBasket: () => {},
      clearQuoteBasket: () => {},
      clearCart: () => {},
      rfqSettings: defaultSettings,
      updateRfqSettings: () => {},
      formatCustomProductTitle,
      formatCustomDimensions,
      generateWhatsAppQuoteText,
      getWhatsAppQuoteUrl
    };
  }
  return context;
}
