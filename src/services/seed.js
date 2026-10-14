// Dados iniciais do backend fictício (salvos no localStorage do navegador).
// Usuário de demonstração para entrar sem criar conta:
//   email: demo@fiqon.test
//   senha: FiqOn@Demo2026

export const EMPTY_ADDRESS = {
  document_type: '',
  document_number: '',
  company_name: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
}

const now = Date.now()
const days = (n) => new Date(now - n * 86400000).toISOString()

export function createSeed() {
  const seed = {
    users: [{ fullname: 'Usuário Demo', email: 'demo@fiqon.test', password: 'FiqOn@Demo2026', phone: '', profile_image_url: null }],
    mfa: {},
    invoices: [],
    billingAddress: { ...EMPTY_ADDRESS },
    paymentMethods: [],
    cancellationRequests: [],
    // Papéis como no original: '1' Proprietário, '2' Administrador, '3' Desenvolvedor.
    organizations: [
      {
        id: 'org-1',
        name: 'Minha Organização',
        image: null,
        members: [
          { id: 'usr-demo', name: 'Usuário Demo', email: 'demo@fiqon.test', role: '1', invite_accepted_at: days(120) },
          { id: 'usr-ana', name: 'Ana Souza', email: 'ana@exemplo.test', role: '2', invite_accepted_at: days(60) },
          { id: 'usr-bruno', name: 'Bruno Lima', email: 'bruno@exemplo.test', role: '3', invite_accepted_at: days(21) },
        ],
      },
      {
        id: 'org-2',
        name: 'Agência Exemplo',
        image: null,
        members: [
          { id: 'usr-carla', name: 'Carla Mendes', email: 'carla@agencia.test', role: '1', invite_accepted_at: days(200) },
          { id: 'usr-demo', name: 'Usuário Demo', email: 'demo@fiqon.test', role: '2', invite_accepted_at: days(90) },
        ],
      },
      {
        id: 'org-3',
        name: 'Cliente Parceiro',
        image: null,
        members: [
          { id: 'usr-diego', name: 'Diego Rocha', email: 'diego@cliente.test', role: '1', invite_accepted_at: days(30) },
          { id: 'usr-demo', name: 'Usuário Demo', email: 'demo@fiqon.test', role: '3', invite_accepted_at: days(10) },
        ],
      },
    ],
    subscription: null,
    qualifications: {},
    authTokens: {},
    // Painel de parceiro (programa encerrado no original; só quem tem saldo acessa /partner).
    partners: {
      'demo@fiqon.test': {
        available_balance: '320.00',
        won_balance: '180.00',
        pix: '',
        document: '',
        withdrawals: [],
        events: partnerEvents(),
      },
    },
    fluxes: [
      {
        id: 'flx-1',
        name: 'Leads do site → Planilha',
        active: false,
        average_execution: 12,
        activations: 0,
        premium: false,
        first: false,
        created_at: days(40),
        updated_at: days(2),
        steps: [
          { id: 's1', app: 'webhook', action: 'Gatilho' },
          { id: 's2', app: 'filter', action: 'Filtrar leads válidos' },
          { id: 's3', app: 'sheets', action: 'Adicionar linha' },
        ],
      },
      {
        id: 'flx-2',
        name: 'Atendente IA no WhatsApp',
        active: false,
        average_execution: 140,
        activations: 0,
        premium: true,
        first: false,
        created_at: days(30),
        updated_at: days(5),
        steps: [
          { id: 's1', app: 'webhook', action: 'Gatilho' },
          { id: 's2', app: 'ai_agent', action: 'Agente IA' },
          { id: 's3', app: 'whatsapp', action: 'Enviar texto simples' },
          { id: 's4', app: 'database', action: 'Criar ou atualizar registro' },
          { id: 's5', app: 'chatgpt', action: 'Gerar resposta' },
          { id: 's6', app: 'sheets', action: 'Registrar conversa' },
          { id: 's7', app: 'telegram', action: 'Notificar equipe' },
        ],
      },
      {
        id: 'flx-3',
        name: 'Lembretes de agenda',
        active: false,
        average_execution: 900,
        activations: 0,
        premium: false,
        first: false,
        created_at: days(20),
        updated_at: days(9),
        steps: [
          { id: 's1', app: 'scheduler', action: 'Todos os dias às 08:00' },
          { id: 's2', app: 'calendar', action: 'Listar eventos' },
          { id: 's3', app: 'whatsapp', action: 'Enviar lembrete' },
        ],
      },
      {
        id: 'flx-4',
        name: 'Nova integração',
        active: false,
        average_execution: null,
        activations: 0,
        premium: false,
        first: true,
        created_at: days(60),
        updated_at: days(60),
        steps: [],
      },
    ],
    connections: [
      { id: 'cn-1', name: 'Planilha comercial', app: 'sheets', connection_config: 'OAuth2', verified: true },
      { id: 'cn-2', name: 'Chave OpenAI', app: 'chatgpt', connection_config: 'API Key', verified: true },
      { id: 'cn-3', name: 'Número principal', app: 'whatsapp', connection_config: 'Token', verified: false },
      { id: 'cn-4', name: 'Bot de alertas', app: 'telegram', connection_config: 'Bot Token', verified: true },
      { id: 'cn-5', name: 'Agenda da equipe', app: 'calendar', connection_config: 'OAuth2', verified: true },
      { id: 'cn-6', name: 'Supabase produção', app: 'database', connection_config: 'API Key', verified: true },
    ],
    templates: [
      tpl('t1', 'Atendente para clínica', 'Assistente de atendimento que transfere para humano e agenda horários no mesmo fluxo.', 590, ['chatgpt', 'whatsapp', 'sheets', 'database', 'filter', 'code']),
      tpl('t2', '🔁 Gatilhos dentro do WhatsApp', 'Funciona como um atalho de teclado: ao escrever uma palavra-chave, outra mensagem é enviada.', 990, ['whatsapp', 'filter', 'router']),
      tpl('t3', '🔊 Transcrição de áudio', 'Transcreva automaticamente os áudios recebidos no seu WhatsApp.', 500, ['chatgpt', 'whatsapp', 'sheets', 'filter', 'requester']),
      tpl('t4', '📝 Formulário → Planilha', 'Preencha automaticamente uma planilha a partir das respostas de um formulário do site.', 0, ['webhook', 'sheets', 'filter']),
      tpl('t5', 'Validação de CPF e CNPJ', 'Valide documentos e evite cadastros fraudulentos sem escrever código.', 990, ['filter', 'code', 'router']),
      tpl('t6', 'Chatbot completo', 'Interpreta áudio, imagens, texto e arquivos, com intervenção humana quando necessário.', 1090, ['whatsapp', 'chatgpt', 'sheets', 'database', 'filter', 'router']),
      tpl('t7', '💬 Chatbot multicanal', 'Responde imagem, texto e áudio usando o módulo de agentes.', 1290, ['ai_agent', 'chatgpt', 'filter', 'router']),
      tpl('t8', 'Mensagens e lembretes', 'Complemento para confirmação de agendamentos via WhatsApp.', 500, ['whatsapp', 'calendar', 'code', 'delay']),
      tpl('t9', '💸 Finanças no WhatsApp', 'Envie gastos, receitas e investimentos para o seu número e gere relatórios.', 3700, ['chatgpt', 'whatsapp', 'sheets', 'requester', 'filter', 'router', 'code']),
      tpl('t10', '💡 Dicas da plataforma', 'Dicas para melhorar o uso da plataforma no dia a dia.', 0, ['webhook', 'filter']),
      tpl('t11', '✨ Gerador de conteúdo', 'Defina temas na planilha e gere esboços de conteúdo direto no Trello.', 500, ['sheets', 'chatgpt', 'trello']),
      tpl('t12', 'Melhoria de prompts', 'Envie um prompt inicial e receba uma versão melhorada automaticamente.', 0, ['chatgpt', 'code'], 'unlocked'),
      tpl('t13', '🗂️ Envio em massa', 'A partir de uma planilha de contatos, envie uma mensagem de WhatsApp para todos.', 500, ['sheets', 'whatsapp', 'delay']),
      tpl('t14', '🧲 Coleta de leads de anúncios', 'Conecte sua conta de anúncios e cadastre cada lead no CRM que preferir.', 500, ['facebook', 'sheets', 'filter']),
      tpl('t15', '✍️ Posts de blog', 'Crie artigos automaticamente e publique no WordPress.', 3700, ['chatgpt', 'wordpress', 'trello', 'filter', 'code', 'router']),
      tpl('t16', 'Meu template de exemplo', 'Template publicado por você (dados de demonstração).', 0, ['webhook', 'sheets'], 'own'),
    ],
  }
  for (const flux of seed.fluxes) {
    if (FLUXES_WITH_HISTORY.includes(flux.id)) flux.executions = exampleExecutions(flux)
  }
  return seed
}

