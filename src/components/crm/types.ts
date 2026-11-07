export type UserOption = { id: string; name: string; avatarUrl: string | null };

export type OpportunityData = {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
  address: string | null;
  monthlyValue: number | null;
  setupValue: number | null;
  source: string | null;
  notes: string | null;
  expectedCloseDate: string | null;
  closedAt: string | null;
  lostReason: string | null;
  position: number;
  stageId: string;
  responsible: UserOption | null;
  createdAt: string;
};

export type StageData = {
  id: string;
  name: string;
  color: string | null;
  position: number;
  isWon: boolean;
  isLost: boolean;
  opportunities: OpportunityData[];
};
