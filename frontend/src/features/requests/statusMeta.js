/**
 * Status + priority vocabulary, in one file so the list, the detail page, the
 * filters and the timeline can never drift apart.
 */

import {
  IconCheckCircle,
  IconHalfCircle,
  IconOpenCircle,
  IconReceipt,
  IconArrowDown,
  IconArrowUp,
  IconMinus,
} from '../../components/icons.jsx';

/** The only legal moves. The server enforces this; the UI mirrors it. */
export const STATUS_FLOW = {
  open: 'in-progress',
  'in-progress': 'done',
  done: 'billed',
  billed: null,
};

export const STATUS_META = {
  open: { label: 'Open', icon: IconOpenCircle, hint: 'Logged, not started yet.' },
  'in-progress': { label: 'In progress', icon: IconHalfCircle, hint: 'Work is underway.' },
  done: { label: 'Done', icon: IconCheckCircle, hint: 'Work finished, not invoiced.' },
  billed: { label: 'Billed', icon: IconReceipt, hint: 'Final state — invoiced.' },
};

export const PRIORITY_META = {
  low: { label: 'Low', icon: IconArrowDown },
  normal: { label: 'Normal', icon: IconMinus },
  high: { label: 'High', icon: IconArrowUp },
};

export const STATUS_OPTIONS = Object.keys(STATUS_META);
export const PRIORITY_OPTIONS = Object.keys(PRIORITY_META);

/** The single legal next status, or null when the request is at the end. */
export function nextStatus(status) {
  return STATUS_FLOW[status] ?? null;
}

export function statusLabel(status) {
  return STATUS_META[status]?.label ?? status;
}

export function priorityLabel(priority) {
  return PRIORITY_META[priority]?.label ?? priority;
}
