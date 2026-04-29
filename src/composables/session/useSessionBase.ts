import { ref, type Ref } from 'vue';
import { getSessionById } from '../../api/sessionsApi';
import { getCampaignById } from '../../api/campaignsApi';
import { getCampaignPlayers } from '../../api/campaignPlayersApi';
import type { CampaignPlayerResponse, SessionResponse } from '../../types/api';
import { extractApiErrorMessage } from '../../utils/errorMessage';

interface UseSessionBaseOptions {
  sessionId: Ref<number | null>;
  invalidSessionMessage?: string;
}

export const useSessionBase = ({
  sessionId,
  invalidSessionMessage = '',
}: UseSessionBaseOptions) => {
  const session = ref<SessionResponse | null>(null);
  const sessionError = ref('');
  const sessionLoading = ref(false);
  const campaignName = ref('');
  const campaignError = ref('');
  const campaignPlayers = ref<CampaignPlayerResponse[]>([]);
  const campaignPlayersError = ref('');

  const loadCampaignName = async (campaignId: number) => {
    campaignError.value = '';

    try {
      const campaign = await getCampaignById(campaignId);
      campaignName.value = campaign.name;
    } catch (error) {
      campaignError.value = extractApiErrorMessage(error, 'Impossibile recuperare la campagna.');
      campaignName.value = '';
    }
  };

  const loadCampaignPlayers = async (campaignId: number) => {
    campaignPlayersError.value = '';

    try {
      campaignPlayers.value = await getCampaignPlayers(campaignId);
    } catch (error) {
      campaignPlayersError.value = extractApiErrorMessage(
        error,
        'Impossibile caricare i personaggi della campagna.',
      );
      campaignPlayers.value = [];
    }
  };

  const loadSession = async () => {
    if (!sessionId.value) {
      session.value = null;
      sessionLoading.value = false;
      sessionError.value = invalidSessionMessage;
      return;
    }

    sessionLoading.value = true;
    sessionError.value = '';

    try {
      const data = await getSessionById(sessionId.value);
      session.value = data;
      await Promise.all([loadCampaignName(data.campaignId), loadCampaignPlayers(data.campaignId)]);
    } catch (error) {
      session.value = null;
      sessionError.value = extractApiErrorMessage(error, 'Impossibile caricare la sessione.');
    } finally {
      sessionLoading.value = false;
    }
  };

  return {
    session,
    sessionError,
    sessionLoading,
    campaignName,
    campaignError,
    campaignPlayers,
    campaignPlayersError,
    loadSession,
    loadCampaignName,
    loadCampaignPlayers,
  };
};
