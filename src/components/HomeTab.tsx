import React, { useState, useMemo, useEffect, useRef } from "react";
import { Search, Globe, Truck, Building2, ArrowRight, Package, Shield, Mail, Heart, HelpCircle, Check, Tag, Sparkles, Layers, ChevronRight, X, ArrowUpRight } from "lucide-react";
import { IMAGES } from "../constants";
import { CATEGORIES, TAXONOMY_PRODUCTS, TaxonomyProduct } from "../productsData";
import { useAppConfig } from "../AppContext";
import { getImgSrc, handleImageError } from "../utils/imageHelper";

export const normalizeTr = (text: string = "") => {
  return text
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();
};

interface ComplementaryTag {
  label: string;
  query: string;
  categoryKey?: string;
  desc?: string;
}

const COMPLEMENTARY_SEARCH_MAP: Record<string, ComplementaryTag[]> = {
  poset: [
    { label: "El Geçme Mağaza Poşeti", query: "El Geçme", categoryKey: "plastik_poset", desc: "Butik & Perakende" },
    { label: "Yumuşak Saplı Poşet", query: "Yumuşak Saplı", categoryKey: "plastik_poset", desc: "Lüks Taşıma" },
    { label: "Takviyeli Mağaza Poşeti", query: "Takviyeli", categoryKey: "plastik_poset", desc: "Ağır Yük Dayanıklı" },
    { label: "Baskılı Kargo Poşeti", query: "Baskılı Kargo", categoryKey: "kargo_eticaret", desc: "E-Ticaret & Gönderi" },
    { label: "Market Atlet Poşet (Hışır)", query: "Atlet", categoryKey: "plastik_poset", desc: "Hafif & Ekonomik" },
    { label: "Cepli İrsaliye Poşeti", query: "Cepli", categoryKey: "kargo_eticaret", desc: "Fatura Cepli" },
    { label: "Biyobozunur Doğa Dostu", query: "Biyobozunur", categoryKey: "plastik_poset", desc: "%100 Geri Dönüşümlü" },
    { label: "Kilitli & Fermuarlı Poşet", query: "Kilitli", categoryKey: "plastik_poset", desc: "Yeniden Kapanabilir" },
  ],
  canta: [
    { label: "Burgu Saplı Kraft Çanta", query: "Burgu Saplı", categoryKey: "kagit_karton", desc: "Doğal & Şık" },
    { label: "Düz Saplı Kağıt Çanta", query: "Düz Saplı", categoryKey: "kagit_karton", desc: "Paket Servis" },
    { label: "Lüks Karton Çanta", query: "Lüks Karton", categoryKey: "kagit_karton", desc: "Gofre & Varak Baskı" },
    { label: "Tela (Nonwoven) Çanta", query: "Tela", categoryKey: "bez_tela", desc: "Uzun Ömürlü Bez" },
    { label: "Ham Bez (Pamuk) Çanta", query: "Bez Çanta", categoryKey: "bez_tela", desc: "%100 Pamuk Dokuma" },
  ],
  kargo: [
    { label: "Baskılı (Logolu) Kargo Poşeti", query: "Baskılı Kargo", categoryKey: "kargo_eticaret", desc: "Markaya Özel Baskı" },
    { label: "Cepli Kendinden İrsaliyeli", query: "Cepli", categoryKey: "kargo_eticaret", desc: "Fatura Bölmeli" },
    { label: "Standart Baskısız Kargo Poşeti", query: "Standart Baskısız", categoryKey: "kargo_eticaret", desc: "Stoktan Hemen Teslim" },
    { label: "Balonlu Koruyucu Zarf", query: "Balonlu", categoryKey: "kargo_eticaret", desc: "Darbeye Dayanıklı" },
    { label: "Kağıt Kargo Poşeti", query: "Kağıt Kargo", categoryKey: "kargo_eticaret", desc: "Ekolojik Kraft Gönderi" },
  ],
  magaza: [
    { label: "El Geçme Mağaza Poşeti", query: "El Geçme", categoryKey: "plastik_poset", desc: "Perakende Klasiği" },
    { label: "Takviyeli Saplı Poşet", query: "Takviyeli", categoryKey: "plastik_poset", desc: "Ekstra Güçlendirilmiş" },
    { label: "Yumuşak Saplı Poşet", query: "Yumuşak Saplı", categoryKey: "plastik_poset", desc: "Butik & Tekstil" },
    { label: "Lüks Karton Mağaza Çantası", query: "Lüks Karton", categoryKey: "kagit_karton", desc: "Prestijli Çözüm" },
  ],
  plastik: [
    { label: "El Geçmeli Plastik Poşet", query: "El Geçme", categoryKey: "plastik_poset", desc: "LDPE Yumuşak Doku" },
    { label: "Takviyeli Plastik Poşet", query: "Takviyeli", categoryKey: "plastik_poset", desc: "Takviyeli Tutacaklı" },
    { label: "Atlet Plastik Poşet (Hışır)", query: "Atlet", categoryKey: "plastik_poset", desc: "HDPE Yüksek Mukavemet" },
    { label: "Jelatin & OPP Poşet", query: "Jelatin", categoryKey: "plastik_poset", desc: "Kristal Şeffaflık" },
  ],
  el: [
    { label: "El Geçme Mağaza Poşeti", query: "El Geçme", categoryKey: "plastik_poset", desc: "Butik & Perakende" },
    { label: "Takviyeli El Geçme Poşet", query: "Takviyeli", categoryKey: "plastik_poset", desc: "Dayanıklı Sap" },
    { label: "Baskılı El Geçme Poşet", query: "El Geçme", categoryKey: "plastik_poset", desc: "Logolu İmalat" },
  ],
  kraft: [
    { label: "Burgu Saplı Kraft Çanta", query: "Burgu Saplı", categoryKey: "kagit_karton", desc: "Beyaz & Esmer Kraft" },
    { label: "Düz Saplı Kraft Çanta", query: "Düz Saplı", categoryKey: "kagit_karton", desc: "Paket Servis" },
    { label: "Kese Kağıtları", query: "Kese", categoryKey: "kagit_karton", desc: "Fırın & Kuruyemiş" },
  ],
  kese: [
    { label: "Kese Kağıtları", query: "Kese", categoryKey: "kagit_karton", desc: "Doğal Kraft Ambalaj" },
    { label: "Pencereli Kraft Kese", query: "Kraft", categoryKey: "kagit_karton", desc: "Gıda & Baharat" },
  ],
  bez: [
    { label: "Tela (Nonwoven) Çanta", query: "Tela", categoryKey: "bez_tela", desc: "Fuar & Promosyon" },
    { label: "Ham Bez (Pamuk) Çanta", query: "Bez Çanta", categoryKey: "bez_tela", desc: "%100 Pamuklu" },
  ],
  balonlu: [
    { label: "Balonlu Kargo Zarfları", query: "Balonlu", categoryKey: "kargo_eticaret", desc: "Hava Kabarcıklı Koruma" },
    { label: "Balonlu Patpat Naylonlar", query: "Patpat", categoryKey: "koruyucu_endustriyel", desc: "Rulo Ambalaj Malzemesi" },
  ]
};

