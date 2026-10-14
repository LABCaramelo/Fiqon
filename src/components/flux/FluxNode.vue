<script setup>
import { computed } from 'vue'
import { getApp } from '@/services/apps'

// Nó circular do canvas (o original desenha cada módulo como um círculo com o logo do app).
const props = defineProps({
  step: { type: Object, required: true },
  index: { type: Number, default: 0 },
  selected: { type: Boolean, default: false },
  status: { type: String, default: null }, // running | success | null
})

const app = computed(() => getApp(props.step.app))
const isTrigger = computed(() => !!app.value.trigger)
const isMiddleware = computed(() => !!app.value.middleware)
</script>

<template>
  <div class="flux-node" :class="{ 'flux-node--selected': selected, [`flux-node--${status}`]: status }">
    <div class="flux-node__circle" :class="{ 'flux-node__circle--trigger': isTrigger, 'flux-node__circle--middleware': isMiddleware }">
      <div class="flux-node__icon" :style="{ backgroundColor: app.bg }">
        <v-icon :icon="app.icon" :color="app.fg" size="34" />
      </div>
      <span class="flux-node__index">{{ index + 1 }}</span>
      <v-progress-circular v-if="status === 'running'" class="flux-node__spinner" indeterminate color="primary" size="96" width="3" />
      <v-icon v-if="status === 'success'" class="flux-node__check" icon="mdi-check-circle" color="success" size="22" />
    </div>
    <div class="flux-node__label">
      <b class="text-truncate d-block">{{ app.title }}</b>
      <span class="text-truncate d-block text-medium-emphasis">{{ step.action }}</span>
    </div>
  </div>
</template>

<style scoped>
.flux-node {
  width: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  user-select: none;
}

.flux-node__circle {
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background-color: rgb(var(--v-theme-surface));
  border: 2px solid rgb(var(--v-theme-card-outline));
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
  transition: border-color 0.2s, transform 0.2s;
}

.flux-node__circle--trigger {
  border-color: rgb(var(--v-theme-primary));
}

.flux-node__circle--middleware {
  border-style: dashed;
  border-color: rgb(var(--v-theme-if-color));
}

.flux-node:hover .flux-node__circle {
  transform: scale(1.04);
}

.flux-node--selected .flux-node__circle {
  border-color: rgb(var(--v-theme-secondary));
  box-shadow: 0 0 0 4px color-mix(in srgb, rgb(var(--v-theme-secondary)), transparent 70%);
}

.flux-node__icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: grid;
  place-items: center;
}

.flux-node__index {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 11px;
  font-size: 0.72rem;
  font-weight: 700;
  display: grid;
  place-items: center;
  background-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}

.flux-node__spinner {
  position: absolute;
  inset: -6px;
}

.flux-node__check {
  position: absolute;
  bottom: -4px;
  right: -4px;
  background: rgb(var(--v-theme-surface));
  border-radius: 50%;
}

.flux-node__label {
  margin-top: 10px;
  width: 100%;
  text-align: center;
  font-size: 0.85rem;
  line-height: 1.3;
}
</style>
