<script setup>
import { computed } from 'vue'
import FiqonLogo from '@/components/FiqonLogo.vue'

// Mesmo layout das páginas legais do original. O texto é um modelo próprio desta
// recriação (não reproduz os termos da FiqOn): substitua pelo texto jurídico do seu projeto.
const props = defineProps({
  kind: { type: String, required: true }, // 'terms' | 'privacy'
})

const CONTENT = {
  terms: {
    title: 'Termos de uso',
    intro:
      'Estes termos descrevem as regras de uso desta demonstração de plataforma de integrações. Ao acessar o aplicativo, você concorda com as condições abaixo.',
    sections: [
      {
        title: '1. Sobre o serviço',
        items: [
          'A plataforma permite criar integrações (fluxos) que conectam aplicativos por meio de gatilhos e ações.',
          'Nesta demonstração, todos os dados ficam salvos apenas no seu navegador e nenhuma integração é executada de verdade.',
        ],
      },
      {
        title: '2. Conta e acesso',
        items: [
          'Você é responsável por manter a confidencialidade das suas credenciais.',
          'Contas criadas aqui são locais e podem ser apagadas a qualquer momento limpando os dados do navegador.',
        ],
      },
      {
        title: '3. Planos e operações',
        items: [
          'Operações representam o uso da plataforma e são contabilizadas a cada execução de aplicativo ou ação.',
          'A contratação de planos nesta demonstração é simulada e não gera cobrança.',
        ],
      },
      {
        title: '4. Uso aceitável',
        items: [
          'Não utilize a plataforma para enviar spam, violar direitos de terceiros ou qualquer finalidade ilegal.',
          'Reservamo-nos o direito de suspender contas que descumpram estes termos.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Políticas de privacidade',
    intro:
      'Esta política explica quais dados esta demonstração coleta e como eles são tratados. Substitua este texto pela política do seu projeto antes de publicá-lo.',
    sections: [
      {
        title: 'Dados coletados',
        items: [
          'Nome, email e telefone informados no cadastro e no perfil.',
          'Integrações, conexões, templates e dados de faturamento criados durante o uso.',
        ],
      },
      {
        title: 'Onde os dados ficam',
        items: [
          'Todos os dados ficam no armazenamento local (localStorage) do seu navegador.',
          'Nenhum dado é enviado a servidores, exceto a consulta de CEP feita à BrasilAPI ao preencher o endereço.',
        ],
      },
      {
        title: 'Cartões de pagamento',
        items: [
          'Apenas a bandeira, os quatro últimos dígitos e a validade são guardados. O número completo e o CVV nunca são armazenados.',
        ],
      },
      {
        title: 'Seus direitos',
        items: [
          'Você pode apagar todos os dados a qualquer momento limpando os dados do site no navegador.',
        ],
      },
    ],
  },
}

const content = computed(() => CONTENT[props.kind] ?? CONTENT.terms)
</script>

<template>
  <div class="d-flex justify-center pa-6">
    <div class="page-container w-100 line-gap-3">
      <router-link :to="{ name: 'home' }">
        <FiqonLogo logo-width="200" />
      </router-link>
      <h1 class="text-primary mt-6">{{ content.title }}</h1>
      <p>{{ content.intro }}</p>
      <section v-for="section in content.sections" :key="section.title" class="line-gap-2">
        <h2 class="text-primary">{{ section.title }}</h2>
        <ul class="marker-primary pl-6">
          <li v-for="item in section.items" :key="item">{{ item }}</li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  max-width: 1080px;
}

.marker-primary li::marker {
  color: rgb(var(--v-theme-primary));
}
</style>
