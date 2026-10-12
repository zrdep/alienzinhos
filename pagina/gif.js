// gerador de gif animado do alien, sem dependência: congela o svg em cada instante,
// desenha num canvas 64x64 e codifica os quadros em gif (lzw) na mão

const MIN_QUADRO_MS = 20; // navegadores ignoram atrasos menores que 2 centésimos

const semReduzirMovimento = (svg) =>
  svg.replace(/@media \(prefers-reduced-motion:reduce\)\{(?:[^{}]*\{[^{}]*\})*\}/g, "");

const mdc = (a, b) => (b ? mdc(b, a % b) : a);
const mmc = (a, b) => (a * b) / mdc(a, b);

// instantes (ms) em que alguma animação muda de quadro, dentro de um ciclo completo
function instantesDeMudanca(svg) {
  const caixa = document.createElement("div");
  caixa.style.cssText = "position:fixed;left:-200px;top:0;width:64px;height:64px;visibility:hidden;pointer-events:none";
  caixa.innerHTML = svg;
  document.body.append(caixa);
  const animacoes = caixa.firstElementChild.getAnimations({ subtree: true }).map((a) => {
    const kfs = a.effect.getKeyframes();
    return { dur: Math.round(Number(a.effect.getTiming().duration)), offsets: kfs.map((k) => k.computedOffset), easings: kfs.map((k) => k.easing) };
  });
  caixa.remove();

  const ciclo = animacoes.reduce((l, a) => (a.dur > 0 ? mmc(l, a.dur) : l), 1);
  const instantes = new Set([0]);
  for (const a of animacoes) {
    if (!a.dur) continue;
    const pontos = [];
    a.offsets.forEach((o, i) => {
      const prox = a.offsets[i + 1] ?? 1;
      const passos = Number(/steps\((\d+)/.exec(a.easings[i])?.[1] ?? 1);
      for (let j = 0; j < passos; j++) pontos.push(o + (j * (prox - o)) / passos);
    });
    for (let volta = 0; volta * a.dur < ciclo; volta++)
      for (const p of pontos) instantes.add(Math.round((volta + p) * a.dur) % ciclo);
  }
  return { ciclo, instantes: [...instantes].sort((x, y) => x - y) };
}

async function desenhar(svg, ms, ctx) {
  const congelado = svg.replace(
    "</svg>",
    `<style>*{animation-play-state:paused!important;animation-delay:-${ms}ms!important}</style></svg>`,
  );
  const url = URL.createObjectURL(new Blob([congelado], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    ctx.clearRect(0, 0, 64, 64);
    ctx.drawImage(img, 0, 0, 64, 64);
    return ctx.getImageData(0, 0, 64, 64).data;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function gerarGif(svg64, escala = 4) {
  const svg = semReduzirMovimento(svg64);
  const { ciclo, instantes } = instantesDeMudanca(svg);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  // captura cada quadro no meio do intervalo e junta os iguais
  let quadros = [];
  for (let i = 0; i < instantes.length; i++) {
    const fim = instantes[i + 1] ?? ciclo;
    const rgba = await desenhar(svg, (instantes[i] + fim) / 2, ctx);
    const anterior = quadros.at(-1);
    if (anterior && iguais(anterior.rgba, rgba)) anterior.ms += fim - instantes[i];
    else quadros.push({ rgba, ms: fim - instantes[i] });
  }
  if (quadros.length > 1 && iguais(quadros[0].rgba, quadros.at(-1).rgba)) quadros[0].ms += quadros.pop().ms;
  quadros = quadros.reduce((lista, q) => {
    if (q.ms < MIN_QUADRO_MS && lista.length) lista.at(-1).ms += q.ms;
    else lista.push(q);
    return lista;
  }, []);

  // paleta exata (pixel art tem poucas cores); índice 0 = transparente
  const cores = new Map();
  let temTransparencia = false;
  const indices = quadros.map(({ rgba }) => {
    const idx = new Uint8Array(64 * 64);
    for (let p = 0; p < idx.length; p++) {
      const o = p * 4;
      if (rgba[o + 3] < 128) { idx[p] = 0; temTransparencia = true; continue; }
      const cor = (rgba[o] << 16) | (rgba[o + 1] << 8) | rgba[o + 2];
      if (!cores.has(cor)) cores.set(cor, cores.size + 1);
      idx[p] = cores.get(cor);
    }
    return idx;
  });
  if (cores.size > 255) reduzirCores(indices, cores);
  const paleta = [0, ...cores.keys()];

  // atrasos em centésimos, arredondando o acumulado pra não perder o ritmo
  let acumulado = 0, anterior = 0;
  const atrasos = quadros.map((q) => {
    acumulado += q.ms;
    const atual = Math.round(acumulado / 10);
    const cs = atual - anterior;
    anterior = atual;
    return cs;
  });

  const lado = 64 * escala;
  const saida = new Bytes();
  const bitsPaleta = Math.max(1, Math.ceil(Math.log2(paleta.length)));
  saida.texto("GIF89a").u16(lado).u16(lado).u8(0xf0 | (bitsPaleta - 1)).u8(0).u8(0);
  for (let i = 0; i < 1 << bitsPaleta; i++) {
    const c = paleta[i] ?? 0;
    saida.u8(c >> 16).u8((c >> 8) & 255).u8(c & 255);
  }
  if (indices.length > 1) saida.u8(0x21).u8(0xff).u8(11).texto("NETSCAPE2.0").u8(3).u8(1).u16(0).u8(0);

  indices.forEach((idx, i) => {
    // com fundo opaco, só regrava o retângulo que mudou; com transparência, quadro inteiro
    let x0 = 0, y0 = 0, x1 = 63, y1 = 63;
    if (!temTransparencia && i > 0) [x0, y0, x1, y1] = caixaMudou(indices[i - 1], idx);
    const disposicao = temTransparencia ? 2 : 1;
    saida.u8(0x21).u8(0xf9).u8(4).u8((disposicao << 2) | (temTransparencia ? 1 : 0)).u16(atrasos[i]).u8(0).u8(0);
    const w = (x1 - x0 + 1) * escala, h = (y1 - y0 + 1) * escala;
    saida.u8(0x2c).u16(x0 * escala).u16(y0 * escala).u16(w).u16(h).u8(0);
    const px = new Uint8Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) px[y * w + x] = idx[(y0 + Math.floor(y / escala)) * 64 + x0 + Math.floor(x / escala)];
    lzw(Math.max(2, bitsPaleta), px, saida);
  });
  saida.u8(0x3b);
  return new Blob([saida.pronto()], { type: "image/gif" });
}

function iguais(a, b) {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function caixaMudou(a, b) {
  let x0 = 64, y0 = 64, x1 = -1, y1 = -1;
  for (let p = 0; p < a.length; p++) {
    if (a[p] === b[p]) continue;
    const x = p % 64, y = (p / 64) | 0;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return x1 < 0 ? [0, 0, 0, 0] : [x0, y0, x1, y1];
}

// raro: se passar de 255 cores, troca as menos usadas pela mais parecida
function reduzirCores(indices, cores) {
  const lista = [...cores.keys()];
  const uso = new Array(lista.length + 1).fill(0);
  for (const idx of indices) for (const i of idx) uso[i]++;
  const ordem = lista.map((c, i) => i + 1).sort((a, b) => uso[b] - uso[a]);
  const ficam = ordem.slice(0, 255);
  const rgb = (c) => [c >> 16, (c >> 8) & 255, c & 255];
  const mapa = new Uint8Array(lista.length + 1);
  ficam.forEach((antigo, i) => (mapa[antigo] = i + 1));
  for (const antigo of ordem.slice(255)) {
    const [r, g, b] = rgb(lista[antigo - 1]);
    let melhor = 0, dist = Infinity;
    ficam.forEach((f, i) => {
      const [r2, g2, b2] = rgb(lista[f - 1]);
      const d = (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2;
      if (d < dist) { dist = d; melhor = i + 1; }
    });
    mapa[antigo] = melhor;
  }
  for (const idx of indices) for (let p = 0; p < idx.length; p++) idx[p] = mapa[idx[p]];
  const novas = ficam.map((f) => lista[f - 1]);
  cores.clear();
  novas.forEach((c, i) => cores.set(c, i + 1));
}

function lzw(minimo, px, saida) {
  const limpar = 1 << minimo, fimDados = limpar + 1;
  let tamanho = minimo + 1, proximo = fimDados + 1, tabela = new Map();
  const blocos = [];
  let buffer = 0, nbits = 0;
  const emitir = (codigo) => {
    buffer |= codigo << nbits;
    nbits += tamanho;
    while (nbits >= 8) { blocos.push(buffer & 255); buffer >>= 8; nbits -= 8; }
  };
  emitir(limpar);
  let prefixo = px[0];
  for (let i = 1; i < px.length; i++) {
    const k = px[i], chave = (prefixo << 8) | k;
    const achado = tabela.get(chave);
    if (achado !== undefined) { prefixo = achado; continue; }
    emitir(prefixo);
    if (proximo === 4096) {
      emitir(limpar);
      tamanho = minimo + 1; proximo = fimDados + 1; tabela = new Map();
    } else {
      if (proximo >= 1 << tamanho) tamanho++;
      tabela.set(chave, proximo++);
    }
    prefixo = k;
  }
  emitir(prefixo);
  emitir(fimDados);
  if (nbits > 0) blocos.push(buffer & 255);

  saida.u8(minimo);
  for (let i = 0; i < blocos.length; i += 255) {
    const parte = blocos.slice(i, i + 255);
    saida.u8(parte.length);
    for (const b of parte) saida.u8(b);
  }
  saida.u8(0);
}

class Bytes {
  constructor() { this.buf = new Uint8Array(1 << 16); this.n = 0; }
  u8(v) {
    if (this.n === this.buf.length) { const novo = new Uint8Array(this.buf.length * 2); novo.set(this.buf); this.buf = novo; }
    this.buf[this.n++] = v & 255;
    return this;
  }
  u16(v) { return this.u8(v).u8(v >> 8); }
  texto(s) { for (const c of s) this.u8(c.charCodeAt(0)); return this; }
  pronto() { return this.buf.slice(0, this.n); }
}
