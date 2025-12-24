import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";

export function useSubscriptionStatus() {
  const { user } = useAuth();
  const [isExpired, setIsExpired] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!user?.token) {
      setIsChecking(false);
      return;
    }

    const check = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/subscription/check`,
          {
            headers: { Authorization: `Bearer ${user.token}` },
          },
        );
        setIsExpired(res.data.isExpired);
      } catch {
        setIsExpired(false);
      } finally {
        setIsChecking(false);
      }
    };

    check();
  }, [user]);

  return { isExpired, isChecking };
}
