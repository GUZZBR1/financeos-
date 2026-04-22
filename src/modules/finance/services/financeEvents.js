// Event type constants
export const EVENT_TYPES = {
  TRANSACTION_CREATED: 'transaction_created',
  TRANSACTION_UPDATED: 'transaction_updated',
  TRANSACTION_DELETED: 'transaction_deleted',
  PERIOD_CHANGED: 'period_changed'
};

// Track last known state for event detection (simple module-level state)
// This lets us detect when something changes without a real event bus

let lastTransactionCount = 0;
let lastPeriod = null;

export function emitTransactionEvent(type, transaction) {
  // In a real app this would dispatch to an event bus
  // For this lightweight version, we just update module state
  if (type === EVENT_TYPES.TRANSACTION_CREATED || type === EVENT_TYPES.TRANSACTION_DELETED) {
    lastTransactionCount = transaction ? lastTransactionCount + 1 : lastTransactionCount - 1;
  }
}

export function emitPeriodChanged(period) {
  lastPeriod = period;
}

// Query functions to check current "event" state
export function hasTransactionChanged(currentCount) {
  return currentCount !== lastTransactionCount;
}

export function hasPeriodChanged(currentPeriod) {
  return currentPeriod !== lastPeriod;
}