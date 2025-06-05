export interface ReviewModel {
  id: number;
  rating: number;
  comment: string;
  reviewerName: string;
  imageId: number;
  createdAt: string; // ISO date string
}
