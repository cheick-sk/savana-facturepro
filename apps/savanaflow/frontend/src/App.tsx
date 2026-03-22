import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from './store/auth'
import LoginPage from './pages/auth/LoginPage'
import Layout from './components/layout/Layout'
import DashboardPage from './pages/dashboard/DashboardPage'
import POSPage from './pages/pos/POSPage'
import ProductsPage from './pages/products/ProductsPage'
import StockPage from './pages/stock/StockPage'
import ReportsPage from './pages/reports/ReportsPage'
import StoresPage from './pages/dashboard/StoresPage'
import ShiftsPage from './pages/shifts/ShiftsPage'
import LoyaltyPage from './pages/loyalty/LoyaltyPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { i18n } = useTranslation()
  const init = useAuthStore(s => s.init)
  
  useEffect(() => { 
    init() 
  }, [init])

  // Set document direction based on language
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = i18n.language
  }, [i18n.language])

  return (
    <BrowserRouter>
      <Toaster 
        position="top-right" 
        toastOptions={{ 
          duration: 3000,
          style: {
            background: '#fff',
            color: '#333',
            border: '1px solid #eee',
          },
        }} 
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="pos" element={<POSPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="stock" element={<StockPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="stores" element={<StoresPage />} />
          <Route path="shifts" element={<ShiftsPage />} />
          <Route path="loyalty" element={<LoyaltyPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
