import React, { useState } from "react";
import { Search, Phone, Mail, Menu, X } from "lucide-react";

export type TabType = "home" | "catalog" | "assistant" | "admin" | "guide" | "about" | "references" | "contact";

interface HeaderProps {
  currentTab: TabType;
  setTab: (tab: TabType, categoryKey?: string | null) => void;
  quotationListCount?: number;
  onOpenQuotationList?: () => void;
}

export default function Header({ currentTab, setTab }: HeaderProps) {
  const [headerSearch, setHeaderSearch] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (headerSearch.trim()) {
      setTab("catalog");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo and Brand */}
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
            {/* Swirling emblem */}
            <div className="w-11 h-11 relative shrink-0 transition-all duration-300 group-hover:scale-105" id="brand-logo-emblem">
              <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path 
                  d="M48 90 C32 90 19 77 17 61 C15 49 19 37 27 28 C35 19 47 14 60 14 C74 14 86 23 90 36 C80 31 69 29 58 32 C41 36 30 50 30 67 C30 79 39 88 51 88 C58 88 64 84 68 78 C60 83 49 84 41 79 C35 75 31 67 33 60 C35 52 42 47 50 47 C58 47 64 52 64 60 C64 67 59 73 52 74 C61 75 70 70 74 61 C77 53 76 43 71 35 C69 32 65 29 61 28 C58 27 54 26 50 26 C33 26 19 40 19 57 C19 73 31 86 47 87 L48 90 Z" 
                  fill="#E11D48" 
                />
                <path 
                  d="M50 96 C23 96 7 81 7 57 C7 34 21 11 45 4 C35 9 28 18 25 28 C22 40 26 53 35 62 C43 70 54 75 65 75 C77 75 88 69 95 59 C91 72 81 83 67 89 C61 92 55 96 50 96 Z" 
                  fill="#0A4294" 
                />
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

          {/* Center Navigation Links: Ana Sayfa, Kurumsal, Ürünlerimiz, Referanslar, İletişim, Ambalaj Rehberi */}
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
              onClick={() => setTab("about")}
              className={`relative py-1 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                currentTab === "about"
                  ? "text-[#0b1c3f]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              id="nav-tab-about"
            >
              <span>Kurumsal</span>
              {currentTab === "about" && (
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
              onClick={() => setTab("references")}
              className={`relative py-1 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                currentTab === "references"
                  ? "text-[#0b1c3f]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              id="nav-tab-references"
            >
              <span>Referanslar</span>
              {currentTab === "references" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0b1c3f] rounded-full" />
              )}
            </button>

            <button
              onClick={() => setTab("contact")}
              className={`relative py-1 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                currentTab === "contact"
                  ? "text-[#0b1c3f]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              id="nav-tab-contact"
            >
              <span>İletişim</span>
              {currentTab === "contact" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0b1c3f] rounded-full" />
              )}
            </button>

            <button
              onClick={() => setTab("guide")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentTab === "guide"
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
              }`}
              id="nav-tab-guide"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>Ambalaj Rehberi</span>
            </button>
          </nav>

          {/* Right Area: Search, Teklif Al button */}
          <div className="flex items-center space-x-3.5">
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
          <div 
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <div className="relative w-4/5 max-w-sm bg-white h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto z-10 animate-in slide-in-from-left duration-250">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => { setTab("home"); setIsMobileMenuOpen(false); }}>
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

              {/* Mobile Navigation Links */}
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
                    setTab("about");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left py-3 px-4 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    currentTab === "about"
                      ? "bg-[#0b1c3f]/5 text-[#0b1c3f]"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/50"
                  }`}
                >
                  Kurumsal
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
                    setTab("references");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left py-3 px-4 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    currentTab === "references"
                      ? "bg-[#0b1c3f]/5 text-[#0b1c3f]"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/50"
                  }`}
                >
                  Referanslar
                </button>

                <button
                  onClick={() => {
                    setTab("contact");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left py-3 px-4 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    currentTab === "contact"
                      ? "bg-[#0b1c3f]/5 text-[#0b1c3f]"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/50"
                  }`}
                >
                  İletişim
                </button>

                <button
                  onClick={() => {
                    setTab("guide");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-2 py-3 px-4 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    currentTab === "guide"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span>Ambalaj Rehberi</span>
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
        </div>
      )}
    </>
  );
}
