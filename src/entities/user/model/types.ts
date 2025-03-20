export interface User {
  id: number;
  login: string;
  mail: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  status?: string;
  imageIds: string;
}
