import type { Escolha, Paleta, Peca } from "../tipos.js";

function conteudo(svg: string): string {
  const achado = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  if (!achado) throw new Error("SVG inválido");
  return achado[1].replace(/<metadata>[\s\S]*?<\/metadata>/, "").trim();
}

function estiloDaPaleta(paleta: Paleta): string {
  const regras = Object.entries(paleta.cores).map(([classe, cor]) => `.${classe}{fill:${cor}}`);
  return `<style>${regras.join("")}</style>`;
}

function pintarRosto(rosto: Peca, paleta: Paleta): string {
  return conteudo(rosto.svg).replace(/<style>[\s\S]*?<\/style>/, estiloDaPaleta(paleta));
}

export function montarAlien(escolha: Escolha, tamanho = 64): string {
  const camadas = [
    pintarRosto(escolha.rosto, escolha.paleta),
    conteudo(escolha.boca.svg),
    conteudo(escolha.olhos.svg),
    ...escolha.extras.map((e) => conteudo(e.svg)),
  ];
  if (escolha.chapeu) camadas.push(conteudo(escolha.chapeu.svg));

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${tamanho}" height="${tamanho}" shape-rendering="crispEdges">`,
    ...camadas,
    "</svg>",
  ].join("\n");
}
