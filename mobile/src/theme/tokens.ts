/**
 * Tokens visuais do NutriFlow — linguagem "pastel suave": fundo cinza-azulado claro, cartões
 * brancos bem arredondados, blocos em tons pastel (menta, céu, lilás, lavanda, manteiga) para
 * agrupar assuntos, verde-petróleo escuro para ações e amarelo-manteiga como destaque da navegação.
 * Macronutrientes: proteína (lavanda), carboidratos (mostarda), gorduras (menta).
 */
export type ThemeName = 'light' | 'dark';

const shared = {
  white: '#FFFFFF',
};

export const palettes = {
  light: {
    ...shared,
    protein: '#8C74C9',
    carbs: '#D9A82A',
    fat: '#5FAE7C',
    background: '#EEF2F2',
    surface: '#FFFFFF',
    surfaceMuted: '#F6F8F8',
    surfaceSunken: '#E7EDED',
    border: '#E3E9E9',
    borderStrong: '#D2DADA',
    text: '#14191B',
    textSecondary: '#334044',
    textMuted: '#68767A',
    textSubtle: '#97A3A6',
    primary: '#0F4C5C',
    primaryPressed: '#0B3C49',
    primarySoft: '#DCEBEE',
    primarySofter: '#C7DEE3',
    onPrimary: '#FFFFFF',
    accent: '#F6E27A',
    onAccent: '#14191B',
    tintMint: '#D7EECB',
    tintSky: '#CDE9F0',
    tintLilac: '#EDD7EE',
    tintLavender: '#DFDAF4',
    tintButter: '#FAF0B8',
    onTint: '#14191B',
    water: '#3E9BB8',
    waterStrong: '#2F8AA8',
    waterSoft: '#E3F3F7',
    waterBorder: '#BFE2EB',
    waterText: '#1F6F87',
    success: '#3E8E5E',
    successSoft: '#E1F1E6',
    danger: '#C8463D',
    dangerSoft: '#FBE9E7',
    dangerBorder: '#F3C9C4',
    warning: '#B7791F',
    warningSoft: '#FBF1DC',
    star: '#D9A82A',
    panel: '#14191B',
    panelMuted: '#243034',
    panelText: '#FFFFFF',
    panelTextMuted: '#A7B3B6',
    overlay: 'rgba(15, 30, 35, 0.4)',
    toast: '#14191B',
    skeleton: '#E3E9E9',
  },
  dark: {
    ...shared,
    protein: '#B4A2E6',
    carbs: '#EAC55A',
    fat: '#86CCA0',
    background: '#0F1416',
    surface: '#182023',
    surfaceMuted: '#1C2528',
    surfaceSunken: '#243034',
    border: '#243034',
    borderStrong: '#33434A',
    text: '#ECF1F2',
    textSecondary: '#C9D3D5',
    textMuted: '#93A1A5',
    textSubtle: '#66757A',
    primary: '#86C9D8',
    primaryPressed: '#70B8C8',
    primarySoft: '#17323A',
    primarySofter: '#1E414B',
    onPrimary: '#0B2A33',
    accent: '#E9D45A',
    onAccent: '#14191B',
    tintMint: '#21352B',
    tintSky: '#1B3239',
    tintLilac: '#352638',
    tintLavender: '#29263F',
    tintButter: '#37331C',
    onTint: '#ECF1F2',
    water: '#73C0D6',
    waterStrong: '#4FA9C3',
    waterSoft: '#163039',
    waterBorder: '#24495A',
    waterText: '#9BD3E3',
    success: '#7ACB98',
    successSoft: '#183024',
    danger: '#F08A80',
    dangerSoft: '#3A1D1B',
    dangerBorder: '#5E2A26',
    warning: '#E6B562',
    warningSoft: '#33281A',
    star: '#EAC55A',
    panel: '#0A0E0F',
    panelMuted: '#243034',
    panelText: '#FFFFFF',
    panelTextMuted: '#93A1A5',
    overlay: 'rgba(0, 0, 0, 0.6)',
    toast: '#243034',
    skeleton: '#243034',
  },
};

export type TintName = 'mint' | 'sky' | 'lilac' | 'lavender' | 'butter';
export const tint = (colors: Palette, name: TintName) =>
  ({ mint: colors.tintMint, sky: colors.tintSky, lilac: colors.tintLilac, lavender: colors.tintLavender, butter: colors.tintButter })[name];

export type Palette = typeof palettes.light;

export const radius = { sm: 10, md: 14, lg: 20, xl: 24, xxl: 28, full: 999 };
export const space = (n: number) => n * 4;

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
  heading: 'Outfit_600SemiBold',
  headingSemibold: 'Outfit_600SemiBold',
  display: 'Outfit_500Medium',
  displayRegular: 'Outfit_400Regular',
};

/** Escala tipográfica (10 … 30 px). */
export const text = { xxs: 10, xs: 11, sm: 12, base: 14, md: 16, lg: 18, xl: 20, xxl: 24, xxxl: 30 };
