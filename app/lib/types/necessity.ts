export const NECESSITY_LEVELS = ["essential", "personal_priority", "flexible", "unexpected"] as const;
export type NecessityLevel = (typeof NECESSITY_LEVELS)[number];

export const NECESSITY_LABELS: Record<NecessityLevel, string> = {
  essential: "必需",
  personal_priority: "享受",
  flexible: "可选",
  unexpected: "突发",
};

export const NECESSITY_DESCRIPTIONS: Record<NecessityLevel, string> = {
  essential: "保障基本生活、健康或责任所需的支出。",
  personal_priority: "为了身心状态、自信或个人目标，主动优先保留的支出。",
  flexible: "预算紧张时，可以减少、推迟或放弃的支出。",
  unexpected: "计划外产生的罚款、故障维修等支出。",
};

export interface NecessityFields {
  necessityLevel?: NecessityLevel | null;
  necessityReason?: string | null;
}

export interface NecessityAllocation {
  finId: string;
  itemId: number | null;
  name: string;
  necessityLevel: NecessityLevel;
  category: string;
  subcategory: string;
  amountCadCents: number;
  remainder: boolean;
  estimated: boolean;
}

export interface NecessityBucket {
  necessityLevel: NecessityLevel;
  category: string;
  subcategory: string;
  amountCadCents: number;
}

export interface NecessityReport {
  totalCadCents: number;
  estimatedCadCents: number;
  estimatedRecordCount: number;
  remainderCadCents: number;
  totals: Record<NecessityLevel, number>;
  buckets: NecessityBucket[];
}
