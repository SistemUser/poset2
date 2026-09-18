export function getAssetUrl(filename: string): string {
  if (!filename) return "";
  if (filename.startsWith("http://") || filename.startsWith("https://") || filename.startsWith("data:")) {
    return filename;
  }
  const cleanName = filename.replace(/^(\/)?(assets\/)?/, "");
  
  if (typeof document !== "undefined") {
    const scripts = document.getElementsByTagName("script");
    for (let i = 0; i < scripts.length; i++) {
      const src = scripts[i].src || "";
      if (src.includes("/assets/")) {
        const base = src.substring(0, src.lastIndexOf("/assets/") + 8);
        return `${base}${cleanName}`;
      }
    }
  }
  return `assets/${cleanName}`;
}

export const IMAGES = {
  get factoryHero() { return "https://lh3.googleusercontent.com/aida-public/AB6AXuBVPXKnybVkew3XX-0sLBI-Hpx_Ofm2Tp3KhahPyMrNUoKRZiGd68YnW54I0xwPE9OyOK8iaQOmo_un1p3LRWB9nz8x6EGfOnHHOHZXRfOGSg_6f7sTEw00nbTovC4EllTecOQg4u8DcxovevGpRL6NqZNQGEziUkMl4ubDuJkwH8wj8reLPRQR6g8OEzei-43E0StqdKfMTkdXlAUpsUHd_LJ8gr0KgeTZXGgyiwUrXeamFTtvmZzzYVwPRcyjdYYOiZjoCy2HrH8"; },
  get kargoPlastik() { return getAssetUrl("kargo_plastik.png"); },
  get kargoCepli() { return getAssetUrl("kargo_cepli.png"); },
  get kargoKagit() { return getAssetUrl("kargo_kagit.png"); },
  get faturaCebi() { return getAssetUrl("fatura_cebi.png"); },
  get balonluZarf() { return getAssetUrl("balonlu_zarf.png"); },
  get magazaElGecme() { return getAssetUrl("magaza_el_gecme.png"); },
  get magazaSapli() { return getAssetUrl("magaza_sapli.png"); },
  get marketAtlet() { return getAssetUrl("market_atlet.png"); },
  get doypackKilitli() { return getAssetUrl("doypack_kilitli.png"); },
  get oppJelatin() { return getAssetUrl("opp_jelatin.png"); },
  get biyobozunur() { return getAssetUrl("biyobozunur.png"); },
  get kraftCanta() { return getAssetUrl("kraft_canta.png"); },
  get luksKarton() { return getAssetUrl("luks_karton.png"); },
  get keseKagidi() { return getAssetUrl("kese_kagidi.png"); },
  get telaCanta() { return getAssetUrl("tela_canta.png"); },
  get hamBez() { return getAssetUrl("ham_bez.png"); },
  get balonluPatpat() { return getAssetUrl("balonlu_patpat.png"); },
  get srinkFilm() { return getAssetUrl("srink_film.png"); },
  get kargoBag() { return getAssetUrl("kargo_plastik.png"); },
  get magazaBag() { return getAssetUrl("magaza_el_gecme.png"); },
  get kraftBag() { return getAssetUrl("kraft_canta.png"); },
  get moq3DPreview() { return getAssetUrl("balonlu_zarf.png"); },
  get adhesivePockets() { return getAssetUrl("doypack_kilitli.png"); }
};

export const INITIAL_PRODUCTS = [
  {
    id: "prod-1",
    name: "Premium CO-EX Kargo Poşeti",
    category: "kargo",
    material: "Co-Ex Polietilen (LDPE)",
    thickness: "70",
    pricePerUnit: 1.25,
    currency: "₺",
    moq: 10000,
    imageUrl: IMAGES.kargoPlastik,
    tags: ["Yırtılmaz", "Opak Siyah Astar", "Kalıcı Yapışkanlı"],
    capacity: "Mini - Midi - Maxi",
    description: "E-ticaret gönderileri için çift kat CO-EX yapısıyla yırtılmaya, patlamaya karşı ekstra dirençli ve özel gizlilik astarlı ambalaj ürünüdür."
  },
  {
    id: "prod-2",
    name: "Geri Dönüştürülebilir Kraft Çanta",
    category: "kraft",
    material: "90-120 gr/m² Kraft Kağıt (FSC Sertifikalı)",
    thickness: "110",
    pricePerUnit: 3.40,
    currency: "₺",
    moq: 5000,
    imageUrl: IMAGES.kraftCanta,
    tags: ["Eko-Dostu", "FSC Onaylı", "Güçlendirilmiş Sap"],
    capacity: "Hafif & Orta Yük",
    description: "Sürdürülebilir ticaret ilkelerine duyarlı çevre dostu kraft çanta; mağaza, gıda ve paket servis süreçleri için dayanıklı ve şık taşıma çözümü."
  },
  {
    id: "prod-3",
    name: "El Geçmeli Mağaza / Butik Poşeti",
    category: "magaza",
    material: "Alçak Yoğunluk Polietilen (LDPE)",
    thickness: "80",
    pricePerUnit: 1.85,
    currency: "₺",
    moq: 10000,
    imageUrl: IMAGES.magazaElGecme,
    tags: ["8 Renk Baskı", "Canlı Görünüm", "Yumuşak Tuşe"],
    capacity: "Butik Perakende",
    description: "Marka kimliğinizi en iyi yansıtan, yüksek parlaklıkta ve canlı baskı imkanına sahip yumuşak saplı veya el geçmeli özel perakende taşıma çantası."
  },
  {
    id: "prod-4",
    name: "Takviyeli Saplı Plastik Çanta",
    category: "magaza",
    material: "HDPE Ekstra Güçlü Plastik",
    thickness: "95",
    pricePerUnit: 2.10,
    currency: "₺",
    moq: 10000,
    imageUrl: IMAGES.magazaElGecme,
    tags: ["Ağır Taşıma", "Takviyeli Sap", "Pürüzsüz Doku"],
    capacity: "Orta & Ağır Ciltler",
    description: "Taşıma kapasitesini maksimum düzeye ulaştıran özel takviye kaynaklı sap bölmesi ile kozmetik, tekstil ve perakende mağazalarının vazgeçilmezi."
  },
  {
    id: "prod-5",
    name: "Geri Dönüşümlü Balonlu Kargo Zarfı",
    category: "kargo",
    material: "LDPE Balonlu Naylon + Co-Ex Laminasyon",
    thickness: "140",
    pricePerUnit: 2.75,
    currency: "₺",
    moq: 5000,
    imageUrl: IMAGES.balonluZarf,
    tags: ["Kırılabilir Ürün", "Korumalı Balon", "Hafiflik"],
    capacity: "Hassas Gönderiler",
    description: "Özellikle elektronik, aksesuar ve kırılgan yapıdaki butik siparişleriniz için iç yapısı hava kabarcıklı, dış yüzeyi neme karşı dayanıklı koruyucu zarf."
  },
  {
    id: "prod-6",
    name: "Kilitli (Doypack) Gıda & Kahve Torbası",
    category: "gida",
    material: "PET/ALU/PE Bariyer Laminasyon",
    thickness: "120",
    pricePerUnit: 4.20,
    currency: "₺",
    moq: 3000,
    imageUrl: IMAGES.doypackKilitli,
    tags: ["Aroma Korumalı", "Kilit Mekanizmalı", "U-Clip Açılış"],
    capacity: "Kahve & Kuru Gıda",
    description: "Oksijen ve nem bariyeri sağlayan çok katmanlı alüminyum laminasyonu ile gıda koruma standartlarına uygun dik duran zipli ambalaj çeşidi."
  }
];