const DEFAULT_POPULAR_TAGS: ComplementaryTag[] = [
  { label: "El Geçme Mağaza Poşeti", query: "El Geçme", categoryKey: "plastik_poset", desc: "Perakende" },
  { label: "Baskılı Kargo Poşeti", query: "Baskılı Kargo", categoryKey: "kargo_eticaret", desc: "E-Ticaret" },
  { label: "Yumuşak Saplı Poşet", query: "Yumuşak Saplı", categoryKey: "plastik_poset", desc: "Butik" },
  { label: "Burgu Saplı Kraft Çanta", query: "Burgu Saplı", categoryKey: "kagit_karton", desc: "Kraft" },
  { label: "Market Atlet Poşet", query: "Atlet", categoryKey: "plastik_poset", desc: "Hışır" },
  { label: "Cepli Kargo Poşeti", query: "Cepli", categoryKey: "kargo_eticaret", desc: "İrsaliyeli" },
  { label: "Lüks Karton Çanta", query: "Lüks Karton", categoryKey: "kagit_karton", desc: "Prestij" },
  { label: "Tela (Nonwoven) Çanta", query: "Tela", categoryKey: "bez_tela", desc: "Bez Çanta" },
];

interface HomeTabProps {
  onAnalyzePrompt: (prompt: string) => void;
  setTab: (tab: "home" | "catalog" | "assistant", categoryKey?: string | null) => void;
  onSearchCatalog?: (query: string) => void;
}

