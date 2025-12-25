import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import type { PriceAnalysisResult } from "@/types/analysis.type";
import Navbar from "./components/layout/Navbar";
import { HeroSection } from "./components/home/HeroSection";
import { ActionCards } from "./components/home/ActionCards";
import { StatusMessage } from "./components/ui/StatusMessage";
import { AnalysisResults } from "./components/analysis/AnalysisResults";
import { Instructions } from "./components/home/Instructions";
import LoginModal from "./components/auth/LoginModal";
import RegisterModal from "./components/auth/RegistrationModal";
import Footer from "./components/layout/Footer";
import ContactFloatButton from "./components/ui/ContactFloatButton";
import { SubscriptionExpiredNotice } from "./components/subscription/SubscriptionExpiredNotice";

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

  const { isExpired, isChecking: checkingSubscription } =
    useSubscriptionStatus();

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

  const scrollToResults = () => {
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  useEffect(() => {
    if (showResults && analysisResults.length > 0) {
      // Небольшая задержка для гарантии рендера компонента
      setTimeout(() => {
        scrollToResults();
      }, 100);
    }
  }, [showResults, analysisResults]);

  const downloadTemplate = async () => {
    if (isExpired) return;
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
      setUploadMessage("Ошибка при скачивании шаблона");
      setUploadSuccess(false);
    } finally {
      setDownloadLoading(false);
    }
  };

  const uploadTable = async () => {
    if (isExpired) return;
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
      setUploadMessage(
        error.response?.data?.message || "Ошибка при анализе файла",
      );
      setUploadSuccess(false);
      setShowResults(false);
    } finally {
      setUploadLoading(false);
    }
  };

  if (checkingSubscription) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Проверка подписки...</div>
      </div>
    );
  }

  async function exportResultsToExcel(): Promise<void> {
    if (isExpired || analysisResults.length === 0) return;
    setExportLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/data/export-results`,
        { results: analysisResults },
        {
          responseType: "blob",
          headers: {
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
    } catch (error) {
      setUploadMessage("Ошибка при экспорте результатов");
      setUploadSuccess(false);
    } finally {
      setExportLoading(false);
    }
  }
  async function exportSupplierToExcel(supplierName: string): Promise<void> {
    if (isExpired || analysisResults.length === 0) return;
    setExportLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/data/export-supplier-results`,
        { supplierName, results: analysisResults },
        {
          responseType: "blob",
          headers: {
            Authorization: `Bearer ${user!.token}`,
          },
        },
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `supplier_${supplierName}_results.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setUploadMessage("Ошибка при экспорте результатов поставщика");
      setUploadSuccess(false);
    } finally {
      setExportLoading(false);
    }
  }
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

            <SubscriptionExpiredNotice />

            <ActionCards
              onDownloadTemplate={downloadTemplate}
              onFileSelect={handleFileSelect}
              onAnalyze={uploadTable}
              selectedFile={selectedFile}
              downloadLoading={downloadLoading}
              uploadLoading={uploadLoading}
              disabled={isExpired}
            />

            {uploadMessage && (
              <StatusMessage message={uploadMessage} success={uploadSuccess} />
            )}

            <div ref={resultsRef}>
              {showResults && analysisResults.length > 0 && (
                <AnalysisResults
                  results={analysisResults}
                  onExport={exportResultsToExcel}
                  onExportSupplier={exportSupplierToExcel}
                  exportLoading={exportLoading}
                  disabled={isExpired}
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

        <ContactFloatButton />
      </div>
      <Footer />
    </div>
  );
}

export default Home;
