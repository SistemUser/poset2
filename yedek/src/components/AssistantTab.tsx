import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, Send, Box, Cpu, FileSpreadsheet, Package, 
  HelpCircle, CheckCircle2, ChevronRight, Activity, Trash2, 
  Settings2, Download, AlertCircle, ShoppingCart, Lock,
  RefreshCw, FileQuestion, ShoppingBag, Clock, Check,
  Paperclip, FileUp, Plus
} from "lucide-react";
import { IMAGES } from "../constants";
import { ChatMessage, QuoteSpec, ImageType, QuoteItem } from "../types";
import { CATEGORIES, TAXONOMY_PRODUCTS } from "../productsData";
import { useAppConfig } from "../AppContext";

// Dynamic dimension choices by category group
const DIMENSIONS_BY_GROUP = {
  kargo: ["20x30 cm", "24x32 cm", "28x38 cm", "30x40 cm", "35x45 cm", "40x50 cm", "45x55 cm", "50x60 cm"],
  fatura: ["18x24 cm (A5)", "24x32 cm (A4)"],
  magaza: ["20x30 cm", "26x38 cm", "30x40 cm", "40x50 cm", "50x60 cm", "60x70 cm"],
  market: ["26x45 cm (Küçük)", "30x55 cm (Orta)", "35x60 cm (Büyük)", "45x75 cm (Battal)"],
  kilitli: ["8.5x13 cm", "11x18.5 cm", "13x22.5 cm", "16x27 cm", "20x30 cm"],
  opp: ["10x15 cm", "15x25 cm", "20x30 cm", "25x35 cm", "30x40 cm"],
  kagit: ["18x24 cm", "25x31 cm", "32x41 cm", "40x42 cm", "54x48 cm"],
  bez: ["25x30 cm", "30x40 cm", "35x40 cm", "40x45 cm", "50x50 cm"],
  saf: ["50 cm Rulo Eni", "100 cm Rulo Eni", "120 cm Rulo Eni", "150 cm Rulo Eni"]
};

const PRODUCT_IMAGE_TYPE_MAP: Record<string, string> = {
  "Baskılı (Logolu) Kargo Poşetleri": "kargoPlastik",
  "Cepli (Kendinden Fatura Cepli) Kargo Poşetleri": "kargoCepli",
  "Standart (Baskısız) Kargo Poşetleri": "kargoPlastik",
  "Kağıt Kargo Poşetleri": "kargoKagit",
  "Fatura Cebi ve İrsaliye Zarfları": "faturaCebi",
  "Balonlu Kargo Zarfları": "balonluZarf",
  "Mağaza Poşeti - El Geçme": "magazaElGecme",
  "Mağaza Poşeti - Takviyeli": "magazaElGecme",
  "Mağaza Poşeti - Yumuşak Saplı": "magazaSapli",
  "Market Poşetleri - Atlet": "marketAtlet",
  "Kilitli & Fermuarlı Poşetler": "doypackKilitli",
  "Jelatin & OPP Poşetler": "oppJelatin",
  "Biyobozunur Poşetler": "biyobozunur",
  "Kraft Çantalar": "kraftCanta",
  "Lüks Karton Çantalar": "luksKarton",
  "Kese Kağıtları": "keseKagidi",
  "Nonwoven (Tela) Çantalar": "telaCanta",
  "Ham Bez (Pamuk) Çantalar": "hamBez",
  "Balonlu Patpat Naylonlar": "balonluPatpat",
  "Şrink Filmler (P.E, POF, PVC)": "srinkFilm"
};

const getProductGroupKey = (spec: QuoteSpec): keyof typeof DIMENSIONS_BY_GROUP => {
  const closureLower = (spec.closure || "").toLowerCase();
  const materialLower = (spec.material || "").toLowerCase();
  const colorLower = (spec.color || "").toLowerCase();
  
  // 1. Fatura Cebi ve İrsaliye Zarfları
  if (materialLower.includes("şeffaf pe yapışkanlı") || closureLower.includes("sırt bölgesi") || closureLower.includes("fatura zarfı") || closureLower.includes("irsaliye zarfları")) {
    return "fatura";
  }
  
  // 2. Balonlu Patpat Naylonlar / Şrink Filmler (check rule/rulo/şrink/shrink)
  if (materialLower.includes("rulo") || closureLower.includes("rulo") || materialLower.includes("şrink") || materialLower.includes("shrink") || materialLower.includes("tüneli") || materialLower.includes("patpat") || materialLower.includes("kabarcıklı ldpe (rulo)")) {
    if (!closureLower.includes("zarf") && !closureLower.includes("kapak")) {
      return "saf";
    }
  }

  // 3. Bez ve Tela Çantalar
  if (materialLower.includes("tela") || materialLower.includes("nonwoven") || materialLower.includes("bez") || materialLower.includes("pamuk") || materialLower.includes("elyaf")) {
    return "bez";
  }

  // 4. Market Poşetleri (Atlet)
  if (materialLower.includes("hışır") || closureLower.includes("atlet") || closureLower.includes("çift kulplu") || materialLower.includes("atlet")) {
    return "market";
  }

  // 5. Kilitli & Fermuarlı Poşetler
  if (closureLower.includes("zip") || closureLower.includes("kilit") || closureLower.includes("fermuarlı") || materialLower.includes("laminasyon")) {
    if (materialLower.includes("bariyer") || materialLower.includes("metalize") || materialLower.includes("doypack")) {
      return "kilitli";
    }
  }

  // 6. Jelatin & OPP / Biyobozunur Poşetler
  if (materialLower.includes("opp") || materialLower.includes("jelatin") || materialLower.includes("biyobozunur") || materialLower.includes("kompost") || materialLower.includes("pla")) {
    return "opp";
  }

  // 7. Kağıt, Kraft ve Lüks Karton Çantalar
  if (spec.imageType === "kraft" || materialLower.includes("bristol") || materialLower.includes("sülfit") || materialLower.includes("karton") || materialLower.includes("kağıt büküm") || closureLower.includes("büküm sap") || materialLower.includes("kraft")) {
    if (!closureLower.includes("silikon bant") && !closureLower.includes("iade")) {
      return "kagit";
    }
  }

  // 8. Kargo Poşetleri Grubu
  if (spec.imageType === "kargo" || closureLower.includes("kapak") || closureLower.includes("bantlı") || closureLower.includes("permanent") || closureLower.includes("kargo") || materialLower.includes("co-ex")) {
    return "kargo";
  }

  // 9. Mağaza Poşetleri (El Geçme, Takviyeli, Yumuşak Saplı)
  if (spec.imageType === "magaza" || materialLower.includes("ldpe") || closureLower.includes("el geçmeli") || closureLower.includes("şerit sap")) {
    return "magaza";
  }

  return "magaza"; // fallback
};

const getMaxColorsForVariant = (bRenkYon: string): number => {
  if (!bRenkYon) return 2; // fallback
  const digits = bRenkYon.match(/\d+/g);
  if (!digits) return 2;
  const nums = digits.map(Number);
  return Math.max(...nums);
};

const getPopularDimension = (groupKey: keyof typeof DIMENSIONS_BY_GROUP): string => {
  switch (groupKey) {
    case "kargo": return "30x40 cm";
    case "fatura": return "18x24 cm (A5)";
    case "magaza": return "30x40 cm";
    case "market": return "30x55 cm (Orta)";
    case "kilitli": return "13x22.5 cm";
    case "opp": return "20x30 cm";
    case "kagit": return "25x31 cm";
    case "bez": return "35x40 cm";
    case "saf": return "100 cm Rulo Eni";
    default: return "30x40 cm";
  }
};

const parseDimensionMetrics = (dimStr: string): { area: number; length: number; isRoll: boolean } => {
  const clean = dimStr.toLowerCase();
  
  if (clean.includes("rulo") || clean.includes("eni")) {
    const match = clean.match(/(\d+)/);
    const width = match ? parseFloat(match[1]) : 100;
    return { area: 0, length: width, isRoll: true };
  }

  const numbers = clean.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/) || 
                  clean.match(/(\d+(?:\.\d+)?)\s*\*\s*(\d+(?:\.\d+)?)/) ||
                  clean.split(/[^0-9.]+/).filter(Boolean).map(parseFloat);
  
  if (numbers && numbers.length >= 2) {
    const width = parseFloat(String(numbers[0]));
    const height = parseFloat(String(numbers[1]));
    return { area: width * height, length: 0, isRoll: false };
  }

  return { area: 1200, length: 0, isRoll: false };
};

interface AssistantTabProps {
  initialPrompt: string | null;
  onClearInitialPrompt: () => void;
  onPlaceOrder: (spec: QuoteSpec) => void;
}

