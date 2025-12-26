import { useState } from "react";
import { m } from "framer-motion";
import axios from "axios";
import Button from "../ui/Button";
import FileIcon from "../ui/icons/FileIcon";
import DownloadIcon from "../ui/icons/DownloadIcon";
import type { User } from "@/types/auth.type";
import type { UploadResponse } from "@/types/admin.type";

interface SuppliersUploadSectionProps {
  user: User | null;
  onUploadResponse: (response: UploadResponse) => void;
  onUploadMessage: (message: string) => void;
  onUploadSuccess: (success: boolean) => void;
}

export const SuppliersUploadSection = ({
  user,
  onUploadResponse,
  onUploadMessage,
  onUploadSuccess,
}: SuppliersUploadSectionProps) => {
  const API_URL = import.meta.env.VITE_API_URL;

  const [uploadLoading, setUploadLoading] = useState(false);
  const [downloadTemplateLoading, setDownloadTemplateLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Загрузка шаблона таблицы поставщиков
  const downloadSuppliersTemplate = async () => {
    setDownloadTemplateLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/template/download-supplier`,
        {
          responseType: "blob",
        },
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "suppliers_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();

      onUploadMessage("Шаблон таблицы поставщиков успешно скачан");
      onUploadSuccess(true);
    } catch (error) {
      console.error("Ошибка загрузки шаблона:", error);
      onUploadMessage("Ошибка при скачивании шаблона");
      onUploadSuccess(false);
    } finally {
      setDownloadTemplateLoading(false);
    }
  };

  // Загрузка данных поставщиков
  const uploadSuppliersData = async () => {
    if (!selectedFile) {
      onUploadMessage("Пожалуйста, выберите файл для загрузки");
      onUploadSuccess(false);
      return;
    }

    setUploadLoading(true);
    onUploadResponse(null as any);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await axios.post<UploadResponse>(
        `${API_URL}/data/upload-supplier-data`,
        formData,
        {
          headers: {
            ...(user?.accessToken && { Authorization: `Bearer ${user.accessToken}` }),
            "Content-Type": "multipart/form-data",
          },
        },
      );

      onUploadResponse(response.data);

      if (response.data.success) {
        onUploadMessage("Данные поставщиков успешно загружены");
        onUploadSuccess(true);
      } else {
        onUploadMessage("При загрузке данных возникли ошибки");
        onUploadSuccess(false);
      }

      setSelectedFile(null);

      const fileInput = document.getElementById(
        "suppliers-file-upload",
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error: any) {
      console.error("Ошибка при загрузке файла:", error);
      onUploadMessage(
        error.response?.data?.message ||
          "Ошибка при загрузке данных поставщиков",
      );
      onUploadSuccess(false);
    } finally {
      setUploadLoading(false);
    }
  };

  // Обработчик выбора файла
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    onUploadMessage("");
    onUploadSuccess(false);
    onUploadResponse(null as any);
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="mb-8 rounded-2xl border border-blue-100 bg-white p-8 shadow-lg shadow-blue-100/30"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-blue-900">
          Загрузка данных поставщиков
        </h2>
        <p className="mt-2 text-blue-700">
          Загрузите Excel файл с данными поставщиков для обновления базы данных
        </p>
      </div>

      {/* Кнопка скачивания шаблона */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-blue-900">
              Шаблон таблицы
            </h3>
            <p className="text-sm text-blue-600">
              Скачайте готовый шаблон для заполнения
            </p>
          </div>
          <Button
            onClick={downloadSuppliersTemplate}
            disabled={downloadTemplateLoading}
            className="flex items-center gap-2"
          >
            {downloadTemplateLoading ? (
              <span className="flex items-center">
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
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
                Скачивание...
              </span>
            ) : (
              <span className="flex items-center">
                <DownloadIcon />
                <span>Скачать шаблон</span>
              </span>
            )}
          </Button>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="mb-2 font-semibold text-blue-900">
          Требования к файлу:
        </h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-blue-700">
          <li>Формат: Excel (.xlsx, .xls)</li>
          <li>
            Должен содержать колонки: штрих-код, наименование товара, поставщик,
            цена
          </li>
          <li>Первая строка должна содержать заголовки колонок</li>
          <li>Данные должны быть корректно отформатированы</li>
        </ul>
      </div>

      <div className="mb-4">
        <label
          htmlFor="suppliers-file-upload"
          className="mb-3 flex items-center text-sm font-medium text-blue-700"
        >
          <FileIcon />
          <span className="ml-2">Выберите файл с данными поставщиков:</span>
        </label>
        <input
          id="suppliers-file-upload"
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          className="block w-full text-sm text-blue-700 transition-colors file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-3 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
        />
      </div>

      {selectedFile && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3"
        >
          <p className="flex items-center text-sm text-blue-700">
            <FileIcon />
            <span className="ml-2">
              Выбран файл: <strong>{selectedFile.name}</strong>
            </span>
          </p>
        </m.div>
      )}

      <Button
        onClick={uploadSuppliersData}
        disabled={uploadLoading || !selectedFile}
        className="w-full"
      >
        {uploadLoading ? (
          <span className="flex items-center justify-center">
            <svg
              className="mr-2 h-4 w-4 animate-spin"
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
            Загрузка...
          </span>
        ) : (
          <span className="flex items-center justify-center">
            <FileIcon />
            <span className="ml-2">Загрузить данные поставщиков</span>
          </span>
        )}
      </Button>
    </m.div>
  );
};
