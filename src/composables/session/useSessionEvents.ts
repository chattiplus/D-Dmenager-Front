import { reactive, ref, watch, type ComputedRef, type Ref } from 'vue';
import {
  createSessionEvent,
  deleteSessionEvent,
  getSessionEvents,
  updateSessionEvent,
} from '../../api/sessionEventsApi';
import type { CreateSessionEventRequest, SessionEventResponse } from '../../types/api';
import { extractApiErrorMessage } from '../../utils/errorMessage';

interface UseSessionEventsOptions {
  sessionId: Ref<number | null>;
  canManageContent: Ref<boolean> | ComputedRef<boolean>;
}

const createDefaultEventForm = (): CreateSessionEventRequest => ({
  sessionId: 0,
  title: '',
  type: '',
  description: '',
  inGameTime: '',
  isVisibleToPlayers: true,
});

export const useSessionEvents = ({
  sessionId,
  canManageContent,
}: UseSessionEventsOptions) => {
  const events = ref<SessionEventResponse[]>([]);
  const eventsError = ref('');
  const loadingEvents = ref(false);
  const eventForm = reactive<CreateSessionEventRequest>(createDefaultEventForm());
  const eventFormError = ref('');
  const submittingEvent = ref(false);
  const editingEventId = ref<number | null>(null);

  const resetEventForm = () => {
    const initialState = createDefaultEventForm();
    eventForm.sessionId = sessionId.value ?? 0;
    eventForm.title = initialState.title;
    eventForm.type = initialState.type;
    eventForm.description = initialState.description;
    eventForm.inGameTime = initialState.inGameTime;
    eventForm.isVisibleToPlayers = initialState.isVisibleToPlayers;
  };

  const loadEvents = async () => {
    if (!sessionId.value) {
      eventsError.value = 'ID sessione non valido.';
      events.value = [];
      return;
    }

    loadingEvents.value = true;
    eventsError.value = '';

    try {
      events.value = await getSessionEvents(sessionId.value);
    } catch (error) {
      eventsError.value = extractApiErrorMessage(error, 'Errore nel recupero della timeline.');
    } finally {
      loadingEvents.value = false;
    }
  };

  const cancelEventEdit = () => {
    editingEventId.value = null;
    eventFormError.value = '';
    resetEventForm();
  };

  const startEventEdit = (event: SessionEventResponse) => {
    if (!canManageContent.value) {
      return;
    }

    editingEventId.value = event.id;
    eventForm.sessionId = sessionId.value ?? event.sessionId;
    eventForm.title = event.title;
    eventForm.type = event.type ?? '';
    eventForm.description = event.description ?? '';
    eventForm.inGameTime = event.inGameTime ?? '';
    eventForm.isVisibleToPlayers = event.isVisibleToPlayers;
    eventFormError.value = '';
  };

  const submitEvent = async () => {
    if (!sessionId.value || !canManageContent.value) {
      return;
    }

    eventFormError.value = '';
    submittingEvent.value = true;

    try {
      const payload: CreateSessionEventRequest = {
        sessionId: sessionId.value,
        title: eventForm.title.trim(),
        type: eventForm.type?.trim() || undefined,
        description: eventForm.description?.trim() || undefined,
        inGameTime: eventForm.inGameTime?.trim() || undefined,
        isVisibleToPlayers: eventForm.isVisibleToPlayers,
      };

      if (editingEventId.value) {
        await updateSessionEvent(editingEventId.value, payload);
      } else {
        await createSessionEvent(payload);
      }

      cancelEventEdit();
      await loadEvents();
    } catch (error) {
      eventFormError.value = extractApiErrorMessage(error, 'Salvataggio evento non riuscito.');
    } finally {
      submittingEvent.value = false;
    }
  };

  const removeEvent = async (eventId: number) => {
    if (!canManageContent.value) {
      return;
    }

    try {
      await deleteSessionEvent(eventId);
      await loadEvents();
    } catch (error) {
      eventsError.value = extractApiErrorMessage(error, 'Eliminazione evento non riuscita.');
    }
  };

  watch(
    sessionId,
    (id) => {
      eventForm.sessionId = id ?? 0;
      editingEventId.value = null;
      eventFormError.value = '';
      resetEventForm();
    },
    { immediate: true },
  );

  return {
    events,
    eventsError,
    loadingEvents,
    eventForm,
    eventFormError,
    submittingEvent,
    editingEventId,
    loadEvents,
    submitEvent,
    startEventEdit,
    cancelEventEdit,
    removeEvent,
  };
};
