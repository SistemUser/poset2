process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import express from "express";
import path from "path";
import fs from "fs";
import tls from "tls";
import dotenv from "dotenv";

import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { safeWriteJson, safeReadJson } from "./src/lib/fileHelper";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

app.use(express.json());

// Top-level static asset serving for public directory and images
app.use(express.static(path.join(process.cwd(), 'public')));
app.use(express.static('public'));
app.use('/images', express.static(path.join(process.cwd(), 'public', 'images')));

// Lazy-initialization of Gemini client for robust recovery
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY") {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Complete ground-truth products taxonomy matching the 20 listed types
const PRODUCTS_TAXONOMY = [
  {
    name: "Baskılı (Logolu) Kargo Poşetleri",
    keywords: ["baskılı (logolu) kargo poşetleri", "baskılı kargo", "logolu kargo", "baskılı poşet", "krg-2030-01", "krg-2432-02", "krg-2838-03", "krg-3040-04", "krg-3545-05", "krg-4050-06", "krg-4555-07", "krg-5060-08"],
    category: "kargoPlastik",
    material: "Co-Ex (LDPE)",
    thickness: "65 Mikron",
    closure: "Tek Bant (Kalıcı)",
    price: 1.45,
    eco: 65,
    type: "kargo",
    details: [
      "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
      "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
      "Hammadde: Co-Ex (LDPE) | Kalınlık: 65 Mikron | Termin: 7 İş Günü"
    ],
    variants: [
      {
        urun_kodu: "KRG-2030-01",
        olculer: "20 x 30 + 5 (Kapak)",
        material: "Co-Ex (LDPE)",
        thickness: "65 Mikron",
        closure: "Tek Bant (Kalıcı)",
        price: 0.87,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 65,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Co-Ex (LDPE) | Kalınlık: 65 Mikron | Termin: 7 İş Günü"
        ]
      },
      {
        urun_kodu: "KRG-2432-02",
        olculer: "24 x 32 + 5 (Kapak)",
        material: "Co-Ex (LDPE)",
        thickness: "65 Mikron",
        closure: "Tek Bant (Kalıcı)",
        price: 0.93,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 65,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Co-Ex (LDPE) | Kalınlık: 65 Mikron | Termin: 7 İş Günü"
        ]
      },
      {
        urun_kodu: "KRG-2838-03",
        olculer: "28 x 38 + 5 (Kapak)",
        material: "Co-Ex (LDPE)",
        thickness: "65 Mikron",
        closure: "Tek Bant (Kalıcı)",
        price: 1.29,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 65,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Co-Ex (LDPE) | Kalınlık: 65 Mikron | Termin: 7 İş Günü"
        ]
      },
      {
        urun_kodu: "KRG-3040-04",
        olculer: "30 x 40 + 5 (Kapak)",
        material: "Co-Ex (LDPE)",
        thickness: "65 Mikron",
        closure: "Tek Bant (Kalıcı)",
        price: 1.45,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 65,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Co-Ex (LDPE) | Kalınlık: 65 Mikron | Termin: 7 İş Günü"
        ]
      },
      {
        urun_kodu: "KRG-3545-05",
        olculer: "35 x 45 + 5 (Kapak)",
        material: "Co-Ex (LDPE)",
        thickness: "65 Mikron",
        closure: "Tek Bant (Kalıcı)",
        price: 1.9,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 65,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Co-Ex (LDPE) | Kalınlık: 65 Mikron | Termin: 7 İş Günü"
        ]
      },
      {
        urun_kodu: "KRG-4050-06",
        olculer: "40 x 50 + 5 (Kapak)",
        material: "Co-Ex (LDPE)",
        thickness: "70 Mikron",
        closure: "Tek Bant (Kalıcı)",
        price: 2.42,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 65,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Co-Ex (LDPE) | Kalınlık: 70 Mikron | Termin: 7 İş Günü"
        ]
      },
      {
        urun_kodu: "KRG-4555-07",
        olculer: "45 x 55 + 5 (Kapak)",
        material: "Co-Ex (LDPE)",
        thickness: "70 Mikron",
        closure: "Tek Bant (Kalıcı)",
        price: 2.99,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 65,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Co-Ex (LDPE) | Kalınlık: 70 Mikron | Termin: 7 İş Günü"
        ]
      },
      {
        urun_kodu: "KRG-5060-08",
        olculer: "50 x 60 + 5 (Kapak)",
        material: "Co-Ex (LDPE)",
        thickness: "75 Mikron",
        closure: "Tek Bant (Kalıcı)",
        price: 3.19,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 65,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Co-Ex (LDPE) | Kalınlık: 75 Mikron | Termin: 7 İş Günü"
        ]
      }
    ]
  },
  {
    name: "Cepli (Kendinden Fatura Cepli) Kargo Poşetleri",
    keywords: ["cepli (kendinden fatura cepli) kargo poşetleri", "cepli kargo", "cepli kurye", "cepli poşet", "krg-2030-09", "krg-2432-10", "krg-2838-11", "krg-3040-12", "krg-3545-13", "krg-4050-14", "krg-4555-15", "krg-5060-16"],
    category: "kargoCepli",
    material: "Co-Ex (LDPE)",
    thickness: "70 Mikron",
    closure: "Tek Bant (Kalıcı)",
    price: 1.35,
    eco: 65,
    type: "kargo",
    details: [
      "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
      "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
      "Hammadde: Co-Ex (LDPE) | Kalınlık: 70 Mikron | Termin: 2 İş Günü"
    ],
    variants: [
      {
        urun_kodu: "KRG-2030-09",
        olculer: "20 x 30 + 5 (Kapak)",
        material: "Co-Ex (LDPE)",
        thickness: "70 Mikron",
        closure: "Tek Bant (Kalıcı)",
        price: 0.81,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 65,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Co-Ex (LDPE) | Kalınlık: 70 Mikron | Termin: 2 İş Günü"
        ]
      },
      {
        urun_kodu: "KRG-2432-10",
        olculer: "24 x 32 + 5 (Kapak)",
        material: "Co-Ex (LDPE)",
        thickness: "70 Mikron",
        closure: "Tek Bant (Kalıcı)",
        price: 0.86,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 65,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Co-Ex (LDPE) | Kalınlık: 70 Mikron | Termin: 2 İş Günü"
        ]
      },
      {
        urun_kodu: "KRG-2838-11",
        olculer: "28 x 38 + 5 (Kapak)",
        material: "Co-Ex (LDPE)",
        thickness: "70 Mikron",
        closure: "Tek Bant (Kalıcı)",
        price: 1.2,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 65,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Co-Ex (LDPE) | Kalınlık: 70 Mikron | Termin: 2 İş Günü"
        ]
      },
      {
        urun_kodu: "KRG-3040-12",
        olculer: "30 x 40 + 5 (Kapak)",
        material: "Co-Ex (LDPE)",
        thickness: "70 Mikron",
        closure: "Tek Bant (Kalıcı)",
        price: 1.35,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 65,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Co-Ex (LDPE) | Kalınlık: 70 Mikron | Termin: 2 İş Günü"
        ]
      },
      {
        urun_kodu: "KRG-3545-13",
        olculer: "35 x 45 + 5 (Kapak)",
        material: "Co-Ex (LDPE)",
        thickness: "70 Mikron",
        closure: "Tek Bant (Kalıcı)",
        price: 1.77,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 65,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Co-Ex (LDPE) | Kalınlık: 70 Mikron | Termin: 2 İş Günü"
        ]
      },
      {
        urun_kodu: "KRG-4050-14",
        olculer: "40 x 50 + 5 (Kapak)",
        material: "Co-Ex (LDPE)",
        thickness: "70 Mikron",
        closure: "Tek Bant (Kalıcı)",
        price: 2.25,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 65,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Co-Ex (LDPE) | Kalınlık: 70 Mikron | Termin: 2 İş Günü"
        ]
      },
      {
        urun_kodu: "KRG-4555-15",
        olculer: "45 x 55 + 5 (Kapak)",
        material: "Co-Ex (LDPE)",
        thickness: "75 Mikron",
        closure: "Tek Bant (Kalıcı)",
        price: 2.78,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 65,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Co-Ex (LDPE) | Kalınlık: 75 Mikron | Termin: 2 İş Günü"
        ]
      },
      {
        urun_kodu: "KRG-5060-16",
        olculer: "50 x 60 + 5 (Kapak)",
        material: "Co-Ex (LDPE)",
        thickness: "75 Mikron",
        closure: "Tek Bant (Kalıcı)",
        price: 2.97,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 65,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Co-Ex (LDPE) | Kalınlık: 75 Mikron | Termin: 2 İş Günü"
        ]
      }
    ]
  },
  {
    name: "Standart (Baskısız) Kargo Poşetleri",
    keywords: ["standart (baskısız) kargo poşetleri", "standart kargo", "baskısız kargo", "düz kargo", "gri kargo", "kargo poşeti", "krg-2030-17", "krg-2432-18", "krg-2838-19", "krg-3040-20", "krg-3545-21", "krg-4050-22", "krg-4555-23", "krg-5060-24"],
    category: "kargoPlastik",
    material: "Co-Ex (LDPE)",
    thickness: "60 Mikron",
    closure: "Tek Bant (Kalıcı)",
    price: 1.25,
    eco: 65,
    type: "kargo",
    details: [
      "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
      "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
      "Hammadde: Co-Ex (LDPE) | Kalınlık: 60 Mikron | Termin: 2 İş Günü"
    ],
    variants: [
      {
        urun_kodu: "KRG-2030-17",
        olculer: "20 x 30 + 5 (Kapak)",
        material: "Co-Ex (LDPE)",
        thickness: "60 Mikron",
        closure: "Tek Bant (Kalıcı)",
        price: 0.75,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 65,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Co-Ex (LDPE) | Kalınlık: 60 Mikron | Termin: 2 İş Günü"
        ]
      },
      {
        urun_kodu: "KRG-2432-18",
        olculer: "24 x 32 + 5 (Kapak)",
        material: "Co-Ex (LDPE)",
        thickness: "60 Mikron",
        closure: "Tek Bant (Kalıcı)",
        price: 0.8,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 65,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Co-Ex (LDPE) | Kalınlık: 60 Mikron | Termin: 2 İş Günü"
        ]
      },
      {
        urun_kodu: "KRG-2838-19",
        olculer: "28 x 38 + 5 (Kapak)",
        material: "Co-Ex (LDPE)",
        thickness: "60 Mikron",
        closure: "Tek Bant (Kalıcı)",
        price: 1.11,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 65,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Co-Ex (LDPE) | Kalınlık: 60 Mikron | Termin: 2 İş Günü"
        ]
      },
      {
        urun_kodu: "KRG-3040-20",
        olculer: "30 x 40 + 5 (Kapak)",
        material: "Co-Ex (LDPE)",
        thickness: "60 Mikron",
        closure: "Tek Bant (Kalıcı)",
        price: 1.25,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 65,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Co-Ex (LDPE) | Kalınlık: 60 Mikron | Termin: 2 İş Günü"
        ]
      },
      {
        urun_kodu: "KRG-3545-21",
        olculer: "35 x 45 + 5 (Kapak)",
        material: "Co-Ex (LDPE) ",
        thickness: "60 Mikron",
        closure: "Tek Bant (Kalıcı)",
        price: 1.64,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 65,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Co-Ex (LDPE)  | Kalınlık: 60 Mikron | Termin: 2 İş Günü"
        ]
      },
      {
        urun_kodu: "KRG-4050-22",
        olculer: "40 x 50 + 5 (Kapak)",
        material: "Co-Ex (LDPE)",
        thickness: "70 Mikron",
        closure: "Tek Bant (Kalıcı)",
        price: 2.08,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 65,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Co-Ex (LDPE) | Kalınlık: 70 Mikron | Termin: 2 İş Günü"
        ]
      },
      {
        urun_kodu: "KRG-4555-23",
        olculer: "45 x 55 + 5 (Kapak)",
        material: "Co-Ex (LDPE)",
        thickness: "70 Mikron",
        closure: "Tek Bant (Kalıcı)",
        price: 2.58,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 65,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Co-Ex (LDPE) | Kalınlık: 70 Mikron | Termin: 2 İş Günü"
        ]
      },
      {
        urun_kodu: "KRG-5060-24",
        olculer: "50 x 60 + 5 (Kapak)",
        material: "Co-Ex (LDPE)",
        thickness: "75 Mikron",
        closure: "Tek Bant (Kalıcı)",
        price: 2.75,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 65,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Co-Ex (LDPE) | Kalınlık: 75 Mikron | Termin: 2 İş Günü"
        ]
      }
    ]
  },
  {
    name: "Kağıt Kargo Poşetleri",
    keywords: ["kağıt kargo poşetleri", "kağıt kargo", "kraft kargo", "kağıt kurye", "krg-2030-25", "krg-2432-26", "krg-3040-27"],
    category: "kargoKagit",
    material: "Kahverengi Kraft",
    thickness: "110 Gr/m²",
    closure: "Tek Bant (Kalıcı)",
    price: 2.8,
    eco: 95,
    type: "kraft",
    details: [
      "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
      "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
      "Hammadde: Kahverengi Kraft | Kalınlık: 110 Gr/m² | Termin: 2 İş Günü"
    ],
    variants: [
      {
        urun_kodu: "KRG-2030-25",
        olculer: "20 x 30 + 5 (Kapak)",
        material: "Kahverengi Kraft",
        thickness: "110 Gr/m²",
        closure: "Tek Bant (Kalıcı)",
        price: 1.85,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 95,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Kahverengi Kraft | Kalınlık: 110 Gr/m² | Termin: 2 İş Günü"
        ]
      },
      {
        urun_kodu: "KRG-2432-26",
        olculer: "24 x 32 + 5 (Kapak)",
        material: "Kahverengi Kraft",
        thickness: "110 Gr/m²",
        closure: "Tek Bant (Kalıcı)",
        price: 2.36,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 95,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Kahverengi Kraft | Kalınlık: 110 Gr/m² | Termin: 2 İş Günü"
        ]
      },
      {
        urun_kodu: "KRG-3040-27",
        olculer: "30 x 40 + 5 (Kapak)",
        material: "Kahverengi Kraft",
        thickness: "120 Gr/m²",
        closure: "Tek Bant (Kalıcı)",
        price: 3.69,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 95,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Kahverengi Kraft | Kalınlık: 120 Gr/m² | Termin: 2 İş Günü"
        ]
      }
    ]
  },
  {
    name: "Fatura Cebi ve İrsaliye Zarfları",
    keywords: ["fatura cebi ve i̇rsaliye zarfları", "fatura cebi", "irsaliye zarfı", "fatura poşeti", "fatura zarfı", "krg-1424-28", "krg-1824-29", "krg-2432-30"],
    category: "faturaCebi",
    material: "LDPE (Şeffaf)",
    thickness: "40 Mikron",
    closure: "Kendinden Yapışkanlı",
    price: 0.45,
    eco: 65,
    type: "kargo",
    details: [
      "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
      "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
      "Hammadde: LDPE (Şeffaf) | Kalınlık: 40 Mikron | Termin: 2 İş Günü"
    ],
    variants: [
      {
        urun_kodu: "KRG-1424-28",
        olculer: "14 x 24 (C5 Boyut)",
        material: "LDPE (Şeffaf)",
        thickness: "40 Mikron",
        closure: "Kendinden Yapışkanlı",
        price: 0.27,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 65,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: LDPE (Şeffaf) | Kalınlık: 40 Mikron | Termin: 2 İş Günü"
        ]
      },
      {
        urun_kodu: "KRG-1824-29",
        olculer: "18 x 24 (Standart)",
        material: "LDPE (Şeffaf)",
        thickness: "40 Mikron",
        closure: "Kendinden Yapışkanlı",
        price: 0.27,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 65,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: LDPE (Şeffaf) | Kalınlık: 40 Mikron | Termin: 2 İş Günü"
        ]
      },
      {
        urun_kodu: "KRG-2432-30",
        olculer: "24 x 32 (A4 Boyut)",
        material: "LDPE (Şeffaf)",
        thickness: "45 Mikron",
        closure: "Kendinden Yapışkanlı",
        price: 0.29,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 65,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: LDPE (Şeffaf) | Kalınlık: 45 Mikron | Termin: 2 İş Günü"
        ]
      }
    ]
  },
  {
    name: "Balonlu Kargo Zarfları",
    keywords: ["balonlu kargo zarfları", "balonlu kargo", "balonlu zarf", "patpatlı kargo", "korumalı zarf", "krg-1525-31", "krg-2025-32", "krg-2535-33", "krg-3040-34"],
    category: "balonluZarf",
    material: "Kraft + Balon PE",
    thickness: "110 Mikron",
    closure: "Tek Bant (Kalıcı)",
    price: 2.75,
    eco: 95,
    type: "kargo",
    details: [
      "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
      "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
      "Hammadde: Kraft + Balon PE | Kalınlık: 110 Mikron | Termin: 2 İş Günü"
    ],
    variants: [
      {
        urun_kodu: "KRG-1525-31",
        olculer: "15 x 25 + 4 (Kapak)",
        material: "Kraft + Balon PE",
        thickness: "110 Mikron",
        closure: "Tek Bant (Kalıcı)",
        price: 1.65,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 95,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Kraft + Balon PE | Kalınlık: 110 Mikron | Termin: 2 İş Günü"
        ]
      },
      {
        urun_kodu: "KRG-2025-32",
        olculer: "20 x 25 + 4 (Kapak)",
        material: "Kraft + Balon PE",
        thickness: "110 Mikron",
        closure: "Tek Bant (Kalıcı)",
        price: 1.65,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 95,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Kraft + Balon PE | Kalınlık: 110 Mikron | Termin: 2 İş Günü"
        ]
      },
      {
        urun_kodu: "KRG-2535-33",
        olculer: "25 x 35 + 4 (Kapak)",
        material: "Kraft + Balon PE",
        thickness: "110 Mikron",
        closure: "Tek Bant (Kalıcı)",
        price: 2.01,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 95,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Kraft + Balon PE | Kalınlık: 110 Mikron | Termin: 2 İş Günü"
        ]
      },
      {
        urun_kodu: "KRG-3040-34",
        olculer: "30 x 40 + 4 (Kapak)",
        material: "Kraft + Balon PE",
        thickness: "120 Mikron",
        closure: "Tek Bant (Kalıcı)",
        price: 2.75,
        multipliers: {"5000": 1.0, "10000": 0.92, "25000": 0.85},
        eco: 95,
        details: [
          "Güvenli kargo ve e-ticaret lojistik sevkiyatı",
          "Uyumlu Sektörler: E-Ticaret, Tekstil, Lojistik, Kozmetik",
          "Hammadde: Kraft + Balon PE | Kalınlık: 120 Mikron | Termin: 2 İş Günü"
        ]
      }
    ]
  },
  {
    name: "Mağaza Poşeti - El Geçme",
    keywords: ["mağaza poşeti - el geçme", "el geçme", "el geçmeli", "butik poşeti", "perakende poşet", "mgz-2030-35", "mgz-2638-36", "mgz-3345-37", "mgz-4050-38", "mgz-5060-39"],
    category: "magazaElGecme",
    material: "LDPE (Parlak)",
    thickness: "60 Mikron",
    closure: "El Geçme (Punch)",
    price: 1.85,
    eco: 65,
    type: "plastik",
    details: [
      "Marka logolu perakende alışveriş taşımacılığı",
      "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
      "Hammadde: LDPE (Parlak) | Kalınlık: 60 Mikron | Termin: 12 İş Günü"
    ],
    variants: [
      {
        urun_kodu: "MGZ-2030-35",
        olculer: "20 x 30 + 5 (Alt Körük)",
        material: "LDPE (Parlak)",
        thickness: "60 Mikron",
        closure: "El Geçme (Punch)",
        price: 1.11,
        multipliers: {},
        eco: 65,
        details: [
          "Marka logolu perakende alışveriş taşımacılığı",
          "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
          "Hammadde: LDPE (Parlak) | Kalınlık: 60 Mikron | Termin: 12 İş Günü"
        ]
      },
      {
        urun_kodu: "MGZ-2638-36",
        olculer: "26 x 38 + 6 (Alt Körük)",
        material: "LDPE (Parlak)",
        thickness: "60 Mikron",
        closure: "El Geçme (Punch)",
        price: 1.16,
        multipliers: {},
        eco: 65,
        details: [
          "Marka logolu perakende alışveriş taşımacılığı",
          "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
          "Hammadde: LDPE (Parlak) | Kalınlık: 60 Mikron | Termin: 12 İş Günü"
        ]
      },
      {
        urun_kodu: "MGZ-3345-37",
        olculer: "33 x 45 + 6 (Alt Körük)",
        material: "LDPE (Parlak)",
        thickness: "60 Mikron",
        closure: "El Geçme (Punch)",
        price: 1.74,
        multipliers: {},
        eco: 65,
        details: [
          "Marka logolu perakende alışveriş taşımacılığı",
          "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
          "Hammadde: LDPE (Parlak) | Kalınlık: 60 Mikron | Termin: 12 İş Günü"
        ]
      },
      {
        urun_kodu: "MGZ-4050-38",
        olculer: "40 x 50 + 8 (Alt Körük)",
        material: "LDPE (Parlak)",
        thickness: "70 Mikron",
        closure: "El Geçme (Punch)",
        price: 2.35,
        multipliers: {},
        eco: 65,
        details: [
          "Marka logolu perakende alışveriş taşımacılığı",
          "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
          "Hammadde: LDPE (Parlak) | Kalınlık: 70 Mikron | Termin: 12 İş Günü"
        ]
      },
      {
        urun_kodu: "MGZ-5060-39",
        olculer: "50 x 60 + 8 (Alt Körük)",
        material: "LDPE (Parlak)",
        thickness: "70 Mikron",
        closure: "El Geçme (Punch)",
        price: 3.52,
        multipliers: {},
        eco: 65,
        details: [
          "Marka logolu perakende alışveriş taşımacılığı",
          "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
          "Hammadde: LDPE (Parlak) | Kalınlık: 70 Mikron | Termin: 12 İş Günü"
        ]
      }
    ]
  },
  {
    name: "Mağaza Poşeti - Takviyeli",
    keywords: ["mağaza poşeti - takviyeli", "takviyeli", "takviyeli sap", "takviyeli poşet", "mgz-2638-40", "mgz-3345-41", "mgz-4050-42", "mgz-5060-43"],
    category: "magazaElGecme",
    material: "LDPE (Alçak Yoğ.)",
    thickness: "70 Mikron",
    closure: "Takviyeli El Geçme",
    price: 2.1,
    eco: 65,
    type: "plastik",
    details: [
      "Marka logolu perakende alışveriş taşımacılığı",
      "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
      "Hammadde: LDPE (Alçak Yoğ.) | Kalınlık: 70 Mikron | Termin: 12 İş Günü"
    ],
    variants: [
      {
        urun_kodu: "MGZ-2638-40",
        olculer: "26 x 38 + 6 (Alt Körük)",
        material: "LDPE (Alçak Yoğ.)",
        thickness: "70 Mikron",
        closure: "Takviyeli El Geçme",
        price: 1.32,
        multipliers: {},
        eco: 65,
        details: [
          "Marka logolu perakende alışveriş taşımacılığı",
          "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
          "Hammadde: LDPE (Alçak Yoğ.) | Kalınlık: 70 Mikron | Termin: 12 İş Günü"
        ]
      },
      {
        urun_kodu: "MGZ-3345-41",
        olculer: "33 x 45 + 6 (Alt Körük)",
        material: "LDPE (Alçak Yoğ.)",
        thickness: "70 Mikron",
        closure: "Takviyeli El Geçme",
        price: 1.98,
        multipliers: {},
        eco: 65,
        details: [
          "Marka logolu perakende alışveriş taşımacılığı",
          "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
          "Hammadde: LDPE (Alçak Yoğ.) | Kalınlık: 70 Mikron | Termin: 12 İş Günü"
        ]
      },
      {
        urun_kodu: "MGZ-4050-42",
        olculer: "40 x 50 + 8 (Alt Körük)",
        material: "LDPE (Alçak Yoğ.)",
        thickness: "70 Mikron",
        closure: "Takviyeli El Geçme",
        price: 2.67,
        multipliers: {},
        eco: 65,
        details: [
          "Marka logolu perakende alışveriş taşımacılığı",
          "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
          "Hammadde: LDPE (Alçak Yoğ.) | Kalınlık: 70 Mikron | Termin: 12 İş Günü"
        ]
      },
      {
        urun_kodu: "MGZ-5060-43",
        olculer: "50 x 60 + 10 (Alt Körük)",
        material: "LDPE (Alçak Yoğ.)",
        thickness: "80 Mikron",
        closure: "Takviyeli El Geçme",
        price: 4.0,
        multipliers: {},
        eco: 65,
        details: [
          "Marka logolu perakende alışveriş taşımacılığı",
          "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
          "Hammadde: LDPE (Alçak Yoğ.) | Kalınlık: 80 Mikron | Termin: 12 İş Günü"
        ]
      }
    ]
  },
  {
    name: "Mağaza Poşeti - Yumuşak Saplı",
    keywords: ["mağaza poşeti - yumuşak saplı", "yumuşak sap", "saplı mağaza", "kulplu poşet", "şerit kulplu", "mgz-2638-44", "mgz-3345-45", "mgz-4050-46", "mgz-5060-47"],
    category: "magazaSapli",
    material: "LDPE (Yumuşak)",
    thickness: "80 Mikron",
    closure: "Yumuşak Sap (Soft)",
    price: 2.3,
    eco: 65,
    type: "plastik",
    details: [
      "Marka logolu perakende alışveriş taşımacılığı",
      "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
      "Hammadde: LDPE (Yumuşak) | Kalınlık: 80 Mikron | Termin: 12 İş Günü"
    ],
    variants: [
      {
        urun_kodu: "MGZ-2638-44",
        olculer: "26 x 38 + 8 (Alt Körük)",
        material: "LDPE (Yumuşak)",
        thickness: "80 Mikron",
        closure: "Yumuşak Sap (Soft)",
        price: 1.44,
        multipliers: {},
        eco: 65,
        details: [
          "Marka logolu perakende alışveriş taşımacılığı",
          "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
          "Hammadde: LDPE (Yumuşak) | Kalınlık: 80 Mikron | Termin: 12 İş Günü"
        ]
      },
      {
        urun_kodu: "MGZ-3345-45",
        olculer: "33 x 45 + 8 (Alt Körük)",
        material: "LDPE (Yumuşak)",
        thickness: "80 Mikron",
        closure: "Yumuşak Sap (Soft)",
        price: 2.17,
        multipliers: {},
        eco: 65,
        details: [
          "Marka logolu perakende alışveriş taşımacılığı",
          "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
          "Hammadde: LDPE (Yumuşak) | Kalınlık: 80 Mikron | Termin: 12 İş Günü"
        ]
      },
      {
        urun_kodu: "MGZ-4050-46",
        olculer: "40 x 50 + 10 (Alt Körük)",
        material: "LDPE (Yumuşak)",
        thickness: "80 Mikron",
        closure: "Yumuşak Sap (Soft)",
        price: 2.92,
        multipliers: {},
        eco: 65,
        details: [
          "Marka logolu perakende alışveriş taşımacılığı",
          "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
          "Hammadde: LDPE (Yumuşak) | Kalınlık: 80 Mikron | Termin: 12 İş Günü"
        ]
      },
      {
        urun_kodu: "MGZ-5060-47",
        olculer: "50 x 60 + 10 (Alt Körük)",
        material: "LDPE (Yumuşak)",
        thickness: "90 Mikron",
        closure: "Yumuşak Sap (Soft)",
        price: 4.38,
        multipliers: {},
        eco: 65,
        details: [
          "Marka logolu perakende alışveriş taşımacılığı",
          "Uyumlu Sektörler: Tekstil Mağazaları, Perakende, Butikler",
          "Hammadde: LDPE (Yumuşak) | Kalınlık: 90 Mikron | Termin: 12 İş Günü"
        ]
      }
    ]
  },
  {
    name: "Market Poşetleri - Atlet",
    keywords: ["market poşetleri - atlet", "atlet poşet", "hışır poşet", "market poşeti", "atlet market", "mkt-2035-48", "mkt-2545-49", "mkt-2750-50", "mkt-3060-51", "mkt-3570-52"],
    category: "marketAtlet",
    material: "HDPE (Hışır)",
    thickness: "16 Mikron",
    closure: "Atlet Tipi (Saplı)",
    price: 0.25,
    eco: 65,
    type: "market",
    details: [
      "Hızlı Tüketim ve market ürünleri taşıması",
      "Uyumlu Sektörler: Süpermarketler, Manavlar, Kasaplar, Şarküteriler",
      "Hammadde: HDPE (Hışır) | Kalınlık: 16 Mikron | Termin: 10 İş Günü"
    ],
    variants: [
      {
        urun_kodu: "MKT-2035-48",
        olculer: "20 x 35 + 10 (Yan Körük)",
        material: "HDPE (Hışır)",
        thickness: "16 Mikron",
        closure: "Atlet Tipi (Saplı)",
        price: 0.16,
        multipliers: {},
        eco: 65,
        details: [
          "Hızlı Tüketim ve market ürünleri taşıması",
          "Uyumlu Sektörler: Süpermarketler, Manavlar, Kasaplar, Şarküteriler",
          "Hammadde: HDPE (Hışır) | Kalınlık: 16 Mikron | Termin: 10 İş Günü"
        ]
      },
      {
        urun_kodu: "MKT-2545-49",
        olculer: "25 x 45 + 12 (Yan Körük)",
        material: "HDPE (Hışır)",
        thickness: "16 Mikron",
        closure: "Atlet Tipi (Saplı)",
        price: 0.25,
        multipliers: {},
        eco: 65,
        details: [
          "Hızlı Tüketim ve market ürünleri taşıması",
          "Uyumlu Sektörler: Süpermarketler, Manavlar, Kasaplar, Şarküteriler",
          "Hammadde: HDPE (Hışır) | Kalınlık: 16 Mikron | Termin: 10 İş Günü"
        ]
      },
      {
        urun_kodu: "MKT-2750-50",
        olculer: "27 x 50 + 12 (Yan Körük)",
        material: "HDPE (Hışır)",
        thickness: "16 Mikron",
        closure: "Atlet Tipi (Saplı)",
        price: 0.3,
        multipliers: {},
        eco: 65,
        details: [
          "Hızlı Tüketim ve market ürünleri taşıması",
          "Uyumlu Sektörler: Süpermarketler, Manavlar, Kasaplar, Şarküteriler",
          "Hammadde: HDPE (Hışır) | Kalınlık: 16 Mikron | Termin: 10 İş Günü"
        ]
      },
      {
        urun_kodu: "MKT-3060-51",
        olculer: "30 x 60 + 14 (Yan Körük)",
        material: "HDPE (Hışır) ",
        thickness: "16 Mikron",
        closure: "Atlet Tipi (Saplı)",
        price: 0.4,
        multipliers: {},
        eco: 65,
        details: [
          "Hızlı Tüketim ve market ürünleri taşıması",
          "Uyumlu Sektörler: Süpermarketler, Manavlar, Kasaplar, Şarküteriler",
          "Hammadde: HDPE (Hışır)  | Kalınlık: 16 Mikron | Termin: 10 İş Günü"
        ]
      },
      {
        urun_kodu: "MKT-3570-52",
        olculer: "35 x 70 + 16 (Yan Körük)",
        material: "HDPE (Hışır)",
        thickness: "18 Mikron",
        closure: "Atlet Tipi (Saplı)",
        price: 0.54,
        multipliers: {},
        eco: 65,
        details: [
          "Hızlı Tüketim ve market ürünleri taşıması",
          "Uyumlu Sektörler: Süpermarketler, Manavlar, Kasaplar, Şarküteriler",
          "Hammadde: HDPE (Hışır) | Kalınlık: 18 Mikron | Termin: 10 İş Günü"
        ]
      }
    ]
  },
  {
    name: "Kilitli & Fermuarlı Poşetler",
    keywords: ["kilitli & fermuarlı poşetler", "kilitli", "fermuarlı", "doypack", "zipli", "kilitli torba", "kahve torbası", "klt-811-53", "klt-1114-54", "klt-1318-55", "klt-1622-56", "klt-2025-57", "klt-2535-58"],
    category: "doypackKilitli",
    material: "LDPE (Şeffaf)",
    thickness: "50 Mikron",
    closure: "Kilitli (Zip-lock)",
    price: 4.2,
    eco: 65,
    type: "kilitli",
    details: [
      "Küçük hacimli ürünlerin hijyenik paketlenmesi",
      "Uyumlu Sektörler: Gıda, Tekstil Aksesuar, Bijuteri, Kırtasiye",
      "Hammadde: LDPE (Şeffaf) | Kalınlık: 50 Mikron | Termin: 3 İş Günü"
    ],
    variants: [
      {
        urun_kodu: "KLT-811-53",
        olculer: "8 x 11",
        material: "LDPE (Şeffaf)",
        thickness: "50 Mikron",
        closure: "Kilitli (Zip-lock)",
        price: 2.52,
        multipliers: {"1000": 1.0, "10000": 0.88, "50000": 0.8},
        eco: 65,
        details: [
          "Küçük hacimli ürünlerin hijyenik paketlenmesi",
          "Uyumlu Sektörler: Gıda, Tekstil Aksesuar, Bijuteri, Kırtasiye",
          "Hammadde: LDPE (Şeffaf) | Kalınlık: 50 Mikron | Termin: 3 İş Günü"
        ]
      },
      {
        urun_kodu: "KLT-1114-54",
        olculer: "11 x 14",
        material: "LDPE (Şeffaf)",
        thickness: "50 Mikron",
        closure: "Kilitli (Zip-lock)",
        price: 4.2,
        multipliers: {"1000": 1.0, "10000": 0.88, "50000": 0.8},
        eco: 65,
        details: [
          "Küçük hacimli ürünlerin hijyenik paketlenmesi",
          "Uyumlu Sektörler: Gıda, Tekstil Aksesuar, Bijuteri, Kırtasiye",
          "Hammadde: LDPE (Şeffaf) | Kalınlık: 50 Mikron | Termin: 3 İş Günü"
        ]
      },
      {
        urun_kodu: "KLT-1318-55",
        olculer: "13 x 18",
        material: "LDPE (Şeffaf)",
        thickness: "50 Mikron",
        closure: "Kilitli (Zip-lock)",
        price: 6.38,
        multipliers: {"1000": 1.0, "10000": 0.88, "50000": 0.8},
        eco: 65,
        details: [
          "Küçük hacimli ürünlerin hijyenik paketlenmesi",
          "Uyumlu Sektörler: Gıda, Tekstil Aksesuar, Bijuteri, Kırtasiye",
          "Hammadde: LDPE (Şeffaf) | Kalınlık: 50 Mikron | Termin: 3 İş Günü"
        ]
      },
      {
        urun_kodu: "KLT-1622-56",
        olculer: "16 x 22",
        material: "LDPE (Şeffaf)",
        thickness: "50 Mikron",
        closure: "Kilitli (Zip-lock)",
        price: 9.24,
        multipliers: {"1000": 1.0, "10000": 0.88, "50000": 0.8},
        eco: 65,
        details: [
          "Küçük hacimli ürünlerin hijyenik paketlenmesi",
          "Uyumlu Sektörler: Gıda, Tekstil Aksesuar, Bijuteri, Kırtasiye",
          "Hammadde: LDPE (Şeffaf) | Kalınlık: 50 Mikron | Termin: 3 İş Günü"
        ]
      },
      {
        urun_kodu: "KLT-2025-57",
        olculer: "20 x 25",
        material: "LDPE (Şeffaf)",
        thickness: "55 Mikron",
        closure: "Kilitli (Zip-lock)",
        price: 9.24,
        multipliers: {"1000": 1.0, "10000": 0.88, "50000": 0.8},
        eco: 65,
        details: [
          "Küçük hacimli ürünlerin hijyenik paketlenmesi",
          "Uyumlu Sektörler: Gıda, Tekstil Aksesuar, Bijuteri, Kırtasiye",
          "Hammadde: LDPE (Şeffaf) | Kalınlık: 55 Mikron | Termin: 3 İş Günü"
        ]
      },
      {
        urun_kodu: "KLT-2535-58",
        olculer: "25 x 35",
        material: "LDPE (Şeffaf)",
        thickness: "60 Mikron",
        closure: "Kilitli (Zip-lock)",
        price: 9.24,
        multipliers: {"1000": 1.0, "10000": 0.88, "50000": 0.8},
        eco: 65,
        details: [
          "Küçük hacimli ürünlerin hijyenik paketlenmesi",
          "Uyumlu Sektörler: Gıda, Tekstil Aksesuar, Bijuteri, Kırtasiye",
          "Hammadde: LDPE (Şeffaf) | Kalınlık: 60 Mikron | Termin: 3 İş Günü"
        ]
      }
    ]
  },
  {
    name: "Jelatin & OPP Poşetler",
    keywords: ["jelatin & opp poşetler", "jelatin", "opp", "baskısız jelatin", "yapışkanlı jelatin", "jlt-1015-59", "jlt-1520-60", "jlt-2030-61", "jlt-2535-62", "jlt-3040-63"],
    category: "oppJelatin",
    material: "OPP / PP",
    thickness: "30 Mikron",
    closure: "Kapak Bandı (Yapışkan)",
    price: 0.6,
    eco: 65,
    type: "jelatin",
    details: [
      "Küçük hacimli ürünlerin hijyenik paketlenmesi",
      "Uyumlu Sektörler: Gıda, Tekstil Aksesuar, Bijuteri, Kırtasiye",
      "Hammadde: OPP / PP | Kalınlık: 30 Mikron | Termin: 3 İş Günü"
    ],
    variants: [
      {
        urun_kodu: "JLT-1015-59",
        olculer: "10 x 15",
        material: "OPP / PP",
        thickness: "30 Mikron",
        closure: "Kapak Bandı (Yapışkan)",
        price: 0.36,
        multipliers: {"1000": 1.0, "10000": 0.88, "50000": 0.8},
        eco: 65,
        details: [
          "Küçük hacimli ürünlerin hijyenik paketlenmesi",
          "Uyumlu Sektörler: Gıda, Tekstil Aksesuar, Bijuteri, Kırtasiye",
          "Hammadde: OPP / PP | Kalınlık: 30 Mikron | Termin: 3 İş Günü"
        ]
      },
      {
        urun_kodu: "JLT-1520-60",
        olculer: "15 x 20",
        material: "OPP / PP",
        thickness: "30 Mikron",
        closure: "Kapak Bandı (Yapışkan)",
        price: 0.6,
        multipliers: {"1000": 1.0, "10000": 0.88, "50000": 0.8},
        eco: 65,
        details: [
          "Küçük hacimli ürünlerin hijyenik paketlenmesi",
          "Uyumlu Sektörler: Gıda, Tekstil Aksesuar, Bijuteri, Kırtasiye",
          "Hammadde: OPP / PP | Kalınlık: 30 Mikron | Termin: 3 İş Günü"
        ]
      },
      {
        urun_kodu: "JLT-2030-61",
        olculer: "20 x 30",
        material: "OPP / PP",
        thickness: "30 Mikron",
        closure: "Kapak Bandı (Yapışkan)",
        price: 1.2,
        multipliers: {"1000": 1.0, "10000": 0.88, "50000": 0.8},
        eco: 65,
        details: [
          "Küçük hacimli ürünlerin hijyenik paketlenmesi",
          "Uyumlu Sektörler: Gıda, Tekstil Aksesuar, Bijuteri, Kırtasiye",
          "Hammadde: OPP / PP | Kalınlık: 30 Mikron | Termin: 3 İş Günü"
        ]
      },
      {
        urun_kodu: "JLT-2535-62",
        olculer: "25 x 35",
        material: "OPP / PP",
        thickness: "35 Mikron",
        closure: "Kapak Bandı (Yapışkan)",
        price: 1.32,
        multipliers: {"1000": 1.0, "10000": 0.88, "50000": 0.8},
        eco: 65,
        details: [
          "Küçük hacimli ürünlerin hijyenik paketlenmesi",
          "Uyumlu Sektörler: Gıda, Tekstil Aksesuar, Bijuteri, Kırtasiye",
          "Hammadde: OPP / PP | Kalınlık: 35 Mikron | Termin: 3 İş Günü"
        ]
      },
      {
        urun_kodu: "JLT-3040-63",
        olculer: "30 x 40",
        material: "OPP / PP",
        thickness: "35 Mikron",
        closure: "Kapak Bandı (Yapışkan)",
        price: 1.32,
        multipliers: {"1000": 1.0, "10000": 0.88, "50000": 0.8},
        eco: 65,
        details: [
          "Küçük hacimli ürünlerin hijyenik paketlenmesi",
          "Uyumlu Sektörler: Gıda, Tekstil Aksesuar, Bijuteri, Kırtasiye",
          "Hammadde: OPP / PP | Kalınlık: 35 Mikron | Termin: 3 İş Günü"
        ]
      }
    ]
  },
  {
    name: "Biyobozunur Poşetler",
    keywords: ["biyobozunur poşetler", "biyobozunur", "çözünür", "doğada çözünen", "kompost", "pla poşet", "bio-2030-64", "bio-2638-65", "bio-3345-66", "bio-4050-67"],
    category: "biyobozunur",
    material: "PLA / Nişasta",
    thickness: "45 Mikron",
    closure: "El Geçme (Punch)",
    price: 2.5,
    eco: 98,
    type: "biyobozunur",
    details: [
      "Doğa dostu, kompostlanabilir taşımacılık çözümü",
      "Uyumlu Sektörler: Çevreci Markalar, Organik Gıda, Butikler",
      "Hammadde: PLA / Nişasta | Kalınlık: 45 Mikron | Termin: 14 İş Günü"
    ],
    variants: [
      {
        urun_kodu: "BIO-2030-64",
        olculer: "20 x 30 + 5 (Alt Körük)",
        material: "PLA / Nişasta",
        thickness: "45 Mikron",
        closure: "El Geçme (Punch)",
        price: 1.52,
        multipliers: {},
        eco: 98,
        details: [
          "Doğa dostu, kompostlanabilir taşımacılık çözümü",
          "Uyumlu Sektörler: Çevreci Markalar, Organik Gıda, Butikler",
          "Hammadde: PLA / Nişasta | Kalınlık: 45 Mikron | Termin: 14 İş Günü"
        ]
      },
      {
        urun_kodu: "BIO-2638-65",
        olculer: "26 x 38 + 6 (Alt Körük)",
        material: "PLA / Nişasta",
        thickness: "45 Mikron",
        closure: "El Geçme (Punch)",
        price: 2.5,
        multipliers: {},
        eco: 98,
        details: [
          "Doğa dostu, kompostlanabilir taşımacılık çözümü",
          "Uyumlu Sektörler: Çevreci Markalar, Organik Gıda, Butikler",
          "Hammadde: PLA / Nişasta | Kalınlık: 45 Mikron | Termin: 14 İş Günü"
        ]
      },
      {
        urun_kodu: "BIO-3345-66",
        olculer: "33 x 45 + 6 (Alt Körük)",
        material: "PLA / Nişasta",
        thickness: "45 Mikron",
        closure: "El Geçme (Punch)",
        price: 3.76,
        multipliers: {},
        eco: 98,
        details: [
          "Doğa dostu, kompostlanabilir taşımacılık çözümü",
          "Uyumlu Sektörler: Çevreci Markalar, Organik Gıda, Butikler",
          "Hammadde: PLA / Nişasta | Kalınlık: 45 Mikron | Termin: 14 İş Günü"
        ]
      },
      {
        urun_kodu: "BIO-4050-67",
        olculer: "40 x 50 + 8 (Alt Körük)",
        material: "PLA / Nişasta",
        thickness: "50 Mikron",
        closure: "El Geçme (Punch)",
        price: 5.06,
        multipliers: {},
        eco: 98,
        details: [
          "Doğa dostu, kompostlanabilir taşımacılık çözümü",
          "Uyumlu Sektörler: Çevreci Markalar, Organik Gıda, Butikler",
          "Hammadde: PLA / Nişasta | Kalınlık: 50 Mikron | Termin: 14 İş Günü"
        ]
      }
    ]
  },
  {
    name: "Kraft Çantalar",
    keywords: ["kraft çantalar", "kraft çanta", "kraft poşet", "büküm saplı", "burgu saplı", "kraft kağıt", "krf-1825-68", "krf-2532-69", "krf-3242-70"],
    category: "kraftCanta",
    material: "Kraft Kağıt",
    thickness: "100 Gr/m²",
    closure: "Büküm Kağıt Sap",
    price: 3.4,
    eco: 95,
    type: "kraft",
    details: [
      "Premium ve ekolojik paketleme/taşıma çantası",
      "Uyumlu Sektörler: Lüks Butikler, Restoran Paket Servis, Cafeler",
      "Hammadde: Kraft Kağıt | Kalınlık: 100 Gr/m² | Termin: 15 İş Günü"
    ],
    variants: [
      {
        urun_kodu: "KRF-1825-68",
        olculer: "18 x 25 + 8 (Yan Körük)",
        material: "Kraft Kağıt",
        thickness: "100 Gr/m²",
        closure: "Büküm Kağıt Sap",
        price: 2.04,
        multipliers: {"3000": 1.0, "10000": 0.9, "30000": 0.83},
        eco: 95,
        details: [
          "Premium ve ekolojik paketleme/taşıma çantası",
          "Uyumlu Sektörler: Lüks Butikler, Restoran Paket Servis, Cafeler",
          "Hammadde: Kraft Kağıt | Kalınlık: 100 Gr/m² | Termin: 15 İş Günü"
        ]
      },
      {
        urun_kodu: "KRF-2532-69",
        olculer: "25 x 32 + 8 (Yan Körük)",
        material: "Kraft Kağıt",
        thickness: "100 Gr/m²",
        closure: "Büküm Kağıt Sap",
        price: 2.99,
        multipliers: {"3000": 1.0, "10000": 0.9, "30000": 0.83},
        eco: 95,
        details: [
          "Premium ve ekolojik paketleme/taşıma çantası",
          "Uyumlu Sektörler: Lüks Butikler, Restoran Paket Servis, Cafeler",
          "Hammadde: Kraft Kağıt | Kalınlık: 100 Gr/m² | Termin: 15 İş Günü"
        ]
      },
      {
        urun_kodu: "KRF-3242-70",
        olculer: "32 x 42 + 12 (Yan Körük)",
        material: "Kraft Kağıt",
        thickness: "110 Gr/m²",
        closure: "Büküm Kağıt Sap",
        price: 5.02,
        multipliers: {"3000": 1.0, "10000": 0.9, "30000": 0.83},
        eco: 95,
        details: [
          "Premium ve ekolojik paketleme/taşıma çantası",
          "Uyumlu Sektörler: Lüks Butikler, Restoran Paket Servis, Cafeler",
          "Hammadde: Kraft Kağıt | Kalınlık: 110 Gr/m² | Termin: 15 İş Günü"
        ]
      }
    ]
  },
  {
    name: "Lüks Karton Çantalar",
    keywords: ["lüks karton çantalar", "lüks karton", "karton çanta", "kuşe çanta", "bristol", "ipli çanta", "krt-1825-71", "krt-2532-72", "krt-3242-73"],
    category: "luksKarton",
    material: "Kuşe Karton",
    thickness: "230 Gr/m²",
    closure: "İpli Sap (Kordon)",
    price: 4.8,
    eco: 65,
    type: "kraft",
    details: [
      "Premium ve ekolojik paketleme/taşıma çantası",
      "Uyumlu Sektörler: Lüks Butikler, Restoran Paket Servis, Cafeler",
      "Hammadde: Kuşe Karton | Kalınlık: 230 Gr/m² | Termin: 15 İş Günü"
    ],
    variants: [
      {
        urun_kodu: "KRT-1825-71",
        olculer: "18 x 25 + 8 (Yan Körük)",
        material: "Kuşe Karton",
        thickness: "230 Gr/m²",
        closure: "İpli Sap (Kordon)",
        price: 2.88,
        multipliers: {"3000": 1.0, "10000": 0.9, "30000": 0.83},
        eco: 65,
        details: [
          "Premium ve ekolojik paketleme/taşıma çantası",
          "Uyumlu Sektörler: Lüks Butikler, Restoran Paket Servis, Cafeler",
          "Hammadde: Kuşe Karton | Kalınlık: 230 Gr/m² | Termin: 15 İş Günü"
        ]
      },
      {
        urun_kodu: "KRT-2532-72",
        olculer: "25 x 32 + 8 (Yan Körük)",
        material: "Kuşe Karton",
        thickness: "230 Gr/m²",
        closure: "İpli Sap (Kordon)",
        price: 4.22,
        multipliers: {"3000": 1.0, "10000": 0.9, "30000": 0.83},
        eco: 65,
        details: [
          "Premium ve ekolojik paketleme/taşıma çantası",
          "Uyumlu Sektörler: Lüks Butikler, Restoran Paket Servis, Cafeler",
          "Hammadde: Kuşe Karton | Kalınlık: 230 Gr/m² | Termin: 15 İş Günü"
        ]
      },
      {
        urun_kodu: "KRT-3242-73",
        olculer: "32 x 42 + 12 (Yan Körük)",
        material: "Kuşe Karton",
        thickness: "250 Gr/m²",
        closure: "İpli Sap (Kordon)",
        price: 7.09,
        multipliers: {"3000": 1.0, "10000": 0.9, "30000": 0.83},
        eco: 65,
        details: [
          "Premium ve ekolojik paketleme/taşıma çantası",
          "Uyumlu Sektörler: Lüks Butikler, Restoran Paket Servis, Cafeler",
          "Hammadde: Kuşe Karton | Kalınlık: 250 Gr/m² | Termin: 15 İş Günü"
        ]
      }
    ]
  },
  {
    name: "Kese Kağıtları",
    keywords: ["kese kağıtları", "kese kağıdı", "fırın poşeti", "fast food kese", "sülfit kağıt", "kse-1020-74", "kse-1525-75", "kse-2030-76"],
    category: "keseKagidi",
    material: "Sülfit Kağıt",
    thickness: "50 Gr/m²",
    closure: "Körüklü (Yan Körük)",
    price: 0.85,
    eco: 95,
    type: "kraft",
    details: [
      "Premium ve ekolojik paketleme/taşıma çantası",
      "Uyumlu Sektörler: Lüks Butikler, Restoran Paket Servis, Cafeler",
      "Hammadde: Sülfit Kağıt | Kalınlık: 50 Gr/m² | Termin: 5 İş Günü"
    ],
    variants: [
      {
        urun_kodu: "KSE-1020-74",
        olculer: "10 x 20 + 4 (Yan Körük)",
        material: "Sülfit Kağıt",
        thickness: "50 Gr/m²",
        closure: "Körüklü (Yan Körük)",
        price: 0.51,
        multipliers: {},
        eco: 95,
        details: [
          "Premium ve ekolojik paketleme/taşıma çantası",
          "Uyumlu Sektörler: Lüks Butikler, Restoran Paket Servis, Cafeler",
          "Hammadde: Sülfit Kağıt | Kalınlık: 50 Gr/m² | Termin: 5 İş Günü"
        ]
      },
      {
        urun_kodu: "KSE-1525-75",
        olculer: "15 x 25 + 5 (Yan Körük)",
        material: "Sülfit Kağıt",
        thickness: "50 Gr/m²",
        closure: "Körüklü (Yan Körük)",
        price: 0.51,
        multipliers: {},
        eco: 95,
        details: [
          "Premium ve ekolojik paketleme/taşıma çantası",
          "Uyumlu Sektörler: Lüks Butikler, Restoran Paket Servis, Cafeler",
          "Hammadde: Sülfit Kağıt | Kalınlık: 50 Gr/m² | Termin: 5 İş Günü"
        ]
      },
      {
        urun_kodu: "KSE-2030-76",
        olculer: "20 x 30 + 6 (Yan Körük)",
        material: "Sülfit Kağıt",
        thickness: "55 Gr/m²",
        closure: "Körüklü (Yan Körük)",
        price: 0.56,
        multipliers: {},
        eco: 95,
        details: [
          "Premium ve ekolojik paketleme/taşıma çantası",
          "Uyumlu Sektörler: Lüks Butikler, Restoran Paket Servis, Cafeler",
          "Hammadde: Sülfit Kağıt | Kalınlık: 55 Gr/m² | Termin: 5 İş Günü"
        ]
      }
    ]
  },
  {
    name: "Nonwoven (Tela) Çantalar",
    keywords: ["nonwoven (tela) çantalar", "tela çanta", "nonwoven", "bez çanta tela", "elyaf çanta", "tla-2535-77", "tla-3040-78", "tla-3540-79", "tla-4050-80"],
    category: "telaCanta",
    material: "%100 PP Tela",
    thickness: "80 Gr/m²",
    closure: "Tela Saplı",
    price: 5.5,
    eco: 65,
    type: "bez",
    details: [
      "Uzun ömürlü, reklam odaklı çok kullanımlık çanta",
      "Uyumlu Sektörler: Promosyon, Fuar Organizasyon, Kurumsal Hediyelik",
      "Hammadde: %100 PP Tela | Kalınlık: 80 Gr/m² | Termin: 14 İş Günü"
    ],
    variants: [
      {
        urun_kodu: "TLA-2535-77",
        olculer: "25 x 35",
        material: "%100 PP Tela",
        thickness: "80 Gr/m²",
        closure: "Tela Saplı",
        price: 4.01,
        multipliers: {"1000": 1.0, "5000": 0.9, "10000": 0.84},
        eco: 65,
        details: [
          "Uzun ömürlü, reklam odaklı çok kullanımlık çanta",
          "Uyumlu Sektörler: Promosyon, Fuar Organizasyon, Kurumsal Hediyelik",
          "Hammadde: %100 PP Tela | Kalınlık: 80 Gr/m² | Termin: 14 İş Günü"
        ]
      },
      {
        urun_kodu: "TLA-3040-78",
        olculer: "30 x 40",
        material: "%100 PP Tela",
        thickness: "80 Gr/m²",
        closure: "Tela Saplı",
        price: 5.5,
        multipliers: {"1000": 1.0, "5000": 0.9, "10000": 0.84},
        eco: 65,
        details: [
          "Uzun ömürlü, reklam odaklı çok kullanımlık çanta",
          "Uyumlu Sektörler: Promosyon, Fuar Organizasyon, Kurumsal Hediyelik",
          "Hammadde: %100 PP Tela | Kalınlık: 80 Gr/m² | Termin: 14 İş Günü"
        ]
      },
      {
        urun_kodu: "TLA-3540-79",
        olculer: "35 x 40",
        material: "%100 PP Tela",
        thickness: "80 Gr/m²",
        closure: "Tela Saplı",
        price: 6.42,
        multipliers: {"1000": 1.0, "5000": 0.9, "10000": 0.84},
        eco: 65,
        details: [
          "Uzun ömürlü, reklam odaklı çok kullanımlık çanta",
          "Uyumlu Sektörler: Promosyon, Fuar Organizasyon, Kurumsal Hediyelik",
          "Hammadde: %100 PP Tela | Kalınlık: 80 Gr/m² | Termin: 14 İş Günü"
        ]
      },
      {
        urun_kodu: "TLA-4050-80",
        olculer: "40 x 50",
        material: "%100 PP Tela",
        thickness: "90 Gr/m²",
        closure: "Tela Saplı",
        price: 9.17,
        multipliers: {"1000": 1.0, "5000": 0.9, "10000": 0.84},
        eco: 65,
        details: [
          "Uzun ömürlü, reklam odaklı çok kullanımlık çanta",
          "Uyumlu Sektörler: Promosyon, Fuar Organizasyon, Kurumsal Hediyelik",
          "Hammadde: %100 PP Tela | Kalınlık: 90 Gr/m² | Termin: 14 İş Günü"
        ]
      }
    ]
  },
  {
    name: "Ham Bez (Pamuk) Çantalar",
    keywords: ["ham bez (pamuk) çantalar", "ham bez", "pamuk çanta", "kumaş çanta", "promosyon bez", "bez-3040-81", "bez-3540-82", "bez-4050-83"],
    category: "hamBez",
    material: "%100 Pamuk Bez",
    thickness: "140 Gr/m²",
    closure: "Pamuk Omuz Sapı",
    price: 12.0,
    eco: 95,
    type: "bez",
    details: [
      "Uzun ömürlü, reklam odaklı çok kullanımlık çanta",
      "Uyumlu Sektörler: Promosyon, Fuar Organizasyon, Kurumsal Hediyelik",
      "Hammadde: %100 Pamuk Bez | Kalınlık: 140 Gr/m² | Termin: 14 İş Günü"
    ],
    variants: [
      {
        urun_kodu: "BEZ-3040-81",
        olculer: "30 x 40",
        material: "%100 Pamuk Bez",
        thickness: "140 Gr/m²",
        closure: "Pamuk Omuz Sapı",
        price: 12.0,
        multipliers: {"1000": 1.0, "5000": 0.9, "10000": 0.84},
        eco: 95,
        details: [
          "Uzun ömürlü, reklam odaklı çok kullanımlık çanta",
          "Uyumlu Sektörler: Promosyon, Fuar Organizasyon, Kurumsal Hediyelik",
          "Hammadde: %100 Pamuk Bez | Kalınlık: 140 Gr/m² | Termin: 14 İş Günü"
        ]
      },
      {
        urun_kodu: "BEZ-3540-82",
        olculer: "35 x 40",
        material: "%100 Pamuk Bez",
        thickness: "140 Gr/m²",
        closure: "Pamuk Omuz Sapı",
        price: 14.0,
        multipliers: {"1000": 1.0, "5000": 0.9, "10000": 0.84},
        eco: 95,
        details: [
          "Uzun ömürlü, reklam odaklı çok kullanımlık çanta",
          "Uyumlu Sektörler: Promosyon, Fuar Organizasyon, Kurumsal Hediyelik",
          "Hammadde: %100 Pamuk Bez | Kalınlık: 140 Gr/m² | Termin: 14 İş Günü"
        ]
      },
      {
        urun_kodu: "BEZ-4050-83",
        olculer: "40 x 50",
        material: "%100 Pamuk Bez",
        thickness: "140 Gr/m²",
        closure: "Pamuk Omuz Sapı",
        price: 20.0,
        multipliers: {"1000": 1.0, "5000": 0.9, "10000": 0.84},
        eco: 95,
        details: [
          "Uzun ömürlü, reklam odaklı çok kullanımlık çanta",
          "Uyumlu Sektörler: Promosyon, Fuar Organizasyon, Kurumsal Hediyelik",
          "Hammadde: %100 Pamuk Bez | Kalınlık: 140 Gr/m² | Termin: 14 İş Günü"
        ]
      }
    ]
  },
  {
    name: "Balonlu Patpat Naylonlar",
    keywords: ["balonlu patpat naylonlar", "balonlu patpat", "patpat naylon", "patpat rulo", "balonlu ambalaj", "ind-100cmx50mtrulo-84", "ind-120cmx50mtrulo-85", "ind-150cmx50mtrulo-86"],
    category: "balonluPatpat",
    material: "LDPE",
    thickness: "50 Gr/m²",
    closure: "Standart Kapama",
    price: 3.5,
    eco: 65,
    type: "plastik",
    details: [
      "Palet Koruma, shrinkleme ve ağır sanayi ambalajlama",
      "Uyumlu Sektörler: Fabrikalar, Üretim Tesisleri, Depolar, Lojistik Merkezleri",
      "Hammadde: LDPE | Kalınlık: 50 Gr/m² | Termin: 4 İş Günü"
    ],
    variants: [
      {
        urun_kodu: "IND-100cmx50mtRulo-84",
        olculer: "100 cm x 50 mt Rulo",
        material: "LDPE",
        thickness: "50 Gr/m²",
        closure: "Standart",
        price: 3.5,
        multipliers: {},
        eco: 65,
        details: [
          "Palet Koruma, shrinkleme ve ağır sanayi ambalajlama",
          "Uyumlu Sektörler: Fabrikalar, Üretim Tesisleri, Depolar, Lojistik Merkezleri",
          "Hammadde: LDPE | Kalınlık: 50 Gr/m² | Termin: 4 İş Günü"
        ]
      },
      {
        urun_kodu: "IND-120cmx50mtRulo-85",
        olculer: "120 cm x 50 mt Rulo",
        material: "LDPE",
        thickness: "50 Gr/m²",
        closure: "Standart",
        price: 3.5,
        multipliers: {},
        eco: 65,
        details: [
          "Palet Koruma, shrinkleme ve ağır sanayi ambalajlama",
          "Uyumlu Sektörler: Fabrikalar, Üretim Tesisleri, Depolar, Lojistik Merkezleri",
          "Hammadde: LDPE | Kalınlık: 50 Gr/m² | Termin: 4 İş Günü"
        ]
      },
      {
        urun_kodu: "IND-150cmx50mtRulo-86",
        olculer: "150 cm x 50 mt Rulo",
        material: "LDPE",
        thickness: "55 Gr/m²",
        closure: "Standart",
        price: 3.5,
        multipliers: {},
        eco: 65,
        details: [
          "Palet Koruma, shrinkleme ve ağır sanayi ambalajlama",
          "Uyumlu Sektörler: Fabrikalar, Üretim Tesisleri, Depolar, Lojistik Merkezleri",
          "Hammadde: LDPE | Kalınlık: 55 Gr/m² | Termin: 4 İş Günü"
        ]
      }
    ]
  },
  {
    name: "Şrink Filmler (P.E, POF, PVC)",
    keywords: ["şrink filmler (p.e, pof, pvc)", "şrink", "shrink", "pof film", "pvc film", "paketleme filmi", "ind-bobin/rulo-87"],
    category: "srinkFilm",
    material: "POF (Polyolefin)",
    thickness: "19 Mikron",
    closure: "Standart Kapama",
    price: 2.1,
    eco: 65,
    type: "plastik",
    details: [
      "Palet Koruma, shrinkleme ve ağır sanayi ambalajlama",
      "Uyumlu Sektörler: Fabrikalar, Üretim Tesisleri, Depolar, Lojistik Merkezleri",
      "Hammadde: POF (Polyolefin) | Kalınlık: 19 Mikron | Termin: 4 İş Günü"
    ],
    variants: [
      {
        urun_kodu: "IND-Bobin/Rulo-87",
        olculer: "Bobin / Rulo (Özel En)",
        material: "POF (Polyolefin)",
        thickness: "19 Mikron",
        closure: "Standart",
        price: 2.1,
        multipliers: {},
        eco: 65,
        details: [
          "Palet Koruma, shrinkleme ve ağır sanayi ambalajlama",
          "Uyumlu Sektörler: Fabrikalar, Üretim Tesisleri, Depolar, Lojistik Merkezleri",
          "Hammadde: POF (Polyolefin) | Kalınlık: 19 Mikron | Termin: 4 İş Günü"
        ]
      }
    ]
  }
];;;


