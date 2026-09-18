import React, { useState } from "react";
import { PackageOpen, Sparkles, Search, Phone, MessageSquare, Info, ShieldCheck, Mail, MapPin, Menu, X } from "lucide-react";
import { getSubfolderPrefix } from "../utils/urlHelper";

interface HeaderProps {
  currentTab: "home" | "catalog" | "assistant" | "admin";
  setTab: (tab: "home" | "catalog" | "assistant" | "admin", categoryKey?: string | null) => void;
  quotationListCount?: number;
  onOpenQuotationList?: () => void;
}

export default function Header({ currentTab, setTab }: HeaderProps) {
  const [headerSearch, setHeaderSearch] = useState("");
  const [showInfoModal, setShowInfoModal] = useState<"kurumsal" | "referanslar" | "iletisim" | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (headerSearch.trim()) {
      // Direct user search input to catalog tab or assistant
      setTab("catalog");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo and Brand matching uploaded image with high-fidelity SVG emblem and subtitle */}
          <div className="flex items-center space-x-2">
            {/* Hamburger Button on mobile */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 text-slate-650 hover:text-slate-950 rounded-xl hover:bg-slate-50/80 transition-colors cursor-pointer"
              aria-label="Menüyü Aç"
            >
              <Menu className="w-5.5 h-5.5" />
            </button>
            
            <div 
              onClick={() => setTab("home")} 
              className="flex items-center space-x-3 cursor-pointer group select-none"
              id="brand-logo"
            >
            {/* High-fidelity custom red & blue swirling emblem */}
            <div className="w-11 h-11 relative shrink-0 transition-all duration-300 group-hover:scale-105" id="brand-logo-emblem">
              <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Red swirling component forming curved inner P outline */}
                <path 
                  d="M48 90 C32 90 19 77 17 61 C15 49 19 37 27 28 C35 19 47 14 60 14 C74 14 86 23 90 36 C80 31 69 29 58 32 C41 36 30 50 30 67 C30 79 39 88 51 88 C58 88 64 84 68 78 C60 83 49 84 41 79 C35 75 31 67 33 60 C35 52 42 47 50 47 C58 47 64 52 64 60 C64 67 59 73 52 74 C61 75 70 70 74 61 C77 53 76 43 71 35 C69 32 65 29 61 28 C58 27 54 26 50 26 C33 26 19 40 19 57 C19 73 31 86 47 87 L48 90 Z" 
                  fill="#E11D48" 
                />
                {/* Blue outer wave wrapping right and bottom */}
                <path 
                  d="M50 96 C23 96 7 81 7 57 C7 34 21 11 45 4 C35 9 28 18 25 28 C22 40 26 53 35 62 C43 70 54 75 65 75 C77 75 88 69 95 59 C91 72 81 83 67 89 C61 92 55 96 50 96 Z" 
                  fill="#0A4294" 
                />
                {/* Micro accent flare */}
                <path 
                  d="M93 33C95 40 95 48 93 55C95 47 95 39 91 31C87 23 80 17 71 14C80 16 88 23 92 31C92.5 31.5 92.8 32.5 93 33Z" 
                  fill="#0A4294" 
                />
              </svg>
            </div>
            
            <div className="flex flex-col justify-center">
              <div className="flex items-baseline leading-none">
                <span className="text-[21px] font-black tracking-tight text-[#0A4294] font-sans">Poset</span>
                <span className="text-[21px] font-black tracking-tight text-[#E11D48] font-sans">.com</span>
              </div>
              <span className="text-[8px] font-black text-[#0A4294] tracking-tight leading-none mt-1 font-sans">
                Türkiye’nin Ambalaj Çözüm Merkezi
              </span>
            </div>
          </div>
        </div>

          {/* Center Navigation Links: Ana Sayfa, Ürünlerimiz, Kurumsal, İletişim */}
          <nav className="hidden md:flex items-center space-x-6">
            <button
              onClick={() => setTab("home")}
              className={`relative py-1 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                currentTab === "home"
                  ? "text-[#0b1c3f]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              id="nav-tab-home"
            >
              <span>Ana Sayfa</span>
              {currentTab === "home" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0b1c3f] rounded-full" />
              )}
            </button>
            
            <button
              onClick={() => setTab("catalog")}
              className={`relative py-1 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                currentTab === "catalog"
                  ? "text-[#0b1c3f]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              id="nav-tab-catalog"
            >
              <span>Ürünlerimiz</span>
              {currentTab === "catalog" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0b1c3f] rounded-full" />
              )}
            </button>

            <button
              onClick={() => setShowInfoModal("kurumsal")}
              className="py-1 text-sm font-semibold text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
            >
              Kurumsal
            </button>

            <button
              onClick={() => setShowInfoModal("referanslar")}
              className="py-1 text-sm font-semibold text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
            >
              Referanslar
            </button>

            <button
              onClick={() => setShowInfoModal("iletisim")}
              className="py-1 text-sm font-semibold text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
            >
              İletişim
            </button>

            <button
              onClick={() => {
                setTab("admin");
                const subfolder = getSubfolderPrefix();
                window.history.pushState({}, "", `${subfolder}/yonetim`);
              }}
              className={`relative py-1 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                currentTab === "admin"
                  ? "text-[#0b1c3f]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              id="nav-tab-admin"
            >
              <span>Yönetim</span>
              {currentTab === "admin" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0b1c3f] rounded-full" />
              )}
            </button>


          </nav>

          {/* Right Area: Search, WhatsApp Support, Teklif Al button */}
          <div className="flex items-center space-x-3.5">
            
            {/* Hızlı Arama... search header input from mockups */}
            <form onSubmit={handleQuickSearch} className="hidden lg:flex items-center bg-slate-50 border border-slate-200 rounded-full px-3.5 py-1.5 space-x-2 w-48 focus-within:w-60 focus-within:border-[#0b1c3f] focus-within:bg-white transition-all duration-300">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Hızlı Arama..."
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                className="bg-transparent border-none text-xs text-slate-700 w-full focus:outline-none focus:ring-0 p-0"
              />
            </form>

            {/* Teklif Al solid blue button with right direction arrow */}
            <button
              onClick={() => setTab("assistant")}
              className="bg-[#0b1c3f] hover:bg-[#07132c] text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center space-x-2 transition-all cursor-pointer shadow-sm shadow-[#0b1c3f]/10"
              id="header-teklif-al-btn"
            >
              <span>Teklif Al</span>
              <span className="text-white font-mono shrink-0">→</span>
            </button>

          </div>
        </div>
      </header>

      {/* Off-Canvas Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] flex md:hidden">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Drawer Body (slides out from left) */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl border-r border-slate-100 p-6 animate-in slide-in-from-left duration-300 z-10">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
              <div className="flex items-center space-x-2 select-none">
                <div className="w-8 h-8 relative shrink-0">
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
                <div className="flex flex-col justify-center">
                  <div className="flex items-baseline leading-none">
                    <span className="text-base font-black tracking-tight text-[#0A4294] font-sans">Poset</span>
                    <span className="text-base font-black tracking-tight text-[#E11D48] font-sans">.com</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 -mr-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex flex-col space-y-2">
              <button
                onClick={() => {
                  setTab("home");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left py-3 px-4 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  currentTab === "home"
                    ? "bg-[#0b1c3f]/5 text-[#0b1c3f]"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/50"
                }`}
              >
                Ana Sayfa
              </button>
              
              <button
                onClick={() => {
                  setTab("catalog");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left py-3 px-4 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  currentTab === "catalog"
                    ? "bg-[#0b1c3f]/5 text-[#0b1c3f]"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/50"
                }`}
              >
                Ürünlerimiz
              </button>

              <button
                onClick={() => {
                  setShowInfoModal("kurumsal");
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left py-3 px-4 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50/50 transition-all cursor-pointer"
              >
                Kurumsal
              </button>

              <button
                onClick={() => {
                  setShowInfoModal("referanslar");
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left py-3 px-4 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50/50 transition-all cursor-pointer"
              >
                Referanslar
              </button>

              <button
                onClick={() => {
                  setShowInfoModal("iletisim");
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left py-3 px-4 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50/50 transition-all cursor-pointer"
              >
                İletişim
              </button>
            </nav>

            {/* Quick Contact Footer in Drawer */}
            <div className="mt-auto pt-6 border-t border-slate-100 space-y-3.5 text-xs text-slate-500 font-medium">
              <p className="font-bold text-slate-900 text-sm">Ambalaj Market</p>
              <div className="flex items-center space-x-2.5">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span>+90 (212) 526 00 36</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span>info@poset.com</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Styled Modals for Kurumsal, Referanslar & Iletisim */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full md:w-3/4 md:max-w-none max-w-lg overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in-50 zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#0b1c3f] text-white p-6 relative">
              <button
                onClick={() => setShowInfoModal(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-mono cursor-pointer"
              >
                ✕
              </button>
              <div className="space-y-1">
                <h4 className="font-bold font-display text-lg">
                  {showInfoModal === "kurumsal" 
                    ? "Kurumsal Bilgiler" 
                    : showInfoModal === "referanslar" 
                      ? "Referanslarımız" 
                      : "İletişim Kanallarımız"}
                </h4>
                <p className="text-xs text-slate-300">
                  {showInfoModal === "kurumsal" 
                    ? "Güvenilir ambalaj imalatında 20+ yıllık tecrübe." 
                    : showInfoModal === "referanslar"
                      ? "Türkiye'nin öncü e-ticaret, retail ve gıda devlerinin ambalaj üreticisi."
                      : "Hızlı müşteri temsilcimizle dilediğiniz an irtibat kurun."}
                </p>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 md:p-8 space-y-6 text-slate-600 text-sm leading-relaxed max-h-[75vh] overflow-y-auto">
              {showInfoModal === "kurumsal" ? (
                <div className="space-y-4 text-xs font-medium text-slate-600 leading-relaxed">
                  <p className="text-[13px] font-bold text-[#0A369D] leading-normal border-b border-slate-100 pb-2">
                    Ambalaj Market San. Tic. Ltd. Şti. (Poset.com)
                  </p>
                  
                  <p>
                    Bir ürünün sadece koruyucusu değil, aynı zamanda markanızın sessiz elçisidir. Müşteriniz mağazanızdan çıktığında, elinde taşıdığı poşet ile markanızı şehrin sokaklarında dolaştırır. Biz <strong>Poset.com</strong> olarak, bu sorumluluğun bilinciyle hareket ediyor; işinizi kendi işimiz gibi sahipleniyoruz.
                  </p>

                  <p>
                    1992 yılından bu yana sektördeki tecrübemizi, <strong>poset.com</strong> markası altında dijital dünyaya taşıdık. Modern üretim tesislerimizde; el geçme, takviyeli, yumuşak saplı ve atlet poşet grupları başta olmak üzere, firmanıza özel baskılı ambalaj çözümleri üretiyoruz.
                  </p>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2">
                    <p className="font-bold text-slate-900 text-[11.5px]">Neden Biz?</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                      Sadece poşet üretmiyoruz; markanıza değer katıyoruz. Yüksek tonajlı üretim kapasitemiz sayesinde, en büyük kurumsal zincirlerden butik işletmelere kadar her ölçekteki talebi, <strong>İstanbul Fatih</strong> bölgesindeki fabrikamızdan Türkiye'nin her yerine zamanında ve eksiksiz ulaştırıyoruz.
                    </p>
                  </div>

                  <p>
                    Teknolojik makine parkurumuz sayesinde, Pantone renklerine sadık baskı kalitesi sunuyor, firmanızın kurumsal kimliğini ambalajlarınıza birebir yansıtıyoruz. İster plastik (PE) ister doğa dostu biyobozunur seçenekler olsun; <strong>poset.com</strong> güvencesiyle, kaliteden ödün vermeden en rekabetçi fiyatları sunmayı taahhüt ediyoruz.
                  </p>

                  <div className="bg-rose-50/50 border border-rose-100 p-3.5 rounded-2xl text-center font-bold text-rose-700 text-[11px]">
                    "Siz işinizi büyütmeye odaklanın, ambalaj yükünü biz taşıyalım."
                  </div>
                </div>
              ) : showInfoModal === "referanslar" ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                    Fabrikamızda ürettiğimiz marka logolu, yüksek kaliteli baskılı ambalaj çözümlerimizle Türkiye'nin ve dünyanın önde gelen kurumsal markasına hizmet sunuyoruz
                  </p>
                  
                  {/* Comprehensive grid displaying all 20 reference brands precisely matching user image */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" id="brand-references-grid">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center hover:bg-slate-100/50 transition-all cursor-default">
                      <p className="font-black text-[#E31B23] text-sm tracking-tight">arçelik</p>
                      <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Teknoloji & Mağaza</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center hover:bg-slate-100/50 transition-all cursor-default">
                      <p className="font-extrabold text-[#000000] text-xs tracking-widest uppercase">ARMİNE</p>
                      <p className="text-[9px] text-slate-400 font-bold mt-1.5 uppercase">Premium Tekstil</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center hover:bg-slate-100/50 transition-all cursor-default">
                      <p className="font-black text-[#009E49] text-xs leading-none">BEREKET<br/><span className="text-red-600 text-[9px]">DÖNER</span></p>
                      <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Gıda Ambalajı</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center hover:bg-slate-100/50 transition-all cursor-default">
                      <p className="font-bold text-[#0A2B5C] text-xs tracking-tight font-sans">ENGLISH HOME</p>
                      <p className="text-[9px] text-slate-400 font-bold mt-1.5 uppercase">Ev Tekstili Çantası</p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center hover:bg-slate-100/50 transition-all cursor-default">
                      <p className="font-serif font-semibold text-[#0B4C30] text-[10px] leading-tight">EYÜP SABRİ TUNCER<br/><span className="text-[9px] font-mono text-slate-400">1923</span></p>
                      <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Logolu Kraft Çanta</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center hover:bg-slate-100/50 transition-all cursor-default">
                      <p className="font-black text-[#E20074] text-xs tracking-tight">flormar</p>
                      <p className="text-[9px] text-slate-400 font-bold mt-1.5 uppercase">Kozmetik Poşetleri</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center hover:bg-slate-100/50 transition-all cursor-default">
                      <p className="font-extrabold text-[#5D1F87] bg-yellow-300 px-1 py-0.5 rounded text-xs tracking-tight inline-block">gratis</p>
                      <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Baskılı Plastik</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center hover:bg-slate-100/50 transition-all cursor-default">
                      <p className="font-black text-[#1D3172] text-[11px] tracking-widest">HUNCA</p>
                      <p className="text-[9px] text-slate-400 font-bold mt-1.5 uppercase">Kozmetik Çözümleri</p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center hover:bg-slate-100/50 transition-all cursor-default">
                      <p className="font-black text-rose-700 text-[9px] border-y border-slate-300 py-0.5 tracking-tighter">INTEGRAL JEANS</p>
                      <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Tekstil Ambalajı</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center hover:bg-slate-100/50 transition-all cursor-default">
                      <p className="font-serif font-black text-[#C5A059] text-[10px] leading-tight">KAYSERİ MUTFAĞI</p>
                      <p className="text-[9px] text-slate-400 font-bold mt-1.5 uppercase">Paket Servis Torbası</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center hover:bg-slate-100/50 transition-all cursor-default">
                      <p className="font-black text-[#FF5E00] text-xs">Link <span className="text-slate-800 text-[10px]">tech</span></p>
                      <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Elektronik Kutulu</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center hover:bg-slate-100/50 transition-all cursor-default">
                      <p className="font-extrabold text-slate-900 text-sm tracking-tight">LTB <span className="text-[10px] font-normal">Jeans</span></p>
                      <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Mağaza Ambalajı</p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center hover:bg-slate-100/50 transition-all cursor-default">
                      <p className="font-medium text-slate-800 text-[10px] tracking-widest uppercase">MADAME COCO</p>
                      <p className="text-[9px] text-slate-400 font-bold mt-1.5 uppercase">Ekolojik Kâğıt Çantası</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center hover:bg-slate-100/50 transition-all cursor-default">
                      <p className="font-bold text-[#005CB9] text-xs font-sans tracking-tight">Panasonic</p>
                      <p className="text-[9px] text-slate-400 font-bold mt-1.5 uppercase">Yüksek Mukavemetli</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center hover:bg-slate-100/50 transition-all cursor-default">
                      <p className="font-black text-[#E30613] text-xs border border-[#E30613] px-1 rounded inline-block">PAPA JOHN'S</p>
                      <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Sıcak Paket Korumalı</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center hover:bg-slate-100/50 transition-all cursor-default">
                      <p className="font-extrabold text-[#E30613] text-xs tracking-tighter">R@SSMANN</p>
                      <p className="text-[9px] text-slate-400 font-bold mt-1.5 uppercase">Çevre Dostu Biyobozunur</p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center hover:bg-slate-100/50 transition-all cursor-defaultcol-span-1">
                      <p className="font-serif italic font-black text-[#7C1236] text-[10px] leading-none">Saray<br/><span className="text-[8px] font-sans tracking-widest not-italic">1935</span></p>
                      <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Paket Servis Taşıma</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center hover:bg-slate-100/50 transition-all cursor-default">
                      <p className="font-black text-slate-800 text-xs tracking-wider">SILVERLINE</p>
                      <p className="text-[9px] text-slate-400 font-bold mt-1.5 uppercase">Ağır Hizmet Poşeti</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center hover:bg-slate-100/50 transition-all cursor-default">
                      <p className="font-black text-[#005CB9] border-x-2 border-[#FF5500] px-1 text-xs">TEKZEN</p>
                      <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Endüstriyel Paket</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center hover:bg-slate-100/50 transition-all cursor-default">
                      <p className="font-black text-[#009B4E] text-xs tracking-tight">uludağ <span className="text-[9px] font-normal block text-rose-600 leading-none">İÇECEK</span></p>
                      <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Isıl Isı Büzüşmeli</p>
                    </div>
                  </div>

                  <div className="bg-amber-50/50 border border-amber-200/50 p-3 rounded-2xl flex items-start space-x-2.5">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10.5px] text-slate-600 font-semibold leading-relaxed">
                      <strong>Kurumsal Kalite Güvencesi:</strong> Tüm paydaşlarımıza Pantone standartlarına sadık, yüksek çözünürlüklü 8 renge kadar flekso klik baskı kalitesi ve ücretsiz klişe/tasarım desteği sağlıyoruz.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid md:grid-cols-12 gap-6 items-stretch">
                  {/* Left Column: Contact Details */}
                  <div className="md:col-span-5 space-y-4">
                    <div className="flex items-center space-x-3.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-100/80">
                      <MapPin className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-[10px] font-mono uppercase text-slate-400 font-bold">Adres</p>
                        <p className="font-bold text-slate-900 text-[12.5px] leading-snug">Cemal Yener Tosyalı Cad. No:50 Vefa / İSTANBUL</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-100/80">
                      <Phone className="w-5 h-5 text-indigo-600 shrink-0" />
                      <div>
                        <p className="text-[10px] font-mono uppercase text-slate-400 font-bold">Telefon</p>
                        <p className="font-bold text-slate-900 text-[12.5px] font-mono">+90 (212) 526 00 36</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-100/80">
                      <svg className="w-5 h-5 fill-current text-[#25D366] shrink-0" viewBox="0 0 24 24">
                        <path d="M12.004 2C6.48 2 2 6.48 2 12C2 13.9 2.53 15.68 3.45 17.2L2 22L6.96 20.65C8.42 21.52 10.13 22 12.004 22C17.528 22 22.008 17.52 22.008 12C22.008 6.48 17.528 2 12.004 2ZM17.144 16.59C16.924 17.21 16.034 17.75 15.394 17.9C14.864 18.03 14.184 18.12 11.834 17.15C8.834 15.91 6.894 12.87 6.744 12.67C6.594 12.47 5.484 11 5.484 9.48C5.484 7.96 6.254 7.22 6.544 6.92C6.774 6.69 7.154 6.58 7.514 6.58C7.634 6.58 7.744 6.59 7.844 6.59C8.134 6.6 8.284 6.62 8.474 7.07C8.714 7.65 9.304 9.08 9.374 9.23C9.444 9.38 9.514 9.58 9.414 9.78C9.314 9.98 9.234 10.08 9.084 10.25C8.934 10.42 8.794 10.55 8.644 10.73C8.504 10.89 8.344 11.06 8.524 11.37C8.704 11.67 9.324 12.69 10.244 13.51C11.434 14.57 12.414 14.91 12.734 15.05C13.054 15.19 13.244 15.16 13.424 14.95C13.604 14.74 14.214 14.03 14.434 13.72C14.654 13.41 14.874 13.46 15.174 13.57C15.474 13.68 17.074 14.47 17.404 14.63C17.734 14.79 17.954 14.87 18.034 15.01C18.114 15.15 18.114 15.82 17.894 16.44L17.144 16.59Z"/>
                      </svg>
                      <div>
                        <p className="text-[10px] font-mono uppercase text-slate-400 font-bold">WhatsApp</p>
                        <a 
                          href="https://wa.me/905322153403" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="font-bold text-slate-900 text-[12.5px] font-mono hover:text-[#25D366] transition-colors"
                        >
                          +90 (532) 215 34 03
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-100/80">
                      <Mail className="w-5 h-5 text-[#e11d48] shrink-0" />
                      <div>
                        <p className="text-[10px] font-mono uppercase text-slate-400 font-bold">E-Posta Adresi</p>
                        <a 
                          href="mailto:info@poset.com" 
                          className="font-bold text-slate-900 text-[12.5px] hover:text-[#e11d48] transition-colors"
                        >
                          info@poset.com
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Google Map */}
                  <div className="md:col-span-7 h-[280px] rounded-2xl overflow-hidden border border-slate-200 shadow-xs relative">
                    <iframe
                      title="Ambalaj Market Google Maps"
                      src="https://maps.google.com/maps?q=Ambalaj%20Market%20Cemal%20Yener%20Tosyali%20Cad.%20No:50%20Vefa%20Istanbul&t=&z=16&ie=UTF8&iwloc=&output=embed"
                      className="absolute inset-0 w-full h-full border-none"
                      allowFullScreen={false}
                      loading="lazy"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowInfoModal(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-5 rounded-xl cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
