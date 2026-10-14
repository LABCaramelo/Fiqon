import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { customIconSet } from '@/components/icons'

// Paletas copiadas do tema Vuetify do app original (light = V4, dark = B4 no bundle).
const light = {
  dark: false,
  colors: {
    primary: '#036041',
    'on-primary': '#ffffff',
    secondary: '#CE3B6A',
    'on-secondary': '#ffffff',
    secondarybtn: '#D8E3E2',
    'on-secondarybtn': '#000000',
    progressbar: '#4FAE88',
    'on-progressbar': '#000000',
    success: '#28C76F',
    'on-success': '#000000',
    info: '#009BAE',
    'on-info': '#ffffff',
    warning: '#EB7433',
    'on-warning': '#ffffff',
    error: '#EA5455',
    'on-error': '#ffffff',
    purple: '#9836bf',
    'on-purple': '#ffffff',
    pink: '#B52C69',
    'on-pink': '#ffffff',
    orange: '#CA3716',
    'on-orange': '#ffffff',
    blue: '#38686B',
    'on-blue': '#ffffff',
    yellow: '#665F00',
    'on-yellow': '#ffffff',
    indigo: '#7367F0',
    'on-indigo': '#ffffff',
    'if-color': '#E4A3FF',
    teal: '#009688',
    'on-teal': '#ffffff',
    amber: '#FFC107',
    'on-amber': '#000000',
    muted: '#7f7b8b',
    gray: '#a5a2ad',
    'on-gray': '#ffffff',
    background: '#F8F7FA',
    'on-background': '#19181c',
    fluxBackground: '#F8F7FA',
    'on-fluxBackground': '#19181c',
    surface: '#FFFFFF',
    'on-surface': '#19181c',
    'black-white': '#171917',
    faded: '#c3c1c8',
    'background-pattern-color': '#129A4A',
    'card-outline': '#dedee0',
  },
  variables: {
    'border-color': '#4B465C',
    'medium-emphasis-opacity': 0.68,
    'shadow-key-umbra-opacity': 'rgba(var(--v-theme-on-surface), 0.03)',
    'shadow-key-penumbra-opacity': 'rgba(0, 0, 0, 0.2)',
    'shadow-key-ambient-opacity': 'rgba(var(--v-theme-on-surface), 0.3)',
  },
}

const dark = {
  dark: true,
  colors: {
    primary: '#BBFF73',
    'on-primary': '#000000',
    secondary: '#F4487F',
    'on-secondary': '#000000',
    secondarybtn: '#132C1D',
    'on-secondarybtn': '#000000',
    progressbar: '#4FAE88',
    'on-progressbar': '#000000',
    success: '#28C76F',
    'on-success': '#ffffff',
    info: '#00CFE8',
    'on-info': '#000000',
    warning: '#FF9F43',
    'on-warning': '#000000',
    error: '#EA5455',
    'on-error': '#ffffff',
    purple: '#f1cfff',
    'on-purple': '#000000',
    pink: '#db6b9e',
    'on-pink': '#000000',
    orange: '#f1937e',
    'on-orange': '#000000',
    blue: '#8cc0c3',
    'on-blue': '#000000',
    yellow: '#fff678',
    'on-yellow': '#000000',
    indigo: '#a099ee',
    'on-indigo': '#000000',
    'if-color': '#E4A3FF',
    teal: '#009688',
    'on-teal': '#000000',
    amber: '#FFC107',
    'on-amber': '#000000',
    muted: '#7B918D',
    gray: '#bacca2',
    'on-gray': '#000000',
    background: '#1D201F',
    'on-background': '#CBEFE9',
    fluxBackground: '#070f0c',
    'on-fluxBackground': '#070f0c',
    surface: '#1A1C1B',
    'on-surface': '#CBEFE9',
    'black-white': '#FFFFFF',
    faded: '#0E3022',
    'background-pattern-color': '#129A4A',
    'card-outline': '#2929290e',
  },
  variables: {
    'border-color': '#CFD3EC',
    'medium-emphasis-opacity': 0.68,
    'shadow-key-umbra-opacity': 'rgba(12, 16, 27, 0.15)',
    'shadow-key-penumbra-opacity': 'rgba(0, 0, 0, 0.2)',
    'shadow-key-ambient-opacity': 'rgba(0,0,0,0.9)',
  },
}

export const THEME_STORAGE_KEY = 'v-theme'

// Mesma regra do original: tema salvo no localStorage, senão segue o sistema.
function initialTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // localStorage indisponível (modo privado, etc.)
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default createVuetify({
  theme: {
    defaultTheme: initialTheme(),
    themes: { light, dark },
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi, custom: customIconSet },
  },
  defaults: {
    VTextField: { density: 'comfortable', variant: 'outlined', hideDetails: true, rounded: 'lg' },
    VTextarea: { noResize: true, variant: 'outlined', hideDetails: true, rounded: 'lg' },
    VSelect: { density: 'comfortable', variant: 'outlined', hideDetails: true, rounded: 'lg' },
    VForm: {
      VTextField: { hideDetails: false },
      VTextarea: { hideDetails: false },
      VSelect: { hideDetails: false },
    },
    VBtn: { flat: true },
    VCard: { rounded: 'lg', flat: true },
    VDivider: { color: 'card-outline', thickness: 1, opacity: 1 },
  },
})
