export interface Review {
  id: number;
  rating: number;
  comment: string;
  reviewerName: string;
  imageId: number;
  createdAt: string; // ISO date string
}

export interface ReviewCreate {
  orderId: number;
  rating: number;
  comment: string;
}
