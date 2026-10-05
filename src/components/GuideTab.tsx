import React, { useState, useEffect, useMemo } from "react";
import { Article } from "../types";
import { getApiEndpoint } from "../utils/urlHelper";
import { getImgSrc, handleImageError } from "../utils/imageHelper";
import { 
  BookOpen, 
  Clock, 
  Calendar, 
  ArrowLeft, 
  ArrowRight, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Package, 
  Tag, 
  CheckCircle2, 
  Search,
  BookMarked,
  Bot,
  Globe
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface GuideTabProps {
  setTab: (tab: "home" | "catalog" | "assistant" | "admin" | "guide", categoryKey?: string | null) => void;
}

const OFFICIAL_CATEGORIES = [
  "Tümü",
  "E-TİCARET VE KARGO AMBALAJLARI",
  "PLASTİK POŞETLER",
  "KAĞIT VE KARTON ÇANTALAR",
  "BEZ VE TELA ÇANTALAR",
  "KORUYUCU VE ENDÜSTRİYEL AMBALAJ"
];

interface FaqPair {
  question: string;
  answer: string;
}

export default function GuideTab({ setTab }: GuideTabProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Tümü");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  useEffect(() => {
    fetchArticles();
  }, []);

  // Dynamically update document title & meta description for SEO & GEO
  useEffect(() => {
    if (selectedArticle) {
      const metaTitle = selectedArticle.seo?.meta_title || selectedArticle.baslik || (selectedArticle as any).title;
      if (metaTitle) {
        document.title = `${metaTitle} | Poset.com Ambalaj Rehberi`;
      }

      const metaDesc = selectedArticle.seo?.meta_description || selectedArticle.ozet || (selectedArticle as any).summary || selectedArticle.alt_baslik || "";
      if (metaDesc) {
        let metaEl = document.querySelector('meta[name="description"]');
        if (!metaEl) {
          metaEl = document.createElement('meta');
          metaEl.setAttribute('name', 'description');
          document.head.appendChild(metaEl);
        }
        metaEl.setAttribute('content', metaDesc);
      }
    } else {
      document.title = "Ambalaj Rehberi & E-Ticaret Lojistik İpuçları | Poset.com";
    }
  }, [selectedArticle]);

  const trNormalize = (str: string) => {
    if (!str) return "";
    return str
      .replace(/İ/g, "i")
      .replace(/I/g, "ı")
      .replace(/Ğ/g, "g")
      .replace(/Ü/g, "ü")
      .replace(/Ş/g, "ş")
      .replace(/Ö/g, "ö")
      .replace(/Ç/g, "ç")
      .trim()
      .toLowerCase();
  };

  const fetchArticles = async () => {
    setLoading(true);
    const candidateUrls = [
      typeof getApiEndpoint === 'function' ? getApiEndpoint('/api/articles') : '/api/articles',
      typeof getApiEndpoint === 'function' ? getApiEndpoint('/api/api.php?action=articles') : '/api/api.php?action=articles',
      typeof getApiEndpoint === 'function' ? getApiEndpoint('/api/admin.php?action=articles') : '/api/admin.php?action=articles',
      '/data/articles.json',
      '/api/data/articles.json'
    ];

    for (const url of candidateUrls) {
      try {
        const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`);
        if (res.ok) {
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("application/json") || url.endsWith(".json")) {
            const data = await res.json();
            const list = Array.isArray(data) ? data : (data.articles || data.data || []);
            if (Array.isArray(list) && list.length > 0) {
              console.log(`Rehber makaleleri (${url}) adresinden başarıyla yüklendi:`, list.length);
              setArticles(list);
              setLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.warn(`URL denemesi başarısız (${url}):`, err);
      }
    }
    setLoading(false);
  };


  // Filter articles based on active category & search query
  const filteredArticles = useMemo(() => {
    const normSelected = trNormalize(selectedCategory || "all");
    const isShowAll = !normSelected || normSelected === "all" || normSelected === "tümü" || normSelected === "tumu" || normSelected === "hepsi";

    const q = trNormalize(searchQuery || "");

    return (articles || []).filter((art: any) => {
      // Kategori Eşleşmesi
      const artCat = trNormalize(art.kategori || art.category || "");
      const matchesCategory = isShowAll || artCat === normSelected;

      // Arama Eşleşmesi
      const title = trNormalize(art.baslik || art.title || "");
      const summary = trNormalize(art.ozet || art.summary || art.alt_baslik || "");
      const matchesSearch = !q || title.includes(q) || summary.includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [articles, selectedCategory, searchQuery]);


  // Helper to parse content into standard text blocks and structured Q&A (FAQ) accordions
  const parseArticleContent = (content: string) => {
    const cleanContent = (content || "")
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n");

    const lines = cleanContent.split("\n");
    const paragraphs: string[] = [];
    const faqs: FaqPair[] = [];

    let currentQ = "";
    let currentA = "";

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const qMatch = trimmed.match(/^(?:S|Soru|Q):\s*(.+)$/i);
      const aMatch = trimmed.match(/^(?:C|Cevap|A):\s*(.+)$/i);

      if (qMatch) {
        if (currentQ && currentA) {
          faqs.push({ question: currentQ, answer: currentA });
          currentA = "";
        }
        currentQ = qMatch[1];
      } else if (aMatch) {
        currentA = aMatch[1];
      } else if (currentQ && !currentA) {
        // Line following question without C:
        currentA = trimmed;
      } else if (currentQ && currentA) {
        // End of previous QA block
        faqs.push({ question: currentQ, answer: currentA });
        currentQ = "";
        currentA = "";
        paragraphs.push(trimmed);
      } else {
        paragraphs.push(trimmed);
      }
    });

    if (currentQ && currentA) {
      faqs.push({ question: currentQ, answer: currentA });
    }

    return { paragraphs, faqs };
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Hero Banner (Only shown when no article is open) */}
        {!selectedArticle && (
          <div className="bg-gradient-to-b from-slate-50/80 via-white to-white border-b border-slate-200/80 py-12 mb-8 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden shadow-xs border border-slate-200">
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-4">
                <BookMarked className="w-4 h-4 text-blue-600" />
                <span>Ambalaj Rehberi & Teknik Bilgi Merkezi</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3">
                Ambalaj Teknolojisi ve E-Ticaret Lojistik İpuçları
              </h1>
              <p className="text-slate-600 text-sm max-w-2xl mx-auto leading-relaxed mb-6">
                Poşet seçimi, kargo ambalaj güvenliği, mikron kalınlığı hesaplama ve doğa dostu ambalaj standartları hakkında uzman rehberlerimizi inceleyin.
              </p>

              {/* Search Bar inside Hero */}
              <div className="pt-2 w-full max-w-xl mx-auto">
                <div className="relative">
                  <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rehberlerde başlık veya konu ara... (örn: kargo, mikron, tela)"
                    className="w-full max-w-xl mx-auto bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm pl-12"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ARTICLE DETAIL VIEW */}
        {/* ============================================================ */}
        {selectedArticle ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Top Back Action Bar */}
            <button
              onClick={() => setSelectedArticle(null)}
              className="inline-flex items-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>← Tüm Rehberlere Dön</span>
            </button>

            {/* Article Grid Layout (Main Content + Sticky Sidebar) */}
            <div className="grid lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Main Article Container */}
              <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8">
                
                {/* Meta info */}
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center space-x-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-[11px] px-3 py-1 rounded-full uppercase tracking-wider">
                      <Tag className="w-3 h-3" />
                      <span>{selectedArticle.kategori || (selectedArticle as any).category}</span>
                    </span>

                    <span className="inline-flex items-center space-x-1 text-slate-500 text-xs font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedArticle.tarih || (selectedArticle as any).date}</span>
                    </span>

                    <span className="inline-flex items-center space-x-1 text-slate-500 text-xs font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedArticle.okuma_suresi || (selectedArticle as any).readTime || '4 dk'} okuma süresi</span>
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 font-display leading-snug">
                    {selectedArticle.baslik || (selectedArticle as any).title}
                  </h1>

                  {(selectedArticle.alt_baslik || (selectedArticle as any).subtitle) && (
                    <p className="text-lg text-slate-600 font-medium leading-relaxed border-l-4 border-indigo-600 pl-4 py-1">
                      {selectedArticle.alt_baslik || (selectedArticle as any).subtitle}
                    </p>
                  )}
                </div>

                {/* Optional Cover Image Banner (Only if it's a real product image, not default logo) */}
                {selectedArticle.gorsel_url && !selectedArticle.gorsel_url.includes('posetlogo') && (
                  <div className="w-full my-6 flex justify-center">
                    <img
                      src={getImgSrc(selectedArticle.gorsel_url)}
                      alt={selectedArticle.baslik || (selectedArticle as any).title}
                      className="max-h-72 w-full object-contain bg-slate-50/70 border border-slate-200 rounded-2xl p-6 my-6"
                      onError={handleImageError}
                    />
                  </div>
                )}

                <hr className="border-slate-100" />

                {/* Hızlı Bilgi & Ürün Özeti Bilgi Kutusu */}
                {(() => {
                  const quickAns = selectedArticle.geo_ai?.quick_answer || selectedArticle.ozet || selectedArticle.alt_baslik;
                  const rawTakeaways = selectedArticle.geo_ai?.key_takeaways || [];
                  const takeaways = (Array.isArray(rawTakeaways) && rawTakeaways.filter(Boolean).length > 0)
                    ? rawTakeaways.filter(Boolean)
                    : [selectedArticle.alt_baslik, selectedArticle.ozet].filter(Boolean);

                  return (
                    <div className="bg-gradient-to-br from-blue-50/90 via-slate-50 to-indigo-50/50 border border-blue-200/80 rounded-2xl p-5 sm:p-6 my-6 space-y-4 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-blue-100 pb-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <h3 className="font-extrabold text-sm text-slate-900 font-display">
                            Hızlı Bilgi & Ürün Özeti
                          </h3>
                        </div>
                        {(selectedArticle.seo?.geo_region || "Tüm Türkiye") && (
                          <span className="inline-flex items-center space-x-1 bg-white border border-blue-200 text-blue-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                            <span>📍 {selectedArticle.seo?.geo_region || "Tüm Türkiye"}</span>
                          </span>
                        )}
                      </div>

                      {/* Quick Answer */}
                      {quickAns && (
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">Kısaca Nedir?</span>
                          <p className="text-slate-800 text-sm font-semibold leading-relaxed">
                            {quickAns}
                          </p>
                        </div>
                      )}

                      {/* Key Takeaways */}
                      {takeaways.length > 0 && (
                        <div className="space-y-2 pt-1 border-t border-blue-100/60">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Öne Çıkan Avantajlar:</span>
                          <ul className="grid sm:grid-cols-2 gap-2 text-xs font-medium text-slate-700">
                            {takeaways.map((item, tIdx) => (
                              <li key={tIdx} className="flex items-start space-x-2 bg-white/80 p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                <span className="leading-snug text-slate-800">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Article Body Content & Dynamic S.S.S. */}
                {(() => {
                  const { paragraphs, faqs: parsedFaqs } = parseArticleContent(selectedArticle.icerik);
                  
                  // Use structured sss array if available, otherwise fallback to parsed FAQs from content
                  const activeFaqs: FaqPair[] = (Array.isArray(selectedArticle.sss) && selectedArticle.sss.length > 0)
                    ? selectedArticle.sss.map(s => ({ question: s.soru, answer: s.cevap }))
                    : parsedFaqs;

                  return (
                    <div className="space-y-4 text-slate-800 text-base leading-relaxed">
                      
                      {/* TechArticle / Article JSON-LD Schema Script */}
                      <script
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{
                          __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "TechArticle",
                            "headline": selectedArticle.seo?.meta_title || selectedArticle.baslik,
                            "description": selectedArticle.seo?.meta_description || selectedArticle.ozet,
                            "image": selectedArticle.gorsel_url ? [selectedArticle.gorsel_url] : ["https://www.poset.com/templates/untitled/images/designer/28d090dc364360f397250cc88c7b8290_posetlogo3.png"],
                            "datePublished": selectedArticle.tarih || "2026-09-20",
                            "dateModified": selectedArticle.tarih || "2026-09-20",
                            "author": {
                              "@type": "Organization",
                              "name": "Poset.com Ambalaj Uzmanları",
                              "url": "https://poset.com"
                            },
                            "publisher": {
                              "@type": "Organization",
                              "name": "Ambalaj Market San. Tic. Ltd. Şti.",
                              "logo": {
                                "@type": "ImageObject",
                                "url": "https://www.poset.com/templates/untitled/images/designer/28d090dc364360f397250cc88c7b8290_posetlogo3.png"
                              }
                            },
                            "keywords": (selectedArticle.seo?.keywords || []).join(", ") || selectedArticle.kategori,
                            "inLanguage": "tr-TR"
                          })
                        }}
                      />

                      {/* Google SEO FAQPage JSON-LD Schema Script */}
                      {activeFaqs.length > 0 && (
                        <script
                          type="application/ld+json"
                          dangerouslySetInnerHTML={{
                            __html: JSON.stringify({
                              "@context": "https://schema.org",
                              "@type": "FAQPage",
                              "mainEntity": activeFaqs.map(faq => ({
                                "@type": "Question",
                                "name": faq.question,
                                "acceptedAnswer": {
                                  "@type": "Answer",
                                  "text": faq.answer
                                }
                              }))
                            })
                          }}
                        />
                      )}

                      {paragraphs.map((p, idx) => {
                        const trimmed = p.trim();
                        if (!trimmed) return null;

                        // Headline formatting (ends with ? or short title string)
                        if (trimmed.endsWith('?') || (trimmed.length < 75 && !trimmed.startsWith('•') && !trimmed.startsWith('-') && !trimmed.includes('\n'))) {
                          return (
                            <h3 key={idx} className="text-lg font-bold text-slate-900 mt-6 mb-3 font-display">
                              {trimmed}
                            </h3>
                          );
                        }

                        // Bullet list formatting (starts with • or - or contains newlines with bullets)
                        if (trimmed.startsWith('•') || trimmed.includes('\n•') || trimmed.startsWith('- ') || trimmed.includes('\n- ')) {
                          const items = trimmed.split('\n').map(item => item.trim()).filter(Boolean);
                          return (
                            <ul key={idx} className="my-3 space-y-1.5 pl-2">
                              {items.map((item, i) => {
                                const cleanItem = item.replace(/^[•\-\*]\s*/, '').trim();
                                if (!cleanItem) return null;
                                return (
                                  <li key={i} className="text-slate-700 text-sm flex items-start gap-2 leading-relaxed">
                                    <span className="text-blue-600 font-bold shrink-0">•</span>
                                    <span>{cleanItem}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          );
                        }

                        // Normal paragraph formatting
                        return (
                          <p key={idx} className="text-slate-600 leading-relaxed text-sm sm:text-base mb-4 font-normal">
                            {trimmed}
                          </p>
                        );
                      })}

                      {/* S.S.S. (FAQ) Accordion Section */}
                      {activeFaqs.length > 0 && (
                        <div className="pt-6 space-y-4 border-t border-slate-100">
                          <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-lg font-display">
                            <HelpCircle className="w-5 h-5 text-blue-600" />
                            <h3>Sıkça Sorulan Sorular (S.S.S.)</h3>
                          </div>

                          <div className="space-y-3">
                            {activeFaqs.map((faq, fIdx) => {
                              const isOpen = openFaqIndex === fIdx;
                              return (
                                <div
                                  key={fIdx}
                                  className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50 transition-colors"
                                >
                                  <button
                                    onClick={() => setOpenFaqIndex(isOpen ? null : fIdx)}
                                    className="w-full text-left px-5 py-4 flex items-center justify-between font-bold text-slate-900 text-sm hover:bg-slate-100/80 transition-colors cursor-pointer"
                                  >
                                    <span className="pr-4">{faq.question}</span>
                                    {isOpen ? (
                                      <ChevronUp className="w-4 h-4 text-blue-600 shrink-0" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                                    )}
                                  </button>

                                  {isOpen && (
                                    <div className="px-5 pb-4 text-sm text-slate-600 font-medium leading-relaxed border-t border-slate-200/60 pt-3 bg-white">
                                      {faq.answer}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

              </div>

              {/* Right Sticky Sidebar (CTA Panel) */}
              <div className="lg:col-span-4 sticky top-24 space-y-6">
                
                {/* CTA Box 1: Direct Product & Catalog Link */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm border-t-4 border-t-blue-600 space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Bu Ürünü Katalogda Gör & Fiyat Hesapla
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Doğrudan Üreticiden Tedarik
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Makalede bahsi geçen ambalaj tipleri için özel ölçü, logo baskı ve toptan birim fiyatları hemen hesaplayın.
                  </p>

                  {selectedArticle.related_product && (
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 flex justify-between items-center text-xs">
                      <span className="text-slate-500">İlgili Ürün Kodu:</span>
                      <strong className="text-blue-700 font-bold">{selectedArticle.related_product}</strong>
                    </div>
                  )}

                  <button
                    onClick={() => setTab("catalog")}
                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Ürünlerimiz Kataloğuna Git</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setTab("assistant")}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
                  >
                    <span>Özel Teklif İste</span>
                  </button>
                </div>

                {/* Benefits Box */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2.5">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                    Poset.com Üretim Avantajları
                  </h4>
                  <ul className="space-y-2 text-xs font-medium text-slate-600">
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Ücretsiz Klişe ve Tasarım Desteği</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>7-12 İş Günü Hızlı Termin Süresi</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>8 Renk Flekso Yüksek Baskı Kalitesi</span>
                    </li>
                  </ul>
                </div>

              </div>

            </div>

          </motion.div>
        ) : (
          /* ============================================================ */
          /* ARTICLES LIST VIEW */
          /* ============================================================ */
          <div className="space-y-8">
            
            {/* Category Filter Tabs Header */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
              {OFFICIAL_CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`whitespace-nowrap px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer border ${
                      isActive
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Articles Grid */}
            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                    <div className="h-6 bg-slate-200 rounded w-3/4" />
                    <div className="h-16 bg-slate-100 rounded" />
                    <div className="h-10 bg-slate-200 rounded" />
                  </div>
                ))}
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center space-y-3">
                <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="font-extrabold text-slate-900 text-lg">Bu kategoride makale bulunamadı</h3>
                <p className="text-slate-500 text-xs font-medium">Lütfen diğer kategorileri veya arama teriminizi kontrol edin.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredArticles.map((article: any) => (
                  <motion.div
                    key={article.id}
                    layout
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div className="space-y-4">
                      {/* Category Badge & Meta */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                          {article.kategori || article.category}
                        </span>

                        <div className="flex items-center space-x-1 text-slate-400 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{article.okuma_suresi || article.readTime || '4 dk'}</span>
                        </div>
                      </div>

                      {/* Article Titles */}
                      <div className="space-y-1.5">
                        <h2 className="font-extrabold text-slate-900 text-lg font-display group-hover:text-indigo-600 transition-colors line-clamp-2">
                          {article.baslik || article.title}
                        </h2>
                        {(article.alt_baslik || article.subtitle) && (
                          <p className="text-xs font-semibold text-slate-500 line-clamp-1">
                            {article.alt_baslik || article.subtitle}
                          </p>
                        )}
                      </div>

                      {/* Article Summary */}
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 font-normal">
                        {article.ozet || article.summary}
                      </p>
                    </div>

                    {/* Card Footer Button */}
                    <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between">
                      <span className="text-[11px] font-mono text-slate-400 font-medium">
                        {article.tarih || article.date}
                      </span>

                      <button
                        onClick={() => setSelectedArticle(article)}
                        className="inline-flex items-center space-x-1.5 bg-slate-900 group-hover:bg-indigo-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
                      >
                        <span>Rehberi Oku</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
