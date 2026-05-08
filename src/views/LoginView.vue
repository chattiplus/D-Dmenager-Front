<!-- src/views/LoginView.vue -->
<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../store/authStore';
import { extractApiErrorMessage } from '../utils/errorMessage';

const authStore = useAuthStore();
const router = useRouter();

const loginForm = reactive({
  email: '',
  password: '',
});

const loginError = ref('');

const handleLogin = async () => {
  loginError.value = '';
  try {
    await authStore.login({
      email: loginForm.email.trim(),
      password: loginForm.password,
    });
    router.push(authStore.defaultRoutePath);
  } catch (error) {
    loginError.value = extractApiErrorMessage(error);
  }
};
</script>

<template>
  <main class="auth-page">
    <section class="auth-hero">
      <h1 class="auth-title">D&D Manager</h1>
      <div class="auth-divider"></div>
    </section>

    <section class="auth-card">
      <header class="auth-card__header">
        <h2 class="auth-card__title">Accedi</h2>
      </header>

      <form class="auth-form" @submit.prevent="handleLogin">
        <label class="auth-field">
          <span>Email</span>
          <input
            v-model="loginForm.email"
            type="email"
            name="email"
            autocomplete="email"
            placeholder="tuo@email.it"
            required
          />
        </label>

        <label class="auth-field">
          <span>Password</span>
          <input
            v-model="loginForm.password"
            type="password"
            name="password"
            autocomplete="current-password"
            placeholder="Password"
            required
          />
        </label>

        <button class="auth-submit btn btn-primary" type="submit" :disabled="authStore.loading">
          {{ authStore.loading ? 'Accesso in corso...' : 'Accedi' }}
        </button>

        <p v-if="loginError" class="auth-error status-message text-danger">{{ loginError }}</p>

        <p class="auth-toggle-link">
          Non hai un account?
          <button type="button" class="btn-link" @click="router.push('/register')">Registrati</button>
        </p>
      </form>
    </section>
  </main>
</template>
