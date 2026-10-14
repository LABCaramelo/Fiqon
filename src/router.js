import { createRouter, createWebHistory } from 'vue-router'
import { useSession } from '@/composables/useSession'
import { savePendingInvite } from '@/composables/useLoginFlow'
import { acceptInvite, fetchPartnerInfo } from '@/services/api'
import { toastError, toastSuccess } from '@/composables/useToast'

const HomeView = () => import('@/views/HomeView.vue')
const MarketplaceView = () => import('@/views/MarketplaceView.vue')
const ProfileView = () => import('@/views/ProfileView.vue')
const FluxEditorView = () => import('@/views/FluxEditorView.vue')
const FluxDashboardView = () => import('@/views/FluxDashboardView.vue')
const ProjectInfoView = () => import('@/views/ProjectInfoView.vue')
const PartnerDashboardView = () => import('@/views/PartnerDashboardView.vue')
const UserQualificationView = () => import('@/views/UserQualificationView.vue')
const SubscriptionSetupView = () => import('@/views/SubscriptionSetupView.vue')
const AuthTokenView = () => import('@/views/AuthTokenView.vue')
const MfaVerificationView = () => import('@/views/MfaVerificationView.vue')
const LoginView = () => import('@/views/LoginView.vue')
const LegalView = () => import('@/views/LegalView.vue')
const NotFoundView = () => import('@/views/NotFoundView.vue')

// Link do e-mail de convite: sem login, guarda o convite e manda entrar; logado, aceita na hora.
async function acceptInviteRoute(to) {
  const token = String(to.query.token ?? '')
  const { isLogged, selectOrg } = useSession()
  if (!isLogged.value) {
    savePendingInvite(token)
    return { name: 'login' }
  }
  try {
    const org = await acceptInvite(token)
    selectOrg(org.id)
    toastSuccess({ title: 'Convite aceito', text: 'Você entrou na organização com sucesso!', icon: 'mdi-check-circle-outline' })
  } catch {
    toastError({ text: 'Convite inválido ou expirado.' })
  }
  return { name: 'home' }
}

// Como no original, /partner só abre para parceiros com saldo disponível.
async function partnerGuard() {
  try {
    const info = await fetchPartnerInfo()
    return Number(info.available_balance || 0) > 0 ? true : { name: 'home' }
  } catch {
    return { name: 'home' }
  }
}

// Qualificação só para contas que ainda não responderam (ou que precisam configurar pagamento antes).
function qualificationGuard() {
  const { user } = useSession()
  if (user.value?.requires_payment_setup) return { name: 'onboarding-subscription' }
  return user.value?.qualified === false ? true : { name: 'home' }
}

const routes = [
  { path: '/', name: 'home', component: HomeView, meta: { title: 'Início', refresh_on_org_change: true } },
  { path: '/project', name: 'project-info', component: ProjectInfoView, meta: { title: 'Organização' } },
  {
    path: '/project/:projectId/accept-invite',
    name: 'project-accept-invite',
    component: HomeView,
    meta: { allow_unlogged_users: true, title: 'Aceitando convite' },
    beforeEnter: acceptInviteRoute,
  },
  {
    path: '/dashboard/:fluxId?',
    name: 'flux-dashboard',
    component: FluxDashboardView,
    meta: { title: 'Dashboard', refresh_on_org_change: true },
  },
  { path: '/partner', name: 'partner', component: PartnerDashboardView, meta: { title: 'Parceiro' }, beforeEnter: partnerGuard },
  {
    path: '/qualificacao',
    name: 'user-qualification-form',
    component: UserQualificationView,
    meta: { no_sidebar: true, title: 'Qualificação' },
    beforeEnter: qualificationGuard,
  },
  {
    path: '/onboarding/subscription',
    name: 'onboarding-subscription',
    component: SubscriptionSetupView,
    meta: { no_sidebar: true, title: 'Configurar pagamento' },
  },
  {
    path: '/auth-token-authenticated',
    name: 'auth-token-authenticated',
    component: AuthTokenView,
    meta: { no_sidebar: true, allow_unlogged_users: true },
  },
  { path: '/marketplace', name: 'marketplace', component: MarketplaceView, meta: { title: 'Templates' } },
  {
    path: '/profile',
    name: 'profile',
    component: ProfileView,
    meta: { title: 'Página do usuário', subscription_header: true },
  },
  { path: '/flux/:fluxId?', name: 'flux', component: FluxEditorView, meta: { title: 'Integração', full_bleed: true } },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { no_sidebar: true, allow_unlogged_users: true, kick_logged_users: true, title: 'Bem-vindo' },
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: LoginView,
    meta: { no_sidebar: true, allow_unlogged_users: true, title: 'Resetar senha' },
  },
  {
    path: '/mfa-challenge',
    name: 'mfa-challenge',
    component: MfaVerificationView,
    meta: { no_sidebar: true, allow_unlogged_users: true, title: 'Verificação MFA' },
  },
  {
    path: '/politicas-de-privacidade',
    name: 'privacy-policies',
    component: LegalView,
    props: { kind: 'privacy' },
    meta: { no_sidebar: true, allow_unlogged_users: true, title: 'Políticas de privacidade' },
  },
  {
    path: '/termos-de-uso',
    name: 'terms-of-use',
    component: LegalView,
    props: { kind: 'terms' },
    meta: { no_sidebar: true, allow_unlogged_users: true, title: 'Termos de uso' },
  },
  {
    path: '/:catchAll(.*)',
    name: '404',
    component: NotFoundView,
    meta: { no_sidebar: true, allow_unlogged_users: true, title: '404' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  // Login desativado a pedido: acesso direto liberado para toda a aplicação
  if (to.name === 'login' || to.name === 'reset-password' || to.name === 'mfa-challenge') {
    return { name: 'home' }
  }
})

router.afterEach((to) => {
  document.title = to.meta.title ? `FiqOn | ${to.meta.title}` : 'FiqOn'
})

export default router
