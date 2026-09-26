# Cardápio QR — API

Gerador de QR Code para cardápios de restaurantes.

**Fluxo:** o dono se cadastra → sobe o cardápio (imagem, PDF ou itens manuais) → a API salva no banco e gera uma URL pública única (`/m/<slug>`) → gera o QR Code dessa URL → o cliente escaneia e o navegador abre o cardápio.

**Arquitetura:** 3 camadas em 2 containers.

| Container | Conteúdo |
|-----------|----------|
| `app` | API NestJS + frontend (build do React/Vite servido a partir de `public/`) |
| `db`  | PostgreSQL 16 (acessível só pela rede interna) |

---

## Endpoints

Documentação interativa (Swagger): **`/api/docs`**.

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/auth/register` | — | Cadastro (`name`, `email`, `password`, `restaurantName?`) |
| POST | `/api/auth/login` | — | Login → `accessToken` (JWT) |
| GET | `/api/auth/me` | JWT | Usuário logado |
| POST / GET | `/api/restaurants` | JWT | Cria / lista restaurantes do dono |
| POST | `/api/menus` | JWT | Multipart: `title`, `restaurantId?`, `file?` (jpeg/png/webp/pdf) |
| GET | `/api/menus` | JWT | Lista os cardápios do dono |
| GET / PATCH / DELETE | `/api/menus/:id` | JWT (dono) | Detalha / altera (aceita novo `file`) / remove |
| GET | `/api/menus/:id/qrcode?format=png\|svg&download=true&size=512` | JWT (dono) | Imagem do QR Code |
| GET / POST | `/api/menus/:menuId/items` | JWT (dono) | Itens do cardápio manual |
| PATCH / DELETE | `/api/menus/:menuId/items/:itemId` | JWT (dono) | Altera / remove item |
| GET | `/m/:publicSlug` | público | **Destino do QR Code** (ver abaixo) |
| GET | `/api/public/menus/:publicSlug` | público | Dados do cardápio em JSON |
| GET | `/api/public/menus/:publicSlug/qrcode` | público | QR Code (útil para `<img src>` no frontend) |
| GET | `/api/health` | público | `{"status":"ok"}` se o banco responder (usado pelo healthcheck) |
| GET | `/uploads/<arquivo>` | público | Arquivos enviados |

Comportamento de `/m/:publicSlug`:
- **navegador + frontend em `public/`**: entrega o `index.html` da SPA, que busca `/api/public/menus/:slug`;
- **navegador sem frontend**: redireciona direto para a imagem/PDF do cardápio;
- **fetch/curl** (sem `Accept: text/html`): JSON com os dados.

Upload: o mimetype é validado **e** a assinatura do arquivo (magic bytes) também; o arquivo é salvo como `<uuid>.<ext>` (o nome original nunca é usado) e o tamanho é limitado por `MAX_UPLOAD_MB` (retorna 413 se passar).

---

## Variáveis de ambiente

Veja [.env.example](.env.example). Principais:

| Variável | Padrão | Observação |
|----------|--------|------------|
| `PORT` | `3000` | |
| `NODE_ENV` | `development` | `production` na imagem |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_NAME` | `localhost` / `5432` / `postgres` / `cardapio` | |
| `DB_PASSWORD` ou `DB_PASSWORD_FILE` | — | `*_FILE` lê o valor de um arquivo (Docker secret) |
| `DB_SYNCHRONIZE` | `false` | `true` só em dev (cria/atualiza tabelas) |
| `DB_RETRY_ATTEMPTS` / `DB_RETRY_DELAY_MS` | `10` / `3000` | Reconexão ao banco na inicialização |
| `JWT_SECRET` ou `JWT_SECRET_FILE` | — | **Obrigatório em produção** |
| `JWT_EXPIRES_IN` | `1d` | |
| `PUBLIC_BASE_URL` | `http://localhost:PORT` | Base da URL do QR Code: `${PUBLIC_BASE_URL}/m/<slug>` |
| `UPLOAD_DIR` | `/app/uploads` (prod) / `./uploads` | |
| `MAX_UPLOAD_MB` | `10` | |
| `CORS_ORIGIN` | `*` | Lista separada por vírgula |