export default function HomeTab({ onAnalyzePrompt, setTab, onSearchCatalog }: HomeTabProps) {
  const { products: dbProducts } = useAppConfig();

  const heroSlides = [
    {
      image: '/images/hero-1.jpg',
      badge: 'B2B Ambalaj Çözümleri',
      title: "Türkiye'nin Ambalaj Çözüm Merkezi",
      subtitle: 'Yüksek üretim kapasitemiz ve ileri teknoloji makine parkurumuzla işletmenizin prestijini artıracak toptan ambalaj çözümleri üretiyoruz.'
    },
    {
      image: '/images/hero-2.jpg',
      badge: '8 Renk Flekso Baskı Teknolojisi',
      title: 'Sınırsız Renk, Kusursuz Baskı Kalitesi',
      subtitle: 'Eczanelerden butiklere ve ulusal perakende zincirlerine kadar; ister 25 kg ister tonajlı siparişlerinizde tam zamanında fabrikadan teslimat.'
    },
    {
      image: '/images/hero-3.jpg',
      badge: 'Kurumsal Marka İmzası',
      title: 'Markanızı Şehrin Sokaklarına Taşıyın',
      subtitle: 'Ambalaj sadece bir taşıma aracı değil, markanızın imzasıdır. Mağazanızdan çıkan her müşteri logonuzu ve kalitenizi her yere taşısın.'
    }
  ];

  const [currentSlide, setCurrentSlide] = useState(0);

  // 5 saniyede bir otomatik geçiş:
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const [searchInput, setSearchInput] = useState("");
  const [brandingType, setBrandingType] = useState<"unprinted" | "printed">("printed");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInput.trim();
    if (!query) return;
    setIsDropdownOpen(false);
    if (onSearchCatalog) {
      onSearchCatalog(query);
    } else {
      onAnalyzePrompt(query);
    }
  };

  const handleSelectTag = (tag: ComplementaryTag) => {
    setSearchInput(tag.query);
    setIsDropdownOpen(false);
    if (onSearchCatalog) {
      onSearchCatalog(tag.query);
    } else if (tag.categoryKey) {
      setTab("catalog", tag.categoryKey);
    } else {
      setTab("catalog", null);
    }
  };

  const handleSelectProduct = (prod: TaxonomyProduct) => {
    setIsDropdownOpen(false);
    if (onSearchCatalog) {
      onSearchCatalog(prod.name);
    } else {
      setTab("catalog", prod.categoryKey);
    }
  };

  const handleGetQuoteForProduct = (prod: TaxonomyProduct) => {
    setIsDropdownOpen(false);
    onAnalyzePrompt(prod.name);
  };

  const handleViewCategory = (catKey: string) => {
    setIsDropdownOpen(false);
    setTab("catalog", catKey);
  };

  // Dinamik tamamlayıcı etiketler (chips)
  const complementaryTags = useMemo(() => {
    const norm = normalizeTr(searchInput);
    if (!norm) {
      return DEFAULT_POPULAR_TAGS;
    }

    const results: ComplementaryTag[] = [];
    const seen = new Set<string>();

    for (const [key, tags] of Object.entries(COMPLEMENTARY_SEARCH_MAP)) {
      const normKey = normalizeTr(key);
      if (norm.includes(normKey) || normKey.includes(norm)) {
        for (const t of tags) {
          if (!seen.has(t.label)) {
            seen.add(t.label);
            results.push(t);
          }
        }
      }
    }

    // Dynamic fallback tags from matching taxonomy products
    TAXONOMY_PRODUCTS.forEach(tp => {
      const normName = normalizeTr(tp.name);
      if (normName.includes(norm) && !seen.has(tp.name)) {
        seen.add(tp.name);
        results.push({
          label: tp.name,
          query: tp.name,
          categoryKey: tp.categoryKey,
          desc: tp.categoryLabel
        });
      }
    });

    return results.slice(0, 8);
  }, [searchInput]);

  // Eşleşen ürünler (maksimum 5 adet)
  const matchingProducts = useMemo(() => {
    const norm = normalizeTr(searchInput);
    if (!norm) {
      return TAXONOMY_PRODUCTS.slice(0, 4);
    }

    return TAXONOMY_PRODUCTS.filter(tp => {
      const normName = normalizeTr(tp.name);
      const normCat = normalizeTr(tp.categoryLabel);
      const normMat = normalizeTr(tp.malzeme);
      const normDesc = normalizeTr(tp.desc);
      const normBaski = normalizeTr(tp.baski);
      const matchesVariant = tp.variants.some(v => 
        normalizeTr(v.urun_kodu).includes(norm) ||
        normalizeTr(v.olculer).includes(norm) ||
        normalizeTr(v.kullanim_amaci).includes(norm)
      );
      return (
        normName.includes(norm) ||
        normCat.includes(norm) ||
        normMat.includes(norm) ||
        normDesc.includes(norm) ||
        normBaski.includes(norm) ||
        matchesVariant
      );
    }).slice(0, 5);
  }, [searchInput]);

  // Toplam eşleşen ürün sayısı
  const totalMatchedCount = useMemo(() => {
    const norm = normalizeTr(searchInput);
    if (!norm) return TAXONOMY_PRODUCTS.length;
    return TAXONOMY_PRODUCTS.filter(tp => {
      const normName = normalizeTr(tp.name);
      const normCat = normalizeTr(tp.categoryLabel);
      const normMat = normalizeTr(tp.malzeme);
      const normDesc = normalizeTr(tp.desc);
      const matchesVariant = tp.variants.some(v => 
        normalizeTr(v.urun_kodu).includes(norm) ||
        normalizeTr(v.olculer).includes(norm)
      );
      return normName.includes(norm) || normCat.includes(norm) || normMat.includes(norm) || normDesc.includes(norm) || matchesVariant;
    }).length;
  }, [searchInput]);

  // Eşleşen kategoriler
  const matchingCategories = useMemo(() => {
    const norm = normalizeTr(searchInput);
    if (!norm) return [];
    return CATEGORIES.filter(cat => 
      normalizeTr(cat.label).includes(norm) ||
      normalizeTr(cat.key).includes(norm)
    );
  }, [searchInput]);

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
      const inStockVariants = tp.variants.filter(v => {
        const live = dbProducts.find(dbP => dbP.urun_kodu && v.urun_kodu && dbP.urun_kodu.trim().toLowerCase() === v.urun_kodu.trim().toLowerCase());
        const stok = live?.stok_durumu || v.stok_durumu || "Siparişle";
        return stok !== "Yok" && stok !== "Stokta Yok";
      });
      if (inStockVariants.length === 0) return false;

      if (brandingType === "printed") {
        return tp.baski === "Baskılı";
      } else {
        return tp.baski === "Baskısız";
      }
    });
  }, [brandingType, dbProducts]);

  return (
    <div className="bg-[#fcfdfd] min-h-screen">
      
      {/* Hero Wrapper with Background Slider & Natural Scroll Flow */}
      <section className="relative w-full min-h-[560px] lg:min-h-[620px] flex flex-col justify-center items-center py-16 sm:py-20 z-20" id="hero-outer-wrapper">
        {/* Arka Plan Slider Katmanı */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
          {heroSlides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out transform contrast-[1.08] brightness-[0.98] saturate-[1.05] ${
                index === currentSlide
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-105'
              }`}
              style={{ backgroundImage: `url(${slide.image})` }}
            />
          ))}
        </div>

        {/* Merkezi Beyaz Radyal Işık: Ortadaki yazıları aydınlatır, kenarları canlı bırakır */}
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.92)_0%,_rgba(255,255,255,0.70)_50%,_transparent_80%)] pointer-events-none" />

        {/* Hero'nun en alt bitişine yumuşak erime geçişi */}
        <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />

        {/* Ön plandaki içerik kutusu (metinler ve arama motoru) */}
        <div className="relative z-10 w-full max-w-4xl mx-auto px-4 flex flex-col items-center justify-center text-center" id="home-hero-container">
          
          {/* Floating Centered Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-white/95 text-blue-700 border border-slate-200/90 shadow-sm mb-3 transition-all duration-700 mx-auto justify-center" id="hero-badge">
            <Globe className="w-4 h-4 text-[#2563eb]" />
            <span>{heroSlides[currentSlide].badge}</span>
          </div>

          {/* Dynamic Typography synchronized with slide */}
          <div className="min-h-[140px] flex flex-col justify-center transition-all duration-700 w-full">
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight text-center mb-3 leading-tight drop-shadow-sm transition-all duration-700">
              {heroSlides[currentSlide].title}
            </h1>
            
            <p className="text-slate-700 font-medium text-sm sm:text-base max-w-2xl mx-auto text-center mb-6 leading-relaxed transition-all duration-700">
              {heroSlides[currentSlide].subtitle}
            </p>
          </div>

          {/* Mega Centered B2B Search Bar with Autocomplete Dropdown */}
          <div className="w-full max-w-2xl mx-auto mb-4 relative z-40" id="search-bar-wrapper" ref={searchWrapperRef}>
            <form 
              onSubmit={handleSearchSubmit}
              className="bg-white/95 backdrop-blur-sm border border-slate-300 shadow-xl rounded-2xl p-2.5 flex items-center justify-between gap-2.5 transition-shadow focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"
            >
              <div className="flex-grow flex items-center pl-3.5 space-x-3.5 min-w-0">
                <Package className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchInput}
                  onFocus={() => setIsDropdownOpen(true)}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    if (!isDropdownOpen) setIsDropdownOpen(true);
                  }}
                  placeholder="Hızlı ürün veya ölçü arayın... (Örn: poşet, çanta, kargo, el geçme, kraft)"
                  className="w-full bg-transparent border-none text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-0 p-1 font-medium"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setIsDropdownOpen(true);
                    }}
                    className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors shrink-0 cursor-pointer"
                    title="Temizle"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
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

            {/* Floating Autocomplete & Complementary Dropdown */}
            {isDropdownOpen && (
              <div 
                className="absolute top-full left-0 right-0 mt-2.5 bg-white/98 backdrop-blur-xl border border-slate-200/90 shadow-2xl rounded-3xl p-4 sm:p-5 text-left z-50 max-h-[78vh] overflow-y-auto divide-y divide-slate-100 text-slate-800 animate-in fade-in zoom-in-95 duration-150"
                id="search-autocomplete-dropdown"
              >
                {/* 1. Kısım: Tamamlayıcı Seçenekler (Chips) */}
                <div className="pb-3.5">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center space-x-1.5 text-xs font-black text-slate-800 tracking-tight">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>{searchInput.trim() ? `"${searchInput}" İçin Tamamlayıcı Seçenekler:` : "Popüler Seçenekler ve Çeşitler:"}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 font-semibold hidden sm:inline">Tıklayarak inceleyin</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {complementaryTags.map((tag, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectTag(tag)}
                        className="group px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-xs font-bold flex items-center space-x-1.5 transition-all shadow-2xs hover:shadow-sm cursor-pointer"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:scale-125 transition-transform" />
                        <span>{tag.label}</span>
                        {tag.desc && (
                          <span className="text-[10px] font-medium text-slate-400 group-hover:text-blue-600 transition-colors">
                            • {tag.desc}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Kısım: Eşleşen Ürünler */}
                {matchingProducts.length > 0 && (
                  <div className="py-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-xs font-black text-slate-800 tracking-tight">
                        <Package className="w-3.5 h-3.5 text-[#0b1c3f]" />
                        <span>Eşleşen Ambalaj Çeşitleri</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 font-semibold">{matchingProducts.length} Seçenek listelendi</span>
                    </div>

                    <div className="grid gap-2">
                      {matchingProducts.map((prod) => (
                        <div
                          key={prod.id}
                          className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-white hover:bg-slate-50/90 border border-slate-100 hover:border-slate-200 transition-all gap-3 group"
                        >
                          <div 
                            className="flex items-center space-x-3 min-w-0 cursor-pointer flex-grow"
                            onClick={() => handleSelectProduct(prod)}
                          >
                            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 relative flex items-center justify-center">
                              <img
                                src={getImgSrc(prod.imgUrl)}
                                alt={prod.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                referrerPolicy="no-referrer"
                                onError={handleImageError}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                  {prod.name}
                                </span>
                                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                                  {prod.baski}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-medium truncate mt-0.5">
                                <span className="font-semibold text-slate-600">{prod.categoryLabel}</span>
                                <span>•</span>
                                <span>{prod.malzeme}</span>
                                <span>•</span>
                                <span className="text-indigo-600 font-bold">{prod.variants.length} Ölçü</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleSelectProduct(prod)}
                              className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 border border-slate-200 rounded-xl transition-all cursor-pointer whitespace-nowrap hidden sm:inline-flex items-center space-x-1"
                            >
                              <span>İncele</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleGetQuoteForProduct(prod)}
                              className="px-3.5 py-1.5 text-xs font-black text-white bg-[#0b1c3f] hover:bg-blue-600 rounded-xl transition-all shadow-sm cursor-pointer whitespace-nowrap flex items-center space-x-1"
                            >
                              <span>Teklif Al</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Kısım: İlgili Kategoriler (Varsa) */}
                {matchingCategories.length > 0 && (
                  <div className="py-3">
                    <div className="flex items-center space-x-1.5 text-xs font-black text-slate-800 mb-2">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      <span>İlgili Kategoriler</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {matchingCategories.map((cat) => (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() => handleViewCategory(cat.key)}
                          className="text-xs font-bold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200/80 px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center space-x-1"
                        >
                          <span>{cat.label}</span>
                          <span className="font-mono text-[10px] text-indigo-500">({cat.count} Çeşit) →</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Kısım: Tüm Sonuçları Gör Alt Butonu */}
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      if (onSearchCatalog) {
                        onSearchCatalog(searchInput.trim());
                      } else {
                        setTab("catalog", null);
                      }
                    }}
                    className="w-full py-3 px-4 bg-gradient-to-r from-slate-900 to-[#0b1c3f] hover:from-[#0b1c3f] hover:to-blue-900 text-white rounded-2xl flex items-center justify-between text-xs font-extrabold shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center space-x-2">
                      <Search className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                      <span>
                        {searchInput.trim() 
                          ? `"${searchInput}" ile ilgili tüm ambalajları katalogda listele`
                          : "Tüm ambalaj kataloğunu incele"}
                      </span>
                    </div>
                    <span className="flex items-center space-x-1 text-blue-300 font-mono text-[11px]">
                      <span>{totalMatchedCount} Ürün</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Subtitle trust pillars below the search box */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-4 text-xs text-slate-700 font-bold">
            <div className="flex items-center space-x-2 bg-white/90 border border-slate-200 px-3.5 py-1.5 rounded-full shadow-sm backdrop-blur-sm">
              <Truck className="w-4 h-4 text-[#2563eb]" />
              <span>Tüm Türkiye'ye Teslimat</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/90 border border-slate-200 px-3.5 py-1.5 rounded-full shadow-sm backdrop-blur-sm">
              <Building2 className="w-4 h-4 text-[#10b981]" />
              <span>Fabrikadan Doğrudan Satış</span>
            </div>
          </div>

          {/* Zarif Slayt Göstergeleri (Dots) */}
          <div className="flex justify-center items-center gap-1.5">
            {heroSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentSlide ? 'w-6 bg-blue-600' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                }`}
                aria-label={`Görsel ${i + 1}`}
              />
            ))}
          </div>

        </div>
      </section>

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
                    src={getImgSrc(cat.img)}
                    alt={cat.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                    onError={handleImageError}
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
              const activeCleanCode = (activeV?.urun_kodu || (activeV as any)?.sku || "").trim().toLowerCase();
              const liveDbProd = (dbProducts || []).find(p => {
                const pCode = (p.urun_kodu || (p as any).sku || "").trim().toLowerCase();
                return Boolean(pCode) && Boolean(activeCleanCode) && pCode === activeCleanCode;
              }) || (dbProducts || []).find(p => 
                Boolean(p.urun_adi) && Boolean(prod.name) && p.urun_adi.trim().toLowerCase() === prod.name.trim().toLowerCase() &&
                Boolean(p.olculer) && Boolean(activeV?.olculer) && p.olculer.trim().toLowerCase() === activeV.olculer.trim().toLowerCase()
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
                        src={getImgSrc(prod.imgUrl)}
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                        onError={handleImageError}
                      />
                      <div className="absolute top-3.5 right-3.5 flex flex-wrap gap-1.5 justify-end">
                        <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase font-mono shadow-xs border ${
                          effectiveStok === "Var" || effectiveStok === "Stokta Var"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : effectiveStok === "Yok" || effectiveStok === "Stokta Yok"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}>
                          {effectiveStok === "Var" || effectiveStok === "Stokta Var"
                            ? "Stokta Var"
                            : effectiveStok === "Yok" || effectiveStok === "Stokta Yok"
                              ? "Stokta Yok"
                              : "Sipariş Üzerine Üretim"}
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

    </div>
  );
}
