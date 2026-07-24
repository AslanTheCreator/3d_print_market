export interface Review {
  id: number;
  rating: number;
  comment: string;
  reviewerName: string;
  imageId: number;
  createdAt: string;
}

export interface CreateReviewInput {
  orderId: number;
  rating: number;
  comment: string;
}
