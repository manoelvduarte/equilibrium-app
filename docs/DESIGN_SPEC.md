# EQUILIBRIUM — DESIGN SPECIFICATION (Ledger Editorial)

## 1. Princípios de Design
- **Estética**: Ledger Editorial — tipografia nobre, papel aquecido, contraste refinado, dados como protagonistas.
- **Anti-Card Uniforme**: A página é um papel plano contínuo (`paper`). Seções são delimitadas por espaçamento amplo, micro-rótulos em caixa alta e linhas capilares (`hairline`). Cards reais (`surface` + raio 12px + `hairline`) existem apenas em overlays, modais, gavetas e superfícies de gráficos.
- **Cor é Dado**: O chrome da aplicação é 100% neutro. Cores vibrantes existem exclusivamente para representar categorias, identificação de parceiros, semântica financeira e a marca.
- **Precisão Centavocêntrica**: Todos os valores monetários utilizam numerais tabulares (`tnum`), centavos inteiros (`amount_cents > 0`) e sinal explícito (`−` em `danger`).

---

## 2. Paleta de Cores e Tokens

### Neutros Aquecidos (PROIBIDO: slate, zinc, gray neutro frio)
- **Tema Claro (Light)**:
  - `paper`: `#FAF8F4` (fundo geral da aplicação)
  - `surface`: `#FFFFFF` (superfície de modais e gráficos)
  - `surface-2`: `#F1EDE6` (hover de linhas e fundos secundários)
  - `ink`: `#1C1917` (texto primário de alto contraste)
  - `ink-2`: `#5C564D` (texto secundário / descrições)
  - `ink-3`: `#877F73` (micro-rótulos, eixos e metadados)
  - `hairline`: `#E7E2D9` (bordas e divisores de 1px)

- **Tema Escuro (Dark)**:
  - `paper`: `#151310` (fundo geral)
  - `surface`: `#1C1915` (superfícies elevadas)
  - `surface-2`: `#242019` (hover de linhas)
  - `ink`: `#F2EFE9` (texto primário)
  - `ink-2`: `#C0BAB0` (texto secundário)
  - `ink-3`: `#8A8478` (metadados e rótulos)
  - `hairline`: `#2A261F` (divisores de 1px)

### Semânticos & Marca
- `brand`: `#1E5C43` (verde editorial profundo / em dark para texto: `#8FC7A9`)
- `partner-a`: `#B4532A` (terracota — parceiro 1)
- `partner-b`: `#23606B` (petróleo — parceiro 2)
- `danger`: `#B3362B` (despesas, alertas críticos, valores negativos)
- `warning`: `#A66A21` (alertas de teto > 80%)

### Categorias Financeiras (10 Paletas Estritas)
1. `#5F7461` (Moradia / Fixo)
2. `#A96A3C` (Supermercado / Alimentação)
3. `#B4532A` (Restaurantes / Delivery)
4. `#23606B` (Transporte / Mobilidade)
5. `#7D5E7C` (Lazer / Viagens)
6. `#4E7E8C` (Assinaturas & Tecnologia)
7. `#A3874A` (Utilidades / Contas de Consumo)
8. `#6E8F6B` (Saúde / Cuidados)
9. `#9C5A54` (Salários / Receitas Principais)
10. `#5C6B7A` (Outros / Investimentos)

---

## 3. Tipografia

- **Display**: `Fraunces` (Google Font via `next/font/google`)
  - Uso: KPIs numéricos principais, títulos h1 (32px a 56px, `tracking: -0.02em`).
- **UI / Texto Geral**: `IBM Plex Sans` (Google Font)
  - Uso: Textos de interface, tabelas, formulários (base 14px/20px). Numerais obrigatoriamente tabulares (`tnum`).
- **Monospaçada**: `IBM Plex Mono` (Google Font)
  - Uso: Identificadores, diffs de auditoria, tags técnicas (12px/16px).
- **Micro-labels**: 10px, uppercase, `tracking: 0.08em`, cor `ink-3`, font-semibold.

---

## 4. Forma, Bordas e Sombras

- **Raios de Borda (MÁXIMO 12px — `rounded-2xl` e `rounded-3xl` PROIBIDOS)**:
  - `radius-4` (4px): Chips, crachás, badges.
  - `radius-6` (6px): Inputs, botões, campos de busca, tooltips.
  - `radius-10` (10px): Menus dropdown, popovers.
  - `radius-12` (12px): Modais, gavetas (drawers), superfícies de gráficos.
- **Bordas**: `1px solid var(--hairline)`. Bordas coloridas são proibidas.
- **Sombras**:
  - `shadow-sm`: `0 1px 2px rgba(28, 25, 23, 0.05)`
  - `shadow-md`: `0 4px 16px rgba(28, 25, 23, 0.08)`
  - `shadow-lg`: `0 12px 32px rgba(28, 25, 23, 0.16)` (exclusivo para overlays)
  - Sombras coloridas (ex: `shadow-emerald`) são estritamente proibidas.

---

## 5. Ícones e Avatares

- **Ícones**: `lucide-react` com `strokeWidth={1.5}` (tamanhos padrão 16px e 20px).
- **Emojis**: EMOJIS SÃO ESTRITAMENTE PROIBIDOS em qualquer string visível ou categoria.
- **Avatares**: Iniciais do nome do usuário em círculo estilizado com `surface-2` + `ink` ou a matiz do parceiro (`partner-a` / `partner-b`). Imagens externas (Unsplash, Pravatar, etc.) são proibidas.

---

## 6. Dataviz (Recharts)

- Grid exclusivamente horizontal com cor `hairline`.
- Eixos com tipografia 11px em cor `ink-3`.
- Tooltip customizado em `surface`, raio 6px, borda `hairline`, numerais `tnum`.
- Linha de evolução patrimonial com 2px de espessura em cor `brand`.
- Área com preenchimento em gradiente suave ou tint de 8%.
- Cores padrão do Recharts são estritamente proibidas.

---

## 7. Motion & Transições

- Hover / Press: `160ms ease-out` (efeitos de escala como `scale-105` são proibidos).
- Drawers / Modais: `240ms cubic-bezier(0.16, 1, 0.3, 1)`.
- Contadores de KPI: animação de montagem em `500ms`.
- Skeleton shimmer: `1.6s infinite`.

---

## 8. Conteúdo e Formatação

- Idioma: Português do Brasil (pt-BR) direto, sóbrio e sem exclamações desnecessárias ("!").
- Datas relativas padronizadas ("Hoje", "Ontem", "12 de set").
- Moeda: `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- Valores negativos grafados com sinal de menos verdadeiro `−` em cor `danger`.
- Assistente IA denominado formalmente como "Assistente" (ícone `Bot` da Lucide, nunca `Sparkles`).
- Telas sem dados possuem estado vazio padrão: ícone Lucide 24px + 1 linha explicativa + 1 botão ghost de ação.
