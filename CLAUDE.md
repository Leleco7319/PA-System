# CLAUDE.md — Sistema de Áudio Distribuído (Dashboard Web)

Este arquivo descreve a arquitetura, convenções e contexto do projeto para orientar o desenvolvimento assistido por IA. Reflete o estado **real** do código (não apenas o planejamento inicial).

---

## Visão Geral do Projeto

Sistema de gerenciamento web para um **Public Address System (PA) de baixo custo** baseado em ESP32 via rede Wi-Fi e protocolo HTTP/REST. A interface web permite que administradores de edifícios comerciais e educacionais controlem reprodução de áudio, agendamentos, upload de arquivos e gerenciamento de nós remotos.

**Stack real (verificada em `package.json`):**
- **Frontend:** Next.js **16.2.3** (App Router) + React **19.2.4**
- **Backend:** Next.js API Routes (REST)
- **Banco de dados:** MongoDB via **Mongoose 9**
- **Autenticação:** NextAuth.js 4 (JWT + sessão)
- **Estilização:** Tailwind CSS **4**
- **Áudio:** `fluent-ffmpeg` + `ffmpeg-static` (conversão webm→mp3)
- **Validação:** **Zod 4**
- **Testes:** **Vitest 4**
- **TypeScript 5** — sem `any` explícito

> Nota: o middleware do Next 16 vive em **`proxy.ts`** na raiz (nome correto nesta versão — não renomear para `middleware.ts`).

---

## Arquitetura do Sistema

```
[Browser/Dashboard]
        │  HTTP/REST (sessão NextAuth)
        ▼
[Next.js App]
  ├── /app               → Páginas (App Router)
  ├── /app/api           → API Routes (REST para frontend e ESP32)
  ├── /components        → Componentes reutilizáveis
  ├── /hooks             → Hooks de cliente (ex: useApiList)
  ├── /lib               → Utilitários, validação, regras de negócio
  └── /models            → Schemas Mongoose
        │  HTTP (x-node-key) + UDP (config inicial)
        ▼
[ESP32 Nodes]  ←→  [MongoDB Atlas / Local]
```

Os nós ESP32 se comunicam com as API Routes via HTTP simples (sem JWT — autenticam por **API Key no header `x-node-key`**). A configuração inicial de um nó é enviada por **UDP** (`/api/esp-config`).

---

## Camada `lib/` (regras de negócio e utilitários)

| Arquivo | Responsabilidade |
|---------|------------------|
| `lib/db.ts` | Conexão Mongoose singleton (cache global, `bufferCommands: false`); descarta a promise em caso de falha para permitir reconexão |
| `lib/env.ts` | **Único** ponto de leitura de `process.env` (lazy via getters): `MONGODB_URI`, `NODE_API_KEY`, `MAX_UPLOAD_SIZE_MB`, `UPLOAD_DIR` |
| `lib/auth.ts` | Configuração NextAuth (CredentialsProvider + bcrypt + JWT) |
| `lib/api-utils.ts` | `apiError`, `requireSession`, `parseBody(request, schema)` (valida com zod → 400), `handleRoute(fn)` (wrapper try/catch → 500 padronizado) |
| `lib/node-auth.ts` | `verificarNodeKey(request)` — autenticação dos ESP32 (fail-closed se a chave não estiver configurada) |
| `lib/validators.ts` | Schemas **zod** de todos os bodies POST/PUT + `isCronValido`, `isValidIp` |
| `lib/audio-upload.ts` | `processarUpload`, `converterParaMp3`, `md5`, validação de extensão/tamanho |
| `lib/espSchedule.ts` | **Módulo puro** (sem mongoose): `cronDaysToBitmask`, `agendamentoToEspEntry` — conversão de agendamentos para o formato do firmware |
| `lib/scheduleSync.ts` | `resolveNodes`/`resolveNodeIds` (nós diretos + via grupos, dedup) e `syncNodeSchedules` (POST `/sync` e `/schedule` nos nós) |
| `lib/utils.ts` | `formatBytes`, `formatDuration`, `formatDateTime`, `isNodeOnline`, `slugify`, `gerarCron` |

**Convenção de rota:** todo handler é embrulhado em `handleRoute(...)`, valida sessão com `requireSession()`/`apiError`, e valida o body com `parseBody(request, schema)`. Nunca ler `process.env` diretamente numa rota — usar `lib/env.ts`.

---

## Estrutura de Pastas

