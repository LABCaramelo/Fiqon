<script setup>
import { computed, reactive, ref, useTemplateRef, watch } from 'vue'
import AppModal from '@/components/AppModal.vue'
import { addPaymentMethod, deletePaymentMethod, listPaymentMethods, setDefaultPaymentMethod } from '@/services/api'
import { cardBrand } from '@/utils/billing'
import { lengthBetween, required } from '@/utils/rules'
import { toastError, toastSuccess } from '@/composables/useToast'

const model = defineModel({ type: Boolean, default: false })

const BRAND_ICONS = {
  visa: 'mdi-credit-card',
  mastercard: 'mdi-credit-card',
  amex: 'mdi-credit-card',
  elo: 'mdi-credit-card',
  hipercard: 'mdi-credit-card',
  discover: 'mdi-credit-card',
  diners: 'mdi-credit-card',
  jcb: 'mdi-credit-card',
  unknown: 'mdi-credit-card-outline',
}

const cards = ref([])
const loadingCards = ref(false)
const addOpen = ref(false)
const saving = ref(false)
const showBack = ref(false)
const form = useTemplateRef('form')
const card = reactive({ holderName: '', number: '', expiry: '', cvv: '' })

const onlyNumbers = (v) => (/^\d*$/.test(String(v ?? '').replace(/\s/g, '')) ? true : 'Apenas números')

const brand = computed(() => cardBrand(card.number))
const previewNumber = computed(() => {
  const digits = card.number.replace(/\D/g, '').slice(0, 16)
  return digits ? (digits.match(/.{1,4}/g)?.join(' ') ?? '').padEnd(19, '•') : '•••• •••• •••• ••••'
})
const previewName = computed(() => card.holderName.trim().toUpperCase() || 'NOME NO CARTÃO')
const previewExpiry = computed(() => card.expiry.trim() || 'MM/AA')
const previewCvv = computed(() => card.cvv.replace(/\D/g, '').slice(0, 4) || '•••')

watch(model, (open) => open && load())

async function load() {
  loadingCards.value = true
  try {
    cards.value = await listPaymentMethods()
  } finally {
    loadingCards.value = false
  }
}

function formatExpiry(value) {
  const digits = String(value).replace(/\D/g, '').slice(0, 4)
  card.expiry = digits.length <= 2 ? digits : `${digits.slice(0, 2)}/${digits.slice(2)}`
}

async function save() {
  const { valid } = await form.value.validate()
  if (!valid) return
  const expiry = card.expiry.replace(/\D/g, '')
  if (!/^(0[1-9]|1[0-2])\d{2}$/.test(expiry)) {
    toastError({ text: 'O campo data de expiração deve estar no formato MM/YY' })
    return
  }
  saving.value = true
  try {
    // Só bandeira, final e validade vão para o "backend" da demo.
    await addPaymentMethod({ number: card.number.replace(/\D/g, ''), expiry: card.expiry, brand: brand.value })
    toastSuccess({ title: 'Cartão salvo', text: 'Seu cartão foi salvo com sucesso.' })
    Object.assign(card, { holderName: '', number: '', expiry: '', cvv: '' })
    addOpen.value = false
    await load()
  } catch {
    toastError({ title: 'Erro ao salvar cartão', text: 'Não foi possível salvar o cartão. Tente novamente.' })
  } finally {
    saving.value = false
  }
}

async function makeDefault(id) {
  await setDefaultPaymentMethod(id)
  toastSuccess({ title: 'Cartão padrão', text: 'Este cartão agora é o seu cartão padrão.' })
  await load()
}

async function remove(id) {
  await deletePaymentMethod(id)
  toastSuccess({ title: 'Cartão removido', text: 'Seu cartão foi removido com sucesso.' })
  await load()
}
</script>

