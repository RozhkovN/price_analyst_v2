export interface User {
  token?: string;
  role?: "USER" | "ADMIN";
  email?: string;
}

export interface LoginFormData {
  phone: string;
  password: string;
}

export interface RegisterFormData {
  inn: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  token: string;
  role: "USER" | "ADMIN";
}
