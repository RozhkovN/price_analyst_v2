import axios from "axios";
import { useAtom } from "jotai";
import { userAtom, isAuthAtom, isAdminAtom, tokenExpirationAtom } from "@/store/authStore";
import type { User, RefreshTokenResponse } from "@/types/auth.type";

const API_URL = import.meta.env.VITE_API_URL;

export const useAuth = () => {
  const [user, setUser] = useAtom(userAtom);
  const [, setIsAuth] = useAtom(isAuthAtom);
  const [, setIsAdmin] = useAtom(isAdminAtom);
  const [tokenExpiration, setTokenExpiration] = useAtom(tokenExpirationAtom);

  const login = (userData: User) => {
    const expirationTime = Date.now() + userData.tokenExpiresIn;
    setUser(userData);
    setTokenExpiration(expirationTime);
    setIsAuth(true);
    setIsAdmin(userData.role === "ADMIN");
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("isAuth");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("tokenExpiration");
    setUser(null);
    setIsAuth(false);
    setIsAdmin(false);
    setTokenExpiration(null);
    window.location.reload();
  };

  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      if (!user?.refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await axios.post<RefreshTokenResponse>(
        `${API_URL}/auth/refresh`,
        { refreshToken: user.refreshToken },
        { validateStatus: () => true } // Не бросать исключение для ошибок
      );

      if (response.status !== 200) {
        // Refresh токен истёк - нужна повторная авторизация
        logout();
        return false;
      }

      const { accessToken, expiresIn } = response.data;
      const newExpiration = Date.now() + expiresIn;

      // Обновить access token и срок его жизни
      setUser({
        ...user,
        accessToken,
        tokenExpiresIn: expiresIn,
      });
      setTokenExpiration(newExpiration);

      return true;
    } catch (error) {
      console.error("Ошибка при обновлении токена:", error);
      logout();
      return false;
    }
  };

  const getAccessToken = (): string | null => {
    return user?.accessToken || null;
  };

  const isAuthenticated = !!user?.accessToken;

  return {
    user,
    login,
    logout,
    refreshAccessToken,
    getAccessToken,
    isAuthenticated,
    tokenExpiration,
  };
};
