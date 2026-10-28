import { useState } from 'react';
import api, { type CommissionType, type PayoutStatus, type Reseller, type ResellerPayout } from '../services/api';
import { formatMoney, formatPayoutMethod } from '../utils/resellerFormat';

const statusStyles: Record<PayoutStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-600',
};

export const PayoutStatusBadge = ({ status }: { status: PayoutStatus }) => (
  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyles[status]}`}>
    {status}
  </span>
);

type ReviewAction = 'approve' | 'reject' | 'mark_paid';

const actionCopy: Record<ReviewAction, { title: string; button: string; buttonClass: string }> = {
  approve: { title: 'Approve payout', button: 'Approve', buttonClass: 'bg-[#2F4858] hover:bg-[#243845]' },
  reject: { title: 'Reject payout', button: 'Reject', buttonClass: 'bg-red-600 hover:bg-red-700' },
  mark_paid: { title: 'Mark payout as paid', button: 'Mark as paid', buttonClass: 'bg-green-600 hover:bg-green-700' },
};

/**
 * Buttons for the next allowed step of a payout request, with a confirmation dialog.
 * Approve → send the money outside the app → Mark as paid. Reject returns the amount to the reseller's balance.
 */
export const PayoutActions = ({ payout, onDone }: { payout: ResellerPayout; onDone: () => void }) => {
  const [action, setAction] = useState<ReviewAction | null>(null);
  const [note, setNote] = useState('');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const available: ReviewAction[] =
    payout.status === 'pending' ? ['approve', 'reject'] : payout.status === 'approved' ? ['mark_paid', 'reject'] : [];

  if (available.length === 0) {
    return <span className="text-xs text-gray-400">—</span>;
  }

  const open = (next: ReviewAction) => {
    setAction(next);
    setNote('');
    setReference('');
    setError(null);
  };

  const submit = async () => {
    if (!action) return;
    if (action === 'reject' && !note.trim()) {
      setError('Please give a reason so the reseller knows why.');
      return;
    }
    setSaving(true);
    setError(null);
    const response = await api.reviewResellerPayout(payout.id, action, {
      admin_note: note.trim() || undefined,
      payment_reference: action === 'mark_paid' ? reference.trim() || undefined : undefined,
    });
    setSaving(false);
    if (response.error) {
      setError(response.error);
      return;
    }
    setAction(null);
    onDone();
  };

  return (
    <>
      <div className="flex gap-2 justify-end">
        {available.map((item) => (
          <button
            key={item}
            onClick={() => open(item)}
            className={
              item === 'reject'
                ? 'px-3 py-1.5 text-xs border border-red-200 text-red-700 rounded-lg hover:bg-red-50 whitespace-nowrap'
                : 'px-3 py-1.5 text-xs bg-[#FEA14C] text-white rounded-lg hover:bg-[#FE8A21] whitespace-nowrap'
            }
          >
            {actionCopy[item].button}
          </button>
        ))}
      </div>

      {action && (
        // text-left: the dialog is rendered inside right-aligned table cells.
        <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-4 text-left">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{actionCopy[action].title}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {formatMoney(payout.amount)} to {payout.reseller?.name || 'reseller'}
              </p>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <p>
                  <span className="text-gray-500">Method:</span> {formatPayoutMethod(payout)}
                </p>
                <p>
                  <span className="text-gray-500">Account name:</span> {payout.account_name}
                </p>
                <p>
                  <span className="text-gray-500">Account number:</span>{' '}
                  <span className="font-medium">{payout.account_number}</span>
                </p>
                {payout.reseller_note && (
                  <p>
                    <span className="text-gray-500">Reseller note:</span> {payout.reseller_note}
                  </p>
                )}
              </div>

              {action === 'approve' && (
                <p className="text-gray-600">
                  After approving, send the money to the account above, then come back and mark it as paid.
                </p>
              )}
              {action === 'reject' && (
                <p className="text-gray-600">The amount goes back to the reseller's available balance.</p>
              )}
              {action === 'mark_paid' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Transfer reference (optional)</label>
                  <input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. mobile money transaction ID"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {action === 'reject' ? 'Reason' : 'Note (optional)'}
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">The reseller sees this in their notification.</p>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setAction(null)}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={saving}
                className={`px-4 py-2 text-white rounded-lg text-sm disabled:opacity-60 ${actionCopy[action].buttonClass}`}
              >
                {saving ? 'Saving...' : actionCopy[action].button}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const inputClass =
  'mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent';

type ResellerFormValues = {
  name: string;
  email: string;
  phone: string;
  password: string;
  commission_type: CommissionType;
  commission_value: string;
  notes: string;
};

/**
 * Creates a reseller, or edits one when `reseller` is given (password is then optional: empty keeps it).
 */
export const ResellerFormModal = ({
  reseller,
  onClose,
  onSaved,
}: {
  reseller?: Reseller | null;
  onClose: () => void;
  onSaved: (saved: Reseller) => void;
}) => {
  const isEdit = !!reseller;
  const [values, setValues] = useState<ResellerFormValues>({
    name: reseller?.name || '',
    email: reseller?.email || '',
    phone: reseller?.phone || '',
    password: '',
    commission_type: reseller?.commission_type || 'percentage',
    commission_value: reseller ? String(reseller.commission_value) : '',
    notes: reseller?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof ResellerFormValues, value: string) => setValues((prev) => ({ ...prev, [field]: value }));

  const commissionValue = Number(values.commission_value);
  const example =
    Number.isFinite(commissionValue) && commissionValue > 0
      ? values.commission_type === 'percentage'
        ? `Example: on a ${formatMoney(20000)} service payment the reseller earns ${formatMoney(Math.round((20000 * commissionValue) / 100))}.`
        : `The reseller earns ${formatMoney(commissionValue)} for every paid service.`
      : '';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!Number.isFinite(commissionValue) || commissionValue <= 0) {
      setError('Enter a commission greater than 0.');
      return;
    }
    if (values.commission_type === 'percentage' && commissionValue > 100) {
      setError('A percentage cannot be more than 100.');
      return;
    }
    if (values.commission_type === 'fixed' && !Number.isInteger(commissionValue)) {
      setError('A fixed amount must be a whole number of RWF.');
      return;
    }
    if ((!isEdit || values.password) && values.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    const payload = {
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      commission_type: values.commission_type,
      commission_value: commissionValue,
      notes: values.notes.trim(),
      ...(values.password ? { password: values.password } : {}),
    };
    const response = isEdit
      ? await api.updateReseller(reseller.id, payload)
      : await api.createReseller({ ...payload, password: values.password });
    setSaving(false);

    if (response.error || !response.data) {
      setError(response.error || 'Failed to save reseller');
      return;
    }
    onSaved(response.data.reseller);
  };

  return (
    <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[92vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{isEdit ? 'Edit Reseller' : 'Register Reseller'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full name</label>
            <input value={values.name} onChange={(e) => set('name', e.target.value)} className={inputClass} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email (used to log in)</label>
              <input
                type="email"
                value={values.email}
                onChange={(e) => set('email', e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input value={values.phone} onChange={(e) => set('phone', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {isEdit ? 'New password (leave empty to keep the current one)' : 'Password'}
            </label>
            <input
              type="text"
              value={values.password}
              onChange={(e) => set('password', e.target.value)}
              className={inputClass}
              required={!isEdit}
              autoComplete="new-password"
            />
            {!isEdit && <p className="text-xs text-gray-400 mt-1">Share it with the reseller so they can log in to the app.</p>}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-semibold text-gray-900">Commission</p>
            <p className="text-xs text-gray-500">Earned each time a garage they referred pays for a service.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={values.commission_type}
                  onChange={(e) => set('commission_type', e.target.value)}
                  className={inputClass}
                >
                  <option value="percentage">Percentage of payment</option>
                  <option value="fixed">Fixed amount per service</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {values.commission_type === 'percentage' ? 'Percentage (%)' : 'Amount (RWF)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step={values.commission_type === 'percentage' ? '0.01' : '1'}
                  value={values.commission_value}
                  onChange={(e) => set('commission_value', e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
            </div>
            {example && <p className="text-xs text-gray-500 mt-2">{example}</p>}
            {isEdit && (
              <p className="text-xs text-amber-700 mt-2">A new rate applies to future payments only. Past earnings stay the same.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Notes (only admins see this)</label>
            <textarea value={values.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className={inputClass} />
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#FEA14C] text-white rounded-lg hover:bg-[#FE8A21] disabled:opacity-60 text-sm"
            >
              {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Register reseller'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
