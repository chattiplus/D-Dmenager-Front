import { computed, onMounted, ref } from 'vue';
import { getPublicWorlds } from '../../api/worldsApi';
import { getCampaignsByWorld } from '../../api/campaignsApi';
import { getMyCharacters } from '../../api/charactersApi';
import { getMyJoinRequests, requestCampaignJoin } from '../../api/campaignPlayersApi';
import type {
  CampaignPlayerResponse,
  CampaignResponse,
  PlayerCharacterResponse,
  WorldResponse,
} from '../../types/api';
import { extractApiErrorMessage } from '../../utils/errorMessage';
import { useAuthStore } from '../../store/authStore';

type JoinFormState = {
  characterId: number | null;
  message: string;
  submitting: boolean;
  error: string;
  success: string;
};

export type CampaignWithForm = CampaignResponse & { form: JoinFormState };
export type CampaignCard = {
  world: WorldResponse;
  campaigns: CampaignWithForm[];
};

export function usePublicWorldsSlice() {
  const authStore = useAuthStore();
  const worlds = ref<CampaignCard[]>([]);
  const loading = ref(false);
  const errorMessage = ref('');
  const characters = ref<PlayerCharacterResponse[]>([]);
  const joinRequests = ref<Record<number, CampaignPlayerResponse>>({});
  const joinRequestWarning = ref('');

  const loadWorlds = async () => {
    loading.value = true;
    errorMessage.value = '';
    try {
      const worldList = await getPublicWorlds();
      const cards = await Promise.all(
        worldList.map(async (world) => {
          const campaigns = await getCampaignsByWorld(world.id);
          const campaignsWithForms: CampaignWithForm[] = campaigns.map((campaign) => ({
            ...campaign,
            form: {
              characterId: null,
              message: '',
              submitting: false,
              error: '',
              success: '',
            },
          }));
          return { world, campaigns: campaignsWithForms };
        }),
      );
      worlds.value = cards;
    } catch (error) {
      errorMessage.value = extractApiErrorMessage(error, 'Impossibile caricare i mondi pubblici.');
    } finally {
      loading.value = false;
    }
  };

  const loadCharacters = async () => {
    if (authStore.isViewerOnly) {
      characters.value = [];
      return;
    }
    try {
      characters.value = await getMyCharacters();
    } catch (error) {
      errorMessage.value = extractApiErrorMessage(error, 'Impossibile recuperare i personaggi.');
    }
  };

  const loadJoinRequests = async () => {
    if (authStore.isViewerOnly) {
      joinRequests.value = {};
      joinRequestWarning.value = '';
      return;
    }
    joinRequestWarning.value = '';
    try {
      const requests = await getMyJoinRequests();
      const map: Record<number, CampaignPlayerResponse> = {};
      requests.forEach((req) => {
        if (req.campaignId != null) {
          map[req.campaignId] = req;
        }
      });
      joinRequests.value = map;
    } catch (error) {
      joinRequestWarning.value = extractApiErrorMessage(
        error,
        'Impossibile recuperare lo stato delle tue richieste.',
      );
    }
  };

  const statusLabel = (campaignId: number) => {
    const request = joinRequests.value[campaignId];
    if (!request) return 'Nessuna richiesta inviata.';
    if (request.status === 'PENDING') return 'Richiesta in attesa di approvazione.';
    if (request.status === 'APPROVED') return 'Hai accesso a questa campagna.';
    return 'Richiesta rifiutata. Puoi inviarne un\'altra.';
  };

  const canRequest = (campaignId: number) => {
    const request = joinRequests.value[campaignId];
    return !request || request.status === 'REJECTED';
  };

  const submitJoinRequest = async (campaign: CampaignWithForm) => {
    if (authStore.isViewerOnly) {
      campaign.form.error = 'Gli account Viewer non possono inviare richieste.';
      return;
    }
    const form = campaign.form;
    if (!form.characterId) {
      form.error = 'Seleziona un personaggio.';
      return;
    }
    form.error = '';
    form.success = '';
    form.submitting = true;
    try {
      const response = await requestCampaignJoin(campaign.id, {
        characterId: form.characterId,
        message: form.message || undefined,
      });
      joinRequests.value[campaign.id] = response;
      form.success = 'Richiesta inviata.';
    } catch (error) {
      form.error = extractApiErrorMessage(error, 'Impossibile inviare la richiesta.');
    } finally {
      form.submitting = false;
    }
  };

  const isViewerOnly = computed(() => authStore.isViewerOnly);

  onMounted(async () => {
    await loadWorlds();
    if (authStore.isViewerOnly) {
      characters.value = [];
      joinRequests.value = {};
      joinRequestWarning.value = '';
    } else {
      await Promise.all([loadCharacters(), loadJoinRequests()]);
    }
  });

  return {
    canRequest,
    characters,
    errorMessage,
    isViewerOnly,
    joinRequestWarning,
    loadWorlds,
    loading,
    statusLabel,
    submitJoinRequest,
    worlds,
  };
}

export type UsePublicWorldsSliceReturn = ReturnType<typeof usePublicWorldsSlice>;
