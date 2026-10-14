<script setup>
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FiqonLogo from './FiqonLogo.vue'
import AppModal from './AppModal.vue'
import { createOrganization, fetchOrganizations, isOrgAdmin, visibleOrganizations } from '@/services/api'
import { useSession } from '@/composables/useSession'
import { useAppTheme } from '@/composables/useAppTheme'
import { toastInfo } from '@/composables/useToast'
import { SITE_LINKS } from '@/config'
import { required, lengthBetween } from '@/utils/rules'

const NAV_ITEMS = [
  { label: 'Página Inicial', icon: 'mdi-home-outline', route: 'home' },
  { label: 'Templates', icon: 'mdi-shopping-outline', route: 'marketplace' },
]

// Largura que o conteúdo reserva para a sidebar (mesma mecânica do original).
const width = defineModel({ type: String, required: true })

const route = useRoute()
const router = useRouter()
const { logout, selectedOrgId, selectOrg } = useSession()
const { themeName, toggleTheme } = useAppTheme()

const wrapperRef = useTemplateRef('wrapper')
const hovering = ref(false)
const pinned = ref(false)
const orgMenu = ref(false)
const hoveredRoute = ref(null)
const savedWidth = ref(undefined)
const orgSearch = ref('')
const newOrgModal = ref(false)
const newOrgName = ref('')
const creatingOrg = ref(false)

const isOpen = computed(() => pinned.value || orgMenu.value)

const hoveredOrg = ref(null)

const organizations = computed(() => {
  const list = visibleOrganizations().slice()
  const index = list.findIndex((o) => o.id === selectedOrgId.value)
  if (index > 0) list.unshift(...list.splice(index, 1))
  return list
})
const filteredOrgs = computed(() => {
  const term = orgSearch.value?.trim().toLowerCase()
  return term ? organizations.value.filter((o) => o.name.toLowerCase().includes(term)) : organizations.value
})
const currentOrg = computed(() => organizations.value.find((o) => o.id === selectedOrgId.value) ?? organizations.value[0])
const highlighted = (id) => hoveredOrg.value === id || selectedOrgId.value === id

// Como no original: sem organização válida selecionada, seleciona a primeira da lista.
watch(
  organizations,
  (list) => {
    if (list.length && !list.some((o) => o.id === selectedOrgId.value)) selectOrg(list[0].id)
  },
  { immediate: true },
)

onMounted(async () => {
  await nextTick()
  width.value = `${wrapperRef.value?.getBoundingClientRect().width ?? 0}px`
  fetchOrganizations()
})

// Engrenagem: seleciona a organização (se preciso) e abre a página "Organização".
function manageOrg(org) {
  orgMenu.value = false
  if (selectedOrgId.value !== org.id) selectOrg(org.id)
  router.push({ name: 'project-info' })
}

function togglePinned() {
  if (pinned.value) {
    width.value = savedWidth.value
  } else {
    savedWidth.value = width.value
    width.value = `${wrapperRef.value.getBoundingClientRect().width}px`
  }
  pinned.value = !pinned.value
}

function chooseOrg(org) {
  selectOrg(org.id)
  setTimeout(() => {
    if (!pinned.value) orgMenu.value = false
  }, 200)
}

async function submitNewOrg() {
  if (required(newOrgName.value) !== true) return
  creatingOrg.value = true
  try {
    const org = await createOrganization(newOrgName.value.trim())
    selectOrg(org.id)
    newOrgModal.value = false
    newOrgName.value = ''
  } finally {
    creatingOrg.value = false
  }
}

function openRoadmap() {
  toastInfo({ title: 'Próximas Features', text: 'O roadmap público não está disponível nesta recriação.' })
}

function signOut() {
  logout()
  toastInfo({ text: 'O login está desativado. Você continua no modo direto.' })
  router.push({ name: 'home' })
}
</script>

