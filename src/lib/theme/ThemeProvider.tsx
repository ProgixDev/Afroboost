import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { colors, ColorToken, ThemeName } from './colors';
import { useSettingsStore } from '@/stores/settingsStore';

type ThemeCtx = {
  name: ThemeName;
  c: Record<ColorToken, string>;
};

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const pref = useSettingsStore((s) => s.theme);
  const name: ThemeName = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  const value = useMemo(() => ({ name, c: colors[name] }), [name]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme must be used inside ThemeProvider');
  return v;
}
