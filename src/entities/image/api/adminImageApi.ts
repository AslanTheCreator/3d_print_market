import { imageApi } from "./imageApi";
export const adminImageApi = {
  async read(ids: number[], signal?: AbortSignal) {
    return imageApi.getOrderImages(ids, signal);
  },
};
