import { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import ChevronDownIcon from "../ui/icons/ChevronDownIcon";
import type { User } from "@/types/auth.type";
import { UserRequestItem } from "./UserRequestItem";
import type { CompanyGroup } from "@/types/admin.type";

interface CompanyRequestsProps {
  companyGroups: CompanyGroup[];
  user: User | null;
}

export const CompanyRequests = ({
  companyGroups,
  user,
}: CompanyRequestsProps) => {
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);

  // Переключение раскрытия компании
  const toggleCompanyExpansion = (companyId: string) => {
    setExpandedCompany(expandedCompany === companyId ? null : companyId);
  };

  return (
    <div className="space-y-4">
      {companyGroups.map((company, companyIndex) => {
        const companyId = `${company.inn}_${company.fullName}`;
        const isCompanyExpanded = expandedCompany === companyId;

        return (
          <m.div
            key={companyId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: companyIndex * 0.1 }}
            className="overflow-hidden rounded-lg border border-blue-200 bg-white"
          >
            {/* Заголовок компании */}
            <div
              className="flex cursor-pointer items-center justify-between p-4 hover:bg-blue-50"
              onClick={() => toggleCompanyExpansion(companyId)}
            >
              <div className="flex items-center space-x-4">
                <div
                  className={`transform transition-transform ${isCompanyExpanded ? "rotate-180" : ""}`}
                >
                  <ChevronDownIcon />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">
                    {company.fullName}
                  </h3>
                  <p className="text-sm text-blue-600">
                    ИНН: {company.inn} • Телефон: {company.phone} • Запросов:{" "}
                    {company.requests.length}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-blue-600">
                  {company.requests.length} запросов
                </span>
              </div>
            </div>

            {/* Раскрывающееся содержимое компании */}
            <AnimatePresence>
              {isCompanyExpanded && (
                <m.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="border-t border-blue-200 bg-blue-50"
                >
                  <div className="p-4">
                    <div className="space-y-3">
                      {company.requests.map((request, requestIndex) => (
                        <UserRequestItem
                          key={`${request.inn}_${request.timestamp}`}
                          request={request}
                          requestIndex={requestIndex}
                          user={user}
                        />
                      ))}
                    </div>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </m.div>
        );
      })}
    </div>
  );
};
