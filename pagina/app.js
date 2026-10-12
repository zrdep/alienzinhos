import { gerarGif } from "./gif.js";

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

// no site o fundo vira um gif atrás do alien: o svg animado do fundo pesava demais pra renderizar
const gifDe = (fundo) => fundo.arquivo.replace("assets/fundos/", "assets/fundos-gif/").replace(/\.svg$/, ".gif");

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
let escolhaAtual;
let personalizado = null; // peças escolhidas à mão, por cima do alien sorteado pelo nome
let pedido = 0;
let espera;

async function mostrar() {
  const seed = campo.value.trim().slice(0, 100);
  const meu = ++pedido;
  let escolha = sortearAlien(seed, catalogo);
  if (personalizado) escolha = aplicar(escolha, personalizado);
  if (!comFundo) escolha.fundo = undefined;
  const svg = await montarAlien({ ...escolha, fundo: undefined });
  if (meu !== pedido) return;

  escolhaAtual = escolha;
  alien.innerHTML = svg;
  alien.style.backgroundImage = escolha.fundo ? `url("${gifDe(escolha.fundo)}")` : "";
  info.textContent = `→ ${escolha.rosto.id} · ${escolha.paleta.id} · ${escolha.chapeu?.id ?? "sem chapéu"} · ${escolha.fundo?.id ?? "sem fundo"}${personalizado ? " · editado" : ""}`;
  preencherEditor(escolha);

  const url = new URL(location.href);
  seed ? url.searchParams.set("seed", seed) : url.searchParams.delete("seed");
  for (const chave of ["rosto", "paleta", "olhos", "boca", "chapeu", "extras"]) url.searchParams.delete(chave);
  if (personalizado) {
    url.searchParams.set("rosto", escolha.rosto.id);
    url.searchParams.set("paleta", escolha.paleta.id);
    url.searchParams.set("olhos", escolha.olhos.id);
    url.searchParams.set("boca", escolha.boca.id);
    url.searchParams.set("chapeu", escolha.chapeu?.id ?? "nenhum");
    url.searchParams.set("extras", escolha.extras.map((e) => e.id).join(","));
  }
  if (!comFundo) url.searchParams.set("fundo", "nao");
  else if (personalizado) url.searchParams.set("fundo", escolha.fundo.id);
  else url.searchParams.delete("fundo");
  history.replaceState(null, "", url);
}

campo.addEventListener("input", () => {
  personalizado = null;
  clearTimeout(espera);
  espera = setTimeout(mostrar, 120);
});