function parseDimensions(dimStr: string): { width: number; height: number; isRoll: boolean } {
  const clean = dimStr.toLowerCase();
  if (clean.includes("rulo") || clean.includes("eni")) {
    const match = clean.match(/(\d+)/);
    const w = match ? parseFloat(match[1]) : 100;
    return { width: w, height: 0, isRoll: true };
  }
  const numbers = clean.match(/(\d+(?:\.\d+)?)\s*[x*]\s*(\d+(?:\.\d+)?)/) ||
                  clean.split(/[^0-9.]+/).filter(Boolean).map(parseFloat);
  if (numbers && numbers.length >= 2) {
    return { width: parseFloat(String(numbers[0])), height: parseFloat(String(numbers[1])), isRoll: false };
  }
  return { width: 0, height: 0, isRoll: false };
}

function findClosestVariant(p: any, prompt: string) {
  const norm = prompt.toLowerCase();
  if (p.variants && p.variants.length > 0) {
    for (const v of p.variants) {
      const code = (v.urun_kodu || "").toLowerCase();
      if (code && norm.includes(code)) {
        return v;
      }
    }
  }
  const userDim = parseDimensions(prompt);
  if ((userDim.width > 0 || userDim.height > 0 || userDim.isRoll) && p.variants && p.variants.length > 0) {
    let bestVariant = p.variants[0];
    let minDiff = Infinity;
    for (const v of p.variants) {
      const vDim = parseDimensions(v.olculer || "");
      if (userDim.isRoll && vDim.isRoll) {
        const diff = Math.abs(userDim.width - vDim.width);
        if (diff < minDiff) {
          minDiff = diff;
          bestVariant = v;
        }
      } else if (!userDim.isRoll && !vDim.isRoll) {
        const diff = Math.abs(userDim.width - vDim.width) + Math.abs(userDim.height - vDim.height);
        if (diff < minDiff) {
          minDiff = diff;
          bestVariant = v;
        }
      }
    }
    return bestVariant;
  }
  return p.variants && p.variants.length > 0 ? p.variants[0] : null;
}

