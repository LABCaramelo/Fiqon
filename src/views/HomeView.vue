<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import FluxButtonCreateNew from '@/components/home/FluxButtonCreateNew.vue'
import FluxAIBuilder from '@/components/home/FluxAIBuilder.vue'
import HorizontalFluxList from '@/components/home/HorizontalFluxList.vue'
import UserAppConnList from '@/components/home/UserAppConnList.vue'
import { db, orgFluxes } from '@/services/api'
import { isUnlimited } from '@/utils/subscription'
import { useSession } from '@/composables/useSession'

const router = useRouter()
const { user } = useSession()
const loaded = ref(false)

// O original busca a assinatura da organização ao abrir a página.
onMounted(() => setTimeout(() => (loaded.value = true), 300))

const subscription = computed(() => db.subscription)
const unlimited = computed(() => isUnlimited(subscription.value))
const usedPercent = computed(() => {
  const sub = subscription.value
  if (!sub) return 0
  return Math.min((sub.quantity_used / sub.quantity_plan) * 100, 100)
})
const remaining = computed(() => (subscription.value ? Math.max(0, subscription.value.quantity_plan - subscription.value.quantity_used) : 0))
const renewsAt = computed(() => {
  const end = subscription.value?.plan_current_period_end
  if (!end) return ''
  const date = new Date(end * 1000)
  const month = date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '')
  return `${date.getDate()}/${month}`
})

const formatNumber = (n) => n.toLocaleString('pt-BR')
const shortNumber = (n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n))

function goToPlans() {
  router.push('/profile?section=plan')
}

function showAllConnections() {
  router.push({ query: { tab: 'conexoes' } })
}
</script>

<template>
  <div class="page-padding">
    <div class="d-flex align-center justify-space-between mb-4">
      <h2>Olá, {{ user?.fullname }} 👋</h2>
      <FluxButtonCreateNew />
    </div>

    <div class="mb-6">
      <v-card v-if="loaded && subscription">
        <div class="pa-4 d-flex align-center flex-wrap ga-4">
          <div class="d-flex align-center ga-3">
            <h2>{{ subscription.plan_name }}</h2>
          </div>
          <v-spacer />
          <div class="d-flex align-center ga-2">
            <v-icon size="18" icon="mdi-lan-connect" />
            <span>Integrações</span>
            <b>{{ orgFluxes().length }}</b>
          </div>
          <v-divider vertical />
          <div class="d-flex align-center ga-2">
            <v-icon size="18" icon="mdi-calendar-refresh-outline" />
            <span>Renova em <b class="text-on-surface">{{ renewsAt }}</b></span>
          </div>
          <v-btn v-if="!unlimited" color="primary" variant="outlined" prepend-icon="mdi-crown" rounded="lg" @click="goToPlans">
            Fazer upgrade
          </v-btn>
        </div>
        <v-divider />
        <div class="pa-4">
          <div class="d-flex align-center ga-2 mb-2">
            <span class="d-flex align-center ga-1">
              Operações executadas
              <v-icon color="info" size="14" icon="mdi-information-outline">
                <v-tooltip activator="parent" location="top">O total de operações utilizados e o limite de operações do seu plano</v-tooltip>
              </v-icon>
            </span>
            <v-spacer />
            <span class="d-inline-flex align-center ga-2">
              <span class="text-no-wrap">
                <b>{{ formatNumber(subscription.quantity_used) }}</b>
                <span>
                  /
                  <v-icon v-if="unlimited" icon="mdi-all-inclusive" size="18" />
                  <template v-else>{{ formatNumber(subscription.quantity_plan) }}</template>
                </span>
              </span>
              <b v-if="!unlimited" class="text-primary">{{ usedPercent.toFixed(1) }}%</b>
            </span>
          </div>
          <template v-if="!unlimited">
            <v-progress-linear :model-value="usedPercent" color="progressbar" height="8" rounded />
            <div class="d-flex justify-space-between align-center mt-1">
              <small class="text-disabled">0</small>
              <small>— Restam {{ formatNumber(remaining) }} operações —</small>
              <small class="text-disabled">{{ shortNumber(subscription.quantity_plan) }}</small>
            </div>
          </template>
        </div>
      </v-card>

      <v-alert v-else-if="loaded" class="mb-4" color="warning" variant="tonal">
        <div class="d-flex align-center justify-space-between">
          <span>Nenhuma assinatura encontrada! Contrate um plano para ativar suas integrações.</span>
          <v-btn class="pa-1" variant="text" size="medium" @click="goToPlans">
            Ser Premium
            <v-icon class="ml-2" icon="mdi-crown" />
          </v-btn>
        </div>
      </v-alert>

      <v-skeleton-loader v-else class="mb-4" type="article" />
    </div>

    <div class="mb-6">
      <FluxAIBuilder />
    </div>

    <v-row>
      <v-col cols="12" lg="9" xl="9" xxl="10">
        <HorizontalFluxList />
      </v-col>
      <v-col cols="12" lg="3" xl="3" xxl="2">
        <div class="sticky-element">
          <v-card class="pa-5">
            <h2 class="mb-4">Conexões</h2>
            <p class="mb-4">Gerencie suas conexões</p>
            <UserAppConnList :max-items="5" />
            <v-btn class="mt-3" color="primary" variant="tonal" rounded="md" block append-icon="mdi-arrow-right" @click="showAllConnections">
              Ver todas as conexões
            </v-btn>
          </v-card>
        </div>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.page-padding {
  padding: 60px;
}

.sticky-element {
  position: sticky;
  top: 24px;
}

@media (max-width: 960px) {
  .page-padding {
    padding: 24px 16px;
  }
}
</style>
