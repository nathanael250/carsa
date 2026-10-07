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
  payment_collection_id?: string | null;
  payment_status?: 'QUEUED' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | null;
  payment_phone?: string | null;
  payment_amount?: number | null;
  payment_provider_ref?: string | null;
  payment_fail_reason?: string | null;
  paid_at?: string | null;
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
  const [paymentForm, setPaymentForm] = useState({
    phone: '',
    amount: '',
  });
  const [paymentMessage, setPaymentMessage] = useState('');
  const [paymentPolling, setPaymentPolling] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  useEffect(() => {
    fetchServices();
  }, [statusFilter, licensePlate, dateFrom, dateTo, technicianId, isMyServicesPage, user?.id]);

  useEffect(() => {
    fetchMechanics();
  }, []);

  useEffect(() => {
    return () => {
      setPaymentPolling(false);
    };
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
    setPaymentForm({
      phone: service.payment_phone || service.vehicle?.owner?.phone || '',
      amount: (service.payment_amount || service.actual_cost || service.estimated_cost || '').toString(),
    });
    setPaymentMessage(service.payment_status ? `Payment status: ${service.payment_status}` : '');
    setPaymentPolling(false);
    setPaymentProcessing(false);
    setShowDetails(true);
  };

  const closeDetails = () => {
    setShowDetails(false);
    setSelectedService(null);
    setPaymentPolling(false);
    setPaymentMessage('');
  };

  const serviceHasConfirmedPayment = selectedService?.payment_status === 'SUCCESS';

  const refreshSelectedServicePayment = (service: ServiceItem) => {
    setSelectedService(service);
    setServices((prev) => prev.map((item) => (item.id === service.id ? service : item)));
  };

  const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

  const pollPaymentStatus = async (serviceId: number) => {
    setPaymentPolling(true);
    setPaymentMessage('Waiting for customer confirmation...');

    const startedAt = Date.now();
    const timeoutMs = 120000;

    await wait(6000);

    while (Date.now() - startedAt < timeoutMs) {
      const response = await api.checkServicePaymentStatus(serviceId);
      if (response.error) {
        setPaymentMessage(response.error);
        setPaymentPolling(false);
        return;
      }

      const paymentStatus = response.data?.paymentStatus;
      if (response.data?.service) {
        refreshSelectedServicePayment(response.data.service);
      }

      if (paymentStatus === 'SUCCESS') {
        setPaymentMessage('Payment confirmed. You can now complete the service.');
        setPaymentPolling(false);
        return;
      }

      if (paymentStatus === 'FAILED') {
        setPaymentMessage(response.data?.failReason || 'Payment failed. Ask the customer to try again.');
        setPaymentPolling(false);
        return;
      }

      setPaymentMessage(`Payment ${paymentStatus || 'PROCESSING'}. Checking again soon...`);
      await wait(6000);
    }

    setPaymentMessage('Payment is still processing. You can check again later with the same collection.');
    setPaymentPolling(false);
  };

  const handleStartPayment = async () => {
    if (!selectedService) return;
    setError(null);
    setPaymentMessage('');

    const amount = Number(paymentForm.amount);
    if (!paymentForm.phone.trim()) {
      setPaymentMessage('Enter the customer Mobile Money phone number.');
      return;
    }
    if (!Number.isInteger(amount) || amount < 100) {
      setPaymentMessage('Enter a whole amount of at least 100 RWF.');
      return;
    }

    setPaymentProcessing(true);
    try {
      const response = await api.initiateServicePayment(selectedService.id, {
        phone: paymentForm.phone.trim(),
        amount,
      });

      if (response.error) {
        setPaymentMessage(response.error);
        return;
      }

      if (response.data?.service) {
        refreshSelectedServicePayment(response.data.service);
      }
      setPaymentMessage(`Payment ${response.data?.paymentStatus || 'PROCESSING'}. Ask the customer to approve the prompt.`);
      await pollPaymentStatus(selectedService.id);
    } catch (err) {
      setPaymentMessage('Failed to start payment collection.');
      console.error(err);
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleCheckPayment = async () => {
    if (!selectedService) return;
    await pollPaymentStatus(selectedService.id);
  };

  const handleUpdate = async () => {
    if (!selectedService) return;
    setError(null);

    if (updateForm.status === 'completed' && !serviceHasConfirmedPayment) {
      setPaymentMessage('Complete the payment first. The service can only be completed after payment succeeds.');
      return;
    }

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

              {(updateForm.status === 'completed' || selectedService.payment_collection_id) && (
                <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800">Payment Required</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Service completion is enabled only after payment reaches SUCCESS.
                      </p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        selectedService.payment_status === 'SUCCESS'
                          ? 'bg-green-100 text-green-700'
                          : selectedService.payment_status === 'FAILED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {selectedService.payment_status || 'NOT STARTED'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">MoMo Phone</label>
                      <input
                        type="tel"
                        value={paymentForm.phone}
                        onChange={(e) => setPaymentForm({ ...paymentForm, phone: e.target.value })}
                        disabled={paymentPolling || paymentProcessing || selectedService.payment_status === 'SUCCESS'}
                        placeholder="0781111111"
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent disabled:bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Amount (RWF)</label>
                      <input
                        type="number"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        disabled={paymentPolling || paymentProcessing || selectedService.payment_status === 'SUCCESS'}
                        min={100}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent disabled:bg-gray-100"
                      />
                    </div>
                  </div>

                  {selectedService.payment_collection_id && (
                    <p className="text-xs text-gray-500">
                      Collection: {selectedService.payment_collection_id}
                      {selectedService.payment_provider_ref ? ` • Provider ref: ${selectedService.payment_provider_ref}` : ''}
                    </p>
                  )}

                  {paymentMessage && (
                    <p
                      className={`text-sm ${
                        selectedService.payment_status === 'SUCCESS'
                          ? 'text-green-700'
                          : selectedService.payment_status === 'FAILED'
                            ? 'text-red-700'
                            : 'text-amber-700'
                      }`}
                    >
                      {paymentMessage}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleStartPayment}
                      disabled={paymentPolling || paymentProcessing || selectedService.payment_status === 'SUCCESS'}
                      className="px-4 py-2 text-sm bg-[#2F4858] text-white rounded-lg hover:bg-[#263b48] disabled:opacity-60"
                    >
                      {paymentProcessing ? 'Starting...' : selectedService.payment_collection_id ? 'Restart Payment' : 'Start Payment'}
                    </button>
                    {selectedService.payment_collection_id && selectedService.payment_status !== 'SUCCESS' && (
                      <button
                        type="button"
                        onClick={handleCheckPayment}
                        disabled={paymentPolling || paymentProcessing}
                        className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
                      >
                        {paymentPolling ? 'Checking...' : 'Check Status'}
                      </button>
                    )}
                  </div>
                </div>
              )}

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
                  disabled={paymentPolling || paymentProcessing || (updateForm.status === 'completed' && !serviceHasConfirmedPayment)}
                  className="px-4 py-2 text-sm bg-[#FEA14C] text-white rounded-lg hover:bg-[#FE8A21] disabled:opacity-60"
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
