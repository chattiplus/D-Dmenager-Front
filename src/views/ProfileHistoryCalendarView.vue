<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useProfileHistory } from '../composables/history/useProfileHistory';
import { useAuthStore } from '../store/authStore';
import type { HistoryCalendarEvent } from '../composables/history/useProfileHistory';

const authStore = useAuthStore();
const router = useRouter();
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
    const dayEvents = eventsByDay.value.get(key) ?? [];

    days.push({
      key,
      date,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === currentMonth.value.getMonth(),
      isToday: key === todayKey,
      events: dayEvents,
    });
  }

  return days;
});

const visibleUndatedSessions = computed(() =>
  [...undatedSessions.value].sort((a, b) => a.campaignName.localeCompare(b.campaignName, 'it')),
);

const monthlySessions = computed(() => {
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth();
  return calendarEvents.value.filter((event) => {
    return (
      event.startsAt.getFullYear() === year &&
      event.startsAt.getMonth() === month
    );
  });
});

const monthlySessionsByDay = computed(() => {
  const grouped = new Map<string, HistoryCalendarEvent[]>();
  monthlySessions.value.forEach((event) => {
    const list = grouped.get(event.dayKey) ?? [];
    list.push(event);
    grouped.set(event.dayKey, list);
  });
  return grouped;
});

const monthlySessionDays = computed(() =>
  [...monthlySessionsByDay.value.keys()].sort(),
);

const formatDayLabel = (dayKey: string) => {
  const parts = dayKey.split('-').map(Number);
  const [y, m, d] = parts as [number, number, number];
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
};

const selectedDayKey = ref<string | null>(null);

