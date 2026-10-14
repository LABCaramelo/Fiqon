import { reactive, watch } from 'vue'
import { FLUXES_WITH_HISTORY, createSeed, exampleExecutions } from './seed'
import { APPS, getApp } from './apps'
import { useSession } from '@/composables/useSession'

// Backend fictício: tudo roda no navegador e é salvo no localStorage.
// Nenhuma chamada de rede é feita; troque estas funções por chamadas reais à sua API.

const DB_KEY = 'fiqon-demo-db'

function load() {
  const seed = createSeed()
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      // Bases salvas por versões anteriores da demo ganham as coleções novas do seed.
      const saved = JSON.parse(raw)
      for (const key of Object.keys(seed)) if (!(key in saved)) saved[key] = seed[key]
      // ...e o histórico de exemplo do dashboard nas integrações do seed.
      for (const flux of saved.fluxes ?? []) {
        if (FLUXES_WITH_HISTORY.includes(flux.id) && !flux.executions?.some((e) => e.origin)) {
          flux.executions = [...(flux.executions ?? []), ...exampleExecutions(flux)]
        }
      }
      return saved
    }
  } catch {
    // dados corrompidos ou storage indisponível: recomeça do seed
  }
  return seed
}

export const db = reactive(load())

watch(
  db,
  (value) => {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(value))
    } catch {
      // storage cheio ou bloqueado: segue só em memória
    }
  },
  { deep: true },
)

export function resetDemoData() {
  Object.assign(db, createSeed())
}

