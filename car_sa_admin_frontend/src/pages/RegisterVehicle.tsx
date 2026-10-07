import { useState } from 'react';
import api from '../services/api';

const RegisterVehicle = () => {
  const [userType, setUserType] = useState<'new' | 'existing'>('new');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [foundUser, setFoundUser] = useState<any>(null);
  const [carRegisterRequestId, setCarRegisterRequestId] = useState<number | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [codeVerified, setCodeVerified] = useState(false);

  // Owner information (for new users)
  const [ownerInfo, setOwnerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    password: '',
  });

  // Search form (for existing users)
  const [searchForm, setSearchForm] = useState({
    email: '',
    phone: '',
  });

  // Vehicle information
  const [vehicleInfo, setVehicleInfo] = useState({
    license_plate: '',
    make: '',
    model: '',
    year: '',
    vin: '',
    fuel_type: '',
  });

  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFoundUser(null);
    setSearchLoading(true);

    try {
      const response = await api.searchUser(
        searchForm.email || undefined,
        searchForm.phone || undefined
      );

      if (response.error) {
        setError(response.error);
      } else if (response.data?.user) {
        setFoundUser(response.data.user);
      }
    } catch (err) {
      setError('Failed to search for user');
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleCreateCarRegisterRequest = async () => {
    if (!foundUser || !vehicleInfo.license_plate) {
      setError('Please search for user and fill vehicle information');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.createCarRegisterRequest(foundUser.id, vehicleInfo);
      if (response.error) {
        setError(response.error);
      } else if (response.data?.car_register_request) {
        setCarRegisterRequestId(response.data.car_register_request.id);
        setCodeVerified(false);
        setVerificationCode('');
        setSuccess(
          `Car registration request created! A verification code has been sent to ${foundUser.email}. Please ask the car owner for the code.`
        );
      }
    } catch (err) {
      setError('Failed to create car registration request');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!carRegisterRequestId || !verificationCode) {
      setError('Please enter the verification code');
      return;
    }

    if (!/^\d{6}$/.test(verificationCode)) {
      setError('Verification code must be exactly 6 digits');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.verifyCarRegisterRequestCode(carRegisterRequestId, verificationCode);
      if (response.error) {
        setError(response.error);
      } else if (response.data?.car_register_request?.code_verified) {
        setCodeVerified(true);
        setSuccess('Verification code confirmed! You can now register the vehicle.');
      }
    } catch (err) {
      setError('Failed to verify code');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterVehicleFromRequest = async () => {
    if (!carRegisterRequestId || !codeVerified) {
      setError('Please verify the code first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.registerVehicleFromRequest(carRegisterRequestId);
      if (response.error) {
        setError(response.error);
      } else if (response.data?.vehicle) {
        setSuccess('Vehicle registered successfully!');
        resetForm();
      }
    } catch (err) {
      setError('Failed to register vehicle');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterNewUserVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const vehicleData = {
        owner_name: ownerInfo.name,
        owner_email: ownerInfo.email,
        owner_phone: ownerInfo.phone,
        owner_date_of_birth: ownerInfo.date_of_birth || undefined,
        owner_gender: ownerInfo.gender || undefined,
        owner_password: ownerInfo.password || undefined,
        ...vehicleInfo,
      };

      const response = await api.registerVehicle(vehicleData);
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setSuccess(
          `Vehicle registered successfully! Owner ID: ${response.data.owner_id}${
            response.data.temporary_password
              ? `. Temporary password: ${response.data.temporary_password}`
              : ''
          }`
        );
        resetForm();
      }
    } catch (err) {
      setError('Failed to register vehicle');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setOwnerInfo({
      name: '',
      email: '',
      phone: '',
      date_of_birth: '',
      gender: '',
      password: '',
    });
    setSearchForm({ email: '', phone: '' });
    setVehicleInfo({
      license_plate: '',
      make: '',
      model: '',
      year: '',
      vin: '',
      fuel_type: '',
    });
    setFoundUser(null);
    setCarRegisterRequestId(null);
    setVerificationCode('');
    setCodeVerified(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Register Vehicle</h1>
        <p className="text-sm text-gray-600 mt-1">Register a new vehicle for service</p>
      </div>

      {/* User Type Toggle */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => {
              setUserType('new');
              resetForm();
            }}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
              userType === 'new'
                ? 'bg-gradient-to-r from-[#FEA14C] to-[#FE8A21] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            New User
          </button>
          <button
            onClick={() => {
              setUserType('existing');
              resetForm();
            }}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
              userType === 'existing'
                ? 'bg-gradient-to-r from-[#FEA14C] to-[#FE8A21] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Existing User
          </button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        {/* New User Form */}
        {userType === 'new' && (
          <form onSubmit={handleRegisterNewUserVehicle} className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Owner Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerInfo.name}
                    onChange={(e) => setOwnerInfo({ ...ownerInfo, name: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={ownerInfo.email}
                    onChange={(e) => setOwnerInfo({ ...ownerInfo, email: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={ownerInfo.phone}
                    onChange={(e) => setOwnerInfo({ ...ownerInfo, phone: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={ownerInfo.date_of_birth}
                    onChange={(e) => setOwnerInfo({ ...ownerInfo, date_of_birth: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    value={ownerInfo.gender}
                    onChange={(e) => setOwnerInfo({ ...ownerInfo, gender: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={ownerInfo.password}
                    onChange={(e) => setOwnerInfo({ ...ownerInfo, password: e.target.value })}
                    placeholder="Leave empty for auto-generated"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                  />
                </div>
              </div>
            </div>

            {/* Vehicle Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Plate <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={vehicleInfo.license_plate}
                    onChange={(e) =>
                      setVehicleInfo({ ...vehicleInfo, license_plate: e.target.value.toUpperCase() })
                    }
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                    placeholder="RAA123C"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                  <input
                    type="text"
                    value={vehicleInfo.make}
                    onChange={(e) => setVehicleInfo({ ...vehicleInfo, make: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                    placeholder="Toyota"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <input
                    type="text"
                    value={vehicleInfo.model}
                    onChange={(e) => setVehicleInfo({ ...vehicleInfo, model: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                    placeholder="Hilux"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input
                    type="number"
                    value={vehicleInfo.year}
                    onChange={(e) => setVehicleInfo({ ...vehicleInfo, year: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                    placeholder="2020"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
                  <input
                    type="text"
                    value={vehicleInfo.vin}
                    onChange={(e) => setVehicleInfo({ ...vehicleInfo, vin: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                    placeholder="JT123456789012345"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Type</label>
                  <select
                    value={vehicleInfo.fuel_type}
                    onChange={(e) => setVehicleInfo({ ...vehicleInfo, fuel_type: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                  >
                    <option value="">Select</option>
                    <option value="petrol">Petrol</option>
                    <option value="diesel">Diesel</option>
                    <option value="electric">Electric</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-[#FEA14C] to-[#FE8A21] text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Registering...' : 'Register Vehicle'}
            </button>
          </form>
        )}

        {/* Existing User Form */}
        {userType === 'existing' && (
          <div className="space-y-6">
            {/* Search Form */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Search User</h3>
              <form onSubmit={handleSearchUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email or Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={searchForm.email || searchForm.phone}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.includes('@')) {
                          setSearchForm({ email: value, phone: '' });
                        } else {
                          setSearchForm({ email: '', phone: value });
                        }
                      }}
                      placeholder="Enter email or phone number"
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={searchLoading}
                  className="px-6 py-2 bg-[#2F4858] text-white rounded-lg font-medium hover:bg-[#2F4858]/90 transition-colors disabled:opacity-50"
                >
                  {searchLoading ? 'Searching...' : 'Search User'}
                </button>
              </form>
            </div>

            {/* Found User Display */}
            {foundUser && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">User Found:</h4>
                <p className="text-sm text-green-800">
                  <strong>Name:</strong> {foundUser.name}
                </p>
                <p className="text-sm text-green-800">
                  <strong>Email:</strong> {foundUser.email}
                </p>
                {foundUser.phone && (
                  <p className="text-sm text-green-800">
                    <strong>Phone:</strong> {foundUser.phone}
                  </p>
                )}
              </div>
            )}

            {/* Vehicle Information for Existing User */}
            {foundUser && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      License Plate <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={vehicleInfo.license_plate}
                      onChange={(e) =>
                        setVehicleInfo({ ...vehicleInfo, license_plate: e.target.value.toUpperCase() })
                      }
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                      placeholder="RAA123C"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                    <input
                      type="text"
                      value={vehicleInfo.make}
                      onChange={(e) => setVehicleInfo({ ...vehicleInfo, make: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                    <input
                      type="text"
                      value={vehicleInfo.model}
                      onChange={(e) => setVehicleInfo({ ...vehicleInfo, model: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <input
                      type="number"
                      value={vehicleInfo.year}
                      onChange={(e) => setVehicleInfo({ ...vehicleInfo, year: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
                    <input
                      type="text"
                      value={vehicleInfo.vin}
                      onChange={(e) => setVehicleInfo({ ...vehicleInfo, vin: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Type</label>
                    <select
                      value={vehicleInfo.fuel_type}
                      onChange={(e) => setVehicleInfo({ ...vehicleInfo, fuel_type: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                    >
                      <option value="">Select</option>
                      <option value="petrol">Petrol</option>
                      <option value="diesel">Diesel</option>
                      <option value="electric">Electric</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>
                {!carRegisterRequestId ? (
                  <button
                    onClick={handleCreateCarRegisterRequest}
                    disabled={loading}
                    className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-[#FEA14C] to-[#FE8A21] text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {loading ? 'Creating request...' : 'Create Car Registration Request'}
                  </button>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800 mb-3">
                        <strong>Car registration request created!</strong> A verification code has been sent to the car owner.
                        Please ask them for the 6-digit code.
                      </p>
                    </div>

                    {!codeVerified ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Verification Code <span className="text-red-500">*</span>
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={6}
                              value={verificationCode}
                              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                              placeholder="Enter 6-digit code"
                              className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C] text-center text-2xl tracking-widest"
                            />
                            <button
                              onClick={handleVerifyCode}
                              disabled={loading || verificationCode.length !== 6}
                              className="px-6 py-2 bg-[#2F4858] text-white rounded-lg font-medium hover:bg-[#2F4858]/90 transition-colors disabled:opacity-50"
                            >
                              Verify
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={handleRegisterVehicleFromRequest}
                        disabled={loading}
                        className="w-full px-6 py-3 bg-gradient-to-r from-[#FEA14C] to-[#FE8A21] text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                      >
                        {loading ? 'Registering vehicle...' : 'Register Vehicle'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterVehicle;