```
/
├── app/
│   ├── layout.tsx · page.tsx (redirect login/dashboard)
│   ├── login/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx (sidebar) · page.tsx (visão geral)
│   │   ├── audios/ · agendamentos/ · on-demand/
│   │   ├── nos/ · configuracoes/ · esp-config/
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── audios/route.ts · audios/[id]/route.ts
│       ├── agendamentos/route.ts · agendamentos/[id]/route.ts
│       ├── nos/route.ts · nos/[id]/route.ts · nos/[id]/sincronizar/route.ts
│       ├── grupos/route.ts · grupos/[id]/route.ts
│       ├── on-demand/route.ts · on-demand/upload/route.ts
│       ├── esp-config/route.ts          # envia config ao ESP32 via UDP
│       └── node/                        # endpoints consumidos pelos ESP32
│           ├── register/ · heartbeat/ · files/ · status/ · ping/
│           └── download/[filename]/
├── components/
│   ├── ui/ (Button, Input, Modal, ConfirmModal, Badge, Spinner, ErrorBanner)
│   ├── layout/ (Sidebar, Header)
│   ├── audios/ · agendamentos/ · nos/ · on-demand/
├── hooks/
│   └── useApiList.ts                    # fetch + loading/error/refetch + polling
├── lib/                                 # ver tabela acima
├── models/ (User, Audio, Agendamento, No, Grupo)
├── tests/                               # Vitest (unit + rotas)
│   └── api/                             # testes de route handlers
├── scripts/seed.ts                      # cria usuário admin
├── types/index.ts
├── proxy.ts                             # middleware NextAuth (protege /dashboard/*)
├── .env / .env.example
└── CLAUDE.md
```

---

## Modelos de Dados (MongoDB / Mongoose)

`timestamps: { createdAt: true, updatedAt: false }` em Audio/Agendamento/No/Grupo; `User` usa `timestamps: true`.

### `User`
`{ nome, email (único, lowercase), senha (hash bcrypt via pre-save hook), createdAt, updatedAt }`

### `Audio`
`{ nome, nomeArquivo (uuid.ext), tamanho (bytes), duracao? (s), checksum (MD5), temporario (bool, default false), createdAt }`
- `temporario: true` → áudios on-demand gravados ao vivo, invisíveis na biblioteca e apagados após a reprodução.

### `Agendamento`
`{ audio (ref), nos[] (ref), grupos[] (ref), dataHora, recorrente, cron?, status: 'pendente'|'executado'|'falhou', createdAt }`

### `No`
`{ nome, ip, macAddress (único), grupos[] (ref), online, ultimoHeartbeat (default epoch 0), versaoFirmware, createdAt }`

### `Grupo`
`{ nome, descricao, nos[] (ref), createdAt }`

---

## Endpoints da API

### Dashboard (autenticação por sessão NextAuth — `requireSession`)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET / POST | `/api/audios` | Lista (não-temporários) / upload multipart |
| DELETE | `/api/audios/:id` | Remove áudio (disco + DB) |
| GET / POST | `/api/agendamentos` | Lista / cria (sincroniza nós em fire-and-forget) |
| PUT / DELETE | `/api/agendamentos/:id` | Atualiza (whitelist de campos) / remove + re-sincroniza |
| GET / POST | `/api/grupos` | Lista / cria |
| PUT / DELETE | `/api/grupos/:id` | Atualiza / remove |
| GET | `/api/nos` | Lista nós (recalcula `online` por heartbeat) |
| GET / DELETE | `/api/nos/:id` | Detalhes / remove |
| POST | `/api/nos/:id/sincronizar` | Força POST `/sync` no ESP32 |
| POST | `/api/on-demand` | Reprodução imediata (`/sync` + `/play`) |
| POST | `/api/on-demand/upload` | Upload de gravação ao vivo (marca `temporario`) |
| POST | `/api/esp-config` | Envia config ao ESP32 via **UDP** (dgram) |

Body on-demand/agendamento: `{ audioId, nosIds[], gruposIds[] }` (+ `dataHora`, `recorrente`, `cron` no agendamento).

### Endpoints para ESP32 (autenticação por `x-node-key`)
| Método | Rota | Resposta (contrato — **imutável**) |
|--------|------|-----------|
| POST | `/api/node/register` | `{ success, noId }` |
| POST | `/api/node/heartbeat` | `{ success }` |
| GET | `/api/node/files` | `{ files: [{ filename, checksum, size }] }` |
| GET | `/api/node/download/:filename` | binário do áudio (`path.basename` previne path traversal) |
| POST | `/api/node/status` | `{ success }` |
| GET | `/api/node/ping` | `{ pong: true, timestamp }` — **público**, sem auth |

---

## Lógica de Negócio Importante

