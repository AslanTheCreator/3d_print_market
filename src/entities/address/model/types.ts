export interface AddressBaseModel {
  id: number;
  country: string;
  city: string;
  street: string;
  houseNumber: string;
  apartmentNumber: string;
  index: number;
  fullAddress: string;
}

export interface AddressCreateModel
  extends Omit<AddressBaseModel, "id" | "fullAddress"> {}
