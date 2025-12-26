export interface User {
  accessToken: string;
  refreshToken: string;
  role: "USER" | "ADMIN";
  email?: string;
  tokenExpiresIn: number; // ms
}

export interface LoginFormData {
  phone: string;
  password: string;
}

export interface RegisterFormData {
  inn: string;
  fullName: string;
  email: string;
  address: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  role: "USER" | "ADMIN";
  expiresIn: number; // ms
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number; // ms
}

export interface RefreshTokenRequest {
  refreshToken: string;
}
