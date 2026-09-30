export interface AgentSummary {
  id: number;
  login: string;
  status: "ACTIVE" | "WAITING_VERIFY" | "BLOCKED" | "DELETED";
}

export interface AgentProfileInput {
  fullName: string;
  phoneNumber: string;
  deadlineSending: number;
  deadlinePayment: number;
  imageId: number | null;
}

export interface AgentProfile extends AgentSummary, AgentProfileInput {}
