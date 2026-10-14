<script setup>
import { onMounted, ref } from 'vue'
import AppModal from '@/components/AppModal.vue'
import { confirmMfa, disableMfa, enableMfa, getMfaStatus } from '@/services/api'
import { useSession } from '@/composables/useSession'
import { toastError, toastInfo, toastSuccess } from '@/composables/useToast'

// Autenticação em dois fatores. Na demo qualquer código de 6 dígitos é aceito.
const { user } = useSession()

const enabled = ref(false)
const pending = ref(false)
const code = ref('')
const confirming = ref(false)
const recoveryCodes = ref([])
const recoveryOpen = ref(false)
const disableOpen = ref(false)
const disableMethod = ref('totp')
const disableCode = ref('')
const recoveryInput = ref('')
const disabling = ref(false)

onMounted(async () => {
  const status = await getMfaStatus(user.value.email)
  enabled.value = status.two_factor_enabled
  pending.value = status.pending_confirmation
})

async function onToggle(value) {
  if (value === null) return
  if (value) {
    const result = await enableMfa(user.value.email)
    recoveryCodes.value = result.recovery_codes
    pending.value = true
    enabled.value = true
    return
  }
  if (pending.value) {
    // Cancelou a configuração antes de confirmar.
    pending.value = false
    enabled.value = false
    return
  }
  enabled.value = true
  disableCode.value = ''
  recoveryInput.value = ''
  disableMethod.value = 'totp'
  disableOpen.value = true
}

async function confirm(value) {
  confirming.value = true
  try {
    const result = await confirmMfa(user.value.email, value)
    enabled.value = true
    pending.value = false
    recoveryCodes.value = result.recovery_codes
    toastSuccess({ title: 'MFA ativado com sucesso', text: 'Sua conta está protegida.' })
    recoveryOpen.value = true
  } catch {
    toastError({ title: 'Código inválido', text: 'Digite o código de 6 dígitos corretamente.' })
  } finally {
    confirming.value = false
    code.value = ''
  }
}

async function disable() {
  const value = disableMethod.value === 'totp' ? disableCode.value : recoveryInput.value
  if (disableMethod.value === 'totp' && !/^\d{6}$/.test(value)) {
    toastError({ title: 'Código inválido', text: 'Digite o código de 6 dígitos corretamente.' })
    return
  }
  disabling.value = true
  try {
    await disableMfa(user.value.email, value, disableMethod.value)
    enabled.value = false
    disableOpen.value = false
    toastInfo({ title: 'MFA Desativado', text: 'Autenticação de dois fatores foi desativada com sucesso.', color: 'success', icon: 'mdi-shield-off-outline' })
  } catch {
    toastError({ text: 'Não foi possível desativar o MFA. Verifique o código e tente novamente.' })
  } finally {
    disabling.value = false
  }
}

function copyCodes() {
  navigator.clipboard
    .writeText(recoveryCodes.value.join('\n'))
    .then(() => toastSuccess({ text: 'Códigos copiados para a área de transferência.' }))
    .catch(() => toastError({ text: 'Não foi possível copiar os códigos.' }))
}

