<script setup>
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'
import FluxNode from './FluxNode.vue'
import { APPS } from '@/services/apps'

// Canvas com pan/zoom e nós arrastáveis. O original usa Vue Flow; esta versão
// desenha os mesmos elementos (fundo pontilhado, nós, arestas tracejadas, controles) à mão.
const props = defineProps({
  steps: { type: Array, required: true },
  readonly: { type: Boolean, default: false },
  selectedId: { type: String, default: null },
  statuses: { type: Object, default: () => ({}) },
  controlsTop: { type: Number, default: 16 },
})

const emit = defineEmits(['select', 'add', 'move', 'background-click'])

const NODE_W = 160
const CIRCLE = 88
const GAP = 230
const MIN_ZOOM = 0.2
const MAX_ZOOM = 2

const root = useTemplateRef('root')
const view = ref({ x: 0, y: 0, zoom: 1 })
const addMenu = ref(false)
const menuTarget = ref([0, 0])

const addableApps = Object.entries(APPS)
  .filter(([, app]) => !app.trigger)
  .map(([key, app]) => ({ key, ...app }))

const positioned = computed(() =>
  props.steps.map((step, i) => ({ step, pos: step.position ?? { x: i * GAP, y: 0 } })),
)

const addPos = computed(() => {
  const last = positioned.value[positioned.value.length - 1]
  return last ? { x: last.pos.x + GAP, y: last.pos.y } : { x: 0, y: 0 }
})

function center(pos) {
  return { x: pos.x + NODE_W / 2, y: pos.y + CIRCLE / 2 }
}

function edgePath(a, b) {
  const from = center(a)
  const to = center(b)
  const x1 = from.x + CIRCLE / 2
  const x2 = to.x - CIRCLE / 2
  const dx = Math.max(40, Math.abs(x2 - x1) / 2)
  return `M ${x1} ${from.y} C ${x1 + dx} ${from.y}, ${x2 - dx} ${to.y}, ${x2} ${to.y}`
}

const edges = computed(() => {
  const list = []
  const nodes = positioned.value
  for (let i = 1; i < nodes.length; i++) list.push({ id: nodes[i].step.id, d: edgePath(nodes[i - 1].pos, nodes[i].pos) })
  if (!props.readonly && nodes.length) list.push({ id: 'add', d: edgePath(nodes[nodes.length - 1].pos, addPos.value), add: true })
  return list
})

const viewportStyle = computed(() => ({
  transform: `translate(${view.value.x}px, ${view.value.y}px) scale(${view.value.zoom})`,
}))

// Fundo pontilhado que acompanha pan e zoom (Background do Vue Flow no original).
const backgroundStyle = computed(() => {
  const gap = 20 * view.value.zoom
  const radius = Math.max(1.1, 1.6 * view.value.zoom)
  return {
    backgroundImage: `radial-gradient(circle, rgba(var(--v-theme-background-pattern-color), 0.45) ${radius}px, transparent ${radius + 0.2}px)`,
    backgroundSize: `${gap}px ${gap}px`,
    backgroundPosition: `${view.value.x}px ${view.value.y}px`,
  }
})

// ---- Ajuste de visualização ----

function fitView() {
  const el = root.value
  if (!el) return
  const nodes = positioned.value.map((n) => n.pos)
  if (!props.readonly) nodes.push(addPos.value)
  if (!nodes.length) return
  const minX = Math.min(...nodes.map((p) => p.x))
  const maxX = Math.max(...nodes.map((p) => p.x)) + NODE_W
  const minY = Math.min(...nodes.map((p) => p.y))
  const maxY = Math.max(...nodes.map((p) => p.y)) + CIRCLE + 50
  const { width, height } = el.getBoundingClientRect()
  const padding = 0.25
  const zoom = Math.min(1, Math.max(MIN_ZOOM, Math.min(width / ((maxX - minX) * (1 + padding)), height / ((maxY - minY) * (1 + padding)))))
  view.value = {
    zoom,
    x: width / 2 - ((minX + maxX) / 2) * zoom,
    y: height / 2 - ((minY + maxY) / 2) * zoom,
  }
}

function zoomBy(factor, origin) {
  const el = root.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const ox = origin ? origin.x - rect.left : rect.width / 2
  const oy = origin ? origin.y - rect.top : rect.height / 2
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.value.zoom * factor))
  const k = zoom / view.value.zoom
  view.value = { zoom, x: ox - (ox - view.value.x) * k, y: oy - (oy - view.value.y) * k }
}

function onWheel(event) {
  event.preventDefault()
  zoomBy(event.deltaY < 0 ? 1.1 : 1 / 1.1, { x: event.clientX, y: event.clientY })
}

// ---- Pan e arraste de nós ----

let drag = null

function onPointerDownBackground(event) {
  if (event.button !== 0) return
  drag = { type: 'pan', startX: event.clientX, startY: event.clientY, x: view.value.x, y: view.value.y, moved: false }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp, { once: true })
}

function onPointerDownNode(event, item) {
  if (event.button !== 0) return
  event.stopPropagation()
  drag = {
    type: 'node',
    id: item.step.id,
    startX: event.clientX,
    startY: event.clientY,
    origin: { ...item.pos },
    moved: false,
  }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp, { once: true })
}

function onPointerMove(event) {
  if (!drag) return
  const dx = event.clientX - drag.startX
  const dy = event.clientY - drag.startY
  if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true
  if (!drag.moved) return
  if (drag.type === 'pan') {
    view.value = { ...view.value, x: drag.x + dx, y: drag.y + dy }
  } else if (!props.readonly) {
    const z = view.value.zoom
    emit('move', drag.id, { x: Math.round(drag.origin.x + dx / z), y: Math.round(drag.origin.y + dy / z) }, false)
  }
}

