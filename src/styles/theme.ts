export const theme = {
  colors: {
    // Backgrounds
    bg: '#12110f',
    bgPanel: 'rgba(22, 20, 18, 0.94)',
    bgPanelLight: 'rgba(35, 32, 28, 0.95)',
    bgPanelDark: 'rgba(14, 13, 11, 0.95)',
    bgHover: 'rgba(201, 168, 76, 0.12)',
    bgActive: 'rgba(201, 168, 76, 0.18)',
    bgOverlay: 'rgba(8, 12, 17, 0.55)',
    bgInput: 'rgba(24, 22, 18, 0.9)',
    bgTab: 'rgba(28, 26, 22, 0.8)',
    bgTabActive: 'rgba(180, 145, 60, 0.35)',
    bgCard: 'rgba(26, 24, 20, 0.8)',
    bgTooltip: 'rgba(16, 15, 12, 0.97)',

    // Primary gold
    gold: '#c9a84c',
    goldLight: '#e0c872',
    goldDark: '#8a7235',
    goldMuted: 'rgba(201, 168, 76, 0.4)',

    // Text
    text: '#d4cfc0',
    textBright: '#f0ece0',
    textMuted: '#8a8578',
    textDark: '#8a8376',
    textHeader: '#e8d9a0',

    // Accents
    red: '#c44040',
    redLight: '#e05555',
    green: '#5ca040',
    greenLight: '#78c058',
    blue: '#4080c4',
    blueLight: '#5898d8',
    yellow: '#c4a840',
    orange: '#c47840',
    purple: '#8060a0',

    // UI elements
    border: 'rgba(201, 168, 76, 0.25)',
    borderLight: 'rgba(201, 168, 76, 0.4)',
    borderDim: 'rgba(100, 95, 80, 0.2)',
    separator: 'rgba(201, 168, 76, 0.15)',

    // Status
    positive: '#5ca040',
    negative: '#c44040',
    neutral: '#8a8578',
    warning: '#c4a840',

    // Faction colours (for map / flags)
    factionRed: '#8b2020',
    factionBlue: '#204878',
    factionGreen: '#2a6830',
    factionPurple: '#5a2878',
    factionYellow: '#887020',
    factionOrange: '#8a5020',
    factionTeal: '#206868',
    factionPink: '#883860',
  },

  fonts: {
    header: "'Volkhov', 'Times New Roman', serif",
    body: "'Lato', 'Segoe UI', sans-serif",
  },

  sizes: {
    sidebarWidth: '30.9091rem',
    topBarHeight: '4.3636rem',
    bottomBarHeight: '4.7273rem',
    portraitSm: '3.2727rem',
    portraitMd: '5.0909rem',
    portraitLg: '7.2727rem',
    portraitXl: '9.0909rem',
    borderRadius: '0.2727rem',
  },

  shadows: {
    panel: '0 0.385rem 1.385rem rgba(8, 12, 17, 0.62), 0 0.077rem 0.385rem rgba(8, 12, 17, 0.4)',
    panelLeft: '0.308rem 0 1.231rem rgba(8, 12, 17, 0.55)',
    panelRight: '-0.308rem 0 1.231rem rgba(8, 12, 17, 0.55)',
    glow: '0 0 0.615rem rgba(201, 168, 76, 0.15)',
    inset: 'inset 0 0.1818rem 0.5455rem rgba(8, 12, 17, 0.4)',
    text: '0 0.0909rem 0.2727rem rgba(8, 12, 17, 0.8)',
  },

} as const;

export type Theme = typeof theme;