---

## Rodar localmente

### Opção A — tudo em Docker

```bash
docker compose -f docker-compose.dev.yml up --build
curl http://localhost:3000/api/health      # {"status":"ok","database":"up"}
```

### Opção B — API no host, banco no Docker

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d db
npm install
npm run start:dev
```

---

## Frontend (opcional)

O frontend (React + Vite, repositório `CardapioFacil`) é servido pela própria API quando o build está em `public/`:

```bash
# no repositório do frontend
npm run build
# copie o conteúdo de dist/ para a pasta public/ desta API (antes do docker build)
cp -r ../CardapioFacil/dist/* ./public/
```

A API serve os assets e faz fallback para `index.html` em qualquer rota que não seja `/api`, `/uploads` ou `/m`.

> O frontend usa `vite-plugin-pwa` com `navigateFallback: '/index.html'`. Adicione
> `navigateFallbackDenylist: [/^\/api/, /^\/uploads/]` no `workbox` do `vite.config.ts`,
> senão o service worker entrega a SPA no lugar de `/api/docs` e dos arquivos enviados.

---

## Build da imagem

O Swarm **não faz build**: o `stack.yaml` usa a imagem `cardapio-api:latest`, que precisa existir na VPS.
Na VPS (nó único), dentro da pasta do projeto:

```bash
docker build -t cardapio-api:latest .
```

- A imagem roda como usuário `node` (não-root). Para conferir: `docker run --rm --entrypoint id cardapio-api:latest` → `uid=1000(node)`.
- O Node 20 está fora de suporte (EOL em abril/2026). Para usar o 22 sem editar o Dockerfile: `--build-arg NODE_VERSION=22`.
- Se um dia usar um registry: `docker build -t SEU_USUARIO/cardapio-api:1.0.0 . && docker push SEU_USUARIO/cardapio-api:1.0.0`
  e troque o `image:` do serviço `api` no `stack.yaml` (registry privado: cadastre as credenciais em *Registries* no Portainer).

---

## Deploy no Docker Swarm (Traefik + Portainer)

O backend fica em **https://api.treifit.com.br**, exposto pelo Traefik que já roda na VPS:

- rede externa `network_public` (a mesma do Traefik), entrypoint `websecure`, certificado via `letsencrypt`;
- nenhuma porta é publicada: o Traefik encaminha para a porta 3000 do serviço `api`;
- o `db` fica só na rede interna `app_net` (overlay, `internal: true`), fora da `network_public`.

Antes do primeiro deploy, o DNS de `api.treifit.com.br` precisa apontar para o IP da VPS
(registro A), senão o Let's Encrypt não emite o certificado.

### Senhas

A senha do banco (`DB_PASSWORD` / `POSTGRES_PASSWORD`) e o `JWT_SECRET` estão escritos direto no
`stack.yaml`, no `docker-compose.dev.yml` e no `Dockerfile`. Para trocar, altere **todos** eles com o mesmo valor.

> Esses valores ficam dentro da imagem (`docker history`) e no repositório: mantenha o repositório
> e o registry **privados**.
> A senha do Postgres só é aplicada quando o volume `pgdata` é criado pela primeira vez.

### Pelo Portainer

1. **Stacks → Add stack** → nome `cardapio` → *Web editor*: cole o `stack.yaml`.
2. No **primeiro deploy**, troque `DB_SYNCHRONIZE: "false"` por `"true"` (cria as tabelas) e clique em **Deploy the stack**.
3. Quando `https://api.treifit.com.br/api/health` responder `{"status":"ok"}`, volte para `"false"` no *Editor* e clique em **Update the stack**.
4. Nova versão: rode `docker build -t cardapio-api:latest .` de novo na VPS e force a atualização do serviço
   (`docker service update --force cardapio_api`, ou *Update the stack* no Portainer). O `update_config` usa
   `start-first`, sem downtime; se o healthcheck falhar, o Swarm faz rollback.

### Pela CLI

```bash
docker stack deploy -c stack.yaml cardapio

docker stack services cardapio
docker service ps cardapio_api --no-trunc
docker service logs -f cardapio_api
curl https://api.treifit.com.br/api/health
```

### Detalhes do `stack.yaml`

- Os dois serviços ficam no nó manager (`placement.constraints`), porque os volumes `pgdata` e `uploads_data` são locais.
- `db` usa `stop-first` na atualização (dois Postgres no mesmo volume corrompem os dados).
- Como o Swarm ignora `depends_on`, a api tenta reconectar ao banco (`DB_RETRY_ATTEMPTS` × `DB_RETRY_DELAY_MS`); se esgotar, o container sai e o Swarm o reinicia.
- `PUBLIC_BASE_URL=https://api.treifit.com.br`: o QR Code aponta para `https://api.treifit.com.br/m/<slug>`.
- `CORS_ORIGIN=https://cardapiofacil.treifit.com.br`: origem do frontend (várias origens: separe por vírgula).

### Backup do banco

```bash
docker exec $(docker ps -qf name=cardapio_db) pg_dump -U cardapio cardapio | gzip > backup-$(date +%F).sql.gz
```

---

## Testando o fluxo completo com curl

```bash
BASE=http://localhost:3000        # ou https://api.treifit.com.br

# 1. Cadastro (já cria o restaurante) e token
TOKEN=$(curl -s -X POST $BASE/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Maria","email":"maria@exemplo.com","password":"senhaForte123","restaurantName":"Cantina da Nona"}' \
  | sed -E 's/.*"accessToken":"([^"]+)".*/\1/')

