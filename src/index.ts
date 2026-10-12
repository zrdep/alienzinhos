import { mkdir, writeFile } from "node:fs/promises";
import { carregarCatalogo } from "./pecas.js";
import { montarAlien } from "./montar.js";

const { pecas, paletas } = await carregarCatalogo();

const svg = montarAlien(
  {
    rosto: pecas.rostos[2],
    paleta: paletas[7],
    boca: pecas.bocas[1],
    olhos: pecas["olhos-animados"][0],
    extras: [pecas.extras[0]],
    chapeu: pecas["chapeus-animados"][0],
  },
  256,
);

await mkdir("saida", { recursive: true });
await writeFile("saida/exemplo.svg", svg);
console.log("saida/exemplo.svg criado");
