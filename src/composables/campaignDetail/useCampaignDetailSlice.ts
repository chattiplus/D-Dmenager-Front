import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../../store/authStore';
import { deleteCampaign, getCampaignById, updateCampaign } from '../../api/campaignsApi';
import { createSession, deleteSession, getSessionsByCampaign } from '../../api/sessionsApi';
import { getMyJoinRequestForCampaign } from '../../api/campaignPlayersApi';
import type {
  CampaignPlayerResponse,
  CampaignResponse,
  CampaignStatus,
  CreateSessionRequest,
  SessionResponse,
} from '../../types/api';
import { extractApiErrorMessage } from '../../utils/errorMessage';
import { isCampaignStatus } from '../../utils/campaignStatus';

export function useCampaignDetailSlice() {
  const route = useRoute();
  const router = useRouter();
  const authStore = useAuthStore();
  const { canManageContent, profile } = storeToRefs(authStore);
  const canMutate = canManageContent;

  const campaignId = computed(() => {
    const value = Number(route.params.id);
    return Number.isNaN(value) ? null : value;
  });
  const routeCampaignParam = computed(() => route.params.id ?? '');

  const campaign = ref<CampaignResponse | null>(null);
  const sessions = ref<SessionResponse[]>([]);
  const myJoinRequest = ref<CampaignPlayerResponse | null>(null);

  const campaignError = ref('');
  const sessionsError = ref('');
  const loadingCampaign = ref(false);
  const loadingSessions = ref(false);
  const loadingJoinRequest = ref(false);
  const joinRequestError = ref('');

  const sessionForm = reactive<CreateSessionRequest>({
    title: '',
    sessionNumber: 1,
    sessionDate: '',
    startTime: '20:30',
    notes: '',
  });

  const creatingSession = ref(false);
  const sessionFormError = ref('');
  const showSessionForm = ref(false);
  const deletingSessionId = ref<number | null>(null);
  const deletingCampaign = ref(false);
  const isEditingCampaign = ref(false);
  const campaignEditLoading = ref(false);
  const campaignEditError = ref('');
  const campaignEditForm = reactive({
    name: '',
    description: '',
    status: 'PLANNED' as CampaignStatus,
  });

  const canManageCampaign = computed(() => {
    if (!campaign.value) {
      return false;
    }

    return canManageContent.value || (
      typeof campaign.value.ownerId === 'number' && campaign.value.ownerId === profile.value?.id
    );
  });

  const resetCampaignEditForm = () => {
    campaignEditForm.name = '';
    campaignEditForm.description = '';
    campaignEditForm.status = 'PLANNED';
  };

  const resetSessionForm = () => {
    sessionForm.title = '';
    sessionForm.sessionNumber = 1;
    sessionForm.sessionDate = '';
    sessionForm.startTime = '20:30';
    sessionForm.notes = '';
    sessionFormError.value = '';
  };

  const openSessionForm = () => {
    showSessionForm.value = true;
    sessionFormError.value = '';
  };

  const closeSessionForm = () => {
    showSessionForm.value = false;
    resetSessionForm();
  };

  const startCampaignEdit = () => {
    if (!campaign.value || !canManageCampaign.value) {
      return;
    }

    campaignEditForm.name = campaign.value.name;
    campaignEditForm.description = campaign.value.description ?? '';
    campaignEditForm.status = isCampaignStatus(campaign.value.status)
      ? campaign.value.status
      : 'PLANNED';
    campaignEditError.value = '';
    isEditingCampaign.value = true;
  };

  const cancelCampaignEdit = () => {
    isEditingCampaign.value = false;
    campaignEditError.value = '';
    resetCampaignEditForm();
  };

  const saveCampaignEdit = async () => {
    if (!campaign.value || !canManageCampaign.value) {
      return;
    }

    if (!campaign.value.worldId) {
      campaignEditError.value = 'World ID campagna non valido.';
      return;
    }

    const trimmedName = campaignEditForm.name.trim();
    if (!trimmedName) {
      campaignEditError.value = 'Il nome della campagna è obbligatorio.';
      return;
    }

    campaignEditLoading.value = true;
    campaignEditError.value = '';
    try {
      const updatedCampaign = await updateCampaign(campaign.value.id, {
        worldId: campaign.value.worldId,
        name: trimmedName,
        description: campaignEditForm.description.trim() || undefined,
        status: campaignEditForm.status,
      });
      campaign.value = updatedCampaign;
      cancelCampaignEdit();
    } catch (error) {
      campaignEditError.value = extractApiErrorMessage(
        error,
        'Aggiornamento campagna non riuscito.',
      );
    } finally {
      campaignEditLoading.value = false;
    }
  };

  const loadCampaign = async () => {
    if (!campaignId.value) {
      campaignError.value = 'ID campagna non valido.';
      return;
    }
    loadingCampaign.value = true;
    campaignError.value = '';
    try {
      campaign.value = await getCampaignById(campaignId.value);
    } catch (error) {
      campaignError.value = extractApiErrorMessage(
        error,
        'Errore nel caricamento della campagna.',
      );
    } finally {
      loadingCampaign.value = false;
    }
  };

  const loadSessions = async () => {
    if (!campaignId.value || !canMutate.value) return;
    loadingSessions.value = true;
    sessionsError.value = '';
    try {
      sessions.value = await getSessionsByCampaign(campaignId.value);
    } catch (error) {
      sessionsError.value = extractApiErrorMessage(error, 'Errore nel recupero delle sessioni.');
    } finally {
      loadingSessions.value = false;
    }
  };

  const loadMyJoinRequest = async () => {
    if (!campaignId.value || canMutate.value || authStore.isViewerOnly) {
      myJoinRequest.value = null;
      return;
    }
    loadingJoinRequest.value = true;
    joinRequestError.value = '';
    try {
      myJoinRequest.value = await getMyJoinRequestForCampaign(campaignId.value);
    } catch (error) {
      const message = extractApiErrorMessage(error);
      if (message.includes('not found')) {
        myJoinRequest.value = null;
      } else {
        joinRequestError.value = extractApiErrorMessage(error, 'Impossibile caricare la richiesta.');
      }
    } finally {
      loadingJoinRequest.value = false;
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadCampaign(), loadSessions(), loadMyJoinRequest()]);
  };

  const handleCreateSession = async () => {
    if (!campaignId.value) return;
    sessionFormError.value = '';
    creatingSession.value = true;
    try {
      await createSession(campaignId.value, {
        title: sessionForm.title.trim(),
        sessionNumber: sessionForm.sessionNumber,
        sessionDate: sessionForm.sessionDate || undefined,
        startTime: sessionForm.startTime || undefined,
        notes: sessionForm.notes?.trim() || undefined,
      });
      const nextSessionNumber = Math.max(1, sessionForm.sessionNumber + 1);
      resetSessionForm();
      sessionForm.sessionNumber = nextSessionNumber;
      await loadSessions();
      showSessionForm.value = false;
    } catch (error) {
      sessionFormError.value = extractApiErrorMessage(
        error,
        'Errore nella creazione della sessione.',
      );
    } finally {
      creatingSession.value = false;
    }
  };

  const goToSession = (sessionId: number) => {
    router.push({
      name: 'dm-session-detail',
      params: { id: sessionId },
    });
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (!canMutate.value) {
      return;
    }

    const confirmed = window.confirm('Sei sicuro di voler eliminare questa sessione?');
    if (!confirmed) {
      return;
    }

    deletingSessionId.value = sessionId;
    sessionsError.value = '';
    try {
      await deleteSession(sessionId);
      sessions.value = sessions.value.filter((session) => session.id !== sessionId);
    } catch (error) {
      sessionsError.value = extractApiErrorMessage(error, 'Impossibile eliminare la sessione.');
    } finally {
      deletingSessionId.value = null;
    }
  };

  const handleDeleteCampaign = async () => {
    if (!campaign.value || !canManageCampaign.value) {
      return;
    }

    const confirmed = window.confirm('Sei sicuro di voler eliminare questa campagna?');
    if (!confirmed) {
      return;
    }

    deletingCampaign.value = true;
    campaignError.value = '';
    try {
      const worldId = campaign.value.worldId;
      await deleteCampaign(campaign.value.id);
      await router.push({ name: 'world-detail', params: { id: worldId } });
    } catch (error) {
      campaignError.value = extractApiErrorMessage(error, 'Impossibile eliminare la campagna.');
    } finally {
      deletingCampaign.value = false;
    }
  };

  watch(
    [() => authStore.isAuthenticated, campaignId],
    ([loggedIn, id]) => {
      if (loggedIn && id) {
        refreshAll();
      } else {
        campaign.value = null;
        sessions.value = [];
        myJoinRequest.value = null;
        cancelCampaignEdit();
        closeSessionForm();
      }
    },
    { immediate: true },
  );

  return {
    campaignEditError,
    campaignEditForm,
    campaignEditLoading,
    canMutate,
    canManageCampaign,
    cancelCampaignEdit,
    campaign,
    campaignError,
    closeSessionForm,
    creatingSession,
    deletingCampaign,
    deletingSessionId,
    goToSession,
    handleCreateSession,
    handleDeleteCampaign,
    handleDeleteSession,
    isEditingCampaign,
    joinRequestError,
    loadingCampaign,
    loadingJoinRequest,
    loadingSessions,
    loadSessions,
    myJoinRequest,
    openSessionForm,
    routeCampaignParam,
    saveCampaignEdit,
    sessionForm,
    sessionFormError,
    sessions,
    sessionsError,
    showSessionForm,
    loadMyJoinRequest,
    loadCampaign,
    startCampaignEdit,
  };
}

export type UseCampaignDetailSliceReturn = ReturnType<typeof useCampaignDetailSlice>;
