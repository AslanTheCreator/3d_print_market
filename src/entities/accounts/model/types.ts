export type TransferMoney = "BANK_CARD" | "BANK_SBP" | "CASH";

export interface AccountsBaseModel {
  id: number;
  transferMoney: TransferMoney;
  username: string;
  entityValue: string;
  comment: string;
  participantId: number;
}

export interface AccountsCreateModel
  extends Omit<AccountsBaseModel, "id" | "participantId"> {}