// Support Turkish input and create realistic default quotes using the exact taxonomy match
function getRuleBasedFallback(prompt: string) {
  const norm = prompt.toLowerCase();
  
  // Try to find the exact matched product from the complete taxonomy list
  let matched = PRODUCTS_TAXONOMY.find(p => {
    return p.keywords.some(kw => norm.includes(kw)) || norm.includes(p.name.toLowerCase());
  });

  // Safe fallback if no exact product matches
  if (!matched) {
    if (norm.includes("kraft") || norm.includes("kağıt") || norm.includes("çanta") || norm.includes("karton")) {
      matched = PRODUCTS_TAXONOMY.find(p => p.name === "Kraft Çantalar");
    } else if (norm.includes("gıda") || norm.includes("kahve") || norm.includes("doypack") || norm.includes("kilit")) {
      matched = PRODUCTS_TAXONOMY.find(p => p.name === "Kilitli & Fermuarlı Poşetler (Doypack vb.)");
    } else if (norm.includes("patpat") || norm.includes("balonlu")) {
      matched = PRODUCTS_TAXONOMY.find(p => p.name === "Balonlu Patpat Naylonlar");
    } else if (norm.includes("şrink") || norm.includes("shrink")) {
      matched = PRODUCTS_TAXONOMY.find(p => p.name === "Şrink Filmler (P.E, POF, PVC)");
    } else if (norm.includes("tela") || norm.includes("nonwoven")) {
      matched = PRODUCTS_TAXONOMY.find(p => p.name === "Nonwoven (Tela) Çantalar");
    } else if (norm.includes("bez") || norm.includes("pamuk")) {
      matched = PRODUCTS_TAXONOMY.find(p => p.name === "Ham Bez (Pamuk) Çantalar");
    } else if (norm.includes("kargo") || norm.includes("zarf")) {
      matched = PRODUCTS_TAXONOMY.find(p => p.name === "Standart (Baskısız) Kargo Poşetleri");
    } else {
      matched = PRODUCTS_TAXONOMY.find(p => p.name === "Mağaza Poşeti - El Geçme");
    }
  }

  const p = matched!;
  const v = findClosestVariant(p, prompt) || p;
  const dimensions = v.olculer || v.dimensions || (p.type === "kraft" ? "26x35x9 cm" : (p.type === "kargo" ? "30x40 cm" : "35x45 cm"));

  const quantityMatch = norm.match(/(\d+)\s*(bin|adet|pcs)/);
  const qty = quantityMatch ? parseInt(quantityMatch[1]) * (norm.includes("bin") ? 1000 : 1) : 10000;
  
  let priceUnit = v.price || p.price;
  let volMultiplier = 1.0;
  const multipliers = v.multipliers || (p as any).multipliers;
  if (multipliers) {
    const sortedQtys = Object.keys(multipliers).map(Number).sort((a, b) => a - b);
    let matchedQty = sortedQtys[0];
    for (const q of sortedQtys) {
      if (q <= qty) {
        matchedQty = q;
      }
    }
    volMultiplier = multipliers[matchedQty] || 1.0;
  }
  priceUnit = priceUnit * volMultiplier;

  const showAdhesivePocketAddon = (() => {
    const category = p.category;
    const nameLower = p.name.toLowerCase();
    if (nameLower.includes("cepli")) return false;
    if (nameLower.includes("fatura cebi ve irsaliye zarfları") || nameLower.includes("fatura cebi") || nameLower.includes("irsaliye zarfları")) return false;
    const isKargoCategory = p.type === "kargo" || category === "kargoPlastik" || category === "kargoCepli" || category === "kargoKagit" || category === "fatura";
    if (!isKargoCategory) return false;
    const hasShowKeyword = nameLower.includes("baskılı") || nameLower.includes("standart") || nameLower.includes("baskısız") || nameLower.includes("kağıt") || nameLower.includes("balonlu") || nameLower.includes("baskili") || nameLower.includes("baskisiz") || nameLower.includes("kagit");
    return hasShowKeyword;
  })();

  const userWantsPocket = norm.includes("fatura cebi") || norm.includes("fatura cepli") || norm.includes("irsaliye cebi") || (norm.includes("cepli") && !p.name.toLowerCase().includes("cepli"));
  const addAdhesivePocket = showAdhesivePocketAddon && userWantsPocket;
  let customDetails = v.details || p.details;
  if (addAdhesivePocket) {
    priceUnit += 0.24;
    customDetails = [...(customDetails || [])];
    if (!customDetails.includes("Ekstra Yapışkanlı Fatura Cebi (Paket/Koli Uyumlu)")) {
      customDetails.push("Ekstra Yapışkanlı Fatura Cebi (Paket/Koli Uyumlu)");
    }
  }

  const formattedPrice = `₺${priceUnit.toFixed(2)}`;
  const formattedTotal = `₺${Math.round(qty * priceUnit).toLocaleString()}`;
  
  const isExplicitUnprinted = norm.includes("baskısız") || norm.includes("baskı istemiyorum") || norm.includes("baskı olmasın");
  const baskiDurumu = isExplicitUnprinted ? "Baskısız" : "Baskılı";
  const renkSayisiString = isExplicitUnprinted ? "Lütfen Renk Sayısı Seçin" : "2 Renk";

  return {
    assistantText: `Seçmiş olduğunuz **${p.name}** ürünü için teknik spesifikasyon şartnamesini ve kurumsal ambalaj teklif şablonunuzu oluşturduk. ${v.material || p.material} yapısı ve yüksek dirençli yapısıyla mukavemeti en üst düzeyde tutmaktadır. Markanızın değerini artıracak kurumsal çözümlerimizi özellikleri ile birlikte inceleyebilirsiniz.`,
    spec: {
      name: p.name,
      dimensions,
      material: v.material || p.material,
      thickness: v.thickness || p.thickness,
      closure: v.closure || p.closure,
      color: norm.includes("beyaz") ? "Beyaz Renkli Zemin" : (norm.includes("siyah") ? "Siyah Renkli Zemin" : "Standart Renkli Zemin"),
      leadTime: "10-12 İş Günü",
      moq: `${qty.toLocaleString()} Adet`,
      unitPrice: formattedPrice,
      totalPrice: formattedTotal,
      imageType: p.category as any,
      customDetails: customDetails,
      ecoScore: v.eco || p.eco,
      baskiDurumu: baskiDurumu,
      renkSayisi: renkSayisiString
    }
  };
}