const selectDay = (dayKey: string) => {
  selectedDayKey.value = dayKey;
  const el = document.getElementById(`monthly-day-${dayKey}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const handleDayClick = (day: { key: string; events: typeof calendarEvents.value }) => {
  const firstEvent = day.events[0];
  if (!firstEvent) return;
  if (day.events.length === 1) {
    router.push({ name: firstEvent.detailRouteName, params: { id: firstEvent.id } });
  } else {
    selectDay(day.key);
  }
};

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
      <RouterLink class="btn btn-secondary btn-sm" to="/profile/history">
        Indietro
      </RouterLink>

      <div class="history-calendar-header__main">
        <p class="mobile-screen__eyebrow">History</p>
        <h1 class="mobile-screen__title">Calendario sessioni</h1>
        <p class="mobile-screen__subtitle">{{ monthLabel }}</p>
      </div>
    </header>

    <section class="history-calendar-toolbar">
      <button class="btn btn-secondary btn-icon" type="button" @click="goToPreviousMonth" aria-label="Mese precedente">
        ←
      </button>
      <button class="btn btn-secondary btn-compact" type="button" @click="goToToday">
        Oggi
      </button>
      <button class="btn btn-secondary btn-icon" type="button" @click="goToNextMonth" aria-label="Mese successivo">
        →
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
            </header>

            <button
              v-if="day.events.length"
              class="history-calendar-session-count"
              type="button"
              @click="handleDayClick(day)"
            >
              {{ day.events.length }}
            </button>
          </section>
        </div>
      </article>

      <article v-if="monthlySessions.length" class="card stack">
        <h2 class="card-title">Sessioni del mese</h2>

        <div class="monthly-session-list">
          <div v-for="dayKey in monthlySessionDays" :key="dayKey" :id="`monthly-day-${dayKey}`" class="monthly-session-day">
            <h3 class="monthly-session-day__date">{{ formatDayLabel(dayKey) }}</h3>
            <RouterLink
              v-for="event in monthlySessionsByDay.get(dayKey)"
              :key="event.id"
              :to="{ name: event.detailRouteName, params: { id: event.id } }"
              class="monthly-session-item"
            >
              <strong>{{ event.title }}</strong>
              <small>{{ event.campaignName }}</small>
            </RouterLink>
          </div>
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
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.history-calendar-toolbar .btn-icon {
  padding: 0.55rem 0.85rem;
  font-size: 1.15rem;
  line-height: 1;
  min-width: 2.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.history-calendar-toolbar .btn-compact {
  padding: 0.55rem 1.1rem;
  font-size: 0.85rem;
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
  min-width: 0;
  min-height: 9rem;
  display: grid;
  align-content: start;
  gap: 0.4rem;
  padding: 0.6rem;
  border-radius: 0.85rem;
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
  justify-content: center;
  color: var(--app-text);
  font-weight: 700;
  font-size: 0.88rem;
}

.history-calendar-session-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.4rem;
  height: 1.2rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 800;
  line-height: 1;
  max-width: 100%;
  border: none;
  cursor: pointer;
  color: var(--app-accent-contrast);
  background: var(--app-accent-strong);
  transition: transform 0.15s ease, background 0.15s ease;
  align-self: center;
}

.history-calendar-session-count:hover,
.history-calendar-session-count:focus-visible {
  outline: none;
  transform: scale(1.1);
  background: var(--app-accent);
}

.history-calendar-undated {
  display: grid;
  gap: 0.6rem;
}

.monthly-session-list {
  display: grid;
  gap: 1rem;
}

.monthly-session-day {
  display: grid;
  gap: 0.4rem;
}

.monthly-session-day__date {
  font-size: 0.82rem;
  color: var(--app-text-muted);
  font-weight: 700;
  text-transform: capitalize;
  margin: 0;
}

.monthly-session-item {
  display: block;
  max-width: 100%;
  overflow: hidden;
  padding: 0.55rem 0.65rem;
  border-radius: 0.75rem;
  text-decoration: none;
  color: var(--app-text);
  border: 1px solid color-mix(in srgb, var(--app-accent) 26%, var(--app-surface-outline));
  background: color-mix(in srgb, var(--app-accent) 10%, var(--app-surface-elevated));
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}

.monthly-session-item:hover,
.monthly-session-item:focus-visible {
  outline: none;
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--app-accent-strong) 42%, var(--app-surface-outline));
  background: color-mix(in srgb, var(--app-accent) 14%, var(--app-surface-elevated));
}

.monthly-session-item small {
  color: var(--app-text-muted);
}

@media (max-width: 760px) {
  .history-calendar-header {
    flex-direction: column;
    gap: 0.75rem;
  }

  .history-calendar-toolbar {
    gap: 0.4rem;
  }

  .history-calendar-weekdays,
  .history-calendar-grid {
    gap: 0.3rem;
  }

  .history-calendar-weekdays span {
    font-size: 0.7rem;
  }

  .history-calendar-shell {
    padding: 0.75rem;
  }

  .history-calendar-day {
    min-height: 6rem;
    padding: 0.4rem;
    gap: 0.3rem;
  }

  .history-calendar-day__header {
    font-size: 0.78rem;
  }

  .history-calendar-session-count {
    font-size: 0.65rem;
    min-width: 1.2rem;
    height: 1.1rem;
    padding: 0 0.3rem;
  }
}

@media (max-width: 560px) {
  .history-calendar-weekdays,
  .history-calendar-grid {
    gap: 0.25rem;
  }

  .history-calendar-weekdays span {
    font-size: 0.62rem;
    letter-spacing: 0.03em;
  }

  .history-calendar-shell {
    padding: 0.55rem;
    gap: 0.5rem;
  }

  .history-calendar-day {
    min-height: 4.5rem;
    padding: 0.3rem;
    gap: 0.25rem;
    border-radius: 0.65rem;
  }

  .history-calendar-day__header {
    font-size: 0.72rem;
  }

  .history-calendar-session-count {
    font-size: 0.6rem;
    min-width: 1.1rem;
    height: 1rem;
    padding: 0 0.25rem;
  }

  .monthly-session-day__date {
    font-size: 0.78rem;
  }

  .monthly-session-item {
    padding: 0.45rem 0.55rem;
    font-size: 0.88rem;
  }

  .monthly-session-item small {
    font-size: 0.78rem;
  }
}
</style>
