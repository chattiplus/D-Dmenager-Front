<!-- src/views/RegisterView.vue -->
<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../store/authStore';
import { extractApiErrorMessage } from '../utils/errorMessage';
import type { PublicRole } from '../types/api';

const authStore = useAuthStore();
const router = useRouter();

const registerForm = reactive({
  email: '',
  password: '',
  nickname: '',
  role: 'PLAYER' as PublicRole,
});

const registerError = ref('');
const registerSuccess = ref('');
const registerLoading = ref(false);

const roleOptions: { value: PublicRole; label: string }[] = [
  { value: 'PLAYER', label: 'Player' },
  { value: 'DM', label: 'Dungeon Master (GM)' },
  { value: 'VIEWER', label: 'Viewer' },
];

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
    registerError.value = extractApiErrorMessage(error);
  } finally {
    registerLoading.value = false;
  }
};

const handleRoleClick = (value: PublicRole) => {
  registerForm.role = value;
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
        <h2 class="auth-card__title">Registrati</h2>
      </header>

      <form class="auth-form" @submit.prevent="handleRegister">
        <label class="auth-field">
          <span>Email</span>
          <input
            v-model="registerForm.email"
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
            v-model="registerForm.password"
            type="password"
            name="password"
            autocomplete="new-password"
            placeholder="Password"
            required
          />
        </label>

        <label class="auth-field">
          <span>Nickname</span>
          <input
            v-model="registerForm.nickname"
            type="text"
            name="nickname"
            autocomplete="username"
            placeholder="Nickname"
            required
          />
        </label>

        <label class="auth-field">
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

        <button class="auth-submit btn btn-secondary" type="submit" :disabled="registerLoading">
          {{ registerLoading ? 'Registrazione...' : 'Registrati' }}
        </button>

        <p v-if="registerSuccess" class="status-message text-success">{{ registerSuccess }}</p>
        <p v-if="registerError" class="auth-error status-message text-danger">{{ registerError }}</p>

        <p class="auth-toggle-link">
          Hai gi&agrave; un account?
          <button type="button" class="btn-link" @click="router.push('/login')">Accedi</button>
        </p>
      </form>
    </section>
  </main>
</template>
