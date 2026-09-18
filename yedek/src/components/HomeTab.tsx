import React, { useState, useMemo } from "react";
import { Search, Globe, Truck, Building2, ArrowRight, Package, Shield, Mail, Heart, HelpCircle, Check, Tag } from "lucide-react";
import { IMAGES } from "../constants";
import { TAXONOMY_PRODUCTS } from "../productsData";
import { useAppConfig } from "../AppContext";
import Footer from "./Footer";

interface HomeTabProps {
  onAnalyzePrompt: (prompt: string) => void;
  setTab: (tab: "home" | "catalog" | "assistant", categoryKey?: string | null) => void;
}

export default function HomeTab({ onAnalyzePrompt, setTab }: HomeTabProps) {
  const { products: dbProducts } = useAppConfig();

  const [searchInput, setSearchInput] = useState(
    "Mağazamız için 10.000 adet siyah takviyeli el geçmeli poşet"
  );
  const [brandingType, setBrandingType] = useState<"unprinted" | "printed">("printed");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onAnalyzePrompt(searchInput);
    }
  };

  const categoriesData = [
    {
      badge: "Perakende",
      title: "Mağaza Poşetleri",
      desc: "El geçmeli, takviyeli ve kulplu, markanıza özel baskılı şık perakende çözümleri.",
      img: IMAGES.magazaBag,
      tab: "catalog" as const,
      categoryKey: "plastik_poset"
    },
    {
      badge: "E-Ticaret",
      title: "Kargo Poşetleri",
      desc: "Ekstra dayanıklı, bantlı, cepli veya cepsiz, gizlilik sağlayan lojistik gönderi poşetleri.",
      img: IMAGES.kargoBag,
      tab: "catalog" as const,
      categoryKey: "kargo_eticaret"
    },
    {
      badge: "Toptan",
      title: "Endüstriyel Ambalaj",
      desc: "Shrink filmler, palet örtüleri ve ağır sanayi ürünleri için yüksek mukavemetli çözümler.",
      img: IMAGES.moq3DPreview,
      tab: "catalog" as const,
      categoryKey: "koruyucu_endustriyel"
    },
    {
      badge: "Doğa Dostu",
      title: "Kraft Çantalar",
      desc: "Çevre dostu, geri dönüştürülebilir, burgu kulplu veya düz, premium kağıt çantalar.",
      img: IMAGES.kraftBag,
      tab: "catalog" as const,
      categoryKey: "kagit_karton"
    }
  ];

  const featuredProducts = useMemo(() => {
    return TAXONOMY_PRODUCTS.filter(tp => {
      if (brandingType === "printed") {
        return tp.baski === "Baskılı";
      } else {
        return tp.baski === "Baskısız";
      }
    });
  }, [brandingType]);

  return (
    <div className="bg-[#fcfdfd] min-h-screen">
      
      {/* Hero Wrapper with Background Video */}
      <div className="relative w-full border-b border-slate-100 overflow-hidden bg-transparent" id="hero-outer-wrapper">
        {/* Background Video */}
        <video
          src="/assets/hero-bg.mp4"
          autoPlay={true}
          loop={true}
          muted={true}
          playsInline={true}
          className="absolute inset-0 w-full h-full object-cover z-0 opacity-40 pointer-events-none"
        />

        {/* Readability Overlay Mask layer */}
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] z-10" />

        {/* Ön plandaki içerik kutusu (metinler ve arama motoru) */}
        <div className="relative z-20 p-8 max-w-4xl mx-auto text-center pt-20 pb-16 px-6 space-y-8" id="home-hero-container">
          
          {/* Floating Centered Badge */}
          <div className="inline-flex items-center space-x-2 bg-[#eff6ff]/90 text-[#1e40af] px-4 py-1.5 rounded-full text-xs font-bold shadow-xs backdrop-blur-xs mx-auto justify-center" id="hero-badge">
            <Globe className="w-4 h-4 text-[#2563eb]" />
            <span>B2B Ambalaj Çözümleri</span>
          </div>

          {/* Huge Centered Display Typography */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black tracking-tight text-[#0f172a] leading-none drop-shadow-xs">
              Türkiye'nin Ambalaj <br />
              Çözüm Merkezi
            </h1>
            
            <p className="text-slate-600 text-sm max-w-2xl mx-auto leading-relaxed font-semibold">
              Endüstriyel poşet ve ambalaj taleplerinizi yapay zeka tabanlı akıllı sistemimizle dijitalleştirin. 
              İhtiyacınızı yazın, en uygun ürünü anında bulun.
            </p>
          </div>

          {/* AI-Powered Mega Centered Search Bar */}
          <div className="max-w-2xl mx-auto" id="search-bar-wrapper">
            <form 
              onSubmit={handleSearchSubmit}
              className="bg-white/95 backdrop-blur-xs p-2.5 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/45 flex items-center justify-between gap-2.5"
            >
              <div className="flex-grow flex items-center pl-3.5 space-x-3.5">
                <Package className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Örn: Mağazamız için 10.000 adet siyah takviyeli el geçmeli poşet"
                  className="w-full bg-transparent border-none text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-0 p-1 font-medium"
                />
              </div>

              <button
                type="submit"
                className="bg-[#0b1c3f] hover:bg-[#07132c] text-white font-extrabold text-xs px-6 py-3.5 rounded-2xl flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-md shadow-slate-900/10"
                id="hero-analyze-btn"
              >
                <Search className="w-3.5 h-3.5 text-white" />
                <span>Ürün Bul</span>
              </button>
            </form>
          </div>

          {/* Subtitle trust pillars below the search box */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-700 font-bold pt-2">
            <div className="flex items-center space-x-2 bg-white/90 border border-slate-200/60 px-3.5 py-1.5 rounded-full shadow-xs backdrop-blur-xs">
              <Truck className="w-4 h-4 text-[#2563eb]" />
              <span>Tüm Türkiye'ye Teslimat</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/90 border border-slate-200/60 px-3.5 py-1.5 rounded-full shadow-xs backdrop-blur-xs">
              <Building2 className="w-4 h-4 text-[#10b981]" />
              <span>Fabrikadan Doğrudan Satış</span>
            </div>
          </div>

        </div>
      </div>

      {/* Solutions Section - Öne Çıkan Çözümler */}
      <div className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-100" id="featured-solutions-section">
        
        {/* Section Title details with dynamic high-fidelity toggler */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-slate-50 pb-5" id="solutions-header">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-[23px] font-black text-[#0f172a] tracking-tight">
              Öne Çıkan Ambalaj Çözümleri
            </h2>
            <p className="text-xs text-slate-500">
              Sektörünüze özel üretilmiş ambalaj kategorilerimizi ve popüler varyasyonlarımızı keşfedin.
            </p>
          </div>

          {/* Right side alignment: Two-position Toggle Switch and View All button */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 justify-start md:justify-end" id="solutions-actions-container">
            {/* Highly customized Stitch 2-position toggle button */}
            <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center shadow-inner text-[11px] font-black select-none border border-slate-200/50" id="branding-filter-toggle">
              <button
                type="button"
                onClick={() => setBrandingType("unprinted")}
                className={`px-4.5 py-2 rounded-xl transition-all duration-300 cursor-pointer ${
                  brandingType === "unprinted" 
                    ? "bg-white text-slate-800 shadow-md shadow-slate-200" 
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                Baskısız Standart
              </button>
              <button
                type="button"
                onClick={() => setBrandingType("printed")}
                className={`px-4.5 py-2 rounded-xl transition-all duration-300 cursor-pointer ${
                  brandingType === "printed" 
                    ? "bg-[#0A369D] text-white shadow-lg shadow-blue-900/15" 
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                Baskılı (logolu) Kurumsal
              </button>
            </div>

            <button
              onClick={() => setTab("catalog", null)}
              className="text-xs font-bold text-[#0b1c3f] hover:text-[#2563eb] flex items-center space-x-1.5 group transition-colors shrink-0 cursor-pointer"
            >
              <span>Tüm Katalog (87 Ürün)</span>
              <span className="font-mono transition-transform duration-200 group-hover:translate-x-1">→</span>
            </button>
          </div>
        </div>

        {/* 4 Category Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6" id="solutions-grid">
          {categoriesData.map((cat, index) => (
            <div 
              key={index}
              onClick={() => setTab(cat.tab, cat.categoryKey)}
              className="bg-white rounded-3xl border border-slate-200/60 overflow-hidden shadow-xs hover:shadow-xl hover:border-slate-300 transition-all duration-300 flex flex-col justify-between group cursor-pointer"
            >
              <div>
                {/* Responsive Image holder with custom badge overlaid */}
                <div className="h-48 overflow-hidden relative bg-slate-50">
                  <img
                    src={cat.img}
                    alt={cat.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  {/* Category overlay badge */}
                  <span className="absolute top-4 left-4 bg-white/95 text-[#0f172a] text-[10px] font-bold px-3 py-1 rounded-full shadow-xs uppercase tracking-wider font-mono">
                    {cat.badge}
                  </span>
                </div>

                {/* Sub-text information */}
                <div className="p-5 space-y-2">
                  <h4 className="font-black text-[15px] text-[#0f172a] group-hover:text-[#2563eb] transition-colors">
                    {cat.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    {cat.desc}
                  </p>
                </div>
              </div>

              {/* Action call line */}
              <div className="px-5 pb-4 pt-2 flex items-center justify-between text-[11px] font-bold text-slate-400 group-hover:text-[#2563eb] border-t border-slate-50">
                <span>Kategoriyi İncele</span>
                <span className="font-mono text-base tracking-normal transition-transform duration-200 group-hover:translate-x-1 leading-none">→</span>
              </div>
            </div>
          ))}
        </div>

        {/* Dynamic Featured Products Cards Section on Home Page */}
        <div className="pt-12 mt-6 space-y-6" id="featured-products-home">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-[#0f172a] flex items-center space-x-2">
                <span>{brandingType === "printed" ? "Popüler Baskılı Kurumsal Ürünler" : "Popüler Baskısız Standart Ürünler"}</span>
                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">
                  {featuredProducts.length} Çeşit
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                En çok tercih edilen ambalaj çeşitleri ve üretim detayları.
              </p>
            </div>

            <button
              onClick={() => setTab("catalog", null)}
              className="text-xs font-bold text-[#0A369D] hover:underline flex items-center space-x-1 self-start sm:self-auto cursor-pointer"
            >
              <span>Katalogda İncele</span>
              <span>→</span>
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts.map((prod) => {
              const activeV = prod.variants?.[0];
              const liveDbProd = (dbProducts || []).find(p => 
                p.urun_kodu === activeV?.urun_kodu || 
                (p as any).sku === (activeV as any).sku || 
                p.urun_kodu === (activeV as any).sku ||
                ((p as any).urun_adi === prod.name && p.olculer === activeV?.olculer)
              );
              const rawPrice = liveDbProd?.birim_fiyat ?? liveDbProd?.birim_fiyati ?? (activeV as any)?.birim_fiyat ?? activeV?.birim_fiyati ?? 0;
              const effectivePrice = typeof rawPrice === 'number' ? rawPrice : (parseFloat(String(rawPrice).replace(',', '.')) || 0);
              const isQuoteOnly = effectivePrice <= 0;
              const effectiveStok = liveDbProd?.stok_durumu || prod.stokDurumu || "Siparişle";
              const satisSekli = liveDbProd?.satis_sekli || activeV?.satis_sekli || "Adet";

              return (
                <div
                  key={prod.id}
                  className="bg-white rounded-3xl border border-slate-200/70 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    <div className="h-48 bg-slate-50 relative overflow-hidden flex items-center justify-center">
                      <img
                        src={prod.imgUrl}
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-3.5 right-3.5 flex flex-wrap gap-1.5 justify-end">
                        <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase font-mono shadow-xs border ${
                          effectiveStok === "Var"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}>
                          {effectiveStok === "Var" ? "Stokta Var" : "Sipariş Üzerine Üretim"}
                        </span>
                        <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase font-mono bg-white/90 text-slate-700 border border-slate-200 shadow-xs">
                          {prod.baski}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <div>
                        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                          {prod.categoryLabel}
                        </span>
                        <h4 className="font-extrabold text-sm text-[#0f172a] group-hover:text-[#0A369D] transition-colors mt-0.5">
                          {prod.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-2 mt-1">
                          {prod.desc}
                        </p>
                      </div>

                      <div className="bg-slate-50/80 border border-slate-100 p-3 rounded-2xl text-xs space-y-1 font-sans">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-400 font-mono text-[9px] uppercase">Malzeme:</span>
                          <span className="font-extrabold text-slate-700">{prod.malzeme}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-400 font-mono text-[9px] uppercase">Kalınlık:</span>
                          <span className="font-extrabold text-slate-700">{prod.specValue}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-400 font-mono text-[9px] uppercase">Birim Varyasyon:</span>
                          <span className="font-extrabold text-indigo-600">{prod.variants.length} Ölçü Seçeneği</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-mono text-slate-400 block uppercase font-bold">Birim Fiyat</span>
                      {!isQuoteOnly ? (
                        <span className="text-sm font-extrabold text-[#0b1c3f]">
                          ₺{effectivePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <span className="text-[10px] font-normal text-slate-500 ml-1">/ {satisSekli}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 font-sans">
                          Fiyat Alınız
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setTab("catalog", prod.categoryKey)}
                      className="bg-[#0b1c3f] hover:bg-[#07132c] text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-slate-900/10 flex items-center space-x-1"
                    >
                      <span>İncele</span>
                      <span className="font-mono">→</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      <Footer setTab={setTab} />

    </div>
  );
}
