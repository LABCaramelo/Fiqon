<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AppsUsedByFlux from '@/components/AppsUsedByFlux.vue'
import FluxCanvas from '@/components/flux/FluxCanvas.vue'
import TemplateEditModal from '@/components/marketplace/TemplateEditModal.vue'
import { downloadTemplate, listTemplates } from '@/services/api'
import { getApp } from '@/services/apps'
import { toastError } from '@/composables/useToast'

const TABS = [
  { label: 'Loja de templates', value: 'locked' },
  { label: 'Templates desbloqueados', value: 'unlocked' },
  { label: 'Meus templates', value: 'own' },
]

const ACTIONS = {
  locked: { color: 'primary', icon: 'mdi-cart-plus', tooltip: 'Comprar template' },
  unlocked: { color: 'warning', icon: 'mdi-download', tooltip: 'Baixar template' },
  own: { color: 'secondary', icon: 'mdi-pencil', tooltip: 'Editar template' },
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const tab = ref('locked')
const search = ref('')
const term = ref('')
const loading = ref(true)
const templates = ref([])
const editing = ref(null)
const editOpen = ref(false)
let timer

const normalize = (text) => String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const byTab = computed(() => {
  const t = normalize(term.value.trim())
  const matches = (tpl) => !t || [tpl.name, tpl.description, tpl.owner.name].some((v) => normalize(v).includes(t))
  return {
    locked: templates.value.filter(matches),
    unlocked: templates.value.filter((tpl) => tpl.status === 'unlocked' && tpl.is_active && matches(tpl)),
    own: templates.value.filter((tpl) => tpl.status === 'own' && tpl.is_active && matches(tpl)),
  }
})
const items = computed(() => byTab.value[tab.value] ?? [])

const emptySearch = computed(() => tab.value === 'locked' && items.value.length === 0 && term.value.trim() !== '')
const emptyUnlocked = computed(() => tab.value === 'unlocked' && items.value.length === 0)
const emptyOwn = computed(() => tab.value === 'own' && items.value.length === 0)

watch(search, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => (term.value = value ?? ''), 250)
})

onMounted(load)

async function load() {
  loading.value = true
  try {
    templates.value = await listTemplates()
  } finally {
    loading.value = false
  }
}

const priceLabel = (price) => (price === 0 ? 'Gratuito' : currency.format(price / 100))
const priceClass = (price) => (price === 0 ? 'text-success' : 'text-primary')

function actionOf(tpl) {
  if (tpl.price === 0 && tpl.status === 'locked') return { color: 'success', icon: 'mdi-download', tooltip: 'Baixar template' }
  return ACTIONS[tpl.status]
}

function previewSteps(tpl) {
  return tpl.apps.map((app, i) => ({ id: `${tpl.id}-${i}`, app, action: getApp(app).title }))
}

async function onAction(tpl) {
  if (tpl.status === 'own') {
    editing.value = tpl
    editOpen.value = true
  } else if (tpl.status === 'locked' && tpl.price !== 0) {
    toastError({ title: 'Compra indisponível', text: 'A compra de templates pagos não está disponível no momento.' })
  } else {
    await downloadTemplate(tpl.id)
  }
}
</script>

