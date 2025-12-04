<!-- src/views/WorldsView.vue -->
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useAuthStore } from '../store/authStore';

const authStore = useAuthStore();
const responsePreview = ref('');
const errorMessage = ref('');

const fetchWorlds = async () => {
  responsePreview.value = '';
  errorMessage.value = '';

  try {
    const data = await authStore.fetchWorldsPreview();
    responsePreview.value = JSON.stringify(data, null, 2);
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Impossibile contattare il backend.';
  }
};

onMounted(() => {
  if (authStore.hasCredentials) {
    fetchWorlds();
  }
});
</script>

<template>
  <section class="panel">
    <h1>Mondi disponibili</h1>
    <p>Questa pagina esegue una richiesta GET verso <code>/worlds</code>.</p>

    <div class="actions">
      <button class="primary" :disabled="authStore.loading" @click="fetchWorlds">
        {{ authStore.loading ? 'Caricamento…' : 'Ricarica elenco' }}
      </button>
      <button class="secondary" @click="authStore.clearCredentials">
        Svuota credenziali
      </button>
    </div>

    <p v-if="!authStore.hasCredentials" class="note">
      Inserisci username e password prima di interrogare il backend.
    </p>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <pre v-if="responsePreview" class="preview">{{ responsePreview }}</pre>
  </section>
</template>