const delay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms))
const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`
const clone = (v) => JSON.parse(JSON.stringify(v))
const nowIso = () => new Date().toISOString()

function fail(message) {
  const error = new Error(message)
  error.userMessage = message
  return error
}

function findUser(email) {
  const user = db.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase())
  if (!user) throw fail('Usuário não encontrado')
  return user
}

// Formato equivalente ao "user-info" do original (sem a senha).
function publicUser(user) {
  return {
    fullname: user.fullname,
    username: user.fullname,
    email: user.email,
    phone: user.phone ?? '',
    profile_image_url: user.profile_image_url ?? null,
    // Contas criadas pelo Google não têm senha (o perfil oferece "Solicitar definição de senha").
    has_credentials: !!user.password,
    has_document: !!db.billingAddress?.document_number,
    // Conta nova passa pelo formulário de qualificação antes de usar a plataforma.
    qualified: user.qualified !== false,
    requires_payment_setup: !!user.requires_payment_setup,
  }
}

// ---- Autenticação ----

export async function loginAccount({ email, password }) {
  await delay(700)
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (!user || user.password !== password) throw fail('Credenciais inválidas')
  // Como no original: com MFA ativo o login devolve requires_mfa e um mfa_token para /mfa-challenge.
  const mfa = db.mfa[user.email]
  if (mfa?.enabled) {
    mfa.challenge = { token: `${rand(8)}${rand(8)}`, expires_at: Date.now() + 10 * 60 * 1000 }
    return { requires_mfa: true, mfa_token: mfa.challenge.token }
  }
  return publicUser(user)
}

function userForChallenge(token) {
  const email = Object.keys(db.mfa).find((key) => db.mfa[key]?.challenge?.token === token)
  const challenge = email && db.mfa[email].challenge
  if (!challenge || challenge.expires_at < Date.now()) throw fail('Token MFA inválido ou ausente')
  return findUser(email)
}

// Na demo qualquer código de 6 dígitos vale (não há app autenticador de verdade).
export async function loginWithMfaCode(code, token) {
  await delay(600)
  const user = userForChallenge(token)
  if (!/^\d{6}$/.test(String(code))) {
    const error = fail('Código inválido. Verifique e tente novamente')
    error.status = 401
    throw error
  }
  delete db.mfa[user.email].challenge
  return publicUser(user)
}

// Código de recuperação: precisa ser um dos gerados ao ativar o MFA e só pode ser usado uma vez.
export async function loginWithRecoveryCode(code, token) {
  await delay(600)
  const user = userForChallenge(token)
  const mfa = db.mfa[user.email]
  const index = mfa.recovery_codes?.indexOf(String(code).trim()) ?? -1
  if (index === -1) throw fail('Código de recuperação inválido')
  mfa.recovery_codes.splice(index, 1)
  delete mfa.challenge
  return publicUser(user)
}

export async function registerAccount({ fullname, email, password }) {
  await delay(800)
  if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) throw fail('O email já está registrado')
  return publicUser(createUser({ fullname, email, password }))
}

function createUser({ fullname, email, password = null }) {
  const user = { fullname, email, password, phone: '', profile_image_url: null, qualified: false }
  db.users.push(user)
  // Conta nova começa com uma organização própria, da qual é proprietária.
  db.organizations.push({
    id: uid('org'),
    name: `Organização de ${fullname.split(' ')[0]}`,
    image: null,
    members: [{ id: uid('usr'), name: fullname, email, role: '1', invite_accepted_at: nowIso() }],
  })
  return user
}

// ---- Login com Google (simulado) ----
// O original redireciona para o Google e volta em /auth-token-authenticated?token=...
// Aqui o "Google" é um diálogo local que emite um token de uso único para a mesma rota.

export async function googleSignIn({ fullname, email }) {
  await delay(600)
  let user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  // Sem Google de verdade não há como provar a identidade: contas com senha só entram com a senha.
  if (user?.password) throw fail('Este e-mail já possui senha. Entre com email e senha.')
  if (!user) user = createUser({ fullname, email })
  const token = `${rand(10)}${rand(10)}`
  db.authTokens[token] = { email: user.email, expires_at: Date.now() + 5 * 60 * 1000 }
  return { token, qualified: user.qualified !== false }
}

// Troca o token pelo usuário (mesmo formato do login, inclusive o desafio de MFA).
export async function consumeAuthToken(token) {
  await delay(400)
  const entry = db.authTokens[token]
  delete db.authTokens[token]
  if (!entry || entry.expires_at < Date.now()) throw fail('Link de acesso inválido ou expirado')
  const user = findUser(entry.email)
  const mfa = db.mfa[user.email]
  if (mfa?.enabled) {
    mfa.challenge = { token: `${rand(8)}${rand(8)}`, expires_at: Date.now() + 10 * 60 * 1000 }
    return { requires_mfa: true, mfa_token: mfa.challenge.token }
  }
  return publicUser(user)
}

// ---- Qualificação (onboarding) ----

export const QUALIFICATION_QUESTIONS = [
  { id_question: 1, tab_key: 'tel_number', question: 'Qual seu número de telefone?', options: [] },
  {
    id_question: 2,
    tab_key: 'job_title',
    question: 'Quais das opções abaixo melhor descreve sua posição?',
    options: [
      'Desenvolvimento / Engenharia',
      'Suporte / Operações',
      'Produto / Gestão de projetos',
      'Freelancer / Consultoria',
      'Vendas / Desenvolvimento de negócio',
      'Análise de dados',
      'Marketing / Growth',
      'Outro',
    ],
  },
  {
    id_question: 3,
    tab_key: 'lead_origin',
    question: 'Como você conheceu a FiqOn?',
    options: ['Facebook', 'Instagram', 'YouTube', 'LinkedIn', 'Indicação', 'Pesquisa online (Google, Bing, etc)', 'Outro'],
  },
  {
    id_question: 4,
    tab_key: 'integrations_experience',
    question: 'Como você descreveria sua experiência com integrações?',
    options: [
      'Eu não tenho nenhuma experiência com integrações',
      'Eu já utilizei outras plataformas de integração',
      'Eu já desenvolvi minhas próprias integrações sozinho(a)',
    ],
  },
  { id_question: 5, tab_key: 'apps_selection', question: 'Selecione os softwares que você deseja integrar ao nosso sistema', options: [] },
  { id_question: 6, tab_key: 'end', question: '', options: [] },
]

export async function savePhone(email, phone) {
  await delay(300)
  const user = findUser(email)
  user.phone = phone
  return publicUser(user)
}

// Guarda as respostas e devolve a integração inicial da conta (o original abre o primeiro fluxo).
export async function submitQualification(email, { questions, apps }) {
  await delay(700)
  const user = findUser(email)
  db.qualifications[user.email] = { questions, apps, answered_at: nowIso() }
  user.qualified = true
  const org = visibleOrganizations()[0]
  let flux = db.fluxes.find((f) => f.org_id === org?.id)
  if (!flux) {
    const stamp = nowIso()
    flux = {
      id: uid('flx'),
      org_id: org?.id ?? 'org-1',
      name: 'Minha primeira integração',
      active: false,
      average_execution: null,
      activations: 0,
      premium: false,
      first: true,
      created_at: stamp,
      updated_at: stamp,
      steps: [{ id: uid('s'), app: 'webhook', action: 'Gatilho' }],
      versions: [],
      executions: [],
    }
    db.fluxes.unshift(flux)
  }
  return { user: publicUser(user), fluxId: flux.id, orgId: flux.org_id }
}

export async function resetPasswordSendEmail({ email }) {
  await delay(600)
  if (!db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw fail('O email fornecido não possui cadastro')
  }
  // Sem servidor de email: o link de redefinição vai para o console.
  const link = `${location.origin}/reset-password?email=${encodeURIComponent(email)}&token=demo`
  console.info('[demo] Link de redefinição de senha:', link)
}

export async function resetPassword({ email, password }) {
  await delay(600)
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (!user) throw fail('Token expirado, solicite uma nova redefinição e tente novamente')
  user.password = password
}

// ---- Perfil ----

export async function updateProfile(email, { fullname, phone }) {
  await delay(500)
  const user = findUser(email)
  user.fullname = fullname
  user.phone = phone
  return publicUser(user)
}

export async function updateProfileImage(email, dataUrl) {
  await delay(500)
  const user = findUser(email)
  user.profile_image_url = dataUrl
  return publicUser(user)
}

export async function changePassword(email, { current, next }) {
  await delay(600)
  const user = findUser(email)
  if (user.password !== current) throw fail('A senha atual informada está incorreta.')
  user.password = next
}

// MFA simulado: qualquer código de 6 dígitos é aceito.
export async function getMfaStatus(email) {
  await delay(250)
  const mfa = db.mfa[email] ?? { enabled: false }
  return { two_factor_enabled: !!mfa.enabled, pending_confirmation: !!mfa.pending }
}

export async function enableMfa(email) {
  await delay(500)
  const codes = Array.from({ length: 8 }, () => `${rand(5)}-${rand(5)}`)
  db.mfa[email] = { enabled: false, pending: true, recovery_codes: codes }
  return { recovery_codes: codes }
}

export async function confirmMfa(email, code) {
  await delay(500)
  if (!/^\d{6}$/.test(code)) throw fail('Digite o código de 6 dígitos corretamente.')
  const mfa = db.mfa[email]
  if (!mfa) throw fail('Ative o MFA antes de confirmar.')
  mfa.enabled = true
  mfa.pending = false
  return { two_factor_enabled: true, recovery_codes: mfa.recovery_codes }
}

export async function disableMfa(email, code, method) {
  await delay(500)
  const mfa = db.mfa[email]
  const valid = method === 'recovery' ? mfa?.recovery_codes?.includes(code.trim()) : /^\d{6}$/.test(code)
  if (!valid) throw fail('Código inválido')
  delete db.mfa[email]
}

function rand(n) {
  return Math.random().toString(36).slice(2, 2 + n)
}

// ---- Integrações (fluxos) ----

function appsUsed(flux) {
  const keys = []
  for (const step of flux.steps ?? []) {
    if (APPS[step.app]?.trigger) continue
    if (!keys.includes(step.app)) keys.push(step.app)
  }
  return keys
}

// Integrações pertencem à organização selecionada (fluxos antigos da demo ficam na primeira).
const fluxOrg = (flux) => flux.org_id ?? 'org-1'
const selectedOrg = () => useSession().selectedOrgId.value

export function orgFluxes(orgId = selectedOrg()) {
  return db.fluxes.filter((f) => fluxOrg(f) === orgId)
}

export async function fetchFluxes({ searchTerm = '', orderBy = 'updated_at', reverse = true, page = 1, perPage = 10 }) {
  await delay(350)
  const term = searchTerm.trim().toLowerCase()
  const inOrg = orgFluxes()
  let list = inOrg.filter((f) => !term || f.name.toLowerCase().includes(term))
  list = list.slice().sort((a, b) => {
    const r = orderBy === 'name' ? a.name.localeCompare(b.name, 'pt-BR') : String(a[orderBy]).localeCompare(String(b[orderBy]))
    return reverse ? -r : r
  })
  const lastPage = Math.max(1, Math.ceil(list.length / perPage))
  return {
    data: clone(list.slice((page - 1) * perPage, page * perPage)).map((f) => ({ ...f, apps_used: appsUsed(f) })),
    meta: { total: inOrg.length, last_page: lastPage },
  }
}

export async function getFlux(id) {
  await delay(300)
  const flux = db.fluxes.find((f) => f.id === id)
  if (!flux) throw fail('Integração não encontrada')
  return clone(flux)
}

export async function createFlux({ name, steps }) {
  await delay(500)
  const stamp = nowIso()
  const flux = {
    id: uid('flx'),
    org_id: selectedOrg(),
    name,
    active: false,
    average_execution: null,
    activations: 0,
    premium: false,
    first: false,
    created_at: stamp,
    updated_at: stamp,
    steps: steps ?? [{ id: uid('s'), app: 'webhook', action: 'Gatilho' }],
    versions: [],
    executions: [],
  }
  db.fluxes.unshift(flux)
  return clone(flux)
}

export async function updateFlux(id, patch) {
  await delay(250)
  const flux = db.fluxes.find((f) => f.id === id)
  if (!flux) throw fail('Integração não encontrada')
  Object.assign(flux, clone(patch), { updated_at: nowIso() })
  return clone(flux)
}

export async function toggleFluxStatus(id, active) {
  await delay(300)
  if (active && blockReason()) throw fail(blockReason())
  const flux = db.fluxes.find((f) => f.id === id)
  if (!flux) throw fail('Integração não encontrada')
  flux.active = active
  return clone(flux)
}

export async function duplicateFlux(id) {
  await delay(500)
  const source = db.fluxes.find((f) => f.id === id)
  if (!source) throw fail('Integração não encontrada')
  const stamp = nowIso()
  const copy = {
    ...clone(source),
    id: uid('flx'),
    name: `${source.name} (Cópia)`,
    active: false,
    first: false,
    created_at: stamp,
    updated_at: stamp,
    versions: [],
    executions: [],
  }
  db.fluxes.unshift(copy)
  return clone(copy)
}

export async function deleteFlux(id) {
  await delay(500)
  const index = db.fluxes.findIndex((f) => f.id === id)
  if (index !== -1) db.fluxes.splice(index, 1)
}

// Versões: cada "Salvar integração" guarda um snapshot dos passos.
export async function saveFluxVersion(id) {
  await delay(400)
  const flux = db.fluxes.find((f) => f.id === id)
  if (!flux) throw fail('Integração não encontrada')
  flux.versions ??= []
  flux.versions.forEach((v) => (v.active = false))
  flux.versions.unshift({
    id: uid('ver'),
    name: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
    active: true,
    steps: clone(flux.steps),
  })
  flux.updated_at = nowIso()
  return clone(flux)
}

export async function restoreFluxVersion(id, versionId) {
  await delay(400)
  const flux = db.fluxes.find((f) => f.id === id)
  const version = flux?.versions?.find((v) => v.id === versionId)
  if (!version) throw fail('Versão não encontrada')
  flux.steps = clone(version.steps)
  flux.versions.forEach((v) => (v.active = v.id === versionId))
  flux.updated_at = nowIso()
  return clone(flux)
}

export async function renameFluxVersion(id, versionId, name) {
  await delay(300)
  const version = db.fluxes.find((f) => f.id === id)?.versions?.find((v) => v.id === versionId)
  if (version) version.name = name
}

export async function deleteFluxVersion(id, versionId) {
  await delay(300)
  const flux = db.fluxes.find((f) => f.id === id)
  if (flux?.versions) flux.versions = flux.versions.filter((v) => v.id !== versionId)
}

// Execução simulada: registra um log com a duração e uma saída de exemplo de cada passo.
function recordExecution(flux, origin, input) {
  const steps = flux.steps.map((s, i) => {
    let output = { ok: true, modulo: getApp(s.app).title }
    if (i === 0 && input) {
      output = input
    } else if (s.app === 'webhook') {
      output = {
        received_at: nowIso(),
        lead_name: 'Lucas Silva',
        lead_email: 'lucas@exemplo.com',
        telefone: '+5511987654321',
        valor: 1500,
        origem: 'Landing Page Campanha V1'
      }
    } else if (s.app === 'scheduler') {
      output = { triggered_at: nowIso(), schedule: s.config?.interval || '09:00', timezone: 'America/Sao_Paulo' }
    } else if (s.app === 'chatgpt' || s.app === 'ai_agent') {
      output = {
        model: s.config?.model || 'gpt-4o',
        response: 'Olá Lucas! Seu cadastro foi recebido com sucesso. Nossa equipe já está processando sua solicitação.',
        tokens_used: 128
      }
    } else if (s.app === 'whatsapp') {
      output = {
        message_id: `wamid.${Math.random().toString(36).slice(2, 10)}`,
        recipient: s.config?.phone || '+5511987654321',
        status: 'delivered'
      }
    } else if (s.app === 'sheets') {
      output = { spreadsheet: s.config?.sheet || 'Planilha de Leads', row_id: Math.floor(Math.random() * 50) + 2, status: 'row_appended' }
    } else if (s.app === 'filter') {
      output = { matched: true, field: s.config?.field || 'valor', operator: s.config?.operator || 'gte', value: s.config?.value ?? 1000 }
    } else if (s.app === 'requester') {
      output = { status_code: 200, url: s.config?.url || 'https://api.exemplo.com/webhook', response: { success: true } }
    } else if (s.app === 'delay') {
      output = { delayed_ms: (s.config?.amount || 5) * 1000, status: 'completed' }
    }
    return {
      id: s.id,
      app: s.app,
      action: s.action,
      ms: 40 + Math.round(Math.random() * 350),
      status: 'success',
      output,
    }
  })
  const total = steps.reduce((sum, s) => sum + s.ms, 0)
  const operations = steps.filter((s) => !getApp(s.app).trigger && !getApp(s.app).middleware).length
  const execution = { id: uid('exe'), started_at: nowIso(), duration_ms: total, status: 'success', origin, operations, steps }
  flux.executions ??= []
  flux.executions.unshift(execution)
  flux.executions = flux.executions.slice(0, 200)
  flux.activations += operations
  flux.average_execution = Math.round(total / 10)
  if (db.subscription) db.subscription.quantity_used += operations
  return execution
}

export async function runFlux(id) {
  const flux = db.fluxes.find((f) => f.id === id)
  if (!flux) throw fail('Integração não encontrada')
  const execution = recordExecution(flux, 'Terminal de testes')
  return { steps: execution.steps, total: execution.duration_ms }
}

// "Executar novamente" do dashboard: reaproveita a entrada do gatilho da execução original.
export async function replayExecution(fluxId, executionId) {
  await delay(1200)
  const flux = db.fluxes.find((f) => f.id === fluxId)
  const original = flux?.executions?.find((e) => e.id === executionId)
  if (!original) throw fail('Execução não encontrada')
  return clone(recordExecution(flux, 'Replay', original.steps[0]?.output))
}

// ---- Construtor com IA (simulado por palavras-chave) ----

const AI_KEYWORDS = [
  [/whats|zap|mensagem/i, 'whatsapp', 'Enviar mensagem'],
  [/planilha|sheets|excel/i, 'sheets', 'Adicionar linha'],
  [/gpt|ia\b|intelig|resum|respond/i, 'chatgpt', 'Gerar resposta'],
  [/agenda|calend|reuni/i, 'calendar', 'Criar evento'],
  [/telegram/i, 'telegram', 'Enviar mensagem'],
  [/trello|tarefa|card/i, 'trello', 'Criar card'],
  [/wordpress|blog|post/i, 'wordpress', 'Publicar post'],
  [/anúncio|anuncio|facebook|meta ads/i, 'facebook', 'Buscar lead'],
  [/banco|registro|crm|cadastr/i, 'database', 'Criar registro'],
]

export async function buildFluxFromPrompt(prompt) {
  await delay(300)
  const trigger = /todo dia|diari|hora|agend|semana/i.test(prompt)
    ? { app: 'scheduler', action: 'Executar periodicamente' }
    : { app: 'webhook', action: 'Gatilho' }
  const steps = [{ id: uid('s'), ...trigger }]
  if (/se |quando|filtr|apenas|somente/i.test(prompt)) steps.push({ id: uid('s'), app: 'filter', action: 'Filtrar dados' })
  for (const [re, app, action] of AI_KEYWORDS) if (re.test(prompt)) steps.push({ id: uid('s'), app, action })
  if (steps.length === 1) steps.push({ id: uid('s'), app: 'requester', action: 'Requisição HTTP' })
  // Nome com até 40 caracteres, cortado em palavra inteira.
  const words = prompt.trim().replace(/\s+/g, ' ').split(' ')
  let name = ''
  for (const word of words) {
    if (`${name} ${word}`.trim().length > 40) break
    name = `${name} ${word}`.trim()
  }
  name = (name || words[0].slice(0, 40)).replace(/[,.;:!?-]+$/, '')
  return { name: name.charAt(0).toUpperCase() + name.slice(1), steps }
}

// ---- Conexões ----

export async function fetchConnections(appFilter = null) {
  await delay(300)
  db.connections ??= []
  let list = db.connections
  if (appFilter) list = list.filter((c) => c.app === appFilter)
  return clone(list).map((c) => ({ ...c, app_name: getApp(c.app).title }))
}

export async function createConnection({ name, app, connection_config = 'API Key', credentials = {} }) {
  await delay(500)
  db.connections ??= []
  const newConn = {
    id: uid('cn'),
    name: name.trim(),
    app,
    connection_config,
    credentials: clone(credentials),
    verified: true,
    created_at: nowIso(),
  }
  db.connections.unshift(newConn)
  return clone({ ...newConn, app_name: getApp(newConn.app).title })
}

// Apps com a quantidade de conexões (cartão "Conexões" da Home).
export async function fetchUserApps() {
  await delay(400)
  const byApp = new Map()
  for (const c of db.connections) {
    const entry = byApp.get(c.app) ?? { app_id: c.app, app_name: getApp(c.app).title, total_connections: 0 }
    entry.total_connections += 1
    byApp.set(c.app, entry)
  }
  return [...byApp.values()]
}

export async function verifyConnection(id) {
  await delay(700)
  const conn = db.connections.find((c) => c.id === id)
  return { connection_activated: !!conn?.verified }
}

export async function reauthorizeConnection(id) {
  await delay(700)
  const conn = db.connections.find((c) => c.id === id)
  if (conn) conn.verified = true
}

export async function renameConnection(id, name) {
  await delay(400)
  const conn = db.connections.find((c) => c.id === id)
  if (conn) conn.name = name
}

export async function deleteConnection(id) {
  await delay(500)
  const index = db.connections.findIndex((c) => c.id === id)
  if (index !== -1) db.connections.splice(index, 1)
}

// ---- Templates ----

export async function listTemplates() {
  await delay(500)
  return clone(db.templates)
}

export async function unlockTemplate(id) {
  await delay(500)
  const template = db.templates.find((t) => t.id === id)
  if (template) template.status = 'unlocked'
}

export async function updateTemplate(id, { name, description, price }) {
  await delay(500)
  const template = db.templates.find((t) => t.id === id)
  if (!template) throw fail('Template não encontrado')
  Object.assign(template, { name, description, price })
  return clone(template)
}

export async function deleteTemplate(id) {
  await delay(500)
  const index = db.templates.findIndex((t) => t.id === id)
  if (index !== -1) db.templates.splice(index, 1)
}

// Mesmo comportamento do original: baixa o fluxo do template como arquivo .fiqon (JSON).
export async function downloadTemplate(id) {
  await delay(300)
  const template = db.templates.find((t) => t.id === id)
  if (!template) throw fail('Template não encontrado')
  const content = {
    name: template.name,
    description: template.description,
    steps: template.apps.map((app, i) => ({ id: `s${i + 1}`, app, action: getApp(app).title })),
  }
  const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${template.id}.fiqon`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}

