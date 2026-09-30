import { authClient } from "@/shared/api";
import type { ImageResponse } from "../model/types";
export const adminImageApi = {
  async read(ids: number[], signal?: AbortSignal) {
    if (!ids.length) return [];
    const params = new URLSearchParams();
    ids.forEach((id) => params.append("ids", String(id)));
    return (await authClient.get<ImageResponse[]>(`/images?${params}`, { signal })).data;
  },
};
