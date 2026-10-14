<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppsUsedByFlux from '@/components/AppsUsedByFlux.vue'
import HelpTooltip from '@/components/HelpTooltip.vue'
import ModalConfirm from '@/components/ModalConfirm.vue'
import UserConnectionsPanel from './UserConnectionsPanel.vue'
import { db, deleteFlux, duplicateFlux, fetchFluxes, toggleFluxStatus } from '@/services/api'
import { getBlockState } from '@/utils/subscription'
import { toastError, toastInfo, toastSuccess } from '@/composables/useToast'

const PRIORITY_HELP =
  'A FiqOn utiliza uma estrutura de filas para executar integrações com eficiência. Integrações rápidas recebem maior prioridade, enquanto integrações lentas são atribuídas a filas de menor prioridade. Quanto maior a prioridade da sua integração, melhor sua execução e desempenho. Prioridades mais baixas indicam possíveis problemas na sua integração que podem estar causando lentidão.'
const OPERATIONS_HELP =
  'Operações representam o uso da plataforma e são contabilizadas sempre que um aplicativo ou ação é executado. No entanto, alguns componentes não consomem operações, sendo eles Gatilhos (webhook, scheduler ou gatilho de aplicativo), Filtros, Roteadores e ForEach'

// Faixas de tempo médio de execução (mesmos limites do original).
const LIMITS = { quick: 30, medium: 600 }
const PRIORITY = {
  quick: { text: 'Alta', color: 'primary' },
  medium: { text: 'Media', color: 'yellow' },
  slow: { text: 'Baixa', color: 'warning' },
}

const route = useRoute()
const router = useRouter()

const tab = ref(route.query.tab === 'conexoes' ? 'conexoes' : 'integracoes')
watch(
  () => route.query.tab,
  (value) => (tab.value = value === 'conexoes' ? 'conexoes' : 'integracoes'),
)
watch(tab, (value) => {
  const query = { ...route.query }
  if (value === 'conexoes') query.tab = 'conexoes'
  else delete query.tab
  router.replace({ query })
})

const fluxes = ref({ data: [], meta: { total: 0, last_page: 1 } })
const loading = ref(true)
const search = ref('')
const orderBy = ref('updated_at')
const reverse = ref(true)
const page = ref(1)
const deleting = ref(false)
const duplicating = ref(new Set())
let searchTimer

const block = computed(() => getBlockState(db.subscription, 'integration'))

onMounted(load)
watch(page, () => load())

async function load(resetPage = false) {
  if (resetPage && page.value !== 1) {
    page.value = 1
    return
  }
  loading.value = true
  try {
    fluxes.value = await fetchFluxes({ searchTerm: search.value ?? '', orderBy: orderBy.value, reverse: reverse.value, page: page.value })
  } finally {
    loading.value = false
  }
}

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => load(true), 300)
}

function clearSearch() {
  search.value = ''
  load(true)
}

function sortBy(key) {
  if (orderBy.value === key) reverse.value = !reverse.value
  else {
    orderBy.value = key
    reverse.value = false
  }
  load()
}

function priorityOf(flux) {
  const avg = flux.average_execution
  if (avg == null) return null
  if (avg <= LIMITS.quick) return PRIORITY.quick
  if (avg <= LIMITS.medium) return PRIORITY.medium
  return PRIORITY.slow
}

async function toggle(flux, active) {
  try {
    await toggleFluxStatus(flux.id, active)
    flux.active = active
    toastSuccess({
      text: active ? 'Integração ativada.' : 'Integração desativada.',
      icon: active ? 'mdi-play-circle-outline' : 'mdi-pause-circle-outline',
    })
  } catch {
    toastError({ text: 'Não foi possível atualizar o estado do fluxo.' })
  }
}

async function duplicate(flux) {
  duplicating.value.add(flux.id)
  try {
    await duplicateFlux(flux.id)
    toastInfo({ title: 'Integração duplicada', text: `"${flux.name} (Cópia)" foi criada com sucesso`, color: 'success', icon: 'mdi-content-copy' })
    await load()
  } catch {
    toastError({ text: 'Não foi possível duplicar a integração, tente novamente mais tarde' })
  } finally {
    duplicating.value.delete(flux.id)
  }
}

