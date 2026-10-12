import { serve } from "@hono/node-server";
import { carregarCatalogo } from "./catalogo/carregar.js";
import { criarApp } from "./app.js";

const catalogo = await carregarCatalogo();
const app = criarApp(catalogo);
const porta = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port: porta }, () => {
  console.log(`alienzinhos rodando em http://localhost:${porta}`);
});
