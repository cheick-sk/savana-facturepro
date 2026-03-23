import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card, CardContent } from '../../components/ui/Card'
import { ShoppingCart, Mail, Lock, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('admin@savanaflow.africa')
  const [password, setPassword] = useState('Admin1234!')
  const { login, loading } = useAuthStore()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await login(email, password)
      toast.success('Connexion réussie!')
      navigate('/dashboard')
    } catch {
      toast.error('Email ou mot de passe incorrect')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-secondary-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-2xl border-0">
        <CardContent className="p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30 mb-4">
              <ShoppingCart className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
              SavanaFlow
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Point de vente intelligent
            </p>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-5">
            <Input
              type="email"
              label="Email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-5 h-5" />}
              required
            />

            <Input
              type="password"
              label="Mot de passe"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="w-5 h-5" />}
              required
            />

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>

          {/* Demo Info */}
          <div className="mt-6 p-4 bg-gradient-to-r from-secondary-50 to-green-50 dark:from-secondary-900/20 dark:to-green-900/20 rounded-xl border border-secondary-100 dark:border-secondary-800">
            <p className="text-xs font-medium text-secondary-700 dark:text-secondary-400 mb-2">
              🎯 Identifiants de démonstration
            </p>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <p><span className="font-medium">Email:</span> admin@savanaflow.africa</p>
              <p><span className="font-medium">Mot de passe:</span> Admin1234!</p>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
            En vous connectant, vous acceptez nos{' '}
            <a href="#" className="text-secondary-600 hover:text-secondary-700 dark:text-secondary-400">
              conditions d'utilisation
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
