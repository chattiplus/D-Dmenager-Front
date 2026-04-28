import { ref, type ComputedRef, type Ref } from 'vue';
import { getSessionResources, uploadSessionResource } from '../../api/sessionResourcesApi';
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

  const loadResources = async () => {
    if (!sessionId.value) {
      return;
    }

    resourcesLoading.value = true;
    resourcesError.value = '';

    try {
      resources.value = await getSessionResources(sessionId.value);
    } catch (error) {
      resourcesError.value = extractApiErrorMessage(error, 'Errore caricamento risorse.');
    } finally {
      resourcesLoading.value = false;
    }
  };

  const uploadResource = async (file: File) => {
    if (!sessionId.value || !canUpload.value) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    uploadLoading.value = true;
    uploadError.value = '';

    try {
      await uploadSessionResource(sessionId.value, formData);
      await loadResources();
    } catch (error) {
      uploadError.value = extractApiErrorMessage(error, 'Upload fallito.');
    } finally {
      uploadLoading.value = false;
    }
  };

  return {
    resources,
    resourcesLoading,
    resourcesError,
    uploadLoading,
    uploadError,
    loadResources,
    uploadResource,
  };
};
