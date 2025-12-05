<!-- src/views/LoginView.vue -->
<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { isAxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';

const authStore = useAuthStore();
const router = useRouter();

const loginForm = reactive({
  email: '',
  password: '',
});
const registerForm = reactive({
  email: '',
  password: '',
  nickname: '',
  role: 'PLAYER',
});

const loginError = ref('');
const registerError = ref('');
const registerSuccess = ref('');
const registerLoading = ref(false);

const handleLogin = async () => {
  loginError.value = '';
  try {
    await authStore.login({
      email: loginForm.email.trim(),
      password: loginForm.password,
    });
    router.push('/worlds');
  } catch (error) {
    loginError.value = extractMessage(error);
  }
};

const handleRegister = async () => {
  registerError.value = '';
  registerSuccess.value = '';
  registerLoading.value = true;
  try {
    await authStore.register({
      email: registerForm.email.trim(),
      password: registerForm.password,
      nickname: registerForm.nickname.trim(),
      role: registerForm.role as 'PLAYER' | 'DM' | 'VIEWER',
    });
    registerSuccess.value = 'Registrazione completata, ora effettua il login.';
    registerForm.email = '';
    registerForm.password = '';
    registerForm.nickname = '';
    registerForm.role = 'PLAYER';
  } catch (error) {
    registerError.value = extractMessage(error);
  } finally {
    registerLoading.value = false;
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
</script>

<template>
  <section class="panel">
    <h1>DD Manager - Accesso</h1>
    <p>
      Inserisci le credenziali per ottenere i dati utente via
      <code>POST /api/auth/login</code>. Tutte le chiamate successive useranno HTTP Basic.
    </p>

    <form class="form" @submit.prevent="handleLogin">
      <h2>Login</h2>
      <label class="field">
        <span>Email</span>
        <input
          v-model="loginForm.email"
          type="email"
          name="email"
          autocomplete="email"
          required
        />
      </label>

      <label class="field">
        <span>Password</span>
        <input
          v-model="loginForm.password"
          type="password"
          name="password"
          autocomplete="current-password"
          required
        />
      </label>

      <button class="primary" type="submit" :disabled="authStore.loading">
        {{ authStore.loading ? 'Accesso in corso...' : 'Accedi' }}
      </button>
      <p v-if="loginError" class="error">{{ loginError }}</p>
    </form>

    <hr />

    <form class="form" @submit.prevent="handleRegister">
      <h2>Registrazione</h2>
      <label class="field">
        <span>Email</span>
        <input v-model="registerForm.email" type="email" required />
      </label>

      <label class="field">
        <span>Password</span>
        <input v-model="registerForm.password" type="password" required />
      </label>

      <label class="field">
        <span>Nickname</span>
        <input v-model="registerForm.nickname" type="text" required />
      </label>

      <label class="field">
        <span>Ruolo</span>
        <select v-model="registerForm.role" required>
          <option value="PLAYER">Player</option>
          <option value="DM">Dungeon Master (GM)</option>
          <option value="VIEWER">Viewer</option>
        </select>
      </label>

      <button class="secondary" type="submit" :disabled="registerLoading">
        {{ registerLoading ? 'Registrazione...' : 'Registrati' }}
      </button>

      <p v-if="registerSuccess" class="success">{{ registerSuccess }}</p>
      <p v-if="registerError" class="error">{{ registerError }}</p>
    </form>
  </section>
</template>
