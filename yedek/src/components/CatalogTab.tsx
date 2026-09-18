import React, { useState, useMemo } from "react";
import { Filter, Search, ChevronDown, Check, FolderOpen, Heart, ShoppingBag, FileSpreadsheet } from "lucide-react";
import { Product, parsePriceMultipliers } from "../types";
import { IMAGES } from "../constants";
import { TAXONOMY_PRODUCTS, CATEGORIES, TaxonomyProduct } from "../productsData";
import { useAppConfig } from "../AppContext";
import { getSubfolderPrefix } from "../utils/urlHelper";
import Footer from "./Footer";

interface CatalogTabProps {
  onAddToQuoteList: (product: Product) => void;
  onCustomizeWithAI: (productName: string) => void;
  setTab: (tab: "home" | "catalog" | "assistant", categoryKey?: string | null) => void;
  selectedCategory?: string | null;
}

export default function CatalogTab({ onAddToQuoteList, onCustomizeWithAI, setTab, selectedCategory }: CatalogTabProps) {
  const { formatTL, products: dbProducts, categories: contextCategories } = useAppConfig();
  
  // Live API cache-busting categories state
  const [liveCategories, setLiveCategories] = useState<any[]>([]);

  React.useEffect(() => {
    // Clear stale category caches from localStorage
    try {
      localStorage.removeItem("categories");
      localStorage.removeItem("poset_categories");
      localStorage.removeItem("poset_app_categories");
    } catch (e) {}

    fetch(`/api/categories?t=${Date.now()}`, { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLiveCategories(data);
        }
      })
      .catch(err => console.error("Kategoriler yüklenemedi:", err));
  }, []);

  // Real layout parameters for filtering matching Image 3 sidebar:
  const [selectedVariantCodes, setSelectedVariantCodes] = useState<Record<string, string>>({});
  const [selectedMultipliers, setSelectedMultipliers] = useState<Record<string, number>>({});
  const [activeKullanim, setActiveKullanim] = useState<string[]>([]); // Default show all or selected
  const [activeMalzeme, setActiveMalzeme] = useState<string[]>([]);
  const [activeBaski, setActiveBaski] = useState<string>("");
  const [minMikron, setMinMikron] = useState("");
  const [maxMikron, setMaxMikron] = useState("");
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("Önerilenler");

  // Sync selectedCategory from parent tab navigation
  React.useEffect(() => {
    if (selectedCategory) {
      setActiveKullanim([selectedCategory]);
    } else if (selectedCategory === null) {
      setActiveKullanim([]);
    }
  }, [selectedCategory]);

  // Pagination state: exactly 9 items per page as requested
  const ITEMS_PER_PAGE = 9;
  const [currentPage, setCurrentPage] = useState(1);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeKullanim, activeMalzeme, activeBaski, minMikron, maxMikron, sortBy]);

  const toggleBaski = (key: string) => {
    setActiveBaski(prev => (prev === key ? "" : key));
  };

  const CATEGORY_LABEL_TO_KEY: Record<string, string> = useMemo(() => ({
    "E-TİCARET VE KARGO AMBALAJLARI": "kargo_eticaret",
    "PLASTİK POŞETLER": "plastik_poset",
    "KAĞIT VE KARTON ÇANTALAR": "kagit_karton",
    "BEZ VE TELA ÇANTALAR": "bez_tela",
    "KORUYUCU VE ENDÜSTRİYEL AMBALAJ": "koruyucu_endustriyel"
  }), []);

  const CATEGORY_KEY_TO_LABEL: Record<string, string> = useMemo(() => ({
    "kargo_eticaret": "E-TİCARET VE KARGO AMBALAJLARI",
    "plastik_poset": "PLASTİK POŞETLER",
    "kagit_karton": "KAĞIT VE KARTON ÇANTALAR",
    "bez_tela": "BEZ VE TELA ÇANTALAR",
    "koruyucu_endustriyel": "KORUYUCU VE ENDÜSTRİYEL AMBALAJ"
  }), []);

  // Dynamically compute kullanimFilterNodes using strictly liveCategories from backend / API
  const kullanimFilterNodes = useMemo(() => {
    const map = new Map<string, { key: string; label: string; count: number }>();
    const activeCategories = liveCategories.length > 0 ? liveCategories : contextCategories;

    if (Array.isArray(activeCategories)) {
      activeCategories.forEach(catItem => {
        if (!catItem) return;
        const rawLabel = typeof catItem === "string" ? catItem : (catItem && typeof catItem === "object" && catItem.name ? catItem.name : "");
        if (!rawLabel || typeof rawLabel !== "string" || !rawLabel.trim()) return;
        const label = rawLabel.trim();
        const key = CATEGORY_LABEL_TO_KEY[label] || label;
        if (!map.has(key)) {
          map.set(key, { key, label, count: 0 });
        }
      });
    }

    const result = Array.from(map.values());

    result.forEach(node => {
      const taxonomyCount = TAXONOMY_PRODUCTS.filter(tp => {
        return tp.categoryKey === node.key || tp.categoryLabel === node.label || CATEGORY_KEY_TO_LABEL[tp.categoryKey] === node.label;
      }).length;

      const dbCount = (dbProducts || []).filter(p => {
        const pCat = p.urun_kategorisi && typeof p.urun_kategorisi === "string" ? p.urun_kategorisi.trim() : "";
        return pCat === node.label || CATEGORY_LABEL_TO_KEY[pCat] === node.key || CATEGORY_KEY_TO_LABEL[node.key] === pCat;
      }).length;

      node.count = Math.max(taxonomyCount, dbCount);
    });

    return result;
  }, [liveCategories, contextCategories, dbProducts, CATEGORY_LABEL_TO_KEY, CATEGORY_KEY_TO_LABEL]);

  const customTaxonomyProducts = useMemo(() => {
    if (!Array.isArray(dbProducts)) return [];

    const knownVariantCodes = new Set<string>();
    TAXONOMY_PRODUCTS.forEach(tp => {
      tp.variants.forEach(v => knownVariantCodes.add(v.urun_kodu));
    });

    const customProds = dbProducts.filter(p => !knownVariantCodes.has(p.urun_kodu));
    if (customProds.length === 0) return [];

    const groups = new Map<string, typeof dbProducts>();
    customProds.forEach(p => {
      const catStr = p.urun_kategorisi && typeof p.urun_kategorisi === "string" ? p.urun_kategorisi : "Genel";
      const key = `${p.urun_adi || "Özel Ürün"}___${catStr}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    });

    const converted: TaxonomyProduct[] = [];
    groups.forEach((items) => {
      const first = items[0];
      const catLabel = (first.urun_kategorisi && typeof first.urun_kategorisi === "string") ? first.urun_kategorisi : "Genel";
      const catKey = CATEGORY_LABEL_TO_KEY[catLabel] || catLabel;
      const firstPrice = Number(first.birim_fiyat ?? first.birim_fiyati) || 0;
      const firstIsQuote = first.fiyat_aliniz === true || firstPrice === 0;

      converted.push({
        id: `custom-tx-${first.urun_kodu}`,
        name: first.urun_adi || "Özel Ambalaj Poşeti",
        desc: first.kullanim_amaci || "Özel üretim ambalaj çözümü.",
        categoryKey: catKey as any,
        categoryLabel: catLabel,
        malzeme: first.hammadde_turu || "Polietilen (PE)",
        specLabel: "Kalınlık",
        specValue: first.kalinlik_seviyesi || "65 Mikron",
        baski: first.baski_durumu || "Baskılı",
        unitText: `Birim Fiyat (${(first.moq ? first.moq.replace(/[^0-9.]/g, "") : "5.000")} ${first.satis_sekli || "Adet"} Başlayan)`,
        priceText: firstIsQuote ? "Fiyat Alınız" : formatTL(firstPrice, first.para_birimi || "TL"),
        birim_fiyati: firstPrice,
        para_birimi: (first.para_birimi as any) || "TL",
        isPremiumPrice: firstIsQuote,
        stokDurumu: (first.stok_durumu as any) || "Siparişle",
        badges: [first.baski_durumu || "Baskılı", first.stok_durumu || "Siparişle"],
        imgUrl: IMAGES.kargoPlastik,
        variants: items.map((item, idx) => {
          const itemPrice = Number(item.birim_fiyat ?? item.birim_fiyati) || 0;
          const itemIsQuote = item.fiyat_aliniz === true || itemPrice === 0;
          return {
            sira_no: idx + 1,
            urun_kodu: item.urun_kodu,
            olculer: item.olculer || "Standart",
            moq: item.moq ? `${item.moq.replace(/[^0-9.]/g, "")} ${item.satis_sekli || "Adet"}` : "5.000 Adet",
            fiyat_carpanlari: item.fiyat_carpanlari || "",
            hammadde_turu: item.hammadde_turu || "PE",
            kalinlik_seviyesi: item.kalinlik_seviyesi || "65 Mikron",
            baski_durumu: item.baski_durumu || "Baskılı",
            kargo_bant_tipi: item.kargo_bant_tipi || "Yok",
            kulp_tipi: item.kulp_tipi || "Yok",
            koruk_detayi: item.koruk_detayi || "Yok",
            geridonusum_orani: item.geridonusum_orani || "%0",
            termin_suresi: item.termin_suresi || "7 İş Günü",
            zemin_rengi: item.zemin_rengi || "Şeffaf",
            irsaliye_cebi_detay: item.irsaliye_cebi_detay || "Yok",
            uyumlu_sektorler: item.uyumlu_sektorler || "Tüm Sektörler",
            kullanim_amaci: item.kullanim_amaci || "Paketleme",
            stok_durumu: (item.stok_durumu as any) || "Siparişle",
            baski_renk_yon: item.baski_renk_yon || "1+0",
            satis_sekli: item.satis_sekli || "Adet",
            birim_fiyati: itemPrice,
            para_birimi: (item.para_birimi as any) || "TL",
            priceText: itemIsQuote ? "Fiyat Alınız" : formatTL(itemPrice, item.para_birimi || "TL"),
            multipliers: {}
          };
        })
      });
    });

    return converted;
  }, [dbProducts, formatTL, CATEGORY_LABEL_TO_KEY]);

  const allTaxonomyProducts = useMemo(() => {
    return [...TAXONOMY_PRODUCTS, ...customTaxonomyProducts];
  }, [customTaxonomyProducts]);

  const malzemeFilterNodes = [
    { key: "pe", label: "Polietilen (PE) / Plastik" },
    { key: "kraft", label: "Kağıt / Kraft" },
    { key: "bez", label: "Bez / Tela" },
    { key: "endustriyel", label: "Endüstriyel & Koruyucu" }
  ];

  const toggleKullanim = (key: string) => {
    setActiveKullanim(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleMalzeme = (key: string) => {
    setActiveMalzeme(prev => 
      prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]
    );
  };

  const clearAllFilters = () => {
    setActiveKullanim([]);
    setActiveMalzeme([]);
    setActiveBaski("");
    setMinMikron("");
    setMaxMikron("");
  };

  // Run dynamic filter algorithm
  const filteredProducts = useMemo(() => {
    let result = allTaxonomyProducts.filter(p => {
      // Kullanim category filter match
      if (activeKullanim.length > 0) {
        const matchesCategory = activeKullanim.some(selectedKeyOrLabel => {
          const mappedLabel = CATEGORY_KEY_TO_LABEL[selectedKeyOrLabel] || selectedKeyOrLabel;
          return (
            p.categoryKey === selectedKeyOrLabel ||
            p.categoryLabel === selectedKeyOrLabel ||
            p.categoryLabel === mappedLabel ||
            CATEGORY_LABEL_TO_KEY[p.categoryLabel] === selectedKeyOrLabel
          );
        });
        if (!matchesCategory) return false;
      }
      // Malzeme filter match
      if (activeMalzeme.length > 0) {
        const matchesMalzeme = activeMalzeme.some(m => {
          const mat = p.malzeme.toLowerCase();
          if (m === "pe" && (mat.includes("pe") || mat.includes("polietilen") || mat.includes("plastik") || mat.includes("opp") || mat.includes("pla"))) return true;
          if (m === "kraft" && (mat.includes("kraft") || mat.includes("kağıt") || mat.includes("karton") || mat.includes("sülfit") || mat.includes("bristol"))) return true;
          if (m === "bez" && (mat.includes("tela") || mat.includes("bez") || mat.includes("pamuk") || mat.includes("nonwoven"))) return true;
          if (m === "endustriyel" && (mat.includes("patpat") || mat.includes("şrink") || mat.includes("film") || mat.includes("laminasyon"))) return true;
          return false;
        });
        if (!matchesMalzeme) return false;
      }
      // Baskı Türü filter match
      if (activeBaski) {
        if (activeBaski === "baskili" && p.baski === "Baskısız") return false;
        if (activeBaski === "baskisiz" && p.baski !== "Baskısız") return false;
      }
      return true;
    });

    const getPriceVal = (prod: TaxonomyProduct) => {
      const v = prod.variants?.[0];
      const dbProd = dbProducts.find(p => p.urun_kodu === v?.urun_kodu);
      const p = dbProd?.birim_fiyat ?? dbProd?.birim_fiyati ?? v?.birim_fiyati ?? prod.birim_fiyati ?? 0;
      return Number(p) || 0;
    };

    // Handle sort
    if (sortBy === "artan") {
      result = [...result].sort((a, b) => getPriceVal(a) - getPriceVal(b));
    } else if (sortBy === "azalan") {
      result = [...result].sort((a, b) => getPriceVal(b) - getPriceVal(a));
    }

    return result;
  }, [allTaxonomyProducts, activeKullanim, activeMalzeme, activeBaski, sortBy, CATEGORY_KEY_TO_LABEL, CATEGORY_LABEL_TO_KEY, dbProducts]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      document.getElementById("catalog-main-grid")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleAddAction = (prod: TaxonomyProduct) => {
    // Adapter conversion to general shape
    const activeVariant = prod.variants.find(v => v.urun_kodu === (selectedVariantCodes[prod.id] || prod.variants[0].urun_kodu)) || prod.variants[0];
    const liveDb = dbProducts.find(p => p.urun_kodu === activeVariant.urun_kodu);
    const unitP = Number(liveDb?.birim_fiyat ?? liveDb?.birim_fiyati ?? activeVariant.birim_fiyati) || 0;
    const isQuote = liveDb?.fiyat_aliniz === true || unitP === 0;

    const item: Product = {
      id: activeVariant.urun_kodu,
      name: `${prod.name} (${activeVariant.urun_kodu})`,
      category: prod.categoryKey,
      material: liveDb?.hammadde_turu || activeVariant.hammadde_turu,
      thickness: liveDb?.kalinlik_seviyesi || activeVariant.kalinlik_seviyesi,
      pricePerUnit: isQuote ? 0 : unitP,
      currency: "₺",
      moq: parseInt((liveDb?.moq || activeVariant.moq).replace(/[^0-9]/g, "")) || 5000,
      imageUrl: prod.imgUrl,
      tags: [liveDb?.baski_durumu || activeVariant.baski_durumu],
      capacity: liveDb?.olculer || activeVariant.olculer,
      description: prod.desc,
      stokDurumu: liveDb?.stok_durumu || activeVariant.stok_durumu
    };

    onAddToQuoteList(item);
    setAddedProductId(prod.id);
    setTimeout(() => {
      setAddedProductId(null);
    }, 1800);
  };

  return (
    <div className="bg-[#fcfdfd] min-h-screen pt-10">
      <div className="max-w-7xl mx-auto px-6 space-y-10">

        {/* Header Title Information matches mockup perfectly */}
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-[#0f172a] tracking-tight">
            Ürün Kataloğu
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed font-medium">
            İhtiyacınıza uygun endüstriyel ve ticari ambalaj çözümlerini filtreleyin.
          </p>
        </div>

        {/* Two-Column split workspace block */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Sidebar Filters Section (Exactly match design of Image 3 Left Panel) */}
          <aside className="lg:col-span-3 bg-white border border-slate-200/70 p-6 rounded-3xl shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-extrabold text-sm text-[#0f172a] uppercase tracking-wider font-sans">
                Filtreler
              </span>
              <button 
                onClick={clearAllFilters}
                className="text-xs font-bold text-[#e11d48] hover:text-red-700 active:scale-95 transition-all cursor-pointer"
              >
                Temizle
              </button>
            </div>

            {/* Group 1: KULLANIM ALANI with real checkboxes and counts */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 font-mono">
                Kullanım Alanı
              </h4>
              <div className="space-y-2.5">
                {kullanimFilterNodes.map(node => {
                  const isChecked = activeKullanim.includes(node.key);
                  return (
                    <div 
                      key={node.key}
                      onClick={() => toggleKullanim(node.key)}
                      className="flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center space-x-2.5 text-slate-600 text-sm font-semibold">
                        <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${
                          isChecked ? "bg-[#0b1c3f] border-[#0b1c3f]" : "border-slate-300 bg-white group-hover:border-slate-400"
                        }`}>
                          {isChecked && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                        </div>
                        <span className={isChecked ? "text-[#0b1c3f] font-bold" : "text-slate-600 font-medium"}>
                          {node.label}
                        </span>
                      </div>
                      
                      <span className="text-[10px] font-mono font-black text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        {node.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Group 2: MALZEME CİNSİ */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 font-mono">
                Malzeme Cinsi
              </h4>
              <div className="space-y-2.5">
                {malzemeFilterNodes.map(node => {
                  const isChecked = activeMalzeme.includes(node.key);
                  return (
                    <div 
                      key={node.key}
                      onClick={() => toggleMalzeme(node.key)}
                      className="flex items-center space-x-2.5 cursor-pointer text-slate-600 text-sm font-semibold group"
                    >
                      <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${
                        isChecked ? "bg-[#0b1c3f] border-[#0b1c3f]" : "border-slate-300 bg-white group-hover:border-slate-400"
                      }`}>
                        {isChecked && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                      </div>
                      <span className={isChecked ? "text-[#0b1c3f] font-bold" : "text-slate-600 font-medium"}>
                        {node.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Group 2.2: BASKI TÜRÜ */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 font-mono">
                Baskı Türü
              </h4>
              <div className="space-y-2.5">
                {[
                  { key: "baskili", label: "Baskılı (Kurumsal Logolu)" },
                  { key: "baskisiz", label: "Baskısız (Düz / Standart)" }
                ].map(node => {
                  const isChecked = activeBaski === node.key;
                  return (
                    <label 
                      key={node.key}
                      className="flex items-center space-x-2.5 cursor-pointer text-slate-600 text-sm font-semibold group select-none"
                    >
                      <input
                        type="radio"
                        name="baski_turu"
                        checked={isChecked}
                        onChange={() => toggleBaski(node.key)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded-full border transition-all flex items-center justify-center ${
                        isChecked ? "bg-[#0b1c3f] border-[#0b1c3f]" : "border-slate-300 bg-white group-hover:border-slate-400"
                      }`}>
                        {isChecked && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                      </div>
                      <span className={isChecked ? "text-[#0b1c3f] font-bold" : "text-slate-600 font-medium"}>
                        {node.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Group 3: KALINLIK (MİKRON) */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 font-mono">
                Kalınlık (Mikron)
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="number"
                    placeholder="Min"
                    value={minMikron}
                    onChange={(e) => setMinMikron(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold px-3 py-2 rounded-xl focus:bg-white focus:outline-none focus:border-[#0b1c3f] text-slate-700"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxMikron}
                    onChange={(e) => setMaxMikron(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold px-3 py-2 rounded-xl focus:bg-white focus:outline-none focus:border-[#0b1c3f] text-slate-700"
                  />
                </div>
              </div>
            </div>

          </aside>

          {/* Right Area: Grid items display */}
          <main className="lg:col-span-9 space-y-6">
            
            {/* Controls Bar matches Image 3 details perfectly */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <span className="text-xs font-bold text-slate-500 font-sans">
                Toplam <span className="font-extrabold text-[#0f172a]">{filteredProducts.length}</span> Ürün Listeleniyor (Sayfa {currentPage} / {totalPages}).
              </span>

              {/* Sorting tools dropdown alignment */}
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-400">Sırala:</span>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none bg-white border border-slate-200 pr-9 pl-3.5 py-2 text-xs font-bold text-slate-700 rounded-xl focus:outline-none focus:border-[#0b1c3f] cursor-pointer"
                  >
                    <option value="Önerilenler">Önerilenler</option>
                    <option value="artan">Fiyat: Artan</option>
                    <option value="azalan">Fiyat: Azalan</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Dynamic Grid layout with Image 3 exact card layouts */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" id="catalog-main-grid">
              {paginatedProducts.map((prod) => {
                const activeVariantCode = selectedVariantCodes[prod.id] || prod.variants[0].urun_kodu;
                const activeVariant = prod.variants.find(v => v.urun_kodu === activeVariantCode) || prod.variants[0];
                
                // Live override from Admin Panel / dbProducts
                const liveDbProd = dbProducts.find(p => 
                  p.urun_kodu === activeVariant.urun_kodu || 
                  (p as any).sku === (activeVariant as any).sku || 
                  p.urun_kodu === (activeVariant as any).sku ||
                  ((p as any).urun_adi === prod.name && p.olculer === activeVariant.olculer)
                );
                const rawPrice = liveDbProd?.birim_fiyat ?? liveDbProd?.birim_fiyati ?? (activeVariant as any)?.birim_fiyat ?? activeVariant?.birim_fiyati ?? 0;
                const effectivePrice = typeof rawPrice === 'number' ? rawPrice : (parseFloat(String(rawPrice).replace(',', '.')) || 0);
                const effectiveCurrency = liveDbProd?.para_birimi || activeVariant.para_birimi || "TL";
                const effectiveStok = liveDbProd?.stok_durumu || activeVariant.stok_durumu || "Siparişle";
                const satisSekli = liveDbProd?.satis_sekli || activeVariant.satis_sekli || "Adet";
                const baskiDurumu = liveDbProd?.baski_durumu || activeVariant.baski_durumu || "Baskılı";
                const fiyatCarpanlariStr = liveDbProd?.fiyat_carpanlari || activeVariant.fiyat_carpanlari || "5k:1.00 / 10k:0.92 / 25k:0.85";

                const priceTiers = parsePriceMultipliers(fiyatCarpanlariStr, satisSekli);
                const currentMultiplier = selectedMultipliers[prod.id] !== undefined ? selectedMultipliers[prod.id] : (priceTiers[0]?.multiplier || 1.0);
                const finalUnitPrice = effectivePrice * currentMultiplier;
                const isQuoteOnly = finalUnitPrice <= 0;

                return (
                  <div 
                    key={prod.id}
                    className="bg-white rounded-3xl border border-slate-200/70 overflow-hidden shadow-xs hover:shadow-xl hover:border-slate-300 transition-all duration-300 flex flex-col justify-between group"
                  >
                    
                    {/* Card Section Header */}
                    <div>
                      {/* Centered Image wrap */}
                      <div className="h-48 bg-slate-50 relative overflow-hidden flex items-center justify-center">
                        <img 
                          src={prod.imgUrl} 
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        
                        {/* Floating Badges in top-right area */}
                        <div className="absolute top-3.5 right-3.5 flex flex-wrap gap-1.5 justify-end">
                          <span 
                            className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono shadow-xs border ${
                              effectiveStok === "Var"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                          >
                            {effectiveStok === "Var" ? "Stokta Var" : "Sipariş Üzerine Üretim"}
                          </span>
                          {prod.badges.map((b: string, i: number) => (
                            <span 
                              key={i}
                              className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono shadow-xs border ${
                                b === "Çok Satan" 
                                  ? "bg-rose-50 text-rose-600 border-rose-100" 
                                  : b === "Üretime Hazır" 
                                    ? "bg-amber-50 text-amber-600 border-amber-100" 
                                    : "bg-stone-50 text-slate-600 border-slate-200"
                              }`}
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Card Content parameters & titles */}
                      <div className="p-5.5 space-y-4">
                        <div className="space-y-1">
                          <h3 className="font-black text-[15px] text-[#0f172a] group-hover:text-[#2563eb] transition-all">
                            {prod.name}
                          </h3>
                          <p className="text-[11px] text-slate-400 font-medium leading-relaxed line-clamp-2">
                            {prod.desc}
                          </p>
                        </div>

                        {/* Dropdown Select for variants */}
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none font-mono">Ölçü Seçimi</span>
                          <select
                            value={activeVariantCode}
                            onChange={(e) => setSelectedVariantCodes(prev => ({ ...prev, [prod.id]: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 px-3 py-2 rounded-xl focus:bg-white focus:outline-none focus:border-[#0b1c3f] cursor-pointer shadow-3xs"
                          >
                            {prod.variants.map((v) => (
                              <option key={v.urun_kodu} value={v.urun_kodu}>
                                {v.olculer} ({v.kalinlik_seviyesi})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Dropdown Select for Fiyat Çarpanları / Miktar İndirimleri */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest leading-none font-mono">Fiyat Çarpanı / Miktar İndirimi</span>
                            {currentMultiplier < 1.0 && (
                              <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                %{Math.round((1 - currentMultiplier) * 100)} İndirim
                              </span>
                            )}
                          </div>
                          <select
                            value={currentMultiplier}
                            onChange={(e) => setSelectedMultipliers(prev => ({ ...prev, [prod.id]: parseFloat(e.target.value) }))}
                            className="w-full bg-amber-50/70 border border-amber-200/90 text-xs font-bold text-amber-900 px-3 py-2 rounded-xl focus:bg-white focus:outline-none focus:border-amber-500 cursor-pointer shadow-2xs"
                          >
                            {priceTiers.map((tier, tIdx) => (
                              <option key={tIdx} value={tier.multiplier}>
                                {tier.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Overlaid Technical Specification Card Table */}
                        <div className="bg-slate-50/75 border border-slate-100 rounded-2xl p-3.5 text-xs space-y-1.5 font-sans">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-400 font-semibold uppercase tracking-wider font-mono text-[9px]">Malzeme</span>
                            <span className="font-extrabold text-slate-700">{liveDbProd?.hammadde_turu || activeVariant.hammadde_turu}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-400 font-semibold uppercase tracking-wider font-mono text-[9px]">
                              {prod.specLabel || "Kalınlık"}
                            </span>
                            <span className="font-extrabold text-slate-700">{liveDbProd?.kalinlik_seviyesi || activeVariant.kalinlik_seviyesi}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-400 font-semibold uppercase tracking-wider font-mono text-[9px]">Baskı</span>
                            <span className={`font-extrabold ${baskiDurumu === "Baskısız" ? "text-amber-700" : "text-indigo-700"}`}>
                              {baskiDurumu === "Baskısız" ? "Baskısız (Standart Düz)" : (liveDbProd?.baski_durumu || activeVariant.baski_durumu)}
                            </span>
                          </div>

                          {/* Conditionally expand print details ONLY if Baskılı */}
                          {baskiDurumu !== "Baskısız" && (
                            <>
                              {(liveDbProd?.baski_renk_yon || activeVariant.baski_renk_yon) && (
                                <div className="flex justify-between items-center text-[11px]">
                                  <span className="text-slate-400 font-semibold uppercase tracking-wider font-mono text-[9px]">Baskı Renk/Yön</span>
                                  <span className="font-extrabold text-slate-700">{liveDbProd?.baski_renk_yon || activeVariant.baski_renk_yon}</span>
                                </div>
                              )}
                              {(liveDbProd?.zemin_rengi || activeVariant.zemin_rengi) && (
                                <div className="flex justify-between items-center text-[11px]">
                                  <span className="text-slate-400 font-semibold uppercase tracking-wider font-mono text-[9px]">Zemin Rengi</span>
                                  <span className="font-extrabold text-slate-700">{liveDbProd?.zemin_rengi || activeVariant.zemin_rengi}</span>
                                </div>
                              )}
                            </>
                          )}

                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-400 font-semibold uppercase tracking-wider font-mono text-[9px]">Termin Süresi</span>
                            <span className="font-extrabold text-slate-700">
                              {effectiveStok === "Var" ? "Aynı Gün / 24 Saat Kargo" : (liveDbProd?.termin_suresi || activeVariant.termin_suresi)}
                            </span>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Card Actions Footer - Unit Price & dynamic buttons */}
                    <div className="px-5.5 pb-5.5 pt-2 border-t border-slate-50 space-y-4">
                      
                      {/* Unit pricing detail match */}
                      <div className="flex flex-col space-y-0.5">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none">
                            Birim Fiyat ({satisSekli})
                          </span>
                        </div>
                        {!isQuoteOnly ? (
                          <div className="flex flex-col pt-0.5">
                            <span className="text-[17px] font-black tracking-tight text-[#0b1c3f]">
                              ₺{finalUnitPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              <span className="text-xs font-normal text-slate-500 ml-1">/ {satisSekli}</span>
                            </span>
                          </div>
                        ) : (
                          <div className="pt-1">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                              Fiyat Alınız
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Highly responsive button action matching stitch mockup images */}
                      <div className="w-full">
                        <button
                          onClick={() => {
                            const sku = activeVariant.urun_kodu;
                            const subfolder = getSubfolderPrefix();
                            window.history.pushState({}, "", `${subfolder}/teklif?sku=${encodeURIComponent(sku)}`);
                            onCustomizeWithAI(`sku:${sku}`);
                            setTab("assistant");
                          }}
                          className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-extrabold text-xs py-3 rounded-2xl flex items-center justify-center space-x-2 transition-all duration-300 cursor-pointer shadow-xs"
                        >
                          <Check className="w-4 h-4 text-white" />
                          <span>Teklif Al</span>
                        </button>
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>

            {/* Pagination HUD align matching bottom center of Image 3 exactly */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-1.5 pt-8" id="pagination-controls-row">
                <button 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs font-bold transition-colors ${
                    currentPage === 1 
                      ? "border-slate-100 text-slate-300 cursor-not-allowed" 
                      : "border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                  }`}
                >
                  &lt;
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                      currentPage === pageNum
                        ? "bg-[#0b1c3f] border-[#0b1c3f] text-white shadow-xs"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs font-bold transition-colors ${
                    currentPage === totalPages 
                      ? "border-slate-100 text-slate-300 cursor-not-allowed" 
                      : "border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                  }`}
                >
                  &gt;
                </button>
              </div>
            )}

          </main>

        </div>
      </div>
      <Footer setTab={setTab} />
    </div>
  );
}
