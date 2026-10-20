import { useCallback, useEffect, useState } from 'react';
import api, { type RevenueReportData } from '../services/api';

const PAGE_SIZE = 50;

const formatMoney = (value: number | string | null | undefined, currency = 'RWF') =>
  `${currency} ${Number(value || 0).toLocaleString()}`;

const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString() : '-');

const Revenue = () => {
  const [garages, setGarages] = useState<{ id: number; name: string }[]>([]);
  const [garageId, setGarageId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [offset, setOffset] = useState(0);
  const [report, setReport] = useState<RevenueReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getGarages().then((response) => {
      if (Array.isArray(response.data)) {
        setGarages(response.data.map((g: { id: number; name: string }) => ({ id: g.id, name: g.name })));
      }
    });
  }, []);

  const loadReport = useCallback(
    async (nextOffset = 0, nextGarageId = garageId) => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.getRevenueReport({
          garage_id: nextGarageId,
          date_from: dateFrom,
          date_to: dateTo,
          limit: PAGE_SIZE,
          offset: nextOffset,
        });
        if (response.error || !response.data) {
          setError(response.error || 'Failed to load revenue report');
          return;
        }
        setReport(response.data);
        setOffset(nextOffset);
      } catch (err) {
        setError('Failed to load revenue report');
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [garageId, dateFrom, dateTo]
  );

  useEffect(() => {
    loadReport(0);
    // Load once on mount; later loads are triggered by the filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectGarage = (id: string) => {
    setGarageId(id);
    loadReport(0, id);
  };

  const exportCsv = async () => {
    setError(null);
    const response = await api.getRevenueReport({
      garage_id: garageId,
      date_from: dateFrom,
      date_to: dateTo,
      limit: 1000,
    });
    if (response.error || !response.data) {
      setError(response.error || 'Failed to export revenue report');
      return;
    }
    const rows = [
      ['Service ID', 'Paid At', 'Garage', 'Vehicle', 'Service', 'Technician', 'Phone', 'Provider Ref', 'Amount (RWF)'],
      ...response.data.payments.map((p) => [
        p.id,
        p.paid_at,
        p.garage?.name || '',
        p.vehicle?.license_plate || '',
        p.service_catalog?.name || '',
        p.performed_by?.name || '',
        p.payment_phone || '',
        p.payment_provider_ref || '',
        p.payment_amount,
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'revenue-report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const currency = report?.currency || 'RWF';
  const transactions = report?.transactions;
  const selected = report?.selected_garage;
  const paymentsTotal = report?.payments_total || 0;

  const cards = [
    {
      label: selected ? `Money earned · ${selected.garage_name}` : 'Money earned',
      value: formatMoney(report?.earned, currency),
      note: selected
        ? `${selected.share_percent}% of ${formatMoney(report?.system_total, currency)} system total`
        : 'Confirmed payments received',
      tone: 'highlight',
    },
    {
      label: 'Successful transactions',
      value: (transactions?.successful.count || 0).toLocaleString(),
      note: `${formatMoney(transactions?.successful.amount, currency)} paid`,
      tone: 'success',
    },
    {
      label: 'Failed transactions',
      value: (transactions?.failed.count || 0).toLocaleString(),
      note: `${formatMoney(transactions?.failed.amount, currency)} not collected`,
      tone: 'failed',
    },
    {
      label: 'Pending transactions',
      value: (transactions?.pending.count || 0).toLocaleString(),
      note: `${formatMoney(transactions?.pending.amount, currency)} awaiting confirmation`,
      tone: 'pending',
    },
  ];

  const toneClasses: Record<string, { card: string; label: string; value: string; note: string }> = {
    highlight: { card: 'bg-[#2F4858] border-[#2F4858]', label: 'text-white/70', value: 'text-white', note: 'text-white/60' },
    success: { card: 'bg-white border-gray-200 border-l-4 border-l-green-500', label: 'text-gray-500', value: 'text-gray-900', note: 'text-green-700' },
    failed: { card: 'bg-white border-gray-200 border-l-4 border-l-red-500', label: 'text-gray-500', value: 'text-gray-900', note: 'text-red-700' },
    pending: { card: 'bg-white border-gray-200 border-l-4 border-l-amber-400', label: 'text-gray-500', value: 'text-gray-900', note: 'text-amber-700' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Revenue</h1>
        <p className="text-sm text-gray-500 mt-1">Money received from service payments across the whole system</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Garage</label>
            <select
              value={garageId}
              onChange={(e) => selectGarage(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
            >
              <option value="">All garages</option>
              {garages.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Paid from</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Paid to</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => loadReport(0)}
              disabled={loading}
              className="px-4 py-2 bg-[#FEA14C] text-white rounded-lg hover:bg-[#FE8A21] disabled:opacity-60"
            >
              {loading ? 'Loading...' : 'Apply'}
            </button>
            <button onClick={exportCsv} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const tone = toneClasses[card.tone];
          return (
            <div key={card.tone} className={`rounded-lg shadow-sm border p-6 ${tone.card}`}>
              <p className={`text-sm truncate ${tone.label}`}>{card.label}</p>
              <p className={`text-2xl font-bold mt-2 ${tone.value}`}>{loading && !report ? '...' : card.value}</p>
              <p className={`text-xs mt-1 ${tone.note}`}>{loading && !report ? '' : card.note}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Earnings by garage</h3>
          <p className="text-xs text-gray-500 mt-0.5">Each garage's part of the total. Click a garage to filter.</p>
        </div>
        {report && report.by_garage.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-500 text-center">No payments received for this period.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {report?.by_garage.map((row) => {
              const isSelected = String(row.garage_id) === garageId;
              return (
                <button
                  key={row.garage_id}
                  onClick={() => selectGarage(isSelected ? '' : String(row.garage_id))}
                  className={`w-full text-left px-6 py-3 hover:bg-gray-50 ${isSelected ? 'bg-[#FEA14C]/10' : ''}`}
                >
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{row.garage_name}</p>
                      <p className="text-xs text-gray-500">
                        {row.city ? `${row.city} · ` : ''}
                        {row.payments_count} payment{row.payments_count === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-gray-900">{formatMoney(row.total_amount, currency)}</p>
                      <p className="text-xs text-gray-500">{row.share_percent}%</p>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#FEA14C] rounded-full" style={{ width: `${row.share_percent}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            Payments{selected ? ` · ${selected.garage_name}` : ''}
          </h3>
          <span className="text-xs text-gray-500">{paymentsTotal.toLocaleString()} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Paid at</th>
                <th className="px-6 py-3 text-left font-medium">Garage</th>
                <th className="px-6 py-3 text-left font-medium">Vehicle</th>
                <th className="px-6 py-3 text-left font-medium">Service</th>
                <th className="px-6 py-3 text-left font-medium">Technician</th>
                <th className="px-6 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report?.payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-3 whitespace-nowrap text-gray-600">{formatDateTime(p.paid_at)}</td>
                  <td className="px-6 py-3 text-gray-900">{p.garage?.name || '-'}</td>
                  <td className="px-6 py-3 text-gray-600">{p.vehicle?.license_plate || '-'}</td>
                  <td className="px-6 py-3 text-gray-600">{p.service_catalog?.name || '-'}</td>
                  <td className="px-6 py-3 text-gray-600">{p.performed_by?.name || '-'}</td>
                  <td className="px-6 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                    {formatMoney(p.payment_amount, currency)}
                  </td>
                </tr>
              ))}
              {report && report.payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No payments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {paymentsTotal > PAGE_SIZE && (
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {offset + 1}–{Math.min(offset + PAGE_SIZE, paymentsTotal)} of {paymentsTotal}
            </span>
            <div className="flex gap-2">
              <button
                disabled={offset === 0 || loading}
                onClick={() => loadReport(Math.max(offset - PAGE_SIZE, 0))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={offset + PAGE_SIZE >= paymentsTotal || loading}
                onClick={() => loadReport(offset + PAGE_SIZE)}
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

export default Revenue;