// API endpoint to process prompt via Gemini Or fallback
app.post("/api/quote", async (req, res) => {
  if (req.body && req.body.action === "submit_rfq") {
    const recipientEmail = "info@poset.com";
    const { customer, items } = req.body;
    console.log(`[RFQ SUBMITTED] Sending quote request for ${customer?.name} (${customer?.phone}) to ${recipientEmail}`);
    return res.json({
      success: true,
      message: `Teklif talebiniz ${recipientEmail} adresine başarıyla iletildi.`,
      recipient: recipientEmail,
      customer,
      itemsCount: Array.isArray(items) ? items.length : 0
    });
  }

  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Lütfen bir prompt belirtin." });
  }

  // Define dynamic mapping generator based on extracted structured parameters
  const generateDynamicPayload = (extracted: {
    urun_kategorisi: string;
    adet_miktari: number;
    baski_durumu: "Baskılı" | "Baskısız";
    baski_detayi: {
      renk_sayisi: number;
      baski_tarafi: "Tek Yön" | "Çift Yön";
    }
  }) => {
    const rawCategory = extracted.urun_kategorisi || "El Geçmeli Mağaza Poşeti";
    const baskiDurumu = extracted.baski_durumu || "Baskılı";
    const baskiDetayi = extracted.baski_detayi || { renk_sayisi: 2, baski_tarafi: "Tek Yön" };

    const promptNorm = prompt.toLowerCase();
    console.log("DEBUG API: prompt =", prompt);
    console.log("DEBUG API: promptNorm =", promptNorm);
    
    // Find the closest product matched in our core taxonomy
    let matched = PRODUCTS_TAXONOMY.find(p => {
      const byKw = p.keywords.some(kw => promptNorm.includes(kw));
      const byName = promptNorm.includes(p.name.toLowerCase());
      if (byKw || byName) {
        console.log(`DEBUG API: Matched ${p.name} (byKw: ${byKw}, byName: ${byName})`);
      }
      return byKw || byName;
    });
    console.log("DEBUG API: matched first step =", matched ? matched.name : null);

    const norm = (rawCategory + " " + prompt).toLowerCase();
    console.log("DEBUG API: norm =", norm);

    if (!matched) {
      if (norm.includes("kraft") || norm.includes("kağıt") || norm.includes("çanta") || norm.includes("karton")) {
        matched = PRODUCTS_TAXONOMY.find(p => p.name === "Kraft Çantalar");
      } else if (norm.includes("gıda") || norm.includes("kahve") || norm.includes("doypack") || norm.includes("kilit")) {
        matched = PRODUCTS_TAXONOMY.find(p => p.name === "Kilitli & Fermuarlı Poşetler");
      } else if (norm.includes("patpat") || norm.includes("balonlu")) {
        matched = PRODUCTS_TAXONOMY.find(p => p.name === "Balonlu Patpat Naylonlar");
      } else if (norm.includes("şrink") || norm.includes("shrink")) {
        matched = PRODUCTS_TAXONOMY.find(p => p.name === "Şrink Filmler (P.E, POF, PVC)");
      } else if (norm.includes("tela") || norm.includes("nonwoven")) {
        matched = PRODUCTS_TAXONOMY.find(p => p.name === "Nonwoven (Tela) Çantalar");
      } else if (norm.includes("bez") || norm.includes("pamuk")) {
        matched = PRODUCTS_TAXONOMY.find(p => p.name === "Ham Bez (Pamuk) Çantalar");
      } else if (norm.includes("kargo") || norm.includes("zarf")) {
        matched = PRODUCTS_TAXONOMY.find(p => p.name === "Standart (Baskısız) Kargo Poşetleri");
      } else {
        matched = PRODUCTS_TAXONOMY.find(p => p.name === "Mağaza Poşeti - El Geçme");
      }
    }

    const p = matched!;
    
    const isKgProduct = p.name.toLowerCase().includes("şrink") || 
                        p.name.toLowerCase().includes("shrink") || 
                        p.name.toLowerCase().includes("patpat") || 
                        p.name.toLowerCase().includes("balonlu") ||
                        p.name.toLowerCase().includes("rulo") ||
                        norm.includes("kg") || 
                        norm.includes("rulo") || 
                        norm.includes("film");

    let adetMiktari = extracted.adet_miktari || (isKgProduct ? 500 : 10000);
    // If the quantity was parsed as default but user prompted kg, it might be 10000 which is huge for kg, so scale down to sensible 500 if unstated
    if (isKgProduct && adetMiktari === 10000 && !prompt.includes("10000") && !prompt.includes("10.000")) {
      adetMiktari = 500;
    }

    const v = findClosestVariant(p, prompt) || p;

    let specType = p.category;
    let material = v.material || p.material;
    let thickness = v.thickness || p.thickness;
    let closure = v.closure || p.closure;
    let color = "Parlak Beyaz / Özel Pantone";
    
    const stokDurumu = (v.stok_durumu || (p as any).stok_durumu || (
      (baskiDurumu === "Baskılı" || p.name.includes("Mağaza") || p.name.includes("Lüks") || p.name.includes("Bez") || p.name.includes("Tela"))
        ? "Siparişle" 
        : "Var"
    )) as "Var" | "Siparişle" | "Yok";
    let leadTime = stokDurumu === "Var" ? "Aynı Gün / 24 Saat Kargo" : (v.termin_suresi || "7-12 İş Günü");
    let priceUnit = v.price || p.price;
    let ecoScore = v.eco || p.eco;
    let customDetails = v.details || p.details;
    let dimensions = v.olculer || v.dimensions || (p.type === "kraft" ? "26x35x9 cm" : (p.type === "kargo" ? "30x40 cm" : "35x45 cm"));

    // Extract dimensions from user prompt if specified and significantly different
    const dimMatch = prompt.match(/(\d+)\s*[x*]\s*(\d+)/);
    if (dimMatch) {
      const userW = parseInt(dimMatch[1]);
      const userH = parseInt(dimMatch[2]);
      const vDim = parseDimensions(dimensions);
      if (vDim.width !== userW || vDim.height !== userH) {
        dimensions = `${userW}x${userH} cm`;
      }
    }

    // Apply price multipliers for printed configurations or scale economies
    if (baskiDurumu === "Baskılı") {
      const colors = baskiDetayi.renk_sayisi || 2;
      const premiumTaraf = baskiDetayi.baski_tarafi === "Çift Yön" ? 1.25 : 1.0;
      priceUnit = priceUnit * (1 + (colors - 1) * 0.08) * premiumTaraf;
    } else {
      // Unprinted is 15% cheaper on face value but lacks marketing utility
      priceUnit = priceUnit * 0.85;
    }

    // Apply volume discount multiplier
    let volMultiplier = 1.0;
    const multipliers = v.multipliers || (p as any).multipliers;
    if (multipliers) {
      const sortedQtys = Object.keys(multipliers).map(Number).sort((a, b) => a - b);
      let matchedQty = sortedQtys[0];
      for (const q of sortedQtys) {
        if (q <= adetMiktari) {
          matchedQty = q;
        }
      }
      volMultiplier = multipliers[matchedQty] || 1.0;
    }
    priceUnit = priceUnit * volMultiplier;

    const showAdhesivePocketAddon = (() => {
      const category = p.category;
      const nameLower = p.name.toLowerCase();
      if (nameLower.includes("cepli")) return false;
      if (nameLower.includes("fatura cebi ve irsaliye zarfları") || nameLower.includes("fatura cebi") || nameLower.includes("irsaliye zarfları")) return false;
      const isKargoCategory = p.type === "kargo" || category === "kargoPlastik" || category === "kargoCepli" || category === "kargoKagit" || category === "fatura";
      if (!isKargoCategory) return false;
      const hasShowKeyword = nameLower.includes("baskılı") || nameLower.includes("standart") || nameLower.includes("baskısız") || nameLower.includes("kağıt") || nameLower.includes("balonlu") || nameLower.includes("baskili") || nameLower.includes("baskisiz") || nameLower.includes("kagit");
      return hasShowKeyword;
    })();

    const userWantsPocket = norm.includes("fatura cebi") || norm.includes("fatura cepli") || norm.includes("irsaliye cebi") || (norm.includes("cepli") && !p.name.toLowerCase().includes("cepli"));
    const addAdhesivePocket = showAdhesivePocketAddon && userWantsPocket;
    if (addAdhesivePocket) {
      priceUnit += 0.24;
      customDetails = [...(customDetails || [])];
      if (!customDetails.includes("Ekstra Yapışkanlı Fatura Cebi (Paket/Koli Uyumlu)")) {
        customDetails.push("Ekstra Yapışkanlı Fatura Cebi (Paket/Koli Uyumlu)");
      }
    }

    const unitLabel = isKgProduct ? "Kg" : "Adet";

    // Ensure price decimals look appropriate
    const formattedPrice = `₺${priceUnit.toFixed(2)}`;
    const formattedTotal = `₺${Math.round(adetMiktari * priceUnit).toLocaleString()}`;

    // Generate expert interactive text addressing brand logos, color triggers and promotional up-selling
    let assistantText = "";
    if (baskiDurumu === "Baskılı") {
      assistantText = `
**Tebrikler! Marka logolu ve prestijli bir kurumsal ambalaj tasarımı seçtiniz.** 

Yapay zeka asistanı analizimiz sonucunda, firmanızın kurumsal değerini sokağa taşıyacak **${p.name}** spesifikasyon şartnamesini hazırladım. Detayları yan tarafta yer alan teknik panelde inceleyebilirsiniz. 

Sokaklarda markanızın ücretsiz reklamını yapacak **${baskiDetayi.renk_sayisi} Renk ${baskiDetayi.baski_tarafi}** baskılı üretimimiz için şu bilgileri paylaşabilir misiniz?
1. **Marka logonuz hazır mı?** Vektörel formatta (.PDF, .AI, .CDR, .EPS) logonuzu bize iletebilir misiniz? Kaç renkli bir baskı planlıyorsunuz?
2. Tasarım ekibimizin size tamamen **ücretsiz** hazırlayacağı **3D ambalaj ön izleme mock-up** çalışmasıyla logo yerleşimini görmek ister misiniz?

Belirttiğiniz **${adetMiktari.toLocaleString()} ${unitLabel}** sipariş hacmi için tüm üretim hattı optimize edilmiştir.
      `.trim();
    } else {
      // Up-sell dynamic content
      assistantText = `
Talebiniz doğrultusunda **${adetMiktari.toLocaleString()} ${unitLabel}** baskısız (düz) **${p.name}** teknik şartnamesini derledim. Detaylara yan taraftan göz atabilirsiniz.

**💡 Ambalaj & Marka Gücü Hakkında Önemli Bir Hatırlatma:**
Düz (baskısız) ambalajlar ilk aşamada bütçeye uygun görünse de, müşterilerinizin ürününüzü taşırken yapacağı reklamın değeri paha biçilemezdir. **Logo baskılı özel tasarım ambalajlar, firmanıza kurumsal bir imaj kazandırır ve marka bilinirliğini ücretsiz olarak %85 oranında artırır!**

Gelin markanıza elit bir değer katmak adına küçük bir dokunuş yapalım:
- Markanızın logosunu bizimle paylaşın, grafik ekibimiz size **tamamen taahhütsüz ve ücretsiz olarak 3D logolu ambalaj görselleştirmesi** hazırlasın.
- Baskılı seçeneğin birim fiyattaki ufak farkını kıyaslamak ve markanızın kurumsal prestijini katlamak için tasarladığınız **renk sayısını** bize iletmeniz yeterli!
      `.trim();
    }

    const renkSayisiString = baskiDetayi.renk_sayisi === 1 ? "1 Renk" :
                            baskiDetayi.renk_sayisi === 2 ? "2 Renk" :
                            baskiDetayi.renk_sayisi === 3 ? "3 Renk" :
                            baskiDetayi.renk_sayisi === 4 ? "4 Renk (CMYK)" : "5+ Renk / Özel Renk";

    return {
      assistantText,
      spec: {
        name: p.name,
        dimensions,
        material,
        thickness,
        closure,
        color,
        leadTime,
        stokDurumu,
        stok_durumu: stokDurumu,
        moq: `${adetMiktari.toLocaleString()} ${unitLabel}`,
        unitPrice: formattedPrice,
        totalPrice: formattedTotal,
        imageType: specType,
        customDetails,
        ecoScore,
        baskiDurumu: (baskiDurumu === "Baskısız" ? "Baskısız" : "Baskılı"),
        renkSayisi: renkSayisiString
      }
    };
  };

  const ai = getGeminiClient();
  if (!ai) {
    // If no client configured, parse prompt directly with default parameters complying with rules
    console.log("No Gemini API key detected in secrets. Emulating strict response schema...");
    const norm = prompt.toLowerCase();
    
    // Default to printed ("Baskılı") unless user explicitly states unprinted ("baskısız", "baskı istemiyorum")
    const isExplicitUnprinted = norm.includes("baskısız") || norm.includes("baskı istemiyorum") || norm.includes("baskı olmasın");
    const baskiDurumu = isExplicitUnprinted ? "Baskısız" : "Baskılı";
    
    let urunKategorisi = "El Geçmeli Mağaza Poşeti";
    if (norm.includes("kargo")) urunKategorisi = "Kargo Poşeti";
    else if (norm.includes("kraft") || norm.includes("kağıt")) urunKategorisi = "Kraft Taşıma Çantası";
    else if (norm.includes("gıda") || norm.includes("kahve") || norm.includes("doypack")) urunKategorisi = "Doypack Kilitli Gıda Ambalajı";
    else if (norm.includes("balonlu") || norm.includes("bubble") || norm.includes("patpat")) urunKategorisi = "Balonlu Patpat Ambalaj";

    const extracted = {
      urun_kategorisi: urunKategorisi,
      adet_miktari: norm.includes("kraft") ? 5000 : 10000,
      baski_durumu: baskiDurumu as "Baskılı" | "Baskısız",
      baski_detayi: {
        renk_sayisi: isExplicitUnprinted ? 0 : 2,
        baski_tarafi: "Tek Yön" as "Tek Yön" | "Çift Yön"
      }
    };

    const payload = generateDynamicPayload(extracted);
    return res.json({
      ...payload,
      structuredAnalysis: extracted
    });
  }

  try {
    const promptInstructions = `
      You are the specialized "poset.com Industrial Design & Commercial Ambalaj AI".
      The user wants to customize a packaging solution (kargo poşeti, kraft çanta, doypack gıda ambalajı, balonlu ambalaj or mağaza poşeti).
      Analyze their raw natural language prompt: "${prompt}"

      CRITICAL TİCARİ ODAK (COMMERCIAL FOCUS) Guidelines:
      1. Default to Printed (Baskılı): If the user gives a plain/vague request like "Kargo poşeti istiyorum" or "Mağaza poşeti lazım" WITHOUT specifying printed or unprinted, you MUST assume "baski_durumu" is "Baskılı".
      2. If they explicitly request unprinted (e.g. "baskısız poşet", "baskısı olmasın"), set "baski_durumu" to "Baskısız" and color_count to 0.
      3. For printed bags, set "renk_sayisi" to at least 1 or 2 by default unless specified. "baski_tarafi" defaults to "Tek Yön" unless they specify double-sided ("çift yön").

      Output MUST strictly follow the requested JSON schema constraints.
    `;

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptInstructions,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              urun_kategorisi: { 
                type: Type.STRING,
                description: "E-ticaret Kargo Poşeti, FSC Sertifikalı Kraft Çanta, Doypack Gıda Ambalajı, El Geçmeli Mağaza Poşeti veya Balonlu Patpat Ambalaj."
              },
              adet_miktari: { 
                type: Type.INTEGER,
                description: "Talep edilen adet miktarı. Kullanıcı belirtmediyse sektörel MOQ değerini varsayılan yap: Kraft için 5000, Plastikler için 10000."
              },
              baski_durumu: { 
                type: Type.STRING, 
                enum: ["Baskılı", "Baskısız"],
                description: "Kullanıcı doğal dil girerken baskısız olduğunu doğrudan belirtmediyse varsayılan olarak kesinlikle 'Baskılı' yap."
              },
              baski_detayi: {
                type: Type.OBJECT,
                properties: {
                  renk_sayisi: { 
                    type: Type.INTEGER,
                    description: "Baskı renk sayısı. Eğer baskı durumu Baskılı ise ve belirtilmemişse varsayılan olarak en az 1 or 2 yap. Baskısız ise 0 yap."
                  },
                  baski_tarafi: { 
                    type: Type.STRING, 
                    enum: ["Tek Yön", "Çift Yön"],
                    description: "Baskı uygulanacak taraf yönü. Belirtilmemişse varsayılan olarak 'Tek Yön' seç."
                  }
                },
                required: ["renk_sayisi", "baski_tarafi"]
              }
            },
            required: ["urun_kategorisi", "adet_miktari", "baski_durumu", "baski_detayi"]
          }
        }
      });
    } catch (primaryModelError) {
      console.log("Primary Gemini model busy, attempting secondary fallback model...");
      response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: promptInstructions,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              urun_kategorisi: { 
                type: Type.STRING,
                description: "E-ticaret Kargo Poşeti, FSC Sertifikalı Kraft Çanta, Doypack Gıda Ambalajı, El Geçmeli Mağaza Poşeti veya Balonlu Patpat Ambalaj."
              },
              adet_miktari: { 
                type: Type.INTEGER,
                description: "Talep edilen adet miktarı. Kullanıcı belirtmediyse sektörel MOQ değerini varsayılan yap: Kraft için 5000, Plastikler için 10000."
              },
              baski_durumu: { 
                type: Type.STRING, 
                enum: ["Baskılı", "Baskısız"],
                description: "Kullanıcı doğal dil girerken baskısız olduğunu doğrudan belirtmediyse varsayılan olarak kesinlikle 'Baskılı' yap."
              },
              baski_detayi: {
                type: Type.OBJECT,
                properties: {
                  renk_sayisi: { 
                    type: Type.INTEGER,
                    description: "Baskı renk sayısı. Eğer baskı durumu Baskılı ise ve belirtilmemişse varsayılan olarak en az 1 or 2 yap. Baskısız ise 0 yap."
                  },
                  baski_tarafi: { 
                    type: Type.STRING, 
                    enum: ["Tek Yön", "Çift Yön"],
                    description: "Baskı uygulanacak taraf yönü. Belirtilmemişse varsayılan olarak 'Tek Yön' seç."
                  }
                },
                required: ["renk_sayisi", "baski_tarafi"]
              }
            },
            required: ["urun_kategorisi", "adet_miktari", "baski_durumu", "baski_detayi"]
          }
        }
      });
    }

    let extracted;
    try {
      const respText = response?.text;
      if (respText && typeof respText === "string" && respText.trim() !== "") {
        const cleanedText = respText.replace(/```json/gi, "").replace(/```/g, "").trim();
        if (cleanedText === "undefined" || !cleanedText.startsWith("{")) {
          console.warn("Gemini response is not valid JSON format:", cleanedText);
          extracted = {};
        } else {
          try {
            extracted = JSON.parse(cleanedText);
          } catch (pe) {
            console.warn("JSON.parse failed on cleanedText:", cleanedText, pe);
            extracted = {};
          }
        }
      } else {
        extracted = {};
      }
    } catch (pe) {
      console.warn("Gemini response processing failed:", pe);
      extracted = {};
    }
    
    // Generate full UI model spec and text based on the strictly validated Gemini structured extraction
    const payload = generateDynamicPayload(extracted);

    return res.json({
      ...payload,
      structuredAnalysis: extracted
    });

  } catch (error) {
    console.log("Gemini model capacity limits or error encountered, activation of clean rules-based generator");
    // Silent failover to premium secure backup with commercial rules emulated
    const norm = prompt.toLowerCase();
    const isExplicitUnprinted = norm.includes("baskısız") || norm.includes("baskı istemiyorum");
    const extractedFallback = {
      urun_kategorisi: norm.includes("kargo") ? "Kargo Poşeti" : (norm.includes("kraft") ? "Kraft Taşıma Çantası" : "El Geçmeli Mağaza Poşeti"),
      adet_miktari: norm.includes("kraft") ? 5000 : 10000,
      baski_durumu: (isExplicitUnprinted ? "Baskısız" : "Baskılı") as "Baskılı" | "Baskısız",
      baski_detayi: {
        renk_sayisi: isExplicitUnprinted ? 0 : 2,
        baski_tarafi: "Tek Yön" as "Tek Yön" | "Çift Yön"
      }
    };
    const payload = generateDynamicPayload(extractedFallback);
    return res.json({
      ...payload,
      structuredAnalysis: extractedFallback
    });
  }
});

