<script setup>
import { computed, ref, watch } from 'vue'
import AppModal from '@/components/AppModal.vue'
import AppIcon from '@/components/AppIcon.vue'
import { APPS } from '@/services/apps'
import { createConnection } from '@/services/api'
import { toastError, toastSuccess } from '@/composables/useToast'
import { required } from '@/utils/rules'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  initialApp: { type: String, default: null },
})

const emit = defineEmits(['update:modelValue', 'created'])

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

// Lista de aplicativos que suportam conexão
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

const appItems = CONNECTABLE_APPS.map((key) => ({
  value: key,
  title: APPS[key]?.title || key,
  icon: APPS[key]?.icon,
  bg: APPS[key]?.bg,
  fg: APPS[key]?.fg,
}))

const selectedApp = ref(props.initialApp || 'sheets')
const name = ref('')
const authType = ref('API Key')
const apiKey = ref('')
const phone = ref('')
const botToken = ref('')
const connectionString = ref('')
const oauthConnected = ref(false)
const saving = ref(false)

watch(
  () => props.initialApp,
  (val) => {
    if (val && CONNECTABLE_APPS.includes(val)) {
      selectedApp.value = val
    }
  },
  { immediate: true },
)

watch(
  selectedApp,
  (app) => {
    oauthConnected.value = false
    apiKey.value = ''
    phone.value = ''
    botToken.value = ''
    connectionString.value = ''

    if (app === 'sheets' || app === 'calendar') {
      authType.value = 'OAuth2'
      name.value = `${APPS[app]?.title} Conta Google`
    } else if (app === 'whatsapp') {
      authType.value = 'QR Code'
      name.value = 'WhatsApp Business Principal'
    } else if (app === 'chatgpt' || app === 'ai_agent') {
      authType.value = 'API Key'
      name.value = 'Chave OpenAI Produção'
    } else if (app === 'telegram') {
      authType.value = 'Bot Token'
      name.value = 'Bot de Notificações'
    } else if (app === 'database') {
      authType.value = 'Connection String'
      name.value = 'Supabase / PostgreSQL'
    } else {
      authType.value = 'API Key'
      name.value = `${APPS[app]?.title || 'Nova'} Conexão`
    }
  },
  { immediate: true },
)

function simulateOAuth() {
  saving.value = true
  setTimeout(() => {
    saving.value = false
    oauthConnected.value = true
    toastSuccess({ text: 'Conta Google autorizada com sucesso!' })
  }, 1000)
}

function simulateQrCode() {
  saving.value = true
  setTimeout(() => {
    saving.value = false
    oauthConnected.value = true
    phone.value = '+55 (11) 98765-4321'
    toastSuccess({ text: 'WhatsApp conectado via QR Code com sucesso!' })
  }, 1200)
}

