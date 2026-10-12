import type { Catalogo, Peca } from "./pecas.js";
import type { Escolha } from "./montar.js";

const CATEGORIAS_EXTRAS = ["bochechas", "rosto", "flutuante", "pescoco"];

function hash(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function criarAleatorio(seed: string): () => number {
  let estado = hash(seed);
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sortearAlien(seed: string, { pecas, paletas }: Catalogo): Escolha {
  const aleatorio = criarAleatorio(seed);
  const chance = (p: number) => aleatorio() < p;
  const escolher = <T>(lista: T[]): T => lista[Math.floor(aleatorio() * lista.length)];

  const rosto = escolher(pecas.rostos);
  const paleta = escolher(paletas);
  const boca = escolher(pecas.bocas);
  const olhos = chance(0.25) ? escolher(pecas["olhos-animados"]) : escolher(pecas.olhos);

  const extras: Peca[] = [];
  for (const categoria of CATEGORIAS_EXTRAS) {
    if (!chance(0.3)) continue;
    const extra = escolher(pecas.extras.filter((e) => e.categoria === categoria));
    if (extra.cobre?.length && !chance(0.4)) continue;
    extras.push(extra);
  }

  let chapeu: Peca | undefined;
  if (chance(0.8)) {
    chapeu = chance(0.25) ? escolher(pecas["chapeus-animados"]) : escolher(pecas.chapeus);
  }

  return { rosto, paleta, boca, olhos, extras, chapeu };
}
