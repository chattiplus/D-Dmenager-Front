import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getWorlds } from '../../api/worldsApi';
import {
  createLocation,
  deleteLocation,
  getLocations,
  getLocationsByWorld,
  updateLocation,
} from '../../api/locationsApi';
import type { CreateLocationRequest, LocationResponse, WorldResponse } from '../../types/api';
import { extractApiErrorMessage } from '../../utils/errorMessage';

export type FilterWorldId = number | 'all';

export function useDmLocationsSlice() {
  const route = useRoute();
  const router = useRouter();

  const worlds = ref<WorldResponse[]>([]);
  const worldsLoading = ref(false);
  const worldsError = ref('');

  const selectedWorldId = ref<FilterWorldId>('all');

  const locations = ref<LocationResponse[]>([]);
  const locationsLoading = ref(false);
  const locationsError = ref('');
  const deleteLoading = ref<number | null>(null);

  const editingLocationId = ref<number | null>(null);
  const formError = ref('');
  const formLoading = ref(false);
  const activeTab = ref<'locations' | 'create'>('locations');

  const formState = reactive<CreateLocationRequest>({
    worldId: 0,
    parentLocationId: undefined,
    name: '',
    type: '',
    description: '',
    gmNotes: '',
    isVisibleToPlayers: true,
  });

  const worldName = (worldId: number) => {
    const world = worlds.value.find((entry) => entry.id === worldId);
    return world?.name ?? `Mondo #${worldId}`;
  };

  const optionalText = (value?: string | null) => {
    if (value == null) return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  };

  const sanitizeFilter = () => {
    if (selectedWorldId.value === 'all') {
      return;
    }
    const exists = worlds.value.some((world) => world.id === selectedWorldId.value);
    if (!exists) {
      selectedWorldId.value = 'all';
    }
  };

  const ensureFormWorld = () => {
    if (formState.worldId && worlds.value.some((world) => world.id === formState.worldId)) {
      return;
    }
    formState.worldId = worlds.value[0]?.id ?? 0;
  };

  const resetForm = () => {
    editingLocationId.value = null;
    formState.name = '';
    formState.type = '';
    formState.description = '';
    formState.gmNotes = '';
    formState.parentLocationId = undefined;
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
      if (selectedWorldId.value === 'all') {
        locations.value = await getLocations();
      } else {
        locations.value = await getLocationsByWorld(selectedWorldId.value);
      }
    } catch (error) {
      locationsError.value = extractApiErrorMessage(
        error,
        'Impossibile caricare le location.',
      );
      locations.value = [];
    } finally {
      locationsLoading.value = false;
    }
  };

  const parentOptions = computed(() =>
    locations.value.filter(
      (location) =>
        location.worldId === formState.worldId && location.id !== editingLocationId.value,
    ),
  );

  const clearEditQuery = () => {
    if (!route.query.edit) return;
    const nextQuery = { ...route.query };
    delete nextQuery.edit;
    router.replace({ query: nextQuery });
  };

  const startEdit = (location: LocationResponse) => {
    editingLocationId.value = location.id;
    activeTab.value = 'create';
    formState.worldId = location.worldId;
    formState.parentLocationId = location.parentLocationId ?? undefined;
    formState.name = location.name;
    formState.type = location.type ?? '';
    formState.description = location.description ?? '';
    formState.gmNotes = location.gmNotes ?? '';
    formState.isVisibleToPlayers = location.isVisibleToPlayers;
    formError.value = '';
  };

  const watchRouteEdit = () => {
    const raw = route.query.edit;
    if (!raw) return;
    const editId = Number(raw);
    if (!Number.isFinite(editId)) return;
    const existing = locations.value.find((location) => location.id === editId);
    if (existing) {
      startEdit(existing);
      clearEditQuery();
    }
  };

  const upsertLocation = async () => {
    if (!formState.worldId) {
      formError.value = 'Seleziona un mondo di riferimento.';
      return;
    }
    const trimmedName = formState.name.trim();
    if (!trimmedName) {
      formError.value = 'Il nome della location اù obbligatorio.';
      return;
    }
    formError.value = '';
    formLoading.value = true;
    const payload: CreateLocationRequest = {
      worldId: formState.worldId,
      parentLocationId: formState.parentLocationId || undefined,
      name: trimmedName,
      type: optionalText(formState.type),
      description: optionalText(formState.description),
      gmNotes: optionalText(formState.gmNotes),
      isVisibleToPlayers: formState.isVisibleToPlayers,
    };
    try {
      if (editingLocationId.value) {
        const updated = await updateLocation(editingLocationId.value, payload);
        startEdit(updated);
      } else {
        const created = await createLocation(payload);
        startEdit(created);
      }
      await fetchLocations();
    } catch (error) {
      formError.value = extractApiErrorMessage(error, 'Operazione non riuscita.');
    } finally {
      formLoading.value = false;
    }
  };

  const removeLocation = async (locationId: number) => {
    deleteLoading.value = locationId;
    locationsError.value = '';
    try {
      await deleteLocation(locationId);
      if (editingLocationId.value === locationId) {
        resetForm();
      }
      await fetchLocations();
    } catch (error) {
      locationsError.value = extractApiErrorMessage(
        error,
        'Impossibile eliminare la location.',
      );
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
      fetchLocations();
    },
  );

  watch(locations, () => {
    watchRouteEdit();
  });

  watch(
    () => route.query.edit,
    () => {
      watchRouteEdit();
    },
  );

  onMounted(async () => {
    await Promise.all([fetchWorlds(), fetchLocations()]);
    watchRouteEdit();
  });

  return {
    activeTab,
    cancelEdit,
    deleteLoading,
    editingLocationId,
    fetchLocations,
    formError,
    formLoading,
    formState,
    locations,
    locationsError,
    locationsLoading,
    parentOptions,
    removeLocation,
    selectedWorldId,
    startEdit,
    upsertLocation,
    worldName,
    worlds,
    worldsError,
    worldsLoading,
  };
}

export type UseDmLocationsSliceReturn = ReturnType<typeof useDmLocationsSlice>;
