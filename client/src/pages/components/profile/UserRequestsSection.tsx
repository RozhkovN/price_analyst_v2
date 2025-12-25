import { useState, useEffect } from "react";
import { m } from "framer-motion";
import axios from "axios";
import Button from "../ui/Button";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { UserRequestItem } from "./UserRequestsItem";
import { EmptyState } from "../ui/EmptyState";
import type { UserRequest } from "@/types/analysis.type";
import type { User } from "@/types/auth.type";

interface UserRequestsSectionProps {
  user: User;
  onMessage: (message: string) => void;
  onMessageSuccess: (success: boolean) => void;
  disabled?: boolean;
}

export const UserRequestsSection = ({
  user,
  onMessage,
  onMessageSuccess,
  disabled = false,
}: UserRequestsSectionProps) => {
  const API_URL = import.meta.env.VITE_API_URL;

  const [userRequests, setUserRequests] = useState<UserRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // Функция для загрузки запросов пользователя
  const fetchUserRequests = async () => {
    if (disabled) return;
    setRequestsLoading(true);
    try {
      const response = await axios.get<UserRequest[]>(
        `${API_URL}/profile/history`,
        {
          headers: {
            Authorization: `Bearer ${user?.token || ""}`,
          },
        },
      );
      setUserRequests(response.data);
      onMessage(`Загружено ${response.data.length} запросов`);
      onMessageSuccess(true);
    } catch (error: any) {
      console.error("Ошибка загрузки запросов:", error);
      if (error.response?.status === 401) {
        onMessage("Сессия истекла. Пожалуйста, войдите снова.");
        onMessageSuccess(false);
      } else {
        onMessage(
          error.response?.data?.message ||
            "Ошибка при загрузке истории запросов",
        );
        onMessageSuccess(false);
      }
    } finally {
      setRequestsLoading(false);
    }
  };

  // Загружаем запросы при монтировании компонента
  useEffect(() => {
    fetchUserRequests();
  }, []);

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="rounded-2xl border border-blue-100 bg-white p-6 shadow-lg shadow-blue-100/30"
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-blue-900">
            История запросов
          </h2>
          <p className="mt-1 text-blue-600">
            Все ваши запросы на анализ цен и их результаты
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-blue-600">
            Всего запросов: {userRequests.length}
          </div>
          <Button
            onClick={fetchUserRequests}
            disabled={requestsLoading}
            className="flex items-center gap-2"
          >
            {requestsLoading ? <LoadingSpinner size="sm" /> : null}
            Обновить
          </Button>
        </div>
      </div>

      {requestsLoading ? (
        <div className="flex justify-center py-8">
          <div className="flex items-center gap-2 text-blue-600">
            <LoadingSpinner />
            Загрузка запросов...
          </div>
        </div>
      ) : userRequests.length === 0 ? (
        <EmptyState
          title="У вас пока нет запросов"
          description="Сделайте первый запрос на анализ цен"
          action={
            <Button onClick={() => (window.location.href = "/")}>
              Сделать первый запрос
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {userRequests.map((request, index) => (
            <UserRequestItem
              key={request.id}
              request={request}
              index={index}
              user={user}
              onDownloadMessage={onMessage}
              onDownloadMessageSuccess={onMessageSuccess}
            />
          ))}
        </div>
      )}
    </m.div>
  );
};