// ---- Assinatura / plano ----

export const PLUS_PLAN = { key: 'plus', title: 'Plus', price: 'R$ 29,90', installments: 12, operations: 1e6, tier: 9 }

function blockReason() {
  const sub = db.subscription
  if (!sub || Number(sub.tier) === 0) return 'O plano gratuito não possui operações disponíveis.'
  return null
}

export async function getSubscription() {
  await delay(300)
  return clone(db.subscription)
}

export async function subscribe(plan = PLUS_PLAN) {
  await delay(700)
  const period = Math.floor(Date.now() / 1000) + 30 * 86400
  db.subscription = {
    plan_name: plan.title,
    tier: plan.tier,
    tier_name: plan.key,
    product: { name: plan.title, tier: plan.tier },
    quantity_plan: plan.operations,
    quantity_used: 0,
    is_unlimited_plan: 1,
    plan_current_period_end: period,
  }
  db.invoices.unshift({ id: uid('inv'), paid_at: nowIso(), amount: '29,90' })
  const me = db.users.find((u) => u.email === sessionUser()?.email)
  if (me) me.requires_payment_setup = false
  return clone(db.subscription)
}

export async function cancelSubscription() {
  await delay(500)
  db.subscription = null
}

// O original só registra a solicitação (o suporte entra em contato).
export async function requestCancellation({ email, reason }) {
  await delay(600)
  db.cancellationRequests.push({ email, reason, created_at: nowIso() })
}

