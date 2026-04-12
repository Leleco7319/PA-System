# CLAUDE.md — Sistema de Áudio Distribuído (Dashboard Web)

Este arquivo descreve a arquitetura, convenções e contexto do projeto para orientar o desenvolvimento assistido por IA.

---

## Visão Geral do Projeto

Sistema de gerenciamento web para um **Public Address System (PA) de baixo custo** baseado em ESP32 via rede Wi-Fi e protocolo HTTP/REST. A interface web permite que administradores de edifícios comerciais e educacionais controlem reprodução de áudio, agendamentos, upload de arquivos e gerenciamento de nós remotos.

**Stack:**
- **Frontend:** Next.js 14+ (App Router)
- **Backend:** Next.js API Routes (REST)
- **Banco de dados:** MongoDB (via Mongoose)
- **Autenticação:** NextAuth.js (JWT + sessão)
- **Estilização:** Tailwind CSS

---

## Arquitetura do Sistema

```
[Browser/Dashboard]
        │  HTTP/REST
        ▼
[Next.js App]
  ├── /app               → Páginas (App Router)
  ├── /app/api           → API Routes (REST para frontend e ESP32)
  ├── /components        → Componentes reutilizáveis
  ├── /lib               → Utilitários (db, helpers)
  └── /models            → Schemas Mongoose
        │  HTTP
        ▼
[ESP32 Nodes]  ←→  [MongoDB Atlas / Local]
```

Os nós ESP32 se comunicam diretamente com as API Routes via HTTP simples (sem autenticação JWT — usar API Key por header `x-node-key`).

---

## Estrutura de Pastas

```
/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                        # Redireciona para /login ou /dashboard
│   ├── login/
│   │   └── page.tsx                    # Página de login
│   ├── dashboard/
│   │   ├── layout.tsx                  # Layout com sidebar
│   │   ├── page.tsx                    # Dashboard principal (visão geral)
│   │   ├── audios/
│   │   │   └── page.tsx                # Gerenciar Áudios + Upload
│   │   ├── agendamentos/
│   │   │   └── page.tsx                # Criar e listar agendamentos
│   │   ├── on-demand/
│   │   │   └── page.tsx                # Reprodução On-Demand + Gravar Áudio
│   │   ├── nos/
│   │   │   └── page.tsx                # Gerenciar Nós + Grupos + Sincronizar
│   │   └── configuracoes/
│   │       └── page.tsx                # Configurações do sistema
│   └── api/
│       ├── auth/
│       │   └── [...nextauth]/route.ts
│       ├── audios/
│       │   ├── route.ts                # GET (listar), POST (upload)
│       │   └── [id]/route.ts           # DELETE
│       ├── agendamentos/
│       │   ├── route.ts                # GET, POST
│       │   └── [id]/route.ts           # PUT, DELETE
│       ├── nos/
│       │   ├── route.ts                # GET (listar nós)
│       │   └── [id]/
│       │       ├── route.ts            # GET, DELETE
│       │       └── sincronizar/route.ts
│       ├── grupos/
│       │   ├── route.ts                # GET, POST
│       │   └── [id]/route.ts           # PUT, DELETE
│       ├── on-demand/
│       │   └── route.ts                # POST (dispara reprodução)
│       └── node/                       # Endpoints consumidos pelos ESP32
│           ├── register/route.ts       # ESP32 se registra
│           ├── heartbeat/route.ts      # ESP32 envia status periódico
│           ├── files/route.ts          # ESP32 busca lista de arquivos
│           ├── download/[filename]/route.ts  # ESP32 baixa áudio
│           └── status/route.ts         # ESP32 reporta status de reprodução
├── components/
│   ├── ui/                             # Componentes base (Button, Input, Modal…)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── audios/
│   │   ├── AudioUploadForm.tsx
│   │   └── AudioList.tsx
│   ├── agendamentos/
│   │   ├── AgendamentoForm.tsx
│   │   └── AgendamentoList.tsx
│   ├── nos/
│   │   ├── NoCard.tsx
│   │   ├── NoList.tsx
│   │   └── GrupoManager.tsx
│   └── on-demand/
│       ├── GravacaoAudio.tsx
│       └── SeletorNos.tsx
├── lib/
│   ├── db.ts                           # Conexão Mongoose (singleton)
│   ├── auth.ts                         # Configuração NextAuth
│   └── utils.ts                        # Helpers gerais
├── models/
│   ├── User.ts
│   ├── Audio.ts
│   ├── Agendamento.ts
│   ├── No.ts
│   └── Grupo.ts
├── types/
│   └── index.ts                        # Tipos TypeScript globais
├── public/
│   └── uploads/                        # Arquivos de áudio armazenados localmente
├── .env.local
└── CLAUDE.md
```

