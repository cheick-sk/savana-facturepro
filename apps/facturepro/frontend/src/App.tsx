import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/auth'
import { usePortalAuthStore } from './store/portalAuth'
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

// Purchase pages
import PurchaseOrdersPage from './pages/purchase/PurchaseOrdersPage'
import SupplierInvoicesPage from './pages/purchase/SupplierInvoicesPage'

// Accounting pages
import ChartOfAccountsPage from './pages/accounting/ChartOfAccountsPage'
import JournalEntriesPage from './pages/accounting/JournalEntriesPage'
import JournalEntryFormPage from './pages/accounting/JournalEntryFormPage'
import FiscalYearsPage from './pages/accounting/FiscalYearsPage'
import AccountingReportsPage from './pages/accounting/AccountingReportsPage'
import TrialBalancePage from './pages/accounting/TrialBalancePage'
import BalanceSheetPage from './pages/accounting/BalanceSheetPage'
import IncomeStatementPage from './pages/accounting/IncomeStatementPage'

// Settings pages
import WebhooksPage from './pages/settings/WebhooksPage'

// Portal imports
import PortalLoginPage from './pages/portal/PortalLoginPage'
import PortalLayout from './components/portal/PortalLayout'
import PortalDashboardPage from './pages/portal/PortalDashboardPage'
import PortalInvoicesPage from './pages/portal/PortalInvoicesPage'
import PortalInvoiceDetailPage from './pages/portal/PortalInvoiceDetailPage'
import PortalPaymentPage from './pages/portal/PortalPaymentPage'
import PortalProfilePage from './pages/portal/PortalProfilePage'
import PortalQuotesPage from './pages/portal/PortalQuotesPage'
import PublicInvoicePage from './pages/portal/PublicInvoicePage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PortalRoutes() {
  const { client, token, init, logout } = usePortalAuthStore()
  const navigate = useNavigate()
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)
  const [showPayment, setShowPayment] = useState(false)

  useEffect(() => {
    init()
  }, [init])

  if (!client || !token) {
    return <Navigate to="/portal/login" replace />
  }

  const handleLogout = () => {
    logout()
    navigate('/portal/login')
  }

  const handleViewInvoice = (id: number) => {
    setSelectedInvoiceId(id)
    setShowPayment(false)
    navigate('/portal/invoices')
  }

  const handlePayInvoice = (id: number) => {
    setSelectedInvoiceId(id)
    setShowPayment(true)
    navigate('/portal/invoices')
  }

  const handleBack = () => {
    setSelectedInvoiceId(null)
    setShowPayment(false)
  }

  return (
    <PortalLayout clientName={client.customer?.name || client.email} onLogout={handleLogout}>
      <PortalRouter
        token={token}
        selectedInvoiceId={selectedInvoiceId}
        showPayment={showPayment}
        onViewInvoice={handleViewInvoice}
        onPayInvoice={handlePayInvoice}
        onBack={handleBack}
        setShowPayment={setShowPayment}
        setSelectedInvoiceId={setSelectedInvoiceId}
      />
    </PortalLayout>
  )
}

interface PortalRouterProps {
  token: string
  selectedInvoiceId: number | null
  showPayment: boolean
  onViewInvoice: (id: number) => void
  onPayInvoice: (id: number) => void
  onBack: () => void
  setShowPayment: (show: boolean) => void
  setSelectedInvoiceId: (id: number | null) => void
}

function PortalRouter({
  token,
  selectedInvoiceId,
  showPayment,
  onViewInvoice,
  onPayInvoice,
  onBack,
  setShowPayment,
}: PortalRouterProps) {
  const location = useLocation()

  // Render based on current route
  if (location.pathname === '/portal') {
    return <PortalDashboardPage token={token} onViewInvoice={onViewInvoice} />
  }

  if (location.pathname === '/portal/invoices') {
    if (showPayment && selectedInvoiceId) {
      return (
        <PortalPaymentPage
          token={token}
          invoice={{
            id: selectedInvoiceId,
            invoice_number: '',
            total_amount: 0,
            amount_paid: 0,
            balance_due: 0,
            currency: 'XOF',
          }}
          onSuccess={onBack}
          onCancel={onBack}
        />
      )
    }
    if (selectedInvoiceId) {
      return (
        <PortalInvoiceDetailPage
          token={token}
          invoiceId={selectedInvoiceId}
          onBack={onBack}
          onPay={() => setShowPayment(true)}
        />
      )
    }
    return (
      <PortalInvoicesPage
        token={token}
        onViewInvoice={onViewInvoice}
        onPayInvoice={onPayInvoice}
      />
    )
  }

  if (location.pathname === '/portal/quotes') {
    return <PortalQuotesPage token={token} onViewQuote={() => {}} />
  }

  if (location.pathname === '/portal/payments') {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#6b7280' }}>Historique des paiements</p>
      </div>
    )
  }

  if (location.pathname === '/portal/profile') {
    return <PortalProfilePage token={token} />
  }

  return <PortalDashboardPage token={token} onViewInvoice={onViewInvoice} />
}

export default function App() {
  const init = useAuthStore(s => s.init)
  const portalInit = usePortalAuthStore(s => s.init)

  useEffect(() => {
    init()
    portalInit()
  }, [init, portalInit])

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
        {/* Admin Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="quotes" element={<QuotesPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          {/* Purchase routes */}
          <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="supplier-invoices" element={<SupplierInvoicesPage />} />

          {/* Accounting routes */}
          <Route path="accounting/chart" element={<ChartOfAccountsPage />} />
          <Route path="accounting/entries" element={<JournalEntriesPage />} />
          <Route path="accounting/entries/new" element={<JournalEntryFormPage />} />
          <Route path="accounting/fiscal-years" element={<FiscalYearsPage />} />
          <Route path="accounting/reports" element={<AccountingReportsPage />} />
          <Route path="accounting/reports/trial-balance" element={<TrialBalancePage />} />
          <Route path="accounting/reports/balance-sheet" element={<BalanceSheetPage />} />
          <Route path="accounting/reports/income-statement" element={<IncomeStatementPage />} />

          {/* Settings routes */}
          <Route path="webhooks" element={<WebhooksPage />} />
        </Route>

        {/* Portal Routes */}
        <Route
          path="/portal/login"
          element={
            <PortalLoginPage
              onLogin={(token, client) => {
                usePortalAuthStore.getState().setClient(client, token)
              }}
            />
          }
        />
        <Route path="/portal/*" element={<PortalRoutes />} />

        {/* Public Invoice View */}
        <Route path="/invoice/view" element={<PublicInvoicePage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
