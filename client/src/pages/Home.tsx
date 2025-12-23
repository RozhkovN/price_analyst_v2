import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";
import { useFileUpload } from "@/hooks/useFileUpload";
import type { PriceAnalysisResult } from "@/types/analysis.type";
import Navbar from "./components/layout/Navbar";
import { HeroSection } from "./components/home/HeroSection";
import { ActionCards } from "./components/home/ActionCards";
import { StatusMessage } from "./components/ui/StatusMessage";
import { AnalysisResults } from "./components/analysis/AnalysisResults";
import { Instructions } from "./components/home/Instructions";
import LoginModal from "./components/auth/LoginModal";
import RegisterModal from "./components/auth/RegistrationModal";
// import Footer from "./components/layout/Footer";

function Home() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [downloadLoading, setDownloadLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<PriceAnalysisResult[]>(
    [],
  );
  const [showResults, setShowResults] = useState(false);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const { user } = useAuth();
  const {
    selectedFile,
    uploadMessage,
    uploadSuccess,
    setUploadMessage,
    setUploadSuccess,
    handleFileSelect,
    resetFile,
    validateAuth,
  } = useFileUpload();

  // Ref для скролла к результатам
  const resultsRef = useRef<HTMLDivElement>(null);

  const switchToRegister = () => {
    setIsLoginModalOpen(false);
    setIsRegisterModalOpen(true);
  };

  const switchToLogin = () => {
    setIsRegisterModalOpen(false);
    setIsLoginModalOpen(true);
  };

  // Функция для скролла к результатам
  const scrollToResults = () => {
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  // Автоматический скролл при появлении результатов
  useEffect(() => {
    if (showResults && analysisResults.length > 0) {
      // Небольшая задержка для гарантии рендера компонента
      setTimeout(() => {
        scrollToResults();
      }, 100);
    }
  }, [showResults, analysisResults]);

  const downloadTemplate = async () => {
    setDownloadLoading(true);
    try {
      const response = await axios.get(`${API_URL}/template/download`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();

      setUploadMessage("Шаблон успешно скачан");
      setUploadSuccess(true);
    } catch (error) {
      console.error("Ошибка загрузки:", error);
      setUploadMessage("Ошибка при скачивании шаблона");
      setUploadSuccess(false);
    } finally {
      setDownloadLoading(false);
    }
  };

  const uploadTable = async () => {
    if (!selectedFile) {
      setUploadMessage("Пожалуйста, выберите файл для загрузки");
      setUploadSuccess(false);
      return;
    }

    if (!validateAuth()) {
      setIsRegisterModalOpen(true);
      return;
    }

    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await axios.post<PriceAnalysisResult[]>(
        `${API_URL}/data/analyze-prices`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${user!.token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );
      setUploadMessage("Анализ цен завершен успешно");
      setUploadSuccess(true);

      if (response.data) {
        setAnalysisResults(response.data);
        setShowResults(true);
      }

      resetFile();
    } catch (error: any) {
      console.error("Ошибка при загрузке файла:", error);

      if (error.response?.status === 401) {
        setUploadMessage("Для анализа цен необходимо зарегистрироваться");
        setUploadSuccess(false);
        setIsRegisterModalOpen(true);
      } else {
        setUploadMessage(
          error.response?.data?.message || "Ошибка при анализе файла",
        );
        setUploadSuccess(false);
      }
      setShowResults(false);
    } finally {
      setUploadLoading(false);
    }
  };

  const exportResultsToExcel = async () => {
    if (analysisResults.length === 0) {
      setUploadMessage("Нет данных для выгрузки");
      setUploadSuccess(false);
      return;
    }

    if (!validateAuth()) {
      setIsRegisterModalOpen(true);
      return;
    }

    setExportLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/data/export-detailed-analysis`,
        analysisResults,
        {
          responseType: "blob",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user!.token}`,
          },
        },
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "analysis_results.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();

      setUploadMessage("Результаты успешно выгружены в Excel");
      setUploadSuccess(true);
    } catch (error: any) {
      console.error("Ошибка выгрузки:", error);

      if (error.response?.status === 401) {
        setUploadMessage(
          "Для выгрузки результатов необходимо зарегистрироваться",
        );
        setUploadSuccess(false);
        setIsRegisterModalOpen(true);
      } else {
        setUploadMessage("Ошибка при выгрузке результатов");
        setUploadSuccess(false);
      }
    } finally {
      setExportLoading(false);
    }
  };

  // В функции Home добавьте новую функцию для выгрузки поставщика
  const exportSupplierToExcel = async (supplierName: string) => {
    if (analysisResults.length === 0) {
      setUploadMessage("Нет данных для выгрузки");
      setUploadSuccess(false);
      return;
    }

    if (!validateAuth()) {
      setIsRegisterModalOpen(true);
      return;
    }

    try {
      // Извлекаем чистое имя поставщика из форматированного названия
      const extractSupplierName = (fullMessage: string) => {
        // Берем часть до первой запятой - это должно быть имя поставщика
        const match = fullMessage.match(/^([^,]+)/);
        return match ? match[1].trim() : fullMessage;
      };

      // Получаем чистое имя поставщика для поиска
      const cleanSupplierName = extractSupplierName(supplierName);

      // Фильтруем результаты, где supplierName содержит чистое имя поставщика
      const supplierProducts = analysisResults
        .filter((result) => {
          if (!result.supplierName) return false;
          const resultCleanName = extractSupplierName(result.supplierName);
          return resultCleanName === cleanSupplierName;
        })
        .map((result) => {
          // Функция для преобразования цены в число с точкой
          const parsePrice = (price: any): number => {
            if (price === null || price === undefined) return 0;
            if (typeof price === "number") return price;
            if (typeof price === "string") {
              const cleanedPrice = price.replace(/,/g, ".").replace(/\s/g, "");
              return parseFloat(cleanedPrice) || 0;
            }
            return 0;
          };

          return {
            barcode: result.barcode || "",
            productName: result.productName || "",
            quantity: result.quantity || 0,
            unitPrice: parsePrice(result.unitPrice),
            totalPrice: parsePrice(result.totalPrice),
          };
        });

      if (supplierProducts.length === 0) {
        setUploadMessage(`Нет данных для поставщика "${cleanSupplierName}"`);
        setUploadSuccess(false);
        return;
      }

      const response = await axios.post(
        `${API_URL}/data/export-invoice`,
        supplierProducts,
        {
          responseType: "blob",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user!.token}`,
          },
        },
      );

      const safeSupplierName = cleanSupplierName
        .replace(/[^a-zA-Z0-9а-яА-ЯёЁ\s_-]/g, "")
        .trim();
      const fileName = `товары_${safeSupplierName}.xlsx`;

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setUploadMessage(
        `Товары поставщика "${cleanSupplierName}" выгружены в Excel`,
      );
      setUploadSuccess(true);
    } catch (error: any) {
      console.error("Ошибка выгрузки поставщика:", error);

      if (error.response?.status === 401) {
        setUploadMessage("Для выгрузки необходимо зарегистрироваться");
        setUploadSuccess(false);
        setIsRegisterModalOpen(true);
      } else if (error.response?.status === 400) {
        setUploadMessage("Ошибка в формате данных для выгрузки");
        setUploadSuccess(false);
      } else {
        setUploadMessage("Ошибка при выгрузке данных поставщика");
        setUploadSuccess(false);
      }
    }
  };

  return (
    <div className="from-blue-25 min-h-screen w-screen bg-gradient-to-br to-white">
      <Navbar
        setIsLoginModalOpen={setIsLoginModalOpen}
        setIsRegisterModalOpen={setIsRegisterModalOpen}
      />

      <div className="relative z-10 pt-24 pb-20">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mx-auto max-w-6xl"
          >
            <HeroSection />

            <ActionCards
              onDownloadTemplate={downloadTemplate}
              onFileSelect={handleFileSelect}
              onAnalyze={uploadTable}
              selectedFile={selectedFile}
              downloadLoading={downloadLoading}
              uploadLoading={uploadLoading}
            />

            {uploadMessage && (
              <StatusMessage message={uploadMessage} success={uploadSuccess} />
            )}

            {/* Ref для скролла к результатам */}
            <div ref={resultsRef}>
              {showResults && analysisResults.length > 0 && (
                <AnalysisResults
                  results={analysisResults}
                  onExport={exportResultsToExcel}
                  onExportSupplier={exportSupplierToExcel}
                  exportLoading={exportLoading}
                />
              )}
            </div>

            {!showResults && <Instructions />}
          </motion.div>
        </div>

        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onSwitchToRegister={switchToRegister}
        />

        <RegisterModal
          isOpen={isRegisterModalOpen}
          onClose={() => setIsRegisterModalOpen(false)}
          onSwitchToLogin={switchToLogin}
        />
      </div>
      {/* <Footer /> */}
    </div>
  );
}

export default Home;
