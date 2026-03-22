import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/auth'
import LoginPage from './pages/auth/LoginPage'
import Layout from './components/layout/Layout'
import DashboardPage from './pages/dashboard/DashboardPage'
import CustomersPage from './pages/customers/CustomersPage'
import InvoicesPage from './pages/invoices/InvoicesPage'
import InvoiceDetailPage from './pages/invoices/InvoiceDetailPage'
import ProductsPage from './pages/products/ProductsPage'
import PaymentsPage from './pages/payments/PaymentsPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const init = useAuthStore(s => s.init)

  useEffect(() => {
    init()
  }, [init])

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-light)',
            borderRadius: '10px',
            padding: '12px 16px',
            fontSize: '14px'
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff'
            }
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff'
            }
          }
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          {/* Placeholder routes for navigation items */}
          <Route path="quotes" element={<ComingSoonPage title="Devis" />} />
          <Route path="expenses" element={<ComingSoonPage title="Dépenses" />} />
          <Route path="reports" element={<ComingSoonPage title="Rapports" />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

// Placeholder for pages not yet implemented
function ComingSoonPage({ title }: { title: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 400,
      textAlign: 'center'
    }}>
      <div style={{
        fontSize: 48,
        marginBottom: 16,
        opacity: 0.3
      }}>
        🚧
      </div>
      <h2 style={{
        fontSize: 24,
        fontWeight: 600,
        marginBottom: 8,
        color: 'var(--text-primary)'
      }}>
        {title}
      </h2>
      <p style={{
        color: 'var(--text-secondary)',
        maxWidth: 400
      }}>
        Cette fonctionnalité sera bientôt disponible. Nous travaillons activement pour vous offrir une expérience complète.
      </p>
    </div>
  )
}
