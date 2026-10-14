<script setup>
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import TypingDots from '@/components/TypingDots.vue'
import { buildFluxFromPrompt, createFlux } from '@/services/api'
import { getApp } from '@/services/apps'
import { toastError, toastSuccess } from '@/composables/useToast'

// O original conversa com um agente via WebSocket. Aqui o "agente" é local:
// monta um rascunho de fluxo por palavras-chave e pede confirmação antes de criar.
const router = useRouter()
const messages = ref([])
const newMessage = ref('')
const isTyping = ref(false)
const building = ref(false)
const processMessage = ref('')
const processingStep = ref('idle')
const progress = ref(0)
const container = useTemplateRef('container')

let draft = null
let promptHistory = ''
let seq = 0

const indeterminate = computed(() => building.value && processingStep.value !== 'final')

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function scrollToBottom() {
  await nextTick()
  if (container.value) container.value.scrollTop = container.value.scrollHeight
}

function push(role, body) {
  messages.value.push({ id: ++seq, role, body })
  scrollToBottom()
}

async function sendMessage() {
  const text = newMessage.value?.trim()
  if (!text || isTyping.value) return
  push('user', text)
  newMessage.value = ''
  isTyping.value = true
  await wait(900)
  isTyping.value = false

  if (draft && /^(sim|s|ok|pode|confirmo|isso|perfeito|cria|crie)\b/i.test(text)) {
    build()
    return
  }

  promptHistory = `${promptHistory} ${text}`.trim()
  draft = await buildFluxFromPrompt(promptHistory)
  const chain = draft.steps.map((s) => getApp(s.app).title).join(' → ')
  push(
    'bot',
    `Entendi! Vou montar a integração "${draft.name}" com os passos:\n${chain}\n\nPosso criar? Responda "sim" para confirmar ou descreva o que deseja ajustar.`,
  )
}

async function build() {
  building.value = true
  processingStep.value = 'architect'
  processMessage.value = 'Projetando fluxo...'
  progress.value = 0
  await wait(1200)
  processingStep.value = 'specialist'
  processMessage.value = 'Configurando os aplicativos...'
  progress.value = 60
  await wait(1200)
  processingStep.value = 'final'
  progress.value = 100
  try {
    const flux = await createFlux({ name: draft.name, steps: draft.steps })
    toastSuccess({ text: 'Integração criada com sucesso!' })
    await wait(800)
    router.push({ name: 'flux', params: { fluxId: flux.id } })
  } catch {
    toastError({ text: 'Falha ao criar a integração a partir do Builder.' })
    building.value = false
  }
}

function onEnter(event) {
  if (event.shiftKey) return
  event.preventDefault()
  sendMessage()
}
</script>

