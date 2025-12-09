// Fund type definitions
// Expenditure types: 0-5
// Income types: 6-11

export const FUND_TYPE = {
  // Expenditure
  ADMINISTRATIVE: 0,
  EVENT: 1,
  PROMOTIONAL: 2,
  EQUIPMENT: 3,
  TRAINING: 4,
  MISCELLANEOUS: 5,
  OTHER_EXP:6,
  // Income
  COLLEGE: 7,
  SPONSORS: 8,
  WORKSHOPS: 9,
  MEMBERS_CONTRIBUTION: 10,
  SERVICES: 11,
  OTHER_INC:12
} as const;

export type FundTypeCode = typeof FUND_TYPE[keyof typeof FUND_TYPE];

export const FUND_TYPE_LABELS: Record<FundTypeCode, string> = {
  [FUND_TYPE.ADMINISTRATIVE]: "Administrative",
  [FUND_TYPE.EVENT]: "Event",
  [FUND_TYPE.PROMOTIONAL]: "Promotional",
  [FUND_TYPE.EQUIPMENT]: "Equipment",
  [FUND_TYPE.TRAINING]: "Training",
  [FUND_TYPE.MISCELLANEOUS]: "Miscellaneous",
  [FUND_TYPE.OTHER_EXP]:"Other",
  
  [FUND_TYPE.COLLEGE]: "College",
  [FUND_TYPE.SPONSORS]: "Sponsors",
  [FUND_TYPE.WORKSHOPS]: "Workshops",
  [FUND_TYPE.MEMBERS_CONTRIBUTION]: "Members Contribution",
  [FUND_TYPE.SERVICES]: "Services",
  [FUND_TYPE.OTHER_INC]:"Other",
};

export const EXPENDITURE_TYPES: FundTypeCode[] = [
  FUND_TYPE.ADMINISTRATIVE,
  FUND_TYPE.EVENT,
  FUND_TYPE.PROMOTIONAL,
  FUND_TYPE.EQUIPMENT,
  FUND_TYPE.TRAINING,
  FUND_TYPE.MISCELLANEOUS,
  FUND_TYPE.OTHER_EXP,
];

export const INCOME_TYPES: FundTypeCode[] = [
  FUND_TYPE.COLLEGE,
  FUND_TYPE.SPONSORS,
  FUND_TYPE.WORKSHOPS,
  FUND_TYPE.MEMBERS_CONTRIBUTION,
  FUND_TYPE.SERVICES,
  FUND_TYPE.OTHER_INC
];

export function getFundTypeLabel(type: number): string {
  return FUND_TYPE_LABELS[type as FundTypeCode] || "Unknown";
}

export function isExpenditure(type: number): boolean {
  return EXPENDITURE_TYPES.includes(type as FundTypeCode);
}

export function isIncome(type: number): boolean {
  return INCOME_TYPES.includes(type as FundTypeCode);
}

