import { computed, ref, watch, type Ref } from 'vue';
import { getCampaignById } from '../../api/campaignsApi';
import { getCharacterById, getMyCharacters } from '../../api/charactersApi';
import { getNpcsByWorld } from '../../api/npcsApi';
import type {
  CampaignPlayerResponse,
  NpcResponse,
  PlayerCharacterResponse,
  SessionResponse,
} from '../../types/api';
import { extractApiErrorMessage } from '../../utils/errorMessage';

interface UseDmSessionCharactersOptions {
  campaignPlayers: Ref<CampaignPlayerResponse[]>;
  session: Ref<SessionResponse | null>;
}

export const useDmSessionCharacters = ({
  campaignPlayers,
  session,
}: UseDmSessionCharactersOptions) => {
  const npcs = ref<NpcResponse[]>([]);
  const npcsLoading = ref(false);
  const selectedSheetCharacter = ref<NpcResponse | PlayerCharacterResponse | null>(null);
  const selectedSheetType = ref<'PC' | 'NPC'>('PC');
  const playerSheetCharacters = ref<Record<number, PlayerCharacterResponse>>({});
  const loadingPlayerSheetId = ref<number | null>(null);
  const playerSheetError = ref('');
  const myCharacters = ref<PlayerCharacterResponse[]>([]);

  const chatCharacterOptions = computed(() =>
    myCharacters.value.map((character) => ({
      id: character.id,
      label: character.name,
    })),
  );

  const resetDmSheetSelectionState = () => {
    npcs.value = [];
    playerSheetCharacters.value = {};
    selectedSheetCharacter.value = null;
    selectedSheetType.value = 'PC';
    playerSheetError.value = '';
    loadingPlayerSheetId.value = null;
  };

  const loadNpcs = async (worldId: number) => {
    npcsLoading.value = true;
    try {
      npcs.value = await getNpcsByWorld(worldId);
    } catch (error) {
      console.error('Failed to load NPCs', error);
      npcs.value = [];
    } finally {
      npcsLoading.value = false;
    }
  };

  const loadMyCharacters = async () => {
    try {
      myCharacters.value = await getMyCharacters();
    } catch (error) {
      console.error('Failed to load DM characters', error);
      myCharacters.value = [];
    }
  };

  const selectSheetCharacter = (
    character: PlayerCharacterResponse | NpcResponse,
    type: 'PC' | 'NPC',
  ) => {
    selectedSheetCharacter.value = character;
    selectedSheetType.value = type;
  };

  const updateCampaignPlayerCharacterData = (updatedCharacter: PlayerCharacterResponse) => {
    campaignPlayers.value = campaignPlayers.value.map((player) => {
      if (player.characterId !== updatedCharacter.id || !player.characterData) {
        return player;
      }

      return {
        ...player,
        characterData: updatedCharacter,
      };
    });
  };

  const applyUpdatedPlayerCharacter = (updatedCharacter: PlayerCharacterResponse) => {
    playerSheetCharacters.value = {
      ...playerSheetCharacters.value,
      [updatedCharacter.id]: updatedCharacter,
    };

    if (
      selectedSheetType.value === 'PC' &&
      selectedSheetCharacter.value?.id === updatedCharacter.id
    ) {
      selectedSheetCharacter.value = updatedCharacter;
    }

    updateCampaignPlayerCharacterData(updatedCharacter);
    playerSheetError.value = '';
  };

  const resolvePlayerCharacter = async (
    player: CampaignPlayerResponse,
  ): Promise<PlayerCharacterResponse | null> => {
    if (player.characterData) {
      return player.characterData;
    }

    if (!player.characterId) {
      return null;
    }

    const cached = playerSheetCharacters.value[player.characterId];
    if (cached) {
      return cached;
    }

    loadingPlayerSheetId.value = player.characterId;
    playerSheetError.value = '';

    try {
      const character = await getCharacterById(player.characterId);
      applyUpdatedPlayerCharacter(character);
      return character;
    } catch (error) {
      playerSheetError.value = extractApiErrorMessage(
        error,
        'Impossibile caricare la scheda del personaggio.',
      );
      return null;
    } finally {
      loadingPlayerSheetId.value = null;
    }
  };

  const selectPlayerSheetCharacter = async (player: CampaignPlayerResponse) => {
    const character = await resolvePlayerCharacter(player);
    if (!character) {
      return;
    }

    selectSheetCharacter(character, 'PC');
  };

  const refreshSelectedSheetCharacter = async () => {
    if (!selectedSheetCharacter.value || selectedSheetType.value !== 'PC') {
      return;
    }

    const characterId = selectedSheetCharacter.value.id;
    if (!characterId) {
      return;
    }

    try {
      const updatedCharacter = await getCharacterById(characterId);
      applyUpdatedPlayerCharacter(updatedCharacter);
    } catch (error) {
      playerSheetError.value = extractApiErrorMessage(
        error,
        'Impossibile aggiornare la scheda del personaggio.',
      );
    }
  };

  watch(
    () => session.value?.id ?? null,
    (sessionEntityId, previousSessionEntityId) => {
      if (sessionEntityId !== previousSessionEntityId) {
        resetDmSheetSelectionState();
      }

      if (!sessionEntityId) {
        myCharacters.value = [];
      }
    },
    { immediate: true },
  );

  watch(
    () => session.value?.campaignId ?? null,
    async (campaignId) => {
      if (!campaignId) {
        npcs.value = [];
        return;
      }

      void loadMyCharacters();

      try {
        const campaign = await getCampaignById(campaignId);
        await loadNpcs(campaign.worldId);
      } catch (error) {
        console.error('Failed to load campaign/world info for NPCs', error);
        npcs.value = [];
      }
    },
    { immediate: true },
  );

  return {
    npcs,
    npcsLoading,
    selectedSheetCharacter,
    selectedSheetType,
    playerSheetCharacters,
    loadingPlayerSheetId,
    playerSheetError,
    myCharacters,
    chatCharacterOptions,
    loadNpcs,
    loadMyCharacters,
    selectSheetCharacter,
    updateCampaignPlayerCharacterData,
    applyUpdatedPlayerCharacter,
    resolvePlayerCharacter,
    selectPlayerSheetCharacter,
    refreshSelectedSheetCharacter,
    resetDmSheetSelectionState,
  };
};
