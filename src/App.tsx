import React, { useState } from "react";
import Header from "./components/Header";
import HomeTab from "./components/HomeTab";
import CatalogTab from "./components/CatalogTab";
import AssistantTab from "./components/AssistantTab";
import GuideTab from "./components/GuideTab";
import AboutTab from "./components/AboutTab";
import ReferencesTab from "./components/ReferencesTab";
import ContactTab from "./components/ContactTab";
import AdminPanel from "./components/AdminPanel";
import Footer from "./components/Footer";
import { AppProvider } from "./AppContext";
import { QuoteProvider, useQuote } from "./context/QuoteContext";
import { Product, QuoteSpec } from "./types";
import { getSubfolderPrefix } from "./utils/urlHelper";
import { X, Sparkles, ShoppingBag, Trash } from "lucide-react";
import { motion } from "motion/react";

export type TabType = "home" | "catalog" | "assistant" | "admin" | "guide" | "about" | "references" | "contact";

const VALID_TABS: TabType[] = ["home", "catalog", "assistant", "admin", "guide", "about", "references", "contact"];

const TAB_HASH_MAP: Record<string, string> = {
  home: '',
  catalog: 'urunler',
  guide: 'rehber',
  about: 'kurumsal',
  references: 'referanslar',
  contact: 'iletisim',
  assistant: 'teklif',
  admin: 'yonetim'
};

const HASH_TO_TAB: Record<string, string> = {
  '': 'home',
  'urunler': 'catalog',
  'catalog': 'catalog',
  'rehber': 'guide',
  'guide': 'guide',
  'kurumsal': 'about',
  'about': 'about',
  'referanslar': 'references',
  'references': 'references',
  'iletisim': 'contact',
  'contact': 'contact',
  'teklif': 'assistant',
  'assistant': 'assistant',
  'yonetim': 'admin',
  'admin': 'admin'
};

