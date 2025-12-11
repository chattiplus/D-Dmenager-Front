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

// opzioni ruolo per i “pill” button
const roleOptions: { value: PublicRole; label: string }[] = [
  { value: 'PLAYER', label: 'Player' },
  { value: 'DM', label: 'Dungeon Master (GM)' },
  { value: 'VIEWER', label: 'Viewer' },
];

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

const handleRoleClick = (value: PublicRole) => {
  registerForm.role = value;
};
</script>

<template>
  <section class="stack">
    <div class="card stack">
      <header>
        <h1 class="section-title">Accesso rapido</h1>
        <p class="section-subtitle">
          Entra come Dungeon Master, giocatore o spettatore.
        </p>
      </header>

      <form @submit.prevent="handleLogin">


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
        <p class="card-subtitle">Immgergiti in mondi fantastici o terrificantii!!</p>
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

        <!-- RUOLO: pill selezionabili al posto del select nativo -->
        <label class="field">
          <span>Ruolo</span>
          <div class="role-toggle">
            <button
                v-for="option in roleOptions"
                :key="option.value"
                type="button"
                class="role-pill"
                :class="{ 'role-pill--active': registerForm.role === option.value }"
                @click="handleRoleClick(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
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

<style scoped>
.role-toggle {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.role-pill {
  border-radius: 999px;
  padding: 0.3rem 0.9rem;
  font-size: 0.8rem;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.5);
  color: #e5e7eb;
  cursor: pointer;
  transition:
      background 0.15s ease-out,
      border-color 0.15s ease-out,
      transform 0.1s ease-out,
      box-shadow 0.15s ease-out;
}

.role-pill:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(191, 219, 254, 0.9);
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.65);
}

.role-pill--active {
  background: rgba(229, 150, 70, 0.9);
  border-color: rgba(251, 191, 36, 0.9);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.75);
}
</style>
