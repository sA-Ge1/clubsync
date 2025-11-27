"use client";

export const TRANSACTION_STATUS = {
  PROCESSING: 0,
  DEPARTMENT_PENDING: 1,
  DEPARTMENT_REJECTED: 2,
  DEPARTMENT_APPROVED: 3,
  CLUB_REJECTED: 4,
  CLUB_APPROVED: 5,
  COLLECTED: 6,
  OVERDUE: 7,
  RETURNED: 8,
} as const;

export type TransactionStatusCode =
  (typeof TRANSACTION_STATUS)[keyof typeof TRANSACTION_STATUS];

const STATUS_LABELS: Record<TransactionStatusCode, string> = {
  [TRANSACTION_STATUS.PROCESSING]: "Processing",
  [TRANSACTION_STATUS.DEPARTMENT_PENDING]: "Department Approval Pending",
  [TRANSACTION_STATUS.DEPARTMENT_REJECTED]: "Department Rejected",
  [TRANSACTION_STATUS.DEPARTMENT_APPROVED]: "Department Approved",
  [TRANSACTION_STATUS.CLUB_REJECTED]: "Club Rejected",
  [TRANSACTION_STATUS.CLUB_APPROVED]: "Club Approved",
  [TRANSACTION_STATUS.COLLECTED]: "Collected",
  [TRANSACTION_STATUS.OVERDUE]: "Overdue",
  [TRANSACTION_STATUS.RETURNED]: "Returned",
};

const STATUS_BADGE_VARIANTS: Record<TransactionStatusCode, "success" | "destructive" | "warning" | "secondary" | "default"> = {
  [TRANSACTION_STATUS.PROCESSING]: "warning",
  [TRANSACTION_STATUS.DEPARTMENT_PENDING]: "warning",
  [TRANSACTION_STATUS.DEPARTMENT_REJECTED]: "destructive",
  [TRANSACTION_STATUS.DEPARTMENT_APPROVED]: "success",
  [TRANSACTION_STATUS.CLUB_REJECTED]: "destructive",
  [TRANSACTION_STATUS.CLUB_APPROVED]: "success",
  [TRANSACTION_STATUS.COLLECTED]: "secondary",
  [TRANSACTION_STATUS.OVERDUE]: "warning",
  [TRANSACTION_STATUS.RETURNED]: "secondary",
};

const LEGACY_STATUS_MAP: Record<string, TransactionStatusCode> = {
  pending: TRANSACTION_STATUS.PROCESSING,
  processing: TRANSACTION_STATUS.PROCESSING,
  "department approval pending": TRANSACTION_STATUS.DEPARTMENT_PENDING,
  underconsideration: TRANSACTION_STATUS.DEPARTMENT_PENDING,
  "under consideration": TRANSACTION_STATUS.DEPARTMENT_PENDING,
  "dept approved": TRANSACTION_STATUS.DEPARTMENT_APPROVED,
  approved: TRANSACTION_STATUS.CLUB_APPROVED,
  "club approved": TRANSACTION_STATUS.CLUB_APPROVED,
  rejected: TRANSACTION_STATUS.CLUB_REJECTED,
  "club rejected": TRANSACTION_STATUS.CLUB_REJECTED,
  "dept rejected": TRANSACTION_STATUS.DEPARTMENT_REJECTED,
  collected: TRANSACTION_STATUS.COLLECTED,
  overdue: TRANSACTION_STATUS.OVERDUE,
  returned: TRANSACTION_STATUS.RETURNED,
};

export const parseTransactionStatus = (
  status?: number | string | null
): TransactionStatusCode => {
  if (typeof status === "number" && status in STATUS_LABELS) {
    return status as TransactionStatusCode;
  }

  if (typeof status === "string") {
    const normalized = status.toLowerCase();
    if (normalized in LEGACY_STATUS_MAP) {
      return LEGACY_STATUS_MAP[normalized];
    }
  }

  return TRANSACTION_STATUS.PROCESSING;
};

export const getStatusLabel = (status: TransactionStatusCode) =>
  STATUS_LABELS[status];

export const getStatusBadgeVariant = (status: TransactionStatusCode) =>
  STATUS_BADGE_VARIANTS[status] ?? "default";

export const canAdvanceStatus = (
  current: TransactionStatusCode,
  next: TransactionStatusCode
) => next > current;

export const getDepartmentStatusActions = (
  status: TransactionStatusCode
): TransactionStatusCode[] => {
  if (status === TRANSACTION_STATUS.DEPARTMENT_PENDING) {
    return [
      TRANSACTION_STATUS.DEPARTMENT_APPROVED,
      TRANSACTION_STATUS.DEPARTMENT_REJECTED,
    ];
  }
  return [];
};

export const getClubStatusActions = (
  status: TransactionStatusCode
): TransactionStatusCode[] => {
  if (
    status === TRANSACTION_STATUS.PROCESSING ||
    status === TRANSACTION_STATUS.DEPARTMENT_APPROVED
  ) {
    return [
      TRANSACTION_STATUS.CLUB_APPROVED,
      TRANSACTION_STATUS.CLUB_REJECTED,
    ];
  }

  if (status === TRANSACTION_STATUS.CLUB_APPROVED) {
    return [
      TRANSACTION_STATUS.COLLECTED,
      TRANSACTION_STATUS.OVERDUE,
      TRANSACTION_STATUS.RETURNED,
    ];
  }

  if (status === TRANSACTION_STATUS.COLLECTED) {
    return [TRANSACTION_STATUS.RETURNED,
      TRANSACTION_STATUS.OVERDUE
    ];

  }

  if (status === TRANSACTION_STATUS.OVERDUE) {
    return [TRANSACTION_STATUS.RETURNED];
  }

  return [];
};

