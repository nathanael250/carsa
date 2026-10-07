import { authUtils } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const API_KEY = import.meta.env.VITE_API_KEY;
const NORMALIZED_BASE_URL = API_BASE_URL.replace(/\/+$/, '');
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000);

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

class ApiService {
  private isPublicAuthCommand(command: string): boolean {
    return (
      command === 'LOGIN' ||
      command === 'REGISTER_USER' ||
      command === 'VERIFY_EMAIL' ||
      command === 'RESEND_VERIFICATION_CODE'
    );
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private handleUnauthorized(): void {
    // Clear auth data
    authUtils.removeToken();
    // Redirect to login immediately
    window.location.href = '/login';
  }

  private async requestCommand<T>(
    command: string,
    payload: { body?: any; params?: any; query?: any } = {},
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getAuthToken();

    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    headers.set('req', command);

    if (API_KEY) {
      headers.set('apiKey', API_KEY);
    }

    if (token && !this.isPublicAuthCommand(command)) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    try {
      const response = await this.fetchWithTimeout(`${NORMALIZED_BASE_URL}/`, {
        method: 'POST',
        ...options,
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        if (!this.isPublicAuthCommand(command)) {
          this.handleUnauthorized();
        }
        return {
          error: data.error || 'Session expired. Please login again.',
        };
      }

      if (!response.ok) {
        // Keep this log for fast backend debugging in dev tools.
        console.error(`[API:${command}] ${response.status}`, {
          payload,
          response: data,
        });
        return {
          error: data.error || data.message || `Request failed with status ${response.status} (${command})`,
        };
      }

      return { data, message: data.message };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { error: `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s` };
      }
      return {
        error: error instanceof Error ? error.message : 'Network error occurred',
      };
    }
  }

  private async requestCommandFormData<T>(
    command: string,
    formData: FormData
  ): Promise<ApiResponse<T>> {
    const token = this.getAuthToken();

    const headers = new Headers();
    headers.set('req', command);

    if (API_KEY) {
      headers.set('apiKey', API_KEY);
    }

    if (token && !this.isPublicAuthCommand(command)) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    try {
      const response = await this.fetchWithTimeout(`${NORMALIZED_BASE_URL}/`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        if (!this.isPublicAuthCommand(command)) {
          this.handleUnauthorized();
        }
        return {
          error: data.error || 'Session expired. Please login again.',
        };
      }

      if (!response.ok) {
        console.error(`[API:${command}] ${response.status}`, {
          response: data,
        });
        return {
          error: data.error || data.message || `Request failed with status ${response.status} (${command})`,
        };
      }

      return { data, message: data.message };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { error: `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s` };
      }
      return {
        error: error instanceof Error ? error.message : 'Network error occurred',
      };
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.requestCommand<{
      token: string;
      message: string;
      user?: {
        id: number;
        role: string;
        email?: string;
        email_verified?: boolean;
        approved?: boolean;
      };
    }>('LOGIN', {
      body: { email, password },
    });
  }

  async verifyEmail(email: string, code: string) {
    return this.requestCommand<{ message: string }>('VERIFY_EMAIL', {
      body: { email, code },
    });
  }

  async resendVerificationCode(email: string) {
    return this.requestCommand<{ message: string }>('RESEND_VERIFICATION_CODE', {
      body: { email },
    });
  }

  async registerGarageAdmin(payload: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    gender?: string;
    date_of_birth?: string;
    garage: {
      name: string;
      address?: string;
      city?: string;
      country?: string;
      registration_number?: string;
    };
    documents: Array<{
      type: string;
      file_path?: string;
      url?: string;
      issued_date?: string;
      expiry_date?: string;
    }>;
  }) {
    return this.requestCommand<any>('REGISTER_USER', {
      body: {
        ...payload,
        role: 'garage_admin',
      },
    });
  }

