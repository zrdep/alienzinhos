import { Hono } from "hono";
import type { Catalogo } from "../tipos.js";
import { montarAlien } from "../alien/montar.js";
import { sortearAlien } from "../alien/sortear.js";

const TAMANHO_PADRAO = 256;

function lerTamanho(valor?: string): number {
  const numero = Number(valor ?? TAMANHO_PADRAO);
  if (!Number.isFinite(numero)) return TAMANHO_PADRAO;
  return Math.min(1024, Math.max(16, Math.round(numero)));
}

export function rotasAlien(catalogo: Catalogo) {
  const rotas = new Hono();

  rotas.get("/:seed", (c) => {
    const seed = c.req.param("seed").slice(0, 100);
    const tamanho = lerTamanho(c.req.query("tamanho"));
    const svg = montarAlien(sortearAlien(seed, catalogo), tamanho);

    return c.body(svg, 200, {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    });
  });

  return rotas;
}
