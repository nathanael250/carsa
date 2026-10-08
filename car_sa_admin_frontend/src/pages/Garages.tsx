import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { authUtils } from '../utils/auth';

interface Garage {
  id: number;
  name: string;
  address: string;
  city: string;
  country: string;
  registration_number: string;
  owner?: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
  };
  documents?: any[];
  created_at: string;
  updated_at: string;
  createdAt?: string;
  updatedAt?: string;
}

interface OnboardingDocument {
  type: string;
  label: string;
  url: string;
  filename: string;
  uploading: boolean;
  error: string;
  issued_date: string;
  expiry_date: string;
}

const REQUIRED_DOCUMENTS: Array<{ type: string; label: string }> = [
  { type: 'business_license', label: 'Business License' },
  { type: 'registration_certificate', label: 'Registration Certificate' },
  { type: 'tax_clearance', label: 'Tax Clearance' },
  { type: 'insurance', label: 'Insurance' },
];

const createInitialDocuments = (): OnboardingDocument[] =>
  REQUIRED_DOCUMENTS.map((doc) => ({
    ...doc,
    url: '',
    filename: '',
    uploading: false,
    error: '',
    issued_date: '',
    expiry_date: '',
  }));

const Garages = () => {
  const user = authUtils.getUser();
  const isGarageAdmin = user?.role === 'garage_admin';
  const navigate = useNavigate();
  const [garages, setGarages] = useState<Garage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [garageForm, setGarageForm] = useState({
    name: '',
    address: '',
    city: '',
    country: 'Rwanda',
    registration_number: '',
  });
  const [documents, setDocuments] = useState<OnboardingDocument[]>(createInitialDocuments());

  useEffect(() => {
    fetchGarages();
  }, []);

  const fetchGarages = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getGarages();
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        const garagesList = Array.isArray(response.data) ? response.data : [];
        setGarages(garagesList);
      }
    } catch (err) {
      setError('Failed to fetch garages');
      console.error(err);
    } finally {
      setLoading(false);
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

  const resetOnboardingForm = () => {
    setGarageForm({
      name: '',
      address: '',
      city: '',
      country: 'Rwanda',
      registration_number: '',
    });
    setDocuments(createInitialDocuments());
    setOnboardingError(null);
  };

  const openOnboardingModal = () => {
    resetOnboardingForm();
    setShowOnboardingModal(true);
  };

  const closeOnboardingModal = () => {
    if (onboardingLoading) return;
    setShowOnboardingModal(false);
  };

  const uploadDocument = async (index: number, file: File) => {
    setDocuments((prev) =>
      prev.map((doc, i) =>
        i === index ? { ...doc, uploading: true, error: '' } : doc
      )
    );

    try {
      const uploadResp = await api.uploadSingle(file);
      if (uploadResp.error) {
        setDocuments((prev) =>
          prev.map((doc, i) =>
            i === index
              ? { ...doc, uploading: false, error: uploadResp.error || 'Upload failed' }
              : doc
          )
        );
        return;
      }

      const fileUrl = uploadResp.data?.file?.url || uploadResp.data?.file?.path || '';
      setDocuments((prev) =>
        prev.map((doc, i) =>
          i === index
            ? {
                ...doc,
                uploading: false,
                url: fileUrl,
                filename: uploadResp.data?.file?.originalname || file.name,
                error: '',
              }
            : doc
        )
      );
    } catch (uploadErr) {
      setDocuments((prev) =>
        prev.map((doc, i) =>
          i === index
            ? { ...doc, uploading: false, error: 'Upload failed. Please try again.' }
            : doc
        )
      );
    }
  };

  const submitNewGarage = async (event: React.FormEvent) => {
    event.preventDefault();
    setOnboardingError(null);

    if (!garageForm.name.trim()) {
      setOnboardingError('Garage name is required.');
      return;
    }

    const missingDocs = documents.filter((doc) => !doc.url);
    if (missingDocs.length > 0) {
      setOnboardingError('All required business documents must be uploaded.');
      return;
    }

    setOnboardingLoading(true);
    try {
      const response = await api.createGarage({
        name: garageForm.name.trim(),
        address: garageForm.address.trim() || undefined,
        city: garageForm.city.trim() || undefined,
        country: garageForm.country.trim() || undefined,
        registration_number: garageForm.registration_number.trim() || undefined,
        documents: documents.map((doc) => ({
          type: doc.type,
          url: doc.url,
          issued_date: doc.issued_date || undefined,
          expiry_date: doc.expiry_date || undefined,
        })),
      });

      if (response.error) {
        setOnboardingError(response.error);
        return;
      }

      setShowOnboardingModal(false);
      await fetchGarages();
    } catch (submitErr) {
      setOnboardingError('Failed to onboard garage. Please try again.');
    } finally {
      setOnboardingLoading(false);
    }
  };

  // Filter garages
  const filteredGarages = garages.filter((garage) => {
    const searchLower = searchTerm.trim().toLowerCase();
    return (
      garage.name.toLowerCase().includes(searchLower) ||
      garage.owner?.name?.toLowerCase().includes(searchLower) ||
      garage.owner?.email?.toLowerCase().includes(searchLower) ||
      garage.city.toLowerCase().includes(searchLower) ||
      garage.address.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isGarageAdmin ? 'My Garage' : 'Garages'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isGarageAdmin
              ? 'View your garage details'
              : 'Manage and view all registered garages'}
          </p>
        </div>
        {isGarageAdmin && (
          <button
            onClick={openOnboardingModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#FEA14C] hover:bg-[#FE8A21] text-white rounded-lg text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Onboard New Garage
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by garage name, owner, email, city, or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Garages Cards */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        {loading ? (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#FEA14C]"></div>
            <p className="mt-2 text-sm text-gray-500">Loading garages...</p>
          </div>
        ) : filteredGarages.length === 0 ? (
          <div className="text-center">
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
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-500">
              {searchTerm ? 'No garages found matching your search' : 'No garages registered yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredGarages.map((garage) => (
              <div
                key={garage.id}
                onClick={() => navigate(`/dashboard/garages/${garage.id}`)}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#FEA14C] to-[#FE8A21] flex items-center justify-center text-white font-semibold text-sm">
                    {garage.name?.charAt(0).toUpperCase() || 'G'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 truncate max-w-[180px]">{garage.name || 'N/A'}</p>
                    <p className="text-xs text-gray-500 truncate max-w-[180px]">{garage.city || 'N/A'}</p>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-xs text-gray-600">
                  {!isGarageAdmin && (
                    <div>
                      <span className="text-xs text-gray-500">Owner</span>
                      <p className="text-xs text-gray-900 truncate">{garage.owner?.name || 'N/A'}</p>
                      <p className="text-xs text-gray-500 truncate">{garage.owner?.email || '-'}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-xs text-gray-500">Address</span>
                    <p className="text-xs text-gray-900 truncate">{garage.address || 'N/A'}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-gray-500">Registration</span>
                      <p className="text-xs text-gray-900 truncate max-w-[120px]">{garage.registration_number || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500">Registered</span>
                      <p className="text-xs text-gray-900">{formatDate(garage.created_at || garage.createdAt || null)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-[#FEA14C] font-medium">
                  Click to view details
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showOnboardingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4">
          <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white rounded-lg shadow-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Onboard New Garage</h2>
                <p className="text-sm text-gray-500">Add garage profile and upload required business documents.</p>
              </div>
              <button
                onClick={closeOnboardingModal}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitNewGarage} className="p-6 space-y-6">
              {onboardingError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {onboardingError}
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Garage Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Garage Name</label>
                    <input
                      type="text"
                      value={garageForm.name}
                      onChange={(e) => setGarageForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Registration Number</label>
                    <input
                      type="text"
                      value={garageForm.registration_number}
                      onChange={(e) => setGarageForm((prev) => ({ ...prev, registration_number: e.target.value }))}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <input
                      type="text"
                      value={garageForm.address}
                      onChange={(e) => setGarageForm((prev) => ({ ...prev, address: e.target.value }))}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">City</label>
                    <input
                      type="text"
                      value={garageForm.city}
                      onChange={(e) => setGarageForm((prev) => ({ ...prev, city: e.target.value }))}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Country</label>
                    <input
                      type="text"
                      value={garageForm.country}
                      onChange={(e) => setGarageForm((prev) => ({ ...prev, country: e.target.value }))}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Required Business Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documents.map((doc, index) => (
                    <div key={doc.type} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800">{doc.label}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {doc.filename || 'No file uploaded'}
                          </p>
                          {doc.error && <p className="text-xs text-red-600 mt-1">{doc.error}</p>}
                          {doc.url && <p className="text-xs text-green-600 mt-1">Uploaded</p>}
                        </div>
                        <label className="cursor-pointer inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#FEA14C]/10 text-[#FEA14C] hover:bg-[#FEA14C]/20 transition-colors">
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              void uploadDocument(index, file);
                            }}
                          />
                          {doc.uploading ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0l-4 4m4-4l4 4" />
                            </svg>
                          )}
                        </label>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600">Issued Date</label>
                          <input
                            type="date"
                            value={doc.issued_date}
                            onChange={(e) =>
                              setDocuments((prev) =>
                                prev.map((item, i) =>
                                  i === index ? { ...item, issued_date: e.target.value } : item
                                )
                              )
                            }
                            className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600">Expiry Date</label>
                          <input
                            type="date"
                            value={doc.expiry_date}
                            onChange={(e) =>
                              setDocuments((prev) =>
                                prev.map((item, i) =>
                                  i === index ? { ...item, expiry_date: e.target.value } : item
                                )
                              )
                            }
                            className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeOnboardingModal}
                  disabled={onboardingLoading}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={onboardingLoading}
                  className="px-4 py-2 bg-[#FEA14C] hover:bg-[#FE8A21] text-white rounded-lg disabled:opacity-50"
                >
                  {onboardingLoading ? 'Saving...' : 'Create Garage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Garages;