<template>
  <AppModal v-model="model" width="min(90vw, 720px)">
    <div class="mb-6">
      <div class="d-flex justify-space-between align-center flex-wrap ga-4">
        <div>
          <h1>Formas de pagamento</h1>
          <p>Gerencie seus cartões salvos e preferências de cobrança automática.</p>
        </div>
        <v-btn class="bg-primary" height="60" rounded="lg" variant="elevated" @click="addOpen = true">
          <div class="d-flex align-center flex-wrap justify-center ga-2">
            <v-icon>mdi-plus</v-icon>
            <span class="font-weight-medium">Adicionar nova forma</span>
          </div>
        </v-btn>
      </div>
    </div>

    <h3>Seus cartões</h3>
    <div v-if="loadingCards" class="d-flex justify-center align-center pa-6">
      <v-progress-circular indeterminate color="primary" />
    </div>
    <div v-else-if="cards.length === 0" class="pa-6 text-center">
      <v-icon size="large" color="disabled" class="mb-3">mdi-credit-card-off</v-icon>
      <p class="text-disabled">Nenhum cartão adicionado</p>
      <p class="text-small text-disabled">Adicione um novo cartão para começar a usar</p>
    </div>
    <div v-else class="d-flex flex-column ga-3 mt-3">
      <v-card v-for="item in cards" :key="item.id" class="pa-3">
        <div class="d-flex align-center justify-space-between flex-wrap ga-3">
          <div class="d-flex align-center ga-3">
            <v-icon color="primary">mdi-credit-card-outline</v-icon>
            <div>
              <p class="text-capitalize">{{ item.card_brand || 'Cartão' }} Terminado em {{ item.last_four || '****' }}</p>
              <p class="text-small">Expira em {{ item.expiration_date || 'N/A' }}</p>
            </div>
          </div>
          <div class="d-flex align-center ga-2">
            <v-chip v-if="item.is_default" class="rounded" color="primary">
              <v-icon icon="mdi-check-circle-outline" />
              <v-tooltip activator="parent" location="top">Cartão padrão</v-tooltip>
            </v-chip>
            <v-btn v-else size="small" variant="text" @click="makeDefault(item.id)">Tornar padrão</v-btn>
            <v-btn icon="mdi-trash-can-outline" size="small" variant="text" color="error" title="Remover cartão" @click="remove(item.id)" />
          </div>
        </div>
      </v-card>
    </div>

    <div class="rounded pa-4 mt-4">
      <h3 class="text-primary mb-2">Pagamento seguro</h3>
      <div class="d-flex align-center ga-4">
        <v-icon color="primary" class="rounded">mdi-security</v-icon>
        <p>Nesta demonstração apenas a bandeira, o final e a validade do cartão são guardados no seu navegador. O CVV nunca é armazenado.</p>
      </div>
    </div>
  </AppModal>

  <AppModal v-model="addOpen" width="min(90vw, 520px)" :prevent-close="saving">
    <div class="d-flex align-center ga-4">
      <v-icon color="primary">mdi-credit-card-outline</v-icon>
      <div>
        <h2>Adicione um novo cartão</h2>
        <p>Adicione um novo método de pagamento</p>
      </div>
    </div>

    <div class="mt-6 mb-2 payment-card-preview" :class="`payment-card--${brand}`">
      <div class="payment-card-inner" :class="{ 'is-flipped': showBack }">
        <v-card class="payment-card-face payment-card-front pa-5 rounded-xl overflow-hidden">
          <div class="payment-card-decoration payment-card-decoration--top" />
          <div class="payment-card-decoration payment-card-decoration--bottom" />
          <div class="d-flex justify-space-between align-center mb-9 position-relative">
            <v-chip size="small" variant="tonal" class="text-caption">Crédito</v-chip>
            <div class="payment-card-brand px-3 py-1 rounded-pill text-capitalize text-caption">
              <v-icon size="18" class="mr-1">{{ BRAND_ICONS[brand] }}</v-icon>{{ brand === 'unknown' ? '' : brand }}
            </div>
          </div>
          <p class="payment-card-number text-h6 font-weight-bold mb-8 position-relative">{{ previewNumber }}</p>
          <div class="d-flex justify-space-between align-end position-relative">
            <div>
              <p class="text-caption payment-card-label mb-1">Nome</p>
              <h3 class="text-uppercase">{{ previewName }}</h3>
            </div>
            <div class="text-right">
              <p class="text-caption payment-card-label mb-1">Validade</p>
              <p class="font-weight-bold">{{ previewExpiry }}</p>
            </div>
          </div>
        </v-card>
        <v-card class="payment-card-face payment-card-back rounded-xl overflow-hidden">
          <div class="payment-card-strip mt-6" />
          <div class="d-flex justify-end mt-7 px-4">
            <div class="payment-card-cvv-box px-3 py-1 rounded">
              <p class="font-weight-bold">{{ previewCvv }}</p>
            </div>
          </div>
          <p class="text-caption payment-card-label text-right mt-2 px-4">CVV</p>
        </v-card>
      </div>
    </div>

    <div class="mt-4">
      <h3 class="mb-4">Informações do cartão</h3>
      <v-form ref="form">
        <v-text-field
          v-model="card.holderName"
          label="Nome no cartão"
          placeholder="Ex: JOÃO A SILVA"
          class="mb-4"
          persistent-placeholder
          :rules="[required, lengthBetween(2, 200)]"
        />
        <v-text-field
          v-model="card.number"
          label="Número no cartão"
          placeholder="Ex: 1234 5678 9012 3456"
          class="mb-4"
          persistent-placeholder
          autocomplete="off"
          :rules="[required, onlyNumbers, lengthBetween(16, 19)]"
        />
        <div class="d-flex ga-4">
          <v-text-field
            :model-value="card.expiry"
            label="Validade"
            placeholder="Ex: 12/25"
            persistent-placeholder
            maxlength="5"
            :rules="[required, lengthBetween(5, 5)]"
            @update:model-value="formatExpiry"
          />
          <v-text-field
            v-model="card.cvv"
            label="CVV"
            placeholder="Ex: 123"
            persistent-placeholder
            autocomplete="off"
            :rules="[required, onlyNumbers, lengthBetween(3, 4)]"
            @focus="showBack = true"
            @blur="showBack = false"
          />
        </div>
      </v-form>
    </div>

    <div class="d-flex flex-column ga-2 my-6">
      <v-btn class="bg-primary py-6 d-flex justify-center align-center" :loading="saving" :disabled="saving" @click="save">
        Salvar novo cartão
      </v-btn>
      <v-btn variant="text" :disabled="saving" @click="addOpen = false">Cancelar</v-btn>
    </div>
    <p class="mt-4 text-center d-flex align-center justify-center ga-2 text-small">
      <v-icon size="small">mdi-lock</v-icon>
      PAGAMENTO SEGURO E CRIPTOGRAFADO
    </p>
  </AppModal>
