import React from 'react';
import { ShieldCheck, Award, Factory, Truck, Sparkles } from 'lucide-react';

interface AboutTabProps {
  setTab?: (tab: any) => void;
}

export default function AboutTab({ setTab }: AboutTabProps) {
  return (
    <div className="bg-white text-slate-800 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        
        {/* Hero Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-flex items-center space-x-2 bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-full text-xs font-bold text-blue-700">
            <Award className="w-4 h-4 text-blue-600" />
            <span>Türkiye'nin Ambalaj Çözüm Merkezi</span>
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Ambalaj Market San. Tic. Ltd. Şti. (Poset.com)
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            1992 yılından bu yana ambalaj sektöründeki 30 yılı aşkın tecrübemiz ve yüksek üretim kapasitemizle markanıza değer katıyoruz.
          </p>
        </div>

        {/* Corporate Grid */}
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-5 text-slate-600 text-sm sm:text-base leading-relaxed">
            <p className="text-lg font-bold text-[#0A369D]">
              Bir poşet, sadece bir ambalaj değil; markanızın şehir sokaklarındaki temsilcisidir.
            </p>
            <p>
              Müşteriniz mağazanızdan veya e-ticaret sitenizden siparişini teslim aldığında, dokunduğu ilk şey ambalajınızdır. <strong>Poset.com</strong> olarak, bu ilk izlenimin kusursuz olması için gelişmiş flexo baskı teknolojileri, dayanıklı hammadde bileşimleri ve çevre dostu biyobozunur standartlar sunuyoruz.
            </p>
            <p>
              Modern üretim tesislerimizde; el geçme poşetler, takviyeli ve yumuşak saplı mağaza poşetleri, atlet poşetler, e-ticaret kargo torbaları ve doğa dostu bez/tela çantalar üretiyoruz. İstanbul Fatih Vefa bölgesindeki merkez fabrikamızdan Türkiye'nin ve dünyanın 81 iline doğrudan gönderim gerçekleştiriyoruz.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Factory className="w-6 h-6 text-blue-600" />
              Üretim ve Kalite Rakamlarımız
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                <p className="text-3xl font-black text-[#0A369D]">30+</p>
                <p className="text-xs text-slate-500 font-medium mt-1">Yıllık Sektör Tecrübesi</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                <p className="text-3xl font-black text-emerald-600">8</p>
                <p className="text-xs text-slate-500 font-medium mt-1">Renk Flekso Baskı Kalitesi</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                <p className="text-3xl font-black text-rose-600">500+</p>
                <p className="text-xs text-slate-500 font-medium mt-1">Kurumsal Referans Marka</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                <p className="text-3xl font-black text-amber-600">%100</p>
                <p className="text-xs text-slate-500 font-medium mt-1">Zamanında Teslimat Oranı</p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid sm:grid-cols-3 gap-6 pt-6">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs space-y-3">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-lg">Yüksek Kalite Standartları</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Mikron kalınlık toleranslarına sadık, yüksek çekme ve yırtılma dirençli hammaddelerle üretiyoruz.
            </p>
          </div>

          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs space-y-3">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-lg">Ücretsiz Klişe & Tasarım</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Grafik ekibimiz logonuzu baskıya hazırlar, renk eşlemesini (Pantone) yapar ve teknik onayınıza sunar.
            </p>
          </div>

          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs space-y-3">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
              <Truck className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-lg">Fabrikadan Doğrudan Teslimat</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Aracı olmadan doğrudan üretim bandından en uygun fiyat teklifleriyle kapınıza kadar sevk edilir.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