<template>
  <div
    ref="wrapper"
    class="app-sidebar-wrapper"
    :class="{ 'sidebar-opened': isOpen }"
    @mouseover="hovering = true"
    @mouseleave="hovering = false"
  >
    <div>
      <div class="w-100 d-flex justify-space-between mb-8">
        <div class="d-flex align-center sidebar-header">
          <v-expand-x-transition>
            <div v-if="!hovering && !pinned">
              <v-icon icon="custom:fiqon-logo" color="primary" size="40" />
            </div>
          </v-expand-x-transition>
          <div v-if="hovering && !pinned">
            <v-icon icon="mdi-arrow-expand-right" color="primary" size="40" class="cursor-pointer" @click="togglePinned" />
          </div>
          <FiqonLogo v-if="pinned && !hovering" logo-width="128" />
          <div v-if="hovering && pinned">
            <v-icon icon="mdi-arrow-expand-left" color="primary" size="40" class="cursor-pointer" @click="togglePinned" />
          </div>
        </div>
      </div>

      <button v-ripple class="d-flex align-center sidebar-organization-container mb-4 w-100">
        <v-avatar rounded="lg" class="organization-image border" color="faded" size="40">
          <v-img v-if="currentOrg?.image" :src="currentOrg.image" />
          <v-icon v-else icon="mdi-domain" size="22" />
        </v-avatar>
        <v-expand-x-transition>
          <div v-if="isOpen" class="d-flex justify-space-between flex-fill-remaining align-center">
            <h3 class="text-no-wrap px-2 text-truncate title_size">{{ currentOrg?.name ?? '—' }}</h3>
            <v-icon icon="mdi-chevron-right" />
          </div>
        </v-expand-x-transition>

        <v-menu v-model="orgMenu" activator="parent" width="380px" location="end" :close-on-content-click="false">
          <v-card class="pa-2">
            <p>Selecione uma organização</p>
            <v-divider class="my-2" />
            <v-text-field
              v-model="orgSearch"
              prepend-inner-icon="mdi-magnify"
              label="Buscar organização"
              hide-details
              density="compact"
              clearable
              class="mb-2"
            />
            <div class="org-list-scroll">
              <div v-for="org in filteredOrgs" :key="org.id" class="d-flex align-center">
                <v-list-item
                  class="organization-list pa-2 my-1 text-truncate flex-grow-1"
                  :class="{ 'selected-organization': org.id === selectedOrgId }"
                  density="compact"
                  max-width="100%"
                  @mouseover="hoveredOrg = org.id"
                  @mouseleave="hoveredOrg = null"
                  @click="chooseOrg(org)"
                >
                  <div class="d-flex align-center justify-space-between">
                    <div>
                      <v-avatar rounded="lg" color="faded" class="mr-2 border" size="26">
                        <v-img v-if="org.image" :src="org.image" cover />
                        <v-icon v-else icon="mdi-domain" size="16" />
                      </v-avatar>
                      <span class="org-name-truncate">{{ org.name }}</span>
                    </div>
                    <v-icon v-show="highlighted(org.id)" icon="mdi-chevron-right" size="20" />
                  </div>
                </v-list-item>
                <v-icon
                  v-if="isOrgAdmin(org.id)"
                  v-show="highlighted(org.id)"
                  icon="mdi-cog-outline"
                  size="20"
                  class="org-cog-btn ml-2"
                  aria-label="Gerenciar organização"
                  @mouseover="hoveredOrg = org.id"
                  @mouseleave="hoveredOrg = null"
                  @click="manageOrg(org)"
                />
              </div>
            </div>
            <v-divider class="my-2" />
            <v-list-item class="pa-0" density="compact" @click="newOrgModal = true">
              <div class="d-flex text-primary justify-center">
                <v-icon icon="mdi-plus" />
                Nova Organização
              </div>
            </v-list-item>
          </v-card>
        </v-menu>
      </button>

      <div v-for="item in NAV_ITEMS" :key="item.route" class="mb-2">
        <router-link v-slot="{ navigate }" :to="{ name: item.route }" custom>
          <button
            v-ripple
            class="sidebar-nav-btn d-flex w-100"
            :class="{ 'active-nav': item.route === route.name }"
            tabindex="-1"
            @mouseenter="hoveredRoute = item.route"
            @mouseleave="hoveredRoute = null"
            @click="navigate"
          >
            <v-icon :color="hoveredRoute === item.route ? 'secondarybtn' : 'black-white'" :icon="item.icon" size="25" />
            <v-expand-x-transition>
              <div v-if="isOpen">
                <div class="nav-text pl-2" :class="hoveredRoute === item.route ? 'text-secondarybtn' : 'text-black-white'">
                  {{ item.label }}
                </div>
              </div>
            </v-expand-x-transition>
          </button>
        </router-link>
      </div>
    </div>

    <div>
      <router-link :to="{ name: 'profile' }">
        <button v-ripple class="sidebar-nav-btn d-flex w-100" tabindex="-1">
          <v-icon icon="mdi-account-circle" size="25" />
          <v-expand-x-transition>
            <div v-if="isOpen"><div class="nav-text pl-2">Perfil</div></div>
          </v-expand-x-transition>
        </button>
      </router-link>
      <button v-ripple class="sidebar-nav-btn d-flex w-100" tabindex="-1" @click="openRoadmap">
        <v-icon icon="mdi-map" />
        <v-expand-x-transition>
          <div v-if="isOpen"><div class="nav-text pl-2">Próximas Features</div></div>
        </v-expand-x-transition>
      </button>
      <button v-ripple class="sidebar-nav-btn d-flex w-100" tabindex="-1" @click="toggleTheme">
        <v-icon v-if="themeName === 'dark'" icon="mdi-white-balance-sunny" size="25" />
        <v-icon v-else icon="mdi-weather-night" />
        <v-expand-x-transition>
          <div v-if="isOpen">
            <div class="nav-text pl-2">Tema {{ themeName === 'dark' ? 'Claro' : 'Escuro' }}</div>
          </div>
        </v-expand-x-transition>
      </button>
      <a :href="SITE_LINKS.docs" target="_blank" rel="noopener">
        <button v-ripple class="sidebar-nav-btn d-flex w-100" tabindex="-1">
          <v-icon icon="mdi-book-multiple-outline" size="25" />
          <v-expand-x-transition>
            <div v-if="isOpen"><div class="nav-text pl-2">Documentação</div></div>
          </v-expand-x-transition>
        </button>
      </a>
      <button v-ripple class="sidebar-nav-btn d-flex w-100" tabindex="-1" @click="signOut">
        <v-icon icon="mdi-logout" size="25" />
        <v-expand-x-transition>
          <div v-if="isOpen"><div class="nav-text pl-2">Sair</div></div>
        </v-expand-x-transition>
      </button>
    </div>
  </div>

  <AppModal v-model="newOrgModal" max-width="420px" :prevent-close="creatingOrg">
    <h3 class="mb-4">Nova organização</h3>
    <v-form @submit.prevent="submitNewOrg">
      <v-text-field
        v-model="newOrgName"
        label="Nome da sua organização"
        autofocus
        :rules="[required, lengthBetween(2, 60)]"
        class="mb-2"
      />
      <div class="d-flex justify-end">
        <v-btn variant="text" color="primary" class="mr-3" @click="newOrgModal = false">Cancelar</v-btn>
        <v-btn color="primary" type="submit" :loading="creatingOrg">Criar</v-btn>
      </div>
    </v-form>
  </AppModal>