document.querySelector("#aleatorio").addEventListener("click", () => {
  campo.value = Math.random().toString(36).slice(2, 8);
  personalizado = null;
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

// o download continua sendo o svg completo, com o fundo animado em svg
document.querySelector("#baixar").addEventListener("click", async () => {
  const svg = await montarAlien(escolhaAtual);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  link.download = `alien-${campo.value.trim() || "zrdep"}.svg`;
  link.click();
  URL.revokeObjectURL(link.href);
});

// gif animado com o alien e o fundo, gerado no navegador
const botaoGif = document.querySelector("#baixar-gif");
botaoGif.addEventListener("click", async () => {
  if (botaoGif.disabled) return;
  botaoGif.disabled = true;
  botaoGif.textContent = "gerando...";
  try {
    const gif = await gerarGif(await montarAlien(escolhaAtual, 64));
    const link = document.createElement("a");
    link.href = URL.createObjectURL(gif);
    link.download = `alien-${campo.value.trim() || "zrdep"}.gif`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  } finally {
    botaoGif.disabled = false;
    botaoGif.textContent = "baixar gif";
  }
});

document.querySelector("#copiar").addEventListener("click", async (e) => {
  await navigator.clipboard.writeText(location.href);
  e.target.textContent = "copiado";
  setTimeout(() => (e.target.textContent = "copiar link"), 1500);
});

// editor: um seletor por parte do alien; começa com o alien do nome e cada troca vira "editado"
const editor = document.querySelector("#editor");
const botaoEditar = document.querySelector("#editar");
const extrasDa = (categoria) => catalogo.pecas.extras.filter((e) => e.categoria === categoria);
const CAMPOS = [
  { campo: "rosto", rotulo: "rosto", listas: [catalogo.pecas.rostos] },
  { campo: "paleta", rotulo: "paleta", listas: [catalogo.paletas] },
  { campo: "olhos", rotulo: "olhos", listas: [catalogo.pecas.olhos, catalogo.pecas["olhos-animados"]] },
  { campo: "boca", rotulo: "boca", listas: [catalogo.pecas.bocas] },
  { campo: "chapeu", rotulo: "chapéu", listas: [catalogo.pecas.chapeus, catalogo.pecas["chapeus-animados"]], opcional: true },
  { campo: "fundo", rotulo: "fundo", listas: [catalogo.pecas.fundos], opcional: true },
  { campo: "extra-bochechas", rotulo: "bochechas", listas: [extrasDa("bochechas")], opcional: true },
  { campo: "extra-rosto", rotulo: "na cara", listas: [extrasDa("rosto")], opcional: true },
  { campo: "extra-flutuante", rotulo: "flutuante", listas: [extrasDa("flutuante")], opcional: true },
  { campo: "extra-pescoco", rotulo: "pescoço", listas: [extrasDa("pescoco")], opcional: true },
];
const seletores = {};

for (const { campo, rotulo, listas, opcional } of CAMPOS) {
  const select = document.createElement("select");
  if (opcional) select.append(new Option("nenhum", ""));
  listas.forEach((lista, i) => {
    const destino = listas.length > 1 ? document.createElement("optgroup") : select;
    if (destino !== select) destino.label = i ? "animados" : "parados";
    lista.forEach((peca) => destino.append(new Option(peca.id, peca.id)));
    if (destino !== select) select.append(destino);
  });
  select.addEventListener("change", () => {
    if (campo === "fundo") {
      comFundo = select.value !== "";
      marcarFundo();
    }
    personalizado = lerEditor();
    mostrar();
  });
  const label = document.createElement("label");
  label.innerHTML = `<span>--${rotulo}</span>`;
  label.append(select);
  editor.append(label);
  seletores[campo] = select;
}

const acharPeca = (campo, id) => CAMPOS.find((c) => c.campo === campo).listas.flat().find((p) => p.id === id);

function lerEditor() {
  const valor = (campo) => seletores[campo].value || null;
  return {
    rosto: valor("rosto"),
    paleta: valor("paleta"),
    olhos: valor("olhos"),
    boca: valor("boca"),
    chapeu: valor("chapeu"),
    fundo: valor("fundo"),
    extras: Object.fromEntries(CATEGORIAS_EXTRAS.map((c) => [c, valor(`extra-${c}`)])),
  };
}

function aplicar(escolha, p) {
  return {
    rosto: acharPeca("rosto", p.rosto) ?? escolha.rosto,
    paleta: acharPeca("paleta", p.paleta) ?? escolha.paleta,
    olhos: acharPeca("olhos", p.olhos) ?? escolha.olhos,
    boca: acharPeca("boca", p.boca) ?? escolha.boca,
    chapeu: p.chapeu ? acharPeca("chapeu", p.chapeu) : undefined,
    fundo: (p.fundo && acharPeca("fundo", p.fundo)) || escolha.fundo,
    extras: CATEGORIAS_EXTRAS.map((c) => p.extras[c] && acharPeca(`extra-${c}`, p.extras[c])).filter(Boolean),
  };
}

function preencherEditor(escolha) {
  seletores.rosto.value = escolha.rosto.id;
  seletores.paleta.value = escolha.paleta.id;
  seletores.olhos.value = escolha.olhos.id;
  seletores.boca.value = escolha.boca.id;
  seletores.chapeu.value = escolha.chapeu?.id ?? "";
  seletores.fundo.value = escolha.fundo?.id ?? "";
  for (const c of CATEGORIAS_EXTRAS) seletores[`extra-${c}`].value = escolha.extras.find((e) => e.categoria === c)?.id ?? "";
}

function lerUrl() {
  const params = new URLSearchParams(location.search);
  if (!params.has("rosto")) return null;
  const extras = Object.fromEntries(CATEGORIAS_EXTRAS.map((c) => [c, null]));
  for (const id of (params.get("extras") ?? "").split(",")) {
    const extra = catalogo.pecas.extras.find((e) => e.id === id);
    if (extra) extras[extra.categoria] = id;
  }
  const fundo = params.get("fundo");
  return {
    rosto: params.get("rosto"),
    paleta: params.get("paleta"),
    olhos: params.get("olhos"),
    boca: params.get("boca"),
    chapeu: params.get("chapeu") === "nenhum" ? null : params.get("chapeu"),
    fundo: fundo && fundo !== "nao" ? fundo : null,
    extras,
  };
}

function marcarEditar() {
  botaoEditar.textContent = editor.hidden ? "[ ] editar" : "[x] editar";
  botaoEditar.setAttribute("aria-pressed", String(!editor.hidden));
}

botaoEditar.addEventListener("click", () => {
  editor.hidden = !editor.hidden;
  marcarEditar();
});

campo.value = new URLSearchParams(location.search).get("seed") ?? "zrdep";
personalizado = lerUrl();
editor.hidden = !personalizado;
marcarEditar();
marcarFundo();
mostrar();
