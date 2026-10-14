// Catálogo fictício de apps/módulos. O original carrega logos via API; aqui cada app
// é representado por um ícone MDI sobre uma cor de fundo.
export const APPS = {
  webhook: { title: 'Webhook', icon: 'mdi-link-variant', bg: '#BBFF73', fg: '#1A1C1B', trigger: true },
  scheduler: { title: 'Agendador', icon: 'mdi-clock-outline', bg: '#BBFF73', fg: '#1A1C1B', trigger: true },
  sheets: { title: 'Google Sheets', icon: 'mdi-google-spreadsheet', bg: '#ffffff', fg: '#0F9D58' },
  chatgpt: { title: 'ChatGPT', icon: 'mdi-creation', bg: '#ffffff', fg: '#10a37f' },
  whatsapp: { title: 'WhatsApp', icon: 'mdi-whatsapp', bg: '#ffffff', fg: '#25D366' },
  telegram: { title: 'Telegram Bot', icon: 'mdi-send', bg: '#ffffff', fg: '#229ED9' },
  calendar: { title: 'Google Calendar', icon: 'mdi-calendar-month', bg: '#ffffff', fg: '#4285F4' },
  trello: { title: 'Trello', icon: 'mdi-trello', bg: '#ffffff', fg: '#0079BF' },
  wordpress: { title: 'WordPress', icon: 'mdi-wordpress', bg: '#ffffff', fg: '#21759B' },
  facebook: { title: 'Facebook Ads', icon: 'mdi-facebook', bg: '#ffffff', fg: '#1877F2' },
  database: { title: 'Banco de dados', icon: 'mdi-database-outline', bg: '#ffffff', fg: '#3ECF8E' },
  requester: { title: 'Requester', icon: 'mdi-web', bg: '#e6f5f0', fg: '#036041', middleware: true },
  filter: { title: 'Filtro', icon: 'mdi-filter-outline', bg: '#E4A3FF', fg: '#3b1450', middleware: true },
  router: { title: 'Roteador', icon: 'mdi-call-split', bg: '#E4A3FF', fg: '#3b1450', middleware: true },
  code: { title: 'JavaScript', icon: 'mdi-language-javascript', bg: '#F7DF1E', fg: '#000000', middleware: true },
  delay: { title: 'Delay', icon: 'mdi-timer-sand', bg: '#E4A3FF', fg: '#3b1450', middleware: true },
  ai_agent: { title: 'Agente IA', icon: 'mdi-robot-happy-outline', bg: '#8f5cf7', fg: '#ffffff', middleware: true },
}

export function getApp(key) {
  return APPS[key] ?? { title: key, icon: 'mdi-puzzle-outline', bg: '#ffffff', fg: '#036041' }
}
