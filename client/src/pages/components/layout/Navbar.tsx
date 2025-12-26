import { useAtom } from "jotai";
import Button from "../ui/Button";
import { isAdminAtom, isAuthAtom } from "@/store/authStore";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { Dispatch, SetStateAction } from "react";

interface NavbarProps {
  setIsLoginModalOpen: Dispatch<SetStateAction<boolean>>;
  setIsRegisterModalOpen: Dispatch<SetStateAction<boolean>>;
}

function Navbar({ setIsLoginModalOpen, setIsRegisterModalOpen }: NavbarProps) {
  const [isAuth] = useAtom(isAuthAtom);
  const [isAdmin] = useAtom(isAdminAtom);
  const { logout } = useAuth();

  const navigate = useNavigate();

  // Функция выхода (использует улучшенный logout из useAuth)
  const handleLogout = () => {
    logout();
  };

  return (
    <div className="fixed top-4 right-4 z-20">
      {isAuth ? (
        <div className="flex items-center gap-4">
          <div className="text-sm text-blue-700">
            {isAdmin && (
              <Button onClick={() => navigate("/admin")}>Админ-панель</Button>
            )}
          </div>
          <Button onClick={() => navigate("/profile")}>Личный кабинет</Button>

          <Button onClick={handleLogout}>Выйти</Button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsRegisterModalOpen(true)}
          >
            Регистрация
          </Button>
          <Button onClick={() => setIsLoginModalOpen(true)}>Войти</Button>
        </div>
      )}
    </div>
  );
}

export default Navbar;
