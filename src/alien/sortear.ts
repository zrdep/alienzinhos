import type { Catalogo, Escolha, Peca } from "../tipos.js";
import { criarAleatorio } from "./aleatorio.js";

const CATEGORIAS_EXTRAS = ["bochechas", "rosto", "flutuante", "pescoco"];

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

  // sorteado por último pra não mudar os aliens que já existiam
  const fundo = escolher(pecas.fundos);

  return { rosto, paleta, boca, olhos, extras, chapeu, fundo };
}
