<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import TheSidebar from '@/components/TheSidebar.vue'
import ToastAlert from '@/components/ToastAlert.vue'
import SubscriptionHeader from '@/components/SubscriptionHeader.vue'
import { useSession } from '@/composables/useSession'

const route = useRoute()
const { selectedOrgId } = useSession()
const sidebarWidth = ref('0px')
const showSidebar = computed(() => route.matched.length > 0 && route.meta.no_sidebar !== true)
// Como no original (meta.refresh_on_org_change), a página recarrega ao trocar de organização.
const viewKey = computed(() => (route.meta.refresh_on_org_change ? `${route.name}:${selectedOrgId.value}` : route.name))
</script>

<template>
  <v-app>
    <v-main>
      <div
        :class="[{ 'retracted-content': showSidebar }, 'h-100 d-flex flex-column']"
        :style="{ '--sidebar-width': sidebarWidth }"
      >
        <SubscriptionHeader v-if="showSidebar && route.meta.subscription_header" />
        <div class="vue-app-view-container flex-grow-1">
          <router-view v-slot="{ Component }">
            <v-fade-transition mode="out-in">
              <component :is="Component" :key="viewKey" class="h-100" />
            </v-fade-transition>
          </router-view>
        </div>
        <ToastAlert />
      </div>
      <TheSidebar v-if="showSidebar" v-model="sidebarWidth" />
    </v-main>
  </v-app>
</template>

<style scoped>
.retracted-content {
  width: calc(100% - var(--sidebar-width));
  margin-left: auto;
  transition: width 0.3s;
}
</style>
