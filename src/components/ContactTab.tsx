import React from 'react';
import { MapPin, Phone, Mail, Clock, MessageSquare, ExternalLink } from 'lucide-react';

interface ContactTabProps {
  setTab?: (tab: any) => void;
}

export default function ContactTab({ setTab }: ContactTabProps) {
  return (
    <div className="bg-white text-slate-800 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="inline-flex items-center space-x-2 bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-full text-xs font-bold text-blue-700">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span>Müşteri Hizmetleri & Satış Desteği</span>
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
            Bize Ulaşın & İletişim
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            Toptan ambalaj siparişleriniz, özel klişe/baskı talepleriniz ve numune incelemeleri için satış ekibimizle doğrudan iletişime geçin.
          </p>
        </div>

        {/* 4 Contact Information Cards Grid (Expanded full width) */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Address */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fabrika / Merkez Adresi</p>
              <p className="font-bold text-slate-900 text-base mt-1 leading-snug">
                Cemal Yener Tosyalı Cad. No:50 Vefa / Fatih / İSTANBUL
              </p>
            </div>
          </div>

          {/* Card 2: Phone */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center shrink-0">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Santral / Telefon</p>
              <a href="tel:+902125260036" className="font-bold text-slate-900 text-lg hover:text-blue-600 transition-colors mt-1 block font-mono">
                +90 (212) 526 00 36
              </a>
              <p className="text-xs text-slate-500 font-medium mt-1">Müşteri Temsilcisi Hattı</p>
            </div>
          </div>

          {/* Card 3: E-Posta */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-rose-100 text-rose-700 rounded-2xl flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">E-Posta Adresi</p>
              <a href="mailto:info@poset.com" className="font-bold text-slate-900 text-base hover:text-rose-600 transition-colors mt-1 block">
                info@poset.com
              </a>
            </div>
          </div>

          {/* Card 4: Working Hours */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Çalışma Saatleri</p>
              <p className="font-bold text-slate-900 text-sm mt-1">
                Pazartesi - Cuma: 08:30 - 18:30
              </p>
              <p className="font-semibold text-slate-600 text-xs mt-0.5">
                Cumartesi: 09:00 - 13:00
              </p>
            </div>
          </div>

        </div>

        {/* Large Expanded Google Map Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <span>Harita ve Konum Bilgisi</span>
            </h3>
            <a
              href="https://maps.google.com/maps?q=Ambalaj%20Market%20Cemal%20Yener%20Tosyali%20Cad.%20No:50%20Vefa%20Istanbul"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
            >
              <span>Google Maps'te Aç</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="rounded-3xl overflow-hidden border border-slate-200 h-[480px] relative shadow-md">
            <iframe
              title="Fabrika Konumu"
              src="https://maps.google.com/maps?q=Ambalaj%20Market%20Cemal%20Yener%20Tosyali%20Cad.%20No:50%20Vefa%20Istanbul&t=&z=16&ie=UTF8&iwloc=&output=embed"
              className="w-full h-full border-0"
              allowFullScreen={false}
              loading="lazy"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
