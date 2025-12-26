import { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import axios from "axios";
import Button from "../ui/Button";
import ChevronDownIcon from "../ui/icons/ChevronDownIcon";
import ExportIcon from "../ui/icons/ExportIcon";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { RequestStats } from "./RequestStats";
import { RequestDetails } from "./RequestDetails";
import type { User } from "@/types/auth.type";
import type { UserRequest } from "@/types/analysis.type";

interface UserRequestItemProps {
  request: UserRequest;
  index: number;
  user: User;
  onDownloadMessage: (message: string) => void;
  onDownloadMessageSuccess: (success: boolean) => void;
}

export const UserRequestItem = ({
  request,
  index,
  user,
  onDownloadMessage,
  onDownloadMessageSuccess,
}: UserRequestItemProps) => {
  const API_URL = import.meta.env.VITE_API_URL;

  const [expandedRequest, setExpandedRequest] = useState<number | null>(null);
  const [downloadingRequest, setDownloadingRequest] = useState<number | null>(
    null,
  );

  // Функция для скачивания Excel файла запроса
  const downloadRequestExcel = async (request: UserRequest) => {
    if (!user?.accessToken) {
      onDownloadMessage("Ошибка авторизации");
      onDownloadMessageSuccess(false);
      return;
    }

    setDownloadingRequest(request.id);
    try {
      // Преобразуем responseDetails в правильный формат для экспорта
      const exportData = request.responseDetails.map((item) => ({
        barcode: item.barcode,
        quantity: item.quantity,
        productName: item.productName || "",
        supplierName: item.supplierName || "",
        unitPrice: item.unitPrice || 0,
        totalPrice: item.totalPrice || 0,
        requiresManualProcessing: item.requiresManualProcessing,
        message: item.message,
      }));

      const response = await axios.post(
        `${API_URL}/data/export-detailed-analysis`,
        exportData,
        {
          responseType: "blob",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.accessToken}`,
          },
        },
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      const fileName = `запрос_${new Date(request.timestamp).toISOString().split("T")[0]}.xlsx`;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();

      onDownloadMessage(
        `Файл запроса от ${formatDate(request.timestamp)} успешно скачан`,
      );
      onDownloadMessageSuccess(true);
    } catch (error: any) {
      console.error("Ошибка скачивания:", error);

      if (error.response?.status === 400) {
        onDownloadMessage("Неверный формат данных для экспорта");
      } else if (error.response?.status === 401) {
        onDownloadMessage("Ошибка авторизации");
      } else if (error.response?.status === 500) {
        onDownloadMessage("Ошибка сервера при создании файла");
      } else {
        onDownloadMessage("Ошибка при скачивании файла запроса");
      }
      onDownloadMessageSuccess(false);
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

  const isExpanded = expandedRequest === request.id;
  const isDownloading = downloadingRequest === request.id;

  // Переключение раскрытия запроса
  const toggleRequestExpansion = (requestId: number) => {
    setExpandedRequest(expandedRequest === requestId ? null : requestId);
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="overflow-hidden rounded-lg border border-blue-200 bg-white"
    >
      {/* Заголовок запроса */}
      <div
        className="flex cursor-pointer items-center justify-between p-4 hover:bg-blue-50"
        onClick={() => toggleRequestExpansion(request.id)}
      >
        <div className="flex items-center space-x-4">
          <div
            className={`transform transition-transform ${isExpanded ? "rotate-180" : ""}`}
          >
            <ChevronDownIcon />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900">
              {request.requestDetails}
            </h3>
            <p className="text-sm text-blue-600">
              {formatDate(request.timestamp)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {/* Статистика для десктопа */}
          <div className="hidden items-center space-x-3 text-sm sm:flex">
            <RequestStats request={request} />
          </div>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              downloadRequestExcel(request);
            }}
            disabled={isDownloading}
            className="flex items-center gap-2"
          >
            {isDownloading ? <LoadingSpinner size="sm" /> : <ExportIcon />}
            Excel
          </Button>
        </div>
      </div>

      {/* Мобильная статистика */}
      <div className="border-t border-blue-200 px-4 py-2 sm:hidden">
        <RequestStats request={request} mobile />
      </div>

      {/* Раскрывающееся содержимое */}
      <AnimatePresence>
        {isExpanded && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-blue-200"
          >
            <RequestDetails request={request} />
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
};
