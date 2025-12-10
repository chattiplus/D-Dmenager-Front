<!-- src/views/LoginView.vue -->
<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../store/authStore';
import { extractApiErrorMessage } from '../utils/errorMessage';
import type { PublicRole } from '../types/api';

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
  role: 'PLAYER' as PublicRole,
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
    router.push(authStore.defaultRoutePath);
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
      role: registerForm.role,
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
  return extractApiErrorMessage(error);
};
</script>

<template>
  <section class="stack">
    <div class="card stack">
      <header>
        <h1 class="section-title">Accedi al tuo tavolo di gioco</h1>
        <p class="section-subtitle">
          Entra come Dungeon Master, giocatore o spettatore per coordinare mondi, campagne e sessioni
          cronologiche.
        </p>
      </header>

      <form @submit.prevent="handleLogin">
        <h2 class="card-title">Accesso rapido</h2>
        <p class="card-subtitle">
          Inserisci le credenziali registrate per effettuare il login via <code>POST /api/auth/login</code>.
        </p>

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

        <button class="btn btn-primary" type="submit" :disabled="authStore.loading">
          {{ authStore.loading ? 'Accesso in corso...' : 'Entra nella campagna' }}
        </button>

        <p v-if="loginError" class="status-message text-danger">{{ loginError }}</p>
      </form>
    </div>

    <div class="card stack">
      <header>
        <h2 class="card-title">Nuovo avventuriero?</h2>
        <p class="card-subtitle">Crea un profilo per poter plasmare un nuovo mondo.</p>
      </header>

      <form @submit.prevent="handleRegister">
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

        <button class="btn btn-secondary" type="submit" :disabled="registerLoading">
          {{ registerLoading ? 'Registrazione...' : 'Crea il profilo' }}
        </button>

        <p v-if="registerSuccess" class="status-message text-success">{{ registerSuccess }}</p>
        <p v-if="registerError" class="status-message text-danger">{{ registerError }}</p>
      </form>
    </div>
  </section>
</template>
