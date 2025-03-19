export interface User {
  id: number;
  login: string;
  mail: string;
  fullName: string;
  phoneNumber: string;
  status?: string;
  imageIds: string;
}
