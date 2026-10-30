import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { type ResellerDetailsData } from '../services/api';
import { PayoutActions, PayoutStatusBadge, ResellerFormModal } from '../components/ResellerUi';
import { formatCommission, formatDateTime, formatMoney, formatPayoutMethod } from '../utils/resellerFormat';
import { referralJoinLink } from '../utils/referral';

type GarageOption = { id: number; name: string; city?: string | null; owner?: { name?: string } | null };

const ResellerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const resellerId = Number(id);
  const [details, setDetails] = useState<ResellerDetailsData | null>(null);
  const [garages, setGarages] = useState<GarageOption[]>([]);
  const [garageToLink, setGarageToLink] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Sets state only after the request finishes, so it can run straight from an effect.
  const load = useCallback(async () => {
    const response = await api.getReseller(resellerId);
    setLoading(false);
    if (response.error || !response.data) {
      setError(response.error || 'Failed to load reseller');
      return;
    }
    setDetails(response.data);
  }, [resellerId]);

  useEffect(() => {
    load();
    api.getGarages().then((response) => {
      if (Array.isArray(response.data)) setGarages(response.data);
    });
  }, [load]);

  const reseller = details?.reseller;
  const linkedGarageIds = new Set(details?.garages.map((g) => g.garage_id));
  const linkableGarages = garages.filter((g) => !linkedGarageIds.has(g.id));

  const runAction = async (action: () => Promise<{ error?: string; data?: { message?: string } }>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    const response = await action();
    setBusy(false);
    if (response.error) {
      setError(response.error);
      return;
    }
    setMessage(response.data?.message || 'Saved');
    await load();
  };

  const toggleActive = () => {
    if (!reseller) return;
    const verb = reseller.active ? 'Deactivate' : 'Activate';
    const warning = reseller.active
      ? '\n\nThey will not be able to log in, their code stops working for new sign-ups, and they stop earning commission.'
      : '';
    if (!window.confirm(`${verb} ${reseller.name}?${warning}`)) return;
    runAction(() => api.updateReseller(reseller.id, { active: !reseller.active }));
  };

  const linkGarage = () => {
    if (!reseller || !garageToLink) return;
    const garage = garages.find((g) => String(g.id) === garageToLink);
    if (
      !window.confirm(
        `Link ${garage?.name || 'this garage'} to ${reseller.name}?\n\nIf it is linked to another reseller, it moves to ${reseller.name}. Commission counts from now on.`
      )
    )
      return;
    runAction(() => api.setGarageReseller(Number(garageToLink), reseller.id)).then(() => setGarageToLink(''));
  };

  const unlinkGarage = (garageId: number | null, garageName: string | null) => {
    if (!garageId) return;
    if (!window.confirm(`Remove ${garageName || 'this garage'} from this reseller? Future payments will not earn commission.`)) return;
    runAction(() => api.setGarageReseller(garageId, null));
  };

  const copyLink = async () => {
    if (!reseller) return;
    try {
      await navigator.clipboard.writeText(referralJoinLink(reseller.referral_code));
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 1500);
    } catch {
      setLinkCopied(false);
    }
  };

  const copyCode = async () => {
    if (!reseller) return;
    try {
      await navigator.clipboard.writeText(reseller.referral_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  if (!details && loading) {
    return <p className="text-gray-500">Loading...</p>;
  }

  if (!reseller) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/dashboard/resellers')} className="text-sm text-gray-600 hover:text-gray-900">
          ← Back to resellers
        </button>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
      </div>
    );
  }

  const cards = [
    { label: 'Available balance', value: formatMoney(reseller.available_balance), note: 'Can be requested' },
    { label: 'Total earned', value: formatMoney(reseller.total_earned), note: `${reseller.commissions_count} paid services` },
    { label: 'Requested', value: formatMoney(reseller.pending_payouts), note: 'Waiting for payout' },
    { label: 'Paid out', value: formatMoney(reseller.paid_out), note: 'Already sent' },
  ];

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/dashboard/resellers')} className="text-sm text-gray-600 hover:text-gray-900">
        ← Back to resellers
      </button>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{reseller.name}</h1>
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                  reseller.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {reseller.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {reseller.email}
              {reseller.phone ? ` · ${reseller.phone}` : ''}
            </p>
            <p className="text-sm text-gray-700 mt-3">
              Commission: <span className="font-medium">{formatCommission(reseller.commission_type, reseller.commission_value)}</span>
            </p>
            {reseller.notes && <p className="text-sm text-gray-500 mt-1">Notes: {reseller.notes}</p>}
          </div>

          <div className="flex flex-col items-start lg:items-end gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase text-gray-500">Referral code</span>
              <span className="font-mono text-lg font-bold text-[#2F4858] bg-[#FEA14C]/15 px-3 py-1 rounded">
                {reseller.referral_code}
              </span>
              <button onClick={copyCode} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="flex items-center gap-2 max-w-full">
              <span className="text-xs uppercase text-gray-500 shrink-0">Share link</span>
              <span className="text-xs text-gray-800 truncate max-w-[16rem]">{referralJoinLink(reseller.referral_code)}</span>
              <button onClick={copyLink} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 shrink-0">
                {linkCopied ? 'Copied' : 'Copy link'}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEdit(true)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                Edit
              </button>
              <button
                onClick={toggleActive}
                disabled={busy}
                className={`px-4 py-2 rounded-lg text-sm disabled:opacity-60 ${
                  reseller.active
                    ? 'border border-red-200 text-red-700 hover:bg-red-50'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {reseller.active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
      {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{message}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => (
          <div
            key={card.label}
            className={`rounded-lg shadow-sm border p-6 ${index === 0 ? 'bg-[#2F4858] border-[#2F4858]' : 'bg-white border-gray-200'}`}
          >
            <p className={`text-sm ${index === 0 ? 'text-white/70' : 'text-gray-500'}`}>{card.label}</p>
            <p className={`text-2xl font-bold mt-2 ${index === 0 ? 'text-white' : 'text-gray-900'}`}>{card.value}</p>
            <p className={`text-xs mt-1 ${index === 0 ? 'text-white/60' : 'text-gray-500'}`}>{card.note}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-900">Referred garages ({details.garages.length})</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Garages that signed up with this code, or that you linked here.
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={garageToLink}
              onChange={(e) => setGarageToLink(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm max-w-[16rem] focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
            >
              <option value="">Link a garage…</option>
              {linkableGarages.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                  {g.city ? ` (${g.city})` : ''}
                </option>
              ))}
            </select>
            <button
              onClick={linkGarage}
              disabled={!garageToLink || busy}
              className="px-4 py-2 bg-[#FEA14C] text-white rounded-lg hover:bg-[#FE8A21] disabled:opacity-50 text-sm"
            >
              Link
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Garage</th>
                <th className="px-6 py-3 text-left font-medium">Owner</th>
                <th className="px-6 py-3 text-left font-medium">Linked since</th>
                <th className="px-6 py-3 text-right font-medium">Paid services</th>
                <th className="px-6 py-3 text-right font-medium">Earned</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {details.garages.map((garage) => (
                <tr key={garage.garage_admin_id}>
                  <td className="px-6 py-3">
                    <p className="font-medium text-gray-900">{garage.garage_name || '-'}</p>
                    <p className="text-xs text-gray-500">
                      {garage.city || ''}
                      {!garage.approved && <span className="ml-1 text-amber-700">· Pending approval</span>}
                    </p>
                  </td>
                  <td className="px-6 py-3 text-gray-600">
                    <p>{garage.owner_name}</p>
                    <p className="text-xs text-gray-500">{garage.owner_email}</p>
                  </td>
                  <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{formatDateTime(garage.referred_at)}</td>
                  <td className="px-6 py-3 text-right text-gray-600">{garage.paid_services_count}</td>
                  <td className="px-6 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                    {formatMoney(garage.total_earned)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {garage.garage_id && (
                      <button
                        onClick={() => unlinkGarage(garage.garage_id, garage.garage_name)}
                        disabled={busy}
                        className="text-xs text-red-600 hover:underline disabled:opacity-50"
                      >
                        Unlink
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {details.garages.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No garages yet. Share the code {reseller.referral_code} or link a garage above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Payout requests</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Requested</th>
                <th className="px-6 py-3 text-right font-medium">Amount</th>
                <th className="px-6 py-3 text-left font-medium">Pay to</th>
                <th className="px-6 py-3 text-left font-medium">Status</th>
                <th className="px-6 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {details.payouts.map((payout) => (
                <tr key={payout.id}>
                  <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{formatDateTime(payout.created_at)}</td>
                  <td className="px-6 py-3 text-right font-medium text-gray-900 whitespace-nowrap">{formatMoney(payout.amount)}</td>
                  <td className="px-6 py-3 text-gray-600">
                    <p>{formatPayoutMethod(payout)}</p>
                    <p className="text-xs text-gray-500">
                      {payout.account_name} · {payout.account_number}
                    </p>
                  </td>
                  <td className="px-6 py-3">
                    <PayoutStatusBadge status={payout.status} />
                    {payout.payment_reference && <p className="text-xs text-gray-500 mt-1">Ref {payout.payment_reference}</p>}
                    {payout.admin_note && <p className="text-xs text-gray-500 mt-1">{payout.admin_note}</p>}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <PayoutActions payout={{ ...payout, reseller: { id: reseller.id, name: reseller.name, email: reseller.email } }} onDone={load} />
                  </td>
                </tr>
              ))}
              {details.payouts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No payout requests yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Commissions earned</h3>
          <span className="text-xs text-gray-500">
            {details.commissions_total > details.commissions.length
              ? `Latest ${details.commissions.length} of ${details.commissions_total}`
              : `${details.commissions_total} total`}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Paid at</th>
                <th className="px-6 py-3 text-left font-medium">Garage</th>
                <th className="px-6 py-3 text-right font-medium">Service payment</th>
                <th className="px-6 py-3 text-left font-medium">Rate</th>
                <th className="px-6 py-3 text-right font-medium">Commission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {details.commissions.map((commission) => (
                <tr key={commission.id}>
                  <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{formatDateTime(commission.earned_at)}</td>
                  <td className="px-6 py-3 text-gray-900">{commission.garage?.name || '-'}</td>
                  <td className="px-6 py-3 text-right text-gray-600 whitespace-nowrap">{formatMoney(commission.base_amount)}</td>
                  <td className="px-6 py-3 text-gray-600 whitespace-nowrap">
                    {commission.commission_type === 'percentage'
                      ? `${Number(commission.commission_value)}%`
                      : `${formatMoney(commission.commission_value)} fixed`}
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                    {formatMoney(commission.amount)}
                  </td>
                </tr>
              ))}
              {details.commissions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No commissions yet. They appear when a referred garage's service payment is confirmed.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showEdit && (
        <ResellerFormModal
          reseller={reseller}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            setMessage('Reseller updated');
            load();
          }}
        />
      )}
    </div>
  );
};

export default ResellerDetails;
