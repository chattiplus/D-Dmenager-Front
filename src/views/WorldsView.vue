<!-- src/views/WorldsView.vue -->
<script setup lang="ts">
import { isAxiosError } from 'axios';
import { ref, watch } from 'vue';
import { testHealth } from '../api/httpClient';
import { useAuthStore, type WorldResponse } from '../store/authStore';

const authStore = useAuthStore();

const worlds = ref<WorldResponse[]>([]);
const worldsError = ref('');
const loadingWorlds = ref(false);

const healthMessage = ref('');
const healthStatus = ref<'idle' | 'ok' | 'ko'>('idle');
const checkingHealth = ref(false);

const refreshWorlds = async () => {
  if (!authStore.isAuthenticated) {
    return;
  }

  worldsError.value = '';
  loadingWorlds.value = true;
  try {
    worlds.value = await authStore.fetchWorlds();
  } catch (error) {
    worldsError.value = extractMessage(error);
  } finally {
    loadingWorlds.value = false;
  }
};

const checkHealth = async () => {
  if (!authStore.isAuthenticated) {
    return;
  }
  checkingHealth.value = true;
  healthMessage.value = '';

  try {
    await testHealth();
    healthStatus.value = 'ok';
    healthMessage.value = 'API /api/health raggiungibile.';
  } catch (error) {
    healthStatus.value = 'ko';
    healthMessage.value = extractMessage(error);
  } finally {
    checkingHealth.value = false;
  }
};

const extractMessage = (error: unknown) => {
  if (isAxiosError(error) && error.response?.data?.message) {
    return error.response.data.message;
  }
  if (isAxiosError(error) && error.response?.status === 0) {
    return 'Backend non raggiungibile.';
  }
  return error instanceof Error ? error.message : 'Errore sconosciuto.';
};

watch(
  () => authStore.isAuthenticated,
  (loggedIn) => {
    if (loggedIn) {
      refreshWorlds();
      checkHealth();
    } else {
      worlds.value = [];
      worldsError.value = '';
      healthMessage.value = '';
      healthStatus.value = 'idle';
    }
  },
  { immediate: true },
);
</script>

<template>
  <section class="panel">
    <h1>Mondi disponibili</h1>
    <p>
      Questa pagina chiama <code>GET /api/worlds</code> e <code>GET /api/health</code> usando le
      credenziali Basic salvate dopo il login.
    </p>

    <div v-if="!authStore.isAuthenticated" class="note">
      Effettua il login per visualizzare i mondi.
    </div>

    <template v-else>
      <div class="actions">
        <button class="primary" :disabled="loadingWorlds" @click="refreshWorlds">
          {{ loadingWorlds ? 'Caricamento...' : 'Ricarica mondi' }}
        </button>
        <button class="secondary" :disabled="checkingHealth" @click="checkHealth">
          {{ checkingHealth ? 'Verifica in corso...' : 'Verifica /api/health' }}
        </button>
      </div>

      <p v-if="healthMessage" :class="healthStatus === 'ok' ? 'success' : 'error'">
        {{ healthMessage }}
      </p>

      <p v-if="worldsError" class="error">{{ worldsError }}</p>

      <ul v-if="worlds.length" class="card-list">
        <li v-for="world in worlds" :key="world.id" class="card">
          <header class="card-header">
            <h3>{{ world.name }}</h3>
          </header>
          <p>{{ world.description || 'Nessuna descrizione' }}</p>
          <p class="meta">
            Owner: {{ world.ownerNickname ?? 'N/A' }} | Campagne: {{ world.campaignCount }}
          </p>
        </li>
      </ul>

      <p v-else class="note">Nessun mondo disponibile.</p>
    </template>
  </section>
</template>