async function remove(id) {
  deleting.value = true
  try {
    await deleteFlux(id)
    toastSuccess({ text: 'Integração excluída com sucesso', icon: 'mdi-delete-outline' })
    fluxes.value.data = fluxes.value.data.filter((f) => f.id !== id)
    fluxes.value.meta.total -= 1
  } catch {
    toastError({ text: 'Não foi possível excluir a integração, tente novamente mais tarde' })
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <v-card>
    <v-row class="ma-5 ml-7 align-center justify-space-between">
      <v-tabs v-model="tab" color="primary" density="compact" slider-color="primary">
        <v-tab value="integracoes" prepend-icon="mdi-source-branch" class="text-none">
          Integrações
          <v-chip v-if="fluxes.meta?.total" size="x-small" variant="tonal" class="ml-2">{{ fluxes.meta.total }}</v-chip>
        </v-tab>
        <v-tab value="conexoes" prepend-icon="mdi-link-variant" class="text-none">Conexões</v-tab>
      </v-tabs>
      <v-text-field
        v-if="tab === 'integracoes'"
        v-model="search"
        prepend-inner-icon="mdi-magnify"
        placeholder="Buscar integrações"
        hide-details
        density="compact"
        clearable
        max-width="33%"
        variant="outlined"
        rounded="lg"
        @input="onSearch"
        @click:clear="load(true)"
      />
    </v-row>

    <v-window v-model="tab">
      <v-window-item value="integracoes">
        <div v-if="loading">
          <v-skeleton-loader v-for="n in 6" :key="n" type="avatar, sentences, button@2" />
        </div>

        <div v-else-if="fluxes.data.length">
          <div class="bg-background py-1">
            <v-container fluid>
              <v-row class="d-flex align-center justify-space-between flux-row">
                <v-col lg="1" md="1" sm="1" />
                <v-col lg="3" md="2" sm="2">
                  <h4 class="cursor-pointer d-flex align-center sort-header" @click="sortBy('name')">
                    NOME
                    <v-icon
                      size="16"
                      class="ml-1 sort-icon"
                      :class="{ 'sort-icon--active': orderBy === 'name' }"
                      :color="orderBy === 'name' ? 'primary' : undefined"
                      :icon="orderBy === 'name' && reverse ? 'mdi-arrow-down' : 'mdi-arrow-up'"
                    />
                  </h4>
                </v-col>
                <v-col lg="2" md="2" sm="2" class="d-flex justify-center align-center">
                  <h4>PRIORIDADE</h4>
                  <HelpTooltip :text="PRIORITY_HELP" :size="15" class="ml-1" />
                </v-col>
                <v-col lg="1" md="2" sm="2" class="d-flex justify-center align-center">
                  <h4>OPERAÇÕES</h4>
                  <HelpTooltip :text="OPERATIONS_HELP" :size="15" class="ml-1" />
                </v-col>
                <v-col lg="3" md="2" sm="2" class="d-none d-lg-flex justify-center"><h4>APPS</h4></v-col>
                <v-col lg="1" md="1" sm="1" class="d-flex justify-center"><h4>DUPLICAR</h4></v-col>
                <v-col lg="1" md="1" sm="1" class="d-flex justify-end"><h4>EXCLUIR</h4></v-col>
              </v-row>
            </v-container>
          </div>

          <div v-for="flux in fluxes.data" :key="flux.id">
            <router-link :to="{ name: 'flux', params: { fluxId: flux.id } }">
              <v-card v-ripple class="flux-card px-4" variant="flat" rounded="0">
                <v-row class="d-flex align-center justify-space-between flux-row">
                  <v-col lg="1" md="1" sm="1" class="d-flex" @click.stop.prevent>
                    <v-switch
                      inset
                      hide-details
                      class="py-2"
                      color="primary"
                      :model-value="flux.active"
                      :disabled="block.isBlocked"
                      @update:model-value="(v) => v !== null && toggle(flux, v)"
                    />
                    <v-menu v-if="block.isBlocked" max-height="350" open-on-hover location="top" activator="parent">
                      <v-card :title="block.title" :text="block.text" max-width="360" />
                    </v-menu>
                  </v-col>
                  <v-col lg="3" md="2" sm="2" class="d-flex align-center text-truncate">
                    <span class="text-truncate">{{ flux.name }}</span>
                    <v-icon v-if="flux.premium && !db.subscription" icon="mdi-crown" class="ml-2" color="primary">
                      <v-tooltip activator="parent" location="top">Integração Premium</v-tooltip>
                    </v-icon>
                  </v-col>
                  <v-col lg="2" md="2" sm="2" class="d-flex justify-center">
                    <v-chip v-if="priorityOf(flux)" :color="priorityOf(flux).color" variant="tonal" size="small">
                      {{ priorityOf(flux).text }}
                    </v-chip>
                  </v-col>
                  <v-col lg="1" md="2" sm="2" class="d-flex justify-center">
                    <span :class="{ 'text-disabled': !flux.activations }">{{ flux.activations || 0 }}</span>
                  </v-col>
                  <v-col lg="3" md="2" sm="2" class="d-none d-lg-flex justify-center">
                    <AppsUsedByFlux :used-apps="flux.apps_used" />
                  </v-col>
                  <v-col lg="1" md="1" sm="1" class="d-flex justify-center" @click.stop.prevent>
                    <v-btn variant="text" icon :loading="duplicating.has(flux.id)" @click.stop.prevent="duplicate(flux)">
                      <v-icon icon="mdi-content-copy" color="primary" />
                      <v-tooltip activator="parent" location="top">Duplicar {{ flux.name }}</v-tooltip>
                    </v-btn>
                  </v-col>
                  <v-col lg="1" md="1" sm="1" class="d-flex justify-end" @click.stop.prevent>
                    <v-btn variant="text" icon :disabled="flux.first">
                      <v-icon icon="mdi-delete-outline" color="error" />
                      <v-tooltip activator="parent" location="top">Excluir {{ flux.name }}</v-tooltip>
                      <ModalConfirm
                        activator="parent"
                        header-text="Excluir integração"
                        confirm-text="Excluir integração"
                        cancel-text="Cancelar"
                        :loading-confirm="deleting"
                        color="error"
                        icon="mdi-alert-outline"
                        @confirm="remove(flux.id)"
                      >
                        <p>
                          Tem certeza que deseja excluir a integração <b>{{ flux.name }}</b>?
                        </p>
                      </ModalConfirm>
                    </v-btn>
                  </v-col>
                </v-row>
              </v-card>
            </router-link>
            <v-divider />
          </div>

          <div class="d-flex align-center justify-center flex-wrap ga-2 mx-5 my-4">
            <v-pagination
              v-model="page"
              total-visible="10"
              :length="fluxes.meta?.last_page ?? 1"
              active-color="primary"
              density="comfortable"
            />
          </div>
        </div>

        <div v-else class="text-center py-16">
          <v-icon :icon="search ? 'mdi-magnify-close' : 'mdi-source-branch'" size="48" class="mb-2 opacity-60" />
          <p class="mb-1">{{ search ? 'Nenhum resultado encontrado' : 'Nenhuma integração ainda' }}</p>
          <p class="mb-3">
            {{ search ? `Não encontramos integrações para "${search}".` : 'Crie sua primeira integração pelo botão no topo da página.' }}
          </p>
          <v-btn v-if="search" prepend-icon="mdi-close" variant="text" color="primary" @click="clearSearch">Limpar busca</v-btn>
        </div>
      </v-window-item>

      <v-window-item value="conexoes">
        <div class="pa-5">
          <UserConnectionsPanel />
        </div>
      </v-window-item>
    </v-window>
  </v-card>
</template>

<style scoped>
.flux-row > .v-col {
  padding-top: 8px;
  padding-bottom: 8px;
}

.sort-header .sort-icon:not(.sort-icon--active) {
  opacity: 0;
  transition: opacity 0.15s ease;
}

.sort-header:hover .sort-icon:not(.sort-icon--active) {
  opacity: 1;
}

.flux-card:hover {
  background-color: rgb(var(--v-theme-background));
}
</style>
