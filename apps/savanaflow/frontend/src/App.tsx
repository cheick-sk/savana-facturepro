import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/auth'
import LoginPage from './pages/auth/LoginPage'
import Layout from './components/layout/Layout'
import DashboardPage from './pages/dashboard/DashboardPage'
import POSPage from './pages/pos/POSPage'
import ProductsPage from './pages/products/ProductsPage'
import StockPage from './pages/stock/StockPage'
import ReportsPage from './pages/reports/ReportsPage'
import StoresPage from './pages/dashboard/StoresPage'
import AdvancedLoyaltyPage from './pages/loyalty/AdvancedLoyaltyPage'
// Employee pages
import EmployeesPage from './pages/employees/EmployeesPage'
import EmployeeFormPage from './pages/employees/EmployeeFormPage'
import EmployeeDetailPage from './pages/employees/EmployeeDetailPage'
import ShiftsPage from './pages/employees/ShiftsPage'
import CommissionPage from './pages/employees/CommissionPage'
// E-commerce pages
import EcommercePage from './pages/ecommerce/EcommercePage'
import StoreSettingsPage from './pages/ecommerce/StoreSettingsPage'
import ProductsOnlinePage from './pages/ecommerce/ProductsOnlinePage'
import OrdersPage from './pages/ecommerce/OrdersPage'
import OrderDetailPage from './pages/ecommerce/OrderDetailPage'
import DeliveryZonesPage from './pages/ecommerce/DeliveryZonesPage'
import CouponsPage from './pages/ecommerce/CouponsPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const init = useAuthStore(s => s.init)
  useEffect(() => { init() }, [init])

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
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
          <Route path="loyalty" element={<AdvancedLoyaltyPage />} />
          {/* Employee routes */}
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="employees/new" element={<EmployeeFormPage />} />
          <Route path="employees/:id" element={<EmployeeDetailPage />} />
          <Route path="employees/:id/edit" element={<EmployeeFormPage />} />
          <Route path="shifts" element={<ShiftsPage />} />
          <Route path="commissions" element={<CommissionPage />} />
          {/* E-commerce routes */}
          <Route path="ecommerce" element={<EcommercePage />} />
          <Route path="ecommerce/stores/new" element={<StoreSettingsPage />} />
          <Route path="ecommerce/stores/:id" element={<StoreSettingsPage />} />
          <Route path="ecommerce/products" element={<ProductsOnlinePage />} />
          <Route path="ecommerce/orders" element={<OrdersPage />} />
          <Route path="ecommerce/orders/:id" element={<OrderDetailPage />} />
          <Route path="ecommerce/delivery" element={<DeliveryZonesPage />} />
          <Route path="ecommerce/coupons" element={<CouponsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
