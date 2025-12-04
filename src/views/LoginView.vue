<!-- src/views/LoginView.vue -->
<script setup lang="ts">
import { reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../store/authStore';

const authStore = useAuthStore();
const router = useRouter();

const credentials = reactive({
  username: authStore.username,
  password: authStore.password,
});

const handleSubmit = () => {
  authStore.setCredentials(credentials.username, credentials.password);
  router.push('/worlds');
};
</script>

<template>
  <section class="panel">
    <h1>DD Manager – Frontend</h1>
    <p>Imposta le credenziali Basic Auth per testare le API.</p>

    <form class="form" @submit.prevent="handleSubmit">
      <label class="field">
        <span>Username</span>
        <input
          v-model="credentials.username"
          type="text"
          name="username"
          autocomplete="username"
          required
        />
      </label>

      <label class="field">
        <span>Password</span>
        <input
          v-model="credentials.password"
          type="password"
          name="password"
          autocomplete="current-password"
          required
        />
      </label>

      <button class="primary" type="submit">Salva e continua</button>
    </form>
  </section>
</template>
