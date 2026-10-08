import { useState, useEffect } from 'react';
import api from '../services/api';
import { authUtils } from '../utils/auth';

interface Service {
  id: number;
  name: string;
  description: string | null;
  interval_type: 'days' | 'km';
  recommended_interval_days: number | null;
  recommended_interval_km: number | null;
  service_kind: string | null;
  created_at: string;
  updated_at: string;
}

const SERVICE_KIND_OPTIONS = [
  { value: '', label: 'General service' },
  { value: 'engine_oil_change', label: 'Engine oil change' },
  { value: 'gearbox_oil_change', label: 'Gearbox oil change' },
  { value: 'transmission_oil_change', label: 'Transmission oil change' },
  { value: 'brake_service', label: 'Brake service' },
  { value: 'coolant_service', label: 'Coolant service' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'tire_service', label: 'Tire service' },
  { value: 'battery_service', label: 'Battery service' },
  { value: 'general_repair', label: 'General repair' },
];

const getServiceKindLabel = (serviceKind: string | null | undefined) =>
  SERVICE_KIND_OPTIONS.find((option) => option.value === (serviceKind || ''))?.label || 'General service';

const Services = () => {
  const currentUser = authUtils.getUser();
  const canManageCatalog = currentUser?.role === 'super_admin';

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    interval_type: 'days' as 'days' | 'km',
    recommended_interval_days: '',
    recommended_interval_km: '',
    service_kind: '',
  });

  useEffect(() => {
    fetchServices();
  }, [filterType]);

  const fetchServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { limit: 100 };
      if (filterType !== 'all') {
        params.interval_type = filterType;
      }
      const response = await api.getServices(params);
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setServices(response.data.services || []);
      }
    } catch (err) {
      setError('Failed to fetch services');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description || '',
        interval_type: service.interval_type,
        recommended_interval_days: service.recommended_interval_days?.toString() || '',
        recommended_interval_km: service.recommended_interval_km?.toString() || '',
        service_kind: service.service_kind || '',
      });
    } else {
      setEditingService(null);
      setFormData({
        name: '',
        description: '',
        interval_type: 'days',
        recommended_interval_days: '',
        recommended_interval_km: '',
        service_kind: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingService(null);
    setFormData({
      name: '',
      description: '',
      interval_type: 'days',
      recommended_interval_days: '',
      recommended_interval_km: '',
      service_kind: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload: any = {
      name: formData.name.trim(),
      interval_type: formData.interval_type,
    };

    if (formData.description.trim()) {
      payload.description = formData.description.trim();
    }

    if (formData.service_kind) {
      payload.service_kind = formData.service_kind;
    }

    if (formData.interval_type === 'days') {
      if (!formData.recommended_interval_days) {
        setError('Recommended interval days is required');
        return;
      }
      payload.recommended_interval_days = parseInt(formData.recommended_interval_days);
    } else {
      if (!formData.recommended_interval_km) {
        setError('Recommended interval km is required');
        return;
      }
      payload.recommended_interval_km = parseInt(formData.recommended_interval_km);
    }

    try {
      let response;
      if (editingService) {
        response = await api.updateService(editingService.id, payload);
      } else {
        response = await api.createService(payload);
      }

      if (response.error) {
        setError(response.error);
      } else {
        handleCloseModal();
        fetchServices();
      }
    } catch (err) {
      setError('Failed to save service');
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await api.deleteService(id);
      if (response.error) {
        setError(response.error);
      } else {
        setDeleteConfirm(null);
        fetchServices();
      }
    } catch (err) {
      setError('Failed to delete service');
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services Catalog</h1>
          <p className="text-sm text-gray-600 mt-1">
            {canManageCatalog ? 'Manage service catalog items' : 'View service catalog items'}
          </p>
        </div>
        {canManageCatalog && (
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-gradient-to-r from-[#FEA14C] to-[#FE8A21] text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Service
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterType === 'all'
              ? 'bg-[#2F4858] text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilterType('km')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterType === 'km'
              ? 'bg-[#2F4858] text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Kilometers
        </button>
      </div>

      {/* Services Table */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FEA14C]"></div>
        </div>
      ) : services.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No services</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new service.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Interval Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recommended Interval
                  </th>
                  {canManageCatalog && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {services.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{service.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {service.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                        {getServiceKindLabel(service.service_kind)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {service.interval_type === 'days' ? 'Days' : 'Kilometers'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {service.interval_type === 'days'
                        ? `${service.recommended_interval_days} days`
                        : `${service.recommended_interval_km} km`}
                    </td>
                    {canManageCatalog && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal(service)}
                            className="text-[#FEA14C] hover:text-[#FE8A21] transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(service.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {canManageCatalog && showModal && (
        <div className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingService ? 'Edit Service' : 'Create New Service'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                  placeholder="e.g., Oil Change"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                  placeholder="Service description (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Type
                </label>
                <select
                  value={formData.service_kind}
                  onChange={(e) => setFormData({ ...formData, service_kind: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                >
                  {SERVICE_KIND_OPTIONS.map((option) => (
                    <option key={option.value || 'general'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Use an oil-change type when the worker must choose the actual oil product used.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interval Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.interval_type}
                  onChange={(e) => {
                    const newType = e.target.value as 'days' | 'km';
                    setFormData({
                      ...formData,
                      interval_type: newType,
                      recommended_interval_days: newType === 'days' ? formData.recommended_interval_days : '',
                      recommended_interval_km: newType === 'km' ? formData.recommended_interval_km : '',
                    });
                  }}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                >
                  <option value="days">Days</option>
                  <option value="km">Kilometers</option>
                </select>
              </div>

              {formData.interval_type === 'days' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recommended Interval (Days) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.recommended_interval_days}
                    onChange={(e) =>
                      setFormData({ ...formData, recommended_interval_days: e.target.value })
                    }
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                    placeholder="e.g., 90"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recommended Interval (Kilometers) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.recommended_interval_km}
                    onChange={(e) =>
                      setFormData({ ...formData, recommended_interval_km: e.target.value })
                    }
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                    placeholder="e.g., 10000"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#FEA14C] to-[#FE8A21] text-white rounded-lg font-medium hover:shadow-lg transition-all"
                >
                  {editingService ? 'Update Service' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {canManageCatalog && deleteConfirm && (
        <div className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Service</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this service? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;

