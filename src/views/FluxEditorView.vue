<script setup>
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppModal from '@/components/AppModal.vue'
import ModalConfirm from '@/components/ModalConfirm.vue'
import FluxCanvas from '@/components/flux/FluxCanvas.vue'
import FluxStepConfigDrawer from '@/components/flux/FluxStepConfigDrawer.vue'
import {
  db,
  deleteFlux,
  deleteFluxVersion,
  duplicateFlux,
  getFlux,
  renameFluxVersion,
  restoreFluxVersion,
  runFlux,
  saveFluxVersion,
  toggleFluxStatus,
  updateFlux,
} from '@/services/api'
import { getApp } from '@/services/apps'
import { getBlockState } from '@/utils/subscription'
import { lengthBetween, required } from '@/utils/rules'
import { toastError, toastInfo, toastSuccess } from '@/composables/useToast'

const STATE_MODAL = {
  active: {
    modal: {
      header: 'Inativar Fluxo?',
      text: 'Essa ação irá paralizar todas as próximas eventuais execuções deste fluxo.',
      confirm: 'INATIVAR',
      color: 'warning',
      icon: 'mdi-alert-outline',
    },
    toast: { color: 'info', text: 'Seu fluxo foi inativado com sucesso', icon: 'mdi-pause-octagon-outline', title: 'Fluxo Inativado' },
  },
  inactive: {
    modal: {
      header: 'Ativar Fluxo?',
      text: 'Essa ação deixará seu fluxo pronto para funcionamento!',
      confirm: 'ATIVAR',
      color: 'primary',
      icon: 'mdi-check-outline',
    },
    toast: { color: 'primary', text: 'Sua integração foi ativada com sucesso e já deve estar funcionando!', icon: 'mdi-play-outline', title: 'Integração Ativa' },
  },
}

const route = useRoute()
const router = useRouter()
const canvas = useTemplateRef('canvas')

const flux = ref(null)
const loading = ref(true)
const selectedId = ref(null)
const statuses = ref({})
const running = ref(false)
const pendingSave = ref(false)
const saving = ref(false)
const publishing = ref(false)
const stateModal = ref(false)
const editingName = ref(false)
const nameDraft = ref('')
const versionsOpen = ref(false)
const executionsOpen = ref(false)
const deleteOpen = ref(false)
const importInput = useTemplateRef('importInput')
const now = ref(Date.now())
let saveTimer
let clock
let cancelRun = false

const block = computed(() => getBlockState(db.subscription, 'integration'))
const stateInfo = computed(() => (flux.value?.active ? STATE_MODAL.active : STATE_MODAL.inactive))
const selectedStep = computed(() => flux.value?.steps.find((s) => s.id === selectedId.value) ?? null)
const selectedIndex = computed(() => flux.value?.steps.findIndex((s) => s.id === selectedId.value) ?? -1)

const lastSaved = computed(() => {
  if (!flux.value) return ''
  const minutes = Math.max(0, Math.round((now.value - new Date(flux.value.updated_at).getTime()) / 60000))
  if (minutes < 1) return 'alguns segundos'
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hora' : 'horas'}`
  const days = Math.round(hours / 24)
  return `${days} ${days === 1 ? 'dia' : 'dias'}`
})

