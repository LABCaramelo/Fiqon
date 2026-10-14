<script setup>
import { ref, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import AppModal from '@/components/AppModal.vue'
import { createFlux } from '@/services/api'
import { lengthBetween, required } from '@/utils/rules'

const router = useRouter()
const open = ref(false)
const loading = ref(false)
const name = ref('')
const form = useTemplateRef('form')

async function submit() {
  const { valid } = await form.value.validate()
  if (!valid) return
  loading.value = true
  try {
    const flux = await createFlux({ name: name.value.trim() })
    open.value = false
    name.value = ''
    router.push({ name: 'flux', params: { fluxId: flux.id } })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-btn color="secondarybtn" class="pa-2" rounded size="md" :disabled="loading" @click="open = true">
    <v-icon icon="mdi-plus" size="25" color="primary" />
    <p class="mr-1 text-primary">Nova Integração</p>
    <v-tooltip activator="parent" location="top">Criar nova integração</v-tooltip>
  </v-btn>

  <AppModal v-model="open" min-width="450px" :prevent-close="loading">
    <div class="create-flux-icon-container">
      <div class="create-flux-icon">
        <v-icon icon="custom:fiqon-logo" size="90" color="primary" />
      </div>
    </div>
    <h3 class="mb-4 position-relative">Nomeie sua integração!</h3>
    <v-form ref="form" :disabled="loading" class="position-relative" @submit.prevent="submit">
      <div class="mb-2">
        <v-text-field v-model="name" label="Nome do fluxo" autofocus :rules="[required, lengthBetween(0, 50)]" />
      </div>
      <div class="text-center">
        <v-btn class="mr-5" color="primary" variant="text" @click="open = false">Cancelar</v-btn>
        <v-btn color="primary" type="submit" :loading="loading">Começar!</v-btn>
      </div>
    </v-form>
  </AppModal>
</template>

<style scoped>
.create-flux-icon-container {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
  pointer-events: none;
}

.create-flux-icon-container .create-flux-icon {
  position: absolute;
  right: 0;
  top: 0;
  transform: translate(15%, -15%) rotate(35deg);
  opacity: 0.25;
}
</style>
