import React from 'react';
import { useQuote } from '../context/QuoteContext';

interface FooterProps {
  setActiveTab?: (tab: string) => void;
  setTab?: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ setActiveTab, setTab }) => {
  const { rfqSettings } = useQuote();
  const rawNumber = rfqSettings?.whatsappNumber || "905424086160";
  const cleanNumber = rawNumber.replace(/[^0-9]/g, "");

  const formatPhone = (num: string) => {
    const c = num.replace(/[^0-9]/g, "");
    if (c.length === 12 && c.startsWith("90")) {
      return `+90 (${c.slice(2, 5)}) ${c.slice(5, 8)} ${c.slice(8, 10)} ${c.slice(10, 12)}`;
    }
    return num;
  };

  const handleNav = (tab: string) => {
    const navFn = setTab || setActiveTab;
    if (navFn) {
      navFn(tab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-white border-t border-slate-200 mt-16 pt-12 pb-6 text-slate-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          {/* Kolon 1: Logo & Şirket Unvanı */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2.5 cursor-pointer group select-none" onClick={() => handleNav('home')}>
              {/* High-fidelity custom red & blue swirling emblem matching Header */}
              <div className="w-10 h-10 relative shrink-0 transition-transform duration-300 group-hover:scale-105">
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
                  <span className="text-[20px] font-black tracking-tight text-[#0A4294] font-sans">Poset</span>
                  <span className="text-[20px] font-black tracking-tight text-[#E11D48] font-sans">.com</span>
                </div>
                <span className="text-[8px] font-black text-[#0A4294] tracking-tight leading-none mt-1 font-sans">
                  Türkiye'nin Ambalaj Çözüm Merkezi
                </span>
              </div>
            </div>
            <p className="text-sm font-bold text-slate-800 pt-1">
              Ambalaj Market San. Tic. Ltd. Şti.
            </p>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
              Endüstriyel ambalaj sektöründe güven ve operasyonel verimlilik odaklı B2B çözüm ortağınız.
            </p>
          </div>

          {/* Kolon 2: Ürünlerimiz */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">ÜRÜNLERİMİZ</h4>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li><button onClick={() => handleNav('catalog')} className="hover:text-blue-600 transition-colors">Kargo & E-Ticaret Poşetleri</button></li>
              <li><button onClick={() => handleNav('catalog')} className="hover:text-blue-600 transition-colors">Mağaza Poşetleri</button></li>
              <li><button onClick={() => handleNav('catalog')} className="hover:text-blue-600 transition-colors">Market Poşetleri</button></li>
              <li><button onClick={() => handleNav('catalog')} className="hover:text-blue-600 transition-colors">Kağıt & Kraft Çantalar</button></li>
              <li><button onClick={() => handleNav('catalog')} className="hover:text-blue-600 transition-colors">Endüstriyel Rulolar</button></li>
            </ul>
          </div>

          {/* Kolon 3: Kurumsal */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">KURUMSAL</h4>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li><button onClick={() => handleNav('about')} className="hover:text-blue-600 transition-colors">Hakkımızda</button></li>
              <li><button onClick={() => handleNav('references')} className="hover:text-blue-600 transition-colors">Referanslarımız</button></li>
              <li><button onClick={() => handleNav('contact')} className="hover:text-blue-600 transition-colors">İletişim & Fabrika</button></li>
              <li><button onClick={() => handleNav('guide')} className="hover:text-blue-600 font-medium text-blue-700 transition-colors">Ambalaj Rehberi</button></li>
            </ul>
          </div>

          {/* Kolon 4: İletişim (Orijinal Bilgiler) */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">İLETİŞİM</h4>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span>Cemal Yener Tosyalı Cad. No:50 Vefa / İSTANBUL</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                <a href="tel:+902125260036" className="hover:text-blue-600">+90 (212) 526 00 36</a>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.587 1.961.947 3.208.947 3.182 0 5.768-2.586 5.768-5.766 0-3.18-2.586-5.766-5.768-5.766zm0-2.172c4.379 0 7.931 3.552 7.931 7.938 0 4.385-3.552 7.937-7.931 7.937-1.428 0-2.766-.381-3.927-1.043l-4.104 1.077 1.096-4.01c-.732-1.205-1.157-2.617-1.157-4.129 0-4.386 3.552-7.938 7.931-7.938z" /></svg>
                <a href={`https://wa.me/${cleanNumber}`} target="_blank" rel="noreferrer" className="hover:text-emerald-600">
                  {formatPhone(rawNumber)}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                <a href="mailto:info@poset.com" className="hover:text-blue-600">info@poset.com</a>
              </li>
            </ul>
          </div>

        </div>

        {/* Alt Satır: Copyright */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 gap-2">
          <p>© 2026 Ambalaj Market - Türkiye'nin Ambalaj Çözüm Merkezi. Tüm Hakları Saklıdır.</p>
          <p>
            <a
              href="https://reksa.net/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 transition-colors duration-200"
              title="Reksa Web Tasarım ve Yazılım Çözümleri"
            >
              Web Tasarım
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
