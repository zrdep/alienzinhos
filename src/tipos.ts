export const CAMADAS = [
  "rostos",
  "bocas",
  "olhos",
  "olhos-animados",
  "extras",
  "chapeus",
  "chapeus-animados",
] as const;

export type Camada = (typeof CAMADAS)[number];

export interface Peca {
  id: string;
  camada: Camada;
  svg: string;
  animado: boolean;
  categoria?: string;
  cobre?: string[];
}

export interface Paleta {
  id: string;
  cores: Record<string, string>;
}

export interface Catalogo {
  pecas: Record<Camada, Peca[]>;
  paletas: Paleta[];
}

export interface Escolha {
  rosto: Peca;
  paleta: Paleta;
  boca: Peca;
  olhos: Peca;
  extras: Peca[];
  chapeu?: Peca;
}
