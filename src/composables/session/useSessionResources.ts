import { ref, type ComputedRef, type Ref } from 'vue';
import {
  getSessionResources,
  updateSessionResourceVisibility,
  uploadSessionResource,
} from '../../api/sessionResourcesApi';
import type { SessionResourceResponse } from '../../types/api';
import { extractApiErrorMessage } from '../../utils/errorMessage';

interface UseSessionResourcesOptions {
  sessionId: Ref<number | null>;
  canUpload: Ref<boolean> | ComputedRef<boolean>;
}

export const useSessionResources = ({
  sessionId,
  canUpload,
}: UseSessionResourcesOptions) => {
  const resources = ref<SessionResourceResponse[]>([]);
  const resourcesLoading = ref(false);
  const resourcesError = ref('');
  const uploadLoading = ref(false);
  const uploadError = ref('');
  const visibilityUpdatingId = ref<number | null>(null);

  const sortResourcesByUploadedAtDesc = (items: SessionResourceResponse[]) => {
    return [...items].sort((left, right) => {
      const leftTime = Date.parse(left.uploadedAt ?? '');
      const rightTime = Date.parse(right.uploadedAt ?? '');
      return rightTime - leftTime;
    });
  };

  const applyResourceCreated = (resource: SessionResourceResponse) => {
    const existingIndex = resources.value.findIndex((entry) => entry.id === resource.id);
    const nextResources = [...resources.value];

    if (existingIndex >= 0) {
      nextResources.splice(existingIndex, 1, resource);
    } else {
      nextResources.unshift(resource);
    }

    resources.value = sortResourcesByUploadedAtDesc(nextResources);
  };

  const loadResources = async () => {
    if (!sessionId.value) {
      return;
    }

    resourcesLoading.value = true;
    resourcesError.value = '';

    try {
      resources.value = sortResourcesByUploadedAtDesc(await getSessionResources(sessionId.value));
    } catch (error) {
      resourcesError.value = extractApiErrorMessage(error, 'Errore caricamento risorse.');
    } finally {
      resourcesLoading.value = false;
    }
  };

  const uploadResource = async (file: File, visibleToPlayers = false) => {
    if (!sessionId.value || !canUpload.value) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    uploadLoading.value = true;
    uploadError.value = '';

    try {
      const createdResource = await uploadSessionResource(sessionId.value, formData, visibleToPlayers);
      applyResourceCreated(createdResource);
    } catch (error) {
      uploadError.value = extractApiErrorMessage(error, 'Upload fallito.');
    } finally {
      uploadLoading.value = false;
    }
  };

  const updateResourceVisibility = async (resourceId: number, visibleToPlayers: boolean) => {
    if (!canUpload.value) {
      return;
    }

    visibilityUpdatingId.value = resourceId;
    resourcesError.value = '';

    try {
      const updatedResource = await updateSessionResourceVisibility(resourceId, visibleToPlayers);
      applyResourceCreated(updatedResource);
    } catch (error) {
      resourcesError.value = extractApiErrorMessage(error, 'Aggiornamento visibilita risorsa non riuscito.');
    } finally {
      visibilityUpdatingId.value = null;
    }
  };

  return {
    resources,
    resourcesLoading,
    resourcesError,
    uploadLoading,
    uploadError,
    visibilityUpdatingId,
    loadResources,
    applyResourceCreated,
    uploadResource,
    updateResourceVisibility,
  };
};
