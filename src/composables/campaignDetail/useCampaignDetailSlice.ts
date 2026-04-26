import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../../store/authStore';
import { getCampaignById } from '../../api/campaignsApi';
import { createSession, getSessionsByCampaign } from '../../api/sessionsApi';
import { getMyJoinRequestForCampaign } from '../../api/campaignPlayersApi';
import type {
  CampaignPlayerResponse,
  CampaignResponse,
  CreateSessionRequest,
  SessionResponse,
} from '../../types/api';
import { extractApiErrorMessage } from '../../utils/errorMessage';

export function useCampaignDetailSlice() {
  const route = useRoute();
  const router = useRouter();
  const authStore = useAuthStore();
  const { canManageContent } = storeToRefs(authStore);
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
    notes: '',
  });

  const creatingSession = ref(false);
  const sessionFormError = ref('');

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
        notes: sessionForm.notes?.trim() || undefined,
      });
      sessionForm.title = '';
      sessionForm.sessionNumber = Math.max(1, sessionForm.sessionNumber + 1);
      sessionForm.sessionDate = '';
      sessionForm.notes = '';
      await loadSessions();
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

  watch(
    [() => authStore.isAuthenticated, campaignId],
    ([loggedIn, id]) => {
      if (loggedIn && id) {
        refreshAll();
      } else {
        campaign.value = null;
        sessions.value = [];
        myJoinRequest.value = null;
      }
    },
    { immediate: true },
  );

  return {
    canMutate,
    campaign,
    campaignError,
    creatingSession,
    goToSession,
    handleCreateSession,
    joinRequestError,
    loadingCampaign,
    loadingJoinRequest,
    loadingSessions,
    loadSessions,
    myJoinRequest,
    routeCampaignParam,
    sessionForm,
    sessionFormError,
    sessions,
    sessionsError,
    loadMyJoinRequest,
    loadCampaign,
  };
}

export type UseCampaignDetailSliceReturn = ReturnType<typeof useCampaignDetailSlice>;
