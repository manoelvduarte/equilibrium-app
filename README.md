# Equilibrium — Finanças Compartilhadas para Casais

Equilibrium é um sistema de gestão financeira conjunta com foco em transparência, precisão matemática estrita, design Ledger Editorial e assistente com inteligência artificial multimodal.

## 📁 Estrutura do Monorepo

- `apps/web`: Aplicação Next.js 15 (App Router, Server Actions, API Routes, Tailwind CSS).
- `apps/mobile`: Aplicativo React Native (Expo Router v4, NativeWind v4, Camera OCR).
- `packages/ui`: Design system Ledger Editorial (tokens, formatadores de moeda/data, ícones, parser NLP).
- `packages/validations`: Schemas Zod compartilhados.
- `packages/db`: Migrações SQL e fixtures Supabase.
- `packages/ai`: Definições de tools do Assistente com verificação Zod.

## ⚙️ Configuração de Variáveis de Ambiente

> **IMPORTANTE (Monorepos Next.js)**:
> O Next.js **NÃO** lê arquivos `.env` situados na raiz do monorepo.
> As credenciais de backend, Supabase e Google Gemini DEVEM ser configuradas diretamente em **`apps/web/.env.local`**.

### Variáveis Obrigatórias em `apps/web/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-chave-anon>
GOOGLE_GENERATIVE_AI_API_KEY=<sua-chave-gemini>
AI_MODEL=gemini-2.5-flash
```

### Variáveis Obrigatórias em `apps/mobile/.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<sua-chave-anon>
EXPO_PUBLIC_WEB_API_URL=http://<IP-DO-SEU-PC-NA-WIFI>:3000
```
*No Expo Go em dispositivos físicos, use o IP local do computador (ex: `http://192.168.0.42:3000`), nunca `localhost`.*

## 🚀 Executando o Projeto

```bash
# Instalar dependências
pnpm install

# Iniciar aplicação Web
pnpm --filter @equilibrium/web dev

# Iniciar aplicativo Mobile
pnpm --filter @equilibrium/mobile start
```
