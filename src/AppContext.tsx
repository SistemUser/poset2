import React, { createContext, useContext, useState, useEffect } from "react";
import { AppSettings, DbProduct } from "./types";
import { getApiEndpoint } from "./utils/urlHelper";

interface AppContextType {
  settings: AppSettings;
  products: DbProduct[];
  categories: any[];
  usdRate: number;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  setProducts: React.Dispatch<React.SetStateAction<DbProduct[]>>;
  setCategories: React.Dispatch<React.SetStateAction<any[]>>;
  refreshSettings: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<boolean>;
  getTLPrice: (birimFiyati: number, paraBirimi?: string) => number;
  formatTL: (birimFiyati: number, paraBirimi?: string) => string;
}

const defaultSettings: AppSettings = {
  usd_try_rate: 35.0,
  rate_mode: "manual",
  collect_api_key: "",
  last_updated: ""
};

const defaultCategories = [
  "E-TİCARET VE KARGO AMBALAJLARI",
  "PLASTİK POŞETLER",
  "KAĞIT VE KARTON ÇANTALAR",
  "BEZ VE TELA ÇANTALAR",
  "KORUYUCU VE ENDÜSTRİYEL AMBALAJ"
];

const AppContext = createContext<AppContextType>({
  settings: defaultSettings,
  products: [],
  categories: defaultCategories,
  usdRate: 35.0,
  setSettings: () => {},
  setProducts: () => {},
  setCategories: () => {},
  refreshSettings: async () => {},
  refreshProducts: async () => {},
  refreshCategories: async () => {},
  updateSettings: async () => false,
  getTLPrice: (p) => p,
  formatTL: () => "Fiyat Alınız"
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize settings from localStorage if present
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem("poset_app_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.usd_try_rate === "number") {
          return parsed;
        }
      }
    } catch (e) {}
    return defaultSettings;
  });

  const mapProductObject = (p: any): DbProduct => {
    const rawPrice = p.birim_fiyat ?? p.birim_fiyati ?? p.base_price ?? 0;
    const price = typeof rawPrice === "number" ? rawPrice : (parseFloat(String(rawPrice).replace(',', '.')) || 0);
    const isQuote = p.fiyat_aliniz === true || p.is_quote_only === true || price <= 0;
    const unitVal = p.satis_sekli || p.unit || "Adet";
    const allowCustom = p.allow_custom_dimensions !== false && p.allow_custom_size !== false;

    return {
      ...p,
      birim_fiyat: price,
      birim_fiyati: price,
      base_price: price,
      fiyat_aliniz: isQuote,
      is_quote_only: isQuote,
      satis_sekli: unitVal,
      unit: unitVal,
      allow_custom_dimensions: allowCustom,
      allow_custom_size: allowCustom
    };
  };

  // Initialize products from localStorage cache if present, otherwise []
  const [products, setProducts] = useState<DbProduct[]>(() => {
    try {
      const saved = localStorage.getItem("poset_app_products");
      if (saved) {
        const parsed: DbProduct[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(mapProductObject);
        }
      }
    } catch (e) {}
    return [];
  });

  // Initialize categories from localStorage if present
  const [categories, setCategories] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("poset_app_categories");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
    return defaultCategories;
  });

  // Save settings to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem("poset_app_settings", JSON.stringify(settings));
    } catch (e) {}
  }, [settings]);

  // Save products to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem("poset_app_products", JSON.stringify(products));
    } catch (e) {}
  }, [products]);

  // Save categories to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem("poset_app_categories", JSON.stringify(categories));
    } catch (e) {}
  }, [categories]);

  const refreshSettings = async () => {
    const urls = [
      getApiEndpoint(`api/admin/settings?t=${Date.now()}`),
      getApiEndpoint(`api/settings?t=${Date.now()}`)
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.usd_try_rate === "number") {
            setSettings(data);
            try { localStorage.setItem("poset_app_settings", JSON.stringify(data)); } catch (e) {}
            return;
          }
        }
      } catch (err) {
        console.warn("Could not fetch settings from API candidate:", err);
      }
    }
  };

  const refreshProducts = async () => {
    const candidateUrls = [
      getApiEndpoint("api/products"),
      getApiEndpoint("api/api.php?action=products"),
      getApiEndpoint("api/admin.php?action=products"),
      getApiEndpoint("data/products.json"),
      "/data/products.json"
    ];

    for (const url of candidateUrls) {
      try {
        const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
        });
        if (res.ok) {
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("application/json") || url.includes("products")) {
            const data = await res.json();
            const list = Array.isArray(data) ? data : (data.products || data.data || []);
            if (Array.isArray(list) && list.length > 0) {
              const formatted = list.map(mapProductObject);
              setProducts(formatted);
              try { localStorage.setItem("poset_app_products", JSON.stringify(formatted)); } catch (e) {}
              return;
            }
          }
        }
      } catch (err) {
        console.warn(`Products fetch URL failed (${url}):`, err);
      }
    }
  };

  const refreshCategories = async () => {
    const urls = [
      getApiEndpoint(`api/admin/categories?t=${Date.now()}`),
      getApiEndpoint(`api/categories?t=${Date.now()}`)
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setCategories(data);
            try { localStorage.setItem("poset_app_categories", JSON.stringify(data)); } catch (e) {}
            return;
          }
        }
      } catch (err) {
        console.warn("Could not fetch categories from API, keeping cached state:", err);
      }
    }
  };

  useEffect(() => {
    refreshSettings();
    refreshProducts();
    refreshCategories();

    // Auto refresh on custom sync events (from AdminPanel) and storage changes
    const handleSync = () => {
      refreshSettings();
      refreshProducts();
      refreshCategories();
    };

    window.addEventListener("poset:sync", handleSync);
    window.addEventListener("storage", handleSync);

    // Auto refresh settings & currency rate every 15 minutes
    const interval = setInterval(() => {
      refreshSettings();
      refreshProducts();
    }, 15 * 60 * 1000);

    return () => {
      window.removeEventListener("poset:sync", handleSync);
      window.removeEventListener("storage", handleSync);
      clearInterval(interval);
    };
  }, []);

  const updateSettings = async (newSettings: Partial<AppSettings>): Promise<boolean> => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    try {
      const res = await fetch(getApiEndpoint("api/admin/settings"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.settings) {
          setSettings(data.settings);
        }
        return true;
      }
    } catch (err) {
      console.error("Error updating settings:", err);
    }
    return true;
  };

  const getTLPrice = (birimFiyati: number, paraBirimi: string = "TL"): number => {
    if (paraBirimi === "USD") {
      return birimFiyati * (settings.usd_try_rate || 35.0);
    }
    return birimFiyati;
  };

  const formatTL = (birimFiyati: number, paraBirimi: string = "TL"): string => {
    if (!birimFiyati || birimFiyati <= 0) return "Fiyat Alınız";
    const rate = (settings as any)?.usd_try_rate ?? (settings as any)?.dolar_kuru ?? (settings as any)?.usd_try ?? 35.0;
    const tlPrice = paraBirimi === "USD" ? birimFiyati * rate : birimFiyati;
    return `₺${tlPrice.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <AppContext.Provider
      value={{
        settings,
        products,
        categories,
        usdRate: settings.usd_try_rate || 35.0,
        setSettings,
        setProducts,
        setCategories,
        refreshSettings,
        refreshProducts,
        refreshCategories,
        updateSettings,
        getTLPrice,
        formatTL
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppConfig = () => useContext(AppContext);
