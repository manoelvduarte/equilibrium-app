# Equilibrium — Finanças Compartilhadas para Casais

Equilibrium é um sistema completo de gestão financeira compartilhada para casais, projetado com precisão matemática estrita, design Ledger Editorial, isolamento multi-tenant por Row Level Security (RLS) e inteligência artificial multimodal com execução de ações sob aprovação humana prévia.

---

## 📁 Arquitetura do Monorepo

```text
├── apps/
│   ├── web/         # Aplicação Web Next.js 15 (App Router, Tailwind CSS, Server Actions)
│   └── mobile/      # Aplicativo Mobile React Native (Expo Router v4, NativeWind v4, Camera OCR)
├── packages/
│   ├── ui/          # Design System Ledger Editorial, Formatadores e Parser NLP
│   ├── db/          # Migrations SQL, Schemas Drizzle e Fixtures bancárias
│   ├── ai/          # Schemas Zod de Tool Calling para o Assistente
│   └── validations/ # Schemas de validação compartilhados
└── docs/
    ├── DESIGN_SPEC.md # Especificação do Design System Ledger Editorial
    └── RUNBOOK.md     # Guia operacional de manutenção, backup e auditoria
```

---

## ⚙️ Variáveis de Ambiente

### 1. Web Local (`apps/web/.env.local`)
> **Atenção**: O Next.js em monorepos carrega variáveis de ambiente exclusivamente de `apps/web/.env.local`.

```env
NEXT_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-anon-key>
OPENROUTER_API_KEY=sk-or-v1-...
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=nvidia/nemotron-3.5-lightning:free
OCR_MODEL=minimax/minimax-m3:free
PLUGGY_ENABLED=false
```

### 2. Vercel (Produção Web)
Configure no dashboard da Vercel (`Project Settings → Environment Variables`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENROUTER_API_KEY`
- `AI_BASE_URL`
- `AI_MODEL`
- `OCR_MODEL`

### 3. Mobile (`apps/mobile/.env` e `apps/mobile/.env.production`)
- **Desenvolvimento local (Expo Go)**: No arquivo `apps/mobile/.env`, utilize o IP local da máquina na rede Wi-Fi (ex: `http://192.168.1.9:3000`), nunca `localhost`.
- **Produção (APK Preview / Release)**: No arquivo `apps/mobile/.env.production`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<sua-anon-key>
EXPO_PUBLIC_WEB_API_URL=https://equilibrium-app-web.vercel.app
```

---

## 🚀 Como Executar

### Pré-requisitos
- Node.js 20+
- pnpm 9+ (`npm install -g pnpm`)
- Expo CLI (`npm install -g eas-cli expo-cli`)

### Instalação
```bash
pnpm install
```

### Executar Web Localmente
```bash
pnpm --filter @equilibrium/web dev
# Acesse http://localhost:3000
```

### Executar Mobile Localmente (Expo)
```bash
pnpm --filter @equilibrium/mobile start
# Abra o app Expo Go no celular e escaneie o QR code
```

---

## 📱 Geração de APK Android (EAS Build)

Para gerar o arquivo APK instalável para testes em dispositivos Android:

1. Faça login na sua conta Expo:
   ```bash
   eas login
   ```
2. Configure o projeto EAS (se necessário):
   ```bash
   cd apps/mobile
   eas build:configure
   ```
3. Dispare a compilação do APK Preview:
   ```bash
   eas build --profile preview --platform android
   ```
4. Ao final da compilação na nuvem do Expo, o link para download direto do `.apk` será disponibilizado no terminal.

---

## 🧠 Modelos de Inteligência Artificial e Resiliência

O Equilibrium utiliza a **OpenRouter** com modelos auto-selecionados e gratuitos:
- **Chat & Tool Calling Principal**: `nvidia/nemotron-3.5-lightning:free` (1M tokens de contexto)
- **Fallbacks de Chat**: `nvidia/nemotron-3-super-120b-a12b:free` e `openrouter/free`
- **OCR Multimodal (Visão de Recibos)**: `minimax/minimax-m3:free` com fallback para `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`

### Limites de Modelos Gratuitos (:free)
Os modelos gratuitos possuem limites de taxa gerenciados pela OpenRouter (~20 requisições/minuto). Em caso de sobrecarga ou instabilidade temporária (HTTP 429/502), o Equilibrium ativa automaticamente a **cascata de fallback em 3 níveis** sem interromper a experiência do usuário.