export async function listInvoices(page = 1, perPage = 10) {
  await delay(300)
  const lastPage = Math.max(1, Math.ceil(db.invoices.length / perPage))
  return { data: clone(db.invoices.slice((page - 1) * perPage, page * perPage)), pagination: { last_page: lastPage } }
}

export async function getBillingAddress() {
  await delay(400)
  return clone(db.billingAddress)
}

export async function saveBillingAddress(address) {
  await delay(500)
  db.billingAddress = clone(address)
  return clone(db.billingAddress)
}

// Cartões: a demo guarda só bandeira, final e validade (nunca o número completo nem o CVV).
export async function listPaymentMethods() {
  await delay(300)
  return clone(db.paymentMethods)
}

export async function addPaymentMethod({ number, expiry, brand }) {
  await delay(600)
  const card = {
    id: uid('card'),
    card_brand: brand,
    last_four: number.slice(-4),
    expiration_date: expiry,
    is_default: db.paymentMethods.length === 0,
  }
  db.paymentMethods.push(card)
  return clone(card)
}

export async function setDefaultPaymentMethod(id) {
  await delay(300)
  db.paymentMethods.forEach((c) => (c.is_default = c.id === id))
}

export async function deletePaymentMethod(id) {
  await delay(300)
  db.paymentMethods = db.paymentMethods.filter((c) => c.id !== id)
  if (db.paymentMethods.length && !db.paymentMethods.some((c) => c.is_default)) db.paymentMethods[0].is_default = true
}

