export const PAID_STATUSES = ["approved"];

export const FAILED_STATUSES = ["rejected", "cancelled", "refunded", "charged_back"];

export function isPaymentComplete(status) {
  return PAID_STATUSES.includes(status);
}

export function isPaymentFailed(status) {
  return FAILED_STATUSES.includes(status);
}

export function shouldKeepPolling(status) {
  return !isPaymentComplete(status) && !isPaymentFailed(status);
}
