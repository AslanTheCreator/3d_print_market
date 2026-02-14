// API
export { socialNetworksApi } from "./api/socialNetworksApi";

// Query keys
export { socialNetworksKeys } from "./hooks/queryKeys";

// Queries
export { useSocialNetworks } from "./hooks/useSocialNetworksQuery";

// Mutations
export {
  useCreateSocial,
  useUpdateSocial,
  useDeleteSocial,
} from "./hooks/useSocialNetworksMutations";

// Types
export type {
  SocialNetwork,
  SocialNetworkInput,
  SocialNetworkType,
} from "./model/types";