// ---- Organizações ----

// Mesmos códigos de papel do original: 1 = Proprietário, 2 = Administrador, 3 = Desenvolvedor.
export const ORG_ROLES = { OWNER: '1', ADMIN: '2', DEVELOPER: '3' }

function sessionUser() {
  return useSession().user.value
}

// Bases salvas antes da tela de organização não têm membros: o usuário atual vira proprietário.
function ensureMembers(org) {
  if (Array.isArray(org.members)) return org.members
  const me = sessionUser()
  if (!me) return []
  org.members = [{ id: uid('usr'), name: me.fullname, email: me.email, role: ORG_ROLES.OWNER, invite_accepted_at: nowIso() }]
  return org.members
}

function findOrg(id) {
  const org = db.organizations.find((o) => o.id === id)
  if (!org) throw fail('Organização não encontrada')
  ensureMembers(org)
  return org
}

// Membro com convite ainda não aceito não tem acesso à organização.
const isAcceptedMember = (member, email) => member.email.toLowerCase() === email && !!member.invite_accepted_at

// Papel do usuário logado na organização ('1', '2', '3' ou null).
export function currentUserRole(orgId) {
  const org = db.organizations.find((o) => o.id === orgId)
  const email = sessionUser()?.email?.toLowerCase()
  if (!org || !email) return null
  return ensureMembers(org).find((m) => isAcceptedMember(m, email))?.role ?? null
}