  // Service Catalog endpoints
  async getServices(params?: { interval_type?: string; page?: number; limit?: number }) {
    return this.requestCommand<{
      services: any[];
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    }>('LIST_SERVICE_CATALOGS', {
      body: {},
      query: {
        interval_type: params?.interval_type,
        page: params?.page,
        limit: params?.limit,
      },
    });
  }

  async getGarageDashboardStats() {
    return this.requestCommand<any>('GARAGE_DASHBOARD_STATS', { body: {} });
  }

  async getServiceById(id: number) {
    return this.requestCommand<{ service: any }>('GET_SERVICE_CATALOG', {
      body: {},
      params: { id },
    });
  }

  async createService(serviceData: {
    name: string;
    description?: string;
    interval_type: 'days' | 'km';
    recommended_interval_days?: number;
    recommended_interval_km?: number;
    service_kind?: string;
  }) {
    return this.requestCommand<{ service: any }>('CREATE_SERVICE_CATALOG', {
      body: serviceData,
    });
  }

  async updateService(id: number, serviceData: {
    name?: string;
    description?: string;
    interval_type?: 'days' | 'km';
    recommended_interval_days?: number;
    recommended_interval_km?: number;
    service_kind?: string;
  }) {
    return this.requestCommand<{ service: any }>('UPDATE_SERVICE_CATALOG', {
      body: serviceData,
      params: { id },
    });
  }

  async deleteService(id: number) {
    return this.requestCommand<{ deleted_id: number }>('DELETE_SERVICE_CATALOG', {
      body: {},
      params: { id },
    });
  }

  async getOilProducts(params?: { category?: string; is_active?: boolean }) {
    return this.requestCommand<{
      oils: any[];
      total: number;
    }>('LIST_OIL_PRODUCTS', {
      body: {},
      query: {
        category: params?.category,
        is_active: params?.is_active,
      },
    });
  }

  async createOilProduct(payload: {
    name: string;
    brand: string;
    grade?: string;
    category: 'engine_oil' | 'gearbox_oil' | 'transmission_oil' | 'other';
    description?: string;
    is_active?: boolean;
  }) {
    return this.requestCommand<{ oil: any }>('CREATE_OIL_PRODUCT', {
      body: payload,
    });
  }

  async updateOilProduct(
    id: number,
    payload: {
      name?: string;
      brand?: string;
      grade?: string;
      category?: 'engine_oil' | 'gearbox_oil' | 'transmission_oil' | 'other';
      description?: string;
      is_active?: boolean;
    }
  ) {
    return this.requestCommand<{ oil: any }>('UPDATE_OIL_PRODUCT', {
      body: payload,
      params: { id },
    });
  }

  async deleteOilProduct(id: number) {
    return this.requestCommand<{ deleted_id: number }>('DELETE_OIL_PRODUCT', {
      body: {},
      params: { id },
    });
  }

  // User endpoints
  async getUsers() {
    return this.requestCommand<any[]>('LIST_USERS', { body: {} });
  }

  async getUsersWithDetails() {
    return this.requestCommand<any[]>('LIST_USERS_WITH_DETAILS', { body: {} });
  }

  async getGarages() {
    return this.requestCommand<any[]>('LIST_GARAGES', { body: {} });
  }

  async createGarage(payload: {
    owner_user_id?: number;
    name: string;
    address?: string;
    city?: string;
    country?: string;
    registration_number?: string;
    documents: Array<{
      type: string;
      url?: string;
      file_path?: string;
      issued_date?: string;
      expiry_date?: string;
    }>;
  }) {
    return this.requestCommand<{ garage: any; documents_count: number; message: string }>('CREATE_GARAGE', {
      body: payload,
    });
  }

  async deleteUser(id: number) {
    return this.requestCommand<{ deleted: any }>('DELETE_USER_WITH_DETAILS', {
      body: {},
      params: { id },
    });
  }

  async searchUser(email?: string, phone?: string) {
    return this.requestCommand<{ user: any }>('SEARCH_USER', {
      body: { email, phone },
    });
  }