function downloadCodes() {
  const blob = new Blob([recoveryCodes.value.join('\n')], { type: 'text/plain' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'codigos-recuperacao-fiqon.txt'
  link.click()
  URL.revokeObjectURL(link.href)
}
</script>

<template>
  <v-card class="pa-2">
    <div class="d-flex ma-4">
      <v-switch :model-value="enabled" color="primary" class="mx-2 align-self-center" hide-details inset @update:model-value="onToggle" />
      <div class="d-flex flex-column justify-center">
        <h3>{{ enabled && !pending ? 'MFA Ativo' : 'Ativar MFA' }}</h3>
        <p>{{ enabled && !pending ? 'Sua conta está protegida.' : 'Proteja sua conta com uma camada extra.' }}</p>
      </div>
    </div>

    <v-row v-if="pending && enabled" class="align-stretch">
      <v-col cols="12" sm="6" class="d-flex">
        <v-row class="w-100" dense>
          <v-col cols="12">
            <v-card class="ma-4 pa-4">
              <div class="d-flex align-center mb-4">
                <v-chip color="primary">1</v-chip>
                <h3 class="ml-4">Instale um APP Authenticator</h3>
              </div>
              <p class="ml-12">Baixe o Google Authenticator ou Microsoft Authenticator na sua loja de aplicativos</p>
            </v-card>
          </v-col>
          <v-col cols="12">
            <v-card class="ma-4 pa-4">
              <div class="d-flex align-center mb-4">
                <v-chip color="primary">3</v-chip>
                <h3 class="ml-4 mb-0">Verifique o código</h3>
              </div>
              <p>Insira o código de 6 dígitos gerado pelo aplicativo.</p>
              <v-otp-input v-model="code" :loading="confirming" @finish="confirm" />
            </v-card>
          </v-col>
        </v-row>
      </v-col>
      <v-col cols="12" sm="6" class="d-flex">
        <v-card class="ma-4 pa-4 d-flex flex-column w-100">
          <div class="d-flex align-center mb-4">
            <v-chip color="primary">2</v-chip>
            <h3 class="ml-4">Escaneie o código QR</h3>
          </div>
          <p class="ml-12">Abra o app e escaneie o código abaixo para vincular sua conta</p>
          <div class="d-flex flex-grow-1 flex-column justify-center align-center pa-4">
            <div class="qr-placeholder rounded pa-4">
              <v-icon icon="mdi-qrcode" size="140" color="black" />
            </div>
            <p class="text-small text-medium-emphasis mt-2">QR code ilustrativo (demonstração)</p>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-card>

  <AppModal v-model="disableOpen" width="min(90vw, 440px)">
    <h2 class="mb-4">Confirmar desativação do MFA</h2>
    <v-tabs v-model="disableMethod" class="mb-4" density="compact" grow color="primary">
      <v-tab value="totp" class="text-caption"><v-icon icon="mdi-cellphone-key" size="16" class="mr-1" />Autenticador</v-tab>
      <v-tab value="recovery" class="text-caption"><v-icon icon="mdi-key-outline" size="16" class="mr-1" />Recuperação</v-tab>
    </v-tabs>
    <v-window v-model="disableMethod">
      <v-window-item value="totp">
        <p class="mb-4">Digite o código de 6 dígitos do seu aplicativo autenticador para desativar o MFA.</p>
        <v-otp-input v-model="disableCode" />
      </v-window-item>
      <v-window-item value="recovery">
        <p class="mb-4">Digite um dos seus códigos de recuperação para desativar o MFA.</p>
        <v-text-field v-model="recoveryInput" label="Código de recuperação" density="compact" placeholder="ex: abc12-def34" />
      </v-window-item>
    </v-window>
    <div class="mt-4">
      <v-btn variant="text" block @click="disableOpen = false">Cancelar</v-btn>
      <v-btn color="error" block :loading="disabling" class="mt-2" @click="disable">Desativar</v-btn>
    </div>
  </AppModal>

  <AppModal v-model="recoveryOpen" width="min(90vw, 440px)">
    <h2 class="mb-4">Códigos de Recuperação</h2>
    <v-alert type="warning" variant="tonal" class="mb-4" icon="mdi-shield-lock-outline">
      Guarde esses códigos com segurança. Eles podem ser necessários para recuperar o acesso à sua conta e não devem ser compartilhados.
    </v-alert>
    <div class="pa-4 rounded mb-4">
      <div v-for="(item, i) in recoveryCodes" :key="item" class="d-flex align-center mb-2">
        <v-chip color="primary" class="mr-3">{{ i + 1 }}</v-chip>
        <span class="font-monospace">{{ item }}</span>
      </div>
    </div>
    <div class="d-flex mb-3">
      <v-btn color="primary" class="flex-grow-1 mr-4" @click="copyCodes">Copiar</v-btn>
      <v-btn color="secondary" class="flex-grow-1" @click="downloadCodes">Baixar</v-btn>
    </div>
  </AppModal>
</template>

<style scoped>
.qr-placeholder {
  background: #fff;
}

.font-monospace {
  font-family: monospace;
}
</style>