onMounted(async () => {
  clock = setInterval(() => (now.value = Date.now()), 30000)
  try {
    flux.value = await getFlux(route.params.fluxId)
    document.title = `FiqOn | ${flux.value.name}`
  } catch {
    toastError({ text: 'Integração não encontrada' })
    router.replace({ name: 'home' })
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  clearInterval(clock)
  cancelRun = true
  if (pendingSave.value) persist()
})

// Mesmo comportamento do original: alterações são salvas 1s depois da última edição.
function scheduleSave() {
  pendingSave.value = true
  clearTimeout(saveTimer)
  saveTimer = setTimeout(persist, 1000)
}

async function persist() {
  clearTimeout(saveTimer)
  if (!flux.value) return
  saving.value = true
  pendingSave.value = false
  try {
    const saved = await updateFlux(flux.value.id, { name: flux.value.name, steps: flux.value.steps })
    flux.value.updated_at = saved.updated_at
  } finally {
    saving.value = false
  }
}

// ---- Nome ----

function startRename() {
  nameDraft.value = flux.value.name
  editingName.value = true
}

function commitRename() {
  const name = nameDraft.value.trim()
  if (required(name) !== true || lengthBetween(1, 50)(name) !== true) {
    toastError({ text: 'O nome deve ter entre 1 e 50 caracteres.' })
    return
  }
  editingName.value = false
  if (name === flux.value.name) return
  flux.value.name = name
  document.title = `FiqOn | ${name}`
  scheduleSave()
}

// ---- Estado ----

async function confirmState() {
  const next = !flux.value.active
  try {
    await toggleFluxStatus(flux.value.id, next)
    flux.value.active = next
    const toast = next ? STATE_MODAL.inactive.toast : STATE_MODAL.active.toast
    toastInfo(toast)
  } catch {
    toastError({ text: 'Não foi possível atualizar o estado do fluxo.' })
  }
}

// ---- Canvas ----

function onSelect(id) {
  selectedId.value = id
}

function onMove(id, position, done) {
  const step = flux.value.steps.find((s) => s.id === id)
  if (!step) return
  if (position) step.position = position
  if (done) scheduleSave()
}

function addStep(appKey) {
  const last = flux.value.steps[flux.value.steps.length - 1]
  const index = flux.value.steps.length
  const position = last?.position ? { x: last.position.x + 230, y: last.position.y } : undefined
  const step = { id: `s-${Date.now().toString(36)}`, app: appKey, action: getApp(appKey).title, ...(position && { position }) }
  if (!position && flux.value.steps.some((s) => s.position)) step.position = { x: index * 230, y: 0 }
  flux.value.steps.push(step)
  selectedId.value = step.id
  scheduleSave()
}

function removeSelected() {
  if (selectedIndex.value <= 0) return
  flux.value.steps.splice(selectedIndex.value, 1)
  selectedId.value = null
  scheduleSave()
}

function organize() {
  flux.value.steps.forEach((step) => delete step.position)
  scheduleSave()
  setTimeout(() => canvas.value?.fitView(), 50)
}

async function publish() {
  publishing.value = true
  try {
    await persist()
    const saved = await saveFluxVersion(flux.value.id)
    flux.value.versions = saved.versions
    toastSuccess({ title: 'Integração salva', text: 'A integração foi salva com sucesso!' })
  } catch {
    toastError({ title: 'Erro ao salvar', text: 'Aconteceu um erro ao salvar a integração, tente novamente' })
  } finally {
    publishing.value = false
  }
}

// ---- Execução simulada ----

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function run() {
  if (running.value) {
    cancelRun = true
    return
  }
  if (pendingSave.value) await persist()
  running.value = true
  cancelRun = false
  statuses.value = {}
  try {
    const { steps } = await runFlux(flux.value.id)
    for (const step of steps) {
      if (cancelRun) break
      statuses.value = { ...statuses.value, [step.id]: 'running' }
      await wait(Math.max(350, step.ms))
      statuses.value = { ...statuses.value, [step.id]: 'success' }
    }
    if (!cancelRun) toastSuccess({ title: 'Execução concluída', text: 'Todos os módulos foram executados (simulação).' })
    flux.value = { ...flux.value, ...(await getFlux(flux.value.id)), steps: flux.value.steps }
  } finally {
    running.value = false
    setTimeout(() => (statuses.value = {}), 4000)
  }
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })
}

// ---- Versões ----

const renamingVersion = ref(null)
const versionName = ref('')

async function restoreVersion(version) {
  const restored = await restoreFluxVersion(flux.value.id, version.id)
  flux.value.steps = restored.steps
  flux.value.versions = restored.versions
  toastSuccess({ title: 'Versão restaurada', text: 'A versão foi restaurada com sucesso!' })
  versionsOpen.value = false
}

