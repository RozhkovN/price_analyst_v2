import type { UploadResponse } from "@/types/admin.type";
import { m } from "framer-motion";

interface UploadStatsProps {
  uploadResponse: UploadResponse;
}

// Функция для парсинга статистики из сообщения
const parseStatsFromMessage = (message: string) => {
  const stats = {
    added: 0,
    updated: 0,
    unchanged: 0,
    skippedDuplicates: 0,
    errors: 0,
    time: "0 мс",
  };

  try {
    const addedMatch = message.match(/Добавлено:\s*(\d+)/);
    const updatedMatch = message.match(/обновлено:\s*(\d+)/);
    const unchangedMatch = message.match(/без изменений:\s*(\d+)/);
    const skippedMatch = message.match(/пропущено дубликатов:\s*(\d+)/);
    const errorsMatch = message.match(/ошибок:\s*(\d+)/);
    const timeMatch = message.match(/Время:\s*([^]+)$/);

    if (addedMatch) stats.added = parseInt(addedMatch[1]);
    if (updatedMatch) stats.updated = parseInt(updatedMatch[1]);
    if (unchangedMatch) stats.unchanged = parseInt(unchangedMatch[1]);
    if (skippedMatch) stats.skippedDuplicates = parseInt(skippedMatch[1]);
    if (errorsMatch) stats.errors = parseInt(errorsMatch[1]);
    if (timeMatch) stats.time = timeMatch[1].trim();
  } catch (error) {
    console.error("Ошибка парсинга сообщения:", error);
  }

  return stats;
};

export const UploadStats = ({ uploadResponse }: UploadStatsProps) => {
  const stats = parseStatsFromMessage(uploadResponse.message);

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="mb-8 rounded-2xl border border-blue-100 bg-white p-6 shadow-lg shadow-blue-100/30"
    >
      <h3 className="mb-4 text-xl font-semibold text-blue-900">
        Результат обработки
      </h3>

      {/* Основная статистика */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="rounded-lg bg-green-100 p-4 text-center text-green-800">
          <div className="text-2xl font-bold">{stats.added}</div>
          <div className="text-sm">Добавлено</div>
        </div>
        <div className="rounded-lg bg-blue-100 p-4 text-center text-blue-800">
          <div className="text-2xl font-bold">{stats.updated}</div>
          <div className="text-sm">Обновлено</div>
        </div>
        <div className="rounded-lg bg-gray-100 p-4 text-center text-gray-800">
          <div className="text-2xl font-bold">{stats.unchanged}</div>
          <div className="text-sm">Без изменений</div>
        </div>
        <div className="rounded-lg bg-amber-100 p-4 text-center text-amber-800">
          <div className="text-2xl font-bold">{stats.skippedDuplicates}</div>
          <div className="text-sm">Пропущено дубликатов</div>
        </div>
        <div
          className={`rounded-lg p-4 text-center ${
            stats.errors > 0
              ? "bg-red-100 text-red-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          <div className="text-2xl font-bold">{stats.errors}</div>
          <div className="text-sm">Ошибок</div>
        </div>
      </div>
    </m.div>
  );
};
