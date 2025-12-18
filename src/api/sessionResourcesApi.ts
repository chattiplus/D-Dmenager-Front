import { httpClient } from './httpClient';
import type { SessionResourceResponse } from '../types/api';

export const uploadSessionResource = async (
    sessionId: number,
    formData: FormData,
): Promise<SessionResourceResponse> => {
    const { data } = await httpClient.post<SessionResourceResponse>(
        `/sessions/${sessionId}/upload`,
        formData,
        {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        },
    );
    return data;
};

export const getSessionResources = async (
    sessionId: number,
): Promise<SessionResourceResponse[]> => {
    const { data } = await httpClient.get<SessionResourceResponse[]>(
        `/sessions/${sessionId}/resources`,
    );
    return data;
};
