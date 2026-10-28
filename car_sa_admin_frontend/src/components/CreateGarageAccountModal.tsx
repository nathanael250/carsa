import { useState } from 'react';
import api from '../services/api';
import { COUNTRIES, ID_DOCUMENT } from '../utils/countries';

const inputClass =
  'mt-1 w-full border border-gray-400 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent';

/**
 * Super admin: creates a garage owner's login and their garage in one step.
 * The account is approved straight away; the owner logs in with the password set here.
 */
const CreateGarageAccountModal = ({ onClose, onCreated }: { onClose: () => void; onCreated: (message: string) => void }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    referral_code: '',
    garage_name: '',
    registration_number: '',
    address: '',
    city: '',
    country: 'Rwanda',
  });
  const [idDocument, setIdDocument] = useState<{ url: string; filename: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const uploadId = async (file: File) => {
    setUploading(true);
    setError(null);
    const response = await api.uploadSingle(file);
    setUploading(false);
    if (response.error) {
      setError(response.error);
      return;
    }
    const url = response.data?.file?.url || response.data?.file?.path || '';
    setIdDocument({ url, filename: response.data?.file?.originalname || file.name });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    const response = await api.createGarageAccount({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      password: form.password,
      referral_code: form.referral_code.trim() || undefined,
      garage: {
        name: form.garage_name.trim(),
        registration_number: form.registration_number.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        country: form.country,
      },
      documents: idDocument ? [{ type: ID_DOCUMENT.type, url: idDocument.url }] : undefined,
    });
    setSaving(false);
    if (response.error || !response.data) {
      setError(response.error || 'Failed to create the garage account');
      return;
    }
    onCreated(response.data.message);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white rounded-lg shadow-xl border border-gray-300">
        <div className="px-6 py-4 border-b border-gray-300 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Create Garage Account</h2>
            <p className="text-sm text-gray-700">The account is approved immediately. Share the email and password with the owner.</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900" aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-6">
          {error && <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg text-sm">{error}</div>}

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Owner (garage admin login)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-800">Full name</label>
                <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputClass} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800">Email</label>
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputClass} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800">Phone</label>
                <input value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800">Password</label>
                <input
                  type="text"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Garage</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-800">Garage name</label>
                <input value={form.garage_name} onChange={(e) => set('garage_name', e.target.value)} className={inputClass} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800">Registration / TIN number</label>
                <input value={form.registration_number} onChange={(e) => set('registration_number', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800">Address</label>
                <input value={form.address} onChange={(e) => set('address', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800">City</label>
                <input value={form.city} onChange={(e) => set('city', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800">Country</label>
                <select value={form.country} onChange={(e) => set('country', e.target.value)} className={inputClass}>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800">Reseller referral code (optional)</label>
                <input
                  value={form.referral_code}
                  onChange={(e) => set('referral_code', e.target.value)}
                  className={inputClass}
                  placeholder="e.g. RSK7P2QX"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">{ID_DOCUMENT.label} (optional)</h3>
            <p className="text-xs text-gray-700 mb-2">You can add it now or later.</p>
            <label className="inline-flex items-center gap-3 cursor-pointer border border-gray-400 rounded-lg px-4 py-2 text-sm text-gray-900 hover:bg-gray-50">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadId(file);
                }}
              />
              {uploading ? 'Uploading…' : idDocument ? `Uploaded: ${idDocument.filename}` : 'Choose file'}
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-400 text-gray-900 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="px-4 py-2 bg-[#FEA14C] hover:bg-[#FE8A21] text-white rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create & approve'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGarageAccountModal;
