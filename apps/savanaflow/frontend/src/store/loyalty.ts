import { create } from 'zustand'
import api from '../lib/api'
import toast from 'react-hot-toast'

// Types
export interface LoyaltyProgram {
  id: number
  store_id: number | null
  name: string
  description: string | null
  is_active: boolean
  start_date: string | null
  end_date: string | null
  points_per_currency: number
  currency_per_point: number
  welcome_bonus: number
  birthday_bonus: number
  referral_bonus: number
  points_expiry_days: number
  max_redemption_percent: number
  created_at: string
  tiers: LoyaltyTier[]
}

export interface LoyaltyTier {
  id: number
  program_id: number
  name: string
  min_points: number
  discount_percent: number
  points_multiplier: number
  welcome_bonus: number
  birthday_bonus: number
  color: string
  icon: string | null
  order: number
}

export interface LoyaltyReward {
  id: number
  program_id: number
  name: string
  description: string | null
  image_url: string | null
  reward_type: 'discount' | 'free_product' | 'voucher' | 'experience'
  points_cost: number
  discount_value: number | null
  discount_percent: number | null
  product_id: number | null
  is_active: boolean
  valid_for_days: number
  max_redemptions: number | null
  current_redemptions: number
  min_tier_id: number | null
  created_at: string
}

export interface LoyaltyCard {
  id: number
  program_id: number
  customer_id: number
  card_number: string
  current_tier_id: number | null
  points_balance: number
  total_points_earned: number
  total_points_redeemed: number
  total_visits: number
  total_spent: number
  member_since: string
  last_visit: string | null
  is_active: boolean
  referral_count: number
  created_at: string
  customer?: {
    id: number
    name: string
    phone: string | null
    email: string | null
    loyalty_tier: string
  }
  current_tier?: LoyaltyTier
}

export interface LoyaltyTransaction {
  id: number
  card_id: number
  transaction_type: 'earn' | 'redeem' | 'bonus' | 'expire' | 'adjust'
  points: number
  source_type: string | null
  source_id: number | null
  description: string | null
  balance_after: number
  expires_at: string | null
  created_at: string
}

export interface CardLookupResult {
  card_number: string
  customer_name: string
  customer_phone: string | null
  points_balance: number
  tier_name: string
  tier_color: string
  tier_discount_percent: number
  points_value: number
  can_redeem: boolean
}

export interface LoyaltyStats {
  total_members: number
  active_members: number
  total_points_earned: number
  total_points_redeemed: number
  total_points_balance: number
  total_redemptions: number
  tier_distribution: Array<{ tier: string; color: string; count: number }>
  top_members: Array<{
    card_id: number
    customer_name: string
    points_balance: number
    total_spent: number
    tier: string
  }>
  recent_transactions: Array<{
    id: number
    card_number: string | null
    customer_name: string | null
    type: string
    points: number
    created_at: string
  }>
  rewards_stats: {
    total: number
    active: number
  }
}

interface LoyaltyState {
  // Programs
  programs: LoyaltyProgram[]
  currentProgram: LoyaltyProgram | null
  programsLoading: boolean

  // Tiers
  tiers: LoyaltyTier[]

  // Rewards
  rewards: LoyaltyReward[]
  rewardsLoading: boolean

  // Cards
  cards: LoyaltyCard[]
  cardsTotal: number
  cardsLoading: boolean
  currentCard: LoyaltyCard | null
  cardTransactions: LoyaltyTransaction[]

  // Stats
  stats: LoyaltyStats | null
  statsLoading: boolean

  // POS Integration
  scannedCard: CardLookupResult | null
  scannedCardLoading: boolean

  // Actions
  fetchPrograms: (storeId?: number) => Promise<void>
  fetchProgram: (programId: number) => Promise<void>
  createProgram: (data: Partial<LoyaltyProgram>) => Promise<LoyaltyProgram | null>
  updateProgram: (programId: number, data: Partial<LoyaltyProgram>) => Promise<LoyaltyProgram | null>
  deleteProgram: (programId: number) => Promise<boolean>

  // Tiers
  createTier: (programId: number, data: Partial<LoyaltyTier>) => Promise<LoyaltyTier | null>
  updateTier: (tierId: number, data: Partial<LoyaltyTier>) => Promise<LoyaltyTier | null>
  deleteTier: (tierId: number) => Promise<boolean>

  // Rewards
  fetchRewards: (programId?: number) => Promise<void>
  createReward: (programId: number, data: Partial<LoyaltyReward>) => Promise<LoyaltyReward | null>
  updateReward: (rewardId: number, data: Partial<LoyaltyReward>) => Promise<LoyaltyReward | null>
  deleteReward: (rewardId: number) => Promise<boolean>

  // Cards
  fetchCards: (params?: { programId?: number; tierId?: number; search?: string; page?: number; size?: number }) => Promise<void>
  fetchCard: (cardId: number) => Promise<void>
  registerCard: (data: { program_id: number; customer_id: number; referred_by_card_number?: string }) => Promise<LoyaltyCard | null>
  adjustPoints: (cardId: number, points: number, description: string) => Promise<boolean>
  fetchCardTransactions: (cardId: number, page?: number) => Promise<void>

