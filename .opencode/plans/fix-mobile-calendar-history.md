# Fix Mobile Layout - Calendario History

## File da modificare
- `src/views/ProfileHistoryCalendarView.vue`

## Cambiamenti

### 1. Script - Aggiunte

**Import aggiuntivo:**
```ts
import type { HistoryCalendarEvent } from '../composables/history/useProfileHistory';
```

**calendarDays computed - aggiunta proprietà:**
- Aggiungere `maxEventsPerCell = 2`
- Per ogni giorno aggiungere:
  - `visibleEvents: dayEvents.slice(0, maxEventsPerCell)`
  - `hiddenCount: Math.max(0, dayEvents.length - maxEventsPerCell)`

**Nuovi computed:**
```ts
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
```

**Nuova funzione:**
```ts
const formatDayLabel = (dayKey: string) => {
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
};
```

### 2. Template - Toolbar compatta

**Prima:**
```vue
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
```

**Dopo:**
```vue
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
```

### 3. Template - Eventi nelle celle (max 2 + N)

**Prima:**
```vue
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
```

**Dopo:**
```vue
<div v-if="day.visibleEvents.length" class="history-calendar-day__events">
  <RouterLink
    v-for="event in day.visibleEvents"
    :key="event.id"
    :to="{ name: event.detailRouteName, params: { id: event.id } }"
    class="history-calendar-event"
  >
    <span class="history-calendar-event__title">{{ event.title }}</span>
    <span class="history-calendar-event__campaign">{{ event.campaignName }}</span>
  </RouterLink>
  <span v-if="day.hiddenCount > 0" class="history-calendar-event-more">+{{ day.hiddenCount }}</span>
</div>
```

### 4. Template - Lista sessioni del mese (NUOVO)

Aggiungere DOPO `</article>` del calendario e PRIMA delle "sessioni senza data":

```vue
<article v-if="monthlySessions.length" class="card stack">
  <h2 class="card-title">Sessioni del mese</h2>

  <div class="monthly-session-list">
    <div v-for="dayKey in monthlySessionDays" :key="dayKey" class="monthly-session-day">
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
```

### 5. CSS - Toolbar compatta

**Aggiungere:**
```css
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
```

### 6. CSS - Calendario più compatto

**Modificare `.history-calendar-day`:**
- Da `min-height: 9rem` → rimane 9rem desktop, ridotto su mobile
- Da `gap: 0.7rem` → `gap: 0.5rem`
- Da `padding: 0.75rem` → `padding: 0.6rem`
- Da `border-radius: 1rem` → `border-radius: 0.85rem`
- Aggiungere `min-width: 0`

**Modificare `.history-calendar-day__header`:**
- Da `gap: 0.5rem` → `gap: 0.4rem`
- Aggiungere `font-size: 0.88rem`

**Modificare `.history-calendar-day__header small`:**
- Aggiungere `font-size: 0.72rem`

**Modificare `.history-calendar-day__events`:**
- Da `gap: 0.45rem` → `gap: 0.35rem`

### 7. CSS - Eventi con ellipsis

**Modificare `.history-calendar-event, .history-calendar-undated__item`:**
- Cambiare `display: grid` → `display: block`
- Aggiungere `max-width: 100%`
- Aggiungere `overflow: hidden`
- Da `gap: 0.15rem` → `gap: 0.1rem`
- Da `padding: 0.55rem 0.65rem` → `padding: 0.35rem 0.5rem`
- Da `border-radius: 0.85rem` → `border-radius: 0.6rem`

**Nuove classi per ellipsis:**
```css
.history-calendar-event__title,
.history-calendar-event__campaign {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-calendar-event__title {
  font-weight: 600;
  font-size: 0.78rem;
  line-height: 1.2;
}

.history-calendar-event__campaign {
  color: var(--app-text-muted);
  font-size: 0.68rem;
  line-height: 1.2;
}

.history-calendar-event-more {
  display: block;
  text-align: center;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--app-accent-strong);
  padding: 0.15rem 0;
}
```

### 8. CSS - Lista sessioni del mese

```css
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
```

### 9. CSS - Media query mobile (max-width: 760px)

**Modificare:**
```css
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
    gap: 0.35rem;
  }

  .history-calendar-day__header {
    font-size: 0.78rem;
    gap: 0.3rem;
  }

  .history-calendar-day__header small {
    font-size: 0.65rem;
  }

  .history-calendar-day__events {
    gap: 0.25rem;
  }

  .history-calendar-event {
    padding: 0.28rem 0.4rem;
    border-radius: 0.5rem;
  }

  .history-calendar-event__title {
    font-size: 0.7rem;
  }

  .history-calendar-event__campaign {
    font-size: 0.6rem;
  }

  .history-calendar-event-more {
    font-size: 0.65rem;
  }
}
```

### 10. CSS - Media query mobile stretto (max-width: 560px)

**Modificare:**
```css
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

  .history-calendar-day__header small {
    font-size: 0.6rem;
  }

  .history-calendar-event {
    padding: 0.22rem 0.35rem;
    border-radius: 0.4rem;
    gap: 0;
  }

  .history-calendar-event__title {
    font-size: 0.64rem;
    line-height: 1.15;
  }

  .history-calendar-event__campaign {
    font-size: 0.56rem;
    line-height: 1.15;
  }

  .history-calendar-event-more {
    font-size: 0.58rem;
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
```

### 11. CSS - Rimuovere vecchie media query

Rimuovere le vecchie regole:
- `.history-calendar-day__header { align-items: flex-start; flex-direction: column; }` (non più necessaria)
- Vecchie regole per `.history-calendar-event strong` e `.history-calendar-event small` con ellipsis (sostituite dalle nuove classi)

## Riepilogo modifiche

| Area | Cambiamento |
|------|-------------|
| Toolbar | 3 bottoni compatti: ← Oggi → |
| Celle calendario | min-height: 9rem → 6rem → 4.5rem su mobile |
| Gap griglia | 0.65rem → 0.3rem → 0.25rem su mobile |
| Eventi per cella | Max 2 visibili, poi "+N" |
| Testo eventi | Ellipsis su titolo e campagna |
| Lista mese | Nuova sezione sotto calendario |
| Bottom nav | Gestita da `.mobile-app-shell__content` (esistente) |
| Theme | Usa solo variabili `--app-*` |
| Desktop | Preservato con media query mobile-first |

## Test da eseguire

```bash
npm run build
```

Test manuali:
1. Apri /profile/history/calendar su mobile stretto
2. Verifica nessun overflow orizzontale
3. Verifica calendario dentro card/pagina
4. Verifica bottoni mese compatti
5. Verifica eventi non rompono celle
6. Verifica lista "Sessioni del mese" sotto
7. Clicca evento calendario → apre sessione
8. Clicca sessione lista → apre sessione
9. Verifica bottom nav non copre contenuti
10. Test default/arcane/kawaii theme
11. Test desktop
