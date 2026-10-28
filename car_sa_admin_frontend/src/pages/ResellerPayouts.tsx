import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { type PayoutStatus, type ResellerPayout } from '../services/api';
import { PayoutActions, PayoutStatusBadge } from '../components/ResellerUi';
import { formatDateTime, formatMoney, formatPayoutMethod } from '../utils/resellerFormat';

const PAGE_SIZE = 50;

const filters: { label: string; value: PayoutStatus | '' }[] = [
  { label: 'Waiting for review', value: 'pending' },
  { label: 'Approved (to pay)', value: 'approved' },
  { label: 'Paid', value: 'paid' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'All', value: '' },
];

const ResellerPayouts = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<PayoutStatus | ''>('pending');
  const [payouts, setPayouts] = useState<ResellerPayout[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    // Sets state only after the request finishes, so it can run straight from an effect.
    async (nextOffset = 0) => {
      const response = await api.listResellerPayouts({ status, limit: PAGE_SIZE, offset: nextOffset });
      setLoading(false);
      if (response.error || !response.data) {
        setError(response.error || 'Failed to load payout requests');
        return;
      }
      setError(null);
      setPayouts(response.data.payouts);
      setTotal(response.data.total);
      setOffset(nextOffset);
    },
    [status]
  );

  useEffect(() => {
    load(0);
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reseller Payouts</h1>
        <p className="text-sm text-gray-500 mt-1">
          Approve a request, send the money to the reseller's account, then mark it as paid.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter.label}
            onClick={() => {
              if (filter.value === status) return;
              setLoading(true);
              setStatus(filter.value);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              status === filter.value
                ? 'bg-[#2F4858] text-white border-[#2F4858]'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Requested</th>
                <th className="px-6 py-3 text-left font-medium">Reseller</th>
                <th className="px-6 py-3 text-right font-medium">Amount</th>
                <th className="px-6 py-3 text-left font-medium">Pay to</th>
                <th className="px-6 py-3 text-left font-medium">Status</th>
                <th className="px-6 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payouts.map((payout) => (
                <tr key={payout.id}>
                  <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{formatDateTime(payout.created_at)}</td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => navigate(`/dashboard/resellers/${payout.reseller_user_id}`)}
                      className="font-medium text-gray-900 hover:underline text-left"
                    >
                      {payout.reseller?.name || `Reseller #${payout.reseller_user_id}`}
                    </button>
                    <p className="text-xs text-gray-500">{payout.reseller?.phone || payout.reseller?.email}</p>
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-gray-900 whitespace-nowrap">{formatMoney(payout.amount)}</td>
                  <td className="px-6 py-3 text-gray-600">
                    <p>{formatPayoutMethod(payout)}</p>
                    <p className="text-xs text-gray-500">
                      {payout.account_name} · {payout.account_number}
                    </p>
                    {payout.reseller_note && <p className="text-xs text-gray-400 mt-0.5">“{payout.reseller_note}”</p>}
                  </td>
                  <td className="px-6 py-3">
                    <PayoutStatusBadge status={payout.status} />
                    {payout.reviewed_by && (
                      <p className="text-xs text-gray-500 mt-1">
                        by {payout.reviewed_by.name}, {formatDateTime(payout.paid_at || payout.reviewed_at)}
                      </p>
                    )}
                    {payout.payment_reference && <p className="text-xs text-gray-500">Ref {payout.payment_reference}</p>}
                    {payout.admin_note && <p className="text-xs text-gray-500">{payout.admin_note}</p>}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <PayoutActions payout={payout} onDone={() => load(offset)} />
                  </td>
                </tr>
              ))}
              {!loading && payouts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No payout requests here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {total > PAGE_SIZE && (
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                disabled={offset === 0 || loading}
                onClick={() => {
                  setLoading(true);
                  load(Math.max(offset - PAGE_SIZE, 0));
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={offset + PAGE_SIZE >= total || loading}
                onClick={() => {
                  setLoading(true);
                  load(offset + PAGE_SIZE);
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResellerPayouts;
