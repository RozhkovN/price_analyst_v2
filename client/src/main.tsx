import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { domAnimation, LazyMotion } from 'framer-motion'
import { BrowserRouter } from 'react-router-dom'
import { setupAxiosInterceptors } from '@/utils/axiosInterceptor'
import { userAtom, tokenExpirationAtom } from '@/store/authStore'
import { useAtom } from 'jotai'

// Создание вспомогательного компонента для инициализации interceptors
function AppWrapper() {
  const [user] = useAtom(userAtom)
  const [, setTokenExpiration] = useAtom(tokenExpirationAtom)

  // Инициализация interceptors при загрузке
  if (user) {
    setupAxiosInterceptors({
      getAccessToken: () => user?.accessToken || null,
      getRefreshToken: () => user?.refreshToken || null,
      setAccessToken: (token: string, expiresIn: number) => {
        if (user) {
          const newUser = { ...user, accessToken: token, tokenExpiresIn: expiresIn }
          localStorage.setItem('user', JSON.stringify(newUser))
          setTokenExpiration(Date.now() + expiresIn)
        }
      },
      logout: () => {
        localStorage.removeItem('user')
        localStorage.removeItem('isAuth')
        localStorage.removeItem('isAdmin')
        localStorage.removeItem('tokenExpiration')
        window.location.href = '/'
      },
    })
  }

  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LazyMotion features={domAnimation}>
      <BrowserRouter>
        <AppWrapper />
      </BrowserRouter>
    </LazyMotion>
  </StrictMode>,
)