<template>
  <v-card>
    <template #title>
      <div v-if="!building" class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <h4 class="gradient-text">Construa suas integrações com IA</h4>
          <v-icon class="ml-2 gradient-icon" size="18" icon="mdi-auto-fix" />
        </div>
        <v-chip color="purple" size="small">BETA</v-chip>
      </div>
    </template>

    <v-divider v-if="!building" />

    <div v-if="!building" ref="container" class="messages-container pa-6">
      <div v-if="messages.length === 0 && !isTyping" class="text-center">
        <v-icon size="64" color="primary" icon="custom:fiqon-logo" />
        <h3 class="mt-2 mb-1 gradient-text">Olá! O que você quer integrar hoje?</h3>
      </div>

      <div
        v-for="message in messages"
        :key="message.id"
        class="d-flex mb-4"
        :class="message.role === 'bot' ? 'message-received justify-start' : 'justify-end'"
      >
        <div v-if="message.role === 'bot'">
          <v-btn icon border class="mr-2 mt-2" size="small">
            <v-icon color="primary" icon="custom:fiqon-logo" />
          </v-btn>
        </div>
        <div class="message-bubble pa-3 pl-4 pr-4">
          <p class="mb-0 text-prewrap">{{ message.body }}</p>
        </div>
      </div>

      <div v-if="isTyping" class="d-flex mt-4 message-received justify-start">
        <div>
          <v-btn icon border class="mr-2 mt-2" size="small">
            <v-icon color="primary" icon="custom:fiqon-logo" />
          </v-btn>
        </div>
        <div class="message-bubble px-4 py-2 mt-2">
          <TypingDots />
        </div>
      </div>
    </div>

    <div v-if="!building" class="pa-2">
      <v-textarea
        v-model="newMessage"
        placeholder="Digite sua mensagem..."
        clearable
        hide-details
        auto-grow
        rows="1"
        :max-rows="8"
        no-resize
        @keydown.enter="onEnter"
      >
        <template #append-inner>
          <v-btn color="primary" :disabled="!newMessage?.trim() || isTyping" min-width="40" @click="sendMessage">
            <v-icon icon="mdi-send" />
          </v-btn>
        </template>
      </v-textarea>
    </div>

    <div v-if="building" class="text-center pa-5">
      <div v-if="processingStep !== 'final'">
        <h3 class="gradient-text">{{ processMessage || 'Estamos criando sua integração...' }}</h3>
        <p>Aguarde um momento enquanto a mágica acontece!</p>
      </div>
      <div v-else class="d-flex flex-column align-center justify-center mt-2 mb-6">
        <div class="d-flex align-center">
          <h2 class="gradient-text">Concluído!</h2>
          <v-icon class="ml-1" color="primary" size="32" icon="mdi-check-circle" />
        </div>
        <p>Aguarde enquanto te redirecionamos para o fluxo...</p>
      </div>
      <div class="d-flex justify-center my-8">
        <div class="hex-wrap" :class="{ 'rotate-icon': processingStep !== 'final' }">
          <span class="hex-bg" />
          <v-icon size="48" color="primary" icon="custom:fiqon-logo" />
        </div>
      </div>
      <v-progress-linear class="mt-4" :model-value="progress" :indeterminate="indeterminate" color="primary" height="10" rounded />
    </div>
  </v-card>
</template>

<style scoped>
.gradient-text {
  background: linear-gradient(90deg, rgb(var(--v-theme-purple)), rgb(var(--v-theme-indigo)));
  -webkit-text-fill-color: transparent;
  -webkit-background-clip: text;
  background-clip: text;
}

.gradient-icon {
  color: rgb(var(--v-theme-indigo));
}

.messages-container {
  max-height: 300px;
  overflow-y: auto;
}

.message-bubble {
  background-color: rgb(var(--v-theme-background));
  border-radius: 15px 15px 0;
  border: 1px solid color-mix(in srgb, rgb(var(--v-theme-on-background)), transparent 80%);
  max-width: 60%;
  word-wrap: break-word;
}

.message-received .message-bubble {
  background-color: rgb(var(--v-theme-surface));
  border: none;
}

.text-prewrap {
  white-space: pre-wrap;
}

.hex-wrap {
  position: relative;
  width: 100px;
  height: 100px;
  display: grid;
  place-items: center;
  transform-style: preserve-3d;
  filter: drop-shadow(0 1px 4px color-mix(in srgb, rgb(var(--v-theme-on-background)), transparent 75%));
}

.hex-bg {
  position: absolute;
  inset: 0;
  background: rgb(var(--v-theme-surface));
  clip-path: polygon(50% 0%, 97% 25%, 97% 75%, 50% 100%, 3% 75%, 3% 25%);
  z-index: 0;
}

.hex-wrap .v-icon {
  position: relative;
  z-index: 1;
  backface-visibility: hidden;
}

.rotate-icon {
  animation: flip 1.3s ease-in-out infinite;
}

@keyframes flip {
  0% { transform: rotateY(0); }
  70% { transform: rotateY(-180deg); }
  100% { transform: rotateY(-180deg); }
}
</style>
