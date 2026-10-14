<script setup>
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import NewConnectionModal from '@/components/connections/NewConnectionModal.vue'
import { db } from '@/services/api'
import { getApp } from '@/services/apps'
import { toastInfo, toastSuccess } from '@/composables/useToast'

const props = defineProps({
  step: { type: Object, required: true },
  index: { type: Number, required: true },
  allSteps: { type: Array, default: () => [] },
  fluxId: { type: String, default: 'flx-demo' },
})

const emit = defineEmits(['close', 'update', 'delete'])

const CONNECTABLE_APPS = [
  'sheets',
  'whatsapp',
  'chatgpt',
  'telegram',
  'calendar',
  'trello',
  'wordpress',
  'facebook',
  'database',
  'ai_agent',
]

const newConnOpen = ref(false)
const testingModule = ref(false)
const testOutput = ref(null)

// Garante que o objeto config exista
if (!props.step.config) {
  props.step.config = {}
}

const isTrigger = computed(() => props.index === 0)
const appInfo = computed(() => getApp(props.step.app))
const requiresConnection = computed(() => CONNECTABLE_APPS.includes(props.step.app))

// Conexões disponíveis no sistema para este aplicativo
const matchingConnections = computed(() => {
  return (db.connections || []).filter((c) => c.app === props.step.app)
})

// Webhook URL calculada dinamicamente
const webhookUrl = computed(() => {
  return `https://api.fiqon.app/webhook/v1/${props.fluxId}/${props.step.id}`
})

// Variáveis dinâmicas dos passos anteriores para interpolação
const priorStepVariables = computed(() => {
  const vars = []
  for (let i = 0; i < props.index; i++) {
    const s = props.allSteps[i]
    if (!s) continue
    const prefix = s.id
    const appName = getApp(s.app).title

    if (s.app === 'webhook') {
      vars.push(
        { tag: `{{${prefix}.lead_name}}`, label: `${appName}: Nome do Lead` },
        { tag: `{{${prefix}.lead_email}}`, label: `${appName}: E-mail` },
        { tag: `{{${prefix}.telefone}}`, label: `${appName}: Telefone` },
        { tag: `{{${prefix}.valor}}`, label: `${appName}: Valor` },
      )
    } else if (s.app === 'chatgpt' || s.app === 'ai_agent') {
      vars.push(
        { tag: `{{${prefix}.response}}`, label: `${appName}: Texto de Resposta` },
      )
    } else if (s.app === 'sheets') {
      vars.push(
        { tag: `{{${prefix}.row_id}}`, label: `${appName}: ID da Linha` },
      )
    } else if (s.app === 'requester') {
      vars.push(
        { tag: `{{${prefix}.data}}`, label: `${appName}: Corpo de Resposta` },
      )
    } else {
      vars.push(
        { tag: `{{${prefix}.output}}`, label: `${appName}: Saída` },
      )
    }
  }
  return vars
})

// Auto-seleciona a primeira conexão se nenhuma estiver vinculada
watch(
  matchingConnections,
  (list) => {
    if (requiresConnection.value && !props.step.connection_id && list.length > 0) {
      props.step.connection_id = list[0].id
      emit('update')
    }
  },
  { immediate: true },
)

function onFieldChange() {
  emit('update')
}

function copyWebhook() {
  navigator.clipboard.writeText(webhookUrl.value)
  toastSuccess({ text: 'URL do Webhook copiada para a área de transferência!' })
}

function copyTag(tag) {
  navigator.clipboard.writeText(tag)
  toastInfo({ text: `Variável ${tag} copiada!` })
}

function onConnectionCreated(newConn) {
  props.step.connection_id = newConn.id
  emit('update')
}

function simulateTestModule() {
  testingModule.value = true
  testOutput.value = null
  setTimeout(() => {
    testingModule.value = false
    if (props.step.app === 'webhook') {
      testOutput.value = {
        status: 200,
        payload: {
          lead_name: 'Lucas Silva',
          lead_email: 'lucas@exemplo.com',
          telefone: '+5511987654321',
          valor: 1500,
        },
      }
    } else if (props.step.app === 'chatgpt' || props.step.app === 'ai_agent') {
      testOutput.value = {
        model: props.step.config.model || 'gpt-4o',
        response: 'Olá Lucas! Seu cadastro foi recebido com sucesso.',
        tokens: 124,
      }
    } else if (props.step.app === 'whatsapp') {
      testOutput.value = {
        sent: true,
        recipient: props.step.config.phone || '+5511987654321',
        message_id: 'wamid.HBgL...',
      }
    } else {
      testOutput.value = { ok: true, timestamp: Date.now(), executed_app: props.step.app }
    }
    toastSuccess({ title: 'Teste concluído', text: 'Módulo executado com sucesso!' })
  }, 900)
}
</script>

