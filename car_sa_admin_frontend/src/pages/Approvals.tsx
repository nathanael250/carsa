import { useEffect, useState } from 'react';
import api from '../services/api';

interface BusinessDocument {
  id: number;
  doc_type: string;
  file_path: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  verified: boolean;
  verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Garage {
  id: number;
  name?: string;
  address?: string;
  city?: string;
  country?: string;
  registration_number?: string;
  documents?: BusinessDocument[];
  created_at: string;
  updated_at: string;
}

interface PendingGarageAdmin {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: 'garage_admin';
  email_verified?: boolean;
  approved?: boolean;
  garage?: Garage;
  garage_assignment?: Garage;
  created_at: string;
  createdAt?: string;
}

const Approvals = () => {
  const [pendingGarageAdmins, setPendingGarageAdmins] = useState<PendingGarageAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<PendingGarageAdmin | null>(null);

  useEffect(() => {
    fetchPendingGarageAdmins();
  }, []);

  const fetchPendingGarageAdmins = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.listPendingGarageAdmins();
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        const pending = Array.isArray(response.data) ? response.data : [];
        setPendingGarageAdmins(pending);
      }
    } catch (err) {
      setError('Failed to fetch pending garage admins');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (adminId: number) => {
    const confirmed = window.confirm('Approve this garage admin?');
    if (!confirmed) return;
    setError(null);
    try {
      const response = await api.approveGarageAdmin(adminId);
      if (response.error) {
        setError(response.error);
        return;
      }
      setPendingGarageAdmins((prev) => prev.filter((admin) => admin.id !== adminId));
    } catch (err) {
      setError('Failed to approve garage admin');
      console.error(err);
    }
  };

  const handleReject = async (adminId: number) => {
    const confirmed = window.confirm('Reject this garage admin? This will delete the request.');
    if (!confirmed) return;
    setError(null);
    try {
      const response = await api.rejectGarageAdmin(adminId);
      if (response.error) {
        setError(response.error);
        return;
      }
      setPendingGarageAdmins((prev) => prev.filter((admin) => admin.id !== adminId));
    } catch (err) {
      setError('Failed to reject garage admin');
      console.error(err);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getGarageInfo = (admin: PendingGarageAdmin) => {
    return admin.garage || admin.garage_assignment || null;
  };

  const formatDocType = (docType: string) => {
    return (docType || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const getDocumentUrl = (path: string | null | undefined) => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001').replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalizedPath}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and approve pending garage admin registrations
          </p>
        </div>
        <button
          onClick={fetchPendingGarageAdmins}
          className="px-3 py-2 text-sm font-medium text-[#FEA14C] hover:text-[#FE8A21]"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#FEA14C]"></div>
            <p className="mt-2 text-sm text-gray-500">Loading pending approvals...</p>
          </div>
        ) : pendingGarageAdmins.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            No pending garage admins.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Garage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingGarageAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{admin.name}</div>
                      <div className="text-sm text-gray-500">{admin.email}</div>
                      {admin.phone && <div className="text-xs text-gray-500">{admin.phone}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getGarageInfo(admin)?.name || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {getGarageInfo(admin)?.registration_number || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(admin.created_at || admin.createdAt || null)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button
                        onClick={() => setSelectedAdmin(admin)}
                        className="text-[#2F4858] hover:text-[#1d2f3b] font-medium"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleApprove(admin.id)}
                        className="text-green-600 hover:text-green-700 font-medium"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(admin.id)}
                        className="text-red-600 hover:text-red-700 font-medium"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSelectedAdmin(null)}
          />
          <div className="relative bg-white w-full max-w-4xl rounded-xl shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Pending Garage Admin Details</h2>
                <p className="text-sm text-gray-500 mt-1">Review all information before approval</p>
              </div>
              <button
                onClick={() => setSelectedAdmin(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Admin Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">Name:</span> <span className="text-gray-900">{selectedAdmin.name || '-'}</span></p>
                    <p><span className="text-gray-500">Email:</span> <span className="text-gray-900">{selectedAdmin.email || '-'}</span></p>
                    <p><span className="text-gray-500">Phone:</span> <span className="text-gray-900">{selectedAdmin.phone || '-'}</span></p>
                    <p><span className="text-gray-500">Email Verified:</span> <span className={selectedAdmin.email_verified ? 'text-green-700' : 'text-red-700'}>{selectedAdmin.email_verified ? 'Yes' : 'No'}</span></p>
                    <p><span className="text-gray-500">Submitted:</span> <span className="text-gray-900">{formatDate(selectedAdmin.created_at || selectedAdmin.createdAt || null)}</span></p>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Garage Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">Garage Name:</span> <span className="text-gray-900">{getGarageInfo(selectedAdmin)?.name || '-'}</span></p>
                    <p><span className="text-gray-500">Registration Number:</span> <span className="text-gray-900">{getGarageInfo(selectedAdmin)?.registration_number || '-'}</span></p>
                    <p><span className="text-gray-500">Address:</span> <span className="text-gray-900">{getGarageInfo(selectedAdmin)?.address || '-'}</span></p>
                    <p><span className="text-gray-500">City:</span> <span className="text-gray-900">{getGarageInfo(selectedAdmin)?.city || '-'}</span></p>
                    <p><span className="text-gray-500">Country:</span> <span className="text-gray-900">{getGarageInfo(selectedAdmin)?.country || '-'}</span></p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Business Documents</h3>
                {(getGarageInfo(selectedAdmin)?.documents || []).length === 0 ? (
                  <p className="text-sm text-gray-500">No documents attached.</p>
                ) : (
                  <div className="space-y-3">
                    {(getGarageInfo(selectedAdmin)?.documents || []).map((doc) => (
                      <div key={doc.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="space-y-1 text-sm">
                            <p><span className="text-gray-500">Type:</span> <span className="text-gray-900">{formatDocType(doc.doc_type)}</span></p>
                            <p><span className="text-gray-500">Issued:</span> <span className="text-gray-900">{formatDate(doc.issued_date)}</span></p>
                            <p><span className="text-gray-500">Expiry:</span> <span className="text-gray-900">{formatDate(doc.expiry_date)}</span></p>
                            <p><span className="text-gray-500">Verified:</span> <span className={doc.verified ? 'text-green-700' : 'text-amber-700'}>{doc.verified ? 'Yes' : 'No'}</span></p>
                          </div>
                          {getDocumentUrl(doc.file_path) ? (
                            <a
                              href={getDocumentUrl(doc.file_path) || '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center px-3 py-2 text-sm border border-[#FEA14C] text-[#FE8A21] rounded-lg hover:bg-orange-50"
                            >
                              View Document
                            </a>
                          ) : (
                            <span className="text-sm text-gray-500">No document file</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedAdmin(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const id = selectedAdmin.id;
                  setSelectedAdmin(null);
                  handleReject(id);
                }}
                className="px-4 py-2 border border-red-200 text-red-700 rounded-lg hover:bg-red-50"
              >
                Reject
              </button>
              <button
                onClick={() => {
                  const id = selectedAdmin.id;
                  setSelectedAdmin(null);
                  handleApprove(id);
                }}
                className="px-4 py-2 bg-[#FEA14C] text-white rounded-lg hover:bg-[#FE8A21]"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Approvals;
