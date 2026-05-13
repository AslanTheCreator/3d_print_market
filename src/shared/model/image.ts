export interface ImageResponse {
  filename: string;
  contentType: string;
  imageData: string;
}

export interface ImageMetadata {
  id: number;
  originalUrl: string;
  mediumUrl: string;
  thumbnailUrl: string;
  width: number | null;
  height: number | null;
  contentType: string;
  url?: string;
}

export type ImageTag = "PARTICIPANT" | "PRODUCT" | "ORDER" | "SYSTEM";
