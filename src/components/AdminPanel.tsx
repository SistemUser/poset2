import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  DollarSign, RefreshCw, Plus, Edit, Trash2, Search, Filter, 
  Save, Check, AlertCircle, ArrowLeft, Key, Clock, Package, 
  ShieldCheck, Tag, ChevronLeft, ChevronRight, X, Lock, User, 
  Eye, EyeOff, LogOut, ChevronDown, ChevronUp, Layers, BookOpen,
  Globe, Bot, Sparkles, CheckCircle2, Menu, Phone, Mail, Server, Send
} from "lucide-react";
import { AppSettings, DbProduct, CategorySchema, Article, RfqSettings, DEFAULT_RFQ_SETTINGS, SmtpSettings, DEFAULT_SMTP_SETTINGS } from "../types";
import { useAppConfig } from "../AppContext";
import { getApiEndpoint } from "../utils/urlHelper";
import { 
  isCustomOnlyProduct, 
  getParentProductInfo, 
  createMasterCustomRecord 
} from "../utils/customProductHelper";

interface AdminPanelProps {
  onBackToSite?: () => void;
  onSettingsUpdated?: (settings: AppSettings) => void;
}

export interface MultiplierTemplate {
  id: string;
  title: string;
  multiplierString: string;
  description: string;
}

export const DEFAULT_CATEGORY_SCHEMAS: CategorySchema[] = [
  {
    id: "cat-1",
    name: "E-TİCARET VE KARGO AMBALAJLARI",
    units: ["Adet"],
    thickness: "Mikron",
    fields: { kargo_bant: true, irsaliye_cebi: true, kulp: false, koruk: true, baski: true }
  },
  {
    id: "cat-2",
    name: "PLASTİK POŞETLER",
    units: ["Kg", "Adet"],
    thickness: "Mikron",
    fields: { kargo_bant: false, irsaliye_cebi: false, kulp: true, koruk: true, baski: true }
  },
  {
    id: "cat-3",
    name: "KAĞIT VE KARTON ÇANTALAR",
    units: ["Adet", "Kg"],
    thickness: "Gr/m²",
    fields: { kargo_bant: false, irsaliye_cebi: false, kulp: true, koruk: true, baski: true }
  },
  {
    id: "cat-4",
    name: "BEZ VE TELA ÇANTALAR",
    units: ["Adet"],
    thickness: "Gr/m²",
    fields: { kargo_bant: false, irsaliye_cebi: false, kulp: true, koruk: false, baski: true }
  },
  {
    id: "cat-5",
    name: "KORUYUCU VE ENDÜSTRİYEL AMBALAJ",
    units: ["Adet (Rulo)", "Kg (Bobin)"],
    thickness: "Mikron",
    fields: { kargo_bant: false, irsaliye_cebi: false, kulp: false, koruk: false, baski: false }
  }
];

export interface CategoryRule {
  showKargoBant?: boolean;
  showIrsaliyeCebi?: boolean;
  showKulpTipi?: boolean;
  showKoruk?: boolean;
  kulpOptions?: string[];
  satisSekliOptions?: string[];
  defaultSatisSekli?: string;
  isSatisSekliLocked?: boolean;
}

export const CATEGORY_FORM_RULES: Record<string, CategoryRule> = {
  "E-TİCARET VE KARGO AMBALAJLARI": {
    showKargoBant: true,
    showIrsaliyeCebi: true,
    showKulpTipi: false,
    showKoruk: true,
    satisSekliOptions: ["Adet"],
    defaultSatisSekli: "Adet",
    isSatisSekliLocked: true
  },
  "PLASTİK POŞETLER": {
    showKargoBant: false,
    showIrsaliyeCebi: false,
    showKulpTipi: true,
    showKoruk: true,
    kulpOptions: ["El Geçme (Punch)", "Takviyeli El Geçme", "Yumuşak Sap (Soft)", "Atlet Tipi (Saplı)", "Yok"],
    satisSekliOptions: ["Kg", "Adet", "Paket"],
    defaultSatisSekli: "Kg"
  },
  "KAĞIT VE KARTON ÇANTALAR": {
    showKargoBant: false,
    showIrsaliyeCebi: false,
    showKulpTipi: true,
    showKoruk: true,
    kulpOptions: ["Büküm Kağıt Sap", "İpli Sap (Kordon)", "Yok"],
    satisSekliOptions: ["Adet", "Paket"],
    defaultSatisSekli: "Adet"
  },
  "BEZ VE TELA ÇANTALAR": {
    showKargoBant: false,
    showIrsaliyeCebi: false,
    showKulpTipi: true,
    showKoruk: false,
    kulpOptions: ["Tela Saplı", "Pamuk Omuz Sapı"],
    satisSekliOptions: ["Adet"],
    defaultSatisSekli: "Adet",
    isSatisSekliLocked: true
  },
  "KORUYUCU VE ENDÜSTRİYEL AMBALAJ": {
    showKargoBant: false,
    showIrsaliyeCebi: false,
    showKulpTipi: false,
    showKoruk: false,
    satisSekliOptions: ["Adet (Rulo)", "Kg (Bobin)"],
    defaultSatisSekli: "Adet (Rulo)"
  }
};

export const DEFAULT_CATEGORY_RULE: CategoryRule = {
  showKargoBant: false,
  showIrsaliyeCebi: false,
  showKulpTipi: true,
  showKoruk: true,
  kulpOptions: ["Yok", "El Geçme (Punch)", "Saplı"],
  satisSekliOptions: ["Adet", "Kg", "Paket", "Rulo", "Koli"],
  defaultSatisSekli: "Adet"
};

