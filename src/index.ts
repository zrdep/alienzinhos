import { carregarCatalogo } from "./pecas.js";

const catalogo = await carregarCatalogo();

for (const [camada, lista] of Object.entries(catalogo.pecas)) {
  console.log(camada.padEnd(18), lista.length);
}
console.log("paletas".padEnd(18), catalogo.paletas.length);