// Indicações de exemplo do painel de parceiro (status como no original: 1 pago, 2 cancelado, 3 registrado).
function partnerEvents() {
  const people = ['Marina Alves', 'Paulo Teixeira', 'Renata Dias', 'Lucas Prado', 'Sofia Nunes', 'Tiago Melo']
  return people.flatMap((fullname, i) => {
    const user = { id: `ref-${i}`, fullname }
    const registered = { id: `pe-${i}-r`, user_referred: user, created_at: days(80 - i * 9), comission: '0.00', status: 3 }
    if (i % 3 === 2) return [registered]
    const cancelled = i % 4 === 3
    const paid = {
      id: `pe-${i}-p`,
      user_referred: user,
      created_at: days(70 - i * 9),
      comission: cancelled ? '-50.00' : '100.00',
      status: cancelled ? 2 : 1,
    }
    return [paid, registered]
  })
}

// ---- Histórico de execuções de exemplo (alimenta o dashboard da integração) ----

// Integrações do seed que ganham histórico de exemplo.
export const FLUXES_WITH_HISTORY = ['flx-1', 'flx-2', 'flx-3']

const ORIGIN_BY_TRIGGER = { webhook: 'Webhook', scheduler: 'Agendamento' }
const NO_OPERATION_APPS = ['webhook', 'scheduler', 'filter', 'router']
const ERRORS = [
  'Timeout ao conectar com o serviço externo',
  'Credenciais da conexão expiradas',
  'Campo obrigatório "telefone" ausente',
]

