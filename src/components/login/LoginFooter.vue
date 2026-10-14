<script setup>
import { useAppTheme } from '@/composables/useAppTheme'
import { SITE_LINKS } from '@/config'

const { themeName } = useAppTheme()
</script>

<template>
  <v-footer color="surface" app>
    <v-row>
      <v-col class="d-flex align-center justify-start ml-4">
        <a :href="SITE_LINKS.instagram" target="_blank" rel="noopener" class="mr-4" aria-label="Instagram">
          <v-icon icon="custom:instagram-icon" size="small" />
        </a>
        <a :href="SITE_LINKS.tiktok" target="_blank" rel="noopener" class="mr-4" aria-label="TikTok">
          <v-icon icon="custom:tik-tok-icon" size="small" />
        </a>
        <a :href="SITE_LINKS.docs" target="_blank" rel="noopener" class="mr-4" aria-label="Documentação">
          <v-icon size="small">mdi-file-document-outline</v-icon>
        </a>
        <div class="d-flex ml-4">
          <router-link :to="{ name: 'terms-of-use' }" target="_blank" class="mr-4">Termos de uso</router-link>
          <router-link :to="{ name: 'privacy-policies' }" target="_blank" class="mr-4">Política de privacidade</router-link>
          <a :href="SITE_LINKS.help" target="_blank" rel="noopener">Ajuda</a>
        </div>
      </v-col>
      <v-col class="d-flex justify-end">
        <iframe
          :key="themeName"
          :src="SITE_LINKS.statusBadge(themeName)"
          width="200"
          height="30"
          frameborder="0"
          scrolling="no"
          title="Status dos serviços"
          style="color-scheme: normal"
        />
      </v-col>
    </v-row>
  </v-footer>
</template>
