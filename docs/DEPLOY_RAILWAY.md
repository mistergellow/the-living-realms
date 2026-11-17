# Publicar no Railway — guia passo a passo

Resultado final: o jogo online num endereço `https://….up.railway.app`, que se
atualiza sozinho sempre que há alterações no ramo `main` do GitHub.

Vais criar **4 peças** num projeto Railway:

| Peça         | O que é                 | Configuração                      |
| ------------ | ----------------------- | --------------------------------- |
| **Postgres** | Base de dados           | criada pelo Railway               |
| **Redis**    | Tempo real / presença   | criada pelo Railway               |
| **server**   | Site + API + WebSockets | `railway.json` (raiz, automático) |
| **worker**   | Relógio do mundo        | `infra/railway/worker.json`       |

> Os nomes dos botões podem variar ligeiramente no painel do Railway. Se algum
> não corresponder, envia uma captura de ecrã.

---

## 1. Criar o projeto e as bases de dados

1. Em **railway.com** → **New Project** → **Empty Project**.
2. Dentro do projeto: **+ Create** (ou **New**) → **Database** → **PostgreSQL**.
3. Outra vez **+ Create** → **Database** → **Redis**.

Ficam dois cartões: **Postgres** e **Redis**. Mantém estes nomes, porque as
variáveis abaixo usam-nos.

## 2. Criar o serviço `server`

1. **+ Create** → **GitHub Repo** → escolhe `mistergellow/the-living-realms`.
   (Se não aparecer, clica em _Configure GitHub App_ e dá acesso ao repositório.)
2. Clica no cartão novo → **Settings**:
   - **Service name:** `server`
   - **Config-as-code** / **Railway Config File:** deixa **vazio**. O Railway usa
     automaticamente o `railway.json` da raiz do projeto.
   - **Networking** → **Generate Domain**. Se pedir a porta, escreve `3000`.
3. Separador **Variables** → **Raw Editor** → cola:

   ```
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   REDIS_URL=${{Redis.REDIS_URL}}
   WEB_ORIGIN=https://${{RAILWAY_PUBLIC_DOMAIN}}
   COOKIE_SECURE=true
   TRUST_PROXY=true
   ```

4. Guarda e clica em **Deploy** (ou **Apply changes**).

O primeiro build demora uns 3–5 minutos. Ao arrancar, o serviço cria e atualiza
sozinho as tabelas da base de dados.

## 3. Criar o serviço `worker`

1. **+ Create** → **GitHub Repo** → o mesmo repositório outra vez.
2. **Settings**:
   - **Service name:** `worker`
   - **Config-as-code** / **Railway Config File:** `/infra/railway/worker.json`
     (**obrigatório**: sem isto, o worker arranca como se fosse um segundo servidor)
   - **Não** geres domínio (o worker não recebe visitas).
3. **Variables** → **Raw Editor**:

   ```
   NODE_ENV=production
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   REDIS_URL=${{Redis.REDIS_URL}}
   ```

4. **Deploy**.

## 4. Verificar

1. Abre o domínio do serviço `server` (em Settings → Networking).
2. Cria uma conta e um personagem e entra no mundo. O contador **Tick** deve
   subir de 5 em 5 segundos; isso prova que o worker está a funcionar.
3. Num separador anónimo, cria outra conta: os dois personagens devem ver-se.
4. Confirma nos logs de cada serviço (**Deployments → View logs**):
   - `server`: deve aparecer `The Living Realms server ready`. Se aparecer
     `> node apps/server/dist/main.js`, a configuração não foi aplicada.
   - `worker`: deve aparecer `leader acquired; world simulation running`.
5. Se algo falhar: no cartão do serviço → **Deployments** → último deploy →
   **View logs**. Copia as últimas linhas e envia.

## Depois disto

- Cada alteração no ramo `main` do GitHub faz um novo deploy automático.
- Custos: em **Usage**, no painel do Railway. Para esta fase o consumo é baixo.
- Mais tarde: domínio próprio (ex.: `thelivingrealms.com`), com a Cloudflare à
  frente se quisermos.
