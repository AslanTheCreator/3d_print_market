// API
export { addressApi } from "./api/addressApi";

// Query keys
export { addressKeys } from "./hooks/queryKeys";

// Queries
export { useAddresses } from "./hooks/useAddressQueries";

// Mutations
export {
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
} from "./hooks/useAddressMutations";

// UI
export { AddressSelector } from "./ui/AddressSelector";
export { AddressForm } from "./ui/AddressForm";

// Types
export type { AddressInput } from "./model/types";
export { DEFAULT_COUNTRY, ADDRESS_VALIDATION } from "./model/types";
