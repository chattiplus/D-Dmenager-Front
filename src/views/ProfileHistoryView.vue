<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import OpenEntityButton from '../components/ui/OpenEntityButton.vue';
import { useProfileHistory } from '../composables/history/useProfileHistory';
import { useAuthStore } from '../store/authStore';
import { campaignStatusClass, campaignStatusLabel } from '../utils/campaignStatus';

const authStore = useAuthStore();
const {
  loading,
  error,
  campaignsHistory,
  hasPastSessions,
  loadHistory,
  formatHistoryDate,
} = useProfileHistory();

onMounted(() => {
  if (authStore.isAuthenticated) {
    loadHistory();
  }
});
</script>

<template>
  <section class="history-page mobile-screen stack">
    <header class="history-header">
      <div class="history-header__content">
        <p class="mobile-screen__eyebrow">Profilo</p>
        <h1 class="mobile-screen__title">History</h1>
        <p class="mobile-screen__subtitle">
          Rileggi le sessioni passate delle tue campagne.
        </p>
      </div>

      <RouterLink
        class="history-calendar-link"
        to="/profile/history/calendar"
        aria-label="Apri calendario sessioni"
        title="Apri calendario sessioni"
      >
        <span aria-hidden="true">📅</span>
      </RouterLink>
    </header>

    <article v-if="loading" class="card stack">
      <h2 class="card-title">Caricamento History</h2>
      <p class="manager-meta">Sto recuperando campagne e sessioni passate.</p>
    </article>

    <article v-else-if="error" class="card stack">
      <h2 class="card-title">Errore caricamento</h2>
      <p class="status-message text-danger">{{ error }}</p>
      <button class="btn btn-secondary" type="button" @click="loadHistory">
        Riprova
      </button>
    </article>

    <article v-else-if="!campaignsHistory.length" class="card stack">
      <h2 class="card-title">Nessuna sessione passata</h2>
      <p class="manager-meta">Nessuna sessione passata da mostrare.</p>
    </article>

    <article v-else-if="!hasPastSessions" class="card stack">
      <h2 class="card-title">Nessuna sessione passata</h2>
      <p class="manager-meta">Nessuna sessione passata da mostrare.</p>
    </article>

    <section v-if="hasPastSessions" class="stack">
      <article
        v-for="campaign in campaignsHistory"
        :key="campaign.campaignId"
        class="history-campaign-card"
      >
        <header class="history-campaign-card__header">
          <div class="history-campaign-card__title-block">
            <p class="mobile-link-card__label">Campagna</p>
            <div class="history-campaign-card__title-row">
              <h2 class="card-title">{{ campaign.campaignName }}</h2>
              <span
                v-if="campaign.campaignStatus"
                :class="['campaign-status-badge', campaignStatusClass(campaign.campaignStatus)]"
              >
                {{ campaignStatusLabel(campaign.campaignStatus) }}
              </span>
            </div>
            <p class="manager-meta">
              {{ campaign.campaignDescription || 'Nessuna descrizione disponibile.' }}
            </p>
          </div>
          <p class="history-campaign-card__count">
            Sessioni passate: <strong>{{ campaign.pastSessions.length }}</strong>
          </p>
        </header>

        <div class="history-session-list">
          <article
            v-for="session in campaign.pastSessions"
            :key="session.id"
            class="history-session-card"
          >
            <div class="history-session-card__body">
              <h3 class="history-session-card__title">{{ session.title }}</h3>
              <p class="manager-meta">
                Data: {{ formatHistoryDate(session.sessionDate, { dateStyle: 'full' }) }}
              </p>
              <p v-if="session.notes" class="history-session-card__notes">
                {{ session.notes }}
              </p>
            </div>
            <OpenEntityButton
              label="Apri"
              :to="{ name: session.detailRouteName, params: { id: session.id } }"
              aria-label="Apri sessione"
            />
          </article>
        </div>
      </article>
    </section>

    <section
      v-if="campaignsHistory.some((campaign) => campaign.undatedSessions.length)"
      class="stack"
    >
      <article class="card stack">
        <h2 class="card-title">Sessioni senza data</h2>
        <p class="manager-meta">
          Queste sessioni restano disponibili nello storico ma non entrano nel calendario.
        </p>

        <div class="history-undated-groups">
          <section
            v-for="campaign in campaignsHistory.filter((entry) => entry.undatedSessions.length)"
            :key="`undated-${campaign.campaignId}`"
            class="history-undated-group"
          >
            <h3 class="history-undated-group__title">{{ campaign.campaignName }}</h3>
            <div class="history-session-list">
              <article
                v-for="session in campaign.undatedSessions"
                :key="session.id"
                class="history-session-card"
              >
                <div class="history-session-card__body">
                  <h4 class="history-session-card__title">{{ session.title }}</h4>
                  <p class="manager-meta">Data non disponibile</p>
                  <p v-if="session.notes" class="history-session-card__notes">
                    {{ session.notes }}
                  </p>
                </div>
                <OpenEntityButton
                  label="Apri"
                  :to="{ name: session.detailRouteName, params: { id: session.id } }"
                  aria-label="Apri sessione"
                />
              </article>
            </div>
          </section>
        </div>
      </article>
    </section>
  </section>
