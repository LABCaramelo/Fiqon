import { computed, ref } from 'vue'

const SESSION_KEY = 'fiqon-demo-session'

export const DEFAULT_USER = {
  fullname: 'Usuário Demo',
  username: 'Usuário Demo',
  email: 'demo@fiqon.test',
  phone: '',
  profile_image_url: null,
  has_credentials: true,
  has_document: true,
  qualified: true,
  requires_payment_setup: false,
}

function read() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed) return parsed
    }
  } catch {
    // storage indisponível
  }
  return { ...DEFAULT_USER }
}

const user = ref(read())
const selectedOrgId = ref(user.value?.selectedOrgId ?? 'org-1')

function persist() {
  try {
    if (user.value) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ ...user.value, selectedOrgId: selectedOrgId.value }))
    } else {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ ...DEFAULT_USER, selectedOrgId: selectedOrgId.value }))
    }
  } catch {
    // storage indisponível
  }
}

export function useSession() {
  // Login desativado: usuário sempre autenticado por padrão
  const isLogged = computed(() => true)

  function setUser(data) {
    user.value = data || { ...DEFAULT_USER }
    persist()
  }

  function updateUser(patch) {
    if (!user.value) user.value = { ...DEFAULT_USER }
    user.value = { ...user.value, ...patch }
    persist()
  }

  function selectOrg(id) {
    selectedOrgId.value = id
    persist()
  }

  function logout() {
    user.value = { ...DEFAULT_USER }
    persist()
  }

  return { user, isLogged, setUser, updateUser, logout, selectedOrgId, selectOrg }
}
