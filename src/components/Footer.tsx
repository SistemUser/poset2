import React, { useState } from "react";
import { Mail, MapPin, Phone, X, Award, Shield, FileText, Building } from "lucide-react";

interface FooterProps {
  setTab: (tab: "home" | "catalog" | "assistant", categoryKey?: string | null) => void;
}

type ModalType = "about" | "references" | "kvkk" | "disclosure" | null;

export default function Footer({ setTab }: FooterProps) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  // ... rest remains same ...
  // search down to column 2:
  // (Note: we replace the props and the product links block)


  const renderModalContent = () => {
    switch (activeModal) {
      case "about":
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 mb-2 shrink-0">
              <Building className="w-8 h-8 text-sky-700" />
              <h4 className="text-xl font-bold text-slate-900">Kurumsal Hakkımızda</h4>
            </div>
            <div className="max-h-[350px] overflow-y-auto space-y-3.5 text-sm text-slate-650 leading-relaxed pr-2" id="about-us-scrollable">
              <p>
                <strong className="text-slate-900">Ambalaj Market San. Tic. Ltd. Şti (Poset.com)</strong>, bir ürünün sadece koruyucusu değil, aynı zamanda markanızın sessiz elçisidir. Müşteriniz mağazanızdan çıktığında, elinde taşıdığı poşet ile markanızı şehrin sokaklarında dolaştırır. Biz Poset.com olarak, bu sorumluluğun bilinciyle hareket ediyor; işinizi kendi işimiz gibi sahipleniyoruz.
              </p>
              <p>
                1992 yılından bu yana sektördeki tecrübemizi, poset.com markası altında dijital dünyaya taşıdık. Modern üretim tesislerimizde; el geçme, takviyeli, yumuşak saplı ve atlet poşet grupları başta olmak üzere, firmanıza özel baskılı ambalaj çözümleri üretiyoruz.
              </p>
              <p>
                <strong className="text-slate-900">Neden Biz?</strong> Sadece poşet üretmiyoruz; markanıza değer katıyoruz. Yüksek tonajlı üretim kapasitemiz sayesinde, en büyük kurumsal zincirlerden butik işletmelere kadar her ölçekteki talebi, İstanbul Fatih bölgesindeki fabrikamızdan Türkiye'nin her yerine zamanında ve eksiksiz ulaştırıyoruz.
              </p>
              <p>
                Teknolojik makine parkurumuz sayesinde, Pantone renklerine sadık baskı kalitesi sunuyor, firmanızın kurumsal kimliğini ambalajlarına birebir yansıtıyoruz. İster plastik (PE) ister doğa dostu biyobozunur seçenekler olsun; poset.com güvencesiyle, kaliteden ödün vermeden en rekabetçi fiyatları sunmayı taahhüt ediyoruz.
              </p>
              <p className="font-semibold text-sky-800 italic border-l-2 border-sky-600 pl-3 mt-4">
                "Siz işinizi büyütmeye odaklanın, ambalaj yükünü biz taşıyalım."
              </p>
            </div>
          </div>
        );
      case "references":
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 mb-2">
              <Award className="w-8 h-8 text-sky-700" />
              <h4 className="text-xl font-bold text-slate-900">Güçlü Referanslarımız</h4>
            </div>
            <p className="text-slate-600 text-sm">
              Türkiye'nin öncü e-ticaret siteleri, lojistik devleri, ulusal perakende zincirleri ve kurumsal şirketleri ambalaj ihtiyaçlarında Ambalaj Market güvencesine güveniyor.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {[
                "Trendyol Lojistik Ağları",
                "Hepsiburada Satıcı Paketleri",
                "Yurtiçi Kargo Gönderileri",
                "Aras Kargo Ambalaj Çözümleri",
                "LC Waikiki Mağaza Poşetleri",
                "Defacto Alışveriş Ambalajları",
                "MNG Kargo Gönderim Ekipmanları",
                "Arçelik Beyaz Eşya Ruloları"
              ].map((ref, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-slate-700 font-medium text-xs flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-700 shrink-0" />
                  <span>{ref}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 italic pt-2">
              * Gizlilik sözleşmeleri gereği diğer binlerce KOBİ düzeyindeki kıymetli iş ortağımızın unvanları saklı tutulmuştur.
            </p>
          </div>
        );
      case "kvkk":
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 mb-2">
              <Shield className="w-8 h-8 text-sky-700" />
              <h4 className="text-xl font-bold text-slate-900">KVKK Politikası</h4>
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-3 text-xs text-slate-600 leading-relaxed pr-2">
              <p>
                <strong>Veri Sorumlusu:</strong> Ambalaj Market San. Tic. Ltd. Şti. (poset.com)
              </p>
              <p>
                6698 sayılı Kişisel Verilerin Korunması Kanunu ("Kanun") uyarınca kişisel verileriniz, kurumsal tekliflendirme süreçleri ve kargo gönderileri kapsamında işlenmektedir.
              </p>
              <p>
                <strong>Hangi Verileri İşliyoruz?</strong><br />
                Sitemizdeki teklif sihirbazı veya iletişim formları aracılığıyla paylaştığınız Ad, Soyad, Telefon Numarası, E-posta Adresi ve Firma Bilgileriniz veri tabanımızda kayıtlı tutulur.
              </p>
              <p>
                <strong>İşleme Amaçları:</strong><br />
                - Şirketimiz tarafından sunulan ticari ürün tekliflerinin hazırlanması ve size ulaştırılması.<br />
                - Üretilen ambalaj mallarının adresinize sevkiyatının yönetilmesi.<br />
                - Müşteri geri bildirimlerinin değerlendirilmesi ve taleplerinizin destek hattımızca çözüme kavuşturulması.
              </p>
              <p>
                Kişisel verileriniz hiçbir şekilde izniniz olmaksızın pazarlama ortaklıkları veya üçüncü şahıslarla paylaşılmaz.
              </p>
            </div>
          </div>
        );
      case "disclosure":
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 mb-2">
              <FileText className="w-8 h-8 text-sky-700" />
              <h4 className="text-xl font-bold text-slate-900">KVKK Aydınlatma Metni</h4>
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-3 text-xs text-slate-600 leading-relaxed pr-2">
              <p>
                Bu Aydınlatma Metni, 6698 Sayılı Kişisel Verilerin Korunması Kanunu’nun 10. maddesi doğrultusunda hazırlanmıştır.
              </p>
              <p>
                <strong>Çerezler ve Analitikler:</strong><br />
                poset.com sitemizi ziyaretleriniz esnasında kullanılan çerezler (cookies) yalnızca sepet listeleri, teklif kalemlerinin hafızada kalması ve genel site optimize analizleri için anonim olarak kullanılmaktadır.
              </p>
              <p>
                <strong>Haklarınız:</strong><br />
                Kanun'un 11. maddesi kapsamındaki haklarınız uyarınca; kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, silinmesini veya düzeltilmesini isteme haklarına sahipsiniz. İlgili taleplerinizi <strong className="text-slate-900">info@poset.com</strong> adresine güvenle iletebilirsiniz.
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <footer className="bg-white border-t border-slate-100 mt-20" id="global-footer">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8 text-slate-600 text-sm">
        
        {/* Column 1: Logo & Resmi Unvan */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 select-none" id="footer-logo">
            <div className="w-9 h-9 relative shrink-0">
              <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path 
                  d="M48 90 C32 90 19 77 17 61 C15 49 19 37 27 28 C35 19 47 14 60 14 C74 14 86 23 90 36 C80 31 69 29 58 32 C41 36 30 50 30 67 C30 79 39 88 51 88 C58 88 64 84 68 78 C60 83 49 84 41 79 C35 75 31 67 33 60 C35 52 42 47 50 47 C58 47 64 52 64 60 C64 67 59 73 52 74 C61 75 70 70 74 61 C77 53 76 43 71 35 C69 32 65 29 61 28 C58 27 54 26 50 26 C33 26 19 40 19 57 C19 73 31 86 47 87 L48 90 Z" 
                  fill="#E11D48" 
                />
                <path 
                  d="M50 96 C23 96 7 81 7 57 C7 34 21 11 45 4 C35 9 28 18 25 28 C22 40 26 53 35 62 C43 70 54 75 65 75 C77 75 88 69 95 59 C91 72 81 83 67 89 C61 92 55 96 50 96 Z" 
                  fill="#0A4294" 
                />
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline leading-none">
                <span className="text-[17px] font-black tracking-tight text-[#0A4294] font-sans">Poset</span>
                <span className="text-[17px] font-black tracking-tight text-[#E11D48] font-sans">.com</span>
              </div>
              <span className="text-[7.5px] font-extrabold text-[#0A4294] tracking-tight leading-none mt-0.5 font-sans">
                Türkiye’nin Ambalaj Çözüm Merkezi
              </span>
            </div>
          </div>
          
          <div className="text-slate-900 font-medium mt-3" id="official-company-title">
            Ambalaj Market San. Tic. Ltd. Şti.
          </div>
          
          <p className="text-slate-500 text-xs sm:text-sm leading-relaxed" id="footer-slogan">
            Endüstriyel ambalaj sektöründe güven ve operasyonel verimlilik odaklı B2B çözüm ortağınız.
          </p>
        </div>

        {/* Column 2: Ürünlerimiz */}
        <div>
          <h5 className="text-slate-900 font-bold mb-4 tracking-wider text-xs uppercase" id="footer-products-title">
            Ürünlerimiz
          </h5>
          <ul className="space-y-2.5 text-xs sm:text-sm">
            <li>
              <button 
                onClick={() => setTab("catalog", "kargo_eticaret")} 
                className="hover:text-sky-950 cursor-pointer transition-colors duration-200 text-left"
              >
                Kargo & E-Ticaret Poşetleri
              </button>
            </li>
            <li>
              <button 
                onClick={() => setTab("catalog", "plastik_poset")} 
                className="hover:text-sky-950 cursor-pointer transition-colors duration-200 text-left"
              >
                Mağaza Poşetleri
              </button>
            </li>
            <li>
              <button 
                onClick={() => setTab("catalog", "plastik_poset")} 
                className="hover:text-sky-950 cursor-pointer transition-colors duration-200 text-left"
              >
                Market Poşetleri
              </button>
            </li>
            <li>
              <button 
                onClick={() => setTab("catalog", "kagit_karton")} 
                className="hover:text-sky-950 cursor-pointer transition-colors duration-200 text-left"
              >
                Kağıt & Kraft Çantalar
              </button>
            </li>
            <li>
              <button 
                onClick={() => setTab("catalog", "koruyucu_endustriyel")} 
                className="hover:text-sky-950 cursor-pointer transition-colors duration-200 text-left"
              >
                Endüstriyel Rulolar
              </button>
            </li>
          </ul>
        </div>

        {/* Column 3: Kurumsal */}
        <div>
          <h5 className="text-slate-900 font-bold mb-4 tracking-wider text-xs uppercase" id="footer-corporate-title">
            Kurumsal
          </h5>
          <ul className="space-y-2.5 text-xs sm:text-sm">
            <li>
              <button 
                onClick={() => setActiveModal("about")}
                className="hover:text-sky-955 cursor-pointer transition-colors duration-200 text-left bg-transparent border-none p-0"
              >
                Hakkımızda
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveModal("references")}
                className="hover:text-sky-1000 cursor-pointer transition-colors duration-200 text-left bg-transparent border-none p-0"
              >
                Referanslarımız
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveModal("kvkk")}
                className="hover:text-sky-1000 cursor-pointer transition-colors duration-200 text-left bg-transparent border-none p-0"
              >
                KVKK Politikası
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveModal("disclosure")}
                className="hover:text-sky-1000 cursor-pointer transition-colors duration-200 text-left bg-transparent border-none p-0"
              >
                Aydınlatma Metni
              </button>
            </li>
          </ul>
        </div>

        {/* Column 4: İletişim */}
        <div>
          <h5 className="text-slate-900 font-bold mb-4 tracking-wider text-xs uppercase" id="footer-contact-title">
            İletişim
          </h5>
          <ul className="space-y-3.5 text-xs sm:text-sm">
            <li className="flex items-start space-x-2.5">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>Cemal Yener Tosyalı Cad. No:50 Vefa / İSTANBUL</span>
            </li>
            <li className="flex items-center space-x-2.5">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <span>+90 (212) 526 00 36</span>
            </li>
            <li className="flex items-center space-x-2.5">
              <svg className="w-4 h-4 text-emerald-500 shrink-0 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.004 2C6.48 2 2 6.48 2 12C2 13.9 2.53 15.68 3.45 17.2L2 22L6.96 20.65C8.42 21.52 10.13 22 12.004 22C17.528 22 22.008 17.52 22.008 12C22.008 6.48 17.528 2 12.004 2ZM17.144 16.59C16.924 17.21 16.034 17.75 15.394 17.9C14.864 18.03 14.184 18.12 11.834 17.15C8.834 15.91 6.894 12.87 6.744 12.67C6.594 12.47 5.484 11 5.484 9.48C5.484 7.96 6.254 7.22 6.544 6.92C6.774 6.69 7.154 6.58 7.514 6.58C7.634 6.58 7.744 6.59 7.844 6.59C8.134 6.6 8.284 6.62 8.474 7.07C8.714 7.65 9.304 9.08 9.374 9.23C9.444 9.38 9.514 9.58 9.414 9.78C9.314 9.98 9.234 10.08 9.084 10.25C8.934 10.42 8.794 10.55 8.644 10.73C8.504 10.89 8.344 11.06 8.524 11.37C8.704 11.67 9.324 12.69 10.244 13.51C11.434 14.57 12.414 14.91 12.734 15.05C13.054 15.19 13.244 15.16 13.424 14.95C13.604 14.74 14.214 14.03 14.434 13.72C14.654 13.41 14.874 13.46 15.174 13.57C15.474 13.68 17.074 14.47 17.404 14.63C17.734 14.79 17.954 14.87 18.034 15.01C18.114 15.15 18.114 15.82 17.894 16.44L17.144 16.59Z"/>
              </svg>
              <a 
                href="https://wa.me/905322153403" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-emerald-500 hover:underline transition-colors duration-200"
              >
                +90 (532) 215 34 03
              </a>
            </li>
            <li className="flex items-center space-x-2.5">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="hover:text-sky-900 cursor-pointer transition-colors duration-200">
                info@poset.com
              </span>
            </li>
          </ul>
        </div>

      </div>

      {/* Corporate Info Modals */}
      {activeModal !== null && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <div 
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setActiveModal(null)}
          />
          {/* Modal box */}
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full p-6 relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-700 p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
              title="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
            {renderModalContent()}
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setActiveModal(null)}
                className="bg-slate-900 hover:bg-slate-850 text-white text-xs font-bold py-2 px-4 rounded-lg cursor-pointer transition-colors duration-150"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom copyright line */}
      <div 
        className="bg-slate-50/80 border-t border-slate-100 py-4 px-6" 
        id="sub-footer-copyright"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <p className="text-center md:text-left">
            © 2026 Ambalaj Market - Türkiye'nin Ambalaj Çözüm Merkezi. Tüm Hakları Saklıdır.
          </p>
          <a 
            href="https://reksa.net" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-sky-900 transition-colors duration-200"
          >
            Web Tasarım
          </a>
        </div>
      </div>
    </footer>
  );
}
