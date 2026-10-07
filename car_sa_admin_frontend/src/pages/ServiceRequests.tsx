import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { authUtils } from '../utils/auth';

interface ServiceItem {
  id: number;
  status: string;
  notes: string | null;
  scheduled_date: string | null;
  estimated_cost: string | number | null;
  actual_cost: string | number | null;
  mileage_at_service: number | null;
  created_at: string;
  updated_at: string;
  vehicle?: {
    id: number;
    license_plate: string;
    make: string;
    model: string;
    year: number;
    owner?: {
      id: number;
      name: string;
      email: string;
      phone: string | null;
    };
  };
  service_catalog?: {
    id: number;
    name: string;
    description?: string;
  };
  performed_by?: {
    id: number;
    name: string;
    email: string;
  };
}

interface Mechanic {
  id: number;
  name: string;
  email: string;
}

const ServiceRequests = () => {
  const location = useLocation();
  const user = authUtils.getUser();
  const isMyServicesPage = user?.role === 'garage_admin' && location.pathname === '/dashboard/my-services';
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [licensePlate, setLicensePlate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [technicianId, setTechnicianId] = useState('all');
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    status: '',
    notes: '',
    scheduled_date: '',
    estimated_cost: '',
    actual_cost: '',
    mileage_at_service: '',
  });

  useEffect(() => {
    fetchServices();
  }, [statusFilter, licensePlate, dateFrom, dateTo, technicianId, isMyServicesPage, user?.id]);

  useEffect(() => {
    fetchMechanics();
  }, []);

  const fetchMechanics = async () => {
    try {
      const response = await api.listServiceTechnicians();
      if (!response.error && response.data) {
        setMechanics(Array.isArray(response.data) ? response.data : []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const normalizedStatus = statusFilter !== 'all' ? statusFilter : undefined;
      let response;

      if (isMyServicesPage && user?.id) {
        response = await api.getServicesByOwner(user.id, {
          status: normalizedStatus,
          limit: 500,
          offset: 0,
        });
      } else {
        const params: any = { limit: 100 };
        if (normalizedStatus) {
          params.status = normalizedStatus;
        }
        if (licensePlate.trim()) {
          params.license_plate = licensePlate.trim();
        }
        if (dateFrom) {
          params.date_from = dateFrom;
        }
        if (dateTo) {
          params.date_to = dateTo;
        }
        if (technicianId !== 'all') {
          params.service_technician_id = technicianId;
        }
        response = await api.getAllServices(params);
      }

      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        let filteredServices = response.data.services || [];

        if (isMyServicesPage) {
          if (licensePlate.trim()) {
            const search = licensePlate.trim().toLowerCase();
            filteredServices = filteredServices.filter((service) =>
              service.vehicle?.license_plate?.toLowerCase().includes(search)
            );
          }
          if (dateFrom) {
            const fromDate = new Date(dateFrom);
            filteredServices = filteredServices.filter(
              (service) => new Date(service.created_at) >= fromDate
            );
          }
          if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            filteredServices = filteredServices.filter(
              (service) => new Date(service.created_at) <= toDate
            );
          }
          if (technicianId !== 'all') {
            filteredServices = filteredServices.filter(
              (service) => String(service.performed_by?.id || '') === technicianId
            );
          }
        }

        setServices(filteredServices);
      }
    } catch (err) {
      setError(isMyServicesPage ? 'Failed to fetch your services' : 'Failed to fetch activities');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openDetails = (service: ServiceItem) => {
    setSelectedService(service);
    setUpdateForm({
      status: service.status || '',
      notes: service.notes || '',
      scheduled_date: service.scheduled_date ? toDateTimeInput(service.scheduled_date) : '',
      estimated_cost: service.estimated_cost?.toString() || '',
      actual_cost: service.actual_cost?.toString() || '',
      mileage_at_service: service.mileage_at_service?.toString() || '',
    });
    setShowDetails(true);
  };

  const closeDetails = () => {
    setShowDetails(false);
    setSelectedService(null);
  };

  const handleUpdate = async () => {
    if (!selectedService) return;
    setError(null);
    try {
      const payload: any = {
        status: updateForm.status || undefined,
        notes: updateForm.notes || undefined,
        scheduled_date: updateForm.scheduled_date || null,
        estimated_cost: updateForm.estimated_cost || undefined,
        actual_cost: updateForm.actual_cost || undefined,
        mileage_at_service: updateForm.mileage_at_service || undefined,
      };

      const response = await api.updateServiceRequest(selectedService.id, payload);
      if (response.error) {
        setError(response.error);
        return;
      }
      closeDetails();
      fetchServices();
    } catch (err) {
      setError('Failed to update activity');
      console.error(err);
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const toDateTimeInput = (dateString: string) => {
    const date = new Date(dateString);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const pageCopy = useMemo(
    () =>
      isMyServicesPage
        ? {
            title: 'My Services',
            description: 'Review the service records created for your own vehicle(s)',
            emptyState: 'No service records found for your vehicles.',
            loadingText: 'Loading your services...',
            detailsTitle: 'My Service Details',
          }
        : {
            title: 'Activities',
            description: 'Monitor and review the services recorded in your garage',
            emptyState: 'No activities found.',
            loadingText: 'Loading services...',
            detailsTitle: 'Activity Details',
          },
    [isMyServicesPage]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{pageCopy.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{pageCopy.description}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Worker</label>
            <select
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
            >
              <option value="all">All</option>
              {mechanics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">License Plate</label>
            <input
              type="text"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              placeholder="e.g. RAA-001A"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
            />
          </div>
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
            <p className="mt-2 text-sm text-gray-500">{pageCopy.loadingText}</p>
          </div>
        ) : services.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            {pageCopy.emptyState}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Worker
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {services.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {service.vehicle?.license_plate || 'N/A'} • {service.vehicle?.make || ''} {service.vehicle?.model || ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {service.vehicle?.owner?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {service.service_catalog?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {service.performed_by?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 capitalize">
                      {service.status}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(service.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openDetails(service)}
                        className="text-[#FEA14C] hover:text-[#FE8A21]"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDetails && selectedService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{pageCopy.detailsTitle}</h2>
              <button onClick={closeDetails} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Vehicle</h3>
                  <p className="text-sm text-gray-700">
                    {selectedService.vehicle?.license_plate || 'N/A'} • {selectedService.vehicle?.make || ''} {selectedService.vehicle?.model || ''}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Owner</h3>
                  <p className="text-sm text-gray-700">
                    {selectedService.vehicle?.owner?.name || 'N/A'} • {selectedService.vehicle?.owner?.email || '-'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Service</h3>
                  <p className="text-sm text-gray-700">
                    {selectedService.service_catalog?.name || 'N/A'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Worker</h3>
                  <p className="text-sm text-gray-700">
                    {selectedService.performed_by?.name || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={updateForm.status}
                    onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Scheduled Date</label>
                  <input
                    type="datetime-local"
                    value={updateForm.scheduled_date}
                    onChange={(e) => setUpdateForm({ ...updateForm, scheduled_date: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Estimated Cost</label>
                  <input
                    type="number"
                    value={updateForm.estimated_cost}
                    onChange={(e) => setUpdateForm({ ...updateForm, estimated_cost: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Actual Cost</label>
                  <input
                    type="number"
                    value={updateForm.actual_cost}
                    onChange={(e) => setUpdateForm({ ...updateForm, actual_cost: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mileage at Service</label>
                  <input
                    type="number"
                    value={updateForm.mileage_at_service}
                    onChange={(e) => setUpdateForm({ ...updateForm, mileage_at_service: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={updateForm.notes}
                  onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                  rows={3}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={closeDetails}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 text-sm bg-[#FEA14C] text-white rounded-lg hover:bg-[#FE8A21]"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceRequests;