export default function App() {
  const getInitialTab = (): TabType => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.replace('#', '').trim().toLowerCase();

      if (path === '/yonetim' || path === '/admin' || hash === 'yonetim' || hash === 'admin') {
        return 'admin';
      }
      if (hash && HASH_TO_TAB[hash]) {
        return HASH_TO_TAB[hash] as TabType;
      }
      const saved = (localStorage.getItem("poset_active_tab") || sessionStorage.getItem("poset_active_tab")) as TabType;
      if (saved && saved !== 'admin' && VALID_TABS.includes(saved)) {
        return saved;
      }
    }
    return "home";
  };

  const [currentTab, setTab] = useState<TabType>(getInitialTab);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState<string>("");
  const [quotationList, setQuotationList] = useState<Product[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeInitialPrompt, setActiveInitialPrompt] = useState<string | null>(null);

  const handleCatalogSearch = (query: string) => {
    setCatalogSearchQuery(query);
    if (currentTab !== "catalog") {
      handleSetTab("catalog");
    }
  };

  const handleSetTab = (tab: TabType, categoryKey?: string | null) => {
    setTab(tab);
    if (categoryKey !== undefined) {
      setSelectedCategoryKey(categoryKey);
    } else if (tab === "catalog") {
      setSelectedCategoryKey(null);
    }

    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(new CustomEvent('poset:sync'));
      } catch (e) {}

      localStorage.setItem("poset_active_tab", tab);
      sessionStorage.setItem("poset_active_tab", tab);
      
      const hash = TAB_HASH_MAP[tab] || '';
      const cleanUrl = hash ? `/#${hash}` : '/';
      
      try {
        window.history.replaceState(null, '', cleanUrl);
      } catch (e) {
        console.error("History replaceState failed:", e);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname.toLowerCase();
      const rawHash = window.location.hash.replace('#', '').trim().toLowerCase();

      // Eğer /yonetim veya /admin ise doğrudan AdminPanel'i aç ve köke yönlendirme YAPMA:
      if (path === '/yonetim' || path === '/admin') {
        setTab('admin');
        return;
      }

      // Sadece bozuk tekrarlı dizinler (/rehber/rehber gibi) varsa köke çek:
      if (path !== '/' && path !== '/yonetim' && path !== '/admin') {
        const savedTab = (localStorage.getItem('poset_active_tab') || sessionStorage.getItem('poset_active_tab') || 'home') as TabType;
        const targetTab = HASH_TO_TAB[rawHash] || savedTab || 'home';
        const hash = TAB_HASH_MAP[targetTab] || '';
        const cleanUrl = hash ? `/#${hash}` : '/';
        try {
          window.history.replaceState(null, '', cleanUrl);
        } catch (e) {
          console.error("ReplaceState error:", e);
        }
      }

      if (rawHash && HASH_TO_TAB[rawHash]) {
        setTab(HASH_TO_TAB[rawHash] as TabType);
      }

      const handleLocationChange = () => {
        const currentHash = window.location.hash.replace('#', '').trim().toLowerCase();
        if (HASH_TO_TAB[currentHash]) {
          const mappedTab = HASH_TO_TAB[currentHash] as TabType;
          setTab(mappedTab);
          localStorage.setItem('poset_active_tab', mappedTab);
          sessionStorage.setItem('poset_active_tab', mappedTab);
        }
      };

      window.addEventListener("hashchange", handleLocationChange);
      window.addEventListener("popstate", handleLocationChange);
      return () => {
        window.removeEventListener("hashchange", handleLocationChange);
        window.removeEventListener("popstate", handleLocationChange);
      };
    }
  }, []);

  // Home search bar triggers prompt
  const handleAnalyzePromptFromHero = (prompt: string) => {
    setActiveInitialPrompt(prompt);
    setTab("assistant");
  };

  // Catalog customize button triggers prompt
  const handleCustomizeFromCatalog = (prompt: string) => {
    setActiveInitialPrompt(prompt);
    setTab("assistant");
  };

  const handleAddToQuotationList = (product: Product) => {
    setQuotationList(prev => {
      // Avoid raw duplicates
      if (prev.some(p => p.id === product.id)) return prev;
      return [...prev, product];
    });
  };

  const handleRemoveFromQuotationList = (prodId: string) => {
    setQuotationList(prev => prev.filter(p => p.id !== prodId));
  };

  const handleConsolidatedQuoteRequest = () => {
    setIsCartOpen(false);
    const itemNames = quotationList.map(p => p.name).join(", ");
    const consolidatedPrompt = `Seçtiğim şu ürün grubu için toplu bir teknik şartname ve fiyat teklifi oluşturur musunuz: ${itemNames}. Her birinin özellikleri ve toplu üretim süreçlerindeki avantajları nelerdir?`;
    handleCustomizeFromCatalog(consolidatedPrompt);
  };

  const handlePlaceOrder = (spec: QuoteSpec) => {
    console.log("Order placed for specification:", spec);
  };

  return (
    <AppProvider>
      <QuoteProvider>
        <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between selection:bg-indigo-600 selection:text-white" id="main-application-container">
        {/* Universal header navigation (Hidden on Admin Panel) */}
        {currentTab !== "admin" && (
          <Header
            currentTab={currentTab}
            setTab={handleSetTab}
            searchQuery={catalogSearchQuery}
            onSearch={handleCatalogSearch}
          />
        )}

        {/* Main interactive tabs layout switcher */}
        <main className="flex-grow">
          {currentTab === "home" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <HomeTab
                onAnalyzePrompt={handleAnalyzePromptFromHero}
                setTab={handleSetTab}
              />
            </motion.div>
          )}

          {currentTab === "catalog" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <CatalogTab
                onAddToQuoteList={handleAddToQuotationList}
                onCustomizeWithAI={handleCustomizeFromCatalog}
                setTab={handleSetTab}
                selectedCategory={selectedCategoryKey}
                searchQuery={catalogSearchQuery}
                onSearchChange={setCatalogSearchQuery}
              />
            </motion.div>
          )}

          {currentTab === "guide" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <GuideTab setTab={handleSetTab} />
            </motion.div>
          )}

          {currentTab === "about" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <AboutTab setTab={handleSetTab} />
            </motion.div>
          )}

          {currentTab === "references" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <ReferencesTab setTab={handleSetTab} />
            </motion.div>
          )}

          {currentTab === "contact" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <ContactTab setTab={handleSetTab} />
            </motion.div>
          )}

          {currentTab === "assistant" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <AssistantTab
                initialPrompt={activeInitialPrompt}
                onClearInitialPrompt={() => setActiveInitialPrompt(null)}
                onPlaceOrder={handlePlaceOrder}
              />
            </motion.div>
          )}

          {currentTab === "admin" && (
            <div className="max-w-7xl mx-auto px-4 py-8">
              <AdminPanel
                onBackToSite={() => {
                  handleSetTab("home");
                }}
              />
            </div>
          )}
        </main>

        {/* Corporate B2B Footer (Hidden on Admin Panel) */}
        {currentTab !== "admin" && (
          <Footer setTab={handleSetTab} setActiveTab={handleSetTab} />
        )}

        {/* Floating Action WhatsApp Support Badge - Positioned alt-sağ corner exactly as in the reference screenshot */}
        <FloatingWhatsAppBadge />
        </div>
      </QuoteProvider>
    </AppProvider>
  );
}