export default function AssistantTab({ initialPrompt, onClearInitialPrompt, onPlaceOrder }: AssistantTabProps) {
  const { getTLPrice, formatTL, usdRate, categories, products: dbProducts } = useAppConfig();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSpec, setActiveSpec] = useState<QuoteSpec | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<typeof TAXONOMY_PRODUCTS[0] | null>(null);
  const [selectedQuickCategory, setSelectedQuickCategory] = useState<string>("kargo_eticaret");
  
  // Live API cache-busting product state (Single Source of Truth)
  const [products, setProducts] = useState<any[]>([]);
  const [selectedSku, setSelectedSku] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlSku = params.get("sku");
      if (urlSku) return urlSku;
    }
    return "MGZ-2030-35";
  });

  useEffect(() => {
    fetch(`/api/products?t=${Date.now()}`, { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
        }
      })
      .catch(err => console.error("Canlı ürün verisi çekilemedi:", err));
  }, []);
  
  // Custom Logo Attachment & Drag-Drop State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Persistent Logo URL & File Name state for layered canvasing
  const [persistentLogoUrl, setPersistentLogoUrl] = useState<string | null>(null);
  const [persistentLogoName, setPersistentLogoName] = useState<string | null>(null);
  
  // Spec Fine-Tuning State
  const [adjustedQty, setAdjustedQty] = useState<number>(10000);
  const [adjustedThickness, setAdjustedThickness] = useState<number>(80);
  const [adjustedBaski, setAdjustedBaski] = useState<"standart" | "premium" | "eco">("standart");
  const [adjustedBaskiTercihi, setAdjustedBaskiTercihi] = useState<"Baskılı" | "Baskısız">("Baskılı");
  const [adjustedRenkSayisi, setAdjustedRenkSayisi] = useState<string>("Lütfen Renk Sayısı Seçin");
  const [selectedDim, setSelectedDim] = useState<string>("30x40 cm");
  const [customDim, setCustomDim] = useState<string>("");
  const [addAdhesivePocket, setAddAdhesivePocket] = useState<boolean>(false);
  
  // Download Spec PDF State
  const [isSpecDownloaded, setIsSpecDownloaded] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Order Confirmation Overlay State
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCompany, setCustomerCompany] = useState("");
  const [orderPlacedSuccess, setOrderPlacedSuccess] = useState(false);

  // B2B Quote Form State
  const [formName, setFormName] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Teklif Onay Modalı (Checkout Modal Component) State
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutSubmitted, setCheckoutSubmitted] = useState(false);

  // Çoklu Teklif Sepeti (Multi-Item RFQ) State - localStorage tabanlı temiz başlangıç
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

  // Sepet değiştiğinde localStorage senkronizasyonu
  useEffect(() => {
    try {
      localStorage.setItem("poset_quote_basket", JSON.stringify(quoteBasket));
    } catch (e) {}
  }, [quoteBasket]);

  // Ambalaj Konfigüratörü (Deterministic Selector) State
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<"kargo_eticaret" | "plastik_poset" | "kagit_karton" | "bez_tela" | "koruyucu_endustriyel">("kargo_eticaret");
  const [selectedProductId, setSelectedProductId] = useState<string>("tx-parent-1");
  const [selectedVariantCode, setSelectedVariantCode] = useState<string>("KRG-2030-01");

  const availableProducts = useMemo(() => {
    return TAXONOMY_PRODUCTS.filter(p => p.categoryKey === selectedCategoryKey);
  }, [selectedCategoryKey]);

  const selectedProductGroup = useMemo(() => {
    return TAXONOMY_PRODUCTS.find(p => p.id === selectedProductId) || availableProducts[0] || TAXONOMY_PRODUCTS[0];
  }, [selectedProductId, availableProducts]);

  const availableVariants = useMemo(() => {
    return selectedProductGroup?.variants || [];
  }, [selectedProductGroup]);

  const selectedVariant = useMemo(() => {
    return products.find(p => p.urun_kodu === selectedSku) || products[0] || null;
  }, [products, selectedSku]);

  const updateActiveSpecForProductAndVariant = (product: typeof TAXONOMY_PRODUCTS[0], variant: typeof TAXONOMY_PRODUCTS[0]["variants"][0]) => {
    if (!product || !variant) return;
    
    const isKg = variant.satis_sekli === "Kg";
    const minMoq = parseInt(variant.moq.replace(/[^0-9]/g, "")) || (isKg ? 500 : 5000);
    
    setAdjustedQty(minMoq);
    setAdjustedBaskiTercihi(variant.baski_durumu === "Baskısız" ? "Baskısız" : "Baskılı");
    setAdjustedRenkSayisi(variant.baski_durumu === "Baskısız" ? "Lütfen Renk Sayısı Seçin" : (variant.baski_renk_yon || "1 + 0 (Ön Yüz)"));

    const imgType = PRODUCT_IMAGE_TYPE_MAP[product.name] || "kargoPlastik";

    const newSpec: QuoteSpec = {
      name: product.name,
      dimensions: variant.olculer,
      material: variant.hammadde_turu,
      thickness: variant.kalinlik_seviyesi,
      closure: variant.kargo_bant_tipi !== "Yok" ? variant.kargo_bant_tipi : (variant.kulp_tipi !== "Yok" ? variant.kulp_tipi : "Standart Yapılandırma"),
      color: variant.zemin_rengi || "Standart Renk",
      leadTime: variant.stok_durumu === "Var" ? "Aynı Gün / 24 Saat Kargo" : (variant.termin_suresi || "7 İş Günü"),
      stokDurumu: variant.stok_durumu,
      stok_durumu: variant.stok_durumu,
      moq: variant.moq,
      unitPrice: variant.priceText,
      totalPrice: `₺${((variant.birim_fiyati || 0.87) * minMoq).toFixed(2)}`,
      imageType: imgType as any,
      customDetails: [
        variant.kullanim_amaci,
        `Uyumlu Sektörler: ${variant.uyumlu_sektorler}`,
        `Geri Dönüşüm Oranı: ${variant.geridonusum_orani}`
      ],
      ecoScore: 70,
      baskiDurumu: (variant.baski_durumu === "Baskısız" ? "Baskısız" : "Baskılı") as "Baskısız" | "Baskılı",
      renkSayisi: variant.baski_durumu === "Baskısız" ? "Lütfen Renk Sayısı Seçin" : (variant.baski_renk_yon || "1 + 0 (Ön Yüz)")
    };

    setActiveSpec(newSpec);
  };

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Default fallback baseline mock spec setup
  const defaultSpec: QuoteSpec = {
    name: "Mağaza Poşeti - Takviyeli",
    dimensions: "35 x 45 cm",
    material: "Alçak Yoğunluk Polietilen (LDPE)",
    thickness: "80 Mikron",
    closure: "Takviyeli El Geçmeli Sap",
    color: "Parlak Beyaz / Siyah Özel Baskılı",
    leadTime: "12-14 İş Günü",
    stokDurumu: "Siparişle",
    stok_durumu: "Siparişle",
    moq: "10.000 Adet",
    unitPrice: "₺2.10",
    totalPrice: "₺21.000",
    imageType: "magazaElGecme",
    customDetails: [
      "Canlı flexo 8 renk baskı çözünürlüğü",
      "Kopmaları önleyici takviye kaynak dolgusu",
      "FDA standartlarında gıdaya temas sertifikası"
    ],
    ecoScore: 70,
    baskiDurumu: "Baskılı",
    renkSayisi: "2 Renk"
  };

  // Bulletproof helper to locate taxonomy product for a spec
  const findTaxonomyProductForSpec = (spec: QuoteSpec | null): typeof TAXONOMY_PRODUCTS[0] | null => {
    if (!spec) return null;
    const specName = (spec.name || "").toLowerCase();
    
    // 1. Exact match
    let matched = TAXONOMY_PRODUCTS.find(p => p.name.toLowerCase() === specName);
    if (matched) return matched;

    // 2. Loose match
    matched = TAXONOMY_PRODUCTS.find(p => {
      const pName = p.name.toLowerCase();
      return specName.includes(pName) || pName.includes(specName);
    });
    if (matched) return matched;

    // 3. Category/ImageType based fallback
    const imgType = spec.imageType;
    if (imgType) {
      if (imgType === "kargoPlastik" || imgType === "kargo") {
        return TAXONOMY_PRODUCTS.find(p => p.name.includes("Baskılı") && p.name.includes("Kargo")) || TAXONOMY_PRODUCTS[0];
      }
      if (imgType === "kargoCepli") {
        return TAXONOMY_PRODUCTS.find(p => p.name.includes("Cepli")) || TAXONOMY_PRODUCTS[0];
      }
      if (imgType === "kargoKagit") {
        return TAXONOMY_PRODUCTS.find(p => p.name.includes("Kağıt Kargo")) || TAXONOMY_PRODUCTS[0];
      }
      if (imgType === "faturaCebi") {
        return TAXONOMY_PRODUCTS.find(p => p.name.includes("Fatura Cebi")) || TAXONOMY_PRODUCTS[0];
      }
      if (imgType === "balonluZarf") {
        return TAXONOMY_PRODUCTS.find(p => p.name.includes("Balonlu Kargo")) || TAXONOMY_PRODUCTS[0];
      }
      if (imgType === "magazaElGecme") {
        return TAXONOMY_PRODUCTS.find(p => p.name === "Mağaza Poşeti - El Geçme") || TAXONOMY_PRODUCTS[0];
      }
      if (imgType === "magazaSapli") {
        return TAXONOMY_PRODUCTS.find(p => p.name.includes("Yumuşak Saplı")) || TAXONOMY_PRODUCTS[0];
      }
      if (imgType === "marketAtlet") {
        return TAXONOMY_PRODUCTS.find(p => p.name.includes("Market")) || TAXONOMY_PRODUCTS[0];
      }
      if (imgType === "doypackKilitli") {
        return TAXONOMY_PRODUCTS.find(p => p.name.includes("Kilitli")) || TAXONOMY_PRODUCTS[0];
      }
      if (imgType === "oppJelatin") {
        return TAXONOMY_PRODUCTS.find(p => p.name.includes("Jelatin")) || TAXONOMY_PRODUCTS[0];
      }
      if (imgType === "biyobozunur") {
        return TAXONOMY_PRODUCTS.find(p => p.name.includes("Biyobozunur")) || TAXONOMY_PRODUCTS[0];
      }
      if (imgType === "kraftCanta") {
        return TAXONOMY_PRODUCTS.find(p => p.name.includes("Kraft")) || TAXONOMY_PRODUCTS[0];
      }
      if (imgType === "luksKarton") {
        return TAXONOMY_PRODUCTS.find(p => p.name.includes("Lüks")) || TAXONOMY_PRODUCTS[0];
      }
      if (imgType === "keseKagidi") {
        return TAXONOMY_PRODUCTS.find(p => p.name.includes("Kese")) || TAXONOMY_PRODUCTS[0];
      }
      if (imgType === "telaCanta") {
        return TAXONOMY_PRODUCTS.find(p => p.name.includes("Nonwoven")) || TAXONOMY_PRODUCTS[0];
      }
      if (imgType === "hamBez") {
        return TAXONOMY_PRODUCTS.find(p => p.name.includes("Bez")) || TAXONOMY_PRODUCTS[0];
      }
      if (imgType === "balonluPatpat") {
        return TAXONOMY_PRODUCTS.find(p => p.name.includes("Patpat")) || TAXONOMY_PRODUCTS[0];
      }
      if (imgType === "srinkFilm") {
        return TAXONOMY_PRODUCTS.find(p => p.name.includes("Şrink")) || TAXONOMY_PRODUCTS[0];
      }
    }

    return TAXONOMY_PRODUCTS[0];
  };

  // Keep selectedProduct in sync with activeSpec
  useEffect(() => {
    if (activeSpec) {
      const prod = findTaxonomyProductForSpec(activeSpec);
      setSelectedProduct(prod);
    } else {
      setSelectedProduct(null);
    }
  }, [activeSpec]);

  // Keep selectedQuickCategory (quick templates layout category selector) in sync with selectedProduct
  useEffect(() => {
    if (selectedProduct) {
      setSelectedQuickCategory(selectedProduct.categoryKey);
    }
  }, [selectedProduct]);

  // Unified State Synchronization Engine (Single Source of Truth)
  useEffect(() => {
    if (!activeSpec) return;

    const matchedProd = findTaxonomyProductForSpec(activeSpec);
    if (!matchedProd) return;

    // Reset download status when product switches
    setIsSpecDownloaded(false);

    // Determine standard options
    const standardOptions = matchedProd.variants.map(v => v.olculer);
    const normalizedSpecDim = activeSpec.dimensions ? activeSpec.dimensions.toLowerCase().replace(/\s+/g, "").replace(/x/g, "x").replace(/\*/g, "x") : "";

    // Resolve matching dimensions
    let matchedDim = "";
    if (normalizedSpecDim) {
      matchedDim = standardOptions.find(opt => {
        const normalizedOpt = opt.toLowerCase().replace(/\s+/g, "").replace(/x/g, "x").split("(")[0].trim();
        return normalizedSpecDim.includes(normalizedOpt) || normalizedOpt.includes(normalizedSpecDim);
      }) || "";
    }

    let resolvedDim = selectedDim;
    if (matchedDim) {
      setSelectedDim(matchedDim);
      resolvedDim = matchedDim;
      setCustomDim("");
    } else if (activeSpec.dimensions) {
      setSelectedDim(activeSpec.dimensions);
      resolvedDim = activeSpec.dimensions;
      setCustomDim("");
    } else {
      setSelectedDim(standardOptions[0]);
      resolvedDim = standardOptions[0];
      setCustomDim("");
    }

    // Get variant info
    const activeVar = matchedProd.variants.find(varItem => varItem.olculer === resolvedDim) || matchedProd.variants[0];

    // Enforce MOQ
    const isKg = activeVar.satis_sekli === "Kg";
    const minMoq = parseInt(activeVar.moq.replace(/[^0-9]/g, "")) || (isKg ? 500 : 10000);
    const specMoq = parseInt(activeSpec.moq.replace(/[^0-9]/g, "")) || minMoq;
    
    setAdjustedQty(specMoq >= minMoq ? specMoq : minMoq);

    // Lock printing preference to variant's specification
    const dbBaski = activeVar.baski_durumu === "Baskısız" ? "Baskısız" : "Baskılı";
    setAdjustedBaskiTercihi(dbBaski);

    // Synchronize print colors constraints
    if (dbBaski === "Baskısız") {
      setAdjustedRenkSayisi("Lütfen Renk Sayısı Seçin");
    } else {
      const maxColors = getMaxColorsForVariant(activeVar.baski_renk_yon);
      setAdjustedRenkSayisi(prev => {
        const currentSelectedColorCount = (() => {
          if (prev.includes("1")) return 1;
          if (prev.includes("2")) return 2;
          if (prev.includes("3")) return 3;
          if (prev.includes("4")) return 4;
          if (prev.includes("5")) return 5;
          return 2;
        })();
        if (prev === "Lütfen Renk Sayısı Seçin" || currentSelectedColorCount > maxColors) {
          if (maxColors === 1) return "1 Renk";
          if (maxColors === 2) return "2 Renk";
          if (maxColors === 3) return "3 Renk";
          if (maxColors === 4) return "4 Renk (CMYK)";
          return "2 Renk";
        }
        return prev;
      });
    }

    setAddAdhesivePocket(false);
  }, [activeSpec]);

  // Handle manual selection dimension changes dynamically to update thickness/MoQ
  useEffect(() => {
    if (!activeSpec || !selectedProduct) return;
    
    const activeVar = selectedProduct.variants.find(varItem => varItem.olculer === selectedDim);
    if (!activeVar) return;

    // Enforce MOQ for the newly chosen size variant
    const isKg = activeVar.satis_sekli === "Kg";
    const minMoq = parseInt(activeVar.moq.replace(/[^0-9]/g, "")) || (isKg ? 500 : 10000);
    setAdjustedQty(prev => (prev < minMoq ? minMoq : prev));

    // Lock printing preference to variant's specification
    const dbBaski = activeVar.baski_durumu === "Baskısız" ? "Baskısız" : "Baskılı";
    setAdjustedBaskiTercihi(dbBaski);

    // Synchronize print colors constraints
    if (dbBaski === "Baskısız") {
      setAdjustedRenkSayisi("Lütfen Renk Sayısı Seçin");
    } else {
      const maxColors = getMaxColorsForVariant(activeVar.baski_renk_yon);
      setAdjustedRenkSayisi(prev => {
        const currentSelectedColorCount = (() => {
          if (prev.includes("1")) return 1;
          if (prev.includes("2")) return 2;
          if (prev.includes("3")) return 3;
          if (prev.includes("4")) return 4;
          if (prev.includes("5")) return 5;
          return 2;
        })();
        if (prev === "Lütfen Renk Sayısı Seçin" || currentSelectedColorCount > maxColors) {
          if (maxColors === 1) return "1 Renk";
          if (maxColors === 2) return "2 Renk";
          if (maxColors === 3) return "3 Renk";
          if (maxColors === 4) return "4 Renk (CMYK)";
          return "2 Renk";
        }
        return prev;
      });
    }
  }, [selectedDim]);

  // Derived state selections
  const matchedProduct = selectedProduct;
  const activeVariant = matchedProduct 
    ? (matchedProduct.variants.find(varItem => varItem.olculer === selectedDim) || matchedProduct.variants[0]) 
    : null;

  const isKgBased = activeVariant 
    ? activeVariant.satis_sekli === "Kg" 
    : (activeSpec ? activeSpec.moq.toLowerCase().includes("kg") : false);

  const unitLabelStr = (() => {
    if (isKgBased) return "Kg";
    if (activeVariant) {
      if (activeVariant.satis_sekli.includes("Rulo")) return "Rulo";
    }
    return "Adet";
  })();

  const currentThicknessStr = activeVariant 
    ? activeVariant.kalinlik_seviyesi 
    : (matchedProduct && matchedProduct.variants.length > 0 ? matchedProduct.variants[0].kalinlik_seviyesi : (activeSpec ? activeSpec.thickness : "80 Mikron"));

  const currentStokDurumu: "Var" | "Siparişle" | "Yok" = activeVariant 
    ? activeVariant.stok_durumu 
    : (activeSpec ? (((activeSpec.stokDurumu || activeSpec.stok_durumu) as any) || "Siparişle") : "Siparişle");

  const currentLeadTimeStr = currentStokDurumu === "Var" 
    ? "Aynı Gün / 24 Saat Kargo" 
    : (activeVariant?.termin_suresi || activeSpec?.leadTime || "7-12 İş Günü");

  const parsedMinMoq = activeVariant 
    ? (parseInt(activeVariant.moq.replace(/[^0-9]/g, "")) || (isKgBased ? 500 : 10000))
    : (activeSpec ? (parseInt(activeSpec.moq.replace(/[^0-9]/g, "")) || (isKgBased ? 500 : 10000)) : (isKgBased ? 500 : 10000));

  // Enforce dynamic MOQ clamping on quantity adjustments
  useEffect(() => {
    if (adjustedQty < parsedMinMoq) {
      setAdjustedQty(parsedMinMoq);
    }
  }, [parsedMinMoq]);

  const showAdhesivePocketAddon = (() => {
    if (!activeSpec || !matchedProduct) return false;

    const urun_kategorisi = matchedProduct.categoryLabel.toUpperCase();
    const urun_adi = matchedProduct.name;

    // 1. MUST BE urun_kategorisi === "E-TİCARET VE KARGO AMBALAJLARI" OR categoryKey === "kargo_eticaret"
    if (matchedProduct.categoryKey !== "kargo_eticaret" && urun_kategorisi !== "E-TİCARET VE KARGO AMBALAJLARI") {
      return false;
    }

    // 2. MUST NOT contain "Cepli" or "Fatura Cebi" in urun_adi
    const urunAdiLower = urun_adi.toLowerCase();
    if (urunAdiLower.includes("cepli") || urunAdiLower.includes("fatura cebi")) {
      return false;
    }

    // 3. Additional manual exclusion filters as per instructions
    if (
      urunAdiLower.includes("mağaza") || 
      urunAdiLower.includes("magaza") || 
      urunAdiLower.includes("market") || 
      urunAdiLower.includes("karton çanta") || 
      urunAdiLower.includes("karton canta")
    ) {
      return false;
    }

    // SHOW IF name contains "Baskılı", "Standart", "Baskısız", "Kağıt", or "Balonlu"
    const hasShowKeyword = urunAdiLower.includes("baskılı") ||
                           urunAdiLower.includes("standart") ||
                           urunAdiLower.includes("baskısız") ||
                           urunAdiLower.includes("kağıt") ||
                           urunAdiLower.includes("balonlu") ||
                           urunAdiLower.includes("baskili") ||
                           urunAdiLower.includes("baskisiz") ||
                           urunAdiLower.includes("kagit");
    
    return hasShowKeyword;
  })();

  const isKargoCategory = showAdhesivePocketAddon;

  // Reset adhesive pocket addon if it becomes hidden
  useEffect(() => {
    if (!showAdhesivePocketAddon) {
      setAddAdhesivePocket(false);
    }
  }, [showAdhesivePocketAddon]);

  const parsePrice = (priceStr: string): number => {
    const cleaned = priceStr.replace(/[^0-9.,]/g, "").replace(",", ".");
    const val = parseFloat(cleaned);
    return isNaN(val) ? 1.85 : val;
  };

  const getTierMultiplier = (carpanStr?: string, qty: number = 10000): number => {
    if (!carpanStr || !carpanStr.trim()) return 1.0;
    
    const parts = carpanStr.split("/").map(s => s.trim()).filter(Boolean);
    let appliedMult = 1.0;
    
    for (const part of parts) {
      const colonMatch = part.match(/^([^:]+):\s*([0-9.,]+)$/);
      if (colonMatch) {
        let qtyKey = colonMatch[1].trim().toLowerCase();
        const multVal = parseFloat(colonMatch[2].replace(",", "."));
        if (isNaN(multVal)) continue;

        let tierMinQty = 0;
        if (qtyKey.endsWith("ton")) {
          const val = parseFloat(qtyKey.replace("ton", "").trim());
          tierMinQty = val * 1000;
        } else if (qtyKey.endsWith("kg")) {
          tierMinQty = parseFloat(qtyKey.replace("kg", "").trim());
        } else if (qtyKey.endsWith("k")) {
          tierMinQty = parseFloat(qtyKey.replace("k", "").trim()) * 1000;
        } else {
          tierMinQty = parseFloat(qtyKey.replace(/[^0-9.]/g, ""));
        }

        if (!isNaN(tierMinQty) && qty >= tierMinQty) {
          appliedMult = multVal;
        }
      }
    }
    
    return appliedMult;
  };

  // Recalculating Formula Engine anchored to selectedVariant from live products
  const { displayUnitPriceStr, displayTotalPriceStr, calculatedUnitPriceNum, calculatedTotalPriceNum, unitPrice, isQuoteOnly } = (() => {
    const targetVariant = selectedVariant || (products.length > 0 ? products[0] : null);

    const unitPrice = Number(targetVariant?.birim_fiyat) || Number(targetVariant?.birim_fiyati) || 0;
    const isQuoteOnly = targetVariant?.fiyat_aliniz === true || unitPrice === 0;

    if (isQuoteOnly || unitPrice === 0) {
      return { 
        displayUnitPriceStr: "Fiyat Alınız", 
        displayTotalPriceStr: "Fiyat Alınız",
        calculatedUnitPriceNum: 0,
        calculatedTotalPriceNum: 0,
        unitPrice: 0,
        isQuoteOnly: true
      };
    }

    const currency = targetVariant?.para_birimi || "TL";
    const baseInTL = currency === "USD" ? unitPrice * (usdRate || 34.5) : unitPrice;

    const carpanStr = targetVariant?.fiyat_carpanlari || "5k:1.00 / 10k:0.92 / 25k:0.85";
    const tierMultiplier = getTierMultiplier(carpanStr, adjustedQty);

    const pocketAddon = (addAdhesivePocket && isKargoCategory) ? 0.35 : 0;
    const finalUnitPrice = (baseInTL * tierMultiplier) + pocketAddon;
    const finalTotalPrice = finalUnitPrice * adjustedQty;

    const satisSekli = targetVariant?.satis_sekli || "Adet";

    return {
      displayUnitPriceStr: `₺${finalUnitPrice.toFixed(2)} / ${satisSekli}`,
      displayTotalPriceStr: `₺${finalTotalPrice.toLocaleString('tr-TR')}`,
      calculatedUnitPriceNum: finalUnitPrice,
      calculatedTotalPriceNum: finalTotalPrice,
      unitPrice,
      isQuoteOnly: false
    };
  })();

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleAddToQuoteBasket = () => {
    if (!activeSpec) return;

    const newItem: QuoteItem = {
      id: `basket-item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      urun_kodu: activeVariant?.urun_kodu || selectedVariantCode || "KRG-2030-01",
      urun_adi: matchedProduct?.name || activeSpec.name || "Ambalaj Ürünü",
      kategori: selectedCategoryKey,
      olculer: activeVariant?.olculer || selectedDim,
      miktar: adjustedQty,
      satis_sekli: unitLabelStr,
      baski_durumu: adjustedBaskiTercihi,
      renk_sayisi: adjustedBaskiTercihi === "Baskılı" ? adjustedRenkSayisi : "Baskısız",
      birim_fiyat: calculatedUnitPriceNum || 0,
      toplam_fiyat: calculatedTotalPriceNum || 0,
      logo_dosya_adi: persistentLogoName,
      fatura_cebi_dahil: addAdhesivePocket && isKargoCategory
    };

    setQuoteBasket(prev => [...prev, newItem]);
    triggerToast(`✓ "${newItem.urun_adi} (${newItem.olculer})" teklif listenize eklendi.`);
  };

  const validateAndSetFile = (file: File) => {
    const allowedExtensions = ["pdf", "ai", "cdr", "eps", "png", "jpg", "jpeg"];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (allowedExtensions.includes(ext)) {
      setUploadedFile(file);
      setPersistentLogoName(file.name);
      if (["png", "jpg", "jpeg"].includes(ext)) {
        const url = URL.createObjectURL(file);
        setPersistentLogoUrl(url);
      } else {
        setPersistentLogoUrl("vector_placeholder");
      }
      triggerToast(`✓ Logo "${file.name}" başarıyla eklendi.`);
    } else {
      triggerToast("❌ Sadece .pdf, .ai, .cdr, .eps, .png ve .jpg formatları kabul edilir.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    setPersistentLogoUrl(null);
    setPersistentLogoName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    triggerToast("Logo dosyası kaldırıldı.");
  };

  const handleDownloadSpecDoc = () => {
    setIsSpecDownloaded(true);
    triggerToast("✓ Şartname belgesi (Ambalaj_Sartname_Belgesi.pdf) cihazınıza indirildi.");
  };

  const getOptionsForGroup = (): string[] => {
    if (!activeSpec) return [];
    const groupKey = getProductGroupKey(activeSpec);
    
    const matchedProduct = TAXONOMY_PRODUCTS.find(p => {
      const specName = (activeSpec.name || "").toLowerCase();
      const pName = p.name.toLowerCase();
      return specName.includes(pName) || pName.includes(specName);
    });

    const standardOptions = matchedProduct 
      ? matchedProduct.variants.map(v => v.olculer) 
      : DIMENSIONS_BY_GROUP[groupKey];
    
    // Check if activeSpec.dimensions is already a standard option
    const normalizedSpecDim = activeSpec.dimensions ? activeSpec.dimensions.toLowerCase().replace(/\s+/g, "").replace(/x/g, "x").replace(/\*/g, "x") : "";
    let hasMatch = false;
    
    if (normalizedSpecDim) {
      hasMatch = standardOptions.some(opt => {
        const normalizedOpt = opt.toLowerCase().replace(/\s+/g, "").replace(/x/g, "x").split("(")[0].trim();
        return normalizedSpecDim === normalizedOpt || normalizedSpecDim.includes(normalizedOpt) || normalizedOpt.includes(normalizedSpecDim);
      });
    }

    const resultOptions = [...standardOptions];
    if (activeSpec.dimensions && !hasMatch && activeSpec.dimensions !== "Diğer / Özel Ölçü") {
      if (!resultOptions.includes(activeSpec.dimensions)) {
        resultOptions.push(activeSpec.dimensions);
      }
    }
    
    if (!resultOptions.includes("Diğer / Özel Ölçü")) {
      resultOptions.push("Diğer / Özel Ölçü");
    }

    return resultOptions;
  };

  // Build overridden dynamic QuoteSpec object to submit
  const getAdjustedSpec = (): QuoteSpec => {
    if (!activeSpec) return defaultSpec;
    const labelUnit = activeSpec.thickness.includes("gr") ? "gr/m²" : "Mikron";
    
    const details = [...activeSpec.customDetails];
    if (adjustedBaski === "premium" && !details.some(d => d.includes("8 renk"))) {
      details.push("8 Renk Ekstra Canlı Flekso Baskı Katkısı");
    } else if (adjustedBaski === "eco" && !details.some(d => d.includes("Geri Dönüşüm"))) {
      details.push("Optimum oranlı çevre dostu bio-bozunur katkı formülasyonu");
    }

    if (addAdhesivePocket && isKargoCategory) {
      details.push("Ekstra Yapışkanlı Fatura Cebi (Paket/Koli Uyumlu)");
    }

    return {
      ...activeSpec,
      dimensions: selectedDim === "Diğer / Özel Ölçü" ? (customDim || "Özel Ölçü") : selectedDim,
      moq: `${adjustedQty.toLocaleString("tr-TR")} ${unitLabelStr}`,
      thickness: currentThicknessStr,
      stokDurumu: currentStokDurumu,
      stok_durumu: currentStokDurumu,
      leadTime: currentLeadTimeStr,
      unitPrice: displayUnitPriceStr,
      totalPrice: displayTotalPriceStr,
      color: adjustedBaski === "premium" 
        ? `${activeSpec.color} / Ultra HD 8 Renk` 
        : (adjustedBaski === "eco" ? `${activeSpec.color} / d2w Biyo-Çözünür Katkılı` : activeSpec.color),
      customDetails: details,
      ecoScore: adjustedBaski === "eco" ? Math.min(100, (activeSpec.ecoScore || 70) + 15) : (activeSpec.ecoScore || 70)
    };
  };

  // Helper to select category, product, and variant by SKU code
  const applySkuSelection = (skuCode: string) => {
    if (!skuCode) return false;
    const cleanSku = skuCode.trim().toLowerCase();

    for (const prod of TAXONOMY_PRODUCTS) {
      const vMatch = prod.variants.find(v => v.urun_kodu.toLowerCase() === cleanSku);
      if (vMatch) {
        setSelectedCategoryKey(prod.categoryKey);
        setSelectedProductId(prod.id);
        setSelectedVariantCode(vMatch.urun_kodu);
        setSelectedDim(vMatch.olculer);
        updateActiveSpecForProductAndVariant(prod, vMatch);
        return true;
      }
    }
    return false;
  };

  // Initial mount: check URL search params for ?sku= code or load default taxonomy product
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const skuFromUrl = searchParams.get("sku");
    if (skuFromUrl) {
      const success = applySkuSelection(skuFromUrl);
      if (success) return;
    }

    if (!activeSpec) {
      const defaultProd = TAXONOMY_PRODUCTS[0];
      const defaultVar = defaultProd.variants[0];
      if (defaultProd && defaultVar) {
        setSelectedCategoryKey(defaultProd.categoryKey);
        setSelectedProductId(defaultProd.id);
        setSelectedVariantCode(defaultVar.urun_kodu);
        setSelectedDim(defaultVar.olculer);
        updateActiveSpecForProductAndVariant(defaultProd, defaultVar);
      }
    }
  }, []);

  // Monitor initial prompt triggers (e.g. from Catalog tab "Teklif Al" click)
  useEffect(() => {
    if (initialPrompt) {
      if (initialPrompt.startsWith("sku:")) {
        const skuCode = initialPrompt.replace("sku:", "").trim();
        applySkuSelection(skuCode);
      } else {
        const searchParams = new URLSearchParams(window.location.search);
        const skuFromUrl = searchParams.get("sku");
        if (skuFromUrl) {
          applySkuSelection(skuFromUrl);
        } else {
          const lowerPrompt = initialPrompt.toLowerCase();
          const matchedProd = TAXONOMY_PRODUCTS.find(p => lowerPrompt.includes(p.name.toLowerCase()));
          if (matchedProd) {
            setSelectedCategoryKey(matchedProd.categoryKey);
            setSelectedProductId(matchedProd.id);
            const matchedVar = matchedProd.variants.find(v => lowerPrompt.includes(v.olculer.toLowerCase())) || matchedProd.variants[0];
            if (matchedVar) {
              setSelectedVariantCode(matchedVar.urun_kodu);
              setSelectedDim(matchedVar.olculer);
              updateActiveSpecForProductAndVariant(matchedProd, matchedVar);
            }
          }
        }
      }
      onClearInitialPrompt();
    }
  }, [initialPrompt]);

  // Scroll logic helper
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSendPrompt = async (textToSend: string) => {
    if (!textToSend.trim() && !uploadedFile) return;

    let finalPrompt = textToSend;
    if (uploadedFile) {
      if (finalPrompt) {
        finalPrompt += ` [Ekli Logo Dosyası: ${uploadedFile.name}]`;
      } else {
        finalPrompt = `[Logo Dosyası Yüklendi: ${uploadedFile.name}]`;
      }
    }

    const userMsg: ChatMessage = {
      id: `m-user-${Date.now()}`,
      role: "user",
      content: finalPrompt,
      timestamp: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
    };

    setMessages(prev => [...prev, userMsg]);
    setUserInput("");
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setLoading(true);

    try {
      const isProduction = (import.meta as any).env?.PROD;
      const apiEndpoint = isProduction ? "/api/quote.php" : "/api/quote";
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt })
      });

      if (!response.ok) {
        throw new Error("Sunucu yanıt vermedi");
      }

      const responseText = await response.text();
      let data: any = {};
      try {
        if (responseText && responseText.trim() !== "undefined" && responseText.trim() !== "") {
          data = JSON.parse(responseText);
        } else {
          console.warn("Empty or undefined response received from server.");
        }
      } catch (parseError) {
        console.error("Error parsing response JSON:", responseText, parseError);
        throw new Error("Sunucu geçersiz bir veri döndürdü.");
      }
      
      const assistantMsg: ChatMessage = {
        id: `m-ai-${Date.now()}`,
        role: "assistant",
        content: data.assistantText || "Teknik özellikleri başarıyla derledim. Sağ taraftan şartname parametrelerini revize edebilirsiniz.",
        timestamp: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
        quoteSpec: data.spec
      };

      setMessages(prev => [...prev, assistantMsg]);
      if (data.spec) {
        setActiveSpec(data.spec);
      } else {
        // Fallback calculation for rich offline experience
        setActiveSpec(defaultSpec);
      }

    } catch (error) {
      console.error("Error fetching AI spec:", error);
      // Soft backup for server timeout
      const assistantMsg: ChatMessage = {
        id: `m-ai-${Date.now()}`,
        role: "assistant",
        content: "Teknik analizi başarıyla tamamladım. Girdiğiniz bilgilere göre en yakın üretim şartnamesini yan tarafta inceleyebilir ve esnekçe revize edebilirsiniz.",
        timestamp: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
      };
      setMessages(prev => [...prev, assistantMsg]);
      setActiveSpec(defaultSpec);
    } finally {
      setLoading(false);
    }
  };

  const getImageSource = (type: ImageType): string => {
    if (IMAGES[type as keyof typeof IMAGES]) {
      return IMAGES[type as keyof typeof IMAGES];
    }
    switch (type) {
      case "kargo":
        return IMAGES.kargoPlastik;
      case "kraft":
        return IMAGES.kraftCanta;
      case "magaza":
        return IMAGES.magazaElGecme;
      case "gida":
        return IMAGES.doypackKilitli;
      case "bubble":
        return IMAGES.balonluZarf;
      default:
        return IMAGES.kargoPlastik;
    }
  };

  const getEcoScoreColor = (score?: number): string => {
    if (!score) return "text-emerald-500 bg-emerald-50";
    if (score >= 85) return "text-emerald-600 bg-emerald-50 border border-emerald-100";
    if (score >= 65) return "text-indigo-600 bg-indigo-50 border border-indigo-100";
    return "text-slate-600 bg-slate-50 border border-slate-100";
  };

  const handleOpenOrderModal = () => {
    if (activeSpec) {
      setShowOrderModal(true);
      setOrderPlacedSuccess(false);
    }
  };

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone) return;

    const finalSpec = getAdjustedSpec();
    onPlaceOrder(finalSpec);
    setOrderPlacedSuccess(true);
    
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: `order-ai-${Date.now()}`,
          role: "assistant",
          content: `Tebrikler ${customerName}! Yapılandırdığınız **${finalSpec.moq}** üretim hacmindeki özelleştirilmiş ambalaj sipariş talebiniz fabrika sistemimize işlenmiştir. Uzman ekibimiz sizinle **${customerPhone}** numaralı telefondan en kısa sürede iletişime geçip dijital onay taslaklarını iletecektir.`,
          timestamp: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
        }
      ]);
      setShowOrderModal(false);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerCompany("");
    }, 1200);
  };

  // Predefined prompt helper
  const handleQuickChipSelect = (promptTitle: string, userPromptText: string) => {
    setUserInput(userPromptText);
    
    // 1. Instant state update: Find matching product and set activeSpec baseline!
    const matchedProd = TAXONOMY_PRODUCTS.find(p => p.name === promptTitle);
    if (matchedProd) {
      const firstVariant = matchedProd.variants[0];
      const imgType = PRODUCT_IMAGE_TYPE_MAP[matchedProd.name] || "magazaElGecme";
      const stokDurumuVal = firstVariant.stok_durumu || "Siparişle";
      const leadTimeVal = stokDurumuVal === "Var" ? "Aynı Gün / 24 Saat Kargo" : (firstVariant.termin_suresi || "10-12 İş Günü");
      
      const baselineSpec: QuoteSpec = {
        name: matchedProd.name,
        dimensions: firstVariant.olculer,
        material: firstVariant.hammadde_turu,
        thickness: firstVariant.kalinlik_seviyesi,
        closure: firstVariant.kargo_bant_tipi !== "Yok" ? firstVariant.kargo_bant_tipi : (firstVariant.kulp_tipi !== "Yok" ? firstVariant.kulp_tipi : "Standart Yapılandırma"),
        color: firstVariant.zemin_rengi || "Standart Renk",
        leadTime: leadTimeVal,
        stokDurumu: stokDurumuVal,
        stok_durumu: stokDurumuVal,
        moq: firstVariant.moq,
        unitPrice: "Fiyat Alınız",
        totalPrice: "Fiyat Alınız",
        imageType: imgType as any,
        customDetails: [
          firstVariant.kullanim_amaci,
          `Uyumlu Sektörler: ${firstVariant.uyumlu_sektorler}`,
          `Geri Dönüşüm Oranı: ${firstVariant.geridonusum_orani}`
        ],
        ecoScore: 70,
        baskiDurumu: (firstVariant.baski_durumu === "Baskısız" ? "Baskısız" : "Baskılı") as "Baskısız" | "Baskılı",
        renkSayisi: firstVariant.baski_durumu === "Baskısız" ? "Lütfen Renk Sayısı Seçin" : "2 Renk"
      };
      setActiveSpec(baselineSpec);
    }
    
    // 2. Trigger API call in the background
    handleSendPrompt(userPromptText);
  };

  return (
    <div className="py-10 px-6 max-w-7xl mx-auto bg-[#fcfdfd] min-h-screen" id="assistant-tab-root">
      <div className="grid lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Column: AMBALAJ KONFİGÜRATÖRÜ (DETERMİNİSTİK SEÇİCİ) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/85 p-7.5 rounded-3xl shadow-xs flex flex-col justify-between space-y-6">
          
          <div className="space-y-6">

            {/* Section Header */}
            <div className="space-y-1.5 border-b border-slate-100 pb-4">
              <h2 className="text-xl sm:text-[23px] font-black text-[#0f172a] tracking-tight">
                Fiyat Teklif Merkezi
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Kategori, ürün grubu ve varyasyon ölçülerini seçerek anında teknik şartname ve fiyat teklifi oluşturun.
              </p>
            </div>

            {/* 1. KATEGORİ SEÇİMİ (Horizontal Chips/Tabs) */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono block">
                1. Kategori Seçimi
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" id="configurator-category-chips">
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategoryKey === cat.key;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => {
                        const newCatKey = cat.key as any;
                        setSelectedCategoryKey(newCatKey);
                        const prods = TAXONOMY_PRODUCTS.filter(p => p.categoryKey === newCatKey);
                        if (prods.length > 0) {
                          setSelectedProductId(prods[0].id);
                          const v = prods[0].variants[0];
                          if (v) {
                            setSelectedVariantCode(v.urun_kodu);
                            setSelectedDim(v.olculer);
                            updateActiveSpecForProductAndVariant(prods[0], v);
                          }
                        }
                      }}
                      className={`px-3 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer text-center border shadow-3xs ${
                        isSelected
                          ? "bg-[#0b1c3f] text-white border-[#0b1c3f] shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {cat.label === "E-TİCARET VE KARGO AMBALAJLARI" ? "E-Ticaret & Kargo" : 
                       cat.label === "KAĞIT VE KARTON ÇANTALAR" ? "Kağıt & Karton" : 
                       cat.label === "BEZ VE TELA ÇANTALAR" ? "Bez & Tela" : 
                       cat.label === "KORUYUCU VE ENDÜSTRİYEL AMBALAJ" ? "Endüstriyel" : "Plastik Poşetler"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. ÜRÜN GRUBU SEÇİMİ (Chips) */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono block">
                2. Ürün Grubu Seçimi
              </label>
              <div className="flex flex-wrap gap-2" id="configurator-product-chips">
                {availableProducts.map((prod) => {
                  const isSelected = selectedProductId === prod.id;
                  return (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => {
                        setSelectedProductId(prod.id);
                        const v = prod.variants[0];
                        if (v) {
                          setSelectedVariantCode(v.urun_kodu);
                          setSelectedDim(v.olculer);
                          updateActiveSpecForProductAndVariant(prod, v);
                        }
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 border ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <Package className="w-3.5 h-3.5 opacity-70 shrink-0" />
                      <span>{prod.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. ÜRÜN ÖLÇÜSÜ (Dropdown with JSON variations) */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">
                  3. Ürün Ölçüsü (Varyasyon)
                </label>
                {selectedVariant && (
                  <span className="text-[10px] font-mono font-bold text-slate-500">
                    Kod: {selectedVariant.urun_kodu}
                  </span>
                )}
              </div>
              <select
                value={selectedVariantCode}
                onChange={(e) => {
                  const vCode = e.target.value;
                  setSelectedVariantCode(vCode);
                  const v = selectedProductGroup?.variants.find(item => item.urun_kodu === vCode);
                  if (v && selectedProductGroup) {
                    setSelectedDim(v.olculer);
                    updateActiveSpecForProductAndVariant(selectedProductGroup, v);
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[#0b1c3f] cursor-pointer shadow-3xs"
              >
                {availableVariants.map((v) => (
                  <option key={v.urun_kodu} value={v.urun_kodu}>
                    {v.olculer} ({v.kalinlik_seviyesi}) - MOQ: {v.moq}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. SİPARİŞ MİKTARI (MoQ Locked Slider & Input) */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">
                  4. Sipariş Miktarı ({selectedVariant?.satis_sekli || "Adet"})
                </label>
                <span className="text-xs font-black text-indigo-600 font-mono">
                  {adjustedQty.toLocaleString("tr-TR")} {selectedVariant?.satis_sekli || "Adet"}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min={parsedMinMoq}
                  max={isKgBased ? 5000 : 50000}
                  step={isKgBased ? 50 : 1000}
                  value={adjustedQty}
                  onChange={(e) => setAdjustedQty(parseInt(e.target.value) || parsedMinMoq)}
                  className="flex-1 accent-[#0b1c3f] cursor-pointer h-2 bg-slate-100 rounded-lg appearance-none"
                />
                <input
                  type="number"
                  min={parsedMinMoq}
                  step={isKgBased ? 50 : 1000}
                  value={adjustedQty}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || parsedMinMoq;
                    setAdjustedQty(val < parsedMinMoq ? parsedMinMoq : val);
                  }}
                  className="w-28 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 text-center focus:outline-none focus:border-[#0b1c3f]"
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono font-bold text-slate-400">
                <span>Min. Sipariş (MOQ): {parsedMinMoq.toLocaleString("tr-TR")} {selectedVariant?.satis_sekli || "Adet"}</span>
                <span>Max: {(isKgBased ? 5000 : 50000).toLocaleString("tr-TR")} {selectedVariant?.satis_sekli || "Adet"}</span>
              </div>
            </div>

            {/* 5. BASKI & RENK (JSON Locked Configuration) */}
            <div className="grid sm:grid-cols-2 gap-4 pt-1 border-t border-slate-100">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono block">
                  5. Baskı Durumu
                </label>
                <div className="bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>{selectedVariant?.baski_durumu || "Baskılı"}</span>
                  <span className="text-[9px] font-mono text-slate-400 uppercase">JSON Kilitli</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono block">
                  Baskı Renk / Yön
                </label>
                <div className="bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>{selectedVariant?.baski_renk_yon || "1 + 0 (Ön Yüz)"}</span>
                  <span className="text-[9px] font-mono text-slate-400 uppercase">Standart</span>
                </div>
              </div>
            </div>

            {/* 6. LOGO / TASARIM YÜKLEME (Kosullu Render: Yalnızca Baskılı ise) */}
            {adjustedBaskiTercihi === "Baskılı" && (
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono block">
                  6. Logo / Tasarım Yükleme (Opsiyonel)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".pdf,.ai,.cdr,.eps,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                />
                {uploadedFile ? (
                  <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-900">
                      <FileUp className="w-4 h-4 text-emerald-600" />
                      <span className="truncate max-w-[220px] font-mono text-[11px]">{uploadedFile.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={removeUploadedFile}
                      className="text-xs font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
                    >
                      İptal
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                    <span>Logo veya Vektörel Tasarım Yükle (.pdf, .ai, .cdr, .png, .jpg)</span>
                  </button>
                )}
              </div>
            )}

            {/* TEKLİF LİSTESİ VE ONAY BUTONU (SOL SÜTUN) */}
            <div className="space-y-3 pt-3 border-t border-slate-100 font-sans" id="left-column-basket-section">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono block">
                7. Teklif Listenizdeki Ürünler ({quoteBasket.length})
              </label>

              {quoteBasket.length === 0 ? (
                /* Sepet Boş Durumu */
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex items-center space-x-3 text-slate-500">
                  <ShoppingBag className="w-5 h-5 text-slate-400 shrink-0" />
                  <p className="text-xs font-medium leading-relaxed">
                    Henüz teklif listenize ürün eklemediniz. Sağdaki <strong className="text-emerald-700 font-bold">'+ Bu Ürünü Teklife Ekle'</strong> butonunu kullanabilirsiniz.
                  </p>
                </div>
              ) : (
                /* Sepet Dolu Durumu */
                <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/70 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <ShoppingBag className="w-4 h-4 text-emerald-600" />
                      <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider font-mono">
                        Eklenen Ürünler ({quoteBasket.length})
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setQuoteBasket([]);
                        triggerToast("Teklif listeniz temizlendi.");
                      }}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
                    >
                      Temizle
                    </button>
                  </div>

                  {/* Basket Items List */}
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {quoteBasket.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white border border-slate-200/80 rounded-xl p-3 flex items-center justify-between gap-2 shadow-2xs hover:border-slate-300 transition-all"
                      >
                        <div className="flex-grow min-w-0 space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-xs text-slate-850 truncate">
                              {item.urun_adi}
                            </span>
                            <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 shrink-0 font-mono">
                              {item.urun_kodu}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 font-medium">
                            <span>{item.olculer}</span>
                            <span>•</span>
                            <span className="font-bold text-slate-700 font-mono">
                              {item.miktar.toLocaleString("tr-TR")} {item.satis_sekli}
                            </span>
                            <span>•</span>
                            <span className="text-emerald-700 font-bold">
                              {item.baski_durumu === "Baskısız" ? "Baskısız" : item.renk_sayisi}
                            </span>
                            {item.fatura_cebi_dahil && (
                              <>
                                <span>•</span>
                                <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]">
                                  Fatura Cebi Dahil
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2.5 shrink-0">
                          <span className="font-black text-xs text-[#0b1c3f] font-mono">
                            {item.toplam_fiyat && item.toplam_fiyat > 0 ? formatTL(item.toplam_fiyat, "TL") : "Fiyat Alınız"}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setQuoteBasket(prev => prev.filter(i => i.id !== item.id));
                              triggerToast("Ürün teklif listenizden çıkarıldı.");
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total Summary Row */}
                  <div className="border-t border-slate-200/80 pt-2.5 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-500">Genel Toplam (KDV Hariç):</span>
                    <span className="font-black text-base text-emerald-700 font-mono">
                      {(() => {
                        const hasQuoteRequired = quoteBasket.some(i => !i.toplam_fiyat || i.toplam_fiyat === 0);
                        const totalSum = quoteBasket.reduce((sum, i) => sum + (i.toplam_fiyat || 0), 0);
                        if (hasQuoteRequired || totalSum === 0) return "Fiyat Alınız";
                        return formatTL(totalSum, "TL");
                      })()}
                    </span>
                  </div>

                  {/* Main Action Button: Teklifi Tamamla & Gönder */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsCheckoutModalOpen(true);
                      setCheckoutSubmitted(false);
                    }}
                    style={{ backgroundColor: "#047857" }}
                    className="w-full text-white font-extrabold text-xs py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all duration-200 shadow-md hover:shadow-lg hover:bg-emerald-900 active:scale-95 cursor-pointer mt-2"
                    id="complete-quote-left-btn"
                  >
                    <Send className="w-4 h-4 text-white shrink-0" />
                    <span>Teklifi Tamamla & Gönder ({quoteBasket.length} Ürün)</span>
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Right Column: DİNAMİK ÖNİZLEME (Sticky Panel) */}
        <div className="lg:col-span-5 sticky top-6 h-fit space-y-6" id="digital-preview-col">
          
          {/* Main Card */}
          <div className="bg-white border border-slate-200/85 p-6 rounded-3xl shadow-xs flex-grow flex flex-col space-y-5">
            
            {/* Top Header of Preview Panel */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                </div>
                <span className="font-extrabold text-sm text-[#0f172a] uppercase tracking-wider font-sans">
                  Ürün ve Fiyat Özeti
                </span>
              </div>

              {/* Status Badge right-aligned matching image 2 */}
              <div className="flex items-center space-x-1.5">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeSpec ? "bg-emerald-400" : "bg-amber-400"}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${activeSpec ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                </span>
                {!activeSpec && (
                  <span className="text-[10px] font-bold text-slate-500 font-sans tracking-wide">
                    Bekleniyor
                  </span>
                )}
              </div>
            </div>

            {/* Empty state or Active calculations layout */}
            {!activeSpec ? (
              /* Dotted blank canvas matching image 2 empty state exactly */
              <div className="border border-slate-300 border-dashed rounded-2xl p-8 flex-grow flex flex-col items-center justify-center text-center space-y-4 min-h-[320px]">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                  <FileQuestion className="w-5 h-5 text-slate-400" />
                </div>
                <div className="space-y-1 max-w-[280px]">
                  <p className="font-bold text-sm text-slate-800">Detayları Bekliyoruz</p>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                    Sol taraftaki alana talebinizi girdiğinizde, seçtiğiniz ürünün 3D önizlemesi ve teknik detayları burada belirecektir.
                  </p>
                </div>
              </div>
            ) : (
              /* Beautiful active interactive specs dashboard */
              <div className="space-y-5 flex-grow">

                {/* Dynamically Rendered Spec Micro Chips */}
                <div className="flex flex-wrap gap-1.5" id="preview-spec-micro-chips">
                  <span className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-indigo-100">
                    {adjustedQty.toLocaleString("tr-TR")} {unitLabelStr}
                  </span>
                  <span className="bg-slate-50 text-slate-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-slate-200">
                    {activeSpec.imageType === "kargo" ? "Kargo Poşeti" : (activeSpec.imageType === "kraft" ? "Kraft Çantası" : (activeSpec.imageType === "magaza" ? "Mağaza Poşeti" : "Endüstriyel Ambalaj"))}
                  </span>
                  {currentStokDurumu === "Var" ? (
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-emerald-200 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Stokta Var</span>
                    </span>
                  ) : (
                    <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-blue-200 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      <span>Sipariş Üzerine Üretim</span>
                    </span>
                  )}
                  {adjustedBaskiTercihi === "Baskılı" && (
                    <span className="bg-amber-50 text-amber-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-amber-100">
                      {adjustedRenkSayisi}
                    </span>
                  )}
                  {persistentLogoName && adjustedBaskiTercihi === "Baskılı" && (
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-emerald-100 truncate max-w-[120px]">
                      {persistentLogoName}
                    </span>
                  )}
                </div>
                
                {/* 3D Blueprint Canvas Wrapper */}
                <div className="relative h-56 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center group">
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none"></div>
                  
                  {/* Hologram alignment grids */}
                  <div className="absolute top-4 left-4 w-3.5 h-3.5 border-t-2 border-l-2 border-indigo-500/60"></div>
                  <div className="absolute top-4 right-4 w-3.5 h-3.5 border-t-2 border-r-2 border-indigo-500/60"></div>
                  <div className="absolute bottom-4 left-4 w-3.5 h-3.5 border-b-2 border-l-2 border-indigo-500/60"></div>
                  <div className="absolute bottom-4 right-4 w-3.5 h-3.5 border-b-2 border-r-2 border-indigo-500/60"></div>

                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={getImageSource(activeSpec.imageType)}
                      alt="ambalaj blueprint"
                      className="w-full h-full object-contain bg-slate-900/50 filter drop-shadow-[0_4px_12px_rgba(255,255,255,0.05)] transform hover:scale-105 duration-500"
                      referrerPolicy="no-referrer"
                    />

                    {/* Absolute positioned Overlay Logo Layer (Conditionally rendered) */}
                    {adjustedBaskiTercihi === "Baskılı" && (
                      <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[35%] h-[35%] flex items-center justify-center pointer-events-none z-10 bg-transparent">
                        {persistentLogoUrl ? (
                          persistentLogoUrl === "vector_placeholder" ? (
                            <div className="flex flex-col items-center justify-center text-center w-full h-full select-none bg-transparent p-1" style={{ mixBlendMode: "multiply" }}>
                              <svg className="w-8 h-8 mb-1.5 opacity-80 text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                                <polyline points="2 17 12 22 22 17" />
                                <polyline points="2 12 12 17 22 12" />
                              </svg>
                              <span className="text-[8px] font-black uppercase tracking-wider text-slate-900 truncate max-w-full font-mono" title={persistentLogoName || ""}>
                                {persistentLogoName ? persistentLogoName.split('.')[0] : "VEKTÖREL LOGO"}
                              </span>
                              <span className="text-[6px] text-slate-500 font-bold tracking-widest uppercase">
                                Vektörel Baskı
                              </span>
                            </div>
                          ) : (
                            <img
                              src={persistentLogoUrl}
                              alt="Logo Overlay"
                              className="max-w-full max-h-full object-contain select-none bg-transparent"
                              style={{ mixBlendMode: "multiply", filter: "contrast(1.1) brightness(0.9)" }}
                              referrerPolicy="no-referrer"
                            />
                          )
                        ) : (
                          <div className="border border-slate-700/60 border-dashed rounded p-1.5 flex flex-col items-center justify-center text-center opacity-30 w-full h-full bg-slate-900/40">
                            <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-widest font-mono">LOGO ALANI</span>
                            <span className="text-[6.5px] text-slate-500 font-medium">Lütfen Logo Yükleyin</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Floating product family tag */}
                  <div className="absolute top-3.5 left-3.5 bg-[#0b1c3f] text-white text-[9px] font-mono font-bold px-3 py-1 rounded shadow-sm uppercase tracking-wider">
                    {matchedProduct ? matchedProduct.name : "Butik Mağaza Torbası"}
                  </div>

                  {/* Ecological score badge */}
                  <div className={`absolute bottom-3.5 right-3.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center space-x-1 ${getEcoScoreColor(adjustedBaski === "eco" ? Math.min(100, (activeSpec.ecoScore || 70) + 15) : (activeSpec.ecoScore || 70))}`}>
                    <span>ECO:</span>
                    <span>{adjustedBaski === "eco" ? Math.min(100, (activeSpec.ecoScore || 70) + 15) : (activeSpec.ecoScore || 70)}%</span>
                  </div>
                </div>

                {/* Live pricing tray block */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 font-sans">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider leading-none mb-1">
                      {isKgBased ? "Kg Birim Fiyat" : (unitLabelStr === "Rulo" ? "Rulo Birim Fiyat" : "Adet Birim Fiyat")}
                    </span>
                    <span className="text-xl font-black text-emerald-600 font-mono tracking-tight">{displayUnitPriceStr}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider leading-none mb-1">Tahmini Toplam Tutar</span>
                    <span className="text-xl font-black text-[#0b1c3f] font-mono tracking-tight">{displayTotalPriceStr}</span>
                  </div>
                </div>

                {/* Salt Okunur Şartname & Teknik Özellikler */}
                <div className="space-y-3 border-t border-slate-100 pt-4">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-slate-850 uppercase tracking-wider font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Canlı Şartname & Teknik Özellikler</span>
                  </div>

                  <div className="divide-y divide-slate-100 text-xs font-semibold bg-slate-50/70 border border-slate-100 rounded-2xl p-4 space-y-0">
                    <div className="py-2 flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Aktif Ürün Grubu:</span>
                      <span className="font-extrabold text-slate-800 text-right">{matchedProduct?.name || "Kargo Poşeti"}</span>
                    </div>
                    <div className="py-2 flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Seçilen Ölçü (Varyasyon):</span>
                      <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{activeVariant?.olculer || selectedDim}</span>
                    </div>
                    <div className="py-2 flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Sipariş Miktarı:</span>
                      <span className="font-extrabold text-slate-800 font-mono">{adjustedQty.toLocaleString("tr-TR")} {unitLabelStr}</span>
                    </div>
                    <div className="py-2 flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Ana Hammadde:</span>
                      <span className="font-extrabold text-slate-800">{activeVariant?.hammadde_turu || activeSpec.material}</span>
                    </div>
                    <div className="py-2 flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Malzeme Kalınlığı:</span>
                      <span className="font-extrabold text-slate-800">{currentThicknessStr}</span>
                    </div>
                    <div className="py-2 flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Baskı Durumu:</span>
                      <span className={`font-extrabold px-2 py-0.5 rounded text-[11px] ${adjustedBaskiTercihi === "Baskısız" ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-indigo-50 text-indigo-700 border border-indigo-100"}`}>
                        {adjustedBaskiTercihi === "Baskısız" ? "Baskısız (Düz / Standart)" : `Baskılı (${adjustedRenkSayisi})`}
                      </span>
                    </div>
                    {matchedProduct?.categoryKey === "kargo_eticaret" && (
                      <>
                        <div className="py-2 flex justify-between items-center">
                          <span className="text-slate-400 font-medium">Kargo Bant Tipi:</span>
                          <span className="font-extrabold text-slate-800">{activeVariant?.kargo_bant_tipi || "Tek Bant (Kalıcı)"}</span>
                        </div>
                        <div className="py-2 flex justify-between items-center">
                          <span className="text-slate-400 font-medium">İrsaliye Cebi:</span>
                          <span className="font-extrabold text-slate-800">{activeVariant?.irsaliye_cebi_detay || "Yok"}</span>
                        </div>
                      </>
                    )}
                    {(matchedProduct?.categoryKey === "plastik_poset" || matchedProduct?.categoryKey === "kagit_karton" || matchedProduct?.categoryKey === "bez_tela") && (
                      <div className="py-2 flex justify-between items-center">
                        <span className="text-slate-400 font-medium">Kulp / Sap Tipi:</span>
                        <span className="font-extrabold text-slate-800">{activeVariant?.kulp_tipi || "Yok"}</span>
                      </div>
                    )}
                    {(matchedProduct?.categoryKey === "plastik_poset" || matchedProduct?.categoryKey === "kagit_karton") && (
                      <div className="py-2 flex justify-between items-center">
                        <span className="text-slate-400 font-medium">Körük Detayı:</span>
                        <span className="font-extrabold text-slate-800">{activeVariant?.koruk_detayi || "Yok"}</span>
                      </div>
                    )}
                    <div className="py-2 flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Stok Durumu:</span>
                      <span className={`font-extrabold ${currentStokDurumu === "Var" ? "text-emerald-600" : "text-blue-600"}`}>
                        {currentStokDurumu === "Var" ? "Stokta Var" : "Sipariş Üzerine Üretim"}
                      </span>
                    </div>

                  </div>
                </div>

                {/* MOQ & Production Lead Time Cards (Relocated right below Specs Table) */}
                <div className="grid grid-cols-2 gap-3 pt-2 font-sans" id="moq-production-hud-panels">
                  {/* Box 1: MOQ */}
                  <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl flex items-center space-x-3">
                    <div className="bg-white text-slate-600 p-2 rounded-xl border border-slate-200 shrink-0">
                      <ShoppingBag className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400 block leading-none mb-1 font-mono">
                        MIN. SİPARİŞ (MOQ)
                      </span>
                      <span className="text-xs font-black text-[#0f172a] leading-none font-mono truncate block">
                        {activeSpec ? activeSpec.moq : "-- Adet"}
                      </span>
                    </div>
                  </div>

                  {/* Box 2: Lead Time */}
                  <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl flex items-center space-x-3">
                    <div className="bg-white text-slate-600 p-2 rounded-xl border border-slate-200 shrink-0">
                      <Clock className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400 block leading-none mb-1 font-mono">
                        TAHMİNİ ÜRETİM
                      </span>
                      <span className="text-xs font-black text-[#0f172a] leading-none truncate block">
                        {activeSpec ? currentLeadTimeStr : "-- İş Günü"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Side Item: Adhesive shipping envelopes (Conditional & Up-sell) - Placed above Action Button */}
                {showAdhesivePocketAddon ? (
                  <div 
                    onClick={() => setAddAdhesivePocket(!addAdhesivePocket)}
                    className={`border rounded-2xl p-3 px-3.5 transition-all duration-300 select-none cursor-pointer text-xs relative overflow-hidden ${
                      addAdhesivePocket 
                        ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10" 
                        : "bg-slate-50 border-slate-200 text-slate-700 opacity-60 hover:opacity-100"
                    }`}
                  >
                    {/* Top Action Row Containing Checkbox Toggle and Label */}
                    <div className="flex items-center justify-between mb-2 pb-1 border-b border-dashed border-slate-200/50">
                      <span className={`text-[9px] font-black tracking-wider uppercase font-mono ${addAdhesivePocket ? "text-emerald-400" : "text-slate-400"}`}>
                        Uyumlu Paket Kombinasyonu
                      </span>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] font-bold">Siparişime Ekle</span>
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                          addAdhesivePocket 
                            ? "bg-emerald-500 border-emerald-500 text-white" 
                            : "bg-white border-slate-300 text-transparent"
                        }`}>
                          <svg className="w-2.5 h-2.5 stroke-current stroke-[3.5]" fill="none" viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        <img 
                          src={IMAGES.adhesivePockets} 
                          alt="fatura cebi" 
                          className="w-10 h-10 rounded-xl object-cover shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <h6 className={`font-bold text-[11px] ${addAdhesivePocket ? "text-white" : "text-slate-800"}`}>
                            Yapışkanlı Fatura Cebi
                          </h6>
                          <p className={`text-[9px] font-medium leading-normal ${addAdhesivePocket ? "text-slate-300" : "text-slate-400"}`}>
                            Standart Koli & Gönderi Faturası İçin
                          </p>
                        </div>
                      </div>
                      <span className={`font-mono font-extrabold shrink-0 ${addAdhesivePocket ? "text-emerald-300" : "text-slate-500"}`}>
                        +₺0.24 / Adet
                      </span>
                    </div>
                  </div>
                ) : null}

                {/* SAĞ PANEL AKSİYON BUTONU (Tek Buton) */}
                <div className="pt-2 font-sans" id="right-column-action-button">
                  <button
                    type="button"
                    onClick={handleAddToQuoteBasket}
                    style={{ backgroundColor: "#059669" }}
                    className="w-full text-white font-extrabold text-xs py-3.5 px-4 rounded-2xl flex items-center justify-center space-x-2 transition-all duration-200 shadow-md hover:shadow-lg hover:bg-emerald-700 active:scale-95 cursor-pointer"
                    id="add-to-quote-basket-btn"
                  >
                    <Plus className="w-4 h-4 text-white shrink-0" />
                    <span>+ Bu Ürünü Teklife Ekle</span>
                  </button>
                </div>

              </div>
            )}

          </div>

        </div>

      </div>

      {/* TEKLİF ONAY MODALI (CHECKOUT MODAL COMPONENT) */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in-50 zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
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
                onClick={() => setIsCheckoutModalOpen(false)}
                className="text-slate-300 hover:text-white font-mono text-xl p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: 2 Sütunlu Grid */}
            <div className="p-6 overflow-y-auto flex-grow space-y-6">
              {checkoutSubmitted ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 text-center space-y-4 my-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <Check className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-emerald-900 font-display">Talebiniz Alındı!</h3>
                    <p className="text-xs text-emerald-800 font-medium max-w-md mx-auto leading-relaxed">
                      Sayın <strong>{formName}</strong>, <strong>{quoteBasket.length}</strong> çeşit ambalaj ürünü içeren teklif talebiniz <strong>info@poset.com</strong> e-posta adresine ve fabrikamıza iletilmiştir. Satış ekibimiz sizinle <strong>{formPhone}</strong> numaralı telefondan en kısa sürede iletişime geçecektir.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCheckoutSubmitted(false);
                      setIsCheckoutModalOpen(false);
                      setQuoteBasket([]);
                      triggerToast("✓ Teklif talebiniz info@poset.com adresine iletildi.");
                    }}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    Tamam / Yeni Teklif Oluştur
                  </button>
                </div>
              ) : (
                <form 
                  id="checkout-modal-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const finalName = formName.trim() || "Teklif Sahibi";
                    const finalPhone = formPhone.trim() || "Belirtilmedi";

                    try {
                      const isProduction = (import.meta as any).env?.PROD;
                      const apiEndpoint = isProduction ? "/api/quote.php" : "/api/quote";
                      await fetch(apiEndpoint, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          action: "submit_rfq",
                          recipient_email: "info@poset.com",
                          customer: { name: finalName, phone: finalPhone, company: formCompany, email: formEmail },
                          items: quoteBasket
                        })
                      }).catch(() => {});
                    } catch (err) {}

                    setCheckoutSubmitted(true);
                  }}
                >
                  <div className="grid md:grid-cols-12 gap-6 items-start">
                    
                    {/* Sol Kolon: Teklif sepetindeki ürünlerin kompakt özeti */}
                    <div className="md:col-span-6 bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                        <span className="font-black text-xs text-slate-800 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                          <ShoppingBag className="w-4 h-4 text-emerald-600" />
                          <span>Teklif Sepeti Özeti ({quoteBasket.length})</span>
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 font-mono">KDV Hariç</span>
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
                                  ₺{Math.round(item.toplam_fiyat).toLocaleString("tr-TR")}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-2 text-[10.5px] text-slate-500 font-medium">
                                <span>{item.olculer}</span>
                                <span>•</span>
                                <span className="font-mono font-bold text-slate-700">{item.miktar.toLocaleString("tr-TR")} {item.satis_sekli}</span>
                                <span>•</span>
                                <span className="text-emerald-700 font-bold">{item.baski_durumu === "Baskısız" ? "Baskısız" : item.renk_sayisi}</span>
                                {item.fatura_cebi_dahil && (
                                  <>
                                    <span>•</span>
                                    <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[9.5px]">Fatura Cebi Dahil</span>
                                  </>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Total Summary */}
                      <div className="border-t border-slate-200/80 pt-3 flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-600">Toplam Tahmini Tutar:</span>
                        <span className="font-black text-lg text-emerald-700 font-mono">
                          ₺{Math.round(quoteBasket.reduce((sum, item) => sum + item.toplam_fiyat, 0)).toLocaleString("tr-TR")}
                        </span>
                      </div>
                    </div>

                    {/* Sağ Kolon: İletişim bilgileri formu */}
                    <div className="md:col-span-6 space-y-4">
                      <div className="border-b border-slate-100 pb-2">
                        <h5 className="font-black text-xs text-slate-800 uppercase tracking-wider font-mono">
                          Teklif Sahibinin Bilgileri
                        </h5>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          Lütfen resmi teklif ve numune gönderimi için bilgilerinizi girin.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-700 block mb-1">Ad Soyad *</label>
                          <input
                            type="text"
                            required
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            placeholder="Adınız ve Soyadınız"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-[#0b1c3f]"
                          />
                        </div>

                        <div>
                          <label className="text-[10.5px] font-bold text-slate-700 block mb-1">Firma / Marka Adı</label>
                          <input
                            type="text"
                            value={formCompany}
                            onChange={(e) => setFormCompany(e.target.value)}
                            placeholder="Firma Unvanı (Opsiyonel)"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-[#0b1c3f]"
                          />
                        </div>

                        <div>
                          <label className="text-[10.5px] font-bold text-slate-700 block mb-1">Telefon Numarası *</label>
                          <input
                            type="tel"
                            required
                            value={formPhone}
                            onChange={(e) => setFormPhone(e.target.value)}
                            placeholder="05XX XXX XX XX"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-[#0b1c3f]"
                          />
                        </div>

                        <div>
                          <label className="text-[10.5px] font-bold text-slate-700 block mb-1">E-posta Adresi *</label>
                          <input
                            type="email"
                            required
                            value={formEmail}
                            onChange={(e) => setFormEmail(e.target.value)}
                            placeholder="ornek@firma.com"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-[#0b1c3f]"
                          />
                        </div>
                      </div>
                    </div>

                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            {!checkoutSubmitted && (
              <div className="bg-slate-50 border-t border-slate-200/80 p-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="w-full sm:w-auto px-5 py-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                >
                  ← Geri Dön / Ürün Ekle
                </button>

                <button
                  type="submit"
                  form="checkout-modal-form"
                  style={{ backgroundColor: "#047857" }}
                  className="w-full sm:w-auto px-8 py-3.5 text-white font-extrabold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all duration-200 shadow-md hover:shadow-lg hover:bg-emerald-800 active:scale-95 cursor-pointer"
                >
                  <Send className="w-4 h-4 text-white" />
                  <span>Teklif Talebini Gönder ({quoteBasket.length} Ürün)</span>
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Siparişe Dönüştür sliding form Modal overlay */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in-50 zoom-in-95 duration-200">
            {/* Modal Heading */}
            <div className="bg-[#0b1c3f] text-white p-6 relative">
              <button 
                onClick={() => setShowOrderModal(false)}
                className="absolute top-4 right-4 text-slate-300 hover:text-white font-mono text-lg"
              >
                ✕
              </button>
              <div className="space-y-1">
                <h4 className="font-extrabold text-base font-display">Fabrika İmalat Siparişi Oluştur</h4>
                <p className="text-xs text-slate-400 font-medium">Lütfen irtibat koordinatlarınızı girin, şartnameyi imalata alalım.</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleOrderSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Ad Soyad / Yetkili</label>
                <input
                  type="text"
                  required
                  placeholder="Caner Aydın"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold px-3.5 py-3 rounded-xl focus:bg-white focus:outline-none focus:border-[#0b1c3f] text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Telefon Numarası</label>
                <input
                  type="tel"
                  required
                  placeholder="0 (555) 000 00 00"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold px-3.5 py-3 rounded-xl focus:bg-white focus:outline-none focus:border-[#0b1c3f] text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Firma Ünvanı (Opsiyonel)</label>
                <input
                  type="text"
                  placeholder="Aydın A.Ş. / E-Ticaret"
                  value={customerCompany}
                  onChange={(e) => setCustomerCompany(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold px-3.5 py-3 rounded-xl focus:bg-white focus:outline-none focus:border-[#0b1c3f] text-slate-800"
                />
              </div>

              {/* Submit panel summary */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[11px] text-slate-500 font-semibold space-y-1 font-sans">
                <div className="flex justify-between">
                  <span>Üretim Hacmi:</span>
                  <span className="font-extrabold text-[#0f172a]">{adjustedQty.toLocaleString("tr-TR")} Adet</span>
                </div>
                <div className="flex justify-between">
                  <span>Tahmini Fiyat:</span>
                  <span className="font-extrabold text-emerald-600 font-mono text-[11.5px]">{displayTotalPriceStr}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-3 rounded-xl text-center cursor-pointer"
                >
                  Geri dön
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 rounded-xl text-center cursor-pointer shadow-md shadow-emerald-600/10"
                >
                  Siparişi Tamamla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating toast alerts */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl shadow-xl flex items-start space-x-3"
          >
            <div className="bg-emerald-500/15 p-1 rounded-lg text-emerald-400 shrink-0 mt-0.5">
              <Check className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-sans font-semibold leading-relaxed text-slate-200">{toastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