// Organizações das quais o usuário logado faz parte (reativo: pode ser usado em computed).
export function visibleOrganizations() {
  const email = sessionUser()?.email?.toLowerCase()
  if (!email) return []
  return db.organizations.filter((o) => ensureMembers(o).some((m) => isAcceptedMember(m, email)))
}

export const isOrgOwner = (orgId) => currentUserRole(orgId) === ORG_ROLES.OWNER
export const isOrgAdmin = (orgId) => [ORG_ROLES.OWNER, ORG_ROLES.ADMIN].includes(currentUserRole(orgId))

export async function fetchOrganizations() {
  await delay(300)
  db.organizations.forEach(ensureMembers)
  return clone(db.organizations)
}

export async function createOrganization(name) {
  await delay(400)
  const org = { id: uid('org'), name, image: null, members: null }
  ensureMembers(org)
  db.organizations.push(org)
  return clone(org)
}

export async function updateOrganization({ id, name, image }) {
  await delay(400)
  const org = findOrg(id)
  if (name) org.name = name
  if (image) org.image = image
  return clone(org)
}

// Excluir a organização remove junto as integrações dela (como avisa o modal do original).
export async function deleteOrganization(id) {
  await delay(500)
  if (!isOrgOwner(id)) throw fail('Apenas o proprietário pode excluir a organização.')
  db.organizations = db.organizations.filter((o) => o.id !== id)
  db.fluxes = db.fluxes.filter((f) => fluxOrg(f) !== id)
}

