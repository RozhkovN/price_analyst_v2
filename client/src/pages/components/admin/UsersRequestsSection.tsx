import { useState, useEffect, type Dispatch } from "react";
import { m } from "framer-motion";
import axios from "axios";
import Button from "../ui/Button";
import { CompanyRequests } from "./CompanyRequests";
import type { SetStateAction } from "jotai";
import type { User } from "@/types/auth.type";
import type { AdminUserRequest, CompanyGroup } from "@/types/admin.type";

// Функция для группировки запросов по компаниям
const groupRequestsByCompany = (
  requests: AdminUserRequest[],
): CompanyGroup[] => {
  const groups: { [key: string]: CompanyGroup } = {};

  requests.forEach((request) => {
    const key = `${request.inn}_${request.fullName}`;

    if (!groups[key]) {
      groups[key] = {
        fullName: request.fullName,
        inn: request.inn,
        phone: request.phone,
        requests: [],
      };
    }

    groups[key].requests.push(request);
  });

  // Сортируем запросы внутри каждой компании по дате (новые сверху)
  Object.values(groups).forEach((group) => {
    group.requests.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  });

  return Object.values(groups).sort((a, b) =>
    a.fullName.localeCompare(b.fullName),
  );
};

interface UserRequestsSectionProps {
  user: User | null;
  onMessage: Dispatch<SetStateAction<string>>;
  onMessageSuccess: Dispatch<SetStateAction<boolean | null>>;
  disabled: boolean;
}

export const UserRequestsSection = ({
  user,
  disabled,
}: UserRequestsSectionProps) => {
  const API_URL = import.meta.env.VITE_API_URL;

  const [userRequests, setUserRequests] = useState<AdminUserRequest[]>([]);
  const [companyGroups, setCompanyGroups] = useState<CompanyGroup[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // Функция для загрузки запросов пользователей
  const fetchUserRequests = async () => {
    setRequestsLoading(true);
    try {
      const response = await axios.get<AdminUserRequest[]>(
        `${API_URL}/admin/file-upload-history`,
        {
          headers: user?.accessToken
            ? {
                Authorization: `Bearer ${user.accessToken}`,
              }
            : {},
        },
      );
      setUserRequests(response.data);
    } catch (error) {
      console.error("Ошибка загрузки запросов:", error);
    } finally {
      setRequestsLoading(false);
    }
  };

  // Группируем запросы при изменении userRequests
  useEffect(() => {
    if (userRequests.length > 0) {
      setCompanyGroups(groupRequestsByCompany(userRequests));
    } else {
      setCompanyGroups([]);
    }
  }, [userRequests]);

  // Загружаем запросы при монтировании
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
            Запросы пользователей
          </h2>
          <p className="mt-1 text-blue-600">
            История всех запросов на анализ цен от пользователей
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-blue-600">
            Всего компаний: {companyGroups.length}
          </div>
          <Button
            onClick={fetchUserRequests}
            disabled={requestsLoading || disabled}
            className="flex items-center gap-2"
          >
            {requestsLoading ? (
              <svg
                className="h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : null}
            Обновить
          </Button>
        </div>
      </div>

      {requestsLoading ? (
        <div className="flex justify-center py-8">
          <div className="text-blue-600">Загрузка запросов...</div>
        </div>
      ) : companyGroups.length === 0 ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-8 text-center">
          <p className="text-blue-700">Запросы пользователей не найдены</p>
        </div>
      ) : (
        <CompanyRequests companyGroups={companyGroups} user={user} />
      )}
    </m.div>
  );
};