export default function AdminPanel({ onBackToSite, onSettingsUpdated }: AdminPanelProps) {
  const { 
    settings, 
    products, 
    categories,
    setSettings, 
    setProducts, 
    setCategories,
    refreshProducts: syncGlobalProducts, 
    refreshSettings: syncGlobalSettings,
    refreshCategories: syncGlobalCategories
  } = useAppConfig();

  const setGlobalSettings = setSettings;
  const setGlobalProducts = setProducts;
  const setGlobalCategories = setCategories;

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem("poset_admin_auth") === "true";
  });
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Edit settings form state
  const [usdRateInput, setUsdRateInput] = useState<string>(() => String((settings as any)?.usd_try_rate ?? (settings as any)?.dolar_kuru ?? (settings as any)?.usd_try ?? 35.0));
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => (settings.collect_api_key || "").replace(/^apikey\s+/i, ''));
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isRefreshingRate, setIsRefreshingRate] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Category Management State & Modal
  const [editingCategoryObj, setEditingCategoryObj] = useState<CategorySchema | null>(null);
  const [categoryFormData, setCategoryFormData] = useState<Partial<CategorySchema>>({});
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isCategoriesCollapsed, setIsCategoriesCollapsed] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");

  // Multiplier Templates State
  const [multiplierTemplates, setMultiplierTemplates] = useState<MultiplierTemplate[]>([]);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MultiplierTemplate | null>(null);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateValue, setTemplateValue] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Article Management (Ambalaj Rehberi) State
  const [articles, setArticles] = useState<Article[]>([]);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [articleFormData, setArticleFormData] = useState<Partial<Article>>({});
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [isSavingArticle, setIsSavingArticle] = useState(false);
  const [isArticlesCollapsed, setIsArticlesCollapsed] = useState(false);
  const [articleSearchQuery, setArticleSearchQuery] = useState("");
  // Admin Sub-Tab Navigation State
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<"products" | "currency" | "categories" | "multipliers" | "articles" | "security">(() => {
    const saved = localStorage.getItem("poset_admin_subtab");
    if (saved && ["currency", "products", "categories", "multipliers", "articles", "security"].includes(saved)) {
      return saved as any;
    }
    return "currency";
  });

  const handleSubTabChange = (tab: "products" | "currency" | "categories" | "multipliers" | "articles" | "security") => {
    setActiveAdminSubTab(tab);
    localStorage.setItem("poset_admin_subtab", tab);
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Security & Credentials State
  const [securityUsername, setSecurityUsername] = useState<string>(() => localStorage.getItem("poset_admin_username") || "poset");
  const [securityCurrentPassword, setSecurityCurrentPassword] = useState("");
  const [securityNewPassword, setSecurityNewPassword] = useState("");
  const [securityNewPasswordConfirm, setSecurityNewPasswordConfirm] = useState("");
  const [showSecurityPasswords, setShowSecurityPasswords] = useState(false);
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);

  // Teklif Formu & İletişim Ayarları State
  const [rfqSettings, setRfqSettings] = useState<RfqSettings>(() => {
    try {
      const saved = localStorage.getItem("poset_rfq_settings");
      if (saved) return { ...DEFAULT_RFQ_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {}
    return DEFAULT_RFQ_SETTINGS;
  });
  const [isSavingRfq, setIsSavingRfq] = useState(false);

  useEffect(() => {
    const fetchRfq = async () => {
      const endpoints = [
        getApiEndpoint("api/admin.php?action=rfq"),
        "/api/admin.php?action=rfq",
        getApiEndpoint("api/admin/rfq"),
        "/api/admin/rfq",
        getApiEndpoint("api/api.php?action=rfq"),
        "/api/api.php?action=rfq"
      ];
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep);
          const text = await res.text();
          if (text && (text.trim().startsWith("{") || text.trim().startsWith("["))) {
            const data = JSON.parse(text);
            if (data?.success && data?.rfq) {
              setRfqSettings(prev => ({ ...prev, ...data.rfq }));
              localStorage.setItem("poset_rfq_settings", JSON.stringify({ ...DEFAULT_RFQ_SETTINGS, ...data.rfq }));
              break;
            }
          }
        } catch (e) {}
      }
    };
    fetchRfq();
  }, []);

  const handleSaveRfqSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRfq(true);
    try {
      localStorage.setItem("poset_rfq_settings", JSON.stringify(rfqSettings));
      window.dispatchEvent(new Event("rfq_settings_updated"));

      const endpoints = [
        getApiEndpoint("api/admin.php?action=rfq"),
        "/api/admin.php?action=rfq",
        getApiEndpoint("api/admin/rfq"),
        "/api/admin/rfq",
        getApiEndpoint("api/api.php?action=rfq"),
        "/api/api.php?action=rfq"
      ];
      for (const ep of endpoints) {
        try {
          await fetch(ep, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "rfq", ...rfqSettings })
          });
        } catch (e) {}
      }
      triggerToast("✓ Teklif Formu & İletişim Ayarları başarıyla kaydedildi.");
    } catch (err) {
      alert("Ayarlar kaydedilirken hata oluştu.");
    } finally {
      setIsSavingRfq(false);
    }
  };

  // E-Posta & SMTP Sunucu Ayarları State
  const [smtpSettings, setSmtpSettings] = useState<SmtpSettings>(() => {
    try {
      const saved = localStorage.getItem("poset_smtp_settings");
      if (saved) return { ...DEFAULT_SMTP_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {}
    return DEFAULT_SMTP_SETTINGS;
  });
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const fetchSmtp = async () => {
      const endpoints = [
        getApiEndpoint("api/admin.php?action=smtp"),
        "/api/admin.php?action=smtp",
        getApiEndpoint("api/admin/smtp"),
        "/api/admin/smtp",
        getApiEndpoint("api/api.php?action=smtp"),
        "/api/api.php?action=smtp"
      ];
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep);
          const text = await res.text();
          if (text && (text.trim().startsWith("{") || text.trim().startsWith("["))) {
            const data = JSON.parse(text);
            if (data?.success && data?.smtp) {
              setSmtpSettings(prev => ({ ...prev, ...data.smtp }));
              localStorage.setItem("poset_smtp_settings", JSON.stringify({ ...DEFAULT_SMTP_SETTINGS, ...data.smtp }));
              break;
            }
          }
        } catch (e) {}
      }
    };
    fetchSmtp();
  }, []);

  const handleSaveSmtpSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSmtp(true);
    setSmtpTestResult(null);
    try {
      localStorage.setItem("poset_smtp_settings", JSON.stringify(smtpSettings));
      const endpoints = [
        getApiEndpoint("api/admin.php?action=smtp"),
        "/api/admin.php?action=smtp",
        getApiEndpoint("api/admin/smtp"),
        "/api/admin/smtp",
        getApiEndpoint("api/api.php?action=smtp"),
        "/api/api.php?action=smtp"
      ];
      let savedOnServer = false;
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "smtp", ...smtpSettings })
          });
          const text = await res.text();
          if (text && (text.trim().startsWith("{") || text.trim().startsWith("["))) {
            const data = JSON.parse(text);
            if (data?.success) {
              savedOnServer = true;
              break;
            }
          }
        } catch (e) {}
      }
      if (savedOnServer) {
        triggerToast("✓ Mail sunucu (SMTP) ayarları başarıyla kaydedildi.");
      } else {
        triggerToast("✓ Mail ayarları yerel olarak kaydedildi.");
      }
    } catch (err) {
      triggerToast("✓ Mail ayarları kaydedildi.");
    } finally {
      setIsSavingSmtp(false);
    }
  };

  const handleTestSmtpConnection = async () => {
    setIsTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const targetTestEmail = testEmailAddress.trim() || rfqSettings.notificationEmail || smtpSettings.fromEmail || smtpSettings.user;
      const payload = JSON.stringify({
        action: "test-smtp",
        ...smtpSettings,
        testEmail: targetTestEmail
      });

      const endpoints = [
        getApiEndpoint("api/admin.php?action=test-smtp"),
        "/api/admin.php?action=test-smtp",
        getApiEndpoint("api/admin/test-smtp"),
        "/api/admin/test-smtp",
        getApiEndpoint("api/api.php?action=test-smtp"),
        "/api/api.php?action=test-smtp"
      ];

      let data: any = null;
      let lastErrorMessage = "";

      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload
          });
          const text = await res.text();
          if (text && (text.trim().startsWith("{") || text.trim().startsWith("["))) {
            const parsed = JSON.parse(text);
            data = parsed;
            if (parsed?.success) {
              break;
            } else if (parsed?.error && parsed.error.includes("Geçersiz işlem")) {
              // Try next endpoint if this one returned "Geçersiz işlem"
              continue;
            } else {
              break;
            }
          } else if (text && text.length > 0) {
            lastErrorMessage = text.slice(0, 150);
          }
        } catch (err: any) {
          lastErrorMessage = err?.message || "";
        }
      }

      if (!data) {
        setSmtpTestResult({
          success: false,
          message: `✕ Sunucu Yanıtı Alınamadı: ${lastErrorMessage || "Sunucuya erişilemiyor veya PHP/Node servisi yanıt vermiyor."}`
        });
        return;
      }

      if (data?.success) {
        setSmtpTestResult({
          success: true,
          message: data.message || `Test e-postası ${targetTestEmail} adresine başarıyla gönderildi!`
        });
        triggerToast("✓ SMTP Bağlantısı Başarılı!");
      } else {
        const errorDetail = data?.message || data?.error || lastErrorMessage || "Sunucuya bağlanılamadı.";
        setSmtpTestResult({
          success: false,
          message: `✕ Bağlantı Hatası: ${errorDetail}`
        });
      }
    } catch (err: any) {
      setSmtpTestResult({
        success: false,
        message: `✕ Gönderim Hatası: ${err?.message || "Ağ bağlantı hatası oluştu."}`
      });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  // Table filters & Pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Product Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<DbProduct | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Delete modal state
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<DbProduct | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  // Form State containing all 23 parameters of DbProduct + birim_fiyati & para_birimi
  const defaultFormState: Partial<DbProduct> = {
    sira_no: 0,
    urun_kodu: "",
    urun_kategorisi: "E-TİCARET VE KARGO AMBALAJLARI",
    urun_adi: "",
    olculer: "30 x 40 + 5 (Kapak)",
    satis_sekli: "Adet",
    moq: "10.000",
    fiyat_carpanlari: "5k:1.00 / 10k:0.92 / 25k:0.85",
    hammadde_turu: "Co-Ex (LDPE)",
    kalinlik_seviyesi: "65 Mikron",
    baski_durumu: "Baskılı",
    koruk_detayi: "Yok",
    kulp_tipi: "Yok",
    baski_renk_yon: "2 + 0 (Ön Yüz)",
    klise_maliyeti: "İlk Siparişte Var",
    zemin_rengi: "Dışı Beyaz / İçi Siyah",
    kargo_bant_tipi: "Tek Bant (Kalıcı)",
    irsaliye_cebi_detay: "Yok",
    geridonusum_orani: "%30 Recycled",
    termin_suresi: "7-12 İş Günü",
    uyumlu_sektorler: "E-Ticaret, Lojistik, Tekstil",
    kullanim_amaci: "Güvenli ambalaj ve lojistik paketleme",
    stok_durumu: "Siparişle",
    birim_fiyati: 0,
    para_birimi: "TL"
  };

  const [formData, setFormData] = useState<Partial<DbProduct>>(defaultFormState);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch Settings, Products, Categories, Multiplier Templates and Articles on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchSettings();
      fetchProducts();
      fetchCategories();
      fetchMultiplierTemplates();
      fetchArticles();
    }
  }, [isAuthenticated]);

  const fetchArticles = async () => {
    const candidateUrls = [
      getApiEndpoint("api/articles"),
      getApiEndpoint("api/admin/articles"),
      getApiEndpoint("api/api.php?action=articles"),
      getApiEndpoint("api/admin.php?action=articles"),
      "/data/articles.json",
      "/api/data/articles.json"
    ];

    for (const url of candidateUrls) {
      try {
        const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, { cache: "no-store" });
        if (res.ok) {
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("application/json") || url.endsWith(".json")) {
            const data = await res.json();
            const list = Array.isArray(data) ? data : (data.articles || data.data || []);
            if (Array.isArray(list) && list.length > 0) {
              setArticles(list);
              return;
            }
          }
        }
      } catch (err) {
        console.warn(`Admin articles fetch failed (${url}):`, err);
      }
    }
  };



  const handleOpenAddArticleModal = () => {
    setEditingArticle(null);
    setArticleFormData({
      baslik: "",
      alt_baslik: "",
      kategori: "E-TİCARET VE KARGO AMBALAJLARI",
      ozet: "",
      icerik: "",
      related_product: "",
      gorsel_url: "",
      sss: [],
      okuma_suresi: "",
      tarih: new Date().toISOString().split('T')[0],
      seo: {
        meta_title: "",
        meta_description: "",
        keywords: [],
        geo_region: "Tüm Türkiye"
      },
      geo_ai: {
        quick_answer: "",
        key_takeaways: [""]
      }
    });
    setIsArticleModalOpen(true);
  };

  const handleOpenEditArticleModal = (art: Article) => {
    setEditingArticle(art);
    setArticleFormData({
      ...art,
      sss: Array.isArray(art.sss) ? [...art.sss] : [],
      seo: {
        meta_title: art.seo?.meta_title || "",
        meta_description: art.seo?.meta_description || "",
        keywords: Array.isArray(art.seo?.keywords) ? [...art.seo.keywords] : [],
        geo_region: art.seo?.geo_region || "Tüm Türkiye"
      },
      geo_ai: {
        quick_answer: art.geo_ai?.quick_answer || "",
        key_takeaways: Array.isArray(art.geo_ai?.key_takeaways) ? [...art.geo_ai.key_takeaways] : []
      }
    });
    setIsArticleModalOpen(true);
  };

  const handleAddSssItem = () => {
    setArticleFormData(prev => ({
      ...prev,
      sss: [...(prev.sss || []), { soru: "", cevap: "" }]
    }));
  };

  const handleRemoveSssItem = (index: number) => {
    setArticleFormData(prev => ({
      ...prev,
      sss: (prev.sss || []).filter((_, i) => i !== index)
    }));
  };

  const handleSssChange = (index: number, field: "soru" | "cevap", val: string) => {
    setArticleFormData(prev => {
      const nextSss = [...(prev.sss || [])];
      nextSss[index] = { ...nextSss[index], [field]: val };
      return { ...prev, sss: nextSss };
    });
  };

  const handleAddKeyTakeaway = () => {
    const current = articleFormData.geo_ai?.key_takeaways || [];
    if (current.length >= 4) return;
    setArticleFormData(prev => ({
      ...prev,
      geo_ai: {
        ...prev.geo_ai,
        key_takeaways: [...current, ""]
      }
    }));
  };

  const handleRemoveKeyTakeaway = (index: number) => {
    const current = (articleFormData.geo_ai?.key_takeaways || []).filter((_, i) => i !== index);
    setArticleFormData(prev => ({
      ...prev,
      geo_ai: {
        ...prev.geo_ai,
        key_takeaways: current
      }
    }));
  };

  const handleKeyTakeawayChange = (index: number, val: string) => {
    const current = [...(articleFormData.geo_ai?.key_takeaways || [])];
    current[index] = val;
    setArticleFormData(prev => ({
      ...prev,
      geo_ai: {
        ...prev.geo_ai,
        key_takeaways: current
      }
    }));
  };

  const handleSaveArticleModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleFormData.baslik || !articleFormData.baslik.trim()) {
      triggerToast("❌ Lütfen makale başlığını girin.");
      return;
    }

    setIsSavingArticle(true);
    const isEdit = !!editingArticle;

    try {
      const url = isEdit 
        ? getApiEndpoint(`api/admin/articles/${encodeURIComponent(editingArticle.id)}`)
        : getApiEndpoint("api/admin/articles");
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(articleFormData)
      });

      const data = await res.json();
      if (res.ok && (data.success || Array.isArray(data.articles))) {
        if (data.articles) {
          setArticles(data.articles);
        } else {
          await fetchArticles();
        }
        setIsArticleModalOpen(false);
        triggerToast(isEdit ? "✓ Makale başarıyla güncellendi." : "✓ Yeni makale başarıyla eklendi.");
      } else {
        triggerToast("❌ Makale kaydedilemedi: " + (data.error || "Bilinmeyen hata"));
      }
    } catch (err: any) {
      console.error("Article save error:", err);
      triggerToast("❌ Hata: " + (err.message || "Sunucu hatası"));
    } finally {
      setIsSavingArticle(false);
    }
  };

  const handleDeleteArticle = async (id: string, title: string) => {
    if (!window.confirm(`"${title}" makalesini silmek istediğinizden emin misiniz?`)) return;

    try {
      const res = await fetch(getApiEndpoint(`api/admin/articles/${encodeURIComponent(id)}`), {
        method: "DELETE"
      });
      if (res.ok) {
        const data = await res.json();
        if (data.articles) {
          setArticles(data.articles);
        } else {
          setArticles(prev => prev.filter(a => a.id !== id));
        }
        triggerToast(`✓ "${title}" makalesi silindi.`);
      }
    } catch (err) {
      triggerToast("❌ Makale silinirken hata oluştu.");
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(getApiEndpoint(`api/categories?t=${Date.now()}`), { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCategories(data);
        }
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const fetchMultiplierTemplates = async () => {
    try {
      const res = await fetch(getApiEndpoint("api/admin/multiplier-templates"));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setMultiplierTemplates(data);
        }
      }
    } catch (err) {
      console.error("Error fetching multiplier templates:", err);
    }
  };

  // Reset page when search or category filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const storedUser = localStorage.getItem("poset_admin_username") || "poset";
    const storedPass = localStorage.getItem("poset_admin_password") || "654321";

    if (usernameInput.trim() === storedUser && passwordInput.trim() === storedPass) {
      setIsAuthenticated(true);
      localStorage.setItem("poset_admin_auth", "true");
      setLoginError(null);
      triggerToast("✓ Yönetim paneline başarıyla giriş yapıldı.");
      syncGlobalSettings();
      syncGlobalProducts();
      syncGlobalCategories();
    } else {
      setLoginError("Hatalı kullanıcı adı veya şifre! Lütfen tekrar deneyin.");
    }
  };

  const handleSaveSecuritySettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSecurity(true);

    const storedPass = localStorage.getItem("poset_admin_password") || "654321";

    if (securityCurrentPassword.trim() !== storedPass) {
      triggerToast("❌ Mevcut şifrenizi hatalı girdiniz.");
      setIsSavingSecurity(false);
      return;
    }

    if (securityNewPassword || securityNewPasswordConfirm) {
      if (securityNewPassword !== securityNewPasswordConfirm) {
        triggerToast("❌ Yeni şifreler birbiriyle eşleşmiyor.");
        setIsSavingSecurity(false);
        return;
      }
      if (securityNewPassword.trim().length < 4) {
        triggerToast("❌ Yeni şifre en az 4 karakter olmalıdır.");
        setIsSavingSecurity(false);
        return;
      }
      localStorage.setItem("poset_admin_password", securityNewPassword.trim());
    }

    if (securityUsername.trim()) {
      localStorage.setItem("poset_admin_username", securityUsername.trim());
    }

    setSecurityCurrentPassword("");
    setSecurityNewPassword("");
    setSecurityNewPasswordConfirm("");
    setIsSavingSecurity(false);
    triggerToast("✓ Yönetici giriş bilgileri başarıyla güncellendi.");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("poset_admin_auth");
    setUsernameInput("");
    setPasswordInput("");
    triggerToast("Çıkış yapıldı.");
  };


  const fetchSettings = async () => {
    try {
      const res = await fetch(getApiEndpoint(`api/admin/settings?t=${Date.now()}`), { cache: "no-store" });
      if (res.ok) {
        const data: AppSettings = await res.json();
        setSettings(data);
        const rate = (data as any)?.usd_try_rate ?? (data as any)?.dolar_kuru ?? (data as any)?.usd_try ?? 35.0;
        setUsdRateInput(String(rate));
        setApiKeyInput((data.collect_api_key || "").replace(/^apikey\s+/i, ''));
        if (onSettingsUpdated) onSettingsUpdated(data);
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch(getApiEndpoint(`api/products?t=${Date.now()}`), { cache: "no-store" });
      if (res.ok) {
        const data: DbProduct[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const formatted = data.map((p: any) => {
            const rawPrice = p.birim_fiyat ?? p.birim_fiyati ?? 0;
            const price = typeof rawPrice === "number" ? rawPrice : (parseFloat(String(rawPrice).replace(',', '.')) || 0);
            return {
              ...p,
              birim_fiyat: price,
              birim_fiyati: price,
              fiyat_aliniz: p.fiyat_aliniz === true || price <= 0,
              isPremiumPrice: false
            };
          });
          setProducts(formatted);
        }
      }
    } catch (err) {
      console.error("Error fetching products, keeping memory fallback state:", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Clear browser cache & force sync with server database
  const handleClearCacheAndSync = async () => {
    try {
      localStorage.removeItem("poset_app_products");
      localStorage.removeItem("poset_app_categories");
      localStorage.removeItem("poset_app_settings");
      
      await syncGlobalSettings();
      await syncGlobalProducts();
      await syncGlobalCategories();
      await fetchProducts();

      triggerToast("✓ Tarayıcı önbelleği temizlendi ve veritabanı ile tam senkronizasyon sağlandı.");
    } catch (err) {
      console.error("Cache clear error:", err);
      triggerToast("⚠️ Önbellek temizlenirken bir hata oluştu.");
    }
  };

  // Save manual rate & API Key
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingSettings(true);

    const rateVal = parseFloat(usdRateInput.replace(",", "."));
    if (isNaN(rateVal) || rateVal <= 0) {
      triggerToast("❌ Lütfen geçerli bir USD/TRY kuru girin.");
      setIsSavingSettings(false);
      return;
    }

    const cleanToken = apiKeyInput.trim().replace(/^apikey\s+/i, '');
    const newSettings: AppSettings = {
      usd_try_rate: rateVal,
      rate_mode: "manual",
      collect_api_key: cleanToken,
      last_updated: new Date().toLocaleString("tr-TR")
    };

    // Update local React state & localStorage immediately
    setSettings(newSettings);
    setGlobalSettings(newSettings);
    try { localStorage.setItem("poset_app_settings", JSON.stringify(newSettings)); } catch (e) {}
    window.dispatchEvent(new CustomEvent('poset:sync'));
    if (onSettingsUpdated) onSettingsUpdated(newSettings);

    try {
      const res = await fetch(getApiEndpoint("api/admin/settings"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings)
      });

      if (res.ok) {
        const result = await res.json();
        if (result && result.settings) {
          setSettings(result.settings);
          setGlobalSettings(result.settings);
          try { localStorage.setItem("poset_app_settings", JSON.stringify(result.settings)); } catch (e) {}
        }
      }
    } catch (err) {
      console.warn("Server POST settings failed, saved to local state fallback:", err);
    } finally {
      setIsSavingSettings(false);
      triggerToast(`✓ Dolar kuru ₺${rateVal.toFixed(2)} olarak kaydedildi.`);
      if (syncGlobalSettings) syncGlobalSettings().catch(() => {});
    }
  };

  // Refresh rate live via CollectAPI & fallback APIs
  const handleRefreshRateCollectAPI = async () => {
    setIsRefreshingRate(true);
    try {
      const cleanToken = apiKeyInput.trim().replace(/^apikey\s+/i, '') || settings.collect_api_key || "5FzmRhNGQrHuKmbf03PmYU:0lXeOca14Soi4nfEc81MH1";
      let fetchedRate: number | null = null;
      let rateSource = "";

      // 1. Try backend server API first
      try {
        const res = await fetch(getApiEndpoint("api/admin/refresh-rate"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ collect_api_key: cleanToken })
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.fetched_rate) {
            fetchedRate = data.fetched_rate;
            rateSource = "CollectAPI (Sunucu)";
          }
        }
      } catch (e) {}

      // 2. Try direct CollectAPI HTTP fetch from browser
      if (!fetchedRate && cleanToken) {
        try {
          const cRes = await fetch("https://api.collectapi.com/economy/allCurrency", {
            method: "GET",
            headers: {
              "content-type": "application/json",
              "authorization": `apikey ${cleanToken}`
            }
          });
          if (cRes.ok) {
            const cData = await cRes.json();
            if (cData && cData.success && Array.isArray(cData.result)) {
              const usdItem = cData.result.find((i: any) => 
                (i.code && i.code.toUpperCase() === "USD") || 
                (i.name && i.name.toLowerCase().includes("dolar"))
              );
              if (usdItem) {
                const rawRate = usdItem.selling || usdItem.calculated || usdItem.rate;
                const parsed = parseFloat(String(rawRate).replace(",", "."));
                if (!isNaN(parsed) && parsed > 0) {
                  fetchedRate = parsed;
                  rateSource = "CollectAPI (Canlı)";
                }
              }
            }
          }
        } catch (e) {}
      }

      // 3. Fallback to free open.er-api.com
      if (!fetchedRate) {
        try {
          const openRes = await fetch("https://open.er-api.com/v6/latest/USD");
          if (openRes.ok) {
            const openData = await openRes.json();
            if (openData && openData.rates && openData.rates.TRY) {
              fetchedRate = parseFloat(openData.rates.TRY);
              rateSource = "Canlı Piyasa (USD/TRY)";
            }
          }
        } catch (e) {}
      }

      if (fetchedRate && fetchedRate > 0) {
        const roundedRate = Math.round(fetchedRate * 10000) / 10000;
        const newSettings: AppSettings = {
          ...settings,
          usd_try_rate: roundedRate,
          rate_mode: "api",
          last_updated: new Date().toLocaleString("tr-TR")
        };
        setSettings(newSettings);
        setUsdRateInput(String(roundedRate));
        if (onSettingsUpdated) onSettingsUpdated(newSettings);

        await fetch(getApiEndpoint("api/admin/settings"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newSettings)
        }).catch(() => {});

        triggerToast(`🚀 Güncel USD Kuru Alındı (${rateSource}): ₺${roundedRate.toFixed(4)}`);
      } else {
        triggerToast("❌ Canlı döviz kuru servisinden yanıt alınamadı.");
      }
    } catch (err) {
      triggerToast("❌ Döviz kuru güncelleme hatası.");
    } finally {
      setIsRefreshingRate(false);
    }
  };

  // Handle category change & auto-sync field defaults & available options based on CATEGORY_FORM_RULES
  const handleCategoryChange = (newCat: string) => {
    const rule = CATEGORY_FORM_RULES[newCat] || DEFAULT_CATEGORY_RULE;
    setFormData(prev => {
      let nextSatisSekli = prev.satis_sekli || "Adet";
      if (rule.isSatisSekliLocked) {
        nextSatisSekli = "Adet";
      } else if (rule.defaultSatisSekli && (!prev.satis_sekli || !(rule.satisSekliOptions || []).includes(prev.satis_sekli))) {
        nextSatisSekli = rule.defaultSatisSekli;
      }

      let nextKulpTipi = prev.kulp_tipi || "Yok";
      if (rule.showKulpTipi && rule.kulpOptions && rule.kulpOptions.length > 0) {
        if (!rule.kulpOptions.includes(nextKulpTipi)) {
          nextKulpTipi = rule.kulpOptions[0];
        }
      } else {
        nextKulpTipi = "Yok";
      }

      return {
        ...prev,
        urun_kategorisi: newCat,
        satis_sekli: nextSatisSekli,
        kulp_tipi: nextKulpTipi,
        kargo_bant_tipi: rule.showKargoBant ? (prev.kargo_bant_tipi || "Yok") : "Yok",
        irsaliye_cebi_detay: rule.showIrsaliyeCebi ? (prev.irsaliye_cebi_detay || "Yok") : "Yok",
        koruk_detayi: rule.showKoruk ? (prev.koruk_detayi || "Yok") : "Yok"
      };
    });
  };

  // Open Modal for New Product
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    const initialCat = categoriesList[0] || "E-TİCARET VE KARGO AMBALAJLARI";
    const rule = CATEGORY_FORM_RULES[initialCat] || DEFAULT_CATEGORY_RULE;

    setFormData({
      ...defaultFormState,
      urun_kodu: `PRD-${Date.now().toString().slice(-5)}`,
      urun_adi: "Yeni Baskılı Ambalaj Poşeti",
      urun_kategorisi: initialCat,
      satis_sekli: rule.defaultSatisSekli || "Adet",
      kulp_tipi: rule.showKulpTipi ? (rule.kulpOptions ? rule.kulpOptions[0] : "Yok") : "Yok",
      kargo_bant_tipi: rule.showKargoBant ? "Tek Bant (Kalıcı)" : "Yok",
      irsaliye_cebi_detay: rule.showIrsaliyeCebi ? "Yok" : "Yok",
      koruk_detayi: rule.showKoruk ? "Yok" : "Yok"
    });
    setModalOpen(true);
  };

  // Open Modal for Edit with pre-filled 23 parameters
  const handleOpenEditModal = (prod: DbProduct) => {
    setEditingProduct(prod);
    setFormData({ ...prod });
    setModalOpen(true);
  };

  // Open Modal to define a new standard variant for a custom-only or existing product group
  const handleOpenAddStandardVariant = (prod: DbProduct) => {
    setEditingProduct(null);
    const parentInfo = getParentProductInfo(prod.urun_adi, prod);
    const nextSku = `${parentInfo.prefix.toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const cat = parentInfo.parentCategory || prod.urun_kategorisi || prod.kategori || "Genel";
    const rule = CATEGORY_FORM_RULES[cat] || DEFAULT_CATEGORY_RULE;

    setFormData({
      ...defaultFormState,
      ...prod,
      urun_kodu: nextSku,
      sku: nextSku,
      urun_adi: parentInfo.parentTitle,
      urun_kategorisi: cat,
      kategori: cat,
      olculer: "25 x 35 cm",
      olcu: "25 x 35 cm",
      is_custom_only: false,
      fiyat_aliniz: false,
      birim_fiyat: 1.0,
      birim_fiyati: 1.0,
      stok_durumu: "Var",
      hammadde_turu: parentInfo.parentHammadde || prod.hammadde_turu,
      hammadde: parentInfo.parentHammadde || prod.hammadde,
      satis_sekli: parentInfo.parentSatisSekli || prod.satis_sekli || rule.defaultSatisSekli || "Adet",
      moq: parentInfo.parentMOQ || prod.moq || "1.000",
      fiyat_carpanlari: prod.fiyat_carpanlari || "5k:1.00 / 10k:0.92 / 25k:0.85"
    });
    setModalOpen(true);
  };

  // Save Product (Add or Edit)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.urun_adi) {
      triggerToast("❌ Lütfen ürün adını girin.");
      return;
    }
    if (!formData.urun_kodu) {
      triggerToast("❌ Lütfen ürün kodunu girin.");
      return;
    }

    setIsSavingProduct(true);
    const isEdit = !!editingProduct;

    const selectedCat = formData.urun_kategorisi || (categoriesList[0] || "E-TİCARET VE KARGO AMBALAJLARI");
    const catRule = CATEGORY_FORM_RULES[selectedCat] || DEFAULT_CATEGORY_RULE;
    const isBaskisiz = formData.baski_durumu === "Baskısız";

    const rawP = formData.birim_fiyat ?? formData.birim_fiyati ?? 0;
    const numPrice = typeof rawP === 'number' ? rawP : (parseFloat(String(rawP).replace(',', '.')) || 0);

    const finalProd: DbProduct = {
      ...defaultFormState,
      ...formData,
      urun_kodu: formData.urun_kodu,
      urun_adi: formData.urun_adi,
      urun_kategorisi: selectedCat,
      birim_fiyat: numPrice,
      birim_fiyati: numPrice,
      base_price: numPrice,
      is_quote_only: numPrice <= 0 || formData.fiyat_aliniz === true,
      fiyat_aliniz: numPrice <= 0 || formData.fiyat_aliniz === true,
      unit: catRule.isSatisSekliLocked ? "Adet" : (formData.satis_sekli || catRule.defaultSatisSekli || "Adet"),
      allow_custom_dimensions: formData.allow_custom_dimensions !== false,
      allow_custom_size: formData.allow_custom_dimensions !== false,
      isPremiumPrice: false,
      // Enforce strict schema persistence fallbacks
      kargo_bant_tipi: catRule.showKargoBant ? (formData.kargo_bant_tipi || "Yok") : "Yok",
      irsaliye_cebi_detay: catRule.showIrsaliyeCebi ? (formData.irsaliye_cebi_detay || "Yok") : "Yok",
      kulp_tipi: catRule.showKulpTipi ? (formData.kulp_tipi || (catRule.kulpOptions ? catRule.kulpOptions[0] : "Yok")) : "Yok",
      koruk_detayi: catRule.showKoruk ? (formData.koruk_detayi || "Yok") : "Yok",
      baski_renk_yon: isBaskisiz ? "0 + 0" : (formData.baski_renk_yon || "1 + 0"),
      klise_maliyeti: isBaskisiz ? "Muaf" : (formData.klise_maliyeti || "Yok"),
      satis_sekli: catRule.isSatisSekliLocked ? "Adet" : (formData.satis_sekli || catRule.defaultSatisSekli || "Adet"),
      moq: (formData.moq || "").replace(/[^0-9.]/g, "").trim() || "5.000"
    } as DbProduct;

    if (numPrice > 0 && !formData.fiyat_aliniz) {
      finalProd.fiyat_aliniz = false;
      finalProd.is_quote_only = false;
      finalProd.isPremiumPrice = false;
    }

    try {
      const url = isEdit 
        ? getApiEndpoint(`api/admin/products/${encodeURIComponent(editingProduct.urun_kodu)}`) 
        : getApiEndpoint("api/admin/products");
      const method = isEdit ? "PUT" : "POST";

      let res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalProd)
      });

      // Shared hosting fallback: if PUT is blocked (405, 403, etc.), try POST with _method: PUT
      if (!res.ok && isEdit && method === "PUT") {
        res = await fetch(getApiEndpoint("api/admin/products"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...finalProd, _method: "PUT" })
        });
      }

      // If still not ok, try direct PHP script endpoint fallback
      if (!res.ok) {
        res = await fetch(getApiEndpoint("api/admin.php?action=products"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...finalProd, _method: method })
        }).catch(() => res);
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || `Sunucu hatası: ${res.status}`);
      }

      const data = await res.json();
      const updated = data.product || finalProd;

      if (isEdit) {
        setProducts(prev => prev.map(p => p.urun_kodu === editingProduct.urun_kodu ? updated : p));
      } else {
        setProducts(prev => [updated, ...prev]);
      }

      // Immediately update AppContext global products & localStorage
      setGlobalProducts(prev => {
        const cleanCode = (updated.urun_kodu || "").trim().toLowerCase();
        const exists = prev.some(p => (p.urun_kodu || "").trim().toLowerCase() === cleanCode);
        const next = exists 
          ? prev.map(p => (p.urun_kodu || "").trim().toLowerCase() === cleanCode ? updated : p) 
          : [updated, ...prev];
        try { localStorage.setItem("poset_app_products", JSON.stringify(next)); } catch (e) {}
        return next;
      });

      window.dispatchEvent(new CustomEvent('poset:sync'));
      await syncGlobalProducts().catch(() => {});

      setModalOpen(false);
      triggerToast(isEdit ? "✓ Ürün ve fiyat başarıyla diske kaydedildi." : "✓ Yeni ürün eklendi ve diske kaydedildi.");
    } catch (err: any) {
      console.error("Product save error:", err);
      alert("Fiyat Kaydedilemedi: " + (err.message || "Sunucu hatası"));
      triggerToast("❌ Fiyat kaydedilemedi: " + (err.message || "Sunucu hatası"));
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async () => {
    if (!deleteConfirmProduct) return;
    setIsDeletingProduct(true);

    const targetCode = (deleteConfirmProduct.urun_kodu || (deleteConfirmProduct as any).sku || "").trim();
    const targetSira = deleteConfirmProduct.sira_no ? String(deleteConfirmProduct.sira_no).trim() : "";
    const productName = deleteConfirmProduct.urun_adi || targetCode;

    // Sadece özel ölçü ile üretilen master kayıt sistemden silinemez
    if (isCustomOnlyProduct(deleteConfirmProduct)) {
      triggerToast(`⚠️ "${productName}" grubu 'Sadece Özel İmalat' statüsündedir ve sistemden silinemez.`);
      setDeleteConfirmProduct(null);
      setIsDeletingProduct(false);
      return;
    }

    const parentInfo = getParentProductInfo(deleteConfirmProduct.urun_adi, deleteConfirmProduct);
    const cleanParentTitle = parentInfo.parentTitle.trim().toLowerCase();
    const cleanTargetCode = targetCode.toLowerCase();

    // Bu ürün grubuna ait başka varyant var mı kontrolü
    const remainingInGroup = products.filter(p => {
      const pCode = String(p.urun_kodu || (p as any).sku || (p as any).id || "").trim().toLowerCase();
      const pSira = String(p.sira_no || "").trim();
      if (cleanTargetCode && pCode === cleanTargetCode) return false;
      if (targetSira && pSira === targetSira) return false;
      
      const pName = (p.urun_adi || "").trim().toLowerCase();
      if (pName === cleanParentTitle || pName.includes(cleanParentTitle) || cleanParentTitle.includes(pName)) return true;
      const pPrefix = pCode.split('-')[0];
      if (pPrefix && parentInfo.prefix && pPrefix.toLowerCase() === parentInfo.prefix.toLowerCase()) return true;
      return false;
    });

    const isLastVariant = remainingInGroup.length === 0;

    // Filter helper
    const filterOutProduct = (list: DbProduct[]) => {
      return list.filter(p => {
        const pCode = String(p.urun_kodu || (p as any).sku || (p as any).id || "").trim().toLowerCase();
        const pSira = String(p.sira_no || "").trim();
        if (cleanTargetCode && pCode === cleanTargetCode) return false;
        if (targetSira && pSira === targetSira) return false;
        return true;
      });
    };

    // Candidate endpoints to attempt deletion across REST, mod_rewrite, PHP direct, and override
    const candidateRequests: Array<{ url: string; method: string; body?: any }> = [
      {
        url: getApiEndpoint(`api/admin/products/${encodeURIComponent(targetCode)}?sku=${encodeURIComponent(targetCode)}&urun_kodu=${encodeURIComponent(targetCode)}&sira_no=${encodeURIComponent(targetSira)}`),
        method: "DELETE",
        body: { urun_kodu: targetCode, sku: targetCode, sira_no: targetSira }
      },
      {
        url: getApiEndpoint(`api/admin.php?action=products&sku=${encodeURIComponent(targetCode)}&urun_kodu=${encodeURIComponent(targetCode)}&sira_no=${encodeURIComponent(targetSira)}`),
        method: "DELETE",
        body: { urun_kodu: targetCode, sku: targetCode, sira_no: targetSira }
      },
      {
        url: getApiEndpoint("api/admin.php?action=products"),
        method: "POST",
        body: { urun_kodu: targetCode, sku: targetCode, sira_no: targetSira, _method: "DELETE", action: "delete_product" }
      },
      {
        url: getApiEndpoint("api/admin/products"),
        method: "POST",
        body: { urun_kodu: targetCode, sku: targetCode, sira_no: targetSira, _method: "DELETE", action: "delete_product" }
      },
      {
        url: getApiEndpoint(`api/products/${encodeURIComponent(targetCode)}?sku=${encodeURIComponent(targetCode)}`),
        method: "DELETE",
        body: { urun_kodu: targetCode, sku: targetCode, sira_no: targetSira }
      },
      {
        url: getApiEndpoint("api/api.php?action=products"),
        method: "POST",
        body: { urun_kodu: targetCode, sku: targetCode, sira_no: targetSira, _method: "DELETE", action: "delete_product" }
      }
    ];

    let serverSuccess = false;
    let serverUpdatedProducts: DbProduct[] | null = null;

    for (const req of candidateRequests) {
      try {
        const fetchOptions: RequestInit = {
          method: req.method,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
          }
        };
        if (req.body) {
          fetchOptions.body = JSON.stringify(req.body);
        }

        const res = await fetch(req.url, fetchOptions);
        if (res.ok) {
          const resData = await res.json().catch(() => null);
          if (resData && (resData.success === true || Array.isArray(resData.products) || resData.deleted_sku)) {
            serverSuccess = true;
            if (Array.isArray(resData.products)) {
              serverUpdatedProducts = resData.products.map((p: any) => {
                const rawPrice = p.birim_fiyat ?? p.birim_fiyati ?? 0;
                const price = typeof rawPrice === "number" ? rawPrice : (parseFloat(String(rawPrice).replace(',', '.')) || 0);
                return {
                  ...p,
                  birim_fiyat: price,
                  birim_fiyati: price,
                  fiyat_aliniz: p.fiyat_aliniz === true || price <= 0,
                  isPremiumPrice: false
                };
              });
            }
            break;
          }
        }
      } catch (err) {
        // Continue to next candidate
      }
    }

    let masterRecord: DbProduct | null = null;
    if (isLastVariant) {
      masterRecord = createMasterCustomRecord(parentInfo, deleteConfirmProduct.sira_no || 999);
      // Sunucuya Master Özel Üretim kaydını yaz
      try {
        await fetch(getApiEndpoint("api/admin/products"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(masterRecord)
        }).catch(() => {});
        await fetch(getApiEndpoint("api/admin.php?action=products"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(masterRecord)
        }).catch(() => {});
      } catch (e) {}
    }

    // Apply deletion to client state and localStorage
    const baseList = serverUpdatedProducts ? serverUpdatedProducts : filterOutProduct(products);
    const nextProducts = (isLastVariant && masterRecord)
      ? [masterRecord, ...baseList.filter(p => (p.urun_kodu || (p as any).sku) !== masterRecord!.urun_kodu)]
      : baseList;

    setProducts(nextProducts);
    setGlobalProducts(nextProducts);
    try {
      localStorage.setItem("poset_app_products", JSON.stringify(nextProducts));
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('poset:sync'));
    setDeleteConfirmProduct(null);
    setIsDeletingProduct(false);

    if (isLastVariant) {
      triggerToast(`✓ "${productName}" varyantı silindi. Ürün grubu "Standart Ölçüsüz (Sadece Özel İmalat)" master kaydı olarak korundu.`);
    } else if (serverSuccess) {
      triggerToast(`✓ "${productName}" (${targetCode}) veritabanından kalıcı olarak silindi.`);
    } else {
      triggerToast(`⚠️ "${productName}" yerel olarak silindi. Sunucu bağlantısı veya izinlerini kontrol edin.`);
    }
  };

  // Helper to extract full CategorySchema object for a category name
  const getCategorySchemaObj = (catName: string): CategorySchema => {
    const found = Array.isArray(categories) ? categories.find((c: any) => {
      if (typeof c === "string") return c === catName;
      return c && typeof c === "object" && (c.name === catName || c.id === catName);
    }) : null;

    if (found && typeof found === "object") {
      return {
        id: found.id || `kat_${Date.now()}`,
        name: found.name || catName,
        slug: found.slug || (found.name || catName).toLowerCase().replace(/[^a-z0-9]/g, '-'),
        units: Array.isArray(found.units) && found.units.length > 0 ? found.units : ["Adet"],
        thickness_unit: found.thickness_unit || found.thickness || "Mikron",
        thickness: found.thickness || found.thickness_unit || "Mikron",
        default_moq: found.default_moq ? Number(found.default_moq) : 1000,
        fields: {
          kargo_bant: !!found.fields?.kargo_bant,
          kulp: found.fields?.kulp ?? true,
          koruk: found.fields?.koruk ?? true,
          irsaliye_cebi: !!found.fields?.irsaliye_cebi,
          baski: found.fields?.baski ?? true
        },
        allowed_materials: Array.isArray(found.allowed_materials) ? found.allowed_materials : []
      };
    }

    return {
      id: `kat_${Date.now()}`,
      name: catName,
      slug: catName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      units: ["Adet"],
      thickness_unit: "Mikron",
      thickness: "Mikron",
      default_moq: 1000,
      fields: { kargo_bant: false, kulp: true, koruk: true, irsaliye_cebi: false, baski: true },
      allowed_materials: []
    };
  };

  const handleOpenAddCategoryModal = () => {
    setEditingCategoryObj(null);
    setCategoryFormData({
      name: "",
      slug: "",
      units: ["Adet"],
      thickness_unit: "Mikron",
      thickness: "Mikron",
      default_moq: 1000,
      fields: { kargo_bant: false, kulp: true, koruk: true, irsaliye_cebi: false, baski: true },
      allowed_materials: []
    });
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategoryModal = (catName: string) => {
    const catObj = getCategorySchemaObj(catName);
    setEditingCategoryObj(catObj);
    setCategoryFormData({ ...catObj });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategoryModal = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawName = (categoryFormData.name || "").trim();
    if (!rawName) {
      alert("Hata: Lütfen kategori adını girin.");
      return;
    }

    const selectedUnits = Array.isArray(categoryFormData.units) && categoryFormData.units.length > 0 
      ? categoryFormData.units 
      : ["Adet"];

    const materialsArray = typeof categoryFormData.allowed_materials === "string"
      ? (categoryFormData.allowed_materials as string).split(",").map(m => m.trim()).filter(Boolean)
      : (Array.isArray(categoryFormData.allowed_materials) ? categoryFormData.allowed_materials : []);

    const isEdit = !!editingCategoryObj;

    const payload: CategorySchema = {
      id: editingCategoryObj?.id || `kat_${Date.now()}`,
      name: rawName,
      slug: categoryFormData.slug || rawName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      units: selectedUnits,
      thickness_unit: categoryFormData.thickness_unit || categoryFormData.thickness || "Mikron",
      thickness: categoryFormData.thickness || categoryFormData.thickness_unit || "Mikron",
      default_moq: categoryFormData.default_moq ? Number(categoryFormData.default_moq) : 1000,
      fields: {
        kargo_bant: !!categoryFormData.fields?.kargo_bant,
        kulp: categoryFormData.fields?.kulp ?? true,
        koruk: categoryFormData.fields?.koruk ?? true,
        irsaliye_cebi: !!categoryFormData.fields?.irsaliye_cebi,
        baski: categoryFormData.fields?.baski ?? true,
      },
      allowed_materials: materialsArray
    };

    setIsSavingCategory(true);

    try {
      const url = isEdit
        ? getApiEndpoint(`api/admin/categories/${encodeURIComponent(editingCategoryObj.id || editingCategoryObj.name)}`)
        : getApiEndpoint("api/admin/categories");
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { oldName: editingCategoryObj.name, newName: rawName, ...payload } : payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (isEdit) {
          setCategories(prev => prev.map(c => {
            const cId = typeof c === "object" ? c.id : c;
            const cName = typeof c === "object" ? c.name : c;
            if (cId === editingCategoryObj.id || cName === editingCategoryObj.name) {
              return data.category || payload;
            }
            return c;
          }));
          if (editingCategoryObj.name !== rawName) {
            setProducts(prev => prev.map(p => p.urun_kategorisi === editingCategoryObj.name ? { ...p, urun_kategorisi: rawName } : p));
          }
        } else {
          setCategories(prev => [...prev, data.category || payload]);
        }
        setIsCategoryModalOpen(false);
        triggerToast("✓ Kategori başarıyla kaydedildi.");
        alert("Kategori başarıyla kaydedildi.");
      } else {
        const errorMsg = data.error || data.message || "Kategori kaydedilemedi";
        triggerToast(`⚠️ Hata: ${errorMsg}`);
        alert("Hata: " + errorMsg);
      }
    } catch (err: any) {
      console.error("Category save modal error:", err);
      const msg = err?.message || "Sunucu ile iletişim kurulamadı";
      triggerToast(`❌ Hata: ${msg}`);
      alert("Hata: " + msg);
    } finally {
      setIsSavingCategory(false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (catName: string) => {
    const productCount = products.filter(p => p.urun_kategorisi === catName).length;
    if (productCount > 0) {
      triggerToast("Bu kategoriye ait ürünler varken silinemez");
      alert("Hata: Bu kategoriye ait ürünler varken silinemez.");
      return;
    }

    if (!window.confirm(`"${catName}" kategorisini silmek istediğinizden emin misiniz?`)) return;

    setIsSavingCategory(true);

    try {
      const res = await fetch(getApiEndpoint(`api/admin/categories/${encodeURIComponent(catName)}`), {
        method: "DELETE"
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.error || errData.message || "Bu kategoriye ait ürünler varken silinemez";
        triggerToast(msg);
        alert("Hata: " + msg);
        return;
      }
      const data = await res.json();
      if (data && data.categories) {
        setCategories(data.categories);
      } else {
        setCategories(prev => prev.filter(c => (typeof c === "string" ? c : c.name) !== catName));
      }
      triggerToast(`✓ "${catName}" kategorisi silindi.`);
    } catch (err: any) {
      console.error("Category delete error:", err);
      triggerToast("Bu kategoriye ait ürünler varken silinemez");
    } finally {
      setIsSavingCategory(false);
    }
  };

  // Multiplier Template Handlers
  const handleOpenAddTemplateModal = () => {
    setEditingTemplate(null);
    setTemplateTitle("");
    setTemplateValue("5k:1.00 / 10k:0.92 / 25k:0.85");
    setTemplateDesc("");
    setIsTemplateModalOpen(true);
  };

  const handleOpenEditTemplateModal = (tpl: MultiplierTemplate) => {
    setEditingTemplate(tpl);
    setTemplateTitle(tpl.title);
    setTemplateValue(tpl.multiplierString);
    setTemplateDesc(tpl.description || "");
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateTitle.trim() || !templateValue.trim()) {
      triggerToast("❌ Şablon adı ve çarpan değerini giriniz.");
      return;
    }

    setIsSavingTemplate(true);
    const isEdit = !!editingTemplate;
    const payload = {
      title: templateTitle.trim(),
      multiplierString: templateValue.trim(),
      description: templateDesc.trim()
    };

    try {
      const url = isEdit
        ? `/api/admin/multiplier-templates/${editingTemplate.id}`
        : "/api/admin/multiplier-templates";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.templates) {
          setMultiplierTemplates(data.templates);
        }
        setIsTemplateModalOpen(false);
        triggerToast(isEdit ? "✓ Şablon güncellendi." : "✓ Yeni şablon eklendi.");
      }
    } catch (err) {
      triggerToast("❌ Şablon kaydedilirken hata oluştu.");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm("Bu fiyat çarpan şablonunu silmek istediğinizden emin misiniz?")) return;

    try {
      const res = await fetch(`/api/admin/multiplier-templates/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.templates) {
          setMultiplierTemplates(data.templates);
        }
        triggerToast("✓ Şablon silindi.");
      }
    } catch (err) {
      triggerToast("❌ Şablon silinirken hata oluştu.");
    }
  };

  // Dynamic Category list combining system categories database and products categories
  // (Must be defined at top-level before any conditional returns to obey React Rules of Hooks)
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(categories)) {
      categories.forEach(c => {
        if (c && typeof c === "string" && c.trim()) set.add(c.trim());
      });
    }
    if (Array.isArray(products)) {
      products.forEach(p => {
        if (p.urun_kategorisi && typeof p.urun_kategorisi === "string" && p.urun_kategorisi.trim()) {
          set.add(p.urun_kategorisi.trim());
        }
      });
    }
    return Array.from(set);
  }, [categories, products]);

  // Real-time filtering
  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === "all" || p.urun_kategorisi === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q || 
      (p.urun_kodu && p.urun_kodu.toLowerCase().includes(q)) ||
      (p.urun_adi && p.urun_adi.toLowerCase().includes(q)) ||
      (p.olculer && p.olculer.toLowerCase().includes(q)) ||
      (p.urun_kategorisi && p.urun_kategorisi.toLowerCase().includes(q)) ||
      (p.hammadde_turu && p.hammadde_turu.toLowerCase().includes(q));
    
    return matchesCat && matchesSearch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredProducts.length);
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Active Category Rule Matrix lookup for Product Modal
  const activeCategory = formData.urun_kategorisi || (categoriesList[0] || "E-TİCARET VE KARGO AMBALAJLARI");
  const activeRule = CATEGORY_FORM_RULES[activeCategory] || DEFAULT_CATEGORY_RULE;
  const isBaskisiz = formData.baski_durumu === "Baskısız";

  // ----------------------------------------------------
  // LOGIN SCREEN (If not authenticated)
  // ----------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center p-6 selection:bg-indigo-600 selection:text-white font-sans relative overflow-hidden">
        {/* Background glow ambient effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/5 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-600/5 blur-3xl rounded-full pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-8 shadow-xl backdrop-blur-xl relative z-10 space-y-6"
        >
          {/* Top Icon & Title */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center mx-auto shadow-xl shadow-indigo-600/20">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-slate-900 font-display">Ambalaj Market Yönetim Portalı Girişi</h2>
              <p className="text-xs text-slate-500 font-medium">Devam etmek için yönetici kimlik bilgilerinizi giriniz.</p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Error Message Alert */}
            {loginError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3.5 rounded-2xl flex items-center space-x-2.5">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold uppercase text-slate-700 block">
                Kullanıcı Adı
              </label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="poset"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-mono text-sm pl-10 pr-4 py-3 rounded-2xl focus:bg-white focus:border-indigo-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold uppercase text-slate-700 block">
                Şifre
              </label>
              <div className="relative flex items-center">
                <Key className="w-4 h-4 text-slate-400 absolute left-3.5" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-mono text-sm pl-10 pr-10 py-3 rounded-2xl focus:bg-white focus:border-indigo-600 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  title={showPassword ? "Şifreyi Gizle" : "Şifreyi Göster"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm py-3.5 px-6 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center space-x-2 pt-3.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Panele Giriş Yap</span>
            </button>

          </form>

        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-600 selection:text-white" id="b2b-admin-panel-root">
      
      {/* Top Header Bar */}
      <header className="bg-white/90 border-b border-slate-200 sticky top-0 z-40 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-extrabold text-lg text-slate-900 font-display">Ambalaj Market Yönetim Portalı</h1>
                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-indigo-200 uppercase">
                  v2.5 Admin CRUD
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Döviz Kuru Entegrasyonu & Ambalaj Ürün Veritabanı (87 Varyasyon)</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono text-slate-500 hidden sm:inline mr-2">
              Aktif Kur: <strong className="text-emerald-600">₺{settings?.usd_try_rate ? Number(settings.usd_try_rate).toFixed(2) : "35.00"}</strong> / USD
            </span>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl transition-all flex items-center space-x-1.5 text-xs font-bold cursor-pointer"
              title="Güvenli Çıkış Yap"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Çıkış Yap</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        
        {/* Sub-Navigation Menu Bar (Desktop + Mobile Off-Canvas Drawer) */}
        {(() => {
          const adminSubTabs = [
            { id: "currency", label: "Kurlar", icon: DollarSign, desc: "Döviz Kuru & CollectAPI Entegrasyonu" },
            { id: "products", label: "Ürünler", icon: Package, badge: products.length, desc: "Üretim Kataloğu Veritabanı" },
            { id: "categories", label: "Kategoriler", icon: Tag, badge: categoriesList.length, desc: "Ambalaj Kategori Yönetimi" },
            { id: "multipliers", label: "Fiyat & İndirimler", icon: Layers, desc: "Fiyat Çarpanları & Miktar İndirimleri" },
            { id: "articles", label: "Makale Yönetimi", icon: BookOpen, badge: articles.length, desc: "Ambalaj Rehberi & SEO" },
            { id: "security", label: "Ayarlar", icon: ShieldCheck, desc: "Admin Giriş & Güvenlik Ayarları" }
          ];

          const activeTabObj = adminSubTabs.find(t => t.id === activeAdminSubTab) || adminSubTabs[0];
          const ActiveIcon = activeTabObj.icon;

          return (
            <>
              {/* DESKTOP TAB BAR (hidden on mobile) */}
              <div className="hidden md:block bg-white border border-slate-200/80 rounded-2xl p-2 shadow-sm overflow-x-auto">
                <div className="flex items-center space-x-1 min-w-max">
                  {adminSubTabs.map((tab) => {
                    const IconComp = tab.icon;
                    const isActive = activeAdminSubTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleSubTabChange(tab.id as any)}
                        className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
                          isActive
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                        }`}
                      >
                        <IconComp className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"}`} />
                        <span>{tab.label}</span>
                        {tab.badge !== undefined && (
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-extrabold ${
                            isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                          }`}>
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* MOBILE BAR WITH OFF-CANVAS TRIGGER (visible on mobile only) */}
              <div className="md:hidden bg-white border border-slate-200/80 rounded-2xl p-3 shadow-sm flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
                    <ActiveIcon className="w-4.5 h-4.5 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono text-slate-400 uppercase font-extrabold tracking-wider">Aktif Modül</div>
                    <div className="text-xs font-extrabold text-slate-900 flex items-center space-x-1.5 truncate">
                      <span className="truncate">{activeTabObj.label}</span>
                      {activeTabObj.badge !== undefined && (
                        <span className="bg-indigo-50 text-indigo-700 text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full border border-indigo-200 shrink-0">
                          {activeTabObj.badge}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-3.5 py-2.5 rounded-xl flex items-center space-x-2 transition-all cursor-pointer shadow-md shadow-indigo-600/20 shrink-0"
                >
                  <Menu className="w-4 h-4" />
                  <span>Modüller</span>
                </button>
              </div>

              {/* OFF-CANVAS DRAWER MODAL */}
              <AnimatePresence>
                {isMobileMenuOpen && (
                  <div className="fixed inset-0 z-50 flex">
                    {/* Backdrop */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
                    />

                    {/* Drawer Content */}
                    <motion.div
                      initial={{ x: "-100%" }}
                      animate={{ x: 0 }}
                      exit={{ x: "-100%" }}
                      transition={{ type: "spring", damping: 25, stiffness: 250 }}
                      className="relative ml-0 w-full max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 p-6 space-y-6 overflow-y-auto"
                    >
                      {/* Drawer Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-sm text-slate-900 font-display">Yönetim Modülleri</h3>
                            <p className="text-[10px] text-slate-400 font-medium">Modül seçimi yapın</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Drawer Menu List */}
                      <div className="space-y-2 flex-1">
                        {adminSubTabs.map((tab) => {
                          const IconComp = tab.icon;
                          const isActive = activeAdminSubTab === tab.id;

                          return (
                            <button
                              key={tab.id}
                              onClick={() => {
                                handleSubTabChange(tab.id as any);
                                setIsMobileMenuOpen(false);
                              }}
                              className={`w-full text-left p-3.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer ${
                                isActive
                                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/70"
                              }`}
                            >
                              <div className="flex items-center space-x-3 min-w-0 pr-2">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                  isActive ? "bg-white/20 text-white" : "bg-white text-indigo-600 border border-slate-200"
                                }`}>
                                  <IconComp className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-extrabold truncate flex items-center space-x-1.5">
                                    <span>{tab.label}</span>
                                    {tab.badge !== undefined && (
                                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-extrabold ${
                                        isActive ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-700"
                                      }`}>
                                        {tab.badge}
                                      </span>
                                    )}
                                  </div>
                                  <div className={`text-[10px] truncate ${isActive ? "text-indigo-100" : "text-slate-400"}`}>
                                    {tab.desc}
                                  </div>
                                </div>
                              </div>

                              <ChevronRight className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                            </button>
                          );
                        })}
                      </div>

                      {/* Drawer Footer */}
                      <div className="border-t border-slate-100 pt-4 text-center">
                        <p className="text-[10px] font-mono text-slate-400">Ambalaj Market v2.5 Admin</p>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </>
          );
        })()}

        {/* SECTION 1: DÖVİZ VE AYAR KARTI */}
        {activeAdminSubTab === "currency" && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-extrabold text-base text-slate-900">Döviz Kuru & CollectAPI Entegrasyonu</h2>
                <p className="text-xs text-slate-500 font-medium">USD/TRY canlı döviz kurunu yönetin veya otomatik CollectAPI canlı verisini çekin.</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs font-mono text-slate-500">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Son Güncelleme: <strong className="text-slate-800">{settings.last_updated || "Henüz Yapılmadı"}</strong></span>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="grid md:grid-cols-12 gap-5 items-end">
            
            {/* Input 1: USD/TRY Rate */}
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider block">
                Aktif Dolar Kuru (₺ / USD)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={usdRateInput}
                  onChange={(e) => setUsdRateInput(e.target.value)}
                  placeholder="35.00"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-mono font-extrabold text-base px-4 py-2.5 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs font-extrabold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  TRY / 1 USD
                </span>
              </div>
            </div>

            {/* Action Buttons: 2 Columns */}
            <div className="md:col-span-7 grid sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleRefreshRateCollectAPI}
                disabled={isRefreshingRate}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshingRate ? "animate-spin" : ""}`} />
                <span>{isRefreshingRate ? "Kur Çekiliyor..." : "Canlı Kuru Güncelle (CollectAPI)"}</span>
              </button>

              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>Manuel Kuru Kaydet</span>
              </button>
            </div>

            <div className="md:col-span-12 flex items-center space-x-2 text-[11px] font-mono text-slate-700 bg-emerald-50/70 border border-emerald-200/80 px-3.5 py-2.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>⚡ <strong>Otomatik Kur Güncelleme Aktif:</strong> USD/TRY kurları her 30 dakikada bir CollectAPI üzerinden otomatik olarak çekilip güncellenmektedir. Dilerseniz "Canlı Kuru Güncelle" butonu ile anlık tetikleme de yapabilirsiniz.</span>
            </div>

          </form>
        </div>
        )}

        {/* SECTION 1.5: KATEGORİ YÖNETİM KARTI (SCALABLE 100+ CATEGORIES & FULL CRUD) */}
        {activeAdminSubTab === "categories" && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                <Tag className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="font-extrabold text-base text-slate-900">Ambalaj Kategori Yönetimi</h2>
                  <span className="bg-indigo-50 text-indigo-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-indigo-200">
                    {categoriesList.length} Kategori
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">Sistemdeki ambalaj kategorilerini ekleyin, isimlerini düzenleyin veya silin.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Category Search Input */}
              <div className="relative w-full sm:w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Kategori ara..."
                  value={categorySearchQuery}
                  onChange={(e) => setCategorySearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs pl-8 pr-3 py-1.5 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              {/* "+ Ekle" Modal Trigger Button */}
              <button
                type="button"
                onClick={handleOpenAddCategoryModal}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-1.5 px-3.5 rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/20 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Ekle</span>
              </button>

              {/* Collapse/Expand Toggle Button */}
              <button
                type="button"
                onClick={() => setIsCategoriesCollapsed(prev => !prev)}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
                title={isCategoriesCollapsed ? "Kategorileri Göster" : "Kategorileri Gizle"}
              >
                {isCategoriesCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Kategoriler Listesi - Scrollable max-h-72 Container for 100+ categories */}
          {!isCategoriesCollapsed && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
              {categoriesList
                .filter(c => !categorySearchQuery.trim() || c.toLowerCase().includes(categorySearchQuery.toLowerCase().trim()))
                .map((catName) => {
                  const productCount = products.filter(p => p.urun_kategorisi === catName).length;

                  return (
                    <div 
                      key={catName}
                      className="bg-slate-50/80 border border-slate-200 hover:border-indigo-200 hover:bg-slate-100/50 rounded-2xl p-3 flex items-center justify-between transition-all group"
                    >
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <h5 className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                          {catName}
                        </h5>
                        <span className="text-[10px] font-mono text-slate-500 block">
                          {productCount} Ürün Varyasyonu
                        </span>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={() => handleOpenEditCategoryModal(catName)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Kategoriyi Düzenle (Modal)"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(catName)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Kategoriyi Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
        )}

        {/* SECTION 1.8: FİYAT ÇARPANLARI YÖNETİMİ (FULL EDITABLE CRUD ŞABLON KARTI) */}
        {activeAdminSubTab === "multipliers" && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-extrabold text-base text-slate-900">Fiyat Çarpanları & Miktar İndirim Şablonları</h2>
                <p className="text-xs text-slate-500 font-medium">Toptan alımlarda miktar arttıkça birim fiyata uygulanacak indirim oranlarını yönetin ve düzenleyin.</p>
              </div>
            </div>

            <button
              onClick={handleOpenAddTemplateModal}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2 px-3.5 rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer shadow-md shadow-amber-600/20 shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Şablon Ekle</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {multiplierTemplates.map((tpl) => (
              <div key={tpl.id} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-1.5 hover:border-amber-300 transition-all group relative">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-800 truncate pr-2">{tpl.title}</h5>
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditTemplateModal(tpl)}
                      className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                      title="Şablonu Düzenle"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                      title="Şablonu Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-[11px] font-mono font-bold text-indigo-600 bg-white px-2 py-1 rounded border border-slate-200 inline-block truncate w-full">
                  {tpl.multiplierString}
                </p>
                {tpl.description && (
                  <p className="text-[10px] text-slate-500 font-medium truncate">{tpl.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
        )}

        {/* SECTION 1.7: AMBALAJ REHBERİ YÖNETİMİ (KNOWLEDGE HUB & SEO CONTENT) */}
        {activeAdminSubTab === "articles" && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="font-extrabold text-base text-slate-900">Ambalaj Rehberi (SEO & Makale) Yönetimi</h2>
                  <span className="bg-purple-50 text-purple-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-purple-200">
                    {articles.length} Rehber Makale
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">SEO uyumlu rehber makaleleri ve S.S.S. bölümlerini ekleyin, düzenleyin ve silin.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search Input */}
              <div className="relative w-full sm:w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Makale ara..."
                  value={articleSearchQuery}
                  onChange={(e) => setArticleSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs pl-8 pr-3 py-1.5 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleOpenAddArticleModal}
                className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs py-1.5 px-3.5 rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer shadow-md shadow-purple-600/20 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Yeni Makale Ekle</span>
              </button>

              <button
                type="button"
                onClick={() => setIsArticlesCollapsed(prev => !prev)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                {isArticlesCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!isArticlesCollapsed && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase text-[10px]">
                    <th className="py-3 px-4">Başlık</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4">Okuma Süresi</th>
                    <th className="py-3 px-4">Tarih</th>
                    <th className="py-3 px-4">İlgili Ürün</th>
                    <th className="py-3 px-4 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {articles
                    .filter(a => !articleSearchQuery || a.baslik.toLowerCase().includes(articleSearchQuery.toLowerCase()) || a.kategori.toLowerCase().includes(articleSearchQuery.toLowerCase()))
                    .map((art) => (
                      <tr key={art.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 max-w-xs truncate">
                          {art.baslik}
                        </td>
                        <td className="py-3 px-4">
                          <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-[10px]">
                            {art.kategori}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono">{art.okuma_suresi}</td>
                        <td className="py-3 px-4 text-slate-500 font-mono">{art.tarih}</td>
                        <td className="py-3 px-4 text-indigo-600 font-mono font-bold">{art.related_product || "-"}</td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEditArticleModal(art)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Düzenle"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteArticle(art.id, art.baslik)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  {articles.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400 font-medium">
                        Henüz rehber makale eklenmedi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}

        {/* SECTION 2: ÜRÜN YÖNETİM TABLOSU (FULL CRUD) */}
        {activeAdminSubTab === "products" && (
          <>
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-6">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                <Package className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="font-extrabold text-base text-slate-900">Üretim Kataloğu Veritabanı</h2>
                <p className="text-xs text-slate-500 font-medium">
                  Toplam <strong className="text-indigo-600 font-bold">{products.length}</strong> ambalaj varyasyonu listelenmektedir.
                </p>
              </div>
            </div>

            <button
              onClick={handleOpenAddModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl flex items-center space-x-2 transition-all cursor-pointer shadow-md shadow-indigo-600/20 self-start md:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ Yeni Ürün Ekle</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="grid md:grid-cols-12 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            {/* Search Input */}
            <div className="md:col-span-7 relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3" />
              <input
                type="text"
                placeholder="Ürün adı, SKU kodu, ölçü veya hammadde ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-900 text-xs pl-9 pr-4 py-2.5 rounded-xl focus:border-indigo-600 focus:outline-none"
              />
            </div>

            {/* Dynamic Category Select Dropdown */}
            <div className="md:col-span-5 flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 text-xs px-3 py-2.5 rounded-xl focus:border-indigo-600 focus:outline-none cursor-pointer"
              >
                <option value="all">Tüm Kategoriler ({products.length})</option>
                {categoriesList.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 font-mono uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Kod / SKU</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Ürün Adı</th>
                  <th className="py-3 px-4">Ölçü</th>
                  <th className="py-3 px-4 text-center">Stok Durumu</th>
                  <th className="py-3 px-4 text-right">Birim Fiyat</th>
                  <th className="py-3 px-4 text-center">Para Birimi</th>
                  <th className="py-3 px-4 text-center">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loadingProducts && products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400 font-mono">
                      Yükleniyor...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-500">
                      Arama kriterlerine uygun ambalaj varyasyonu bulunamadı.
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((prod) => {
                    const isUsd = prod.para_birimi === "USD";
                    const tlVal = isUsd 
                      ? ((prod.birim_fiyati || 0) * settings.usd_try_rate) 
                      : (prod.birim_fiyati || 0);

                    return (
                      <tr key={prod.sira_no || prod.urun_kodu} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                          {prod.urun_kodu}
                        </td>
                        <td className="py-3 px-4 text-slate-500 truncate max-w-[140px]" title={prod.urun_kategorisi}>
                          {prod.urun_kategorisi}
                        </td>
                        <td className="py-3 px-4 font-extrabold text-slate-900">
                          {prod.urun_adi}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono">
                          {isCustomOnlyProduct(prod) ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-3xs">
                              Standart Ölçüsüz (Sadece Özel İmalat)
                            </span>
                          ) : (
                            prod.olculer
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {prod.stok_durumu === "Var" ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block">
                              Stokta Var
                            </span>
                          ) : prod.stok_durumu === "Yok" ? (
                            <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block">
                              Stokta Yok
                            </span>
                          ) : (
                            <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block">
                              Siparişle
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          {prod.fiyat_aliniz || prod.birim_fiyat === 0 || prod.birim_fiyati === 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap shadow-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                              Fiyat Alınız
                            </span>
                          ) : (
                            <span className="font-medium text-slate-700">
                              {prod.para_birimi === 'USD' ? `$${prod.birim_fiyat}` : `₺${prod.birim_fiyat}`} / {prod.satis_sekli || 'Adet'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            isUsd 
                              ? "bg-amber-50 text-amber-700 border-amber-200" 
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}>
                            {prod.para_birimi || "TL"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            {/* Standart Ölçü Ekle butonu (Custom Only ise) */}
                            {isCustomOnlyProduct(prod) && (
                              <button
                                onClick={() => handleOpenAddStandardVariant(prod)}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 rounded-lg transition-all flex items-center space-x-1 font-bold text-[11px] cursor-pointer"
                                title="+ Standart Ölçü Ekle"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Yeni Ölçü Ekle</span>
                              </button>
                            )}
                            {/* Düzenle (Mavi/Kalem ikonu) */}
                            <button
                              onClick={() => handleOpenEditModal(prod)}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 rounded-lg transition-all flex items-center space-x-1 font-bold text-[11px] cursor-pointer"
                              title="Ürünü Düzenle"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Düzenle</span>
                            </button>
                            {/* Sil (Kırmızı/Çöp kutusu ikonu) */}
                            {isCustomOnlyProduct(prod) ? (
                              <button
                                onClick={() => {
                                  alert(`"${prod.urun_adi}" ürünü sadece özel imalat modundadır ve sistemden silinemez. Dilerseniz yeni standart ölçü ekleyebilirsiniz.`);
                                }}
                                className="px-2.5 py-1.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg flex items-center space-x-1 font-bold text-[11px] cursor-not-allowed opacity-60"
                                title="Sadece özel ölçülü master ürün silinemez"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Sil</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmProduct(prod)}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 rounded-lg transition-all flex items-center space-x-1 font-bold text-[11px] cursor-pointer"
                                title="Ürünü Sil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Sil</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION CONTROLS */}
          {filteredProducts.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="text-xs text-slate-500 font-mono">
                Gösterilen: <strong className="text-slate-800">{startIndex + 1} - {endIndex}</strong> / Toplam <strong className="text-indigo-600">{filteredProducts.length}</strong> ürün
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={safeCurrentPage === 1}
                  className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 rounded-xl transition-all cursor-pointer border border-slate-200"
                  title="Önceki Sayfa"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                      pageNum === safeCurrentPage
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 rounded-xl transition-all cursor-pointer border border-slate-200"
                  title="Sonraki Sayfa"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>

        {/* SECTION 2.5: TARAYICI ÖNBELEK & SİSTEM SENKRONİZASYONU */}
        <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <RefreshCw className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="space-y-0.5">
              <h4 className="font-extrabold text-sm text-white flex items-center space-x-2">
                <span>Tarayıcı Önbelleği & Veri Senkronizasyonu</span>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full">
                  Aktif
                </span>
              </h4>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Tarayıcınızda kalmış eski ürün ve fiyat önbelleğini (LocalStorage) temizler, sunucu verileriyle anında senkronize eder.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClearCacheAndSync}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs py-3 px-4.5 rounded-xl flex items-center space-x-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/20 shrink-0 border border-indigo-400/30 active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Önbelleği Temizle & Yenile</span>
          </button>
        </div>
        </>
        )}

        {/* SECTION 6: ADMİN GİRİŞ & GÜVENLİK AYARLARI */}
        {activeAdminSubTab === "security" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sol Kolon: Mevcut Admin Giriş & Güvenlik Ayarları Kartı */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="font-extrabold text-lg text-slate-900">Admin Giriş & Güvenlik Ayarları</h2>
                      <p className="text-xs text-slate-500 font-medium">Yönetim paneline giriş kullanıcı adınızı ve şifrenizi güvenli şekilde güncelleyin.</p>
                    </div>
                  </div>
                  <span className="bg-slate-100 text-slate-700 text-xs font-mono font-bold px-3 py-1 rounded-full border border-slate-200 self-start sm:self-auto">
                    Güvenlik Seviyesi: Yüksek
                  </span>
                </div>

                <form id="admin-security-form" onSubmit={handleSaveSecuritySettings} className="space-y-4 pt-4">
                  {/* Username Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider block">
                      Yönetici Kullanıcı Adı
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={securityUsername}
                        onChange={(e) => setSecurityUsername(e.target.value)}
                        placeholder="Kullanıcı adı"
                        required
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm pl-10 pr-4 py-3 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">Giriş yaparken kullanacağınız kullanıcı adı (Varsayılan: poset).</p>
                  </div>

                  {/* Current Password Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider block">
                      Mevcut Şifreniz <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type={showSecurityPasswords ? "text" : "password"}
                        value={securityCurrentPassword}
                        onChange={(e) => setSecurityCurrentPassword(e.target.value)}
                        placeholder="Mevcut şifrenizi girin"
                        required
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm pl-10 pr-10 py-3 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecurityPasswords(!showSecurityPasswords)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showSecurityPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">Değişiklikleri onaylamak için mevcut şifrenizi girmeniz zorunludur (Varsayılan: 654321).</p>
                  </div>

                  <div className="border-t border-slate-100 pt-4 grid sm:grid-cols-2 gap-4">
                    {/* New Password Field */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider block">
                        Yeni Şifre (İsteğe Bağlı)
                      </label>
                      <div className="relative">
                        <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          type={showSecurityPasswords ? "text" : "password"}
                          value={securityNewPassword}
                          onChange={(e) => setSecurityNewPassword(e.target.value)}
                          placeholder="Yeni şifre"
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm pl-10 pr-4 py-3 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                        />
                      </div>
                    </div>

                    {/* Confirm New Password Field */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider block">
                        Yeni Şifre Tekrar
                      </label>
                      <div className="relative">
                        <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          type={showSecurityPasswords ? "text" : "password"}
                          value={securityNewPasswordConfirm}
                          onChange={(e) => setSecurityNewPasswordConfirm(e.target.value)}
                          placeholder="Yeni şifre tekrar"
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm pl-10 pr-4 py-3 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  form="admin-security-form"
                  disabled={isSavingSecurity}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-3 px-6 rounded-xl flex items-center space-x-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSavingSecurity ? "Kaydediliyor..." : "Güvenlik Bilgilerini Güncelle"}</span>
                </button>
              </div>
            </div>

            {/* Sağ Kolon (Kırmızı Ok Alanı): Yeni "Teklif Formu & İletişim Ayarları" Kartı */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="font-extrabold text-lg text-slate-900">Teklif Formu & İletişim Ayarları</h2>
                      <p className="text-xs text-slate-500 font-medium">Teklif taleplerinin yönlendirileceği WhatsApp hattını, e-posta adresini ve form kurallarını belirleyin.</p>
                    </div>
                  </div>
                  <span className="bg-blue-50 text-blue-700 text-xs font-mono font-bold px-3 py-1 rounded-full border border-blue-200 self-start sm:self-auto">
                    RFQ Entegrasyonu
                  </span>
                </div>

                <form id="admin-rfq-settings-form" onSubmit={handleSaveRfqSettings} className="space-y-4 pt-4">
                  {/* WhatsApp Sipariş Hattı */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider block">
                      WhatsApp Sipariş Hattı *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={rfqSettings.whatsappNumber}
                        onChange={(e) => setRfqSettings(prev => ({ ...prev, whatsappNumber: e.target.value }))}
                        placeholder="905424086160"
                        required
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm pl-10 pr-4 py-3 rounded-xl focus:bg-white focus:border-blue-600 outline-none"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">Sitedeki tüm WhatsApp teklif ve destek butonları bu numarayı arayacaktır (Varsayılan: 905424086160).</p>
                  </div>

                  {/* Teklif Bildirim E-Postası */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider block">
                      Teklif Bildirim E-Postası *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="email"
                        value={rfqSettings.notificationEmail}
                        onChange={(e) => setRfqSettings(prev => ({ ...prev, notificationEmail: e.target.value }))}
                        placeholder="info@poset.com"
                        required
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm pl-10 pr-4 py-3 rounded-xl focus:bg-white focus:border-blue-600 outline-none"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">Teklif taleplerinin arka planda kopyasının düşeceği resmi e-posta adresi.</p>
                  </div>

                  {/* Toggles: Aylık Ortalama Tüketim */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="pr-4">
                        <span className="text-xs font-bold text-slate-800 block">"Aylık Ortalama Tüketim" Alanını Formda Göster</span>
                        <span className="text-[11px] text-slate-500 font-medium">Teklif tamamlama modalında müşterinin aylık tüketim miktarını girmesi için alan açar.</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={rfqSettings.showMonthlyConsumption}
                          onChange={(e) => setRfqSettings(prev => ({ ...prev, showMonthlyConsumption: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-3">
                      <div className="pr-4">
                        <span className="text-xs font-bold text-slate-800 block">"Aylık Tüketim" Doldurulması Zorunlu Olsun</span>
                        <span className="text-[11px] text-slate-500 font-medium">Müşteri bu alanı doldurmadan teklif talebini gönderemez.</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          disabled={!rfqSettings.showMonthlyConsumption}
                          checked={rfqSettings.requireMonthlyConsumption && rfqSettings.showMonthlyConsumption}
                          onChange={(e) => setRfqSettings(prev => ({ ...prev, requireMonthlyConsumption: e.target.checked }))}
                          className="sr-only peer disabled:opacity-40"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Vergi / KDV Notu */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider block">
                        Vergi / KDV Notu
                      </label>
                      <input
                        type="text"
                        value={rfqSettings.taxNote}
                        onChange={(e) => setRfqSettings(prev => ({ ...prev, taxNote: e.target.value }))}
                        placeholder="KDV Hariç"
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm px-3.5 py-3 rounded-xl focus:bg-white focus:border-blue-600 outline-none"
                      />
                    </div>

                    {/* Buton Metni */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider block">
                        Gönder Buton Metni
                      </label>
                      <input
                        type="text"
                        value={rfqSettings.submitButtonText}
                        onChange={(e) => setRfqSettings(prev => ({ ...prev, submitButtonText: e.target.value }))}
                        placeholder="Teklif Talebini Gönder"
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm px-3.5 py-3 rounded-xl focus:bg-white focus:border-blue-600 outline-none"
                      />
                    </div>
                  </div>

                  {/* Teklif Dipnotu / Geçerlilik Süresi */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider block">
                      Teklif Dipnotu / Geçerlilik Süresi
                    </label>
                    <input
                      type="text"
                      value={rfqSettings.validityNote}
                      onChange={(e) => setRfqSettings(prev => ({ ...prev, validityNote: e.target.value }))}
                      placeholder="Fiyatlarımız 15 gün geçerlidir."
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm px-3.5 py-3 rounded-xl focus:bg-white focus:border-blue-600 outline-none"
                    />
                    <p className="text-[11px] text-slate-500 font-medium">Teklif sepeti ve şartname altında görünecek yasal geçerlilik notu.</p>
                  </div>
                </form>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  form="admin-rfq-settings-form"
                  disabled={isSavingRfq}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-3 px-6 rounded-xl flex items-center space-x-2 transition-all cursor-pointer shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingRfq ? "Kaydediliyor..." : "Teklif Ayarlarını Kaydet"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Yeni Kart: E-Posta & Mail Sunucusu (SMTP) Ayarları */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                  <Server className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="font-extrabold text-lg text-slate-900">E-Posta & Mail Sunucusu (SMTP) Ayarları</h2>
                  <p className="text-xs text-slate-500 font-medium">Teklif taleplerinin ve bildirimlerin gönderileceği kurumsal SMTP mail sunucu parametrelerini yapılandırın.</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="bg-emerald-50 text-emerald-700 text-xs font-mono font-bold px-3 py-1 rounded-full border border-emerald-200 flex items-center space-x-1.5 self-start sm:self-auto">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  <span>SMTP Entegrasyonu</span>
                </span>
              </div>
            </div>

            <form id="admin-smtp-settings-form" onSubmit={handleSaveSmtpSettings} className="space-y-6 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* SMTP Host */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider block">
                    SMTP Sunucu Adresi (Host) *
                  </label>
                  <div className="relative">
                    <Server className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={smtpSettings.host}
                      onChange={(e) => setSmtpSettings(prev => ({ ...prev, host: e.target.value }))}
                      placeholder="server.reksa.net veya mail.alanadiniz.com"
                      required
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm pl-10 pr-4 py-3 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">Hosting firmanızın sağladığı giden mail sunucusu (SMTP) adresi.</p>
                </div>

                {/* SMTP Port */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider block">
                    SMTP Port *
                  </label>
                  <input
                    type="number"
                    value={smtpSettings.port}
                    onChange={(e) => setSmtpSettings(prev => ({ ...prev, port: parseInt(e.target.value, 10) || 465 }))}
                    placeholder="465"
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm px-3.5 py-3 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                  />
                  <p className="text-[11px] text-slate-500 font-medium">SSL için 465, TLS/STARTTLS için 587</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* SMTP User */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider block">
                    Gönderici E-Posta / Kullanıcı Adı *
                  </label>
                    <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={smtpSettings.user}
                      onChange={(e) => setSmtpSettings(prev => ({ ...prev, user: e.target.value }))}
                      placeholder="info@poset.com"
                      required
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm pl-10 pr-4 py-3 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">Mail kutunuzun oturum açma e-posta adresi.</p>
                </div>

                {/* SMTP Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider block">
                    E-Posta Şifresi *
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type={showSmtpPassword ? "text" : "password"}
                      value={smtpSettings.pass}
                      onChange={(e) => setSmtpSettings(prev => ({ ...prev, pass: e.target.value }))}
                      placeholder="••••••••••••"
                      required
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm pl-10 pr-11 py-3 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showSmtpPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                    >
                      {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">Mail kutunuzun erişim şifresi veya uygulama şifresi.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* From Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider block">
                    Gönderici Başlığı (Kimden)
                  </label>
                  <input
                    type="text"
                    value={smtpSettings.fromName}
                    onChange={(e) => setSmtpSettings(prev => ({ ...prev, fromName: e.target.value }))}
                    placeholder="Poset.com Teklif Sistemi"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm px-3.5 py-3 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                  />
                  <p className="text-[11px] text-slate-500 font-medium">Müşteriye gidecek maillerde başlık olarak görünür.</p>
                </div>

                {/* From Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider block">
                    Gönderen E-Posta Adresi (From Header)
                  </label>
                  <input
                    type="email"
                    value={smtpSettings.fromEmail}
                    onChange={(e) => setSmtpSettings(prev => ({ ...prev, fromEmail: e.target.value }))}
                    placeholder="info@poset.com"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm px-3.5 py-3 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                  />
                  <p className="text-[11px] text-slate-500 font-medium">Boş bırakılırsa gönderici e-posta adresi kullanılır.</p>
                </div>
              </div>
            </form>

            {/* Canlı Test ve Kaydetme Barı */}
            <div className="pt-5 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Sol: Test Alanı */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-lg w-full">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    placeholder={rfqSettings.notificationEmail || "test@adresiniz.com"}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs pl-9 pr-3 py-2 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleTestSmtpConnection}
                  disabled={isTestingSmtp || !smtpSettings.host || !smtpSettings.user}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2 px-4 rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isTestingSmtp ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Test Ediliyor...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Bağlantıyı Test Et</span>
                    </>
                  )}
                </button>
              </div>

              {/* Sağ: Kaydet Butonu */}
              <div className="flex items-center justify-end shrink-0">
                <button
                  type="submit"
                  form="admin-smtp-settings-form"
                  disabled={isSavingSmtp}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-3 px-6 rounded-xl flex items-center space-x-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingSmtp ? "Kaydediliyor..." : "SMTP Ayarlarını Kaydet"}</span>
                </button>
              </div>
            </div>

            {/* Test Sonuç Bildirimi */}
            {smtpTestResult && (
              <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-start space-x-2.5 ${
                smtpTestResult.success 
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}>
                {smtpTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="leading-relaxed">
                  {smtpTestResult.message}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      </div>

      {/* SECTION 3: EDIT / ADD PRODUCT MODAL DIALOG (ALL 23 PARAMETERS) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto"
          >
            {/* Modal Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <Tag className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-base text-slate-900">
                  {editingProduct ? `Ürün Düzenle: ${editingProduct.urun_kodu}` : "Yeni Ürün Ekle"}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveProduct} className="p-6 overflow-y-auto flex-grow space-y-6">
              
              {/* BLOCK 1: Temel Kimlik Bilgileri */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                  1. Temel Ürün Kimlik Bilgileri
                </h4>
                <div className="grid md:grid-cols-12 gap-4">
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Ürün Kodu (SKU)</label>
                    <input
                      type="text"
                      required
                      value={formData.urun_kodu || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, urun_kodu: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs px-3 py-2.5 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                    />
                  </div>

                  <div className="md:col-span-5 space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Ürün Adı</label>
                    <input
                      type="text"
                      required
                      value={formData.urun_adi || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, urun_adi: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs px-3 py-2.5 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                    />
                  </div>

                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Ürün Kategorisi</label>
                    <select
                      required
                      value={activeCategory}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs px-3 py-2.5 rounded-xl focus:bg-white focus:border-indigo-600 outline-none cursor-pointer font-extrabold text-indigo-700"
                    >
                      {categoriesList.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* BLOCK 2: Fiyat ve Para Birimi (Satış Şekline göre Dinamik Birim Etiketi) */}
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 grid md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-6 space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-mono font-bold uppercase text-emerald-700 block">
                      Birim Fiyatı
                    </label>
                    <div className="flex items-center space-x-2">
                      <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-bold text-emerald-700">
                        <input
                          type="checkbox"
                          checked={formData.fiyat_aliniz || formData.birim_fiyat === 0 || formData.birim_fiyati === 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({ ...prev, birim_fiyat: 0, birim_fiyati: 0, fiyat_aliniz: true }));
                            } else {
                              setFormData(prev => ({ ...prev, birim_fiyat: 1.50, birim_fiyati: 1.50, fiyat_aliniz: false }));
                            }
                          }}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                        />
                        <span>Fiyat Alınız</span>
                      </label>
                      <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                        Birim: {formData.para_birimi === "USD" ? "$" : "₺"} / {formData.satis_sekli || activeRule.defaultSatisSekli || "Adet"}
                      </span>
                    </div>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={formData.fiyat_aliniz || formData.birim_fiyat === 0 || formData.birim_fiyati === 0}
                      value={formData.fiyat_aliniz || formData.birim_fiyat === 0 ? "0" : (formData.birim_fiyat !== undefined ? formData.birim_fiyat : (formData.birim_fiyati || 1.50))}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setFormData(prev => ({
                          ...prev,
                          birim_fiyat: val,
                          birim_fiyati: val,
                          fiyat_aliniz: val === 0
                        }));
                      }}
                      className={`w-full border font-mono font-extrabold text-sm pl-3.5 pr-20 py-2.5 rounded-xl outline-none transition-all ${
                        formData.birim_fiyati === 0 || formData.birim_fiyati === null
                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                          : "bg-white text-emerald-700 border-slate-300 focus:border-emerald-600"
                      }`}
                    />
                    <span className="absolute right-3 text-xs font-mono font-extrabold text-slate-500">
                      / {formData.satis_sekli || activeRule.defaultSatisSekli || "Adet"}
                    </span>
                  </div>
                </div>

                <div className="md:col-span-6 space-y-1">
                  <label className="text-xs font-mono font-bold uppercase text-amber-700 block">
                    Para Birimi (TL / USD)
                  </label>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, para_birimi: "TL" }))}
                      className={`flex-1 py-2.5 rounded-xl font-mono text-xs font-extrabold transition-all border cursor-pointer ${
                        formData.para_birimi === "TL" || !formData.para_birimi
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-sm" 
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      ₺ TL (Türk Lirası)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, para_birimi: "USD" }))}
                      className={`flex-1 py-2.5 rounded-xl font-mono text-xs font-extrabold transition-all border cursor-pointer ${
                        formData.para_birimi === "USD" 
                          ? "bg-amber-600 border-amber-600 text-white shadow-sm" 
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      $ USD (Amerikan Doları)
                    </button>
                  </div>
                </div>
              </div>

              {/* BLOCK 3: Stok & Satış Koşulları & Fiyat Çarpanları Şablon Butonları */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                  2. Stok & Satış Şartları
                </h4>
                <div className="grid md:grid-cols-12 gap-4">
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Stok Durumu</label>
                    <select
                      value={formData.stok_durumu || "Siparişle"}
                      onChange={(e) => setFormData(prev => ({ ...prev, stok_durumu: e.target.value as any }))}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs px-3 py-2.5 rounded-xl focus:bg-white focus:border-indigo-600 outline-none cursor-pointer"
                    >
                      <option value="Var">Stokta Var</option>
                      <option value="Siparişle">Sipariş Üzerine Üretim</option>
                      <option value="Yok">Stokta Yok</option>
                    </select>
                  </div>

                  {/* Dinamik Kategoriye Özel Satış Şekli */}
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500">
                      Satış Şekli {activeRule.isSatisSekliLocked && "(Kilitli)"}
                    </label>
                    {activeRule.isSatisSekliLocked ? (
                      <input
                        type="text"
                        readOnly
                        value="Adet"
                        className="w-full bg-slate-100 border border-slate-200 text-slate-500 text-xs px-3 py-2.5 rounded-xl font-bold cursor-not-allowed"
                      />
                    ) : (
                      <select
                        value={formData.satis_sekli || activeRule.defaultSatisSekli || "Adet"}
                        onChange={(e) => setFormData(prev => ({ ...prev, satis_sekli: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs px-3 py-2.5 rounded-xl focus:bg-white focus:border-indigo-600 outline-none cursor-pointer font-bold text-indigo-600"
                      >
                        {(activeRule.satisSekliOptions || ["Adet", "Kg", "Paket", "Rulo", "Koli"]).map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="md:col-span-3 space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-mono font-bold uppercase text-slate-500">MOQ (Min. Sipariş)</label>
                      <span className="text-[9px] font-mono text-indigo-600 font-bold">Birim: {formData.satis_sekli || activeRule.defaultSatisSekli || "Adet"}</span>
                    </div>
                    <input
                      type="text"
                      placeholder="5.000"
                      value={(formData.moq || "").replace(/[^0-9.]/g, "")}
                      onChange={(e) => setFormData(prev => ({ ...prev, moq: e.target.value.replace(/[^0-9.]/g, "") }))}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs px-3 py-2.5 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Fiyat Çarpanları</label>
                    <input
                      type="text"
                      placeholder="5k:1.00 / 10k:0.92 / 25k:0.85"
                      value={formData.fiyat_carpanlari || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, fiyat_carpanlari: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs px-3 py-2.5 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                    />
                  </div>

                  {/* Dinamik Hızlı Şablon Butonları */}
                  <div className="md:col-span-12 flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase mr-1">Hızlı Şablon Seç:</span>
                    {multiplierTemplates.map((tpl) => (
                      <button
                        type="button"
                        key={tpl.id}
                        onClick={() => setFormData(prev => ({ ...prev, fiyat_carpanlari: tpl.multiplierString }))}
                        className="text-[10px] font-mono bg-slate-100 hover:bg-amber-50 hover:text-amber-700 font-medium text-slate-700 px-2 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        title={tpl.description}
                      >
                        + {tpl.title}: <strong className="font-bold">{tpl.multiplierString}</strong>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* BLOCK 4: Malzeme & Baskı Şartnamesi */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <h4 className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-wider">
                    3. Malzeme & Baskı Spesifikasyonları
                  </h4>
                  {isBaskisiz && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-mono">
                      🔒 Baskısız Ürün - Baskı Renk & Klişe Maliyeti Muaf
                    </span>
                  )}
                </div>

                <div className="grid md:grid-cols-12 gap-4">
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Ölculer</label>
                    <input
                      type="text"
                      value={formData.olculer || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, olculer: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs px-3 py-2.5 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Hammadde Türü</label>
                    <input
                      type="text"
                      value={formData.hammadde_turu || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, hammadde_turu: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs px-3 py-2.5 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Kalınlık Seviyesi</label>
                    <input
                      type="text"
                      value={formData.kalinlik_seviyesi || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, kalinlik_seviyesi: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs px-3 py-2.5 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                    />
                  </div>

                  {/* Baskı Durumu Dropdown */}
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Baskı Durumu</label>
                    <select
                      value={formData.baski_durumu || "Baskılı"}
                      onChange={(e) => setFormData(prev => ({ ...prev, baski_durumu: e.target.value as any }))}
                      className={`w-full text-xs px-3 py-2.5 rounded-xl outline-none cursor-pointer font-extrabold ${
                        isBaskisiz
                          ? "bg-amber-50 border-amber-300 text-amber-800"
                          : "bg-indigo-50 border-indigo-300 text-indigo-800"
                      }`}
                    >
                      <option value="Baskılı">Baskılı</option>
                      <option value="Baskısız">Baskısız</option>
                    </select>
                  </div>

                  {/* BASKISIZ İSE GİZLENEN / BASKILI İSE AÇILAN ALANLAR */}
                  {!isBaskisiz ? (
                    <>
                      <div className="md:col-span-4 space-y-1">
                        <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Baskı Renk & Yön</label>
                        <input
                          type="text"
                          value={formData.baski_renk_yon || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, baski_renk_yon: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs px-3 py-2.5 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                        />
                      </div>

                      <div className="md:col-span-4 space-y-1">
                        <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Zemin Rengi</label>
                        <input
                          type="text"
                          value={formData.zemin_rengi || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, zemin_rengi: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs px-3 py-2.5 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="md:col-span-8 bg-slate-100/70 border border-slate-200 rounded-xl p-3 flex items-center space-x-2 text-xs text-slate-500 font-medium">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Baskısız ürünlerde baskı renk, zemin rengi ve klişe maliyeti otomatik olarak "0 + 0" ve "Muaf" kaydedilir.</span>
                    </div>
                  )}

                  {/* KÖRÜK DETAYI - Yalnızca PLASTİK POŞETLER ve KAĞIT VE KARTON ÇANTALAR için render */}
                  {activeRule.showKoruk && (
                    <div className="md:col-span-4 space-y-1">
                      <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Körük Detayı</label>
                      <input
                        type="text"
                        placeholder="Örn: Yok veya 5 cm Taban Körük"
                        value={formData.koruk_detayi || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, koruk_detayi: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs px-3 py-2.5 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* BLOCK 5: Yapısal Eklentiler & Üretim Parametreleri */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                  4. Eklentiler & Üretim Detayları
                </h4>
                <div className="grid md:grid-cols-12 gap-4">
                  
                  {/* Kulp Tipi (Dinamik Dropdown Options based on Category) */}
                  {activeRule.showKulpTipi && (
                    <div className="md:col-span-4 space-y-1">
                      <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Kulp / Sap Tipi</label>
                      <select
                        value={formData.kulp_tipi || (activeRule.kulpOptions ? activeRule.kulpOptions[0] : "Yok")}
                        onChange={(e) => setFormData(prev => ({ ...prev, kulp_tipi: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs px-3 py-2.5 rounded-xl focus:bg-white focus:border-indigo-600 outline-none cursor-pointer font-bold text-indigo-600"
                      >
                        {(activeRule.kulpOptions || ["Yok"]).map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Kargo Bant Tipi - Sadece E-TİCARET VE KARGO AMBALAJLARI için render */}
                  {activeRule.showKargoBant && (
                    <div className="md:col-span-4 space-y-1">
                      <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Kargo Bant Tipi</label>
                      <input
                        type="text"
                        placeholder="Tek Bant (Kalıcı)"
                        value={formData.kargo_bant_tipi || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, kargo_bant_tipi: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs px-3 py-2.5 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                      />
                    </div>
                  )}

                  {/* İrsaliye Cebi Detay - Sadece E-TİCARET VE KARGO AMBALAJLARI için render */}
                  {activeRule.showIrsaliyeCebi && (
                    <div className="md:col-span-4 space-y-1">
                      <label className="text-[10px] font-mono font-bold uppercase text-slate-500">İrsaliye Cebi Detay</label>
                      <input
                        type="text"
                        placeholder="Şeffaf İrsaliye Cebi Var"
                        value={formData.irsaliye_cebi_detay || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, irsaliye_cebi_detay: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs px-3 py-2.5 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                      />
                    </div>
                  )}

                  {/* Klişe Maliyeti - Sadece Baskılı olduğunda render */}
                  {!isBaskisiz && (
                    <div className="md:col-span-4 space-y-1">
                      <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Klişe Maliyeti</label>
                      <input
                        type="text"
                        placeholder="İlk Siparişte Var"
                        value={formData.klise_maliyeti || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, klise_maliyeti: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs px-3 py-2.5 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                      />
                    </div>
                  )}

                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Geri Dönüşüm Oranı</label>
                    <input
                      type="text"
                      value={formData.geridonusum_orani || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, geridonusum_orani: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs px-3 py-2.5 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                    />
                  </div>

                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Termin Süresi</label>
                    <input
                      type="text"
                      value={formData.termin_suresi || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, termin_suresi: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs px-3 py-2.5 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                    />
                  </div>

                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Uyumlu Sektörler</label>
                    <input
                      type="text"
                      value={formData.uyumlu_sektorler || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, uyumlu_sektorler: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs px-3 py-2.5 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                    />
                  </div>

                  <div className="md:col-span-12 space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Kullanım Amacı & Açıklama</label>
                    <input
                      type="text"
                      value={formData.kullanim_amaci || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, kullanim_amaci: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs px-3 py-2.5 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer border border-slate-200"
                >
                  İptal
                </button>

                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingProduct ? "Kaydediliyor..." : (editingProduct ? "Değişiklikleri Kaydet" : "Ürünü Oluştur")}
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

      {/* MULTIPLIER TEMPLATE EDIT / ADD MODAL */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-amber-600" />
                <h3 className="font-extrabold text-base text-slate-900">
                  {editingTemplate ? "Fiyat Çarpan Şablonunu Düzenle" : "Yeni Fiyat Çarpan Şablonu"}
                </h3>
              </div>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase text-slate-700 block">
                  Şablon Başlığı
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Kargo Poşeti Standart Kademe"
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:bg-white focus:border-amber-600 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase text-slate-700 block">
                  Çarpan Formatı (Miktar:Katsayı)
                </label>
                <input
                  type="text"
                  required
                  placeholder="5k:1.00 / 10k:0.92 / 25k:0.85"
                  value={templateValue}
                  onChange={(e) => setTemplateValue(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs px-3.5 py-2.5 rounded-xl focus:bg-white focus:border-amber-600 outline-none"
                />
                <p className="text-[10px] text-slate-400 font-mono">Örn: 5k:1.00 / 10k:0.92 / 25k:0.85 (veya 500:1.00 / 1k:0.88 / 3k:0.80)</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase text-slate-700 block">
                  Açıklama (Opsiyonel)
                </label>
                <input
                  type="text"
                  placeholder="5k (Standart) - 10k (%8 İndirim) - 25k (%15 İndirim)"
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:bg-white focus:border-amber-600 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer border border-slate-200"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSavingTemplate}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-amber-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isSavingTemplate ? "Kaydediliyor..." : (editingTemplate ? "Güncelle" : "Oluştur")}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* KATEGORİ EKLE / DÜZENLE MODALI (CATEGORY MODAL) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto"
          >
            {/* Modal Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <Tag className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-base text-slate-900">
                  {editingCategoryObj ? `Kategori Düzenle: ${editingCategoryObj.name}` : "Yeni Ambalaj Kategorisi Ekle"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveCategoryModal} className="p-6 overflow-y-auto space-y-5">
              
              {/* Field 1: Kategori Adı */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider block">
                  Kategori Adı <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={categoryFormData.name || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCategoryFormData(prev => ({
                      ...prev,
                      name: val,
                      slug: prev.slug || val.toLowerCase().replace(/[^a-z0-9]/g, '-')
                    }));
                  }}
                  placeholder="Örn: E-TİCARET VE KARGO AMBALAJLARI"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-medium text-sm px-4 py-2.5 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              {/* Field 2: Satış Birimleri Checkbox Group */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider block">
                  Satış Birimleri (En az 1 tane seçilmelidir)
                </label>
                <div className="flex flex-wrap gap-4 pt-1">
                  {["Adet", "Kg", "Adet (Rulo)", "Kg (Bobin)", "Paket"].map(unit => {
                    const currentUnits = Array.isArray(categoryFormData.units) ? categoryFormData.units : ["Adet"];
                    const isChecked = currentUnits.includes(unit);
                    return (
                      <label key={unit} className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            let nextUnits: string[];
                            if (e.target.checked) {
                              nextUnits = [...currentUnits, unit];
                            } else {
                              nextUnits = currentUnits.filter(u => u !== unit);
                            }
                            if (nextUnits.length === 0) nextUnits = ["Adet"];
                            setCategoryFormData(prev => ({ ...prev, units: nextUnits }));
                          }}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>{unit}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Field 3 & 4: Kalınlık Birimi & Default MOQ */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider block">
                    Kalınlık Ölçü Birimi
                  </label>
                  <select
                    value={categoryFormData.thickness_unit || categoryFormData.thickness || "Mikron"}
                    onChange={(e) => setCategoryFormData(prev => ({ ...prev, thickness_unit: e.target.value, thickness: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs px-3.5 py-2.5 rounded-xl focus:bg-white focus:border-indigo-600 outline-none cursor-pointer"
                  >
                    <option value="Mikron">Mikron (µm)</option>
                    <option value="Gr/m²">Gr/m² (Gramaj)</option>
                    <option value="mm">mm (Milimetre)</option>
                    <option value="cm">cm (Santimetre)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider block">
                    Varsayılan MOQ (Min. Sipariş)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={categoryFormData.default_moq !== undefined ? categoryFormData.default_moq : 1000}
                    onChange={(e) => setCategoryFormData(prev => ({ ...prev, default_moq: Number(e.target.value) }))}
                    placeholder="1000"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs px-3.5 py-2.5 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>
              </div>

              {/* Field 5: Alan İzinleri & Varyasyon Matrisi Switch'leri */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider block">
                  Alan İzinleri & Varyasyon Matrisi
                </label>
                <div className="grid sm:grid-cols-2 gap-2.5 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 text-xs font-semibold text-slate-800">
                  
                  <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!categoryFormData.fields?.kargo_bant}
                      onChange={(e) => setCategoryFormData(prev => ({
                        ...prev,
                        fields: { ...(prev.fields || { kargo_bant: false, kulp: true, koruk: true, irsaliye_cebi: false, baski: true }), kargo_bant: e.target.checked }
                      }))}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>Kargo Bant Tipi Açık mı?</span>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={categoryFormData.fields?.kulp ?? true}
                      onChange={(e) => setCategoryFormData(prev => ({
                        ...prev,
                        fields: { ...(prev.fields || { kargo_bant: false, kulp: true, koruk: true, irsaliye_cebi: false, baski: true }), kulp: e.target.checked }
                      }))}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>Kulp / Sap Tipi Açık mı?</span>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={categoryFormData.fields?.koruk ?? true}
                      onChange={(e) => setCategoryFormData(prev => ({
                        ...prev,
                        fields: { ...(prev.fields || { kargo_bant: false, kulp: true, koruk: true, irsaliye_cebi: false, baski: true }), koruk: e.target.checked }
                      }))}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>Körük Detayı Açık mı?</span>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!categoryFormData.fields?.irsaliye_cebi}
                      onChange={(e) => setCategoryFormData(prev => ({
                        ...prev,
                        fields: { ...(prev.fields || { kargo_bant: false, kulp: true, koruk: true, irsaliye_cebi: false, baski: true }), irsaliye_cebi: e.target.checked }
                      }))}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>İrsaliye Cebi Açık mı?</span>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer select-none sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={categoryFormData.fields?.baski ?? true}
                      onChange={(e) => setCategoryFormData(prev => ({
                        ...prev,
                        fields: { ...(prev.fields || { kargo_bant: false, kulp: true, koruk: true, irsaliye_cebi: false, baski: true }), baski: e.target.checked }
                      }))}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>Baskı Durumu Açık mı? (Baskılı / Baskısız)</span>
                  </label>

                </div>
              </div>

              {/* Field 6: İzin Verilen Hammaddeler */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider block">
                  İzin Verilen Hammaddeler (Virgülle ayırın)
                </label>
                <input
                  type="text"
                  value={
                    typeof categoryFormData.allowed_materials === "string"
                      ? categoryFormData.allowed_materials
                      : (Array.isArray(categoryFormData.allowed_materials) ? categoryFormData.allowed_materials.join(", ") : "")
                  }
                  onChange={(e) => setCategoryFormData(prev => ({ ...prev, allowed_materials: e.target.value }))}
                  placeholder="Örn: LDPE, HDPE, Co-Ex, Kraft"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-medium text-xs px-3.5 py-2.5 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSavingCategory}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingCategory ? "Kaydediliyor..." : "Kategoriyi Kaydet"}</span>
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: Yeni / Düzenle Rehber Makalesi */}
      {isArticleModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-extrabold text-lg text-slate-900 font-display">
                  {editingArticle ? "Rehber Makalesini Düzenle" : "Yeni Rehber Makalesi Ekle"}
                </h3>
              </div>
              <button
                onClick={() => setIsArticleModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveArticleModal} className="space-y-4 text-xs font-sans">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Makale Başlığı *</label>
                <input
                  type="text"
                  required
                  value={articleFormData.baslik || ""}
                  onChange={(e) => setArticleFormData(prev => ({ ...prev, baslik: e.target.value }))}
                  placeholder="örn: E-Ticarette Doğru Kargo Poşeti Seçimi..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium focus:bg-white focus:border-purple-600 outline-none"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Kategori</label>
                  <select
                    value={articleFormData.kategori || "E-TİCARET VE KARGO AMBALAJLARI"}
                    onChange={(e) => setArticleFormData(prev => ({ ...prev, kategori: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium focus:bg-white focus:border-purple-600 outline-none"
                  >
                    <option value="E-TİCARET VE KARGO AMBALAJLARI">E-TİCARET VE KARGO AMBALAJLARI</option>
                    <option value="PLASTİK POŞETLER">PLASTİK POŞETLER</option>
                    <option value="KAĞIT VE KARTON ÇANTALAR">KAĞIT VE KARTON ÇANTALAR</option>
                    <option value="BEZ VE TELA ÇANTALAR">BEZ VE TELA ÇANTALAR</option>
                    <option value="KORUYUCU VE ENDÜSTRİYEL AMBALAJ">KORUYUCU VE ENDÜSTRİYEL AMBALAJ</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">İlgili Ürün Seçimi</label>
                  <select
                    value={articleFormData.related_product || ""}
                    onChange={(e) => setArticleFormData(prev => ({ ...prev, related_product: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono text-xs focus:bg-white focus:border-purple-600 outline-none"
                  >
                    <option value="">Seçim Yapılmadı (Genel Rehber)</option>
                    {products.map((p) => (
                      <option key={p.urun_kodu} value={p.urun_kodu}>
                        {p.urun_kodu} - {p.urun_adi} ({p.olculer})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Kapak Görseli URL (Opsiyonel)</label>
                <input
                  type="text"
                  value={articleFormData.gorsel_url || ""}
                  onChange={(e) => setArticleFormData(prev => ({ ...prev, gorsel_url: e.target.value }))}
                  placeholder="örn: /images/rehber/kargo.jpg (Boş bırakılırsa ilgili ürünün görseli kullanılır)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono text-xs focus:bg-white focus:border-purple-600 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Alt Başlık / Spot Cümle</label>
                <input
                  type="text"
                  value={articleFormData.alt_baslik || ""}
                  onChange={(e) => setArticleFormData(prev => ({ ...prev, alt_baslik: e.target.value }))}
                  placeholder="örn: Ürün nakliyesinde kayıp ve hasar riskini sıfıra indiren ambalaj ipuçları"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium focus:bg-white focus:border-purple-600 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Özet (Kart Görünümü)</label>
                <textarea
                  rows={2}
                  value={articleFormData.ozet || ""}
                  onChange={(e) => setArticleFormData(prev => ({ ...prev, ozet: e.target.value }))}
                  placeholder="Makalenin liste kartında görünecek kısa özeti..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium focus:bg-white focus:border-purple-600 outline-none resize-y"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  Detaylı İçerik ve Paragraflar
                </label>
                <textarea
                  rows={6}
                  required
                  value={articleFormData.icerik || ""}
                  onChange={(e) => setArticleFormData(prev => ({ ...prev, icerik: e.target.value }))}
                  placeholder="Paragraflarınızı buraya yazın..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium focus:bg-white focus:border-purple-600 outline-none resize-y"
                />
              </div>

              {/* Dynamic S.S.S. (FAQ) Section */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="font-extrabold text-slate-900 text-xs">Sıkça Sorulan Sorular (S.S.S.)</h4>
                    <p className="text-[10px] text-slate-500">Google SEO zengin sonuçları (FAQSchema) ve akordeon kartları için dinamik S.S.S. maddeleri ekleyin.</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddSssItem}
                    className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-xs py-1.5 px-3 rounded-xl flex items-center space-x-1 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Soru & Cevap Ekle</span>
                  </button>
                </div>

                {Array.isArray(articleFormData.sss) && articleFormData.sss.length > 0 ? (
                  <div className="space-y-3 max-h-60 overflow-y-auto p-1">
                    {articleFormData.sss.map((item, index) => (
                      <div key={index} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 relative group">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-purple-700 uppercase">S.S.S. #{index + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSssItem(index)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Bu soruyu sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <input
                          type="text"
                          value={item.soru || ""}
                          onChange={(e) => handleSssChange(index, "soru", e.target.value)}
                          placeholder="Soru metni (örn: Kargo poşetlerinde ideal mikron kalınlığı kaç olmalıdır?)"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 font-semibold text-xs focus:border-purple-600 outline-none"
                        />

                        <textarea
                          rows={2}
                          value={item.cevap || ""}
                          onChange={(e) => handleSssChange(index, "cevap", e.target.value)}
                          placeholder="Cevap metni..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 text-xs focus:border-purple-600 outline-none resize-y font-medium"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-center">
                    Henüz özel S.S.S. sorusu eklenmedi. İsteğe bağlı olarak "+ Soru & Cevap Ekle" butonu ile ekleyebilirsiniz.
                  </p>
                )}
              </div>

              {/* SECTION: ARAMA MOTORU SEO ALANLARI */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5">
                <div className="flex items-center space-x-2 border-b border-slate-200/80 pb-2.5">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                    Arama Motoru SEO Alanları
                  </h4>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-slate-700 block text-[11px]">
                      SEO Başlığı (Meta Title)
                    </label>
                    <span className={`text-[10px] font-mono font-bold ${
                      (articleFormData.seo?.meta_title || "").length > 65 ? "text-rose-600" : "text-slate-400"
                    }`}>
                      {(articleFormData.seo?.meta_title || "").length} / 65 karakter
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={65}
                    value={articleFormData.seo?.meta_title || ""}
                    onChange={(e) => setArticleFormData(prev => ({
                      ...prev,
                      seo: { ...prev.seo, meta_title: e.target.value }
                    }))}
                    placeholder="örn: En Kaliteli Kargo Poşeti Çözümleri | Poset.com"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium text-xs focus:border-blue-600 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-slate-700 block text-[11px]">
                      Meta Açıklama (Description)
                    </label>
                    <span className={`text-[10px] font-mono font-bold ${
                      (articleFormData.seo?.meta_description || "").length > 160 ? "text-rose-600" : "text-slate-400"
                    }`}>
                      {(articleFormData.seo?.meta_description || "").length} / 160 karakter
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    maxLength={160}
                    value={articleFormData.seo?.meta_description || ""}
                    onChange={(e) => setArticleFormData(prev => ({
                      ...prev,
                      seo: { ...prev.seo, meta_description: e.target.value }
                    }))}
                    placeholder="örn: E-ticaret gönderileriniz için yırtılmaz kargo poşetlerinin toptan fiyatları ve teknik rehberi..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium text-xs focus:border-blue-600 outline-none resize-y"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 block text-[11px]">
                      Odak Anahtar Kelimeler (Virgülle Ayrılmış)
                    </label>
                    <input
                      type="text"
                      value={Array.isArray(articleFormData.seo?.keywords) ? articleFormData.seo.keywords.join(", ") : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        const kws = val ? val.split(",").map(k => k.trim()).filter(Boolean) : [];
                        setArticleFormData(prev => ({
                          ...prev,
                          seo: { ...prev.seo, keywords: kws }
                        }));
                      }}
                      placeholder="kargo poşeti, ambalaj, toptan poşet"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:border-blue-600 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 block text-[11px]">
                      Hedef Sevkiyat / Geo Bölge
                    </label>
                    <select
                      value={articleFormData.seo?.geo_region || "Tüm Türkiye"}
                      onChange={(e) => setArticleFormData(prev => ({
                        ...prev,
                        seo: { ...prev.seo, geo_region: e.target.value }
                      }))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium text-xs focus:border-blue-600 outline-none"
                    >
                      <option value="Tüm Türkiye">Tüm Türkiye</option>
                      <option value="İstanbul İçi Hızlı Teslimat">İstanbul İçi Hızlı Teslimat</option>
                      <option value="Yurt Dışı / İhracat">Yurt Dışı / İhracat</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION: GEO & YAPAY ZEKA ARAMA ALANLARI (AI Overviews Odaklı) */}
              <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-4 space-y-3.5">
                <div className="flex items-center space-x-2 border-b border-purple-200/80 pb-2.5">
                  <div className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="font-extrabold text-purple-950 text-xs uppercase tracking-wider">
                    GEO & Yapay Zeka Arama Alanları (AI Overviews)
                  </h4>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block text-[11px]">
                    Yapay Zeka Doğrudan Cevap / Tanım (Quick Answer)
                  </label>
                  <textarea
                    rows={2}
                    value={articleFormData.geo_ai?.quick_answer || ""}
                    onChange={(e) => setArticleFormData(prev => ({
                      ...prev,
                      geo_ai: { ...prev.geo_ai, quick_answer: e.target.value }
                    }))}
                    placeholder="AI arama motorlarının alıntılayacağı 2 cümlelik net tanım kutusu..."
                    className="w-full bg-white border border-purple-200/80 rounded-xl px-3 py-2 text-slate-900 font-medium text-xs focus:border-purple-600 outline-none resize-y"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 block text-[11px]">
                      Önemli Çıkarımlar / Maddeler (Key Takeaways - Maks. 4)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddKeyTakeaway}
                      disabled={(articleFormData.geo_ai?.key_takeaways || []).length >= 4}
                      className="bg-purple-100 hover:bg-purple-200 disabled:opacity-40 text-purple-800 font-bold text-[11px] py-1 px-2.5 rounded-lg flex items-center space-x-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Madde Ekle</span>
                    </button>
                  </div>

                  {Array.isArray(articleFormData.geo_ai?.key_takeaways) && articleFormData.geo_ai.key_takeaways.length > 0 ? (
                    <div className="space-y-2">
                      {articleFormData.geo_ai.key_takeaways.map((item, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <span className="font-mono text-[10px] font-bold text-purple-700 w-4">{index + 1}.</span>
                          <input
                            type="text"
                            value={item || ""}
                            onChange={(e) => handleKeyTakeawayChange(index, e.target.value)}
                            placeholder={`Madde #${index + 1} (örn: Yırtılma direnci yüksek LDPE hammadde)`}
                            className="flex-1 bg-white border border-purple-200/80 rounded-xl px-3 py-1.5 text-slate-900 font-medium text-xs focus:border-purple-600 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveKeyTakeaway(index)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">
                      Henüz özet maddesi eklenmedi. "+ Madde Ekle" butonuna basarak en fazla 4 adet özet maddesi tanımlayabilirsiniz.
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsArticleModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  İptal
                </button>

                <button
                  type="submit"
                  disabled={isSavingArticle}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-6 py-2.5 rounded-xl shadow-md shadow-purple-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isSavingArticle ? "Kaydediliyor..." : (editingArticle ? "Güncellemeleri Kaydet" : "Makaleyi Yayınla")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmProduct !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-extrabold text-base text-slate-900">Ürün Silinsin mi?</h4>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                <strong className="text-rose-600">{deleteConfirmProduct.urun_kodu}</strong> kodlu <strong className="text-slate-900">"{deleteConfirmProduct.urun_adi}"</strong> varyantı silinecektir.
                {products.filter(p => {
                  const pCode = String(p.urun_kodu || (p as any).sku || "").trim().toLowerCase();
                  const targetCode = String(deleteConfirmProduct.urun_kodu || (deleteConfirmProduct as any).sku || "").trim().toLowerCase();
                  if (pCode === targetCode) return false;
                  const pName = (p.urun_adi || "").trim().toLowerCase();
                  const cName = (deleteConfirmProduct.urun_adi || "").trim().toLowerCase();
                  return pName === cName || pName.includes(cName) || cName.includes(pName);
                }).length === 0 && (
                  <span className="block mt-2 text-[11px] text-amber-800 font-bold bg-amber-50 p-2 rounded-xl border border-amber-200 text-left">
                    ℹ Bu son standart varyant olduğu için ana ürün silinmeyecektir; sistemde "Standart Ölçüsüz (Sadece Özel İmalat)" olarak tutulacaktır.
                  </span>
                )}
              </p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setDeleteConfirmProduct(null)}
                disabled={isDeletingProduct}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer border border-slate-200"
              >
                Vazgeç
              </button>
              <button
                onClick={handleDeleteProduct}
                disabled={isDeletingProduct}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-rose-600/20 cursor-pointer disabled:opacity-50"
              >
                {isDeletingProduct ? "Siliniyor..." : "Evet, Sil"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 right-6 z-50 bg-[#0b1c3f] text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 border border-slate-800"
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
