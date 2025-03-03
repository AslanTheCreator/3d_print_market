type Currency = "RUB" | "USD" | "EUR" | "GBP" | "JPY" | "CNY";
type Status = "Active" | "Cancelled" | "Completed";
type Category = { id: number; name: string };

export interface CardResponse {
  totalElements: number;
  page: number;
  content: CardItem[];
}

export interface CardItem {
  id: number;
  name: string;
  description?: string;
  price: number;
  count?: number;
  currency?: Currency;
  originality?: string;
  participantId?: number;
  status?: Status;
  category?: Category;
  imageId?: number;
  imageIds?: number[];
  image: ImageResponse[];
}

export interface ImageResponse {
  filename: string;
  contentType: string;
  imageData: string; // Base64-данные изображения
}
