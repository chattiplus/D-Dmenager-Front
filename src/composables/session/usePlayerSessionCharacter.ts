import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
import { getCharacterById } from '../../api/charactersApi';
import type { CampaignPlayerResponse, PlayerCharacterResponse } from '../../types/api';

type SenderCharacterTarget = Ref<number | null> | ((characterId: number | null) => void);

interface UsePlayerSessionCharacterOptions {
  campaignPlayers: Ref<CampaignPlayerResponse[]>;
  currentUserId: Ref<number | null> | ComputedRef<number | null>;
  isSessionOwner: Ref<boolean> | ComputedRef<boolean>;
  setSenderCharacterId: SenderCharacterTarget;
}

const updateSenderCharacterId = (
  target: SenderCharacterTarget,
  characterId: number | null,
) => {
  if (typeof target === 'function') {
    target(characterId);
    return;
  }

  target.value = characterId;
};

export const usePlayerSessionCharacter = ({
  campaignPlayers,
  currentUserId,
  isSessionOwner,
  setSenderCharacterId,
}: UsePlayerSessionCharacterOptions) => {
  const playerSheetCharacter = ref<PlayerCharacterResponse | null>(null);
  let playerSheetCharacterLoadToken = 0;

  const userCampaignPlayer = computed(() =>
    campaignPlayers.value.find((player) => player.playerId === currentUserId.value),
  );

  const currentPlayerCharacterId = computed(() => userCampaignPlayer.value?.characterId ?? null);

  const currentPlayerCharacter = computed<PlayerCharacterResponse | null>(() => {
    return userCampaignPlayer.value?.characterData ?? playerSheetCharacter.value;
  });

  const availableCharacters = computed(() => {
    if (!userCampaignPlayer.value?.characterId) {
      return [];
    }

    return [
      {
        id: userCampaignPlayer.value.characterId,
        label: userCampaignPlayer.value.characterName ?? 'Mio Personaggio',
      },
    ];
  });

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

  const handleCharacterUpdated = (updatedCharacter: PlayerCharacterResponse) => {
    playerSheetCharacter.value = updatedCharacter;
    updateCampaignPlayerCharacterData(updatedCharacter);
  };

  const syncPlayerCharacterContext = async (player: CampaignPlayerResponse | undefined) => {
    const token = ++playerSheetCharacterLoadToken;

    if (!player || isSessionOwner.value) {
      updateSenderCharacterId(setSenderCharacterId, null);
      playerSheetCharacter.value = null;
      return;
    }

    const characterId = player.characterId ?? null;
    updateSenderCharacterId(setSenderCharacterId, characterId);

    if (!characterId) {
      playerSheetCharacter.value = null;
      return;
    }

    if (player.characterData) {
      playerSheetCharacter.value = player.characterData;
      return;
    }

    try {
      const character = await getCharacterById(characterId);

      if (token === playerSheetCharacterLoadToken) {
        playerSheetCharacter.value = character;
      }
    } catch {
      if (token === playerSheetCharacterLoadToken) {
        playerSheetCharacter.value = null;
      }
    }
  };

  const refreshCurrentPlayerCharacter = async () => {
    if (isSessionOwner.value) {
      return;
    }

    const characterId = currentPlayerCharacterId.value;
    if (!characterId) {
      playerSheetCharacter.value = null;
      return;
    }

    try {
      const updatedCharacter = await getCharacterById(characterId);
      handleCharacterUpdated(updatedCharacter);
    } catch {
      // Keep the last locally known sheet instead of blanking the tab on transient refresh failures.
    }
  };

  watch(
    userCampaignPlayer,
    (player) => {
      void syncPlayerCharacterContext(player);
    },
    { immediate: true },
  );

  watch(
    currentPlayerCharacterId,
    (characterId) => {
      if (!isSessionOwner.value) {
        updateSenderCharacterId(setSenderCharacterId, characterId ?? null);
      }
    },
    { immediate: true },
  );

  watch(
    isSessionOwner,
    (owner) => {
      if (owner) {
        updateSenderCharacterId(setSenderCharacterId, null);
      }
    },
    { immediate: true },
  );

  return {
    playerSheetCharacter,
    currentPlayerCharacterId,
    userCampaignPlayer,
    currentPlayerCharacter,
    availableCharacters,
    syncPlayerCharacterContext,
    refreshCurrentPlayerCharacter,
    updateCampaignPlayerCharacterData,
    handleCharacterUpdated,
  };
};
