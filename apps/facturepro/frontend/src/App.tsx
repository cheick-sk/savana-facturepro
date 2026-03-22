import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from './store/auth'
import LoginPage from './pages/auth/LoginPage'
import Layout from './components/layout/Layout'
import DashboardPage from './pages/dashboard/DashboardPage'
import CustomersPage from './pages/customers/CustomersPage'
import InvoicesPage from './pages/invoices/InvoicesPage'
import InvoiceDetailPage from './pages/invoices/InvoiceDetailPage'
import ProductsPage from './pages/products/ProductsPage'
import PaymentsPage from './pages/payments/PaymentsPage'
import QuotesPage from './pages/quotes/QuotesPage'
import ExpensesPage from './pages/expenses/ExpensesPage'
import ReportsPage from './pages/reports/ReportsPage'

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
          duration: 4000,
          style: {
            background: 'var(--color-background-primary)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border-secondary)',
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="quotes" element={<QuotesPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