async function save() {
  if (required(name.value) !== true) {
    toastError({ text: 'Informe um nome para a conexão.' })
    return
  }

  saving.value = true
  try {
    const creds = {
      apiKey: apiKey.value || undefined,
      phone: phone.value || undefined,
      botToken: botToken.value || undefined,
      connectionString: connectionString.value || undefined,
      oauthConnected: oauthConnected.value,
    }

    const created = await createConnection({
      name: name.value.trim(),
      app: selectedApp.value,
      connection_config: authType.value,
      credentials: creds,
    })

    toastSuccess({
      title: 'Conexão criada',
      text: `A conexão "${created.name}" foi verificada e salva!`,
      icon: 'mdi-check-circle-outline',
    })

    emit('created', created)
    open.value = false
  } catch (error) {
    toastError({ text: error.userMessage || 'Falha ao criar conexão.' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppModal v-model="open" width="min(92vw, 560px)">
    <div class="d-flex align-center ga-3 mb-4">
      <v-avatar color="primary" variant="tonal" rounded="lg" size="44">
        <v-icon icon="mdi-link-variant-plus" size="24" />
      </v-avatar>
      <div>
        <h2 class="text-h6 font-weight-bold">Nova Conexão de Aplicativo</h2>
        <p class="text-small text-medium-emphasis">Conecte sua conta para usar nas automações</p>
      </div>
    </div>

    <v-form @submit.prevent="save">
      <!-- Seletor de Aplicativo -->
      <div class="mb-4">
        <label class="text-caption font-weight-bold d-block mb-1">Aplicativo</label>
        <v-select
          v-model="selectedApp"
          :items="appItems"
          item-title="title"
          item-value="value"
          variant="outlined"
          density="comfortable"
          hide-details
          rounded="lg"
        >
          <template #selection="{ item }">
            <div class="d-flex align-center ga-2">
              <AppIcon :app="item.value" :size="24" :rounded="4" />
              <span>{{ item.title }}</span>
            </div>
          </template>
          <template #item="{ props: itemProps, item }">
            <v-list-item v-bind="itemProps" :title="item.title">
              <template #prepend>
                <AppIcon :app="item.value" :size="24" :rounded="4" class="mr-2" />
              </template>
            </v-list-item>
          </template>
        </v-select>
      </div>

      <!-- Nome da Conexão -->
      <div class="mb-4">
        <label class="text-caption font-weight-bold d-block mb-1">Nome identificador da conexão</label>
        <v-text-field
          v-model="name"
          placeholder="Ex: Planilha de Leads 2026"
          variant="outlined"
          density="comfortable"
          hide-details
          rounded="lg"
        />
      </div>

      <!-- Configuração de Credencial de acordo com o App -->
      <v-card variant="tonal" color="surface" class="pa-4 mb-5 border rounded-lg">
        <div class="d-flex align-center ga-2 mb-3">
          <v-icon icon="mdi-shield-key-outline" size="18" color="primary" />
          <span class="text-caption font-weight-bold text-uppercase">Autenticação ({{ authType }})</span>
        </div>

        <!-- Google OAuth2 -->
        <template v-if="selectedApp === 'sheets' || selectedApp === 'calendar'">
          <p class="text-small text-medium-emphasis mb-3">
            A FiqOn requer permissão para ler e escrever em sua conta Google através do protocolo oficial OAuth2.
          </p>
          <v-btn
            v-if="!oauthConnected"
            color="primary"
            variant="flat"
            rounded="lg"
            block
            prepend-icon="mdi-google"
            :loading="saving"
            @click="simulateOAuth"
          >
            Conectar conta Google
          </v-btn>
          <v-alert v-else type="success" variant="tonal" density="compact" icon="mdi-check-circle">
            Conta <b>contato@empresa.com</b> autorizada e ativa.
          </v-alert>
        </template>

        <!-- WhatsApp -->
        <template v-else-if="selectedApp === 'whatsapp'">
          <div class="d-flex ga-2 mb-3">
            <v-btn
              size="small"
              :variant="authType === 'QR Code' ? 'flat' : 'outlined'"
              color="primary"
              @click="authType = 'QR Code'"
            >
              QR Code (Instância Web)
            </v-btn>
            <v-btn
              size="small"
              :variant="authType === 'Token' ? 'flat' : 'outlined'"
              color="primary"
              @click="authType = 'Token'"
            >
              Cloud API Token
            </v-btn>
          </div>

          <div v-if="authType === 'QR Code'" class="text-center py-2">
            <p class="text-small text-medium-emphasis mb-3">
              Abra o WhatsApp no celular > Aparelhos conectados > Conectar um aparelho.
            </p>
            <v-btn
              v-if="!oauthConnected"
              color="primary"
              variant="tonal"
              prepend-icon="mdi-qrcode-scan"
              :loading="saving"
              @click="simulateQrCode"
            >
              Simular Leitura de QR Code
            </v-btn>
            <v-alert v-else type="success" variant="tonal" density="compact" icon="mdi-whatsapp">
              WhatsApp <b>{{ phone }}</b> sincronizado!
            </v-alert>
          </div>

          <div v-else>
            <v-text-field
              v-model="apiKey"
              label="Token de Acesso (Meta Business)"
              placeholder="EAABwz..."
              variant="outlined"
              density="compact"
              type="password"
              rounded="lg"
              hide-details
            />
          </div>
        </template>

        <!-- ChatGPT / Agente IA -->
        <template v-else-if="selectedApp === 'chatgpt' || selectedApp === 'ai_agent'">
          <p class="text-small text-medium-emphasis mb-2">
            Insira sua chave de API gerada na plataforma da OpenAI ou Anthropic.
          </p>
          <v-text-field
            v-model="apiKey"
            label="API Key"
            placeholder="sk-proj-..."
            variant="outlined"
            density="compact"
            type="password"
            rounded="lg"
            hide-details
          />
        </template>

        <!-- Telegram -->
        <template v-else-if="selectedApp === 'telegram'">
          <p class="text-small text-medium-emphasis mb-2">
            Token gerado pelo <b>@BotFather</b> no Telegram.
          </p>
          <v-text-field
            v-model="botToken"
            label="HTTP Bot API Token"
            placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
            variant="outlined"
            density="compact"
            rounded="lg"
            hide-details
          />
        </template>

        <!-- Banco de Dados -->
        <template v-else-if="selectedApp === 'database'">
          <v-text-field
            v-model="connectionString"
            label="URL de Conexão (PostgreSQL / Supabase / MySQL)"
            placeholder="postgres://user:password@host:5432/database"
            variant="outlined"
            density="compact"
            rounded="lg"
            hide-details
          />
        </template>

        <!-- Genérico API Key -->
        <template v-else>
          <v-text-field
            v-model="apiKey"
            label="Chave de API / Token"
            placeholder="Inserir token ou credencial"
            variant="outlined"
            density="compact"
            type="password"
            rounded="lg"
            hide-details
          />
        </template>
      </v-card>

      <!-- Botões de Ação -->
      <div class="d-flex justify-end ga-3">
        <v-btn variant="text" rounded="lg" :disabled="saving" @click="open = false">
          Cancelar
        </v-btn>
        <v-btn color="primary" variant="flat" rounded="lg" type="submit" :loading="saving" prepend-icon="mdi-check">
          Salvar Conexão
        </v-btn>
      </div>
    </v-form>
  </AppModal>
</template>
