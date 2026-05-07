<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useProfileHistory } from '../composables/history/useProfileHistory';
import { useAuthStore } from '../store/authStore';

const authStore = useAuthStore();
const {
  loading,
  error,
  calendarEvents,
  undatedSessions,
  loadHistory,
  formatHistoryDate,
} = useProfileHistory();

const weekdayLabels = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const currentMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

const monthLabel = computed(() =>
  new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(currentMonth.value),
);

const eventsByDay = computed(() => {
  const grouped = new Map<string, typeof calendarEvents.value>();
  calendarEvents.value.forEach((event) => {
    const list = grouped.get(event.dayKey) ?? [];
    list.push(event);
    grouped.set(event.dayKey, list);
  });
  return grouped;
});

const calendarDays = computed(() => {
  const monthStart = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), 1);
  const monthEnd = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 0);
  const startOffset = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - startOffset);

  const endOffset = 6 - ((monthEnd.getDay() + 6) % 7);
  const gridEnd = new Date(monthEnd);
  gridEnd.setDate(monthEnd.getDate() + endOffset);

  const days: Array<{
    key: string;
    date: Date;
    dayNumber: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    events: typeof calendarEvents.value;
  }> = [];

  const todayKey = (() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  for (const cursor = new Date(gridStart); cursor <= gridEnd; cursor.setDate(cursor.getDate() + 1)) {
    const date = new Date(cursor);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const key = `${year}-${month}-${day}`;

    days.push({
      key,
      date,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === currentMonth.value.getMonth(),
      isToday: key === todayKey,
      events: eventsByDay.value.get(key) ?? [],
    });
  }

  return days;
});

const visibleUndatedSessions = computed(() =>
  [...undatedSessions.value].sort((a, b) => a.campaignName.localeCompare(b.campaignName, 'it')),
);

const goToPreviousMonth = () => {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() - 1,
    1,
  );
};

const goToNextMonth = () => {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() + 1,
    1,
  );
};

const goToToday = () => {
  currentMonth.value = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
};

onMounted(() => {
  if (authStore.isAuthenticated) {
    loadHistory();
  }
});
</script>

<template>
  <section class="history-calendar-page mobile-screen stack">
    <header class="history-calendar-header">
      <RouterLink class="btn btn-secondary" to="/profile/history">
        Indietro
      </RouterLink>

      <div class="history-calendar-header__main">
        <p class="mobile-screen__eyebrow">History</p>
        <h1 class="mobile-screen__title">Calendario sessioni</h1>
        <p class="mobile-screen__subtitle">{{ monthLabel }}</p>
      </div>
    </header>

    <section class="history-calendar-toolbar">
      <button class="btn btn-secondary" type="button" @click="goToPreviousMonth">
        Mese precedente
      </button>
      <button class="btn btn-secondary" type="button" @click="goToToday">
        Oggi
      </button>
      <button class="btn btn-secondary" type="button" @click="goToNextMonth">
        Mese successivo
      </button>
    </section>

    <article v-if="loading" class="card stack">
      <h2 class="card-title">Caricamento calendario</h2>
      <p class="manager-meta">Sto preparando le sessioni passate nel calendario.</p>
    </article>

    <article v-else-if="error" class="card stack">
      <h2 class="card-title">Errore caricamento</h2>
      <p class="status-message text-danger">{{ error }}</p>
      <button class="btn btn-secondary" type="button" @click="loadHistory">
        Riprova
      </button>
    </article>

    <article v-else-if="!calendarEvents.length && !visibleUndatedSessions.length" class="card stack">
      <h2 class="card-title">Nessuna sessione passata</h2>
      <p class="manager-meta">Nessuna sessione passata da mostrare.</p>
    </article>

    <template v-else>
      <article class="history-calendar-shell">
        <div class="history-calendar-weekdays">
          <span v-for="label in weekdayLabels" :key="label">{{ label }}</span>
        </div>

        <div class="history-calendar-grid">
          <section
            v-for="day in calendarDays"
            :key="day.key"
            :class="[
              'history-calendar-day',
              {
                'is-outside-month': !day.isCurrentMonth,
                'is-today': day.isToday,
              },
            ]"
          >
            <header class="history-calendar-day__header">
              <span>{{ day.dayNumber }}</span>
              <small v-if="day.events.length">{{ day.events.length }} sessioni</small>
            </header>

            <div v-if="day.events.length" class="history-calendar-day__events">
              <RouterLink
                v-for="event in day.events"
                :key="event.id"
                :to="{ name: event.detailRouteName, params: { id: event.id } }"
                class="history-calendar-event"
              >
                <strong>{{ event.title }}</strong>
                <small>{{ event.campaignName }}</small>
              </RouterLink>
            </div>
          </section>
        </div>
      </article>

      <article v-if="visibleUndatedSessions.length" class="card stack">
        <h2 class="card-title">Sessioni senza data</h2>
        <p class="manager-meta">
          Non compaiono nella griglia ma restano accessibili dallo storico.
        </p>

        <div class="history-calendar-undated">
          <RouterLink
            v-for="session in visibleUndatedSessions"
            :key="session.id"
            :to="{ name: session.detailRouteName, params: { id: session.id } }"
            class="history-calendar-undated__item"
          >
            <strong>{{ session.title }}</strong>
            <small>{{ session.campaignName }} · {{ formatHistoryDate(session.sessionDate) }}</small>
          </RouterLink>
        </div>
      </article>
    </template>
  </section>
