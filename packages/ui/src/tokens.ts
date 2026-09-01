export const tokens = {
  light: {
    paper: '#FAF8F4',
    surface: '#FFFFFF',
    surface2: '#F1EDE6',
    ink: '#1C1917',
    ink2: '#5C564D',
    ink3: '#877F73',
    hairline: '#E7E2D9',
    brand: '#1E5C43',
    partnerA: '#B4532A',
    partnerB: '#23606B',
    danger: '#B3362B',
    warning: '#A66A21',
  },
  dark: {
    paper: '#151310',
    surface: '#1C1915',
    surface2: '#242019',
    ink: '#F2EFE9',
    ink2: '#C0BAB0',
    ink3: '#8A8478',
    hairline: '#2A261F',
    brand: '#8FC7A9',
    partnerA: '#C6683E',
    partnerB: '#3A7B87',
    danger: '#D9483B',
    warning: '#C7832D',
  },
  categories: [
    '#5F7461', // 1. Moradia
    '#A96A3C', // 2. Mercado
    '#B4532A', // 3. Restaurantes
    '#23606B', // 4. Transporte
    '#7D5E7C', // 5. Lazer
    '#4E7E8C', // 6. Tech
    '#A3874A', // 7. Utilidades
    '#6E8F6B', // 8. Saúde
    '#9C5A54', // 9. Salário
    '#5C6B7A', // 10. Outros
  ],
  radius: {
    chip: 4,
    button: 6,
    input: 6,
    dropdown: 10,
    modal: 12,
  },
} as const;

export type ThemeTokens = typeof tokens.light;
