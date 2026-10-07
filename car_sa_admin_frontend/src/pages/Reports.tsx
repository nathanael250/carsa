import { useState } from 'react';
import api from '../services/api';

interface ReportStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  cancelled: number;
}

const Reports = () => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ReportStats>({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  });

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const baseParams: any = {
        limit: 1,
      };
      if (dateFrom) baseParams.date_from = dateFrom;
      if (dateTo) baseParams.date_to = dateTo;

      const [all, pending, inProgress, completed, cancelled] = await Promise.all([
        api.getAllServices({ ...baseParams }),
        api.getAllServices({ ...baseParams, status: 'pending' }),
        api.getAllServices({ ...baseParams, status: 'in_progress' }),
        api.getAllServices({ ...baseParams, status: 'completed' }),
        api.getAllServices({ ...baseParams, status: 'cancelled' }),
      ]);

      if (all.error || pending.error || inProgress.error || completed.error || cancelled.error) {
        setError(
          all.error ||
            pending.error ||
            inProgress.error ||
            completed.error ||
            cancelled.error ||
            'Failed to load reports'
        );
        return;
      }

      setStats({
        total: all.data?.total || 0,
        pending: pending.data?.total || 0,
        in_progress: inProgress.data?.total || 0,
        completed: completed.data?.total || 0,
        cancelled: cancelled.data?.total || 0,
      });
    } catch (err) {
      setError('Failed to load reports');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = async () => {
    setError(null);
    try {
      const params: any = { limit: 1000 };
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const response = await api.getAllServices(params);
      if (response.error) {
        setError(response.error);
        return;
      }
      const services = response.data?.services || [];
      const rows = [
        ['ID', 'Status', 'Vehicle', 'Service', 'Worker', 'Created', 'Estimated Cost', 'Actual Cost'],
        ...services.map((service: any) => [
          service.id,
          service.status,
          service.vehicle?.license_plate || '',
          service.service_catalog?.name || '',
          service.performed_by?.name || '',
          service.created_at,
          service.estimated_cost || '',
          service.actual_cost || '',
        ]),
      ];
      const csvContent = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'service-report.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export report');
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Generate garage performance reports</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div className="flex items-end gap-2">
            <button
              onClick={fetchStats}
              className="px-4 py-2 bg-[#FEA14C] text-white rounded-lg hover:bg-[#FE8A21]"
            >
              Generate
            </button>
            <button
              onClick={exportCsv}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { label: 'Total', value: stats.total },
          { label: 'Pending', value: stats.pending },
          { label: 'In Progress', value: stats.in_progress },
          { label: 'Completed', value: stats.completed },
          { label: 'Cancelled', value: stats.cancelled },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {loading ? '...' : card.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Reports;
