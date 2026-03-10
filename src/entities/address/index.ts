// API
export { addressApi } from "./api/addressApi";

// Query keys
export { addressKeys } from "./model/queryKeys";

// Queries
export { useAddresses } from "./model/useAddressQueries";

// Mutations
export {
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
} from "./model/useAddressMutations";

// UI
export { AddressSelector } from "./ui/AddressSelector";
export { AddressForm } from "./ui/AddressForm";

// Types
export type { AddressInput } from "./model/types";
export { DEFAULT_COUNTRY, ADDRESS_VALIDATION } from "./model/types";
