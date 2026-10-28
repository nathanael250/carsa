import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { type Reseller } from '../services/api';
import { ResellerFormModal } from '../components/ResellerUi';
import { formatMoney } from '../utils/resellerFormat';

type Totals = { total_earned: number; paid_out: number; pending_payouts: number; available_balance: number };

const Resellers = () => {
  const navigate = useNavigate();
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [pendingPayouts, setPendingPayouts] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Sets state only after the requests finish, so it can run straight from an effect.
  const load = useCallback(async (searchText = '') => {
    const [list, payouts] = await Promise.all([
      api.listResellers(searchText),
      api.listResellerPayouts({ status: 'pending', limit: 1 }),
    ]);
    setLoading(false);
    if (list.error || !list.data) {
      setError(list.error || 'Failed to load resellers');
      return;
    }
    setError(null);
    setResellers(list.data.resellers);
    setTotals(list.data.totals);
    setPendingPayouts(payouts.data?.pending_count || 0);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cards = [
    { label: 'Resellers', value: resellers.length.toLocaleString(), note: `${resellers.filter((r) => r.active).length} active` },
    { label: 'Total commission earned', value: formatMoney(totals?.total_earned), note: 'All time' },
    { label: 'Paid out', value: formatMoney(totals?.paid_out), note: 'Sent to resellers' },
    {
      label: 'Owed to resellers',
      value: formatMoney((totals?.available_balance || 0) + (totals?.pending_payouts || 0)),
      note: `${formatMoney(totals?.pending_payouts)} requested`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resellers</h1>
          <p className="text-sm text-gray-500 mt-1">People who bring garages and earn a commission on their paid services</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-[#FEA14C] text-white rounded-lg hover:bg-[#FE8A21] self-start sm:self-auto"
        >
          + Register reseller
        </button>
      </div>

      {pendingPayouts > 0 && (
        <button
          onClick={() => navigate('/dashboard/reseller-payouts')}
          className="w-full text-left bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg hover:bg-amber-100"
        >
          {pendingPayouts} payout request{pendingPayouts === 1 ? '' : 's'} waiting for review →
        </button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => (
          <div
            key={card.label}
            className={`rounded-lg shadow-sm border p-6 ${index === 0 ? 'bg-[#2F4858] border-[#2F4858]' : 'bg-white border-gray-200'}`}
          >
            <p className={`text-sm ${index === 0 ? 'text-white/70' : 'text-gray-500'}`}>{card.label}</p>
            <p className={`text-2xl font-bold mt-2 ${index === 0 ? 'text-white' : 'text-gray-900'}`}>
              {loading && !totals ? '...' : card.value}
            </p>
            <p className={`text-xs mt-1 ${index === 0 ? 'text-white/60' : 'text-gray-500'}`}>{card.note}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <h3 className="font-semibold text-gray-900">All resellers</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setLoading(true);
              load(search);
            }}
            className="flex gap-2"
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email or phone"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
            />
            <button type="submit" className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
              Search
            </button>
          </form>
        </div>

        {error && <div className="m-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Reseller</th>
                <th className="px-6 py-3 text-left font-medium">Referral code</th>
                <th className="px-6 py-3 text-left font-medium">Commission</th>
                <th className="px-6 py-3 text-right font-medium">Garages</th>
                <th className="px-6 py-3 text-right font-medium">Earned</th>
                <th className="px-6 py-3 text-right font-medium">Balance</th>
                <th className="px-6 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {resellers.map((reseller) => (
                <tr
                  key={reseller.id}
                  onClick={() => navigate(`/dashboard/resellers/${reseller.id}`)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-3">
                    <p className="font-medium text-gray-900">{reseller.name}</p>
                    <p className="text-xs text-gray-500">{reseller.email}</p>
                  </td>
                  <td className="px-6 py-3 font-mono text-gray-900">{reseller.referral_code}</td>
                  <td className="px-6 py-3 text-gray-600 whitespace-nowrap">
                    {reseller.commission_type === 'percentage'
                      ? `${reseller.commission_value}%`
                      : formatMoney(reseller.commission_value)}
                  </td>
                  <td className="px-6 py-3 text-right text-gray-600">{reseller.referred_garages_count}</td>
                  <td className="px-6 py-3 text-right text-gray-900 whitespace-nowrap">{formatMoney(reseller.total_earned)}</td>
                  <td className="px-6 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                    {formatMoney(reseller.available_balance)}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        reseller.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {reseller.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && resellers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No resellers yet. Register one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <ResellerFormModal
          onClose={() => setShowCreate(false)}
          onSaved={(reseller) => {
            setShowCreate(false);
            navigate(`/dashboard/resellers/${reseller.id}`);
          }}
        />
      )}
    </div>
  );
};

export default Resellers;