# (login, se já tiver conta)
# curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
#   -d '{"email":"maria@exemplo.com","password":"senhaForte123"}'

# 2. Upload do cardápio (PDF ou imagem)
curl -s -X POST $BASE/api/menus \
  -H "Authorization: Bearer $TOKEN" \
  -F title="Cardápio de Almoço" \
  -F "file=@cardapio.pdf;type=application/pdf"
# -> { "id": "...", "publicSlug": "VCYQdVZfufrs", "publicUrl": ".../m/VCYQdVZfufrs", ... }

MENU_ID=<id retornado>
SLUG=<publicSlug retornado>

# 3. Listar os cardápios do dono
curl -s $BASE/api/menus -H "Authorization: Bearer $TOKEN"

# 4. QR Code (PNG e SVG para download)
curl -s -o qrcode.png "$BASE/api/menus/$MENU_ID/qrcode?format=png" -H "Authorization: Bearer $TOKEN"
curl -s -OJ "$BASE/api/menus/$MENU_ID/qrcode?format=svg&download=true" -H "Authorization: Bearer $TOKEN"

# 5. O que o cliente vê ao escanear
curl -s $BASE/m/$SLUG                                          # JSON
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' \
  -H 'Accept: text/html' $BASE/m/$SLUG                         # 302 -> arquivo (sem frontend)
curl -s $BASE/api/public/menus/$SLUG

# 6. Cardápio manual com itens
MANUAL_ID=$(curl -s -X POST $BASE/api/menus -H "Authorization: Bearer $TOKEN" -F title="Pratos" \
  | sed -E 's/.*"id":"([^"]+)".*/\1/')
curl -s -X POST $BASE/api/menus/$MANUAL_ID/items -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"Lasanha","price":42.9,"category":"Massas"}'

# 7. Alterar e remover
curl -s -X PATCH $BASE/api/menus/$MENU_ID -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"title":"Almoço Executivo"}'
curl -s -X DELETE $BASE/api/menus/$MENU_ID -H "Authorization: Bearer $TOKEN" -w '%{http_code}\n'
```

---

## Scripts

```bash
npm run build        # compila para dist/
npm run start:dev    # desenvolvimento com watch
npm run start:prod   # node dist/main
npm run lint
```

> O `package.json` tem um `overrides` para `tsconfck` (dependência de dev do `vite-tsconfig-paths`),
> que declara peer `typescript ^5`, enquanto o projeto usa TS 6. Sem ele, o `npm ci` do npm 10
> (que vem na imagem `node:20`) rejeita o `package-lock.json` gerado pelo npm 12.