  // Stats
  fetchStats: (programId?: number) => Promise<void>

  // POS Integration
  lookupCard: (cardNumber: string) => Promise<CardLookupResult | null>
  earnPoints: (cardNumber: string, saleId: number, saleAmount: number) => Promise<{ points_earned: number; new_balance: number } | null>
  redeemPoints: (cardNumber: string, pointsToUse: number, saleAmount: number) => Promise<{ points_used: number; loyalty_discount: number; new_balance: number } | null>
  clearScannedCard: () => void

  // Reset
  reset: () => void
}

const initialState = {
  programs: [],
  currentProgram: null,
  programsLoading: false,
  tiers: [],
  rewards: [],
  rewardsLoading: false,
  cards: [],
  cardsTotal: 0,
  cardsLoading: false,
  currentCard: null,
  cardTransactions: [],
  stats: null,
  statsLoading: false,
  scannedCard: null,
  scannedCardLoading: false,
}

export const useLoyaltyStore = create<LoyaltyState>((set, get) => ({
  ...initialState,

  // Programs
  fetchPrograms: async (storeId?: number) => {
    set({ programsLoading: true })
    try {
      const params = storeId ? { store_id: storeId } : {}
      const { data } = await api.get('/loyalty/programs', { params })
      set({ programs: data, programsLoading: false })
    } catch (error) {
      set({ programsLoading: false })
      toast.error('Erreur lors du chargement des programmes')
    }
  },

  fetchProgram: async (programId: number) => {
    set({ programsLoading: true })
    try {
      const { data } = await api.get(`/loyalty/programs/${programId}`)
      set({ currentProgram: data, tiers: data.tiers || [], programsLoading: false })
    } catch (error) {
      set({ programsLoading: false })
      toast.error('Erreur lors du chargement du programme')
    }
  },

  createProgram: async (data: Partial<LoyaltyProgram>) => {
    try {
      const { data: program } = await api.post('/loyalty/programs', data)
      set(state => ({ programs: [...state.programs, program] }))
      toast.success('Programme créé avec succès')
      return program
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création')
      return null
    }
  },

  updateProgram: async (programId: number, data: Partial<LoyaltyProgram>) => {
    try {
      const { data: program } = await api.put(`/loyalty/programs/${programId}`, data)
      set(state => ({
        programs: state.programs.map(p => p.id === programId ? program : p),
        currentProgram: state.currentProgram?.id === programId ? program : state.currentProgram,
      }))
      toast.success('Programme mis à jour')
      return program
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la mise à jour')
      return null
    }
  },

  deleteProgram: async (programId: number) => {
    try {
      await api.delete(`/loyalty/programs/${programId}`)
      set(state => ({
        programs: state.programs.filter(p => p.id !== programId),
        currentProgram: state.currentProgram?.id === programId ? null : state.currentProgram,
      }))
      toast.success('Programme supprimé')
      return true
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression')
      return false
    }
  },

  // Tiers
  createTier: async (programId: number, data: Partial<LoyaltyTier>) => {
    try {
      const { data: tier } = await api.post(`/loyalty/programs/${programId}/tiers`, data)
      set(state => ({
        tiers: [...state.tiers, tier].sort((a, b) => a.order - b.order),
        currentProgram: state.currentProgram
          ? { ...state.currentProgram, tiers: [...(state.currentProgram.tiers || []), tier] }
          : null,
      }))
      toast.success('Niveau créé avec succès')
      return tier
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création')
      return null
    }
  },

  updateTier: async (tierId: number, data: Partial<LoyaltyTier>) => {
    try {
      const { data: tier } = await api.put(`/loyalty/tiers/${tierId}`, data)
      set(state => ({
        tiers: state.tiers.map(t => t.id === tierId ? tier : t),
      }))
      toast.success('Niveau mis à jour')
      return tier
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la mise à jour')
      return null
    }
  },

  deleteTier: async (tierId: number) => {
    try {
      await api.delete(`/loyalty/tiers/${tierId}`)
      set(state => ({
        tiers: state.tiers.filter(t => t.id !== tierId),
      }))
      toast.success('Niveau supprimé')
      return true
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression')
      return false
    }
  },

  // Rewards
  fetchRewards: async (programId?: number) => {
    set({ rewardsLoading: true })
    try {
      const params = programId ? { program_id: programId } : {}
      const { data } = await api.get('/loyalty/rewards', { params })
      set({ rewards: data, rewardsLoading: false })
    } catch (error) {
      set({ rewardsLoading: false })
      toast.error('Erreur lors du chargement des récompenses')
    }
  },

  createReward: async (programId: number, data: Partial<LoyaltyReward>) => {
    try {
      const { data: reward } = await api.post(`/loyalty/programs/${programId}/rewards`, data)
      set(state => ({ rewards: [...state.rewards, reward] }))
      toast.success('Récompense créée avec succès')
      return reward
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création')
      return null
    }
  },

  updateReward: async (rewardId: number, data: Partial<LoyaltyReward>) => {
    try {
      const { data: reward } = await api.put(`/loyalty/rewards/${rewardId}`, data)
      set(state => ({ rewards: state.rewards.map(r => r.id === rewardId ? reward : r) }))
      toast.success('Récompense mise à jour')
      return reward
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la mise à jour')
      return null
    }
  },

  deleteReward: async (rewardId: number) => {
    try {
      await api.delete(`/loyalty/rewards/${rewardId}`)
      set(state => ({ rewards: state.rewards.filter(r => r.id !== rewardId) }))
      toast.success('Récompense supprimée')
      return true
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression')
      return false
    }
  },

  // Cards
  fetchCards: async (params?: { programId?: number; tierId?: number; search?: string; page?: number; size?: number }) => {
    set({ cardsLoading: true })
    try {
      const { data } = await api.get('/loyalty/cards', { params })
      set({ cards: data.items, cardsTotal: data.total, cardsLoading: false })
    } catch (error) {
      set({ cardsLoading: false })
      toast.error('Erreur lors du chargement des cartes')
    }
  },

  fetchCard: async (cardId: number) => {
    set({ cardsLoading: true })
    try {
      const { data } = await api.get(`/loyalty/cards/${cardId}`)
      set({ currentCard: data, cardsLoading: false })
    } catch (error) {
      set({ cardsLoading: false })
      toast.error('Erreur lors du chargement de la carte')
    }
  },

  registerCard: async (data: { program_id: number; customer_id: number; referred_by_card_number?: string }) => {
    try {
      const { data: card } = await api.post('/loyalty/cards/register', data)
      set(state => ({ cards: [card, ...state.cards], cardsTotal: state.cardsTotal + 1 }))
      toast.success('Client inscrit au programme')
      return card
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'inscription')
      return null
    }
  },

  adjustPoints: async (cardId: number, points: number, description: string) => {
    try {
      const { data: card } = await api.post(`/loyalty/cards/${cardId}/adjust`, null, {
        params: { points, description },
      })
      set(state => ({
        cards: state.cards.map(c => c.id === cardId ? card : c),
        currentCard: state.currentCard?.id === cardId ? card : state.currentCard,
      }))
      toast.success('Points ajustés avec succès')
      return true
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'ajustement')
      return false
    }
  },

  fetchCardTransactions: async (cardId: number, page: number = 1) => {
    try {
      const { data } = await api.get(`/loyalty/cards/${cardId}/transactions`, {
        params: { page, size: 50 },
      })
      set({ cardTransactions: data.items })
    } catch (error) {
      toast.error('Erreur lors du chargement des transactions')
    }
  },

  // Stats
  fetchStats: async (programId?: number) => {
    set({ statsLoading: true })
    try {
      const params = programId ? { program_id: programId } : {}
      const { data } = await api.get('/loyalty/stats', { params })
      set({ stats: data, statsLoading: false })
    } catch (error) {
      set({ statsLoading: false })
      toast.error('Erreur lors du chargement des statistiques')
    }
  },

  // POS Integration
  lookupCard: async (cardNumber: string) => {
    set({ scannedCardLoading: true })
    try {
      const { data } = await api.get(`/loyalty/cards/lookup/${cardNumber}`)
      set({ scannedCard: data, scannedCardLoading: false })
      return data
    } catch (error: any) {
      set({ scannedCardLoading: false, scannedCard: null })
      toast.error(error.response?.data?.detail || 'Carte non trouvée')
      return null
    }
  },

  earnPoints: async (cardNumber: string, saleId: number, saleAmount: number) => {
    try {
      const { data } = await api.post('/loyalty/sale/earn', {
        card_number: cardNumber,
        sale_id: saleId,
        sale_amount: saleAmount,
      })
      // Update scanned card balance
      set(state => ({
        scannedCard: state.scannedCard
          ? { ...state.scannedCard, points_balance: data.new_balance }
          : null,
      }))
      return { points_earned: data.points_earned, new_balance: data.new_balance }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'attribution des points')
      return null
    }
  },

  redeemPoints: async (cardNumber: string, pointsToUse: number, saleAmount: number) => {
    try {
      const { data } = await api.post('/loyalty/sale/redeem', {
        card_number: cardNumber,
        points_to_use: pointsToUse,
        sale_amount: saleAmount,
      })
      // Update scanned card balance
      set(state => ({
        scannedCard: state.scannedCard
          ? { ...state.scannedCard, points_balance: data.new_balance }
          : null,
      }))
      return { points_used: data.points_used, loyalty_discount: data.loyalty_discount, new_balance: data.new_balance }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'utilisation des points')
      return null
    }
  },

  clearScannedCard: () => set({ scannedCard: null }),

  reset: () => set(initialState),
}))
