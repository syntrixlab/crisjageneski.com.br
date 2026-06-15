# crisjageneski.com.br

Site institucional de psicóloga com CMS próprio baseado em blocos. Permite criar e editar páginas através de um editor visual com seções, colunas e blocos de conteúdo.

## Pré-requisitos

- Node.js 20+
- PostgreSQL 14+
- Conta no Supabase (para storage de imagens)
- Redis (opcional, para cache)

## Setup

### 1. Variáveis de ambiente

```bash
cp .env.example .env
cp client/.env.example client/.env.local
```

Preencher no `.env`:
- `DATABASE_URL` — string de conexão PostgreSQL
- `JWT_SECRET` — string aleatória (mín. 16 chars)
- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` — do painel Supabase
- `SUPABASE_STORAGE_BUCKET` — nome do bucket criado no Supabase

### 2. Instalar dependências

```bash
npm install
cd client && npm install && cd ..
```

### 3. Banco de dados

```bash
npx prisma migrate dev
```

## Desenvolvimento

```bash
# Terminal 1 — servidor (porta 4000)
cd server && npm run dev

# Terminal 2 — cliente (porta 5173)
cd client && npm run dev
```

Acesse:
- Site público: http://localhost:5173
- Admin: http://localhost:5173/admin

## Build para produção

```bash
cd client && npm run build
npm start
```

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | React 19, Vite, TypeScript, React Query |
| Backend | Express 5, TypeScript, Prisma |
| Banco | PostgreSQL |
| Storage | Supabase Storage |
| Cache | Redis (opcional) |
| Auth | JWT |

## Documentação

A documentação técnica e de arquitetura está em `CLAUDE.md`.
Os planos de refatoração em andamento estão em `docs/superpowers/`.
