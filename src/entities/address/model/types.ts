export interface AddressInput {
  country: string;
  city: string;
  street: string;
  houseNumber: string;
  apartmentNumber: string;
  index: number;
}

export interface AddressInput {
  country: string;
  city: string;
  street: string;
  houseNumber: string;
  apartmentNumber: string;
  index: number;
}

export const DEFAULT_COUNTRY = "Россия";

export const ADDRESS_VALIDATION = {
  COUNTRY_MIN_LENGTH: 2,
  CITY_MIN_LENGTH: 2,
  STREET_MIN_LENGTH: 3,
  INDEX_MIN: 100000,
  INDEX_MAX: 999999,
  INDEX_LENGTH: 6,
} as const;