</template>

<style scoped>
.history-calendar-page {
  gap: 1rem;
}

.history-calendar-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.history-calendar-header__main {
  min-width: 0;
  flex: 1;
}

.history-calendar-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.history-calendar-shell {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 1.25rem;
  background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--app-surface-elevated) 96%, transparent),
      color-mix(in srgb, var(--app-surface) 96%, transparent)
    );
  border: 1px solid var(--app-surface-outline);
  box-shadow: 0 18px 34px color-mix(in srgb, var(--app-shadow) 72%, transparent);
}

.history-calendar-weekdays,
.history-calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.65rem;
}

.history-calendar-weekdays span {
  text-align: center;
  color: var(--app-text-muted);
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.history-calendar-day {
  min-height: 9rem;
  display: grid;
  align-content: start;
  gap: 0.7rem;
  padding: 0.75rem;
  border-radius: 1rem;
  border: 1px solid var(--app-surface-outline);
  background: color-mix(in srgb, var(--app-bg) 18%, var(--app-surface));
}

.history-calendar-day.is-outside-month {
  opacity: 0.5;
}

.history-calendar-day.is-today {
  border-color: color-mix(in srgb, var(--app-accent) 52%, var(--app-surface-outline));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--app-accent) 18%, transparent);
}

.history-calendar-day__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  color: var(--app-text);
  font-weight: 700;
}

.history-calendar-day__header small {
  color: var(--app-text-muted);
  font-weight: 600;
}

.history-calendar-day__events {
  display: grid;
  gap: 0.45rem;
}

.history-calendar-event,
.history-calendar-undated__item {
  display: grid;
  gap: 0.15rem;
  padding: 0.55rem 0.65rem;
  border-radius: 0.85rem;
  text-decoration: none;
  color: var(--app-text);
  border: 1px solid color-mix(in srgb, var(--app-accent) 26%, var(--app-surface-outline));
  background: color-mix(in srgb, var(--app-accent) 10%, var(--app-surface-elevated));
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}

.history-calendar-event:hover,
.history-calendar-event:focus-visible,
.history-calendar-undated__item:hover,
.history-calendar-undated__item:focus-visible {
  outline: none;
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--app-accent-strong) 42%, var(--app-surface-outline));
  background: color-mix(in srgb, var(--app-accent) 14%, var(--app-surface-elevated));
}

.history-calendar-event small,
.history-calendar-undated__item small {
  color: var(--app-text-muted);
}

.history-calendar-undated {
  display: grid;
  gap: 0.75rem;
}

@media (max-width: 760px) {
  .history-calendar-header {
    flex-direction: column;
  }

  .history-calendar-weekdays,
  .history-calendar-grid {
    gap: 0.45rem;
  }

  .history-calendar-day {
    min-height: 7.5rem;
    padding: 0.55rem;
  }

  .history-calendar-event {
    padding: 0.45rem 0.5rem;
  }

  .history-calendar-event strong,
  .history-calendar-event small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

@media (max-width: 560px) {
  .history-calendar-shell {
    padding: 0.75rem;
  }

  .history-calendar-day {
    min-height: 6.5rem;
  }

  .history-calendar-day__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .history-calendar-event strong {
    font-size: 0.82rem;
  }

  .history-calendar-event small {
    font-size: 0.72rem;
  }
}
</style>
