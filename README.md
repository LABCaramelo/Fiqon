# FiqOn — Automação & Orquestração de Integrações

Interface completa de orquestração de integrações e automações no estilo iPaaS (estilo FiqOn, Zapier, Make e n8n), desenvolvida em **Vue 3 + Vuetify 3 + Vite**.

---

## ⚡ Funcionalidades Principais

- **Editor Visual de Fluxo (Canvas)**:
  - Nós arrastáveis com pan, zoom e renderização de curvas Bézier SVG.
  - Gaveta lateral avançada de configuração de módulos com parâmetros específicos por app (Webhook dinâmico com URL de cópia, ChatGPT com seleção de modelo e prompts, WhatsApp, Google Sheets, Filtros condicionais, Delays, Requester HTTP, etc.).
  - Barra de variáveis contextuais interativas dos nós anteriores (`{{s1.lead_name}}`, `{{s1.telefone}}`, etc.) com cópia rápida.
  - Simulação de execução em tempo real com estados visuais e latência dinâmica.
  - Histórico de versões com restauração (rollback) e salvamento automático.
  - Exportação e importação de integrações (`.fiqon` / `.json`).

- **Central de Conexões**:
  - Gerenciamento de credenciais multi-app com suporte a simulação de OAuth2 (Google), WhatsApp QR Code / Cloud API, OpenAI API Key, Telegram Bot Token e Banco de Dados.
  - Teste e verificação de status ativo/inativo das credenciais.

- **Dashboard & Observabilidade**:
  - Métricas de uso de operações por plano.
  - Gráfico temporal de execuções.
  - Logs detalhados com payload de entrada/saída por módulo e recurso de **Replay**.

- **Flux AI Builder**:
  - Assistente conversacional interativo que interpreta comandos em linguagem natural e gera rascunhos de fluxos prontos.

- **Multi-tenancy & Governança**:
  - Alternância entre organizações, gestão de membros por níveis de acesso (Proprietário, Administrador, Desenvolvedor) e transferência de propriedade.

---

## 🛠️ Stack Tecnológica

- **Frontend**: Vue 3 (Composition API / `<script setup>`)
- **UI Library**: Vuetify 3 (Material Design 3 customizado com paleta e fontes oficiais)
- **Roteamento**: Vue Router 4
- **Ícones & Tipografia**: Material Design Icons (`@mdi/font`) + Tipografia Brutalisme
- **Build Tool**: Vite 7
- **Armazenamento de Demonstração**: Motor reativo em `localStorage`

---

## 🚀 Como Executar

### 1. Instalar dependências
```bash
npm install
```

### 2. Rodar em ambiente de desenvolvimento
```bash
npm run dev
```
Acesse `http://localhost:5173` no seu navegador.

### 3. Gerar build de produção
```bash
npm run build
```

---

## 📄 Licença

Projeto desenvolvido para fins de demonstração e engenharia de software.