<template>
  <div>
    <section class="text-center justify-center">
      <div class="sticky-combobox-wrapper d-flex align-center justify-center mt-10">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          placeholder="Pesquise por Título, Descrição ou Autor"
          variant="outlined"
          density="comfortable"
          hide-details
          clearable
        />
      </div>
      <v-tabs v-model="tab" align-tabs="center" color="primary">
        <v-tab v-for="t in TABS" :key="t.value" :value="t.value" class="text-none">{{ t.label }}</v-tab>
      </v-tabs>
    </section>

    <section>
      <v-row v-if="loading" class="ma-6">
        <v-col v-for="n in 6" :key="n" cols="12" lg="4" xl="4">
          <v-skeleton-loader type="card" class="d-flex flex-column align-stretch">
            <v-skeleton-loader type="avatar, avatar, avatar" />
            <v-skeleton-loader type="heading" class="w-50 mt-n2" />
            <v-skeleton-loader type="paragraph" class="mb-3 mt-n4" />
          </v-skeleton-loader>
        </v-col>
      </v-row>

      <v-row v-else class="ma-6">
        <v-col v-for="tpl in items" :key="tpl.id" cols="12" md="6" lg="4" xl="4">
          <v-card class="d-flex flex-column align-stretch card-zoom" elevation="2" height="250" tag="article">
            <div class="d-flex template-image align-start justify-start pa-4">
              <v-icon v-if="tpl.apps.length === 0" size="64">mdi-image-off-outline</v-icon>
              <AppsUsedByFlux v-else :used-apps="tpl.apps" />
            </div>
            <div class="d-flex flex-column px-4 flex-grow-1 overflow-hidden">
              <div class="info-area">
                <div>
                  <h3>{{ tpl.name }}</h3>
                  <p class="description-text">{{ tpl.description }}</p>
                </div>
                <div>
                  <div class="text-small">{{ tpl.owner.name }}</div>
                </div>
              </div>
              <div class="d-flex justify-space-between align-center pb-2">
                <span class="font-weight-bold" :class="priceClass(tpl.price)">{{ priceLabel(tpl.price) }}</span>
                <v-btn :color="actionOf(tpl).color" variant="tonal" size="large" @click.prevent.stop="onAction(tpl)">
                  <v-icon>{{ actionOf(tpl).icon }}</v-icon>
                  <v-tooltip activator="parent" location="top">{{ actionOf(tpl).tooltip }}</v-tooltip>
                </v-btn>
              </div>
            </div>

            <v-dialog activator="parent" width="auto">
              <v-card class="d-flex flex-column" variant="flat" width="80vw" height="calc(100vh - 250px)" min-height="400px">
                <div class="d-flex align-center justify-space-between pa-4">
                  <div>
                    <h3>{{ tpl.name }}</h3>
                    <p class="text-medium-emphasis text-small">{{ tpl.description }}</p>
                  </div>
                  <span class="font-weight-bold" :class="priceClass(tpl.price)">{{ priceLabel(tpl.price) }}</span>
                </div>
                <div class="flux-log-container mx-4 mb-4">
                  <FluxCanvas :steps="previewSteps(tpl)" readonly />
                </div>
              </v-card>
            </v-dialog>
          </v-card>
        </v-col>
      </v-row>

      <v-row v-if="!loading && emptySearch">
        <v-col cols="12" class="d-flex justify-center align-center">
          <v-icon size="48">mdi-magnify-minus</v-icon>
          <span class="ml-2">Nenhum template encontrado para sua busca.</span>
        </v-col>
      </v-row>
      <v-row v-if="!loading && emptyUnlocked">
        <v-col cols="12" class="d-flex justify-center align-center">
          <v-icon size="48">mdi-lock</v-icon>
          <span class="ml-2">Você não possui templates desbloqueados.</span>
        </v-col>
      </v-row>
      <v-row v-if="!loading && emptyOwn">
        <v-col cols="12" class="d-flex justify-center align-center">
          <v-icon size="48">mdi-account-off</v-icon>
          <span class="ml-2">Você não possui templates cadastrados.</span>
        </v-col>
      </v-row>
    </section>

    <TemplateEditModal v-model="editOpen" :template="editing" @saved="load" />
  </div>
</template>

<style scoped>
.sticky-combobox-wrapper {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 12px 16px;
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
}

.info-area {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 140px;
  overflow: hidden;
}

.flux-log-container {
  border: 1px solid color-mix(in srgb, rgb(var(--v-theme-faded)), transparent 70%);
  border-radius: 10px;
  overflow: hidden;
  flex: 1;
}

.description-text {
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.card-zoom {
  transition: transform 0.3s ease-in-out;
  cursor: pointer;
}

.card-zoom:hover {
  transform: scale(1.05);
}
</style>