</template>

<style scoped>
.flex-fill-remaining {
  flex: 1;
}

.app-sidebar-wrapper {
  background-color: rgb(var(--v-theme-surface));
  height: 100%;
  position: fixed;
  left: 0;
  top: 0;
  padding: 20px 15px;
  z-index: 900;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: stretch;
  outline: 1px solid rgb(var(--v-theme-card-outline));
}

.app-sidebar-wrapper .sidebar-header {
  font-size: 30px;
  height: 6vh;
}

.app-sidebar-wrapper .sidebar-nav-btn {
  border-radius: 8px;
  transition: all 0.2s;
  padding: 10px;
  white-space: nowrap;
  text-decoration: none !important;
}

.app-sidebar-wrapper .sidebar-nav-btn:hover {
  background-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-secondarybtn));
  padding-left: 15px;
  padding-right: 5px;
}

.app-sidebar-wrapper .sidebar-nav-btn.active-nav {
  color: rgb(var(--v-theme-black-white));
}

.app-sidebar-wrapper .sidebar-organization-container {
  border-radius: 8px;
  transition: background-color 0.2s;
}

.app-sidebar-wrapper .sidebar-organization-container .organization-image {
  border-radius: 8px;
  transition: all 0.3s;
}

.organization-list {
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.2s, box-shadow 0.2s;
  border-radius: 14px !important;
}

.organization-list:hover {
  background-color: color-mix(in srgb, rgb(var(--v-theme-primary)), transparent 90%);
}

.selected-organization {
  box-shadow: inset 0 0 0 1px rgb(var(--v-theme-primary));
  background-color: color-mix(in srgb, rgb(var(--v-theme-primary)), transparent 90%);
}

.sidebar-opened .sidebar-organization-container {
  background-color: color-mix(in srgb, rgb(var(--v-theme-black-white)), transparent 90%);
  padding-right: 6px;
}

.sidebar-opened .sidebar-organization-container .organization-image {
  scale: 0.8;
}

.org-name-truncate {
  display: inline-block;
  max-width: 250px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
}

.org-cog-btn {
  cursor: pointer;
  opacity: 0.8;
}

.org-cog-btn:hover {
  opacity: 1;
  color: rgb(var(--v-theme-primary));
}

.org-list-scroll {
  max-height: 300px;
  overflow-y: auto;
  padding-right: 4px;
}

.title_size {
  max-width: 200px;
}
</style>
