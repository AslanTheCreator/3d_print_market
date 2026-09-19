import axios, { type AxiosRequestConfig } from "axios";
import { authClient } from "@/shared/api";
import {
  ErrorCodes,
  transformToApiError,
  type BackendErrorResponse,
} from "@/shared/lib/errorHandler";
import type { SocialNetwork } from "../model/types";
import type { SocialNetworkInput } from "../model/types";

const API_URL = "/social-networks";

type SocialNetworksRequestConfig = AxiosRequestConfig & {
  _skipErrorTransform?: boolean;
};

export const socialNetworksApi = {
  getAll: async (): Promise<SocialNetwork[]> => {
    try {
      const { data } = await authClient.get<SocialNetwork[]>(
        API_URL,
        { _skipErrorTransform: true } as SocialNetworksRequestConfig,
      );
      return data;
    } catch (error) {
      if (
        axios.isAxiosError<BackendErrorResponse>(error) &&
        error.response?.status === 404 &&
        error.response.data?.code === ErrorCodes.SOCIAL_NETWORK_NOT_FOUND
      ) {
        return [];
      }

      throw transformToApiError(error);
    }
  },

  create: async (input: SocialNetworkInput): Promise<void> => {
    await authClient.post(API_URL, input);
  },

  update: async (
    id: number,
    input: SocialNetworkInput,
  ): Promise<SocialNetwork> => {
    const { data } = await authClient.put<SocialNetwork>(
      `${API_URL}/${id}`,
      input,
    );
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await authClient.delete(`${API_URL}/${id}`);
  },
};
