import { useState, useEffect } from "react";
import { m } from "framer-motion";
import { useAtom } from "jotai";
import { isAdminAtom, userAtom } from "@/store/authStore";
import { useNavigate } from "react-router-dom";

import { StatusMessage } from "./components/ui/StatusMessage";
import { AdminHeader } from "./components/admin/AdminHeader";
import { SuppliersUploadSection } from "./components/admin/SuppliersUploadSection";
import { UploadStats } from "./components/admin/UploadStats";
import { UserRequestsSection } from "./components/admin/UserRequestsSection";
import { ExtendSubscriptionSection } from "./components/subscription/ExtendSubscriptionSection";

interface UploadResponse {
  success: boolean;
  message: string;
  newRecords: number;
  updatedRecords: number;
  unchangedRecords: number;
  processedRecords: number;
  failedRecords: number;
}

function Admin() {
  const [user] = useAtom(userAtom);
  const [isAdmin] = useAtom(isAdminAtom);
  const navigate = useNavigate();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState<boolean | null>(null);
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(
    null,
  );

  useEffect(() => {
    if (isAdmin) {
      setIsAuthenticated(true);
    } else {
      navigate("/");
    }
  }, [isAdmin, navigate]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Проверка прав доступа...</div>
      </div>
    );
  }

  return (
    <div className="from-blue-25 min-h-screen w-screen bg-gradient-to-br to-white">
      <div className="container mx-auto px-4 py-8 md:px-6">
        <m.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-6xl"
        >
          <AdminHeader onNavigateHome={() => navigate("/")} />

          <SuppliersUploadSection
            user={user}
            onUploadResponse={setUploadResponse}
            onUploadMessage={setUploadMessage}
            onUploadSuccess={setUploadSuccess}
          />

          {uploadMessage && (
            <StatusMessage message={uploadMessage} success={uploadSuccess} />
          )}

          {uploadResponse && <UploadStats uploadResponse={uploadResponse} />}

          {/* Продление подписки */}
          <ExtendSubscriptionSection />

          <UserRequestsSection
            user={user}
            onMessage={setUploadMessage}
            onMessageSuccess={setUploadSuccess}
            disabled={false}
          />
        </m.div>
      </div>
    </div>
  );
}

export default Admin;