  async createGarageAdmin(payload: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    gender?: string;
    date_of_birth?: string;
    garage_id?: number;
  }) {
    return this.requestCommand<{ user: any }>('CREATE_GARAGE_ADMIN', {
      body: payload,
    });
  }

  async listPendingGarageAdmins() {
    return this.requestCommand<any[]>('LIST_PENDING_GARAGE_ADMINS', { body: {} });
  }

  async approveGarageAdmin(id: number) {
    return this.requestCommand<{ user: any }>('APPROVE_GARAGE_ADMIN', {
      body: {},
      params: { id },
    });
  }

  async rejectGarageAdmin(id: number) {
    return this.requestCommand<{ deleted_id: number }>('REJECT_GARAGE_ADMIN', {
      body: {},
      params: { id },
    });
  }

  async createServiceTechnician(payload: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    gender?: string;
    date_of_birth?: string;
    garage_id?: number;
  }) {
    return this.requestCommand<{ user: any }>('CREATE_SERVICE_TECHNICIAN', {
      body: payload,
    });
  }

  async listServiceTechnicians(garageId?: number) {
    return this.requestCommand<any[]>('LIST_SERVICE_TECHNICIANS', {
      body: {},
      query: { garage_id: garageId },
    });
  }

  async updateServiceTechnician(id: number, payload: {
    name?: string;
    email?: string;
    phone?: string;
    gender?: string;
    date_of_birth?: string;
  }) {
    return this.requestCommand<{ user: any }>('UPDATE_SERVICE_TECHNICIAN', {
      body: payload,
      params: { id },
    });
  }

  async setServiceTechnicianStatus(id: number, active: boolean) {
    return this.requestCommand<{ user: any }>('SET_SERVICE_TECHNICIAN_STATUS', {
      body: { active },
      params: { id },
    });
  }

  async resetServiceTechnicianPassword(id: number, new_password: string) {
    return this.requestCommand<{ message: string }>('RESET_SERVICE_TECHNICIAN_PASSWORD', {
      body: { new_password },
      params: { id },
    });
  }

  async updateProfile(payload: {
    name?: string;
    phone?: string;
    gender?: string;
    date_of_birth?: string;
    email?: string;
  }) {
    return this.requestCommand<{ user: any }>('UPDATE_PROFILE', {
      body: payload,
    });
  }

  async changePassword(payload: { old_password: string; new_password: string }) {
    return this.requestCommand<{ message: string }>('CHANGE_PASSWORD', {
      body: payload,
    });
  }

  // Car Register Request endpoints
  async createCarRegisterRequest(userId: number, vehicleData: any, garageId?: number) {
    return this.requestCommand<{ car_register_request: any; email_sent: boolean }>('CREATE_CAR_REGISTER_REQUEST', {
      body: { user_id: userId, vehicle_data: vehicleData, garage_id: garageId },
    });
  }

  async getCarRegisterRequest(id: number) {
    return this.requestCommand<{ car_register_request: any }>('GET_CAR_REGISTER_REQUEST', {
      body: {},
      params: { id },
    });
  }

  async verifyCarRegisterRequestCode(id: number, code: string) {
    return this.requestCommand<{ car_register_request: any }>('VERIFY_CAR_REGISTER_CODE', {
      body: { code },
      params: { id },
    });
  }

  async registerVehicleFromRequest(id: number) {
    return this.requestCommand<{ vehicle: any }>('REGISTER_VEHICLE_FROM_REQUEST', {
      body: {},
      params: { id },
    });
  }

  // Vehicle endpoints
  async registerVehicle(vehicleData: any) {
    return this.requestCommand<{ vehicle: any; owner_id: number; temporary_password?: string }>(
      'GARAGE_REGISTER_VEHICLE',
      {
        body: vehicleData,
      }
    );
  }

  async findVehicleByPlate(plate: string) {
    return this.requestCommand<any>('FIND_VEHICLE_BY_LICENSE', {
      body: {},
      query: { plate },
    });
  }

  // Dashboard stats endpoints
  async getAllVehicles(params?: { limit?: number; offset?: number }) {
    return this.requestCommand<{
      vehicles: any[];
      total: number;
      limit: number;
      offset: number;
    }>('LIST_VEHICLES', {
      body: {},
      query: { limit: params?.limit, offset: params?.offset },
    });
  }

  async getAllServices(params?: {
    status?: string;
    limit?: number;
    offset?: number;
    garage_id?: number | string;
    service_technician_id?: number | string;
    mechanic_id?: number | string;
    license_plate?: string;
    date_from?: string;
    date_to?: string;
    service_catalog_id?: number | string;
  }) {
    return this.requestCommand<{
      services: any[];
      total: number;
      limit: number;
      offset: number;
    }>('LIST_SERVICES', {
      body: {},
      query: {
        status: params?.status,
        limit: params?.limit,
        offset: params?.offset,
        garage_id: params?.garage_id,
        service_technician_id: params?.service_technician_id,
        mechanic_id: params?.mechanic_id,
        license_plate: params?.license_plate,
        date_from: params?.date_from,
        date_to: params?.date_to,
        service_catalog_id: params?.service_catalog_id,
      },
    });
  }

  async getServicesByOwner(
    ownerId: number,
    params?: {
      status?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    return this.requestCommand<{
      owner: any;
      services: any[];
      total: number;
      limit: number;
      offset: number;
    }>('GET_SERVICES_BY_OWNER', {
      body: {},
      params: { owner_id: ownerId },
      query: {
        status: params?.status,
        limit: params?.limit,
        offset: params?.offset,
      },
    });
  }

  async updateServiceRequest(id: number, payload: {
    status?: string;
    notes?: string;
    scheduled_date?: string | null;
    estimated_cost?: number | string | null;
    actual_cost?: number | string | null;
    mileage_at_service?: number | string | null;
  }) {
    return this.requestCommand<{ service: any }>('UPDATE_SERVICE', {
      body: payload,
      params: { id },
    });
  }

  async initiateServicePayment(id: number, payload: { phone: string; amount: number | string }) {
    return this.requestCommand<{
      service: any;
      collectionId: string;
      paymentStatus: string;
    }>('INIT_SERVICE_PAYMENT', {
      body: payload,
      params: { id },
    });
  }

  async checkServicePaymentStatus(id: number) {
    return this.requestCommand<{
      service: any;
      collectionId: string;
      paymentStatus: string;
      providerRef?: string;
      failReason?: string | null;
    }>('CHECK_SERVICE_PAYMENT_STATUS', {
      params: { id },
    });
  }

  async getNotifications(params?: { read?: boolean; type?: string; limit?: number; offset?: number }) {
    return this.requestCommand<{
      notifications: any[];
      total: number;
      unread: number;
    }>('LIST_NOTIFICATIONS', {
      body: {},
      query: {
        read: params?.read !== undefined ? String(params.read) : undefined,
        type: params?.type,
        limit: params?.limit,
        offset: params?.offset,
      },
    });
  }

  async markNotificationRead(id: number) {
    return this.requestCommand<{ notification: any }>('MARK_NOTIFICATION_READ', {
      body: {},
      params: { id },
    });
  }

  async markAllNotificationsRead() {
    return this.requestCommand<{ updated_count: number }>('MARK_ALL_NOTIFICATIONS_READ', {
      body: {},
    });
  }

  async deleteNotification(id: number) {
    return this.requestCommand<{ message: string }>('DELETE_NOTIFICATION', {
      body: {},
      params: { id },
    });
  }

  // Optional upload helpers (if needed)
  async uploadSingle(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.requestCommandFormData<{ file: any }>('UPLOAD_SINGLE', formData);
  }

  async uploadMultiple(files: File[]) {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return this.requestCommandFormData<{ files: any[] }>('UPLOAD_MULTIPLE', formData);
  }
}

export default new ApiService();
