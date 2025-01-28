type Currency = "RUB" | "USD" | "EUR" | "GBP" | "JPY" | "CNY";
type Status = "Active" | "Cancelled" | "Completed";
type Category = { id: number; name: string };

export interface CardResponse {
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
  image: ImageResponse[];
}

export interface ImageResponse {
  filename: string;
  contentType: string;
  imageData: string; // Base64-данные изображения
}
