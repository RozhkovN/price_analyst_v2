import { m } from "framer-motion";
import Button from "../ui/Button";
import ExportIcon from "../ui/icons/ExportIcon";
import type { PriceAnalysisResult } from "@/types/analysis.type";
import { useAnalysis } from "@/hooks/useAnalysis";
import { SupplierCard } from "./SupplierCard";
import { ProductTable } from "./ProductTable";
import { StatsCards } from "./StatsCards";
import { useState } from "react";

interface AnalysisResultsProps {
  results: PriceAnalysisResult[];
  onExport: () => void;
  onExportSupplier: (supplierName: string) => Promise<void>;
  exportLoading: boolean;
  disabled?: boolean;
}

export const AnalysisResults = ({
  results,
  onExport,
  onExportSupplier,
  exportLoading,
  disabled = false,
}: AnalysisResultsProps) => {
  const {
    supplierGroups,
    manualProcessingProducts,
    stats,
    topSuppliers,
    getSupplierTotalPrice,
  } = useAnalysis(results);

  const [currentExportingSupplier, setCurrentExportingSupplier] = useState<
    string | null
  >(null);

  const handleExportSupplier = async (supplierName: string) => {
    setCurrentExportingSupplier(supplierName);
    try {
      await onExportSupplier(supplierName);
    } finally {
      setCurrentExportingSupplier(null);
    }
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="mt-8 rounded-2xl border border-blue-100 bg-white p-6 shadow-lg shadow-blue-100/30"
    >
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-3xl font-semibold text-blue-900">
          Результаты анализа
        </h3>
        <Button
          onClick={onExport}
          disabled={exportLoading || disabled}
          className="flex items-center gap-2"
        >
          {exportLoading ? (
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
              Выгрузка...
            </span>
          ) : (
            <span className="flex items-center">
              <ExportIcon />
              <span>Выгрузить все в Excel</span>
            </span>
          )}
        </Button>
      </div>

      {/* Топ поставщиков */}
      {topSuppliers.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-4 text-lg font-semibold text-blue-900">
            Наиболее подходящие поставщики:
          </h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {topSuppliers.map(([supplierName, { count, info }], index) => (
              <SupplierCard
                key={supplierName}
                supplierName={supplierName}
                info={info}
                productCount={count}
                totalPrice={getSupplierTotalPrice(supplierName)}
                rank={index + 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* Товары по поставщикам */}
      {topSuppliers.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-4 text-lg font-semibold text-blue-900">
            Товары по поставщикам:
          </h4>
          {topSuppliers.map(([supplierName], index) => {
            const supplierGroup = supplierGroups.find(
              (group) => group.supplierName === supplierName,
            );

            if (!supplierGroup) return null;

            return (
              <ProductTable
                key={supplierName}
                supplierGroup={supplierGroup}
                index={index}
                onExportSupplier={handleExportSupplier}
                exportLoading={exportLoading}
                currentExportingSupplier={currentExportingSupplier}
              />
            );
          })}
        </div>
      )}

      {/* Товары для ручной обработки */}
      {manualProcessingProducts.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-4 text-lg font-semibold text-amber-900">
            Товары, требующие ручной обработки:
          </h4>
          <div className="rounded-lg border border-amber-200 bg-amber-50">
            <div className="relative">
              <div
                className={`overflow-x-auto ${manualProcessingProducts.length > 8 ? "max-h-96 overflow-y-auto" : ""}`}
              >
                <table className="text-md w-full">
                  <thead className="sticky top-0 z-10 bg-amber-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-amber-900">
                        Штрихкод
                      </th>
                      <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-amber-900">
                        Наименование
                      </th>
                      <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-amber-900">
                        Кол-во
                      </th>
                      <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-amber-900">
                        Сообщение
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualProcessingProducts.map((product, index) => (
                      <tr
                        key={`not-found-${product.barcode}-${index}`}
                        className="border-b border-amber-200 hover:bg-amber-100"
                      >
                        <td className="px-3 py-2 font-mono whitespace-nowrap text-amber-900">
                          {product.barcode}
                        </td>
                        <td className="px-3 py-2 text-amber-700">
                          {product.productName || "Не найдено"}
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap text-amber-700">
                          {product.quantity}
                        </td>
                        <td className="px-3 py-2 text-amber-700">
                          {product.message || "Требуется ручная обработка"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Статистика */}
      <StatsCards stats={stats} />
    </m.div>
  );
};