</template>

<style scoped>
.payment-card-preview {
  perspective: 1000px;
}

.payment-card-inner {
  position: relative;
  height: 220px;
  transform-style: preserve-3d;
  transition: transform 0.55s ease;
}

.payment-card-inner.is-flipped {
  transform: rotateY(180deg);
}

.payment-card-face {
  position: absolute;
  inset: 0;
  width: 100%;
  backface-visibility: hidden;
  outline: none !important;
}

.payment-card-front {
  color: rgb(var(--v-theme-on-primary));
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 1), rgba(var(--v-theme-primary), 0.88));
}

.payment-card-back {
  color: rgb(var(--v-theme-on-primary));
  background: linear-gradient(145deg, rgba(var(--v-theme-primary), 1), rgba(var(--v-theme-primary), 0.8));
  transform: rotateY(180deg);
}

.payment-card-strip {
  width: 100%;
  height: 42px;
  background: rgba(var(--v-theme-on-primary), 0.8);
}

.payment-card-cvv-box {
  min-width: 72px;
  background: rgba(255, 255, 255, 0.85);
  color: #111;
}

.payment-card-label {
  color: rgba(var(--v-theme-on-primary), 0.72);
}

.payment-card-number {
  letter-spacing: 0.08em;
}

.payment-card-brand {
  background-color: rgba(var(--v-theme-on-primary), 0.18);
  border: 1px solid rgba(var(--v-theme-on-primary), 0.28);
}

.payment-card-decoration {
  position: absolute;
  border-radius: 50%;
  background-color: rgba(var(--v-theme-on-primary), 0.12);
}

.payment-card-decoration--top {
  width: 130px;
  height: 130px;
  top: -58px;
  right: -36px;
}

.payment-card-decoration--bottom {
  width: 110px;
  height: 110px;
  bottom: -48px;
  left: -38px;
}

.payment-card--visa .payment-card-front,
.payment-card--visa .payment-card-back {
  background: linear-gradient(135deg, rgba(var(--v-theme-blue), 1), rgba(var(--v-theme-indigo), 1));
}

.payment-card--mastercard .payment-card-front,
.payment-card--mastercard .payment-card-back {
  background: linear-gradient(135deg, rgba(var(--v-theme-orange), 1), rgba(var(--v-theme-amber), 1));
}

.payment-card--amex .payment-card-front,
.payment-card--amex .payment-card-back {
  background: linear-gradient(135deg, rgba(var(--v-theme-teal), 1), rgba(var(--v-theme-info), 1));
}

.payment-card--hipercard .payment-card-front,
.payment-card--hipercard .payment-card-back {
  background: linear-gradient(135deg, rgba(var(--v-theme-pink), 1), rgba(var(--v-theme-secondary), 1));
}
</style>
