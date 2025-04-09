export interface ImageResponse {
  filename: string;
  contentType: string;
  imageData: string;
}

export type ImageTag = "PARTICIPANT" | "PRODUCT" | "ORDER" | "SYSTEM";