</template>

<style scoped>
.history-page {
  gap: 1rem;
}

.history-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.history-header__content {
  min-width: 0;
}

.history-calendar-link {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 999px;
  border: 1px solid var(--app-surface-outline);
  background: color-mix(in srgb, var(--app-surface-elevated) 92%, transparent);
  color: var(--app-text);
  text-decoration: none;
  box-shadow: 0 12px 24px color-mix(in srgb, var(--app-shadow) 68%, transparent);
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.history-calendar-link:hover,
.history-calendar-link:focus-visible {
  outline: none;
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--app-accent) 46%, var(--app-surface-outline));
  background: color-mix(in srgb, var(--app-accent) 12%, var(--app-surface-elevated));
}

.history-campaign-card {
  display: grid;
  gap: 1rem;
  padding: 1.15rem;
  border-radius: 1.25rem;
  background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--app-surface-elevated) 96%, transparent),
      color-mix(in srgb, var(--app-surface) 96%, transparent)
    );
  border: 1px solid var(--app-surface-outline);
  box-shadow: 0 18px 34px color-mix(in srgb, var(--app-shadow) 72%, transparent);
}

.history-campaign-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.history-campaign-card__title-block {
  min-width: 0;
  display: grid;
  gap: 0.45rem;
}

.history-campaign-card__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.history-campaign-card__title-row .card-title {
  min-width: 0;
  overflow-wrap: anywhere;
}

.history-campaign-card__count {
  margin: 0;
  flex-shrink: 0;
  color: var(--app-text-muted);
}

.history-session-list {
  display: grid;
  gap: 0.85rem;
}

.history-session-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.95rem 1rem;
  border-radius: 1rem;
  background: color-mix(in srgb, var(--app-bg) 22%, var(--app-surface));
  border: 1px solid var(--app-surface-outline);
}

.history-session-card__body {
  min-width: 0;
  display: grid;
  gap: 0.35rem;
}

.history-session-card__title {
  margin: 0;
  font-size: 1rem;
  overflow-wrap: anywhere;
}

.history-session-card__notes {
  margin: 0;
  color: var(--app-text-muted);
}

.history-undated-groups {
  display: grid;
  gap: 1rem;
}

.history-undated-group {
  display: grid;
  gap: 0.75rem;
}

.history-undated-group__title {
  margin: 0;
  font-size: 1rem;
}

@media (max-width: 640px) {
  .history-campaign-card__header,
  .history-campaign-card__title-row,
  .history-session-card {
    flex-direction: column;
    align-items: stretch;
  }

  .history-campaign-card__count {
    flex-shrink: 1;
  }
}
</style>
