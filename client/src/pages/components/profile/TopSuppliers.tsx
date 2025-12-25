import type { SupplierInfo, UserRequest } from "@/types/analysis.type";
import { m } from "framer-motion";

// Функция для парсинга информации о поставщике из строки
const parseSupplierInfo = (
  supplierString: string | null,
): SupplierInfo | null => {
  if (!supplierString) return null;

  try {
    const parts = supplierString.split(",").map((part) => part.trim());

    if (parts.length >= 3) {
      return {
        name: parts[0],
        inn: parts[1],
        address: parts.slice(2, -2).join(", "),
        phone: parts[parts.length - 2] || "",
        email: parts[parts.length - 1] || "",
      };
    }

    return {
      name: supplierString,
      inn: "",
      address: "",
      phone: "",
      email: "",
    };
  } catch (error) {
    console.error("Ошибка парсинга информации о поставщике:", error);
    return {
      name: supplierString,
      inn: "",
      address: "",
      phone: "",
      email: "",
    };
  }
};

interface TopSuppliersProps {
  request: UserRequest;
}

// Форматирование цены
const formatPrice = (price: number | null) => {
  if (price === null) return "-";
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

export const TopSuppliers = ({ request }: TopSuppliersProps) => {
  // Получение топ-3 поставщиков с полной информацией
  const getTopSuppliersWithInfo = (request: UserRequest) => {
    const supplierMap = new Map<
      string,
      { count: number; info: SupplierInfo | null }
    >();

    request.responseDetails.forEach((item) => {
      if (item.supplierName && !item.requiresManualProcessing) {
        const supplierInfo = parseSupplierInfo(item.supplierName);
        const supplierKey = supplierInfo
          ? supplierInfo.name
          : item.supplierName;

        if (supplierMap.has(supplierKey)) {
          supplierMap.get(supplierKey)!.count += 1;
        } else {
          supplierMap.set(supplierKey, {
            count: 1,
            info: supplierInfo,
          });
        }
      }
    });

    const sortedSuppliers = Array.from(supplierMap.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 3);

    return sortedSuppliers;
  };

  // Получение общей стоимости по поставщику
  const getSupplierTotalPrice = (
    request: UserRequest,
    supplierName: string,
  ) => {
    return request.responseDetails
      .filter((item) => {
        const supplierInfo = parseSupplierInfo(item.supplierName);
        const itemSupplierName = supplierInfo
          ? supplierInfo.name
          : item.supplierName;
        return (
          itemSupplierName === supplierName && !item.requiresManualProcessing
        );
      })
      .reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  };

  const topSuppliers = getTopSuppliersWithInfo(request);

  if (topSuppliers.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <h4 className="mb-4 text-lg font-semibold text-blue-900">
        Наиболее подходящие поставщики:
      </h4>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {topSuppliers.map(([supplierName, { count, info }], supplierIndex) => {
          const supplierTotalPrice = getSupplierTotalPrice(
            request,
            supplierName,
          );
          return (
            <m.div
              key={supplierName}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: supplierIndex * 0.1,
              }}
              className="rounded-lg border border-blue-200 bg-white p-4"
            >
              <div className="mb-3 text-center">
                <div className="text-2xl font-bold text-blue-900">
                  #{supplierIndex + 1}
                </div>
                <div className="text-lg font-semibold text-blue-800">
                  {supplierName}
                </div>
                <div className="text-sm text-blue-600">
                  {count} товар
                  {count === 1 ? "" : count > 1 && count < 5 ? "а" : "ов"}
                </div>
                {supplierTotalPrice > 0 && (
                  <div className="mt-1 text-lg font-semibold text-green-700">
                    {formatPrice(supplierTotalPrice)} ₽
                  </div>
                )}
              </div>

              {/* Детальная информация о поставщике */}
              {info && (
                <div className="border-t border-blue-200 pt-3 text-sm">
                  {info.inn && (
                    <div className="mb-1">
                      <span className="font-semibold">ИНН:</span> {info.inn}
                    </div>
                  )}
                  {info.address && (
                    <div className="mb-1">
                      <span className="font-semibold">Адрес:</span>{" "}
                      <span className="break-words">{info.address}</span>
                    </div>
                  )}
                  {info.phone && (
                    <div className="mb-1">
                      <span className="font-semibold">Телефон:</span>{" "}
                      {info.phone}
                    </div>
                  )}
                  {info.email && (
                    <div className="mb-1">
                      <span className="font-semibold">Почта/доп. тел.:</span>{" "}
                      <a
                        href={`mailto:${info.email}`}
                        className="break-all text-blue-600 hover:text-blue-800"
                      >
                        {info.email}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </m.div>
          );
        })}
      </div>
    </div>
  );
};
