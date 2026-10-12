const json = (caminho) => fetch(caminho).then((r) => r.json());
const textos = new Map();
const svgDe = (peca) => {
  if (!textos.has(peca.arquivo)) textos.set(peca.arquivo, fetch(peca.arquivo).then((r) => r.text()));
  return textos.get(peca.arquivo);
};

const [rostos, acessorios, animados, extras, paletas] = await Promise.all(
  ["rostos", "acessorios", "animados", "extras", "paletas"].map((n) => json(`data/${n}.json`)),
);

const catalogo = {
  pecas: {
    rostos: rostos.rostos,
    bocas: acessorios.bocas,
    olhos: acessorios.olhos,
    "olhos-animados": animados.olhos,
    extras: extras.extras,
    chapeus: acessorios.chapeus,
    "chapeus-animados": animados.chapeus,
    fundos: animados.fundos,
  },
  paletas: paletas.paletas,
};

const CATEGORIAS_EXTRAS = ["bochechas", "rosto", "flutuante", "pescoco"];

function hash(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function criarAleatorio(seed) {
  let estado = hash(seed);
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sortearAlien(seed, { pecas, paletas }) {
  const aleatorio = criarAleatorio(seed);
  const chance = (p) => aleatorio() < p;
  const escolher = (lista) => lista[Math.floor(aleatorio() * lista.length)];

  const rosto = escolher(pecas.rostos);
  const paleta = escolher(paletas);
  const boca = escolher(pecas.bocas);
  const olhos = chance(0.25) ? escolher(pecas["olhos-animados"]) : escolher(pecas.olhos);

  const extras = [];
  for (const categoria of CATEGORIAS_EXTRAS) {
    if (!chance(0.3)) continue;
    const extra = escolher(pecas.extras.filter((e) => e.categoria === categoria));
    if (extra.cobre?.length && !chance(0.4)) continue;
    extras.push(extra);
  }

  let chapeu;
  if (chance(0.8)) {
    chapeu = chance(0.25) ? escolher(pecas["chapeus-animados"]) : escolher(pecas.chapeus);
  }

  // sorteado por último pra não mudar os aliens que já existiam
  const fundo = escolher(pecas.fundos);

  return { rosto, paleta, boca, olhos, extras, chapeu, fundo };
}

const conteudo = (svg) =>
  svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1].replace(/<metadata>[\s\S]*?<\/metadata>/, "").trim();

async function montarAlien(escolha, tamanho = 256) {
  const lista = [escolha.rosto, escolha.boca, escolha.olhos, ...escolha.extras];
  if (escolha.chapeu) lista.push(escolha.chapeu);

  const camadas = (await Promise.all(lista.map(svgDe))).map(conteudo);
  const estilo = Object.entries(escolha.paleta.cores).map(([classe, cor]) => `.${classe}{fill:${cor}}`).join("");
  camadas[0] = camadas[0].replace(/<style>[\s\S]*?<\/style>/, `<style>${estilo}</style>`);
  if (escolha.fundo) camadas.unshift(conteudo(await svgDe(escolha.fundo)));

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${tamanho}" height="${tamanho}" shape-rendering="crispEdges">`,
    ...camadas,
    "</svg>",
  ].join("\n");
}

const campo = document.querySelector("#seed");
const info = document.querySelector("#info");
const alien = document.querySelector("#alien");
const botaoFundo = document.querySelector("#alternar-fundo");
let comFundo = new URLSearchParams(location.search).get("fundo") !== "nao";
let svgAtual = "";
let pedido = 0;
let espera;

async function mostrar() {
  const seed = campo.value.trim().slice(0, 100);
  const meu = ++pedido;
  const escolha = sortearAlien(seed, catalogo);
  if (!comFundo) escolha.fundo = undefined;
  const svg = await montarAlien(escolha);
  if (meu !== pedido) return;

  svgAtual = svg;
  alien.innerHTML = svg;
  info.textContent = `→ ${escolha.rosto.id} · ${escolha.paleta.id} · ${escolha.chapeu?.id ?? "sem chapéu"} · ${escolha.fundo?.id ?? "sem fundo"}`;

  const url = new URL(location.href);
  seed ? url.searchParams.set("seed", seed) : url.searchParams.delete("seed");
  comFundo ? url.searchParams.delete("fundo") : url.searchParams.set("fundo", "nao");
  history.replaceState(null, "", url);
}

campo.addEventListener("input", () => {
  clearTimeout(espera);
  espera = setTimeout(mostrar, 120);
});

document.querySelector("#aleatorio").addEventListener("click", () => {
  campo.value = Math.random().toString(36).slice(2, 8);
  mostrar();
});

function marcarFundo() {
  botaoFundo.textContent = comFundo ? "[x] fundo" : "[ ] fundo";
  botaoFundo.setAttribute("aria-pressed", String(comFundo));
}

botaoFundo.addEventListener("click", () => {
  comFundo = !comFundo;
  marcarFundo();
  mostrar();
});

document.querySelector("#baixar").addEventListener("click", () => {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([svgAtual], { type: "image/svg+xml" }));
  link.download = `alien-${campo.value.trim() || "zrdep"}.svg`;
  link.click();
  URL.revokeObjectURL(link.href);
});

document.querySelector("#copiar").addEventListener("click", async (e) => {
  await navigator.clipboard.writeText(location.href);
  e.target.textContent = "copiado";
  setTimeout(() => (e.target.textContent = "copiar link"), 1500);
});

campo.value = new URLSearchParams(location.search).get("seed") ?? "zrdep";
marcarFundo();
mostrar();