// ==========================================
// ADMIN SETTINGS & CURRENCY API ENDPOINTS
// ==========================================

const SETTINGS_FILE = path.resolve(process.cwd(), "data/settings.json");
const PRODUCTS_FILE = path.resolve(process.cwd(), "data/products.json");
const CATEGORIES_FILE = path.resolve(process.cwd(), "data/categories.json");

async function getSettingsData() {
  const raw = await safeReadJson<any>(SETTINGS_FILE, {
    usd_try_rate: 35.0,
    rate_mode: "manual",
    collect_api_key: "",
    last_updated: new Date().toLocaleString("tr-TR")
  });
  const rate = Number(raw?.usd_try_rate ?? raw?.dolar_kuru ?? raw?.usd_try) || 35.0;
  return {
    rate_mode: raw?.rate_mode || "manual",
    collect_api_key: raw?.collect_api_key || "",
    last_updated: raw?.last_updated || new Date().toLocaleString("tr-TR"),
    ...raw,
    usd_try_rate: rate,
    dolar_kuru: rate,
    usd_try: rate
  };
}

async function saveSettingsData(data: any) {
  try {
    await safeWriteJson(SETTINGS_FILE, data);
    return true;
  } catch (err) {
    console.error("Error writing settings.json:", err);
    return false;
  }
}

