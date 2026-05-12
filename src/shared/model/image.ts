export interface ImageResponse {
  filename: string;
  contentType: string;
  imageData: string;
}

export interface ImageMetadata {
  id: number;
  url: string;
  width: number | null;
  height: number | null;
  contentType: string;
}

export type ImageTag = "PARTICIPANT" | "PRODUCT" | "ORDER" | "SYSTEM";