const pick = (r, list) => list[Math.floor(r() * list.length)]

const SAMPLE_OUTPUT = {
  webhook: (r) => ({ nome: pick(r, ['Ana', 'Bruno', 'Carla', 'Diego']), email: `lead${Math.floor(r() * 900 + 100)}@exemplo.test`, origem: 'site' }),
  scheduler: () => ({ disparado: true }),
  filter: () => ({ aprovado: true }),
  sheets: (r) => ({ planilha: 'Leads', linha: Math.floor(r() * 500) + 2 }),
  whatsapp: (r) => ({ message_id: `wamid.${Math.floor(r() * 1e9)}`, status: 'sent' }),
  chatgpt: (r) => ({ resposta: 'Olá! Como posso ajudar?', tokens: 120 + Math.floor(r() * 200) }),
  ai_agent: () => ({ intencao: 'agendamento', confianca: 0.92 }),
  database: (r) => ({ id: Math.floor(r() * 10000), operacao: 'upsert' }),
  telegram: () => ({ ok: true }),
  calendar: (r) => ({ eventos: Math.floor(r() * 5) }),
}

// PRNG determinístico: o histórico de cada integração é sempre o mesmo.
function rng(text) {
  let a = [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function exampleExecutions(flux, totalDays = 14) {
  const r = rng(flux.id)
  const base = Math.max(40, (flux.average_execution ?? 20) * 10)
  const list = []
  for (let d = totalDays - 1; d >= 0; d--) {
    const count = Math.floor(r() * 7)
    for (let i = 0; i < count; i++) {
      const started = new Date(now - d * 86400000 - Math.floor(r() * 80000000))
      const failAt = r() < 0.13 ? 1 + Math.floor(r() * Math.max(1, flux.steps.length - 1)) : -1
      const steps = []
      for (const [index, step] of flux.steps.entries()) {
        const failed = index === failAt
        const output = failed ? { erro: pick(r, ERRORS) } : (SAMPLE_OUTPUT[step.app] ?? (() => ({ ok: true })))(r)
        steps.push({
          id: step.id,
          app: step.app,
          action: step.action,
          ms: Math.round((base / flux.steps.length) * (0.5 + r())),
          status: failed ? 'error' : 'success',
          output,
        })
        if (failed) break
      }
      list.push({
        id: `exe-${flux.id}-${d}-${i}`,
        started_at: started.toISOString(),
        duration_ms: steps.reduce((sum, s) => sum + s.ms, 0),
        status: failAt === -1 ? 'success' : 'error',
        origin: ORIGIN_BY_TRIGGER[flux.steps[0]?.app] ?? 'Webhook',
        operations: steps.filter((s) => !NO_OPERATION_APPS.includes(s.app)).length,
        steps,
      })
    }
  }
  return list.sort((a, b) => b.started_at.localeCompare(a.started_at))
}

function tpl(id, name, description, price, apps, status = 'locked') {
  return {
    id,
    name,
    description,
    price,
    apps,
    status,
    owner: { name: status === 'own' ? 'Você' : 'Equipe de Templates' },
    is_active: true,
  }
}