async function getProductsData(): Promise<any[]> {
  const data = await safeReadJson<any[]>(PRODUCTS_FILE, []);
  return Array.isArray(data) ? data : [];
}

async function saveProductsData(products: any[]) {
  try {
    await safeWriteJson(PRODUCTS_FILE, products);
    return true;
  } catch (err) {
    console.error("Error writing products.json:", err);
    return false;
  }
}

const DEFAULT_CATEGORIES = [
  "E-TİCARET VE KARGO AMBALAJLARI",
  "PLASTİK POŞETLER",
  "KAĞIT VE KARTON ÇANTALAR",
  "BEZ VE TELA ÇANTALAR",
  "KORUYUCU VE ENDÜSTRİYEL AMBALAJ"
];

async function getCategoriesData(): Promise<string[]> {
  const data = await safeReadJson<string[]>(CATEGORIES_FILE, DEFAULT_CATEGORIES);
  return Array.isArray(data) && data.length > 0 ? data : DEFAULT_CATEGORIES;
}

async function saveCategoriesData(categories: string[]) {
  try {
    await safeWriteJson(CATEGORIES_FILE, categories);
    return true;
  } catch (err) {
    console.error("Error writing categories.json:", err);
    return false;
  }
}


// CollectAPI Rate Limiting Guard & System Key
const DEFAULT_COLLECT_API_KEY = process.env.COLLECT_API_KEY || "5FzmRhNGQrHuKmbf03PmYU:0lXeOca14Soi4nfEc81MH1";
let dailyCallCount = 0;
let lastResetTimestamp = Date.now();

function canMakeCollectApiCall(): boolean {
  const now = Date.now();
  // Reset daily call counter after 24 hours
  if (now - lastResetTimestamp > 24 * 60 * 60 * 1000) {
    dailyCallCount = 0;
    lastResetTimestamp = now;
  }
  return dailyCallCount < 95;
}

// Core helper to fetch live USD/TRY rate from CollectAPI
async function fetchAndSaveLiveCurrency(customApiKey?: string): Promise<{ success: boolean; fetched_rate?: number; settings?: any; message?: string }> {
  if (!customApiKey && !canMakeCollectApiCall()) {
    console.warn(`[CollectAPI Guard] 24 saatlik 95 istek limiti doldu (${dailyCallCount}/95). Otomatik kur çekme durduruldu.`);
    return {
      success: false,
      message: `24 saatlik 95 istek limiti doldu (${dailyCallCount}/95). Otomatik kur çekme durduruldu.`
    };
  }

  const rawKey = customApiKey || DEFAULT_COLLECT_API_KEY;
  const cleanKey = rawKey.trim().replace(/^apikey\s+/i, '');
  const authHeader = `apikey ${cleanKey}`;

  let rateVal: number | null = null;

  // 1. Primary: https://api.collectapi.com/economy/allCurrency
  try {
    const apiRes = await fetch("https://api.collectapi.com/economy/allCurrency", {
      method: "GET",
      headers: {
        "content-type": "application/json",
        "authorization": authHeader
      }
    });

    if (apiRes.ok) {
      const data: any = await apiRes.json();
      if (data && data.success && Array.isArray(data.result)) {
        const usdItem = data.result.find((item: any) => 
          (item.code && item.code.toUpperCase() === "USD") || 
          (item.name && item.name.toLowerCase().includes("dolar"))
        );

        if (usdItem && (usdItem.selling || usdItem.calculated || usdItem.rate)) {
          const rawRate = usdItem.selling || usdItem.calculated || usdItem.rate;
          const parsed = parseFloat(String(rawRate).replace(",", "."));
          if (!isNaN(parsed) && parsed > 0) {
            rateVal = parsed;
          }
        }
      }
    }
  } catch (e) {
    console.warn("allCurrency attempt error:", e);
  }

  // 2. Secondary: https://api.collectapi.com/economy/currencyToAll?int=1&base=USD
  if (!rateVal) {
    try {
      const apiRes = await fetch("https://api.collectapi.com/economy/currencyToAll?int=1&base=USD", {
        method: "GET",
        headers: {
          "content-type": "application/json",
          "authorization": authHeader
        }
      });

      if (apiRes.ok) {
        const data: any = await apiRes.json();
        if (data && data.success && data.result) {
          const list = Array.isArray(data.result.data) 
            ? data.result.data 
            : (Array.isArray(data.result) ? data.result : []);
          
          const tryItem = list.find((item: any) => 
            (item.code && (item.code.toUpperCase() === "TRY" || item.code.toUpperCase() === "TL")) ||
            (item.name && (item.name.toLowerCase().includes("lira") || item.name.toLowerCase().includes("turkish")))
          );

          if (tryItem) {
            const raw = tryItem.calculated !== undefined ? tryItem.calculated : (tryItem.calculatedstr || tryItem.rate);
            const parsed = parseFloat(String(raw).replace(",", "."));
            if (!isNaN(parsed) && parsed > 0) {
              rateVal = parsed;
            }
          }
        }
      }
    } catch (e) {
      console.warn("currencyToAll attempt error:", e);
    }
  }

  // 3. Tertiary: https://api.collectapi.com/economy/singleCurrency?tag=USD
  if (!rateVal) {
    try {
      const apiRes = await fetch("https://api.collectapi.com/economy/singleCurrency?tag=USD", {
        method: "GET",
        headers: {
          "content-type": "application/json",
          "authorization": authHeader
        }
      });

      if (apiRes.ok) {
        const data: any = await apiRes.json();
        if (data && data.success && data.result && data.result.rate) {
          const parsed = parseFloat(String(data.result.rate).replace(",", "."));
          if (!isNaN(parsed) && parsed > 0) {
            rateVal = parsed;
          }
        }
      }
    } catch (e) {
      console.warn("singleCurrency attempt error:", e);
    }
  }

  if (rateVal && rateVal > 0) {
    dailyCallCount++;
    const settings = await getSettingsData();
    settings.usd_try_rate = rateVal;
    settings.dolar_kuru = rateVal;
    settings.usd_try = rateVal;
    settings.rate_mode = "api";
    settings.collect_api_key = cleanKey;
    settings.last_updated = new Date().toLocaleString("tr-TR");
    await saveSettingsData(settings);
    console.log(`[CollectAPI Auto-Sync] Canlı USD Kuru Güncellendi: ₺${rateVal.toFixed(4)} (Günlük İstek: ${dailyCallCount}/95)`);
    return {
      success: true,
      fetched_rate: rateVal,
      settings
    };
  }

  return {
    success: false,
    message: "CollectAPI servisinden USD/TRY döviz kuru alınamadı."
  };
}

// Automatic 30-Minute Currency Refresh Timer (Max 95 requests per 24 hours)
setInterval(async () => {
  try {
    const settings = await getSettingsData();
    // Auto sync when rate_mode is api or default
    if (settings.rate_mode !== "manual") {
      console.log("[CollectAPI Auto-Sync] 30 dakikalık periyodik kur güncellemesi tetiklendi...");
      await fetchAndSaveLiveCurrency();
    }
  } catch (err) {
    console.error("Auto currency refresh error:", err);
  }
}, 30 * 60 * 1000);

// Run initial currency check 10 seconds after server startup
setTimeout(() => {
  fetchAndSaveLiveCurrency().catch(e => console.warn("Initial currency fetch warning:", e));
}, 10000);

// Settings GET/POST
app.get(["/api/admin/settings", "/api/settings"], async (req, res) => {
  const settings = await getSettingsData();
  return res.json(settings);
});

app.post("/api/admin/settings", async (req, res) => {
  const body = req.body || {};
  const current = await getSettingsData();

  let rateVal = current.usd_try_rate;
  if (body.usd_try_rate !== undefined) {
    const parsed = typeof body.usd_try_rate === "number" 
      ? body.usd_try_rate 
      : parseFloat(String(body.usd_try_rate).replace(",", "."));
    if (!isNaN(parsed) && parsed > 0) {
      rateVal = parsed;
    }
  } else if (body.dolar_kuru !== undefined) {
    const parsed = typeof body.dolar_kuru === "number"
      ? body.dolar_kuru
      : parseFloat(String(body.dolar_kuru).replace(",", "."));
    if (!isNaN(parsed) && parsed > 0) {
      rateVal = parsed;
    }
  }

  const rawKey = body.collect_api_key !== undefined ? String(body.collect_api_key) : (current.collect_api_key || DEFAULT_COLLECT_API_KEY);
  const cleanKey = rawKey.trim().replace(/^apikey\s+/i, '');

  const updated = {
    ...current,
    usd_try_rate: rateVal,
    dolar_kuru: rateVal,
    usd_try: rateVal,
    rate_mode: body.rate_mode || "manual",
    collect_api_key: cleanKey,
    last_updated: new Date().toLocaleString("tr-TR")
  };
  await saveSettingsData(updated);
  return res.json({ success: true, settings: updated });
});

// Refresh rate from CollectAPI
app.post("/api/admin/refresh-rate", async (req, res) => {
  const body = req.body || {};
  const result = await fetchAndSaveLiveCurrency(body.collect_api_key);
  if (result.success) {
    return res.json(result);
  }
  return res.status(400).json(result);
});

// Product CRUD endpoints
app.get(["/api/admin/products", "/api/products"], async (_req, res) => {
  try {
    const filePath = path.resolve(process.cwd(), 'data/products.json');
    const fileData = await fs.promises.readFile(filePath, 'utf-8');
    const products = JSON.parse(fileData);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    return res.json(products);
  } catch (err) {
    console.error("GET products error:", err);
    return res.status(500).json({ error: "Veritabanı okunamadı" });
  }
});

app.post(["/api/admin/products", "/api/products"], async (req, res) => {
  try {
    const productsFilePath = path.resolve(process.cwd(), 'data/products.json');
    const fileData = await fs.promises.readFile(productsFilePath, 'utf-8');
    const products: any[] = JSON.parse(fileData);
    const newProd = req.body || {};

    // Support HTTP method override or explicit action=delete
    if (newProd._method === "DELETE" || newProd.action === "delete" || newProd.action === "delete_product") {
      const rawTarget = newProd.urun_kodu || newProd.sku || newProd.id || newProd.sira_no;
      const target = decodeURIComponent(String(rawTarget || "")).trim().toLowerCase();
      const filtered = products.filter((p: any) => {
        const pCode = String(p.urun_kodu || p.sku || p.id || "").trim().toLowerCase();
        const pSira = String(p.sira_no || "").trim().toLowerCase();
        return pCode !== target && pSira !== target;
      });

      if (filtered.length === products.length) {
        return res.status(404).json({ success: false, message: "Silinecek ürün bulunamadı: " + target, products });
      }

      await safeWriteJson(productsFilePath, filtered);
      return res.json({ success: true, deleted_sku: target, count: filtered.length, products: filtered });
    }

    // Auto-generate sira_no
    const maxSiraNo = products.reduce((max: number, p: any) => Math.max(max, Number(p.sira_no) || 0), 0);
    newProd.sira_no = maxSiraNo + 1;
    if (!newProd.urun_kodu) {
      newProd.urun_kodu = `PRD-${Date.now().toString().slice(-6)}`;
    }
    const rawPrice = newProd.birim_fiyat ?? newProd.birim_fiyati ?? newProd.fiyat ?? 0;
    const cleanPrice = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice).replace(',', '.'));
    const finalPrice = isNaN(cleanPrice) ? 0 : cleanPrice;

    newProd.birim_fiyat = finalPrice;
    newProd.birim_fiyati = finalPrice;
    newProd.fiyat_aliniz = finalPrice > 0 ? false : (newProd.fiyat_aliniz ?? true);

    if (!newProd.para_birimi) {
      newProd.para_birimi = "TL";
    }
    if (!newProd.stok_durumu) {
      newProd.stok_durumu = "Siparişle";
    }

    products.unshift(newProd);
    await safeWriteJson(productsFilePath, products);
    return res.json({ success: true, product: newProd, products });
  } catch (err: any) {
    console.error("POST product error:", err);
    return res.status(500).json({ success: false, message: err?.message || "Ürün eklenirken hata oluştu." });
  }
});

app.put([
  "/api/admin/products/:sku", 
  "/api/admin/products/:urun_kodu", 
  "/api/admin/products/by-sira/:sira_no",
  "/api/admin/products"
], async (req, res) => {
  try {
    const productsFilePath = path.resolve(process.cwd(), 'data/products.json');
    const fileData = await fs.promises.readFile(productsFilePath, 'utf-8');
    const products: any[] = JSON.parse(fileData);

    const rawSkuParam = req.params.sku || req.params.urun_kodu || req.params.sira_no || req.body?.urun_kodu || req.body?.sku || req.body?.id || "";
    const targetSku = decodeURIComponent(String(rawSkuParam)).trim();

    if (!targetSku) {
      console.error("HATA: Hedef SKU/Ürün Kodu boş!");
      return res.status(400).json({ success: false, message: "HATA: Hedef SKU/Ürün Kodu boş!" });
    }

    const index = products.findIndex((p: any) => 
      (p.urun_kodu && String(p.urun_kodu).trim() === targetSku) || 
      (p.sku && String(p.sku).trim() === targetSku) ||
      (p.id && String(p.id).trim() === targetSku) ||
      (p.sira_no !== undefined && String(p.sira_no).trim() === targetSku) ||
      (p.urun_kodu && String(p.urun_kodu).toLowerCase() === targetSku.toLowerCase())
    );

    if (index === -1) {
      console.error("HATA: Ürün bulunamadı ->", targetSku);
      return res.status(404).json({ success: false, message: `HATA: Ürün bulunamadı -> ${targetSku}` });
    }

    const rawPrice = req.body.birim_fiyat ?? req.body.birim_fiyati ?? req.body.fiyat ?? 0;
    const cleanPrice = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice).replace(',', '.'));
    const finalPrice = isNaN(cleanPrice) ? 0 : cleanPrice;

    const updatedProd = {
      ...products[index],
      ...req.body,
      sira_no: products[index].sira_no,
      urun_kodu: req.body.urun_kodu || products[index].urun_kodu,
      birim_fiyat: finalPrice,
      birim_fiyati: finalPrice,
      // KRİTİK: Fiyat > 0 ise fiyat_aliniz bayrağını ve isPremiumPrice bayrağını kesinlikle FALSE yap
      fiyat_aliniz: finalPrice > 0 ? false : (req.body.fiyat_aliniz ?? true),
      isPremiumPrice: finalPrice > 0 ? false : (req.body.isPremiumPrice ?? false)
    };

    if (finalPrice > 0) {
      updatedProd.fiyat_aliniz = false;
      updatedProd.isPremiumPrice = false;
    }

    products[index] = updatedProd;

    // Strip out remaining isPremiumPrice: true flags for priced items in array
    for (const p of products) {
      const pPrice = Number(p.birim_fiyat ?? p.birim_fiyati) || 0;
      if (pPrice > 0) {
        p.fiyat_aliniz = false;
        p.isPremiumPrice = false;
      }
    }

    await safeWriteJson(productsFilePath, products);

    console.log(`[Ürün Fiyatı Güncellendi] SKU: ${updatedProd.urun_kodu} -> ₺${finalPrice} (fiyat_aliniz: ${updatedProd.fiyat_aliniz})`);
    return res.json({ success: true, product: updatedProd, products });
  } catch (err: any) {
    console.error("PUT product error:", err);
    return res.status(500).json({ success: false, message: err?.message || "Ürün güncellenirken hata oluştu." });
  }
});

