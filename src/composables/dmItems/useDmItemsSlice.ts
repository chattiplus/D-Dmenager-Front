import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getWorlds } from '../../api/worldsApi';
import { getLocations } from '../../api/locationsApi';
import {
  createItem,
  deleteItem,
  getItems,
  getItemsByWorld,
  updateItem,
} from '../../api/itemsApi';
import type {
  CreateItemRequest,
  ItemResponse,
  LocationResponse,
  WorldResponse,
} from '../../types/api';
import { extractApiErrorMessage } from '../../utils/errorMessage';

export type FilterWorldId = number | 'all';

export function useDmItemsSlice() {
  const route = useRoute();
  const router = useRouter();

  const worlds = ref<WorldResponse[]>([]);
  const worldsLoading = ref(false);
  const worldsError = ref('');

  const allLocations = ref<LocationResponse[]>([]);
  const locationsLoading = ref(false);
  const locationsError = ref('');

  const selectedWorldId = ref<FilterWorldId>('all');

  const items = ref<ItemResponse[]>([]);
  const itemsLoading = ref(false);
  const itemsError = ref('');
  const deleteLoading = ref<number | null>(null);

  const editingItemId = ref<number | null>(null);
  const formError = ref('');
  const formLoading = ref(false);
  const activeTab = ref<'items' | 'create'>('items');

  const formState = reactive<CreateItemRequest>({
    worldId: 0,
    locationId: undefined,
    name: '',
    type: '',
    rarity: '',
    description: '',
    gmNotes: '',
    isVisibleToPlayers: true,
  });

  const worldName = (worldId: number) => {
    const world = worlds.value.find((entry) => entry.id === worldId);
    return world?.name ?? `Mondo #${worldId}`;
  };

  const locationOptions = computed(() =>
    allLocations.value.filter((location) => location.worldId === formState.worldId),
  );

  const optionalText = (value?: string | null) => {
    if (value == null) return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  };

  const ensureFormWorld = () => {
    if (formState.worldId && worlds.value.some((world) => world.id === formState.worldId)) {
      return;
    }
    formState.worldId = worlds.value[0]?.id ?? 0;
  };

  const sanitizeFilter = () => {
    if (selectedWorldId.value === 'all') return;
    const exists = worlds.value.some((world) => world.id === selectedWorldId.value);
    if (!exists) {
      selectedWorldId.value = 'all';
    }
  };

  const resetForm = () => {
    editingItemId.value = null;
    formState.name = '';
    formState.type = '';
    formState.rarity = '';
    formState.description = '';
    formState.gmNotes = '';
    formState.locationId = undefined;
    formState.isVisibleToPlayers = true;
    ensureFormWorld();
    formError.value = '';
  };

  const fetchWorlds = async () => {
    worldsLoading.value = true;
    worldsError.value = '';
    try {
      worlds.value = await getWorlds();
      ensureFormWorld();
      sanitizeFilter();
    } catch (error) {
      worldsError.value = extractApiErrorMessage(error, 'Impossibile caricare i mondi.');
      worlds.value = [];
      formState.worldId = 0;
    } finally {
      worldsLoading.value = false;
    }
  };

  const fetchLocations = async () => {
    locationsLoading.value = true;
    locationsError.value = '';
    try {
      allLocations.value = await getLocations();
    } catch (error) {
      locationsError.value = extractApiErrorMessage(
        error,
        'Impossibile recuperare le location.',
      );
      allLocations.value = [];
    } finally {
      locationsLoading.value = false;
    }
  };

  const fetchItems = async () => {
    itemsLoading.value = true;
    itemsError.value = '';
    try {
      if (selectedWorldId.value === 'all') {
        items.value = await getItems();
      } else {
        items.value = await getItemsByWorld(selectedWorldId.value);
      }
    } catch (error) {
      itemsError.value = extractApiErrorMessage(error, 'Impossibile caricare gli oggetti.');
      items.value = [];
    } finally {
      itemsLoading.value = false;
    }
  };

  const clearEditQuery = () => {
    if (!route.query.edit) return;
    const nextQuery = { ...route.query };
    delete nextQuery.edit;
    router.replace({ query: nextQuery });
  };

  const startEdit = (item: ItemResponse) => {
    editingItemId.value = item.id;
    activeTab.value = 'create';
    formState.worldId = item.worldId;
    formState.locationId = item.locationId ?? undefined;
    formState.name = item.name;
    formState.type = item.type ?? '';
    formState.rarity = item.rarity ?? '';
    formState.description = item.description ?? '';
    formState.gmNotes = item.gmNotes ?? '';
    formState.isVisibleToPlayers = item.isVisibleToPlayers;
    formError.value = '';
  };

  const watchRouteEdit = () => {
    const raw = route.query.edit;
    if (!raw) return;
    const editId = Number(raw);
    if (!Number.isFinite(editId)) return;
    const existing = items.value.find((item) => item.id === editId);
    if (existing) {
      startEdit(existing);
      clearEditQuery();
    }
  };

  const upsertItem = async () => {
    if (!formState.worldId) {
      formError.value = "Seleziona il mondo dell'oggetto.";
      return;
    }
    const trimmedName = formState.name.trim();
    if (!trimmedName) {
      formError.value = "Il nome dell'oggetto Çù obbligatorio.";
      return;
    }
    if (
      formState.locationId &&
      !allLocations.value.some((loc) => loc.id === formState.locationId)
    ) {
      formError.value = 'La location selezionata non esiste piÇû.';
      return;
    }
    formError.value = '';
    formLoading.value = true;
    const payload: CreateItemRequest = {
      worldId: formState.worldId,
      locationId: formState.locationId || undefined,
      name: trimmedName,
      type: optionalText(formState.type),
      rarity: optionalText(formState.rarity),
      description: optionalText(formState.description),
      gmNotes: optionalText(formState.gmNotes),
      isVisibleToPlayers: formState.isVisibleToPlayers,
    };
    try {
      if (editingItemId.value) {
        const updated = await updateItem(editingItemId.value, payload);
        startEdit(updated);
      } else {
        const created = await createItem(payload);
        startEdit(created);
      }
      await fetchItems();
    } catch (error) {
      formError.value = extractApiErrorMessage(error, 'Operazione non riuscita.');
    } finally {
      formLoading.value = false;
    }
  };

  const removeItem = async (itemId: number) => {
    deleteLoading.value = itemId;
    itemsError.value = '';
    try {
      await deleteItem(itemId);
      if (editingItemId.value === itemId) {
        resetForm();
      }
      await fetchItems();
    } catch (error) {
      itemsError.value = extractApiErrorMessage(error, "Impossibile eliminare l'oggetto.");
    } finally {
      deleteLoading.value = null;
    }
  };

  const cancelEdit = () => {
    resetForm();
  };

  watch(
    () => selectedWorldId.value,
    () => {
      fetchItems();
    },
  );

  watch(items, () => {
    watchRouteEdit();
  });

  watch(
    () => route.query.edit,
    () => {
      watchRouteEdit();
    },
  );

  watch(
    () => formState.worldId,
    () => {
      if (!formState.locationId) return;
      const stillValid = locationOptions.value.some(
        (location) => location.id === formState.locationId,
      );
      if (!stillValid) {
        formState.locationId = undefined;
      }
    },
  );

  onMounted(async () => {
    await Promise.all([fetchWorlds(), fetchLocations(), fetchItems()]);
    watchRouteEdit();
  });

  return {
    activeTab,
    allLocations,
    cancelEdit,
    deleteLoading,
    editingItemId,
    fetchItems,
    formError,
    formLoading,
    formState,
    items,
    itemsError,
    itemsLoading,
    locationOptions,
    locationsError,
    locationsLoading,
    removeItem,
    selectedWorldId,
    startEdit,
    upsertItem,
    worldName,
    worlds,
    worldsError,
    worldsLoading,
  };
}

export type UseDmItemsSliceReturn = ReturnType<typeof useDmItemsSlice>;
