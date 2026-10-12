import { mkdir, writeFile } from "node:fs/promises";
import { carregarCatalogo } from "./pecas.js";
import { montarAlien } from "./montar.js";
import { sortearAlien } from "./sortear.js";

const catalogo = await carregarCatalogo();
const seeds = ["zrdep", "pedro", "alien", "chegou", "ovni", "marte"];

await mkdir("saida", { recursive: true });

for (const seed of seeds) {
  const escolha = sortearAlien(seed, catalogo);
  await writeFile(`saida/${seed}.svg`, montarAlien(escolha, 256));

  const pecas = [escolha.rosto, escolha.boca, escolha.olhos, ...escolha.extras, escolha.chapeu]
    .filter(Boolean)
    .map((p) => p!.id);
  console.log(seed.padEnd(8), escolha.paleta.id.padEnd(10), pecas.join(", "));
}
