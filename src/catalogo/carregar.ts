import { readdir, readFile } from "node:fs/promises";
import { CAMADAS, type Camada, type Catalogo, type Paleta, type Peca } from "../tipos.js";

const RAIZ = new URL("../../", import.meta.url);

interface InfoExtra {
  id: string;
  categoria: string;
  cobre: string[];
}

async function lerJson<T>(caminho: string): Promise<T> {
  const texto = await readFile(new URL(caminho, RAIZ), "utf-8");
  return JSON.parse(texto) as T;
}

function idDoArquivo(arquivo: string): string {
  return arquivo.replace(/^\d+-/, "").replace(/\.svg$/, "");
}

async function carregarCamada(camada: Camada, infoExtras: Map<string, InfoExtra>): Promise<Peca[]> {
  const pasta = new URL(`assets/${camada}/`, RAIZ);
  const arquivos = (await readdir(pasta)).filter((a) => a.endsWith(".svg")).sort();

  return Promise.all(
    arquivos.map(async (arquivo) => {
      const id = idDoArquivo(arquivo);
      const svg = await readFile(new URL(arquivo, pasta), "utf-8");
      const info = camada === "extras" ? infoExtras.get(id) : undefined;

      return {
        id,
        camada,
        svg,
        animado: camada.endsWith("-animados") || camada === "fundos",
        categoria: info?.categoria,
        cobre: info?.cobre,
      };
    }),
  );
}

export async function carregarCatalogo(): Promise<Catalogo> {
  const { extras } = await lerJson<{ extras: InfoExtra[] }>("data/extras.json");
  const { paletas } = await lerJson<{ paletas: Paleta[] }>("data/paletas.json");
  const infoExtras = new Map(extras.map((e) => [e.id, e]));

  const listas = await Promise.all(CAMADAS.map((c) => carregarCamada(c, infoExtras)));
  const pecas = Object.fromEntries(CAMADAS.map((c, i) => [c, listas[i]])) as Record<Camada, Peca[]>;

  return { pecas, paletas };
}
