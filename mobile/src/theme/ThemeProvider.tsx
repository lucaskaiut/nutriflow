import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { palettes, type Palette, type ThemeName } from './tokens';

type Pref = 'light' | 'dark' | 'system';

const ThemeContext = createContext<{ name: ThemeName; colors: Palette }>({ name: 'light', colors: palettes.light });

export function ThemeProvider({ preference, children }: { preference: Pref; children: ReactNode }) {
  const system = useColorScheme();
  const name: ThemeName = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  const value = useMemo(() => ({ name, colors: palettes[name] }), [name]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

/** Cria estilos dependentes do tema, memorizados por tema. */
export function useStyles<T>(factory: (c: Palette) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
