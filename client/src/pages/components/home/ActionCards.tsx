import { m } from "framer-motion";
import Button from "../ui/Button";
import DownloadIcon from "../ui/icons/DownloadIcon";
import AnalysisIcon from "../ui/icons/AnalysisIcon";
import FileIcon from "../ui/icons/FileIcon";

interface ActionCardsProps {
  onDownloadTemplate: () => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAnalyze: () => void;
  selectedFile: File | null;
  downloadLoading: boolean;
  uploadLoading: boolean;
  disabled?: boolean;
}

export const ActionCards = ({
  onDownloadTemplate,
  onFileSelect,
  onAnalyze,
  selectedFile,
  downloadLoading,
  uploadLoading,
  disabled = false,
}: ActionCardsProps) => {
  return (
    <div className="mb-16 grid grid-cols-1 gap-8 lg:grid-cols-2">
      {/* Карточка скачивания шаблона */}
      <m.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="group relative rounded-2xl border border-blue-100 bg-white p-8 shadow-lg shadow-blue-100/30 transition-all duration-300 hover:shadow-xl hover:shadow-blue-100/50"
      >
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg transition-transform duration-300 group-hover:scale-110">
          <DownloadIcon />
        </div>
        <h3 className="mb-4 text-2xl font-semibold text-blue-900">
          Скачать шаблон
        </h3>
        <p className="mb-6 leading-relaxed text-blue-700">
          Получите готовый шаблон Excel таблицы для заполнения данными о
          товарах.
        </p>
        <Button
          onClick={onDownloadTemplate}
          disabled={downloadLoading || disabled}
          className="w-full"
        >
          {downloadLoading ? (
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
              Скачивание...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <DownloadIcon />
              <span className="ml-2">Скачать шаблон</span>
            </span>
          )}
        </Button>
      </m.div>

      {/* Карточка загрузки таблицы */}
      <m.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="group relative rounded-2xl border border-blue-100 bg-white p-8 shadow-lg shadow-blue-100/30 transition-all duration-300 hover:shadow-xl hover:shadow-blue-100/50"
      >
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-lg transition-transform duration-300 group-hover:scale-110">
          <AnalysisIcon />
        </div>
        <h3 className="mb-4 text-2xl font-semibold text-blue-900">
          Анализ цен
        </h3>
        <p className="mb-6 leading-relaxed text-blue-700">
          Загрузите заполненную таблицу для автоматического анализа.
        </p>

        <div className="mb-4">
          <label
            htmlFor="file-upload"
            className="text-md mb-3 flex items-center font-medium text-blue-700"
          >
            <FileIcon />
            <span className="ml-2">Выберите файл для анализа:</span>
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={onFileSelect}
            className="text-md file:text-md block w-full text-blue-700 transition-colors file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-3 file:font-medium file:text-white hover:file:bg-blue-700"
          />
        </div>

        {selectedFile && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3"
          >
            <p className="text-md flex items-center text-blue-700">
              <FileIcon />
              <span className="ml-2">
                Выбран файл: <strong>{selectedFile.name}</strong>
              </span>
            </p>
          </m.div>
        )}

        <Button
          onClick={onAnalyze}
          disabled={uploadLoading || !selectedFile || disabled}
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
              Анализ...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <AnalysisIcon />
              <span className="ml-2">Проанализировать цены</span>
            </span>
          )}
        </Button>
      </m.div>
    </div>
  );
};
