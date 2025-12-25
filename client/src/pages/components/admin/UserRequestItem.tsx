import { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import axios from "axios";

import Button from "../ui/Button";
import ChevronDownIcon from "../ui/icons/ChevronDownIcon";
import ExportIcon from "../ui/icons/ExportIcon";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import type { User } from "@/types/auth.type";
import type { AdminUserRequest, FileContent } from "@/types/admin.type";

interface UserRequestItemProps {
  request: AdminUserRequest;
  requestIndex: number;
  user: User | null;
}

export const UserRequestItem = ({
  request,
  requestIndex,
  user,
}: UserRequestItemProps) => {
  const API_URL = import.meta.env.VITE_API_URL;

  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [downloadingRequest, setDownloadingRequest] = useState<string | null>(
    null,
  );

  // Функция для скачивания Excel файла запроса
  const downloadUserRequestExcel = async (request: AdminUserRequest) => {
    setDownloadingRequest(request.inn + request.timestamp);
    try {
      // Преобразуем fileContent в нужный формат для экспорта
      const exportData = (request.fileContent ?? []).map(
        (item: FileContent) => {
          // Ищем штрихкод в разных вариантах написания
          const barcode =
            item.barcode ||
            item.Штрихкод ||
            item["Штрих-код"] ||
            item.barCode ||
            item.code ||
            item.Код ||
            "";

          // Ищем количество
          const quantity =
            item.quantity ||
            item.Количество ||
            item.qty ||
            item["Кол-во"] ||
            item.count ||
            0;

          return {
            Штрихкод: String(barcode).trim(),
            Количество: Number(quantity) || 0,
          };
        },
      );

      // Фильтруем пустые записи
      const filteredData = exportData.filter(
        (item) => item.Штрихкод && item.Количество > 0,
      );

      if (filteredData.length === 0) {
        return;
      }

      const response = await axios.post(
        `${API_URL}/data/export-history-to-excel`,
        filteredData,
        {
          responseType: "blob",
          headers: {
            "Content-Type": "application/json",
            ...(user?.token && { Authorization: `Bearer ${user.token}` }),
          },
        },
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      // Создаем имя файла на основе данных пользователя и даты
      const fileName = `request_${request.fullName}_${new Date(request.timestamp).toISOString().split("T")[0]}.xlsx`;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      console.error("Ошибка скачивания:", error);
    } finally {
      setDownloadingRequest(null);
    }
  };

  // Форматирование даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const requestId = `${request.inn}_${request.timestamp}`;
  const isRequestExpanded = expandedRequest === requestId;
  const isDownloading = downloadingRequest === requestId;

  // Переключение раскрытия запроса
  const toggleRequestExpansion = (requestId: string) => {
    setExpandedRequest(expandedRequest === requestId ? null : requestId);
  };

  return (
    <m.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: requestIndex * 0.05 }}
      className="overflow-hidden rounded-lg border border-blue-200 bg-white"
    >
      {/* Заголовок запроса */}
      <div
        className="flex cursor-pointer items-center justify-between p-3 hover:bg-blue-50"
        onClick={() => toggleRequestExpansion(requestId)}
      >
        <div className="flex items-center space-x-3">
          <div
            className={`transform transition-transform ${isRequestExpanded ? "rotate-180" : ""}`}
          >
            <ChevronDownIcon />
          </div>
          <div>
            <h4 className="font-medium text-blue-900">
              Запрос от {formatDate(request.timestamp)}
            </h4>
            <p className="text-xs text-blue-600">
              Товаров: {request.fileContent?.length ?? 0}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              downloadUserRequestExcel(request);
            }}
            disabled={isDownloading}
            className="flex items-center gap-1 text-sm"
          >
            {isDownloading ? <LoadingSpinner size="sm" /> : <ExportIcon />}
            Excel
          </Button>
        </div>
      </div>

      {/* Раскрывающееся содержимое запроса */}
      <AnimatePresence>
        {isRequestExpanded && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-blue-200"
          >
            <div className="p-3">
              <div>
                <h5 className="mb-2 font-semibold text-blue-900">
                  Содержимое запроса ({request.fileContent?.length ?? 0}{" "}
                  товаров)
                </h5>
                <div className="max-h-60 overflow-y-auto rounded-lg border border-blue-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-blue-50">
                        <th className="px-3 py-2 text-left font-semibold text-blue-900">
                          Поле
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-blue-900">
                          Значение
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {request.fileContent?.map((item, itemIndex) => (
                        <>
                          {Object.entries(item).map(([key, value]) => (
                            <tr
                              key={key}
                              className="border-b border-blue-100 last:border-b-0"
                            >
                              <td className="px-3 py-2 font-medium text-blue-900">
                                {key}
                              </td>
                              <td className="px-3 py-2 text-blue-700">
                                {typeof value === "object"
                                  ? JSON.stringify(value)
                                  : String(value)}
                              </td>
                            </tr>
                          ))}
                          {itemIndex <
                            (request.fileContent?.length ?? 0) - 1 && (
                            <tr>
                              <td
                                colSpan={2}
                                className="border-b border-blue-300"
                              ></td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
};
