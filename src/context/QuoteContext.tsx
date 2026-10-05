import React, { createContext, useContext, useState, useEffect } from "react";
import { QuoteItem } from "../types";

export interface CustomerInfo {
  name?: string;
  phone?: string;
  company?: string;
  email?: string;
  note?: string;
}

interface QuoteContextType {
  quoteBasket: QuoteItem[];
  setQuoteBasket: React.Dispatch<React.SetStateAction<QuoteItem[]>>;
  addToQuoteBasket: (item: QuoteItem) => void;
  removeFromQuoteBasket: (id: string) => void;
  clearQuoteBasket: () => void;
  formatCustomProductTitle: (urun_adi: string) => string;
  formatCustomDimensions: (en: string | number, boy: string | number, koruk?: string | number) => string;
  generateWhatsAppQuoteText: (items?: QuoteItem[], customer?: CustomerInfo) => string;
  getWhatsAppQuoteUrl: (items?: QuoteItem[], customer?: CustomerInfo, phoneNumber?: string) => string;
}

const QuoteContext = createContext<QuoteContextType | null>(null);

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
  customer: CustomerInfo = {}
): string {
  const dateStr = new Date().toLocaleDateString("tr-TR");
  const timeStr = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

  let text = `📦 *AMBALAJ MARKET - FİYAT TEKLİFİ VE SİPARİŞ TALEBİ*\n`;
  text += `📅 *Tarih:* ${dateStr} ${timeStr}\n`;
  text += `───────────────────────\n`;

  if (customer.name || customer.company || customer.phone) {
    text += `👤 *MÜŞTERİ BİLGİLERİ*\n`;
    if (customer.name) text += `• *Yetkili:* ${customer.name}\n`;
    if (customer.company) text += `• *Firma:* ${customer.company}\n`;
    if (customer.phone) text += `• *Telefon:* ${customer.phone}\n`;
    if (customer.email) text += `• *E-Posta:* ${customer.email}\n`;
    text += `───────────────────────\n`;
  }

  text += `📋 *TALEP EDİLEN ÜRÜNLER (${items.length} Kalem):*\n\n`;

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

    if (item.musteri_notu) {
      text += `   • *Özel Not:* ${item.musteri_notu}\n`;
    }
    text += `\n`;
  });

  const totalPrice = items.reduce((sum, item) => sum + (item.toplam_fiyat || 0), 0);
  if (totalPrice > 0) {
    text += `───────────────────────\n`;
    text += `💰 *TOPLAM TAHMİNİ TUTAR:* ₺${totalPrice.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} + KDV\n`;
  }

  if (customer.note) {
    text += `\n💬 *Genel Not:* ${customer.note}\n`;
  }

  text += `\n_Bu teklif talebi poset.com üzerinden oluşturulmuştur._`;
  return text;
}

export function getWhatsAppQuoteUrl(
  items: QuoteItem[] = [], 
  customer: CustomerInfo = {},
  phoneNumber: string = "905322153403"
): string {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, "");
  const messageText = generateWhatsAppQuoteText(items, customer);
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

  return (
    <QuoteContext.Provider
      value={{
        quoteBasket,
        setQuoteBasket,
        addToQuoteBasket,
        removeFromQuoteBasket,
        clearQuoteBasket,
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
    // Graceful fallback for components used outside Provider
    return {
      quoteBasket: [],
      setQuoteBasket: () => {},
      addToQuoteBasket: () => {},
      removeFromQuoteBasket: () => {},
      clearQuoteBasket: () => {},
      formatCustomProductTitle,
      formatCustomDimensions,
      generateWhatsAppQuoteText,
      getWhatsAppQuoteUrl
    };
  }
  return context;
}
