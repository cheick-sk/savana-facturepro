import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2, Shield, Store, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('admin@savanaflow.africa')
  const [password, setPassword] = useState('Admin1234!')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const { login, loading } = useAuthStore()
  const navigate = useNavigate()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await login(email, password)
      toast.success('Connexion réussie !')
      navigate('/dashboard')
    } catch {
      toast.error('Email ou mot de passe incorrect')
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Store size={28} className="text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">SavanaFlow</div>
              <div className="text-sm text-white/70">Point de Vente Pro</div>
            </div>
          </div>

          {/* Main content */}
          <div className="space-y-8">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Gérez votre commerce<br />
              <span className="text-emerald-200">avec simplicité</span>
            </h1>
            <p className="text-lg text-white/80 max-w-md">
              La solution complète de point de vente conçue pour les entreprises africaines. 
              Simple, puissante et adaptée à vos besoins.
            </p>

            {/* Features */}
            <div className="space-y-4">
              {[
                { icon: TrendingUp, text: 'Tableau de bord analytique en temps réel' },
                { icon: Store, text: 'Multi-magasins et gestion des stocks' },
                { icon: Shield, text: 'Données sécurisées et sauvegardées' },
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-white/90">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <feature.icon size={20} className="text-emerald-300" />
                  </div>
                  <span>{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-sm text-white/60">
            © 2024 SavanaFlow. Tous droits réservés.
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-[var(--bg-primary)]">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <Store size={28} className="text-white" />
            </div>
            <div>
              <div className="text-xl font-bold text-[var(--text-primary)]">SavanaFlow</div>
              <div className="text-xs text-[var(--text-secondary)]">Point de Vente Pro</div>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Bienvenue</h2>
            <p className="text-[var(--text-secondary)] mt-2">Connectez-vous à votre compte</p>
          </div>

          {/* Login form */}
          <form onSubmit={submit} className="space-y-5">
            {/* Email field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-secondary)]">Email</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="vous@exemple.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-secondary)]">Mot de passe</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember me & Forgot password */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--border-default)] text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-[var(--text-secondary)]">Se souvenir de moi</span>
              </label>
              <a href="#" className="text-[var(--primary-600)] hover:underline font-medium">
                Mot de passe oublié ?
              </a>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)]">
            <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] mb-2">
              <Shield size={14} />
              Identifiants de démonstration
            </div>
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-tertiary)]">Email:</span>
                <code className="text-[var(--text-primary)] font-mono text-xs bg-[var(--bg-primary)] px-2 py-0.5 rounded">
                  admin@savanaflow.africa
                </code>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-tertiary)]">Mdp:</span>
                <code className="text-[var(--text-primary)] font-mono text-xs bg-[var(--bg-primary)] px-2 py-0.5 rounded">
                  Admin1234!
                </code>
              </div>
            </div>
          </div>

          {/* Sign up link */}
          <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
            Pas encore de compte ?{' '}
            <a href="#" className="text-[var(--primary-600)] hover:underline font-medium">
              Créer un compte
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
