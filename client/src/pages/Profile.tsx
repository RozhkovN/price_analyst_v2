import { useState, useEffect } from "react";
import { m } from "framer-motion";
import { useAtom } from "jotai";
import { userAtom } from "@/store/authStore";
import { useNavigate } from "react-router-dom";
import { StatusMessage } from "./components/ui/StatusMessage";
import { ProfileHeader } from "./components/profile/ProfileHeader";
import { UserRequestsSection } from "./components/profile/UserRequestsSection";
// import Footer from "./components/layout/Footer";

function Profile() {
  const [user] = useAtom(userAtom);
  const navigate = useNavigate();

  const [message, setMessage] = useState<string>("");
  const [messageSuccess, setMessageSuccess] = useState<boolean | null>(null);

  // Проверяем авторизацию
  useEffect(() => {
    if (!user?.token) {
      navigate("/");
    }
  }, [user, navigate]);

  if (!user?.token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Перенаправление...</div>
      </div>
    );
  }

  return (
    <div className="from-blue-25 min-h-screen w-screen bg-gradient-to-br to-white">
      <div className="container mx-auto px-4 py-8 md:px-6">
        <m.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mx-auto max-w-6xl"
        >
          <ProfileHeader onNavigateHome={() => navigate("/")} />

          {/* Сообщение о статусе */}
          {message && (
            <StatusMessage message={message} success={messageSuccess} />
          )}

          {/* Секция истории запросов */}
          <UserRequestsSection
            user={user}
            onMessage={setMessage}
            onMessageSuccess={setMessageSuccess}
          />
        </m.div>
      </div>
      {/* <Footer /> */}
    </div>
  );
}

export default Profile;