function onPointerUp() {
  window.removeEventListener('pointermove', onPointerMove)
  if (drag?.type === 'node') {
    if (drag.moved) emit('move', drag.id, null, true)
    else emit('select', drag.id)
  } else if (drag?.type === 'pan' && !drag.moved) {
    emit('background-click')
  }
  drag = null
}

function openAddMenu(event) {
  const rect = event.currentTarget.getBoundingClientRect()
  menuTarget.value = [rect.right + 8, rect.top]
  addMenu.value = true
}

function addStep(appKey) {
  addMenu.value = false
  emit('add', appKey)
}

onMounted(() => nextTick(fitView))
watch(
  () => props.steps.length,
  () => nextTick(fitView),
)

defineExpose({ fitView, zoomIn: () => zoomBy(1.2), zoomOut: () => zoomBy(1 / 1.2) })
</script>

<template>
  <div ref="root" class="flux-canvas" :style="backgroundStyle" @pointerdown="onPointerDownBackground" @wheel="onWheel">
    <div class="flux-canvas__viewport" :style="viewportStyle">
      <svg class="flux-canvas__edges" width="1" height="1">
        <path
          v-for="edge in edges"
          :key="edge.id"
          :d="edge.d"
          class="flux-canvas__edge"
          :class="{ 'flux-canvas__edge--add': edge.add }"
        />
      </svg>

      <div
        v-for="item in positioned"
        :key="item.step.id"
        class="flux-canvas__node"
        :class="{ 'flux-canvas__node--draggable': !readonly }"
        :style="{ left: `${item.pos.x}px`, top: `${item.pos.y}px` }"
        @pointerdown="onPointerDownNode($event, item)"
      >
        <FluxNode
          :step="item.step"
          :index="steps.indexOf(item.step)"
          :selected="item.step.id === selectedId"
          :status="statuses[item.step.id] ?? null"
        />
      </div>

      <div
        v-if="!readonly"
        class="flux-canvas__node"
        :style="{ left: `${addPos.x}px`, top: `${addPos.y}px` }"
        @pointerdown.stop
      >
        <div class="flux-canvas__add">
          <button class="flux-canvas__add-btn" aria-label="Adicionar módulo" @click="openAddMenu">
            <v-icon icon="mdi-plus" size="36" color="primary" />
          </button>
          <span class="text-medium-emphasis text-small mt-2">Adicionar</span>
        </div>
      </div>
    </div>

    <!-- Fica fora do viewport escalado: ancorado num elemento com transform, o
         Vuetify considera o ativador invisível e esconde o menu. -->
    <v-menu v-model="addMenu" :target="menuTarget" location="end" max-height="420">
      <v-card min-width="260" class="pa-2">
        <p class="px-2 pb-2 text-medium-emphasis text-small">Adicionar módulo</p>
        <v-list density="compact" bg-color="transparent">
          <v-list-item v-for="app in addableApps" :key="app.key" rounded="lg" @click="addStep(app.key)">
            <template #prepend>
              <v-avatar :color="app.bg" size="30" rounded="lg" class="mr-3">
                <v-icon :icon="app.icon" :color="app.fg" size="18" />
              </v-avatar>
            </template>
            <v-list-item-title>{{ app.title }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card>
    </v-menu>

    <div class="custom-controls" :style="{ top: `${controlsTop}px` }" @pointerdown.stop>
      <v-btn icon size="x-small" class="custom-control-btn" @click="zoomBy(1.2)">
        <v-icon size="20" icon="mdi-plus" />
        <v-tooltip activator="parent" location="left">Aumentar a ampliação</v-tooltip>
      </v-btn>
      <v-btn icon size="x-small" class="custom-control-btn" @click="zoomBy(1 / 1.2)">
        <v-icon size="20" icon="mdi-minus" />
        <v-tooltip activator="parent" location="left">Diminuir a ampliação</v-tooltip>
      </v-btn>
      <v-btn icon size="x-small" class="custom-control-btn" @click="fitView">
        <v-icon size="20" icon="mdi-fullscreen" />
        <v-tooltip activator="parent" location="left">Centralizar a visualização</v-tooltip>
      </v-btn>
    </div>
  </div>
</template>

<style scoped>
.flux-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
  background-color: rgb(var(--v-theme-fluxBackground));
}

.flux-canvas:active {
  cursor: grabbing;
}

.flux-canvas__viewport {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
}

.flux-canvas__edges {
  position: absolute;
  top: 0;
  left: 0;
  overflow: visible;
  pointer-events: none;
}

.flux-canvas__edge {
  fill: none;
  stroke: rgb(var(--v-theme-primary));
  stroke-width: 3;
  stroke-dasharray: 8 8;
  stroke-linecap: round;
}

.flux-canvas__edge--add {
  stroke: rgb(var(--v-theme-muted));
  opacity: 0.6;
}

.flux-canvas__node {
  position: absolute;
}

.flux-canvas__node--draggable {
  cursor: pointer;
}

.flux-canvas__add {
  width: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.flux-canvas__add-btn {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  border: 2px dashed rgb(var(--v-theme-primary));
  background-color: color-mix(in srgb, rgb(var(--v-theme-primary)), transparent 92%);
  transition: background-color 0.2s;
}

.flux-canvas__add-btn:hover {
  background-color: color-mix(in srgb, rgb(var(--v-theme-primary)), transparent 80%);
}

.custom-controls {
  position: absolute;
  right: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 5;
}

.custom-control-btn {
  margin: 4px 0;
  background-color: rgb(var(--v-theme-faded)) !important;
  border-radius: 4px !important;
}
</style>
