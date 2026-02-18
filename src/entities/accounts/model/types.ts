import { AccountsBaseModel } from "@/shared/types";

export interface AccountsCreateModel extends Omit<
  AccountsBaseModel,
  "id" | "participantId"
> {}
