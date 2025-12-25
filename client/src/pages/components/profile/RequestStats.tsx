import type { UserRequest } from "@/types/analysis.type";

interface RequestStatsProps {
  request: UserRequest;
  mobile?: boolean;
}

// Форматирование цены
const formatPrice = (price: number | null) => {
  if (price === null) return "-";
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

export const RequestStats = ({
  request,
  mobile = false,
}: RequestStatsProps) => {
  // Статистика по запросу
  const getRequestStats = (request: UserRequest) => {
    const totalItems = request.responseDetails.length;
    const foundItems = request.responseDetails.filter(
      (item) => !item.requiresManualProcessing,
    ).length;
    const manualItems = request.responseDetails.filter(
      (item) => item.requiresManualProcessing,
    ).length;
    const totalPrice = request.responseDetails
      .filter((item) => item.totalPrice)
      .reduce((sum, item) => sum + (item.totalPrice || 0), 0);

    return { totalItems, foundItems, manualItems, totalPrice };
  };

  const stats = getRequestStats(request);

  if (mobile) {
    return (
      <div className="text-sm">
        <div className="flex justify-between">
          <div className="text-green-600">Найдено: {stats.foundItems}</div>
          <div className="text-amber-600">Обработка: {stats.manualItems}</div>
          <div className="text-blue-600">Всего: {stats.totalItems}</div>
        </div>
        {stats.totalPrice > 0 && (
          <div className="mt-1 text-center font-semibold text-green-700">
            Общая сумма: {formatPrice(stats.totalPrice)} ₽
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="text-green-600">Найдено: {stats.foundItems}</div>
      <div className="text-amber-600">Обработка: {stats.manualItems}</div>
      <div className="text-blue-600">Всего: {stats.totalItems}</div>
      {stats.totalPrice > 0 && (
        <div className="font-semibold text-green-700">
          Сумма: {formatPrice(stats.totalPrice)} ₽
        </div>
      )}
    </>
  );
};
