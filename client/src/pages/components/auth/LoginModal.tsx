import { useState } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";
import type { LoginFormData, AuthResponse } from "@/types/auth.type";
import { validatePhone, validatePassword } from "@/utils/validators";
import { Modal } from "../ui/Modal";
import Button from "../ui/Button";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

export const LoginModal = ({
  isOpen,
  onClose,
  onSwitchToRegister,
}: LoginModalProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>();

  const API_URL = import.meta.env.VITE_API_URL;

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.post<AuthResponse>(`${API_URL}/auth/login`, data);
      const { accessToken, refreshToken, role, expiresIn } = response.data;

      login({
        accessToken,
        refreshToken,
        role,
        tokenExpiresIn: expiresIn,
      });
      handleClose();
    } catch (error: any) {
      setError(error.response?.data?.message || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setError("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 text-blue-400 hover:text-blue-600"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-blue-900">Вход в систему</h2>
        <p className="mt-2 text-blue-600">Введите данные для входа</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label
            htmlFor="phone"
            className="mb-2 block text-sm font-medium text-blue-700"
          >
            Телефон *
          </label>
          <input
            id="phone"
            type="tel"
            {...register("phone", {
              required: "Телефон обязателен для заполнения",
              validate: validatePhone,
            })}
            placeholder="+7 (XXX) XXX-XX-XX"
            className={`bg-blue-25 w-full rounded-lg border px-4 py-3 text-blue-900 placeholder-blue-400 focus:ring-2 focus:outline-none ${
              errors.phone
                ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                : "border-blue-200 focus:border-blue-500 focus:ring-blue-500/20"
            }`}
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium text-blue-700"
          >
            Пароль *
          </label>
          <input
            id="password"
            type="password"
            {...register("password", {
              required: "Пароль обязателен для заполнения",
              validate: validatePassword,
            })}
            placeholder="Введите пароль"
            className={`bg-blue-25 w-full rounded-lg border px-4 py-3 text-blue-900 placeholder-blue-400 focus:ring-2 focus:outline-none ${
              errors.password
                ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                : "border-blue-200 focus:border-blue-500 focus:ring-blue-500/20"
            }`}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">
              {errors.password.message}
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <Button disabled={loading} className="w-full">
          {loading ? "Вход..." : "Войти"}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={onSwitchToRegister}
          className="text-blue-600 hover:text-blue-800 hover:underline"
          type="button"
        >
          Нет аккаунта? Зарегистрироваться
        </button>
      </div>
    </Modal>
  );
};

export default LoginModal;
