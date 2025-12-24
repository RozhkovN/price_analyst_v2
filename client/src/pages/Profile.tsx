import { useState, useEffect } from "react";
import { m } from "framer-motion";
import { useAtom } from "jotai";
import { userAtom } from "@/store/authStore";
import { useNavigate } from "react-router-dom";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { StatusMessage } from "./components/ui/StatusMessage";
import { ProfileHeader } from "./components/profile/ProfileHeader";
import Footer from "./components/layout/Footer";
import ContactFloatButton from "./components/ui/ContactFloatButton";
import { UserRequestsSection } from "./components/profile/UserRequestsSection";
import { SubscriptionExpiredNotice } from "./components/subscription/SubscriptionExpiredNotice";

function Profile() {
  const [user] = useAtom(userAtom);
  const navigate = useNavigate();

  const [message, setMessage] = useState("");
  const [messageSuccess, setMessageSuccess] = useState<boolean | null>(null);

  const { isExpired, isChecking } = useSubscriptionStatus();

  useEffect(() => {
    if (!user?.token) navigate("/");
  }, [user, navigate]);

  if (!user?.token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Перенаправление...</div>
      </div>
    );
  }

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Проверка подписки...</div>
      </div>
    );
  }

  return (
    <div className="from-blue-25 h-screen w-screen bg-gradient-to-br to-white">
      <div className="container mx-auto px-4 py-8">
        <m.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-6xl"
        >
          <ProfileHeader onNavigateHome={() => navigate("/")} />

          {message && (
            <StatusMessage message={message} success={messageSuccess} />
          )}

          {isExpired && <SubscriptionExpiredNotice />}

          <UserRequestsSection
            user={user}
            onMessage={setMessage}
            onMessageSuccess={setMessageSuccess}
            disabled={isExpired}
          />
        </m.div>

        <ContactFloatButton />
      </div>
      <Footer />
    </div>
  );
}

export default Profile;
