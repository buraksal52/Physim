// TypeScript types matching the content JSON schema

export interface Formula {
  label: string;
  latex: string;
}

export interface Question {
  id: number;
  soru: string;
  secenekler: string[];
  dogru: number; // index into secenekler
  cozum_adimlari: string[];
}

export interface ZorunluDeney {
  aciklama: string;
  hedef_degisken: string;
  hedef_aralik: {
    min: number;
    max: number;
  };
}

export interface Simulasyon {
  tip: string;
  zorunlu_deney: ZorunluDeney;
}

export interface Topic {
  id: string;
  slug: string;
  baslik: string;
  ozet: string;
  analatim: string;
  formuller: Formula[];
  sorular: Question[];
  simulasyon: Simulasyon;
}
