<div align="center">
  <img src="docs/banner.svg" alt="alienzinhos: uma seed entra, um alien sai" width="840">
</div>

<br>

### ▸ sobre

```txt
uma seed entra, um alien sai.
mesma seed, mesmo alien. sempre.

10 rostos · 20 paletas · 10 bocas · 29 extras
20 olhos · 20 chapéus (metade animada)
+2 bilhões de combinações
```

### ▸ uso

```bash
GET /alien/:seed                # svg do alien
GET /alien/:seed?tamanho=512    # 16 a 1024 · padrão 256
```

como a resposta é uma imagem, dá pra colocar em qualquer lugar:

```md
![meu alien](https://seu-dominio/alien/seu-nome)
```

### ▸ rodando

```bash
git clone https://github.com/zrdep/alienzinhos.git
cd alienzinhos
npm i && npm run dev

# → http://localhost:3000/alien/zrdep
```

### ▸ como funciona

```txt
seed ─► hash ─► sorteio ─┬─ rosto + paleta
                         ├─ boca
                         ├─ olhos
                         ├─ extras
                         └─ chapéu
                              │
                              ▼
                         svg 64×64
```

as camadas são empilhadas nessa ordem, e as animações rodam só com css dentro do svg.

### ▸ estrutura

```txt
assets/    svgs de cada camada
data/      paletas e metadados
docs/      banner e grade
src/       api
```

### ▸ peças novas

toda peça é desenhada numa grade de 64×64 com zonas fixas pra olhos, boca e chapéu. use o [`docs/guia-grade.svg`](docs/guia-grade.svg) como camada de referência no editor.

<br>

<div align="center">
<sub>MIT · feito por <a href="https://github.com/zrdep">zrdep</a></sub>
</div>