async function saveVersionName(version) {
  if (lengthBetween(3, 40)(versionName.value) !== true || !versionName.value.trim()) {
    toastError({ text: 'O nome da versão deve ter entre 3 e 40 caracteres.' })
    return
  }
  await renameFluxVersion(flux.value.id, version.id, versionName.value.trim())
  version.name = versionName.value.trim()
  renamingVersion.value = null
  toastSuccess({ title: 'Nome atualizado', text: 'O nome da versão foi atualizado com sucesso!' })
}

async function removeVersion(version) {
  await deleteFluxVersion(flux.value.id, version.id)
  flux.value.versions = flux.value.versions.filter((v) => v.id !== version.id)
}

// ---- Mais opções ----

function exportFlux() {
  const content = { name: flux.value.name, steps: flux.value.steps }
  const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${flux.value.name}.fiqon`
  link.click()
  URL.revokeObjectURL(link.href)
}

function importFlux(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result)
      if (!Array.isArray(data.steps) || !data.steps.every((s) => s && typeof s.app === 'string')) throw new Error()
      flux.value.steps = data.steps.map((s, i) => ({ id: String(s.id ?? `s${i}`), app: s.app, action: String(s.action ?? getApp(s.app).title) }))
      scheduleSave()
      toastSuccess({ text: 'Integração importada com sucesso.' })
    } catch {
      toastError({ text: 'O arquivo selecionado não é uma integração válida.' })
    }
  }
  reader.readAsText(file)
}

async function duplicate() {
  const copy = await duplicateFlux(flux.value.id)
  toastSuccess({ text: `"${copy.name}" foi criada com sucesso` })
  router.push({ name: 'flux', params: { fluxId: copy.id } })
  flux.value = await getFlux(copy.id)
}

async function remove() {
  await deleteFlux(flux.value.id)
  toastSuccess({ text: 'Integração excluída com sucesso' })
  pendingSave.value = false
  router.push({ name: 'home' })
}
</script>

<template>
  <div class="flux-editor">
    <div v-if="loading" class="w-100 h-100 d-flex justify-center align-center">
      <v-progress-circular color="primary" indeterminate />
    </div>

    <template v-else-if="flux">
      <v-progress-linear :active="saving" indeterminate color="primary" absolute class="top-0" />

      <FluxCanvas
        ref="canvas"
        :steps="flux.steps"
        :selected-id="selectedId"
        :statuses="statuses"
        :controls-top="112"
        @select="onSelect"
        @move="onMove"
        @add="addStep"
        @background-click="selectedId = null"
      />

      <!-- Sobreposição superior (TheFluxOverlay no original) -->
      <div class="flux-overlay">
        <div class="d-flex align-center ga-3 allow-click">
          <v-btn icon="mdi-chevron-left" density="comfortable" variant="tonal" color="primary" :to="{ name: 'home' }" />
          <div class="flux-name">
            <v-text-field
              v-if="editingName"
              v-model="nameDraft"
              density="compact"
              hide-details
              autofocus
              min-width="200"
              @keyup.enter="commitRename"
              @keyup.esc="editingName = false"
              @blur="commitRename"
            />
            <h3 v-else class="cursor-pointer editable-title" @click="startRename">
              {{ flux.name }}
              <v-icon icon="mdi-pencil-outline" size="16" class="ml-1 edit-hint" />
            </h3>
          </div>
        </div>

        <div class="d-flex flex-column align-end allow-click">
          <div class="d-flex align-center">
            <div class="mr-2 d-inline-flex align-center">
              <p class="mr-2">{{ flux.active ? 'Integração Ativa' : 'Integração Inativa' }}</p>
              <div>
                <v-switch
                  :model-value="block.isBlocked ? false : flux.active"
                  inset
                  hide-details
                  color="primary"
                  density="compact"
                  :disabled="block.isBlocked"
                  @update:model-value="stateModal = true"
                />
                <v-menu v-if="block.isBlocked" open-on-hover location="bottom" activator="parent">
                  <v-card class="pa-3" :title="block.title" :text="block.text" max-width="360">
                    <v-btn color="primary" class="ml-4 mb-2" variant="tonal" to="/profile?section=plan">
                      Ser Premium
                      <v-icon class="ml-2" icon="mdi-crown" />
                    </v-btn>
                  </v-card>
                </v-menu>
              </div>
            </div>

            <v-btn class="mr-3" color="primary" variant="tonal" @click="versionsOpen = true">
              <v-icon icon="mdi-graph-outline" size="24" class="mdi-rotate-180" />
              <v-tooltip activator="parent" location="bottom">Controle de versão</v-tooltip>
            </v-btn>
            <v-btn class="mr-3" color="primary" variant="tonal" @click="organize">
              <v-icon icon="mdi-auto-fix" size="24" />
              <v-tooltip activator="parent" location="bottom">Organizar integração</v-tooltip>
            </v-btn>
            <v-btn class="mr-3" color="primary" variant="tonal" :loading="publishing" @click="publish">
              <v-icon icon="mdi-content-save-outline" size="24" />
              <v-tooltip activator="parent" location="bottom">Salvar integração</v-tooltip>
            </v-btn>
            <v-btn class="mr-3" :color="running ? 'error' : 'primary'" variant="tonal" @click="run">
              <v-icon :icon="running ? 'mdi-stop' : 'mdi-play-outline'" size="22" class="mr-1" />
              <span>{{ running ? 'Cancelar' : 'RODAR' }}</span>
            </v-btn>
            <v-btn class="mr-3" color="primary" variant="tonal" @click="executionsOpen = true">
              <v-icon icon="mdi-list-box-outline" size="22" />
              <v-tooltip activator="parent" location="bottom">Lista de execuções</v-tooltip>
            </v-btn>
            <v-menu location="bottom end">
              <template #activator="{ props: menuProps }">
                <v-btn v-bind="menuProps" color="primary" variant="tonal" icon="mdi-dots-vertical" density="comfortable" />
              </template>
              <v-card min-width="240" class="pa-2">
                <p class="px-3 py-2 font-weight-bold">Opções da integração</p>
                <v-list density="compact" bg-color="transparent">
                  <v-list-item prepend-icon="mdi-download-outline" title="Exportar integração" rounded="lg" @click="exportFlux" />
                  <v-list-item prepend-icon="mdi-upload-outline" title="Importar integração" rounded="lg" @click="importInput.click()" />
                  <v-list-item prepend-icon="mdi-content-copy" title="Duplicar integração" rounded="lg" @click="duplicate" />
                  <v-list-item
                    prepend-icon="mdi-delete-outline"
                    title="Excluir integração"
                    rounded="lg"
                    base-color="error"
                    :disabled="flux.first"
                    @click="deleteOpen = true"
                  />
                </v-list>
              </v-card>
            </v-menu>
            <input ref="importInput" type="file" accept=".fiqon,.json" hidden @change="importFlux" />
          </div>
          <span class="text-small text-medium-emphasis mt-2 mr-1">
            <template v-if="pendingSave">Alterações não salvas</template>
            <template v-else-if="saving">Salvando alterações...</template>
            <template v-else>Salvo por último há {{ lastSaved }}</template>
          </span>
        </div>
      </div>

      <!-- Painel do módulo selecionado -->
      <v-slide-x-reverse-transition>
        <FluxStepConfigDrawer
          v-if="selectedStep"
          :step="selectedStep"
          :index="selectedIndex"
          :all-steps="flux.steps"
          :flux-id="flux.id"
          @close="selectedId = null"
          @update="scheduleSave"
          @delete="removeSelected"
        />
      </v-slide-x-reverse-transition>

      <ModalConfirm
        v-model="stateModal"
        :header-text="stateInfo.modal.header"
        :confirm-text="stateInfo.modal.confirm"
        cancel-text="Cancelar"
        :color="stateInfo.modal.color"
        :icon="stateInfo.modal.icon"
        close-on-confirm
        @confirm="confirmState"
      >
        <p>{{ stateInfo.modal.text }}</p>
      </ModalConfirm>

      <ModalConfirm
        v-model="deleteOpen"
        header-text="Você tem certeza?"
        confirm-text="Sim, excluir minha integração"
        cancel-text="Cancelar"
        close-on-confirm
        @confirm="remove"
      >
        <p>Tem certeza que deseja excluir a integração <b>{{ flux.name }}</b>?</p>
      </ModalConfirm>

      <!-- Versões -->
      <AppModal v-model="versionsOpen" width="min(90vw, 640px)">
        <div class="d-flex pb-3"><h2>Versões do fluxo</h2></div>
        <p v-if="!flux.versions?.length" class="text-medium-emphasis">
          Nenhuma versão encontrada! Use "Salvar integração" para criar uma.
        </p>
        <div v-for="version in flux.versions" :key="version.id" class="d-flex align-center ga-2 pa-2 rounded version-row">
          <template v-if="renamingVersion === version.id">
            <v-text-field v-model="versionName" density="compact" hide-details label="Nome" autofocus @keyup.enter="saveVersionName(version)" />
            <v-btn icon="mdi-send" size="small" variant="text" @click="saveVersionName(version)" />
          </template>
          <p v-else class="flex-grow-1">Versão: {{ version.name }}</p>
          <v-btn v-if="version.active" variant="text" color="primary">Versão atual</v-btn>
          <v-btn v-else color="primary" @click="restoreVersion(version)">Restaurar versão</v-btn>
          <v-btn variant="text" icon :disabled="version.active" @click="removeVersion(version)">
            <v-icon icon="mdi-delete-outline" color="error" />
            <v-tooltip activator="parent" location="top">Excluir versão</v-tooltip>
          </v-btn>
          <v-btn variant="text" icon @click="(renamingVersion = version.id), (versionName = version.name)">
            <v-icon icon="mdi-pencil-outline" />
            <v-tooltip activator="parent" location="top">Editar nome da versão</v-tooltip>
          </v-btn>
        </div>
      </AppModal>

      <!-- Execuções -->
      <AppModal v-model="executionsOpen" width="min(90vw, 720px)">
        <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4 pr-8">
          <h2>Lista de execuções</h2>
          <v-btn color="primary" variant="tonal" prepend-icon="mdi-chart-box-outline" :to="{ name: 'flux-dashboard', params: { fluxId: flux.id } }">
            Abrir dashboard
          </v-btn>
        </div>
        <p v-if="!flux.executions?.length" class="text-medium-emphasis">Nenhuma execução ainda. Clique em RODAR para testar a integração.</p>
        <v-expansion-panels v-else variant="accordion">
          <v-expansion-panel v-for="exe in flux.executions.slice(0, 20)" :key="exe.id">
            <v-expansion-panel-title>
              <div class="d-flex align-center ga-3 w-100">
                <v-icon
                  :icon="exe.status === 'error' ? 'mdi-alert-circle' : 'mdi-check-circle'"
                  :color="exe.status === 'error' ? 'error' : 'success'"
                />
                <span>{{ formatDate(exe.started_at) }}</span>
                <v-chip v-if="exe.origin" size="x-small" variant="outlined">{{ exe.origin }}</v-chip>
                <v-spacer />
                <v-chip size="small" variant="tonal">{{ exe.duration_ms }} ms</v-chip>
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div v-for="(step, i) in exe.steps" :key="`${step.id}-${i}`" class="d-flex align-center ga-3 py-1">
                <v-chip size="x-small" color="primary">{{ i + 1 }}</v-chip>
                <span class="flex-grow-1">{{ getApp(step.app).title }} — {{ step.action }}</span>
                <span class="text-medium-emphasis text-small">{{ step.ms }} ms</span>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </AppModal>
    </template>
  </div>
</template>

<style scoped>
.flux-editor {
  position: relative;
  height: 100vh;
  overflow: hidden;
}

.flux-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 20px 32px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  pointer-events: none;
  z-index: 4;
}

.allow-click {
  pointer-events: initial;
}

.flux-name {
  min-width: 200px;
}

.editable-title .edit-hint {
  opacity: 0;
  transition: opacity 0.15s;
}

.editable-title:hover .edit-hint {
  opacity: 1;
}

.step-panel {
  position: absolute;
  right: 80px;
  top: 112px;
  width: 340px;
  z-index: 6;
}

.version-row:hover {
  background-color: color-mix(in srgb, rgb(var(--v-theme-primary)), transparent 92%);
}
</style>