export async function countOrgFluxes(orgId) {
  await delay(250)
  return db.fluxes.filter((f) => fluxOrg(f) === orgId).length
}

export async function listOrgMembers(orgId, { search = '', page = 1, perPage = 10 } = {}) {
  await delay(350)
  const term = search?.trim().toLowerCase() ?? ''
  const all = findOrg(orgId).members.filter(
    (m) => !term || m.name.toLowerCase().includes(term) || m.email.toLowerCase().includes(term),
  )
  const lastPage = Math.max(1, Math.ceil(all.length / perPage))
  return {
    data: clone(all.slice((page - 1) * perPage, page * perPage)),
    meta: { current_page: page, last_page: lastPage, total: all.length },
  }
}

// O original envia por e-mail o link /project/:id/accept-invite?token=...; sem servidor de
// e-mail, a demo devolve o link para ser copiado. O membro fica pendente até aceitar.
export async function inviteOrgUser(orgId, { email, role }) {
  await delay(500)
  const org = findOrg(orgId)
  if (!isOrgAdmin(orgId)) throw fail('Você não tem permissão para convidar usuários.')
  const normalized = email.trim().toLowerCase()
  if (org.members.some((m) => m.email.toLowerCase() === normalized)) throw fail('Este usuário já faz parte da organização.')
  const token = `${rand(10)}${rand(10)}`
  const member = { id: uid('usr'), name: normalized.split('@')[0], email: normalized, role, invite_accepted_at: null, invite_token: token }
  org.members.push(member)
  return { ...clone(member), invite_link: `${location.origin}/project/${org.id}/accept-invite?token=${token}` }
}

