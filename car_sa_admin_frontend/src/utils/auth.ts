export const AUTH_TOKEN_KEY = 'auth_token';
export const USER_KEY = 'user';

export interface User {
  id: number;
  role: string;
  email?: string;
  name?: string;
}

export const authUtils = {
  normalizeRole(role?: string): string {
    if (!role) return '';
    return role.trim().toLowerCase().replace(/[\s-]+/g, '_');
  },

  decodeTokenUser(): User | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) return null;
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const jsonPayload = decodeURIComponent(
        atob(paddedBase64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const decoded = JSON.parse(jsonPayload);
      if (!decoded?.id || !decoded?.role) return null;
      return {
        id: decoded.id,
        role: this.normalizeRole(decoded.role),
        email: decoded.email,
        name: decoded.name,
      };
    } catch {
      return null;
    }
  },

  setToken(token: string): void {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  },

  getToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  removeToken(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  setUser(user: User): void {
    const normalizedUser = {
      ...user,
      role: this.normalizeRole(user.role),
    };
    localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
  },

  getUser(): User | null {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) {
      const tokenUser = this.decodeTokenUser();
      if (tokenUser) {
        this.setUser(tokenUser);
      }
      return tokenUser;
    }
    try {
      const parsed = JSON.parse(userStr);
      const normalizedUser = {
        ...parsed,
        role: this.normalizeRole(parsed?.role),
      };
      localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
      return normalizedUser;
    } catch {
      const tokenUser = this.decodeTokenUser();
      if (tokenUser) {
        this.setUser(tokenUser);
      }
      return tokenUser;
    }
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  isAdmin(): boolean {
    const user = this.getUser();
    const role = this.normalizeRole(user?.role);
    return role === 'super_admin' || role === 'garage_admin';
  },
};
