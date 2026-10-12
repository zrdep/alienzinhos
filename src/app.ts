import { Hono } from "hono";
import type { Catalogo } from "./tipos.js";
import { rotasAlien } from "./rotas/alien.js";

export function criarApp(catalogo: Catalogo) {
  const app = new Hono();

  app.get("/", (c) => c.json({ nome: "alienzinhos", uso: "/alien/:seed?tamanho=256&fundo=nao" }));
  app.route("/alien", rotasAlien(catalogo));

  return app;
}