app.delete([
  "/api/admin/products/:urun_kodu", 
  "/api/admin/products/by-sira/:sira_no",
  "/api/admin/products",
  "/api/products/:urun_kodu",
  "/api/products/by-sira/:sira_no",
  "/api/products"
], async (req, res) => {
  try {
    const rawTarget = req.params.urun_kodu || req.params.sira_no || req.query.sku || req.query.urun_kodu || req.query.sira_no || req.body?.urun_kodu || req.body?.sku || req.body?.sira_no;
    const target = decodeURIComponent(String(rawTarget || "")).trim().toLowerCase();

    if (!target) {
      return res.status(400).json({ success: false, message: "Silinecek ürün kodu veya sıra no belirtilmedi." });
    }

    const products = await getProductsData();
    const filtered = products.filter((p: any) => {
      const pCode = String(p.urun_kodu || p.sku || p.id || "").trim().toLowerCase();
      const pSira = String(p.sira_no || "").trim().toLowerCase();
      return pCode !== target && pSira !== target;
    });

    if (filtered.length === products.length) {
      return res.status(404).json({ success: false, message: "Silinecek ürün bulunamadı: " + target, products });
    }

    await saveProductsData(filtered);
    return res.json({ success: true, deleted_sku: target, count: filtered.length, products: filtered });
  } catch (err: any) {
    console.error("DELETE product error:", err);
    return res.status(500).json({ success: false, message: err?.message || "Ürün silinirken hata oluştu." });
  }
});

// Multiplier Templates CRUD Endpoints
const TEMPLATES_FILE = path.join(process.cwd(), "data", "multiplier_templates.json");

function getMultiplierTemplatesData() {
  try {
    if (fs.existsSync(TEMPLATES_FILE)) {
      const raw = fs.readFileSync(TEMPLATES_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((t: any) => ({
          id: t.id,
          title: t.title,
          multiplierString: t.multiplierString || t.value || "",
          description: t.description || t.desc || ""
        }));
      }
    }
  } catch (e) {}
  return [
    { id: "tpl-1", title: "Kargo Poşetleri Standart", multiplierString: "5k:1.00 / 10k:0.92 / 25k:0.85", description: "5k (Standart) - 10k (%8 İndirim) - 25k (%15 İndirim)" },
    { id: "tpl-2", title: "Mağaza Poşeti Kademe", multiplierString: "1k:1.00 / 5k:0.90 / 10k:0.82 / 25k:0.75", description: "1k (%0) - 5k (%10) - 10k (%18) - 25k (%25)" },
    { id: "tpl-3", title: "Karton Çanta / Özel", multiplierString: "500:1.00 / 1k:0.88 / 3k:0.80", description: "500 Adet (%0) - 1.000 (%12) - 3.000 (%20)" },
    { id: "tpl-4", title: "Atlet / Yüksek Hacim", multiplierString: "10k:1.00 / 25k:0.92 / 50k:0.85", description: "10k (%0) - 25k (%8) - 50k (%15)" }
  ];
}

async function saveMultiplierTemplatesData(data: any[]) {
  const dir = path.dirname(TEMPLATES_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(data, null, 2), "utf-8");
}

app.get(["/api/admin/multiplier-templates", "/api/multiplier-templates"], (req, res) => {
  return res.json(getMultiplierTemplatesData());
});

app.post("/api/admin/multiplier-templates", async (req, res) => {
  try {
    const { title, multiplierString, value, description, desc } = req.body || {};
    const val = (multiplierString || value || "").trim();
    if (!title || !val) {
      return res.status(400).json({ success: false, message: "Lütfen başlık ve çarpan değerlerini giriniz." });
    }

    const templates = getMultiplierTemplatesData();
    const newTpl = {
      id: `tpl-${Date.now()}`,
      title: title.trim(),
      multiplierString: val,
      description: (description || desc || "").trim()
    };

    templates.push(newTpl);
    await saveMultiplierTemplatesData(templates);
    return res.json({ success: true, templates, template: newTpl });
  } catch (err: any) {
    console.error("POST template error:", err);
    return res.status(500).json({ success: false, message: err?.message || "Şablon eklenirken hata oluştu." });
  }
});

app.put("/api/admin/multiplier-templates/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, multiplierString, value, description, desc } = req.body || {};
    const templates = getMultiplierTemplatesData();
    const index = templates.findIndex((t: any) => t.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: "Şablon bulunamadı." });
    }

    const val = multiplierString !== undefined ? multiplierString : value;
    const descVal = description !== undefined ? description : desc;

    templates[index] = {
      ...templates[index],
      title: title !== undefined ? title.trim() : templates[index].title,
      multiplierString: val !== undefined ? String(val).trim() : templates[index].multiplierString,
      description: descVal !== undefined ? String(descVal).trim() : templates[index].description
    };

    await saveMultiplierTemplatesData(templates);
    return res.json({ success: true, templates, template: templates[index] });
  } catch (err: any) {
    console.error("PUT template error:", err);
    return res.status(500).json({ success: false, message: err?.message || "Şablon güncellenirken hata oluştu." });
  }
});

app.delete("/api/admin/multiplier-templates/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const templates = getMultiplierTemplatesData();
    const filtered = templates.filter((t: any) => t.id !== id);

    if (filtered.length === templates.length) {
      return res.status(404).json({ success: false, message: "Silinecek şablon bulunamadı." });
    }

    await saveMultiplierTemplatesData(filtered);
    return res.json({ success: true, templates: filtered, deletedId: id });
  } catch (err: any) {
    console.error("DELETE template error:", err);
    return res.status(500).json({ success: false, message: err?.message || "Şablon silinirken hata oluştu." });
  }
});

async function getEffectiveSmtpConfig() {
  const settings = await getSettingsData();
  const s = settings.smtp || {};
  return {
    host: s.host || process.env.SMTP_HOST || "server.reksa.net",
    port: parseInt(String(s.port || process.env.SMTP_PORT || "465"), 10),
    secure: s.secure !== undefined ? Boolean(s.secure) : true,
    user: s.user || process.env.SMTP_USER || "info@reksa.net",
    pass: s.pass || process.env.SMTP_PASS || "z4DdYyvU32XD",
    fromName: s.fromName || "Poset.com Teklif Sistemi",
    fromEmail: s.fromEmail || s.user || process.env.SMTP_USER || "info@reksa.net"
  };
}

function sendSmtpEmailNode(options: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  smtpConfig?: any;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  return new Promise(async (resolve) => {
    let resolved = false;
    const finish = (success: boolean, message?: string, error?: string) => {
      if (!resolved) {
        resolved = true;
        try { socket.destroy(); } catch (e) {}
        resolve({ success, message, error });
      }
    };

    const cfg = options.smtpConfig || await getEffectiveSmtpConfig();
    const host = cfg.host || "server.reksa.net";
    const port = parseInt(String(cfg.port || "465"), 10);
    const user = cfg.user || "info@reksa.net";
    const pass = cfg.pass || "";
    const fromName = cfg.fromName || "Poset.com Teklif Sistemi";
    const fromAddr = cfg.fromEmail || user;

    if (!user || !pass) {
      return finish(false, undefined, "SMTP kullanıcı adı veya şifresi eksik.");
    }

    const socket = tls.connect(port, host, { rejectUnauthorized: false }, () => {});
    socket.setTimeout(12000, () => {
      finish(false, undefined, "Sunucuya bağlanırken zaman aşımı (Timeout) oluştu.");
    });

    let step = 0;
    let buffer = "";

    const sendCmd = (cmd: string) => {
      socket.write(cmd + "\r\n");
    };

    socket.on("data", (data) => {
      buffer += data.toString();
      const lines = buffer.split("\r\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line) continue;
        const code = parseInt(line.substring(0, 3), 10);
        if (isNaN(code)) continue;

        if (code >= 400 && code <= 599) {
          finish(false, undefined, `SMTP Sunucu Hatası (${code}): ${line.substring(4)}`);
          return;
        }

        if (step === 0 && code === 220) {
          step = 1;
          sendCmd(`EHLO ${host}`);
        } else if (step === 1 && code === 250 && line[3] === " ") {
          step = 2;
          sendCmd("AUTH LOGIN");
        } else if (step === 2 && code === 334) {
          step = 3;
          sendCmd(Buffer.from(user).toString("base64"));
        } else if (step === 3 && code === 334) {
          step = 4;
          sendCmd(Buffer.from(pass).toString("base64"));
        } else if (step === 4 && code === 235) {
          step = 5;
          sendCmd(`MAIL FROM:<${fromAddr}>`);
        } else if (step === 5 && code === 250) {
          step = 6;
          sendCmd(`RCPT TO:<${options.to}>`);
        } else if (step === 6 && code === 250) {
          step = 7;
          sendCmd("DATA");
        } else if (step === 7 && code === 354) {
          step = 8;
          const subjectB64 = "=?UTF-8?B?" + Buffer.from(options.subject).toString("base64") + "?=";
          const headers = [
            `From: "${fromName}" <${fromAddr}>`,
            `To: <${options.to}>`,
            `Subject: ${subjectB64}`,
            `MIME-Version: 1.0`,
            `Content-Type: text/html; charset=UTF-8`,
            `Date: ${new Date().toUTCString()}`
          ];
          if (options.replyTo) {
            headers.push(`Reply-To: ${options.replyTo}`);
          }
          const body = headers.join("\r\n") + "\r\n\r\n" + options.html + "\r\n.";
          sendCmd(body);
        } else if (step === 8 && code === 250) {
          step = 9;
          sendCmd("QUIT");
          socket.end();
          finish(true, "E-posta başarıyla iletildi.");
        }
      }
    });

    socket.on("error", (err: any) => {
      finish(false, undefined, `Soket bağlantı hatası: ${err?.message || err}`);
    });

    socket.on("end", () => {
      if (step < 8) finish(false, undefined, "Sunucu bağlantıyı beklenmedik şekilde kapattı.");
    });
  });
}

// SMTP Settings Endpoints
app.get("/api/admin/smtp", async (req, res) => {
  try {
    const config = await getEffectiveSmtpConfig();
    return res.json({ success: true, smtp: config });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || "Hata oluştu." });
  }
});

app.post("/api/admin/smtp", async (req, res) => {
  try {
    const body = req.body || {};
    const settings = await getSettingsData();
    settings.smtp = {
      host: body.host ? String(body.host).trim() : "server.reksa.net",
      port: body.port ? parseInt(String(body.port), 10) : 465,
      secure: body.secure !== undefined ? Boolean(body.secure) : true,
      user: body.user ? String(body.user).trim() : "info@reksa.net",
      pass: body.pass ? String(body.pass).trim() : "",
      fromName: body.fromName ? String(body.fromName).trim() : "Poset.com Teklif Sistemi",
      fromEmail: body.fromEmail ? String(body.fromEmail).trim() : (body.user ? String(body.user).trim() : "info@reksa.net")
    };
    await saveSettingsData(settings);
    return res.json({ success: true, smtp: settings.smtp });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || "SMTP ayarları kaydedilemedi." });
  }
});

