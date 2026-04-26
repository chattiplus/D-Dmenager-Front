<script setup lang="ts">
import type { CreateSessionRequest } from '../../types/api';

defineProps<{
  sessionForm: CreateSessionRequest;
  creatingSession: boolean;
  sessionFormError: string;
}>();

const emit = defineEmits<{
  (e: 'submit'): void;
}>();
</script>

<template>
  <form class="card muted stack" @submit.prevent="emit('submit')">
    <h4 class="card-title">Nuova sessione</h4>
    <label class="field">
      <span>Titolo</span>
      <input v-model="sessionForm.title" type="text" required />
    </label>
    <label class="field">
      <span>Numero sessione</span>
      <input v-model.number="sessionForm.sessionNumber" type="number" min="1" required />
    </label>
    <label class="field">
      <span>Data (YYYY-MM-DD)</span>
      <input v-model="sessionForm.sessionDate" type="date" />
    </label>
    <label class="field">
      <span>Note</span>
      <textarea v-model="sessionForm.notes" rows="3" />
    </label>
    <button class="btn btn-secondary" type="submit" :disabled="creatingSession">
      {{ creatingSession ? 'Creazione...' : 'Crea sessione' }}
    </button>
    <p v-if="sessionFormError" class="status-message text-danger">{{ sessionFormError }}</p>
  </form>
</template>
