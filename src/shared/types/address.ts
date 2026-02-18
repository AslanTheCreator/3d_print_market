export interface Address {
  id: number;
  country: string;
  city: string;
  street: string;
  houseNumber: string;
  apartmentNumber: string;
  index: number;
  status: "ACTIVE" | "DELETED";
  fullAddress: string;
}
