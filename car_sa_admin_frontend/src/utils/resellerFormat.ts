import type { CommissionType, ResellerPayout } from '../services/api';

export const formatMoney = (value: number | string | null | undefined, currency = 'RWF') =>
  `${currency} ${Number(value || 0).toLocaleString()}`;

export const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString() : '-');

export const formatCommission = (type: CommissionType, value: number | string) =>
  type === 'percentage' ? `${Number(value)}% per paid service` : `${formatMoney(value)} per paid service`;

export const formatPayoutMethod = (payout: ResellerPayout) =>
  payout.method === 'bank' ? `Bank · ${payout.bank_name || ''}` : 'Mobile money';