// Aceite do convite pelo usuário logado (o e-mail precisa ser o convidado).
export async function acceptInvite(token) {
  await delay(500)
  const email = sessionUser()?.email?.toLowerCase()
  for (const org of db.organizations) {
    const member = ensureMembers(org).find((m) => m.invite_token && m.invite_token === token)
    if (!member) continue
    if (member.email.toLowerCase() !== email) break
    const me = db.users.find((u) => u.email.toLowerCase() === email)
    member.invite_accepted_at = nowIso()
    member.name = me?.fullname ?? member.name
    delete member.invite_token
    return clone(org)
  }
  throw fail('Convite inválido ou expirado.')
}

export async function updateOrgUserRole(orgId, userId, role) {
  await delay(350)
  const org = findOrg(orgId)
  if (!isOrgAdmin(orgId)) throw fail('Você não tem permissão para alterar papéis.')
  if (role === ORG_ROLES.OWNER && !isOrgOwner(orgId)) throw fail('Apenas o proprietário pode transferir a propriedade.')
  const member = org.members.find((m) => m.id === userId)
  if (!member) throw fail('Usuário não encontrado')
  member.role = role
}

export async function removeOrgUsers(orgId, userIds) {
  await delay(400)
  const org = findOrg(orgId)
  if (!isOrgAdmin(orgId)) throw fail('Você não tem permissão para remover usuários.')
  org.members = org.members.filter((m) => !userIds.includes(m.id) || m.role === ORG_ROLES.OWNER)
}

// ---- Parceiro (/partner) ----
// O programa de parcerias foi encerrado no original: o painel só mostra saldo, saques e indicações.

export function partnerData() {
  const email = sessionUser()?.email
  return email ? (db.partners?.[email] ?? null) : null
}

export async function fetchPartnerInfo() {
  await delay(400)
  const data = partnerData()
  if (!data) throw fail('Usuário não é parceiro')
  const { events, withdrawals, ...info } = data
  return clone(info)
}

export async function fetchPartnerEarnings(page = 1, perPage = 10) {
  await delay(300)
  const events = partnerData()?.events ?? []
  return {
    data: clone(events.slice((page - 1) * perPage, page * perPage)),
    meta: { current_page: page, last_page: Math.max(1, Math.ceil(events.length / perPage)) },
  }
}

export async function requestPartnerWithdraw(amount, { pix, document }) {
  await delay(700)
  const data = partnerData()
  if (!data) throw fail('Usuário não é parceiro')
  const available = Number(data.available_balance)
  if (amount < 100 || amount > available) throw fail('Valor de saque inválido')
  data.pix = pix
  data.document = document
  data.available_balance = (available - amount).toFixed(2)
  data.won_balance = (Number(data.won_balance) + amount).toFixed(2)
  data.withdrawals.push({ amount, requested_at: nowIso() })
  return clone({ available_balance: data.available_balance, won_balance: data.won_balance })
}
