import React from 'react';
import { Sparkles, Building2 } from 'lucide-react';

interface ReferencesTabProps {
  setTab?: (tab: any) => void;
}

export default function ReferencesTab({ setTab }: ReferencesTabProps) {
  return (
    <div className="bg-white text-slate-800 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-full text-xs font-bold text-emerald-700">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>Güçlü İş Ortaklarımız</span>
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
            Referanslarımız & İş Ortaklarımız
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            Fabrikamızda ürettiğimiz marka logolu, yüksek kaliteli baskılı ambalaj çözümlerimizle Türkiye'nin ve dünyanın önde gelen 500'den fazla kurumsal markasına hizmet veriyoruz.
          </p>
        </div>

        {/* References Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center hover:shadow-md transition-all">
            <p className="font-black text-[#E31B23] text-base tracking-tight">arçelik</p>
            <p className="text-[10px] text-slate-500 font-bold mt-1.5 uppercase">Teknoloji & Mağaza</p>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center hover:shadow-md transition-all">
            <p className="font-extrabold text-slate-900 text-sm tracking-widest uppercase">ARMİNE</p>
            <p className="text-[10px] text-slate-500 font-bold mt-1.5 uppercase">Premium Tekstil</p>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center hover:shadow-md transition-all">
            <p className="font-black text-[#009E49] text-sm leading-tight">BEREKET<br/><span className="text-red-600 text-[10px]">DÖNER</span></p>
            <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">Gıda Ambalajı</p>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center hover:shadow-md transition-all">
            <p className="font-bold text-[#0A2B5C] text-sm tracking-tight">ENGLISH HOME</p>
            <p className="text-[10px] text-slate-500 font-bold mt-1.5 uppercase">Ev Tekstili Çantası</p>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center hover:shadow-md transition-all">
            <p className="font-serif font-semibold text-[#0B4C30] text-xs leading-tight">EYÜP SABRİ TUNCER<br/><span className="text-[9px] font-mono text-slate-400">1923</span></p>
            <p className="text-[10px] text-slate-500 font-bold mt-1.5 uppercase">Logolu Kraft Çanta</p>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center hover:shadow-md transition-all">
            <p className="font-black text-[#E20074] text-sm tracking-tight">flormar</p>
            <p className="text-[10px] text-slate-500 font-bold mt-1.5 uppercase">Kozmetik Poşetleri</p>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center hover:shadow-md transition-all">
            <p className="font-extrabold text-[#5D1F87] bg-yellow-300 px-2 py-0.5 rounded text-sm tracking-tight inline-block">gratis</p>
            <p className="text-[10px] text-slate-500 font-bold mt-1.5 uppercase">Baskılı Plastik</p>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center hover:shadow-md transition-all">
            <p className="font-black text-[#1D3172] text-sm tracking-widest">HUNCA</p>
            <p className="text-[10px] text-slate-500 font-bold mt-1.5 uppercase">Kozmetik Çözümleri</p>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center hover:shadow-md transition-all">
            <p className="font-black text-rose-700 text-xs border-y border-slate-300 py-0.5 tracking-tighter">INTEGRAL JEANS</p>
            <p className="text-[10px] text-slate-500 font-bold mt-1.5 uppercase">Tekstil Ambalajı</p>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center hover:shadow-md transition-all">
            <p className="font-serif font-black text-[#C5A059] text-xs leading-tight">KAYSERİ MUTFAĞI</p>
            <p className="text-[10px] text-slate-500 font-bold mt-1.5 uppercase">Paket Servis Torbası</p>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center hover:shadow-md transition-all">
            <p className="font-black text-[#FF5E00] text-sm">Link <span className="text-slate-800 text-xs">tech</span></p>
            <p className="text-[10px] text-slate-500 font-bold mt-1.5 uppercase">Elektronik Kutulu</p>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center hover:shadow-md transition-all">
            <p className="font-extrabold text-slate-900 text-base tracking-tight">LTB <span className="text-xs font-normal">Jeans</span></p>
            <p className="text-[10px] text-slate-500 font-bold mt-1.5 uppercase">Mağaza Ambalajı</p>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center hover:shadow-md transition-all">
            <p className="font-medium text-slate-800 text-xs tracking-widest uppercase">MADAME COCO</p>
            <p className="text-[10px] text-slate-500 font-bold mt-1.5 uppercase">Ekolojik Kâğıt Çantası</p>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center hover:shadow-md transition-all">
            <p className="font-bold text-[#005CB9] text-sm tracking-tight">Panasonic</p>
            <p className="text-[10px] text-slate-500 font-bold mt-1.5 uppercase">Yüksek Mukavemetli</p>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center hover:shadow-md transition-all">
            <p className="font-black text-[#E30613] text-sm border border-[#E30613] px-1.5 rounded inline-block">PAPA JOHN'S</p>
            <p className="text-[10px] text-slate-500 font-bold mt-1.5 uppercase">Sıcak Paket Korumalı</p>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center hover:shadow-md transition-all">
            <p className="font-extrabold text-[#E30613] text-sm tracking-tighter">R@SSMANN</p>
            <p className="text-[10px] text-slate-500 font-bold mt-1.5 uppercase">Çevre Dostu Biyobozunur</p>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center hover:shadow-md transition-all">
            <p className="font-serif italic font-black text-[#7C1236] text-xs leading-none">Saray<br/><span className="text-[9px] font-sans tracking-widest not-italic">1935</span></p>
            <p className="text-[10px] text-slate-500 font-bold mt-1.5 uppercase">Paket Servis Taşıma</p>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center hover:shadow-md transition-all">
            <p className="font-black text-slate-800 text-sm tracking-wider">SILVERLINE</p>
            <p className="text-[10px] text-slate-500 font-bold mt-1.5 uppercase">Ağır Hizmet Poşeti</p>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center hover:shadow-md transition-all">
            <p className="font-black text-[#005CB9] border-x-2 border-[#FF5500] px-1 text-sm">TEKZEN</p>
            <p className="text-[10px] text-slate-500 font-bold mt-1.5 uppercase">Endüstriyel Paket</p>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center hover:shadow-md transition-all">
            <p className="font-black text-[#009B4E] text-sm tracking-tight">uludağ <span className="text-[10px] font-normal block text-rose-600 leading-none">İÇECEK</span></p>
            <p className="text-[10px] text-slate-500 font-bold mt-1.5 uppercase">Isıl Isı Büzüşmeli</p>
          </div>
        </div>

        {/* Quality Banner */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-3xl p-6 sm:p-8 flex items-start space-x-4">
          <Sparkles className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 text-base">Kurumsal Kalite Güvencesi</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Tüm paydaşlarımıza Pantone standartlarına sadık, yüksek çözünürlüklü 8 renge kadar flekso klik baskı kalitesi ve ücretsiz klişe/tasarım desteği sağlıyoruz.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
