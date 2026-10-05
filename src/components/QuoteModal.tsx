import React, { useState, useEffect } from "react";
import { ShoppingBag, Check, Send, AlertCircle } from "lucide-react";
import { useQuote, getStoredRfqSettings } from "../context/QuoteContext";
import { QuoteFormData, RfqSettings, DEFAULT_RFQ_SETTINGS } from "../types";
import { getApiEndpoint } from "../utils/urlHelper";

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
}

export const QuoteModal: React.FC<QuoteModalProps> = ({
  isOpen,
  onClose,
  onSuccessToast
}) => {
  const { quoteBasket, clearCart, getWhatsAppQuoteUrl } = useQuote();
  const [settings, setSettings] = useState<RfqSettings>(() => getStoredRfqSettings());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<QuoteFormData>({
    name: "",
    company: "",
    monthlyConsumption: "",
    phone: "",
    email: "",
    notes: ""
  });

  // Ayarları 'poset_rfq_settings' deposundan canlı oku ('rfq_settings_updated' dinlensin)
  useEffect(() => {
    const handleUpdate = () => {
      setSettings(getStoredRfqSettings());
    };
    window.addEventListener("rfq_settings_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("rfq_settings_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  if (!isOpen) return null;

  const totalPrice = quoteBasket.reduce((sum, item) => sum + (item.toplam_fiyat || 0), 0);
  const isZeroOrCustom = totalPrice <= 0 || quoteBasket.some(i => i.is_custom_only || i.birim_fiyat <= 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = formData.name.trim();
    const cleanPhone = formData.phone.trim();
    const cleanEmail = formData.email.trim();
    const cleanMonthly = (formData.monthlyConsumption || "").trim();

    // Zorunlu alan doğrulamaları
    if (!cleanName) {
      setErrorMessage("Lütfen ad ve soyadınızı belirtiniz.");
      return;
    }
    if (!cleanPhone) {
      setErrorMessage("Lütfen telefon numaranızı belirtiniz.");
      return;
    }
    if (!cleanEmail) {
      setErrorMessage("Lütfen e-posta adresinizi belirtiniz.");
      return;
    }

    if (settings.requireMonthlyConsumption && !cleanMonthly) {
      setErrorMessage("Lütfen tahmini aylık tüketim miktarınızı belirtiniz.");
      return;
    }

    try {
      // 1. WhatsApp linkini paneldeki güncel numaraya oluştur
      const targetNumber = settings.whatsappNumber || DEFAULT_RFQ_SETTINGS.whatsappNumber;
      const whatsappUrl = getWhatsAppQuoteUrl(quoteBasket, formData, targetNumber, settings);

      // Sunucuya arka planda RFQ kaydını ve paneldeki e-posta adresine bildirimi ilet
      try {
        const targetEmail = settings.notificationEmail || "info@poset.com";
        const quotePayload = JSON.stringify({
          action: "submit_rfq",
          recipient_email: targetEmail,
          customer: formData,
          items: quoteBasket,
          tax_note: settings.taxNote,
          validity_note: settings.validityNote
        });

        const endpoints = [
          getApiEndpoint("api/quote"),
          getApiEndpoint("api/quote.php"),
          "/api/quote",
          "/api/quote.php"
        ];

        for (const ep of endpoints) {
          try {
            const res = await fetch(ep, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: quotePayload
            });
            const text = await res.text();
            if (text && (text.trim().startsWith("{") || text.trim().startsWith("["))) {
              const data = JSON.parse(text);
              if (data?.success) break;
            }
          } catch (e) {}
        }
      } catch (err) {}

      // 2. window.open(whatsappUrl, '_blank') ile WhatsApp'ı aç
      window.open(whatsappUrl, "_blank");

      // 3. Modalı kapat
      onClose();

      // 4. Sepeti temizle
      clearCart();

      // 5. Ekrana başarı bildirimini ver
      const successMsg = "Teklif talebiniz başarıyla iletildi! Temsilcimiz en kısa sürede sizinle iletişime geçecektir.";
      if (onSuccessToast) {
        onSuccessToast(successMsg);
      } else {
        alert(successMsg);
      }
    } catch (err) {
      setErrorMessage("Teklif oluşturulurken bir hata meydana geldi.");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans animate-in fade-in-50 duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-[#0b1c3f] text-white p-6 relative flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5 text-emerald-400" />
              <h4 className="font-extrabold text-lg font-display tracking-tight">Teklif Talebini Tamamlayın</h4>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Seçtiğiniz ürünlerin şartnamesini ve iletişim bilgilerinizi doğrulayıp imalata iletin.
            </p>
          </div>
          <button 
            onClick={onClose}
            type="button"
            className="text-slate-300 hover:text-white font-mono text-xl p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Body: 2 Sütunlu Grid */}
        <div className="p-6 overflow-y-auto flex-grow space-y-6">
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl p-3.5 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form id="quote-checkout-form" onSubmit={handleSubmit}>
            <div className="grid md:grid-cols-12 gap-6 items-start">
              
              {/* Sol Kolon: Teklif sepetindeki ürünlerin kompakt özeti */}
              <div className="md:col-span-6 bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                  <span className="font-black text-xs text-slate-800 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                    <ShoppingBag className="w-4 h-4 text-emerald-600" />
                    <span>Teklif Sepeti Özeti ({quoteBasket.length})</span>
                  </span>
                  <span className="text-xs font-semibold text-slate-400 font-mono">
                    {settings.taxNote || "KDV Hariç"}
                  </span>
                </div>

                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {quoteBasket.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400 font-medium">
                      Sepetinizde ürün bulunmamaktadır.
                    </div>
                  ) : (
                    quoteBasket.map((item) => (
                      <div key={item.id} className="bg-white border border-slate-200/80 rounded-xl p-3 space-y-1 shadow-3xs">
                        <div className="flex justify-between items-start">
                          <span className="font-extrabold text-xs text-slate-900 leading-snug">{item.urun_adi}</span>
                          <span className="font-black text-xs text-[#0b1c3f] font-mono shrink-0 ml-2">
                            {item.toplam_fiyat > 0 ? `₺${Math.round(item.toplam_fiyat).toLocaleString("tr-TR")}` : "Özel Teklif"}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 text-[10.5px] text-slate-500 font-medium">
                          <span>{item.olculer}</span>
                          <span>•</span>
                          <span className="font-mono font-bold text-slate-700">{item.miktar.toLocaleString("tr-TR")} {item.satis_sekli || "Adet"}</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-bold">{item.baski_durumu === "Baskısız" ? "Baskısız" : item.renk_sayisi}</span>
                          {item.fatura_cebi_dahil && (
                            <>
                              <span>•</span>
                              <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[9.5px]">Fatura Cebi Dahil</span>
                            </>
                          )}
                        </div>
                        {item.logo_dosya_adi && (
                          <div className="text-[10px] text-emerald-800 bg-emerald-50/90 border border-emerald-200/80 rounded-md px-2 py-0.5 mt-0.5 font-sans flex items-center space-x-1.5">
                            <span className="font-bold shrink-0">📎 Logo:</span>
                            <span className="font-semibold truncate">{item.logo_dosya_adi}</span>
                          </div>
                        )}
                        {item.musteri_notu && (
                          <div className="text-[10px] text-rose-800 bg-rose-50/90 border border-rose-200/80 rounded-md px-2 py-0.5 mt-0.5 font-sans flex items-start space-x-1">
                            <span className="font-bold shrink-0">🔴 Not:</span>
                            <span className="italic font-medium">{item.musteri_notu}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Total Summary */}
                <div className="border-t border-slate-200/80 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-bold text-xs text-slate-600">Toplam Tahmini Tutar:</span>
                  {isZeroOrCustom ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      Özel İmalat / Teklif İle Belirlenecektir
                    </span>
                  ) : (
                    <span className="font-black text-lg text-emerald-700 font-mono">
                      ₺{Math.round(totalPrice).toLocaleString("tr-TR")}
                    </span>
                  )}
                </div>

                {settings.validityNote && (
                  <p className="text-[10px] text-slate-400 font-medium italic pt-1">
                    * {settings.validityNote}
                  </p>
                )}
              </div>

              {/* Sağ Kolon: İletişim bilgileri formu */}
              <div className="md:col-span-6 space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h5 className="font-black text-xs text-slate-800 uppercase tracking-wider font-mono">
                    Teklif Sahibinin Bilgileri
                  </h5>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Lütfen resmi şartname ve teklif için bilgilerinizi girin.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-700 block mb-1">Ad Soyad *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Adınız ve Soyadınız"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-[#0b1c3f]"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold text-slate-700 block mb-1">Firma / Marka Adı</label>
                    <input
                      type="text"
                      value={formData.company || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Firma Unvanı (Opsiyonel)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-[#0b1c3f]"
                    />
                  </div>

                  {/* B) AYLIK TÜKETİM INPUT ALANI: settings.showMonthlyConsumption === true ise */}
                  {settings.showMonthlyConsumption && (
                    <div>
                      <label className="text-[10.5px] font-bold text-slate-700 block mb-1">
                        Aylık Ortalama Tüketiminiz {settings.requireMonthlyConsumption ? "*" : "(Opsiyonel)"}
                      </label>
                      <input
                        type="text"
                        required={settings.requireMonthlyConsumption}
                        value={formData.monthlyConsumption || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, monthlyConsumption: e.target.value }))}
                        placeholder="Örn: 25.000 Adet veya 500 Kg"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-[#0b1c3f]"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[10.5px] font-bold text-slate-700 block mb-1">Telefon Numarası *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="05XX XXX XX XX"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-[#0b1c3f]"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold text-slate-700 block mb-1">E-posta Adresi *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="ornek@firma.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-[#0b1c3f]"
                    />
                  </div>
                </div>
              </div>

            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200/80 p-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
          >
            ← Geri Dön / Ürün Ekle
          </button>

          <button
            type="submit"
            form="quote-checkout-form"
            style={{ backgroundColor: "#047857" }}
            className="w-full sm:w-auto px-8 py-3.5 text-white font-extrabold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all duration-200 shadow-md hover:shadow-lg hover:bg-emerald-800 active:scale-95 cursor-pointer"
          >
            <Send className="w-4 h-4 text-white" />
            <span>{settings.submitButtonText || "Teklif Talebini Gönder"} ({quoteBasket.length} Ürün)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
export default QuoteModal;