### Sincronização de Nós (`lib/scheduleSync.ts`)
Ao criar/editar/excluir um agendamento, os nós-alvo (diretos + via grupos, resolvidos por `resolveNodeIds`) recebem em fire-and-forget:
1. POST `http://{ip}/sync` → o ESP32 baixa arquivos faltantes (compara MD5 via `/api/node/files`).
2. POST `http://{ip}/schedule` com a lista `EspScheduleEntry { hour, minute, days (bitmask bit0=Dom), filename }` reconstruída a partir dos agendamentos pendentes.

### Conversão cron → firmware (`lib/espSchedule.ts`)
`cronDaysToBitmask`: `*`→`0x7F`, `1-5`→Seg..Sex, `7`≡Domingo. Agendamento único dispara só no dia da semana de `dataHora`.

### Detecção de Nós Online
- ESP32 envia heartbeat a cada ~30s; `isNodeOnline` considera offline se `ultimoHeartbeat` > 90s.
- O dashboard de nós faz polling de `/api/nos` e `/api/grupos` a cada 10s (`useApiList({ pollMs })`).

### Upload de Áudio (`lib/audio-upload.ts`)
- Aceita `.mp3`, `.wav`, `.webm`; `.webm` é convertido para mp3 (libmp3lame, 128 kbps) via ffmpeg.
- Limite `MAX_UPLOAD_SIZE_MB` (default 50). Arquivo salvo como `{uuid}.{ext}` (ou `tmp-{uuid}` on-demand) em `UPLOAD_DIR`.
- **Checksum MD5 é intencional**: é o contrato de integridade verificado pelo firmware ESP32 (não é uso criptográfico). Não trocar por SHA-256.

---

## Frontend

- **Server Components** por padrão; `'use client'` apenas onde há interatividade.
- Listagens de cliente usam **`hooks/useApiList<T>(url, { pollMs? })`** → `{ data, loading, error, refetch }` (loading só no 1º carregamento; polling não pisca a UI). Sempre tratar `error` com `<ErrorBanner>`.
- Confirmações de exclusão usam **`<ConfirmModal>`** (nunca `window.confirm`).
- Seleção de nós/grupos reutiliza **`SeletorNos`** (abas nós/grupos).

---

## Variáveis de Ambiente

Ver `.env.example`. Lidas **somente** via `lib/env.ts`.

```env
MONGODB_URI=mongodb://localhost:27017/audio_db?directConnection=true
NEXTAUTH_SECRET=...            # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
NODE_API_KEY=...              # header x-node-key dos ESP32
UPLOAD_DIR=public/uploads
MAX_UPLOAD_SIZE_MB=50
ADMIN_EMAIL=... ADMIN_SENHA=... ADMIN_NOME=...   # usados por `npm run seed`
```

---

## Comandos Úteis

```bash
npm run dev          # desenvolvimento
npm run build        # build de produção
npm run lint         # ESLint
npm run type-check   # tsc --noEmit
npm test             # Vitest (run)
npm run test:watch   # Vitest (watch)
npm run seed         # cria usuário admin (exige ADMIN_SENHA no env)
```

---

## Testes (`tests/`)

Vitest com ambiente `node` e resolução nativa de paths (`@/*`). Cobertura:
- **Unitários puros**: `lib/utils` (incl. `gerarCron`), `lib/espSchedule` (bitmask/cron — contrato firmware), `lib/validators` (zod), `lib/audio-upload`, `lib/node-auth`, `lib/scheduleSync`.
- **Rotas** (`tests/api/`): todos os handlers invocados com `NextRequest` + mocks de Mongoose/`getServerSession`/`fetch`/`dgram`/`fs`. Cada rota valida 401 sem auth, 400 com input inválido e o happy path; as rotas `/api/node/*` validam os shapes do contrato do firmware.

Mocks com `vi.mock` (sem mongodb-memory-server). Testes de componentes React estão fora do escopo.

---

## Notas para o Assistente de IA

- **Contrato com o firmware ESP32 é imutável**: header `x-node-key`; shapes de resposta de `/api/node/*`; **checksum MD5**; `EspScheduleEntry` e os payloads `/sync` `/schedule` `/play`. Schemas zod **sem `.strict()`** (não rejeitar campos extras de firmwares antigos).
- `proxy.ts` é o middleware (Next 16) — não renomear.
- Não usar o diretório `pages/` — App Router exclusivamente.
- Ao criar rota nova: usar `handleRoute` + `requireSession`/`verificarNodeKey` + `parseBody(schema)` + `apiError`; ler env só por `lib/env.ts`.
- Ao criar listagem de cliente: usar `useApiList` e tratar `error`.
- A senha de Wi-Fi que existia hardcoded em `esp-config/page.tsx` foi removida, mas permanece no histórico do git — a rede real deve ter a senha trocada.
