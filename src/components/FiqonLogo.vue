<script setup>
import { computed } from 'vue'
import { useTheme } from 'vuetify'
import logoDark from '@/assets/brand/logo-dark.svg'
import logoLight from '@/assets/brand/logo-light.svg'
import by3cLogo from '@/assets/brand/by-3c.svg'

defineProps({
  logoWidth: { type: String, default: 'auto' },
  logoClass: { type: String, default: '' },
  by3c: { type: Boolean, default: false },
})

const theme = useTheme()
const src = computed(() => (theme.global.current.value.dark ? logoDark : logoLight))
</script>

<template>
  <div>
    <img :src="src" :width="logoWidth" :class="logoClass" alt="FiqOn" />
    <div v-if="by3c" class="d-flex justify-end w-100">
      <img :src="by3cLogo" alt="by 3C+" />
    </div>
  </div>
</template>