---

## Modelos de Dados (MongoDB / Mongoose)

### `User`
```ts
{
  _id: ObjectId,
  nome: string,
  email: string,        // único
  senha: string,        // hash bcrypt
  createdAt: Date,
  updatedAt: Date
}
```

### `Audio`
```ts
{
  _id: ObjectId,
  nome: string,
  nomeArquivo: string,  // nome no disco (uuid + extensão)
  tamanho: number,      // bytes
  duracao: number,      // segundos (opcional)
  checksum: string,     // MD5 do arquivo
  createdAt: Date
}
```

### `Agendamento`
```ts
{
  _id: ObjectId,
  audio: ObjectId,      // ref: Audio
  nos: [ObjectId],      // ref: No[] — nós alvo
  grupos: [ObjectId],   // ref: Grupo[]
  dataHora: Date,       // momento do disparo
  recorrente: boolean,
  cron: string,         // expressão cron se recorrente (opcional)
  status: 'pendente' | 'executado' | 'falhou',
  createdAt: Date
}
```

### `No`
```ts
{
  _id: ObjectId,
  nome: string,
  ip: string,
  macAddress: string,   // identificador único do ESP32
  grupos: [ObjectId],   // ref: Grupo[]
  online: boolean,
  ultimoHeartbeat: Date,
  versaoFirmware: string,
  createdAt: Date
}
```

### `Grupo`
```ts
{
  _id: ObjectId,
  nome: string,
  descricao: string,
  nos: [ObjectId],      // ref: No[]
  createdAt: Date
}
```

---

## Endpoints da API

### Autenticação (usuário via browser)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/signin` | Login (NextAuth) |
| POST | `/api/auth/signout` | Logout |

### Áudios
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/audios` | Lista todos os áudios |
| POST | `/api/audios` | Upload de novo áudio (multipart/form-data) |
| DELETE | `/api/audios/:id` | Remove áudio |

### Agendamentos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/agendamentos` | Lista agendamentos |
| POST | `/api/agendamentos` | Cria novo agendamento |
| PUT | `/api/agendamentos/:id` | Atualiza agendamento |
| DELETE | `/api/agendamentos/:id` | Remove agendamento |

### Nós
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/nos` | Lista nós conectados |
| GET | `/api/nos/:id` | Detalhes de um nó |
| DELETE | `/api/nos/:id` | Remove nó |
| POST | `/api/nos/:id/sincronizar` | Força sincronização do nó |

### Grupos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/grupos` | Lista grupos |
| POST | `/api/grupos` | Cria grupo |
| PUT | `/api/grupos/:id` | Atualiza grupo |
| DELETE | `/api/grupos/:id` | Remove grupo |

### On-Demand
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/on-demand` | Dispara reprodução imediata |

Body: `{ audioId: string, nosIds: string[], gruposIds: string[] }`

### Endpoints para ESP32 (autenticação por `x-node-key` no header)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/node/register` | Nó se registra (mac, ip, versão) |
| POST | `/api/node/heartbeat` | Nó reporta que está online |
| GET | `/api/node/files` | Lista arquivos + checksums que o nó deve ter |
| GET | `/api/node/download/:filename` | Download do arquivo de áudio |
| POST | `/api/node/status` | Nó reporta status da reprodução |

---

## Fluxo do Site (conforme fluxograma)

```
Acessar Site
    └── Página de Login
            ├── [Login Inválido] → Exibir Erro → Página de Login
            └── [Login Válido] → Dashboard Principal
                    ├── Gerenciar Áudios
                    │       └── Upload de Áudio → Enviar para API
                    ├── Agendamentos
                    │       └── Criar Agendamento
                    │               ├── Selecionar Áudio
                    │               ├── Escolher Nós
                    │               └── Definir Data/Hora → Salvar na API
                    ├── Reprodução On-Demand
                    │       └── Gravar Áudio / Selecionar Áudio
                    │               └── Selecionar Nós → Transmitir via API
                    ├── Configurações
                    │       └── Configurações do sistema / Logout
                    └── Gerenciar Nós
                            ├── Ver Nós Conectados
                            ├── Gerenciar Grupos
                            └── Sincronizar API → Salvar na API
```

