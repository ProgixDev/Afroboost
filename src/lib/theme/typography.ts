export const typography = {
  display: { fontFamily: 'Inter_700Bold', fontSize: 32, lineHeight: 40 },
  h1: { fontFamily: 'Inter_700Bold', fontSize: 24, lineHeight: 32 },
  h2: { fontFamily: 'Inter_600SemiBold', fontSize: 20, lineHeight: 28 },
  h3: { fontFamily: 'Inter_600SemiBold', fontSize: 16, lineHeight: 24 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20 },
  bodyEmphasis: { fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16 },
  mono: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18 },
} as const;

export type TypographyVariant = keyof typeof typography;