<template>
  <v-card class="step-drawer pa-4" elevation="10" rounded="xl">
    <!-- Top Header -->
    <div class="d-flex align-center justify-space-between mb-3">
      <div class="d-flex align-center ga-3">
        <AppIcon :app="step.app" :size="42" :rounded="10" />
        <div>
          <h3 class="text-subtitle-1 font-weight-bold line-height-tight">{{ appInfo.title }}</h3>
          <p class="text-caption text-medium-emphasis">
            Módulo {{ index + 1 }} {{ isTrigger ? '• Gatilho Inicial' : '• Ação' }}
          </p>
        </div>
      </div>
      <v-btn icon="mdi-close" variant="text" size="small" @click="emit('close')" />
    </div>

    <v-divider class="mb-4" />

    <div class="drawer-scroll-body">
      <!-- Nome / Ação descritiva do módulo -->
      <div class="mb-4">
        <label class="text-caption font-weight-bold d-block mb-1">Ação executada</label>
        <v-text-field
          v-model="step.action"
          variant="outlined"
          density="compact"
          rounded="lg"
          hide-details
          placeholder="Ex: Enviar notificação"
          @update:model-value="onFieldChange"
        />
      </div>

      <!-- Alerta de Gatilho -->
      <v-alert v-if="isTrigger" type="info" variant="tonal" density="compact" class="mb-4 text-caption">
        Este é o gatilho inicial que dispara a execução automática desta integração.
      </v-alert>

      <!-- Seletor de Conexão (se o aplicativo exigir credenciais) -->
      <div v-if="requiresConnection" class="mb-4 pa-3 bg-surface border rounded-lg">
        <div class="d-flex align-center justify-space-between mb-2">
          <label class="text-caption font-weight-bold d-flex align-center ga-1">
            <v-icon icon="mdi-key-outline" size="16" color="primary" />
            Conexão vinculada
          </label>
          <v-btn
            size="x-small"
            variant="text"
            color="primary"
            prepend-icon="mdi-plus"
            @click="newConnOpen = true"
          >
            Adicionar conta
          </v-btn>
        </div>

        <v-select
          v-if="matchingConnections.length > 0"
          v-model="step.connection_id"
          :items="matchingConnections"
          item-title="name"
          item-value="id"
          density="compact"
          variant="outlined"
          rounded="lg"
          hide-details
          @update:model-value="onFieldChange"
        >
          <template #item="{ props: itemProps, item }">
            <v-list-item v-bind="itemProps" :title="item.raw.name" :subtitle="item.raw.connection_config">
              <template #append>
                <v-icon icon="mdi-check-circle" size="16" color="success" />
              </template>
            </v-list-item>
          </template>
        </v-select>

        <v-alert v-else type="warning" variant="tonal" density="compact" class="text-caption">
          Nenhuma conexão encontrada para {{ appInfo.title }}.
          <v-btn size="x-small" color="warning" variant="flat" class="mt-1 d-block" @click="newConnOpen = true">
            Conectar conta agora
          </v-btn>
        </v-alert>
      </div>

      <!-- Formulários de Configuração Específicos por App -->
      <div class="app-config-fields mb-4">
        <!-- 1. WEBHOOK -->
        <template v-if="step.app === 'webhook'">
          <div class="mb-3">
            <label class="text-caption font-weight-bold d-block mb-1">URL do Webhook</label>
            <div class="d-flex ga-2">
              <v-text-field
                :model-value="webhookUrl"
                readonly
                variant="outlined"
                density="compact"
                rounded="lg"
                hide-details
                bg-color="background"
                class="font-monospace text-caption"
              />
              <v-btn color="primary" variant="tonal" icon="mdi-content-copy" density="comfortable" @click="copyWebhook">
                <v-icon icon="mdi-content-copy" />
                <v-tooltip activator="parent" location="top">Copiar Webhook</v-tooltip>
              </v-btn>
            </div>
          </div>

          <div class="mb-3">
            <label class="text-caption font-weight-bold d-block mb-1">Método HTTP</label>
            <v-select
              v-model="step.config.method"
              :items="['POST', 'GET', 'PUT']"
              density="compact"
              variant="outlined"
              rounded="lg"
              hide-details
              @update:model-value="onFieldChange"
            />
          </div>
        </template>

        <!-- 2. SCHEDULER -->
        <template v-else-if="step.app === 'scheduler'">
          <div class="mb-3">
            <label class="text-caption font-weight-bold d-block mb-1">Periodicidade / Intervalo</label>
            <v-select
              v-model="step.config.interval"
              :items="[
                'A cada 15 minutos',
                'A cada 30 minutos',
                'A cada 1 hora',
                'Diariamente às 09:00',
                'Diariamente às 18:00',
                'Toda segunda-feira às 08:00',
                'Mensalmente no dia 1',
              ]"
              density="compact"
              variant="outlined"
              rounded="lg"
              hide-details
              @update:model-value="onFieldChange"
            />
          </div>
        </template>

        <!-- 3. CHATGPT / AGENTE IA -->
        <template v-else-if="step.app === 'chatgpt' || step.app === 'ai_agent'">
          <div class="mb-3">
            <label class="text-caption font-weight-bold d-block mb-1">Modelo de IA</label>
            <v-select
              v-model="step.config.model"
              :items="['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet', 'deepseek-v3']"
              density="compact"
              variant="outlined"
              rounded="lg"
              hide-details
              @update:model-value="onFieldChange"
            />
          </div>

          <div class="mb-3">
            <label class="text-caption font-weight-bold d-block mb-1">Instruções do Sistema (System)</label>
            <v-textarea
              v-model="step.config.system_prompt"
              rows="2"
              variant="outlined"
              density="compact"
              rounded="lg"
              placeholder="Ex: Você é um assistente de vendas..."
              hide-details
              @update:model-value="onFieldChange"
            />
          </div>

          <div class="mb-3">
            <label class="text-caption font-weight-bold d-block mb-1">Prompt / Mensagem do Usuário</label>
            <v-textarea
              v-model="step.config.user_prompt"
              rows="3"
              variant="outlined"
              density="compact"
              rounded="lg"
              placeholder="Ex: Analise o lead {{s1.lead_name}} e resuma os interesses."
              hide-details
              @update:model-value="onFieldChange"
            />
          </div>
        </template>

        <!-- 4. WHATSAPP -->
        <template v-else-if="step.app === 'whatsapp'">
          <div class="mb-3">
            <label class="text-caption font-weight-bold d-block mb-1">Telefone do Destinatário</label>
            <v-text-field
              v-model="step.config.phone"
              placeholder="Ex: {{s1.telefone}} ou 5511999998888"
              variant="outlined"
              density="compact"
              rounded="lg"
              hide-details
              @update:model-value="onFieldChange"
            />
          </div>

          <div class="mb-3">
            <label class="text-caption font-weight-bold d-block mb-1">Mensagem a Enviar</label>
            <v-textarea
              v-model="step.config.message"
              rows="3"
              placeholder="Olá {{s1.lead_name}}! Recebemos sua solicitação com sucesso."
              variant="outlined"
              density="compact"
              rounded="lg"
              hide-details
              @update:model-value="onFieldChange"
            />
          </div>
        </template>

        <!-- 5. GOOGLE SHEETS -->
        <template v-else-if="step.app === 'sheets'">
          <div class="mb-3">
            <label class="text-caption font-weight-bold d-block mb-1">Planilha</label>
            <v-select
              v-model="step.config.sheet"
              :items="['Planilha de Leads 2026', 'Controle Financeiro', 'Vendas E-commerce']"
              density="compact"
              variant="outlined"
              rounded="lg"
              hide-details
              @update:model-value="onFieldChange"
            />
          </div>

          <div class="mb-3">
            <label class="text-caption font-weight-bold d-block mb-1">Aba / Página</label>
            <v-text-field
              v-model="step.config.tab"
              placeholder="Ex: Página 1"
              variant="outlined"
              density="compact"
              rounded="lg"
              hide-details
              @update:model-value="onFieldChange"
            />
          </div>

          <div class="mb-3">
            <label class="text-caption font-weight-bold d-block mb-1">Mapeamento de Linha (Colunas)</label>
            <v-text-field
              v-model="step.config.row_values"
              placeholder="Ex: {{s1.lead_name}}, {{s1.lead_email}}, {{s1.valor}}"
              variant="outlined"
              density="compact"
              rounded="lg"
              hide-details
              @update:model-value="onFieldChange"
            />
          </div>
        </template>

        <!-- 6. FILTRO -->
        <template v-else-if="step.app === 'filter'">
          <div class="mb-3">
            <label class="text-caption font-weight-bold d-block mb-1">Campo a Avaliar</label>
            <v-text-field
              v-model="step.config.field"
              placeholder="Ex: {{s1.valor}} ou {{s1.lead_email}}"
              variant="outlined"
              density="compact"
              rounded="lg"
              hide-details
              @update:model-value="onFieldChange"
            />
          </div>

          <div class="mb-3">
            <label class="text-caption font-weight-bold d-block mb-1">Operador de Condição</label>
            <v-select
              v-model="step.config.operator"
              :items="[
                { title: 'igual a (=)', value: 'eq' },
                { title: 'diferente de (≠)', value: 'neq' },
                { title: 'maior que (>)', value: 'gt' },
                { title: 'maior ou igual a (≥)', value: 'gte' },
                { title: 'menor que (<)', value: 'lt' },
                { title: 'contém texto', value: 'contains' },
                { title: 'está preenchido', value: 'filled' },
              ]"
              density="compact"
              variant="outlined"
              rounded="lg"
              hide-details
              @update:model-value="onFieldChange"
            />
          </div>

          <div class="mb-3">
            <label class="text-caption font-weight-bold d-block mb-1">Valor de Comparação</label>
            <v-text-field
              v-model="step.config.value"
              placeholder="Ex: 1000"
              variant="outlined"
              density="compact"
              rounded="lg"
              hide-details
              @update:model-value="onFieldChange"
            />
          </div>
        </template>

        <!-- 7. DELAY -->
        <template v-else-if="step.app === 'delay'">
          <div class="d-flex ga-2 mb-3">
            <div class="flex-grow-1">
              <label class="text-caption font-weight-bold d-block mb-1">Tempo de espera</label>
              <v-text-field
                v-model.number="step.config.amount"
                type="number"
                min="1"
                placeholder="5"
                variant="outlined"
                density="compact"
                rounded="lg"
                hide-details
                @update:model-value="onFieldChange"
              />
            </div>
            <div style="width: 140px">
              <label class="text-caption font-weight-bold d-block mb-1">Unidade</label>
              <v-select
                v-model="step.config.unit"
                :items="['Segundos', 'Minutos', 'Horas', 'Dias']"
                density="compact"
                variant="outlined"
                rounded="lg"
                hide-details
                @update:model-value="onFieldChange"
              />
            </div>
          </div>
        </template>

        <!-- 8. REQUESTER (HTTP) -->
        <template v-else-if="step.app === 'requester'">
          <div class="mb-3">
            <label class="text-caption font-weight-bold d-block mb-1">Método e URL</label>
            <div class="d-flex ga-2">
              <v-select
                v-model="step.config.http_method"
                :items="['GET', 'POST', 'PUT', 'DELETE', 'PATCH']"
                style="max-width: 110px"
                density="compact"
                variant="outlined"
                rounded="lg"
                hide-details
                @update:model-value="onFieldChange"
              />
              <v-text-field
                v-model="step.config.url"
                placeholder="https://api.servico.com/v1"
                variant="outlined"
                density="compact"
                rounded="lg"
                hide-details
                class="flex-grow-1"
                @update:model-value="onFieldChange"
              />
            </div>
          </div>

          <div class="mb-3">
            <label class="text-caption font-weight-bold d-block mb-1">JSON Body</label>
            <v-textarea
              v-model="step.config.body"
              rows="3"
              placeholder="{ &quot;email&quot;: &quot;{{s1.lead_email}}&quot; }"
              variant="outlined"
              density="compact"
              rounded="lg"
              hide-details
              class="font-monospace text-caption"
              @update:model-value="onFieldChange"
            />
          </div>
        </template>

        <!-- 9. CÓDIGO JAVASCRIPT -->
        <template v-else-if="step.app === 'code'">
          <div class="mb-3">
            <label class="text-caption font-weight-bold d-block mb-1">Script JavaScript</label>
            <v-textarea
              v-model="step.config.code_snippet"
              rows="4"
              placeholder="// return { resultado: input.valor * 2 };"
              variant="outlined"
              density="compact"
              rounded="lg"
              hide-details
              class="font-monospace text-caption"
              @update:model-value="onFieldChange"
            />
          </div>
        </template>

        <!-- 10. TELEGRAM BOT -->
        <template v-else-if="step.app === 'telegram'">
          <div class="mb-3">
            <label class="text-caption font-weight-bold d-block mb-1">Chat ID / Canal</label>
            <v-text-field
              v-model="step.config.chat_id"
              placeholder="Ex: -100123456789 ou @meucanal"
              variant="outlined"
              density="compact"
              rounded="lg"
              hide-details
              @update:model-value="onFieldChange"
            />
          </div>
          <div class="mb-3">
            <label class="text-caption font-weight-bold d-block mb-1">Mensagem</label>
            <v-textarea
              v-model="step.config.message"
              rows="3"
              placeholder="Novo lead registrado: {{s1.lead_name}}"
              variant="outlined"
              density="compact"
              rounded="lg"
              hide-details
              @update:model-value="onFieldChange"
            />
          </div>
        </template>
      </div>

      <!-- Helper de Variáveis Anteriores (Tags Interativas) -->
      <div v-if="priorStepVariables.length > 0" class="mb-4 pa-3 bg-surface border rounded-lg">
        <div class="d-flex align-center ga-1 mb-2">
          <v-icon icon="mdi-code-braces" size="16" color="primary" />
          <span class="text-caption font-weight-bold">Variáveis disponíveis dos passos anteriores</span>
        </div>
        <p class="text-small text-medium-emphasis mb-2">
          Clique para copiar e colar em qualquer campo deste módulo:
        </p>
        <div class="d-flex flex-wrap ga-1">
          <v-chip
            v-for="v in priorStepVariables"
            :key="v.tag"
            size="small"
            variant="tonal"
            color="primary"
            class="cursor-pointer"
            @click="copyTag(v.tag)"
          >
            {{ v.tag }}
            <v-tooltip activator="parent" location="top">{{ v.label }} (clique para copiar)</v-tooltip>
          </v-chip>
        </div>
      </div>

      <!-- Simulação de Teste do Módulo -->
      <div class="mb-4">
        <v-btn
          color="primary"
          variant="tonal"
          block
          rounded="lg"
          prepend-icon="mdi-play-circle-outline"
          :loading="testingModule"
          @click="simulateTestModule"
        >
          Testar este módulo
        </v-btn>

        <div v-if="testOutput" class="mt-2 pa-2 bg-background border rounded-lg font-monospace text-caption">
          <div class="d-flex align-center justify-space-between mb-1">
            <b class="text-success">Sucesso (200 OK)</b>
            <span class="text-medium-emphasis">saída simulada</span>
          </div>
          <pre style="max-height: 120px; overflow-y: auto">{{ JSON.stringify(testOutput, null, 2) }}</pre>
        </div>
      </div>

      <!-- Exclusão de Módulo (se não for gatilho) -->
      <div v-if="!isTrigger" class="pt-2">
        <v-btn color="error" variant="text" block rounded="lg" prepend-icon="mdi-delete-outline" @click="emit('delete')">
          Excluir módulo
        </v-btn>
      </div>
    </div>

    <!-- Modal de Nova Conexão Aberto sob Demanda -->
    <NewConnectionModal
      v-model="newConnOpen"
      :initial-app="step.app"
      @created="onConnectionCreated"
    />
  </v-card>
</template>

<style scoped>
.step-drawer {
  position: absolute;
  right: 32px;
  top: 96px;
  width: 400px;
  max-height: calc(100vh - 120px);
  z-index: 6;
  display: flex;
  flex-direction: column;
}

.drawer-scroll-body {
  overflow-y: auto;
  padding-right: 4px;
}

.line-height-tight {
  line-height: 1.2;
}

.font-monospace {
  font-family: monospace;
}
</style>