const FloatingWhatsAppBadge: React.FC = () => {
  const { rfqSettings } = useQuote();
  const phone = (rfqSettings?.whatsappNumber || "905424086160").replace(/[^0-9]/g, "");

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-center space-y-3" id="floating-support-container">
      {/* Soft greeting bubble next to the icon tooltipped */}
      <div className="hidden sm:block absolute right-16 bottom-2 whitespace-nowrap bg-white border border-slate-100 text-[11.5px] font-bold text-slate-700 py-1.5 px-3.5 rounded-full shadow-lg pointer-events-auto hover:opacity-0 transition-all duration-300 ease-in-out cursor-pointer select-none animate-bounce" title="Altındaki yazıları okumak için fareyle üzerine gelebilirsiniz">
        <span className="text-[#25D366]">●</span> Müşteri Destek Grubu
      </div>

      {/* WhatsApp Button Wrapper to align absolute under-glow waves */}
      <div className="relative">
        {/* Breathing soft glow halo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-[#25D366]/40 blur-md animate-pulse pointer-events-none -z-10" />
        
        {/* Continuous expanding ripple wave ring */}
        <div className="absolute top-0 left-0 w-14 h-14 rounded-full bg-[#25D366]/50 animate-ping pointer-events-none -z-10" style={{ animationDuration: '2.5s' }} />
        
        <a 
          href={`https://wa.me/${phone}`} 
          target="_blank" 
          rel="noopener noreferrer" 
          id="whatsapp-fixed-trigger"
          className="w-14 h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-xl shadow-emerald-600/30 transition-transform duration-300 hover:scale-110 active:scale-95 cursor-pointer relative z-10"
          title="Bizimle WhatsApp Üzerinden İletişime Geçin"
        >
          {/* Inner Classic WhatsApp Logo in white */}
          <svg 
            className="w-7.5 h-7.5 fill-current" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12.004 2C6.48 2 2 6.48 2 12C2 13.9 2.53 15.68 3.45 17.2L2 22L6.96 20.65C8.42 21.52 10.13 22 12.004 22C17.528 22 22.008 17.52 22.008 12C22.008 6.48 17.528 2 12.004 2ZM17.144 16.59C16.924 17.21 16.034 17.75 15.394 17.9C14.864 18.03 14.184 18.12 11.834 17.15C8.834 15.91 6.894 12.87 6.744 12.67C6.594 12.47 5.484 11 5.484 9.48C5.484 7.96 6.254 7.22 6.544 6.92C6.774 6.69 7.154 6.58 7.514 6.58C7.634 6.58 7.744 6.59 7.844 6.59C8.134 6.6 8.284 6.62 8.474 7.07C8.714 7.65 9.304 9.08 9.374 9.23C9.444 9.38 9.514 9.58 9.414 9.78C9.314 9.98 9.234 10.08 9.084 10.25C8.934 10.42 8.794 10.55 8.644 10.73C8.504 10.89 8.344 11.06 8.524 11.37C8.704 11.67 9.324 12.69 10.244 13.51C11.434 14.57 12.414 14.91 12.734 15.05C13.054 15.19 13.244 15.16 13.424 14.95C13.604 14.74 14.214 14.03 14.434 13.72C14.654 13.41 14.874 13.46 15.174 13.57C15.474 13.68 17.074 14.47 17.404 14.63C17.734 14.79 17.954 14.87 18.034 15.01C18.114 15.15 18.114 15.82 17.894 16.44L17.144 16.59Z"/>
          </svg>
        </a>
      </div>
    </div>
  );
};
