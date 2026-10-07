import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { authUtils } from '../utils/auth';

interface Mechanic {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  gender: string | null;
  date_of_birth: string | null;
  active: boolean;
  created_at: string;
  createdAt?: string;
  garage_assignment?: {
    id: number;
    name: string;
    city?: string | null;
  } | null;
}

interface GarageOption {
  id: number;
  name: string;
  city?: string | null;
}

const ActionIcon = ({
  path,
  color,
}: {
  path: string;
  color: string;
}) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={path} />
  </svg>
);

const actionIcons = {
  view: 'M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z M12 15a3 3 0 100-6 3 3 0 000 6z',
  edit: 'M12 20h9 M16.5 3.5a2.12 2.12 0 113 3L7 19l-4 1 1-4 12.5-12.5z',
  password: 'M12 15v2 M6 10V8a6 6 0 1112 0v2 M5 10h14v10H5z',
  disable: 'M18.36 6.64a9 9 0 11-12.72 0 M12 2v10',
  enable: 'M5 13l4 4L19 7',
};

const actionButtonBase =
  'inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors';

const Mechanics = () => {
  const user = authUtils.getUser();
  const isGarageAdmin = user?.role === 'garage_admin';
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [garages, setGarages] = useState<GarageOption[]>([]);
  const [selectedGarageId, setSelectedGarageId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMechanic, setEditingMechanic] = useState<Mechanic | null>(null);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gender: '',
    date_of_birth: '',
    password: '',
    garage_id: '',
  });

  useEffect(() => {
    fetchGarages();
  }, []);

  useEffect(() => {
    fetchMechanics(selectedGarageId || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGarageId]);

  const fetchMechanics = async (garageId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.listServiceTechnicians(garageId ? Number(garageId) : undefined);
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setMechanics(Array.isArray(response.data) ? response.data : []);
      }
    } catch (err) {
      setError('Failed to fetch workers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGarages = async () => {
    try {
      const response = await api.getGarages();
      if (response.error) return;
      const garageList = Array.isArray(response.data) ? response.data : [];
      const normalizedGarages = garageList.map((garage: any) => ({
        id: garage.id,
        name: garage.name,
        city: garage.city,
      }));
      setGarages(normalizedGarages);
    } catch (fetchError) {
      console.error(fetchError);
    }
  };

  const openCreateModal = () => {
    const defaultGarageId = selectedGarageId || (garages.length === 1 ? String(garages[0].id) : '');
    setEditingMechanic(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      gender: '',
      date_of_birth: '',
      password: '',
      garage_id: defaultGarageId,
    });
    setShowModal(true);
  };

  const openEditModal = (mechanic: Mechanic) => {
    setEditingMechanic(mechanic);
    setFormData({
      name: mechanic.name || '',
      email: mechanic.email || '',
      phone: mechanic.phone || '',
      gender: mechanic.gender || '',
      date_of_birth: mechanic.date_of_birth || '',
      password: '',
      garage_id: '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingMechanic(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Name and email are required');
      return;
    }

    try {
      if (editingMechanic) {
        const response = await api.updateServiceTechnician(editingMechanic.id, {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          gender: formData.gender.trim() || undefined,
          date_of_birth: formData.date_of_birth || undefined,
        });
        if (response.error) {
          setError(response.error);
          return;
        }
      } else {
        if (!formData.password.trim()) {
          setError('Password is required for new workers');
          return;
        }
        if (!formData.garage_id) {
          setError('Please select a garage for this worker');
          return;
        }
        const response = await api.createServiceTechnician({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          gender: formData.gender.trim() || undefined,
          date_of_birth: formData.date_of_birth || undefined,
          password: formData.password.trim(),
          garage_id: Number(formData.garage_id),
        });
        if (response.error) {
          setError(response.error);
          return;
        }
      }

      closeModal();
      fetchMechanics(selectedGarageId || undefined);
    } catch (err) {
      setError('Failed to save worker');
      console.error(err);
    }
  };

  const handleToggleStatus = async (mechanic: Mechanic) => {
    const confirmed = window.confirm(
      `${mechanic.active ? 'Disable' : 'Enable'} this worker?`
    );
    if (!confirmed) return;
    setError(null);
    try {
      const response = await api.setServiceTechnicianStatus(mechanic.id, !mechanic.active);
      if (response.error) {
        setError(response.error);
        return;
      }
      fetchMechanics(selectedGarageId || undefined);
    } catch (err) {
      setError('Failed to update worker status');
      console.error(err);
    }
  };

  const handleResetPassword = async (mechanic: Mechanic) => {
    const newPassword = window.prompt('Enter new password for this worker:');
    if (!newPassword) return;
    setError(null);
    try {
      const response = await api.resetServiceTechnicianPassword(mechanic.id, newPassword);
      if (response.error) {
        setError(response.error);
        return;
      }
      alert('Password reset successfully.');
    } catch (err) {
      setError('Failed to reset password');
      console.error(err);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const renderActionButtons = (mechanic: Mechanic) => {
    const toggleColor = mechanic.active ? '#dc2626' : '#16a34a';
    const toggleBorder = mechanic.active ? 'rgba(220,38,38,0.18)' : 'rgba(22,163,74,0.18)';
    const toggleBackground = mechanic.active ? 'rgba(220,38,38,0.05)' : 'rgba(22,163,74,0.05)';

    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          onClick={() => navigate(`/dashboard/mechanics/${mechanic.id}`)}
          className={actionButtonBase}
          style={{
            borderColor: 'rgba(47,72,88,0.1)',
            background: 'rgba(47,72,88,0.04)',
          }}
          title="View worker"
          aria-label="View worker"
        >
          <ActionIcon path={actionIcons.view} color="#2F4858" />
        </button>
        <button
          onClick={() => openEditModal(mechanic)}
          className={actionButtonBase}
          style={{
            borderColor: 'rgba(254,161,76,0.22)',
            background: 'rgba(254,161,76,0.08)',
          }}
          title="Edit worker"
          aria-label="Edit worker"
        >
          <ActionIcon path={actionIcons.edit} color="#FEA14C" />
        </button>
        <button
          onClick={() => handleResetPassword(mechanic)}
          className={actionButtonBase}
          style={{
            borderColor: 'rgba(37,99,235,0.18)',
            background: 'rgba(37,99,235,0.06)',
          }}
          title="Reset password"
          aria-label="Reset password"
        >
          <ActionIcon path={actionIcons.password} color="#2563eb" />
        </button>
        <button
          onClick={() => handleToggleStatus(mechanic)}
          className={actionButtonBase}
          style={{
            borderColor: toggleBorder,
            background: toggleBackground,
          }}
          title={mechanic.active ? 'Disable worker' : 'Enable worker'}
          aria-label={mechanic.active ? 'Disable worker' : 'Enable worker'}
        >
          <ActionIcon
            path={mechanic.active ? actionIcons.disable : actionIcons.enable}
            color={toggleColor}
          />
        </button>
      </div>
    );
  };

  const filteredMechanics = mechanics.filter((mechanic) => {
    const term = searchTerm.toLowerCase();
    return (
      term === '' ||
      mechanic.name.toLowerCase().includes(term) ||
      mechanic.email.toLowerCase().includes(term) ||
      (mechanic.phone && mechanic.phone.includes(term))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage workers in your garage(s)</p>
        </div>
        <button
          onClick={openCreateModal}
          className="w-full sm:w-auto px-4 py-2 bg-[#FEA14C] text-white rounded-lg hover:bg-[#FE8A21] transition-colors"
        >
          Add Worker
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
            />
          </div>
          <select
            value={selectedGarageId}
            onChange={(e) => setSelectedGarageId(e.target.value)}
            className="w-full sm:w-72 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
          >
            <option value="">All My Garages</option>
            {garages.map((garage) => (
              <option key={garage.id} value={garage.id}>
                {garage.name}{garage.city ? ` - ${garage.city}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#FEA14C]"></div>
            <p className="mt-2 text-sm text-gray-500">Loading workers...</p>
          </div>
        ) : filteredMechanics.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No workers found.
          </div>
        ) : (
          <>
            <div className="md:hidden p-3 space-y-3">
              {filteredMechanics.map((mechanic) => (
                <div key={mechanic.id} className="border border-gray-200 rounded-lg p-3 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{mechanic.name}</p>
                    <p className="text-xs text-gray-500 break-all">{mechanic.email}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-500">Phone</p>
                      <p className="text-gray-800">{mechanic.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Garage</p>
                      <p className="text-gray-800">{mechanic.garage_assignment?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Registered</p>
                      <p className="text-gray-800">{formatDate(mechanic.created_at || mechanic.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Status</p>
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                          mechanic.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {mechanic.active ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  {renderActionButtons(mechanic)}
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Worker
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Garage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registered
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMechanics.map((mechanic) => (
                  <tr key={mechanic.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{mechanic.name}</div>
                      <div className="text-xs text-gray-500">{mechanic.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {mechanic.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {mechanic.garage_assignment?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          mechanic.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {mechanic.active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(mechanic.created_at || mechanic.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {renderActionButtons(mechanic)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[92vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingMechanic ? 'Edit Worker' : 'Add Worker'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
                  />
                </div>
              </div>
              {!editingMechanic && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Garage</label>
                  <select
                    value={formData.garage_id}
                    onChange={(e) => setFormData({ ...formData, garage_id: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
                    required
                  >
                    <option value="">Select garage</option>
                    {garages.map((garage) => (
                      <option key={garage.id} value={garage.id}>
                        {garage.name}{garage.city ? ` - ${garage.city}` : ''}
                      </option>
                    ))}
                  </select>
                  {isGarageAdmin && garages.length === 0 && (
                    <p className="mt-1 text-xs text-red-600">
                      No garage found for your account. Create a garage first.
                    </p>
                  )}
                </div>
              )}
              {!editingMechanic && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
                    required
                  />
                </div>
              )}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full sm:w-auto px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 text-sm bg-[#FEA14C] text-white rounded-lg hover:bg-[#FE8A21]"
                >
                  {editingMechanic ? 'Save Changes' : 'Create Worker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mechanics;
