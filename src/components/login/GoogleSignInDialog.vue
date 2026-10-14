<script setup>
import { ref, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import AppModal from '@/components/AppModal.vue'
import { googleSignIn } from '@/services/api'
import { email as emailRule, lengthBetween, required } from '@/utils/rules'
import { toastError } from '@/composables/useToast'

// Login social simulado: no original o botão leva ao Google, que volta para
// /auth-token-authenticated?token=...&qualified=... . Aqui o diálogo emite o mesmo token localmente.
const model = defineModel({ type: Boolean, default: false })

const router = useRouter()
const form = useTemplateRef('form')
const fullname = ref('')
const email = ref('')
const loading = ref(false)

async function submit() {
  const { valid } = await form.value.validate()
  if (!valid) return
  loading.value = true
  try {
    const { token, qualified } = await googleSignIn({ fullname: fullname.value.trim(), email: email.value.trim() })
    model.value = false
    router.push({ name: 'auth-token-authenticated', query: { token, qualified: String(qualified) } })
  } catch (error) {
    toastError({ text: error.userMessage ?? 'Não foi possível entrar com o Google.' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AppModal v-model="model" max-width="440px" :prevent-close="loading">
    <div class="d-flex align-center mb-2">
      <v-icon icon="mdi-google" color="primary" class="mr-2" />
      <h3>Entrar com Google</h3>
    </div>
    <p class="text-medium-emphasis text-small mb-5">
      Simulação local: nenhuma conta Google é acessada. Informe nome e e-mail para entrar ou criar a conta.
    </p>
    <v-form ref="form" @submit.prevent="submit">
      <v-text-field v-model="fullname" label="Nome" autocomplete="name" class="mb-2" :rules="[required, lengthBetween(4, 50)]" />
      <v-text-field v-model="email" label="Email" autocomplete="email" class="mb-4" :rules="[required, emailRule]" />
      <v-btn block color="primary" type="submit" :loading="loading">Continuar</v-btn>
    </v-form>
  </AppModal>
</template>
