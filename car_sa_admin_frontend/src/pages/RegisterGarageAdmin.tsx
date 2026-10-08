import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const RegisterGarageAdmin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    gender: '',
    date_of_birth: '',
    garage_name: '',
    garage_address: '',
    garage_city: '',
    garage_country: 'Rwanda',
    garage_registration_number: '',
  });

  const requiredDocs = [
    { type: 'business_license', label: 'Business License' },
    { type: 'registration_certificate', label: 'Registration Certificate' },
    { type: 'tax_clearance', label: 'Tax Clearance' },
    { type: 'insurance', label: 'Insurance' },
  ];
  const registrationSteps = [
    {
      id: 1,
      label: 'Account',
      description: 'Add the admin identity and login details.',
    },
    {
      id: 2,
      label: 'Garage',
      description: 'Provide the workshop profile and registration info.',
    },
    {
      id: 3,
      label: 'Documents',
      description: 'Upload the required business verification files.',
    },
  ];

  const [documents, setDocuments] = useState(
    requiredDocs.map((doc) => ({
      ...doc,
      url: '',
      filename: '',
      uploading: false,
      error: '',
    }))
  );
  const fileInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError('Name, email, and password are required.');
      return;
    }
    if (!isValidEmail(formData.email)) {
      setError('Please enter a valid email address.');
      setStep(1);
      return;
    }
    if (!formData.garage_name.trim()) {
      setError('Garage name is required.');
      return;
    }
    const missingDocs = documents.filter((doc) => !doc.url);
    if (missingDocs.length > 0) {
      setError('All required business documents must be uploaded.');
      return;
    }

    setLoading(true);
    try {
      const submittedEmail = formData.email.trim();
      const response = await api.registerGarageAdmin({
        name: formData.name.trim(),
        email: submittedEmail,
        password: formData.password.trim(),
        phone: formData.phone.trim() || undefined,
        gender: formData.gender.trim() || undefined,
        date_of_birth: formData.date_of_birth || undefined,
        garage: {
          name: formData.garage_name.trim(),
          address: formData.garage_address.trim() || undefined,
          city: formData.garage_city.trim() || undefined,
          country: formData.garage_country.trim() || undefined,
          registration_number: formData.garage_registration_number.trim() || undefined,
        },
        documents: documents.map((doc) => ({
          type: doc.type,
          url: doc.url,
        })),
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      navigate('/login', {
        replace: true,
        state: {
          successMessage:
            response.data?.message ||
            'Registration submitted successfully. You can now log in after approval.',
        },
      });
    } catch (err) {
      setError('Registration failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const goNext = () => {
    setError(null);
    if (step === 1) {
      if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
        setError('Name, email, and password are required.');
        return;
      }
      if (!isValidEmail(formData.email)) {
        setError('Please enter a valid email address.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.garage_name.trim()) {
        setError('Garage name is required.');
        return;
      }
      setStep(3);
    }
  };

  const goBack = () => {
    setError(null);
    setStep((prev) => Math.max(1, prev - 1));
  };

  const currentStepConfig = registrationSteps[step - 1];

  const handleDocumentUpload = async (
    index: number,
    file: File
  ) => {
    setDocuments((prev) =>
      prev.map((d, i) =>
        i === index ? { ...d, uploading: true, error: '' } : d
      )
    );

    try {
      const uploadResp = await api.uploadSingle(file);
      if (uploadResp.error) {
        setDocuments((prev) =>
          prev.map((d, i) =>
            i === index ? { ...d, uploading: false, error: uploadResp.error || 'Upload failed' } : d
          )
        );
        return;
      }

      const fileUrl = uploadResp.data?.file?.url || uploadResp.data?.file?.path;
      setDocuments((prev) =>
        prev.map((d, i) =>
          i === index
            ? {
                ...d,
                uploading: false,
                url: fileUrl || '',
                filename: uploadResp.data?.file?.originalname || file.name,
              }
            : d
        )
      );
    } catch (err) {
      setDocuments((prev) =>
        prev.map((d, i) =>
          i === index ? { ...d, uploading: false, error: 'Upload failed' } : d
        )
      );
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(254,161,76,0.08),_transparent_24%),linear-gradient(180deg,#f6f8fc_0%,#eef3fb_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="relative w-full max-w-4xl rounded-[30px] border border-[#d8e3f0] bg-[#fcfcfd] shadow-[0_30px_80px_rgba(47,72,88,0.16)]">
          <div className="absolute left-6 top-0 -translate-y-1/2 rounded-2xl bg-gradient-to-br from-[#FEA14C] to-[#FE8A21] p-3 text-white shadow-[0_14px_30px_rgba(254,161,76,0.28)]">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0ZM4.5 20.118a7.5 7.5 0 0115 0A17.933 17.933 0 0112 21.75a17.933 17.933 0 01-7.5-1.632Z" />
            </svg>
          </div>

          <div className="px-6 pb-6 pt-10 sm:px-10 sm:pb-8 sm:pt-12">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="sm:text-center sm:flex-1">
                <h1 className="text-2xl font-bold tracking-tight text-[#2F4858] sm:text-3xl">
                  Registration Form
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Submit your details to register as a garage admin.
                </p>
              </div>

              <div className="sm:pt-1">
                <Link
                  to="/login"
                  className="inline-flex items-center rounded-full border border-[#FEA14C]/25 bg-white px-4 py-2 text-sm font-medium text-[#FE8A21] transition-colors hover:border-[#FEA14C] hover:bg-[#fff4ea]"
                >
                  Back to Login
                </Link>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 pt-6">
              <div className="flex flex-col items-center">
                <div className="flex w-full max-w-sm items-center justify-center">
                  {registrationSteps.map((item, index) => {
                    const isActive = step === item.id;
                    const isComplete = step > item.id;

                    return (
                      <div key={item.id} className="flex flex-1 items-center">
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all ${
                              isActive
                                ? 'border-[#FEA14C] bg-[#FEA14C] text-white shadow-[0_10px_22px_rgba(254,161,76,0.24)]'
                                : isComplete
                                  ? 'border-[#2F4858] bg-[#2F4858] text-white'
                                  : 'border-[#2F4858] bg-white text-[#2F4858]'
                            }`}
                          >
                            {isComplete ? (
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              item.id
                            )}
                          </div>
                          <span className="mt-3 text-xs font-medium text-[#2F4858]">
                            {item.label}
                          </span>
                        </div>

                        {index < registrationSteps.length - 1 && (
                          <div className="mx-3 mb-6 h-0.5 flex-1 bg-slate-300">
                            <div
                              className={`h-full transition-all ${
                                step > item.id ? 'bg-[#FEA14C]' : 'bg-slate-300'
                              }`}
                              style={{ width: step > item.id ? '100%' : step === item.id ? '50%' : '0%' }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="mt-5 text-center text-sm text-[#60779a]">
                  {currentStepConfig.description}
                </p>
              </div>

              {error && (
                <div className="rounded-[18px] border border-[#ffcbc7] bg-[#fff4f3] px-4 py-3 text-[15px] text-[#e3342f]">
                  {error}
                </div>
              )}

              {step === 1 && (
                <div>
                  <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-[#2F4858]">
                    Account Details
                  </h2>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-600">Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 transition-all focus:border-[#FEA14C] focus:outline-none focus:ring-4 focus:ring-[#FEA14C]/10"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 transition-all focus:border-[#FEA14C] focus:outline-none focus:ring-4 focus:ring-[#FEA14C]/10"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">Phone</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 transition-all focus:border-[#FEA14C] focus:outline-none focus:ring-4 focus:ring-[#FEA14C]/10"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">Password</label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 transition-all focus:border-[#FEA14C] focus:outline-none focus:ring-4 focus:ring-[#FEA14C]/10"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">Gender</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 transition-all focus:border-[#FEA14C] focus:outline-none focus:ring-4 focus:ring-[#FEA14C]/10"
                      >
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">Date of Birth</label>
                      <input
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                        className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 transition-all focus:border-[#FEA14C] focus:outline-none focus:ring-4 focus:ring-[#FEA14C]/10"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-[#2F4858]">
                    Garage Details
                  </h2>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-600">Garage Name</label>
                      <input
                        type="text"
                        value={formData.garage_name}
                        onChange={(e) => setFormData({ ...formData, garage_name: e.target.value })}
                        className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 transition-all focus:border-[#FEA14C] focus:outline-none focus:ring-4 focus:ring-[#FEA14C]/10"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">TIN Number</label>
                      <input
                        type="text"
                        value={formData.garage_registration_number}
                        onChange={(e) => setFormData({ ...formData, garage_registration_number: e.target.value })}
                        className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 transition-all focus:border-[#FEA14C] focus:outline-none focus:ring-4 focus:ring-[#FEA14C]/10"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">Address</label>
                      <input
                        type="text"
                        value={formData.garage_address}
                        onChange={(e) => setFormData({ ...formData, garage_address: e.target.value })}
                        className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 transition-all focus:border-[#FEA14C] focus:outline-none focus:ring-4 focus:ring-[#FEA14C]/10"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">City</label>
                      <input
                        type="text"
                        value={formData.garage_city}
                        onChange={(e) => setFormData({ ...formData, garage_city: e.target.value })}
                        className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 transition-all focus:border-[#FEA14C] focus:outline-none focus:ring-4 focus:ring-[#FEA14C]/10"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">Country</label>
                      <select
                        value={formData.garage_country}
                        onChange={(e) => setFormData({ ...formData, garage_country: e.target.value })}
                        className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 transition-all focus:border-[#FEA14C] focus:outline-none focus:ring-4 focus:ring-[#FEA14C]/10"
                      >
                        <option value="Rwanda">Rwanda</option>
                        <option value="Burundi">Burundi</option>
                        <option value="Uganda">Uganda</option>
                        <option value="Tanzania">Tanzania</option>
                        <option value="Kenya">Kenya</option>
                        <option value="Democratic Republic of Congo">Democratic Republic of Congo</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-[#2F4858]">
                    Business Documents
                  </h2>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {documents.map((doc, index) => (
                      <div
                        key={doc.type}
                        className="rounded-[18px] border border-[#d7e0ec] bg-white p-4 shadow-[0_6px_18px_rgba(47,72,88,0.08)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(47,72,88,0.12)]"
                      >
                        <input
                          ref={(element) => {
                            fileInputRefs.current[index] = element;
                          }}
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            await handleDocumentUpload(index, file);
                            e.currentTarget.value = '';
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => fileInputRefs.current[index]?.click()}
                          className="flex w-full items-center justify-between gap-4 text-left"
                        >
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#2F4858]">{doc.label}</p>
                            <p className="mt-1 truncate text-sm text-[#6b7f9c]">
                              {doc.filename ? doc.filename : 'No file uploaded'}
                            </p>
                            {doc.error && (
                              <p className="mt-1 text-xs text-red-600">{doc.error}</p>
                            )}
                          </div>
                          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff4ea] text-[#FEA14C] transition-colors hover:bg-[#ffe8d2]">
                              {doc.uploading ? (
                                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0l-4 4m4-4l4 4" />
                                </svg>
                              )}
                          </span>
                        </button>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <p className={`text-sm font-medium ${doc.url ? 'text-[#16a34a]' : 'text-[#94a3b8]'}`}>
                            {doc.url ? 'Uploaded' : 'Click card to upload'}
                          </p>
                          {doc.url && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(doc.url, '_blank', 'noopener,noreferrer');
                              }}
                              className="text-sm font-medium text-[#FE8A21] hover:text-[#FEA14C] hover:underline"
                            >
                              Preview
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={step === 1}
                  className="min-w-24 rounded-2xl border border-[#c7d4e4] bg-white px-6 py-3 text-sm font-medium text-[#587195] transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Back
                </button>
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="min-w-24 rounded-2xl bg-gradient-to-r from-[#FEA14C] to-[#FE8A21] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(254,161,76,0.26)] transition-transform hover:-translate-y-0.5"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="min-w-44 rounded-2xl bg-gradient-to-r from-[#FEA14C] to-[#FE8A21] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(254,161,76,0.28)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none"
                  >
                    {loading ? 'Submitting...' : 'Submit Registration'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterGarageAdmin;