app.post("/api/admin/test-smtp", async (req, res) => {
  try {
    const body = req.body || {};
    const effectiveCfg = body.host ? body : await getEffectiveSmtpConfig();
    const testTo = body.testEmail || effectiveCfg.fromEmail || effectiveCfg.user || "info@reksa.net";

    const result = await sendSmtpEmailNode({
      to: testTo,
      subject: "poset.com SMTP Bağlantı Testi (Başarılı)",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #0b1c3f; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0; font-size: 20px;">poset.com Mail Sunucu Testi</h2>
          </div>
          <div style="padding: 24px; color: #334155; line-height: 1.6;">
            <p style="font-size: 16px; color: #16a34a; font-weight: bold;">✓ Tebrikler! Mail sunucu (SMTP) ayarlarınız başarıyla doğrulandı.</p>
            <p>Bu test iletisi, yönetim panelinden girdiğiniz SMTP sunucu parametreleri kullanılarak gönderilmiştir.</p>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr><td style="padding: 6px 0; font-weight: bold; width: 140px;">SMTP Sunucu:</td><td>${effectiveCfg.host}:${effectiveCfg.port}</td></tr>
              <tr><td style="padding: 6px 0; font-weight: bold;">Gönderici Hesap:</td><td>${effectiveCfg.user}</td></tr>
              <tr><td style="padding: 6px 0; font-weight: bold;">Gönderici Başlık:</td><td>${effectiveCfg.fromName}</td></tr>
              <tr><td style="padding: 6px 0; font-weight: bold;">Test Alıcısı:</td><td>${testTo}</td></tr>
              <tr><td style="padding: 6px 0; font-weight: bold;">Tarih & Saat:</td><td>${new Date().toLocaleString("tr-TR")}</td></tr>
            </table>
          </div>
        </div>
      `,
      smtpConfig: effectiveCfg
    });

    if (result.success) {
      return res.json({ success: true, message: `Test e-postası ${testTo} adresine başarıyla gönderildi.` });
    } else {
      return res.status(400).json({ success: false, message: result.error || "SMTP bağlantısı başarısız oldu." });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || "Test gönderimi sırasında hata oluştu." });
  }
});

const DEFAULT_CATEGORY_SCHEMAS = [
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

async function ensureCategoriesSeeded() {
  const categoriesFilePath = path.join(process.cwd(), 'data', 'categories.json');
  if (fs.existsSync(categoriesFilePath) && fs.statSync(categoriesFilePath).size > 0) {
    let currentCats = await safeReadJson<any[]>(categoriesFilePath, []);
    if (Array.isArray(currentCats) && currentCats.length > 0) {
      const filtered = currentCats.filter((c: any) => {
        const catName = typeof c === 'string' ? c : (c?.name || '');
        const lower = catName.toLowerCase().trim();
        return lower !== 'test2' && lower !== 'testt' && !lower.includes('test2') && !lower.includes('testt');
      });
      if (filtered.length !== currentCats.length) {
        await safeWriteJson(categoriesFilePath, filtered);
      }
      return filtered;
    }
  }
  await safeWriteJson(categoriesFilePath, DEFAULT_CATEGORY_SCHEMAS);
  return DEFAULT_CATEGORY_SCHEMAS;
}

// Category Management REST API Routes
app.get(["/api/admin/categories", "/api/categories"], async (_req, res) => {
  const cats = await ensureCategoriesSeeded();
  res.json(cats);
});

app.post("/api/admin/categories", async (req, res) => {
  const categoriesFilePath = path.join(process.cwd(), 'data', 'categories.json');
  let cats = await ensureCategoriesSeeded();
  
  const rawName = (req.body?.name || "").trim();
  if (!rawName) {
    return res.status(400).json({ success: false, error: "Kategori adı zorunludur." });
  }

  if (cats.some((c: any) => (typeof c === 'string' ? c : c.name).toLowerCase() === rawName.toLowerCase())) {
    return res.status(400).json({ success: false, error: "Bu kategori zaten mevcut." });
  }

  const newCategory = {
    id: req.body.id || `kat_${Date.now()}`,
    name: rawName,
    slug: req.body.slug || rawName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    units: req.body.units && Array.isArray(req.body.units) && req.body.units.length > 0 ? req.body.units : ["Adet"],
    thickness_unit: req.body.thickness_unit || req.body.thickness || "Mikron",
    thickness: req.body.thickness || req.body.thickness_unit || "Mikron",
    default_moq: req.body.default_moq ? Number(req.body.default_moq) : 1000,
    fields: {
      kargo_bant: req.body.fields?.kargo_bant ?? false,
      kulp: req.body.fields?.kulp ?? true,
      koruk: req.body.fields?.koruk ?? true,
      irsaliye_cebi: req.body.fields?.irsaliye_cebi ?? false,
      baski: req.body.fields?.baski ?? true
    },
    allowed_materials: req.body.allowed_materials || []
  };

  cats.push(newCategory);
  await safeWriteJson(categoriesFilePath, cats);
  return res.json({ success: true, categories: cats, category: newCategory });
});

app.put(["/api/admin/categories", "/api/admin/categories/:id"], async (req, res) => {
  const categoriesFilePath = path.join(process.cwd(), 'data', 'categories.json');
  const productsFilePath = path.join(process.cwd(), 'data', 'products.json');
  
  let cats = await ensureCategoriesSeeded();
  let products = await safeReadJson<any[]>(productsFilePath, []);

  const { id: bodyId, oldName, newName, name, units, thickness, fields } = req.body || {};
  const targetId = req.params.id || bodyId;
  const targetOldName = oldName || targetId;
  const targetNewName = (newName || name || "").trim();

  if (!targetNewName) {
    return res.status(400).json({ success: false, error: "Yeni kategori adı zorunludur." });
  }

  let catIndex = cats.findIndex((c: any) => c.id === targetId || c.name === targetOldName || c.name === targetId);
  let previousName = targetOldName;

  if (catIndex !== -1) {
    previousName = cats[catIndex].name;
    cats[catIndex] = {
      ...cats[catIndex],
      name: targetNewName,
      units: Array.isArray(units) ? units : (cats[catIndex].units || ["Adet"]),
      thickness: thickness || (cats[catIndex].thickness || "Mikron"),
      fields: fields || cats[catIndex].fields
    };
  } else {
    previousName = targetOldName;
    cats.push({
      id: "cat-" + Date.now(),
      name: targetNewName,
      units: units || ["Adet"],
      thickness: thickness || "Mikron",
      fields: fields || { kargo_bant: false, irsaliye_cebi: false, kulp: true, koruk: true, baski: true }
    });
  }

  // CASCADE UPDATE: Update all products with old category name to new category name
  if (previousName && previousName !== targetNewName) {
    let updatedProductsCount = 0;
    products = products.map((p: any) => {
      if (p.urun_kategorisi === previousName || p.kategori === previousName) {
        updatedProductsCount++;
        return { ...p, urun_kategorisi: targetNewName };
      }
      return p;
    });

    if (updatedProductsCount > 0) {
      await safeWriteJson(productsFilePath, products);
    }
  }

  await safeWriteJson(categoriesFilePath, cats);
  return res.json({ success: true, categories: cats, products });
});

app.delete(["/api/admin/categories/:id", "/api/admin/categories"], async (req, res) => {
  const categoriesFilePath = path.join(process.cwd(), 'data', 'categories.json');
  const productsFilePath = path.join(process.cwd(), 'data', 'products.json');

  let cats = await ensureCategoriesSeeded();
  let products = await safeReadJson<any[]>(productsFilePath, []);

  const targetParam = req.params.id || req.query.id || req.body?.id || req.body?.name;
  
  const targetCat = cats.find((c: any) => (typeof c === 'string' ? c : c.name) === targetParam || (typeof c === 'object' && c.id === targetParam));
  const catName = targetCat ? (typeof targetCat === 'string' ? targetCat : targetCat.name) : targetParam;

  // CHECK IF ANY PRODUCTS BELONG TO THIS CATEGORY
  const hasProducts = products.some((p: any) => p.urun_kategorisi === catName || p.kategori === catName);
  if (hasProducts) {
    return res.status(400).json({
      success: false,
      error: "Bu kategoriye ait ürünler varken silinemez"
    });
  }

  cats = cats.filter((c: any) => (typeof c === 'string' ? c : c.name) !== catName && (typeof c === 'object' ? c.id !== targetParam : true));
  await safeWriteJson(categoriesFilePath, cats);

  return res.json({ success: true, categories: cats });
});

app.post("/api/quote", async (req, res) => {
  try {
    const { action, customer, items } = req.body || {};
    if (action === "submit_rfq") {
      const to = req.body?.recipient_email || process.env.SMTP_RECIPIENT || "info@poset.com";
      const custName = customer?.name || "Belirtilmedi";
      const custPhone = customer?.phone || "Belirtilmedi";
      const custCompany = customer?.company || "Belirtilmedi";
      const custEmail = customer?.email || "Belirtilmedi";
      const custMonthly = customer?.monthlyConsumption || "Belirtilmedi";

      const subject = `Yeni Teklif Talebi (poset.com) - ${custName}`;

      let body = `<html><head><style>
body { font-family: Arial, sans-serif; color: #333; }
table { width: 100%; border-collapse: collapse; margin-top: 15px; }
th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
th { background-color: #0b1c3f; color: white; }
</style></head><body>
<h2 style='color:#0b1c3f;'>Yeni Fiyat Teklifi Talebi</h2>
<h3>Teklif Sahibinin Bilgileri</h3>
<ul>
<li><strong>Adı Soyadı:</strong> ${custName}</li>
<li><strong>Firma / Marka:</strong> ${custCompany}</li>
<li><strong>Telefon:</strong> ${custPhone}</li>
<li><strong>E-posta:</strong> ${custEmail}</li>
<li><strong>Aylık Ortalama Tüketim:</strong> ${custMonthly}</li>
</ul>
<h3>Talep Edilen Ürünler</h3>
<table>
<tr><th>Ürün Adı</th><th>SKU</th><th>Ölçü</th><th>Miktar</th><th>Baskı / Detay</th><th>Tahmini Tutar</th></tr>`;

      let grandTotal = 0;
      if (Array.isArray(items)) {
        for (const item of items) {
          const uName = item.urun_adi || "";
          const uCode = item.urun_kodu || "";
          const uDim = item.olculer || "";
          const uQty = (item.miktar || 0).toLocaleString() + " " + (item.satis_sekli || "Adet");
          let uPrint = (item.baski_durumu === "Baskısız" ? "Baskısız" : (item.renk_sayisi || ""));
          if (item.fatura_cebi_dahil) {
            uPrint += " (Fatura Cebi Dahil)";
          }
          const uPrice = "₺" + Math.round(item.toplam_fiyat || 0).toLocaleString();
          grandTotal += (item.toplam_fiyat || 0);

          body += `<tr><td>${uName}</td><td>${uCode}</td><td>${uDim}</td><td>${uQty}</td><td>${uPrint}</td><td>${uPrice}</td></tr>`;
        }
      }

      body += `</table>
<h3>Genel Toplam (KDV Hariç): ₺${Math.round(grandTotal).toLocaleString()}</h3>
<hr><p style='font-size:11px;color:#777;'>Bu e-posta poset.com Fiyat Teklif Merkezi üzerinden otomatik oluşturulmuştur.</p>
</body></html>`;

      const sent = await sendSmtpEmailNode({
        to,
        subject,
        html: body,
        replyTo: custEmail !== "Belirtilmedi" ? custEmail : undefined
      });

      return res.json({
        success: true,
        message: `Teklif talebiniz ${to} adresine başarıyla iletildi.`,
        recipient: to,
        smtp_sent: sent.success,
        smtp_error: sent.error
      });
    }

    return res.status(400).json({ success: false, message: "Geçersiz işlem." });
  } catch (err: any) {
    console.error("Quote endpoint error:", err);
    return res.status(500).json({ success: false, message: err?.message || "Sunucu hatası." });
  }
});

// --- ARTICLE MANAGEMENT (AMBALAJ REHBERİ) ENDPOINTS ---
function slugifyArticleTitle(text: string): string {
  const trMap: Record<string, string> = {
    'ç': 'c', 'Ç': 'c', 'ğ': 'g', 'Ğ': 'g', 'ı': 'i', 'I': 'i', 'İ': 'i',
    'ö': 'o', 'Ö': 'o', 'ş': 's', 'Ş': 's', 'ü': 'u', 'Ü': 'u'
  };
  return text
    .split('')
    .map(c => trMap[c] || c)
    .join('')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function getArticlesList(): Promise<any[]> {
  const articlesFilePath = path.join(process.cwd(), 'data', 'articles.json');
  return await safeReadJson<any[]>(articlesFilePath, []);
}

app.get(["/api/articles", "/api/admin/articles"], async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  const articles = await getArticlesList();
  return res.json(articles);
});


app.get("/api/articles/:slug", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  const articles = await getArticlesList();
  const slugParam = req.params.slug;
  const found = articles.find((a: any) => a.slug === slugParam || a.id === slugParam);
  if (!found) {
    return res.status(404).json({ error: "Makale bulunamadı" });
  }
  return res.json(found);
});

app.post("/api/admin/articles", async (req, res) => {
  const articlesFilePath = path.join(process.cwd(), 'data', 'articles.json');
  const articles = await getArticlesList();

  const { baslik, alt_baslik, ozet, icerik, kategori, related_product, gorsel_url, sss, okuma_suresi, slug, tarih, seo, geo_ai } = req.body || {};

  if (!baslik || !baslik.trim()) {
    return res.status(400).json({ success: false, error: "Makale başlığı zorunludur." });
  }

  const generatedSlug = (slug && slug.trim()) ? slugifyArticleTitle(slug) : slugifyArticleTitle(baslik);
  const wordCount = (icerik || "").trim().split(/\s+/).length;
  const calcReadingTime = okuma_suresi || `${Math.max(1, Math.ceil(wordCount / 200))} dk`;
  const articleDate = tarih || new Date().toISOString().split('T')[0];

  const formattedSss = Array.isArray(sss) 
    ? sss.filter((item: any) => item && (item.soru?.trim() || item.cevap?.trim()))
    : [];

  const newArticle = {
    id: `rehber-${Date.now().toString().slice(-6)}`,
    slug: generatedSlug,
    kategori: kategori || "E-TİCARET VE KARGO AMBALAJLARI",
    baslik: baslik.trim(),
    alt_baslik: (alt_baslik || "").trim(),
    ozet: (ozet || "").trim(),
    icerik: (icerik || "").trim(),
    okuma_suresi: calcReadingTime,
    tarih: articleDate,
    related_product: (related_product || "").trim(),
    gorsel_url: (gorsel_url || "").trim(),
    sss: formattedSss,
    seo: seo || undefined,
    geo_ai: geo_ai || undefined
  };

  articles.unshift(newArticle);
  await safeWriteJson(articlesFilePath, articles);
  return res.json({ success: true, article: newArticle, articles });
});

app.put(["/api/admin/articles/:id", "/api/admin/articles"], async (req, res) => {
  const articlesFilePath = path.join(process.cwd(), 'data', 'articles.json');
  let articles = await getArticlesList();

  const targetId = req.params.id || req.body?.id;
  const index = articles.findIndex((a: any) => a.id === targetId || a.slug === targetId);

  if (index === -1) {
    return res.status(404).json({ success: false, error: "Güncellenecek makale bulunamadı." });
  }

  const existing = articles[index];
  const { baslik, alt_baslik, ozet, icerik, kategori, related_product, gorsel_url, sss, okuma_suresi, slug, tarih, seo, geo_ai } = req.body || {};

  const updatedTitle = (baslik !== undefined ? baslik : existing.baslik).trim();
  const updatedContent = (icerik !== undefined ? icerik : existing.icerik).trim();
  const wordCount = updatedContent.split(/\s+/).length;
  const calcReadingTime = okuma_suresi || `${Math.max(1, Math.ceil(wordCount / 200))} dk`;

  const formattedSss = sss !== undefined
    ? (Array.isArray(sss) ? sss.filter((item: any) => item && (item.soru?.trim() || item.cevap?.trim())) : [])
    : existing.sss;

  const updatedArticle = {
    ...existing,
    baslik: updatedTitle,
    alt_baslik: alt_baslik !== undefined ? alt_baslik.trim() : existing.alt_baslik,
    ozet: ozet !== undefined ? ozet.trim() : existing.ozet,
    icerik: updatedContent,
    kategori: kategori || existing.kategori,
    related_product: related_product !== undefined ? related_product.trim() : existing.related_product,
    gorsel_url: gorsel_url !== undefined ? gorsel_url.trim() : existing.gorsel_url,
    sss: formattedSss,
    okuma_suresi: calcReadingTime,
    slug: slug ? slugifyArticleTitle(slug) : existing.slug,
    tarih: tarih || existing.tarih,
    seo: seo !== undefined ? seo : existing.seo,
    geo_ai: geo_ai !== undefined ? geo_ai : existing.geo_ai
  };

  articles[index] = updatedArticle;
  await safeWriteJson(articlesFilePath, articles);
  return res.json({ success: true, article: updatedArticle, articles });
});

app.delete("/api/admin/articles/:id", async (req, res) => {
  const articlesFilePath = path.join(process.cwd(), 'data', 'articles.json');
  let articles = await getArticlesList();

  const targetId = req.params.id;
  const initialLength = articles.length;
  articles = articles.filter((a: any) => a.id !== targetId && a.slug !== targetId);

  if (articles.length === initialLength) {
    return res.status(404).json({ success: false, error: "Silinecek makale bulunamadı." });
  }

  await safeWriteJson(articlesFilePath, articles);
  return res.json({ success: true, articles });
});

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getTemplateHtml(): string {
  const distIndex = path.join(process.cwd(), 'dist', 'index.html');
  const rootIndex = path.join(process.cwd(), 'index.html');
  const publicIndex = path.join(process.cwd(), 'public', 'index.html');

  if (fs.existsSync(distIndex)) {
    return fs.readFileSync(distIndex, 'utf8');
  } else if (fs.existsSync(rootIndex)) {
    return fs.readFileSync(rootIndex, 'utf8');
  } else if (fs.existsSync(publicIndex)) {
    return fs.readFileSync(publicIndex, 'utf8');
  }
  return `<!doctype html><html lang="tr"><head><!-- SEO_TITLE --><title>Ambalaj Market San. Tic. Ltd. Şti.</title><!-- /SEO_TITLE --><!-- SEO_META --><meta name="description" content="Ambalaj Market" /><!-- /SEO_META --><!-- SEO_EXTRA --><!-- /SEO_EXTRA --></head><body><div id="root"></div></body></html>`;
}

function injectSeoIntoHtml(rawHtml: string, article: any): string {
  if (!article) return rawHtml;

  const rawTitle = article.seo?.meta_title || article.baslik || article.title;
  const metaTitle = `${rawTitle} | Poset.com`;
  const desc = article.seo?.meta_description || article.ozet || article.summary || article.alt_baslik || '';
  const slug = article.slug || article.id;
  const articleUrl = `https://poset.com/rehber/${slug}`;
  const imageUrl = article.gorsel_url && !article.gorsel_url.includes('posetlogo')
    ? article.gorsel_url
    : "https://www.poset.com/templates/untitled/images/designer/28d090dc364360f397250cc88c7b8290_posetlogo3.png";
  const keywords = Array.isArray(article.seo?.keywords) ? article.seo.keywords.join(', ') : (article.kategori || '');

  const titleTag = `<title>${escapeHtml(metaTitle)}</title>`;
  const metaTag = `<meta name="description" content="${escapeHtml(desc)}" />`;

  const formattedSss = Array.isArray(article.sss) ? article.sss.filter((s: any) => s && (s.soru || s.cevap)) : [];

  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "headline": rawTitle,
    "description": desc,
    "articleBody": (article.icerik || '').slice(0, 300) + '...',
    "image": [imageUrl],
    "datePublished": article.tarih || "2026-09-20",
    "dateModified": article.tarih || "2026-09-20",
    "keywords": keywords,
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
    }
  };

  const faqSchema = formattedSss.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": formattedSss.map((s: any) => ({
      "@type": "Question",
      "name": s.soru,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": s.cevap
      }
    }))
  } : null;

  const extraTags = `
    <meta property="og:title" content="${escapeHtml(rawTitle)}" />
    <meta property="og:description" content="${escapeHtml(desc)}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${articleUrl}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(rawTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(desc)}" />
    <meta name="twitter:image" content="${imageUrl}" />
    <link rel="canonical" href="${articleUrl}" />
    <script type="application/ld+json">
${JSON.stringify(techArticleSchema, null, 2)}
    </script>
${faqSchema ? `    <script type="application/ld+json">\n${JSON.stringify(faqSchema, null, 2)}\n    </script>` : ''}
  `;

  let html = rawHtml;

  // Replace title placeholder or tag
  if (html.includes('<!-- SEO_TITLE -->') && html.includes('<!-- /SEO_TITLE -->')) {
    html = html.replace(/<!-- SEO_TITLE -->[\s\S]*?<!-- \/SEO_TITLE -->/, `<!-- SEO_TITLE -->\n    ${titleTag}\n    <!-- /SEO_TITLE -->`);
  } else {
    html = html.replace(/<title>[\s\S]*?<\/title>/i, titleTag);
  }

  // Replace meta placeholder or tag
  if (html.includes('<!-- SEO_META -->') && html.includes('<!-- /SEO_META -->')) {
    html = html.replace(/<!-- SEO_META -->[\s\S]*?<!-- \/SEO_META -->/, `<!-- SEO_META -->\n    ${metaTag}\n    <!-- /SEO_META -->`);
  } else {
    html = html.replace(/<meta\s+name="description"\s+content="[\s\S]*?"\s*\/?>/i, metaTag);
  }

  // Replace extra placeholder or append before </head>
  if (html.includes('<!-- SEO_EXTRA -->') && html.includes('<!-- /SEO_EXTRA -->')) {
    html = html.replace(/<!-- SEO_EXTRA -->[\s\S]*?<!-- \/SEO_EXTRA -->/, `<!-- SEO_EXTRA -->\n${extraTags}\n    <!-- /SEO_EXTRA -->`);
  } else {
    html = html.replace('</head>', `${extraTags}\n</head>`);
  }

  return html;
}

// Vite server configuration helper
async function startServer() {
  let viteServer: any = null;

  // SSR-Lite Meta Injection middleware for article pages
  app.use(async (req, res, next) => {
    // Skip static assets and API routes
    if (req.path.startsWith('/api') || req.path.startsWith('/assets') || req.path.startsWith('/@') || (req.path.includes('.') && !req.path.endsWith('.html'))) {
      return next();
    }

    // Skip admin/management routes
    if (['/yonetim', '/admin'].includes(req.path)) {
      return next();
    }

    try {
      let targetSlug = req.query.makale || req.query.slug || req.query.article || req.query.id || req.query.rehber;

      if (!targetSlug && req.path) {
        const cleanPath = req.path.replace(/^\/+|\/+$/g, '');
        const segments = cleanPath.split('/');
        const lastSegment = segments[segments.length - 1];
        if (lastSegment && lastSegment !== 'rehber' && lastSegment !== 'guide') {
          targetSlug = lastSegment.replace(/\.html$/i, '');
        }
      }

      if (targetSlug && typeof targetSlug === 'string') {
        const slugKey = targetSlug.trim().toLowerCase();
        const articles = await getArticlesList();
        const article = articles.find((a: any) => 
          (a.slug && a.slug.toLowerCase() === slugKey) || 
          (a.id && a.id.toLowerCase() === slugKey)
        );

        if (article) {
          let rawHtml = getTemplateHtml();
          let seoHtml = injectSeoIntoHtml(rawHtml, article);

          if (viteServer) {
            seoHtml = await viteServer.transformIndexHtml(req.originalUrl || req.url, seoHtml);
          }

          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.send(seoHtml);
        }
      }
    } catch (err) {
      console.error("Error in SSR Meta Injection middleware:", err);
    }

    next();
  });



  app.get("*.html", (req, res, next) => {
    if (req.path.endsWith(".html")) {
      return res.redirect(301, "/");
    }
    next();
  });

  if (process.env.NODE_ENV !== "production") {
    viteServer = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(viteServer.middlewares);
    app.get('*', async (req, res, next) => {
      try {
        const url = req.originalUrl || req.url;
        const indexPath = path.resolve(process.cwd(), 'index.html');
        if (fs.existsSync(indexPath)) {
          let template = fs.readFileSync(indexPath, 'utf-8');
          template = await viteServer.transformIndexHtml(url, template);
          return res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(template);
        }
      } catch (e) {
        if (viteServer) viteServer.ssrFixStacktrace(e as Error);
        return next(e);
      }
      next();
    });
    console.log("Vite development middleware integrated successfully.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Serving compiled production assets from ./dist");
  }


  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Poset Industrial full-stack server running on port ${PORT}`);
  });
}

startServer();