---

## Variáveis de Ambiente (`.env.local`)

```env
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/audio-distribuido

# NextAuth
NEXTAUTH_SECRET=seu_secret_aqui
NEXTAUTH_URL=http://localhost:3000

# API Key para ESP32
NODE_API_KEY=chave_secreta_dos_nos

# Armazenamento de áudios
UPLOAD_DIR=./public/uploads
MAX_UPLOAD_SIZE_MB=50
```

---

## Convenções de Código

- **TypeScript** em todo o projeto — sem `any` explícito
- **Server Components** por padrão no App Router; usar `'use client'` apenas quando necessário (interatividade, hooks)
- **API Routes** sempre retornam `NextResponse.json()` com status HTTP correto
- **Mongoose** com conexão singleton em `lib/db.ts` — nunca abrir nova conexão dentro de route handlers
- **Autenticação:** todas as rotas `/dashboard/*` e `/api/*` (exceto `/api/node/*` e `/api/auth/*`) devem verificar sessão via `getServerSession()`
- **Upload de áudio:** salvar em `public/uploads/` com nome `{uuid}.{ext}`, calcular MD5 após gravação e persistir no modelo `Audio`
- **Nomenclatura:** camelCase para variáveis/funções, PascalCase para componentes e tipos, kebab-case para rotas de URL

---

## Lógica de Negócio Importante

### Sincronização de Nós
Quando um agendamento é criado ou um áudio é enviado, os nós alvo devem ser notificados. O fluxo é:
1. Dashboard salva o agendamento no MongoDB
2. A API opcionalmente envia um POST para o IP do nó (`http://{ip}/sync`) informando que há novos arquivos
3. O nó, ao receber o aviso (ou no próximo polling), chama `GET /api/node/files` para obter a lista atualizada
4. O nó baixa os arquivos faltantes via `GET /api/node/download/:filename`
5. Verifica MD5 e confirma via `POST /api/node/status`

### Detecção de Nós Online
- ESP32 envia `POST /api/node/heartbeat` a cada 30 segundos
- Um nó é considerado **offline** se `ultimoHeartbeat` for há mais de 90 segundos
- O dashboard pode exibir status em tempo real via polling da rota `GET /api/nos` a cada 10s ou via Server-Sent Events

### Prioridade de Reprodução
Áudios on-demand têm prioridade sobre agendados (conforme firmware). O backend registra o tipo (`on-demand` | `agendado`) ao enviar o comando de reprodução para o nó.

### Upload de Áudio
- Aceitar apenas `.mp3` e `.wav`
- Limite de tamanho configurável via `MAX_UPLOAD_SIZE_MB`
- Calcular checksum MD5 do arquivo após receber
- Armazenar metadados no MongoDB e arquivo em `public/uploads/`

---

## Comandos Úteis

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build de produção
npm run build && npm start

# Checar tipos TypeScript
npm run type-check

# Instalar dependências principais
npm install next react react-dom mongoose next-auth bcryptjs uuid
npm install -D typescript @types/node @types/react @types/bcryptjs @types/uuid tailwindcss
```

---

## Dependências Principais

```json
{
  "next": "^14",
  "react": "^18",
  "mongoose": "^8",
  "next-auth": "^4",
  "bcryptjs": "^2",
  "uuid": "^9",
  "tailwindcss": "^3"
}
```

---

## Notas para o Assistente de IA

- O projeto é um **sistema embarcado + web**: o backend serve tanto o frontend (dashboard) quanto os microcontroladores ESP32
- Os ESP32 **não usam JWT** — autenticam com uma API Key fixa no header `x-node-key`
- O banco de dados é **MongoDB** — usar Mongoose com schemas tipados
- **Não usar** o diretório `pages/` — este projeto usa exclusivamente o **App Router** do Next.js 14
- Ao criar componentes de formulário com seleção de nós/grupos, sempre buscar dados frescos da API (não hardcode)
- O campo `checksum` nos áudios é crítico para a integridade do sistema embarcado — nunca omitir
- Ao gerar código de upload, usar `FormData` no cliente e `formidable` ou a API nativa do Next.js no servidor
