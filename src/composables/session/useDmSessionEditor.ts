import { reactive, ref, watch, type Ref } from 'vue';
import { deleteSession, updateSession } from '../../api/sessionsApi';
import type { CreateSessionRequest, SessionResponse } from '../../types/api';
import { extractApiErrorMessage } from '../../utils/errorMessage';

interface UseDmSessionEditorOptions {
  sessionId: Ref<number | null>;
  session: Ref<SessionResponse | null>;
  sessionError?: Ref<string>;
  onDeleted?: (campaignId: number) => void | Promise<void>;
  confirmDelete?: (message: string) => boolean | Promise<boolean>;
}

const DELETE_CONFIRM_MESSAGE =
  'Sei sicuro di voler eliminare questa sessione? L’operazione è irreversibile.';

export const useDmSessionEditor = ({
  sessionId,
  session,
  sessionError,
  onDeleted,
  confirmDelete,
}: UseDmSessionEditorOptions) => {
  const isEditingSession = ref(false);
  const sessionForm = reactive<CreateSessionRequest>({
    title: '',
    sessionNumber: 1,
    sessionDate: '',
    startTime: '20:30',
    notes: '',
  });
  const sessionFormError = ref('');
  const saveSessionLoading = ref(false);
  const deleteSessionLoading = ref(false);

  const populateSessionForm = (data: SessionResponse) => {
    sessionForm.title = data.title;
    sessionForm.sessionNumber = data.sessionNumber;
    sessionForm.sessionDate = data.sessionDate ?? '';
    sessionForm.startTime = data.startTime ?? '20:30';
    sessionForm.notes = data.notes ?? '';
  };

  const startSessionEdit = () => {
    if (!session.value) {
      return;
    }

    populateSessionForm(session.value);
    sessionFormError.value = '';
    isEditingSession.value = true;
  };

  const cancelSessionEdit = () => {
    isEditingSession.value = false;
    sessionFormError.value = '';

    if (session.value) {
      populateSessionForm(session.value);
    }
  };

  const saveSessionChanges = async () => {
    if (!sessionId.value) {
      return;
    }

    sessionFormError.value = '';
    saveSessionLoading.value = true;

    try {
      const payload: CreateSessionRequest = {
        title: sessionForm.title.trim(),
        sessionNumber: sessionForm.sessionNumber,
        sessionDate: sessionForm.sessionDate || undefined,
        startTime: sessionForm.startTime || undefined,
        notes: sessionForm.notes?.trim() || undefined,
      };
      const updated = await updateSession(sessionId.value, payload);
      session.value = updated;
      populateSessionForm(updated);
      isEditingSession.value = false;
    } catch (error) {
      sessionFormError.value = extractApiErrorMessage(error, 'Aggiornamento sessione non riuscito.');
    } finally {
      saveSessionLoading.value = false;
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionId.value || !session.value) {
      return;
    }

    const confirmed = confirmDelete
      ? await confirmDelete(DELETE_CONFIRM_MESSAGE)
      : window.confirm(DELETE_CONFIRM_MESSAGE);
    if (!confirmed) {
      return;
    }

    deleteSessionLoading.value = true;
    const campaignId = session.value.campaignId;

    try {
      await deleteSession(sessionId.value);
      if (onDeleted) {
        await onDeleted(campaignId);
      }
    } catch (error) {
      if (sessionError) {
        sessionError.value = extractApiErrorMessage(error, 'Eliminazione sessione non riuscita.');
      }
    } finally {
      deleteSessionLoading.value = false;
    }
  };

  watch(
    session,
    (value) => {
      if (value) {
        populateSessionForm(value);
      }
    },
    { immediate: true },
  );

  return {
    isEditingSession,
    sessionForm,
    sessionFormError,
    saveSessionLoading,
    deleteSessionLoading,
    populateSessionForm,
    startSessionEdit,
    cancelSessionEdit,
    saveSessionChanges,
    handleDeleteSession,
  };
};
