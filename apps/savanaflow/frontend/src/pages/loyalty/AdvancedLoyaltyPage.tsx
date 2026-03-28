import { useEffect, useState } from 'react'
import { 
  Gift, Users, Star, TrendingUp, Settings, Award, Plus, Edit2, Trash2,
  ChevronRight, Search, Filter, Download, RefreshCw
} from 'lucide-react'
import { useLoyaltyStore } from '../../store/loyalty'
import type { LoyaltyProgram, LoyaltyTier, LoyaltyCard, LoyaltyStats } from '../../store/loyalty'
import toast from 'react-hot-toast'

type TabType = 'overview' | 'programs' | 'tiers' | 'rewards' | 'members'

export default function AdvancedLoyaltyPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  
  const {
    programs, currentProgram, programsLoading,
    tiers, rewards, rewardsLoading,
    cards, cardsTotal, cardsLoading,
    stats, statsLoading,
    fetchPrograms, fetchStats, fetchCards, fetchRewards,
    createProgram, updateProgram, deleteProgram,
    createTier, updateTier, deleteTier,
    createReward, updateReward, deleteReward,
  } = useLoyaltyStore()

  useEffect(() => {
    fetchPrograms()
    fetchStats()
    fetchCards({ size: 20 })
    fetchRewards()
  }, [])

  const formatNumber = (n: number) => n.toLocaleString('fr-FR')
  const formatCurrency = (n: number) => `${formatNumber(n)} GNF`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programme Fidélité</h1>
          <p className="text-gray-600">Gérez les points, paliers et récompenses de vos clients</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {/* refresh */}}
            className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50"
          >
            <RefreshCw size={16} />
            Actualiser
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            <Plus size={16} />
            Nouveau programme
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard 
            icon={<Users className="text-blue-500" size={20} />}
            label="Membres"
            value={formatNumber(stats.total_members)}
          />
          <StatCard 
            icon={<TrendingUp className="text-green-500" size={20} />}
            label="Membres actifs"
            value={formatNumber(stats.active_members)}
          />
          <StatCard 
            icon={<Star className="text-yellow-500" size={20} />}
            label="Points en circulation"
            value={formatNumber(stats.total_points_balance)}
          />
          <StatCard 
            icon={<Gift className="text-purple-500" size={20} />}
            label="Récompenses"
            value={stats.rewards_stats.active.toString()}
          />
          <StatCard 
            icon={<Award className="text-orange-500" size={20} />}
            label="Points gagnés"
            value={formatNumber(stats.total_points_earned)}
          />
          <StatCard 
            icon={<Award className="text-red-500" size={20} />}
            label="Points utilisés"
            value={formatNumber(stats.total_points_redeemed)}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="border-b flex overflow-x-auto">
          {[
            { id: 'overview' as TabType, label: 'Vue d\'ensemble', icon: TrendingUp },
            { id: 'programs' as TabType, label: 'Programmes', icon: Settings },
            { id: 'tiers' as TabType, label: 'Paliers', icon: Award },
            { id: 'rewards' as TabType, label: 'Récompenses', icon: Gift },
            { id: 'members' as TabType, label: 'Membres', icon: Users },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <OverviewTab stats={stats} statsLoading={statsLoading} programs={programs} />
          )}
          {activeTab === 'programs' && (
            <ProgramsTab 
              programs={programs} 
              loading={programsLoading}
              onCreate={createProgram}
              onUpdate={updateProgram}
              onDelete={deleteProgram}
            />
          )}
          {activeTab === 'tiers' && (
            <TiersTab 
              tiers={tiers}
              programs={programs}
              onCreate={createTier}
              onUpdate={updateTier}
              onDelete={deleteTier}
            />
          )}
          {activeTab === 'rewards' && (
            <RewardsTab 
              rewards={rewards} 
              loading={rewardsLoading}
              programs={programs}
              onCreate={createReward}
              onUpdate={updateReward}
              onDelete={deleteReward}
            />
          )}
          {activeTab === 'members' && (
            <MembersTab 
              cards={cards}
              total={cardsTotal}
              loading={cardsLoading}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onRefresh={() => fetchCards({ search: searchQuery, size: 20 })}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Components

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white p-4 rounded-xl border shadow-sm">
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  )
}

function OverviewTab({ stats, statsLoading, programs }: { stats: LoyaltyStats | null; statsLoading: boolean; programs: LoyaltyProgram[] }) {
  if (statsLoading) {
    return <div className="py-12 text-center text-gray-500">Chargement...</div>
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Tier Distribution */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Distribution par palier</h3>
        <div className="space-y-3">
          {stats?.tier_distribution.map((tier, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: tier.color }}
                />
                <span className="font-medium">{tier.tier}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-500">{tier.count} membres</span>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full" 
                    style={{ 
                      backgroundColor: tier.color,
                      width: `${stats.total_members > 0 ? (tier.count / stats.total_members) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Members */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Top membres</h3>
        <div className="space-y-3">
          {stats?.top_members.slice(0, 5).map((member, i) => (
            <div key={member.card_id} className="flex items-center justify-between p-3 bg-white rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-sm">
                  {i + 1}
                </div>
                <div>
                  <div className="font-medium">{member.customer_name}</div>
                  <div className="text-sm text-gray-500">{member.tier}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-emerald-600">{formatNumber(member.points_balance)} pts</div>
                <div className="text-sm text-gray-500">{formatCurrency(member.total_spent)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-50 rounded-xl p-6 md:col-span-2">
        <h3 className="font-semibold text-gray-900 mb-4">Activité récente</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500">
                <th className="pb-3">Client</th>
                <th className="pb-3">Type</th>
                <th className="pb-3 text-right">Points</th>
                <th className="pb-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stats?.recent_transactions.map(tx => (
                <tr key={tx.id} className="text-sm">
                  <td className="py-3">{tx.customer_name || 'N/A'}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      tx.type === 'earn' ? 'bg-green-100 text-green-700' :
                      tx.type === 'redeem' ? 'bg-red-100 text-red-700' :
                      tx.type === 'bonus' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {tx.type === 'earn' ? 'Gagnés' : tx.type === 'redeem' ? 'Utilisés' : tx.type === 'bonus' ? 'Bonus' : tx.type}
                    </span>
                  </td>
                  <td className={`py-3 text-right font-medium ${tx.points >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.points >= 0 ? '+' : ''}{formatNumber(tx.points)}
                  </td>
                  <td className="py-3 text-right text-gray-500">
                    {new Date(tx.created_at).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ProgramsTab({ 
  programs, loading, onCreate, onUpdate, onDelete 
}: { 
  programs: LoyaltyProgram[]
  loading: boolean
  onCreate: (data: Partial<LoyaltyProgram>) => Promise<LoyaltyProgram | null>
  onUpdate: (id: number, data: Partial<LoyaltyProgram>) => Promise<LoyaltyProgram | null>
  onDelete: (id: number) => Promise<boolean>
}) {
  const [showCreateModal, setShowCreateModal] = useState(false)

  if (loading) {
    return <div className="py-12 text-center text-gray-500">Chargement...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div></div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          <Plus size={16} />
          Créer un programme
        </button>
      </div>

      {programs.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          <Gift size={48} className="mx-auto mb-4 opacity-20" />
          <p>Aucun programme de fidélité créé</p>
          <p className="text-sm mt-1">Créez votre premier programme pour commencer</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {programs.map(program => (
            <div key={program.id} className="border rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{program.name}</h4>
                  <p className="text-sm text-gray-500">{program.description || 'Aucune description'}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  program.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {program.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-gray-500">Points/1000 GNF:</span>
                  <span className="font-medium ml-1">{(program.points_per_currency * 1000).toFixed(0)}</span>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-gray-500">Valeur pt:</span>
                  <span className="font-medium ml-1">{program.currency_per_point} GNF</span>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-gray-500">Bonus bienvenue:</span>
                  <span className="font-medium ml-1">{program.welcome_bonus} pts</span>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-gray-500">Paliers:</span>
                  <span className="font-medium ml-1">{program.tiers?.length || 0}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
                  <Edit2 size={14} />
                  Modifier
                </button>
                <button 
                  onClick={() => onDelete(program.id)}
                  className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TiersTab({ 
  tiers, programs, onCreate, onUpdate, onDelete 
}: { 
  tiers: LoyaltyTier[]
  programs: LoyaltyProgram[]
  onCreate: (programId: number, data: Partial<LoyaltyTier>) => Promise<LoyaltyTier | null>
  onUpdate: (id: number, data: Partial<LoyaltyTier>) => Promise<LoyaltyTier | null>
  onDelete: (id: number) => Promise<boolean>
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-gray-500">Configurez les paliers de votre programme de fidélité</p>
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
          <Plus size={16} />
          Ajouter un palier
        </button>
      </div>

      {tiers.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          <Award size={48} className="mx-auto mb-4 opacity-20" />
          <p>Aucun palier configuré</p>
          <p className="text-sm mt-1">Sélectionnez un programme pour voir ses paliers</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tiers.sort((a, b) => a.order - b.order).map(tier => (
            <div 
              key={tier.id} 
              className="border rounded-xl p-4 relative overflow-hidden"
              style={{ borderColor: tier.color }}
            >
              <div 
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: tier.color }}
              />
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{tier.name}</h4>
                  <p className="text-sm text-gray-500">{tier.min_points}+ points</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Réduction</span>
                  <span className="font-medium">{tier.discount_percent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Multiplicateur</span>
                  <span className="font-medium">{tier.points_multiplier}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bonus anniversaire</span>
                  <span className="font-medium">{tier.birthday_bonus} pts</span>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
                  <Edit2 size={14} />
                </button>
                <button className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RewardsTab({ 
  rewards, loading, programs, onCreate, onUpdate, onDelete 
}: { 
  rewards: LoyaltyReward[]
  loading: boolean
  programs: LoyaltyProgram[]
  onCreate: (programId: number, data: Partial<LoyaltyReward>) => Promise<LoyaltyReward | null>
  onUpdate: (id: number, data: Partial<LoyaltyReward>) => Promise<LoyaltyReward | null>
  onDelete: (id: number) => Promise<boolean>
}) {
  if (loading) {
    return <div className="py-12 text-center text-gray-500">Chargement...</div>
  }

  const rewardTypeLabels = {
    discount: 'Réduction',
    free_product: 'Produit gratuit',
    voucher: 'Bon d\'achat',
    experience: 'Expérience',
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-gray-500">Créez des récompenses que vos clients peuvent échanger</p>
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
          <Plus size={16} />
          Créer une récompense
        </button>
      </div>

      {rewards.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          <Gift size={48} className="mx-auto mb-4 opacity-20" />
          <p>Aucune récompense créée</p>
          <p className="text-sm mt-1">Créez des récompenses pour récompenser vos clients fidèles</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map(reward => (
            <div key={reward.id} className="border rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{reward.name}</h4>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    reward.reward_type === 'discount' ? 'bg-blue-100 text-blue-700' :
                    reward.reward_type === 'free_product' ? 'bg-green-100 text-green-700' :
                    reward.reward_type === 'voucher' ? 'bg-purple-100 text-purple-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {rewardTypeLabels[reward.reward_type]}
                  </span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  reward.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {reward.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-3">{reward.description || 'Aucune description'}</p>
              <div className="flex justify-between items-center mb-3">
                <div className="text-2xl font-bold text-emerald-600">{reward.points_cost} pts</div>
                {reward.discount_percent && (
                  <div className="text-sm text-gray-500">-{reward.discount_percent}%</div>
                )}
                {reward.discount_value && (
                  <div className="text-sm text-gray-500">{formatCurrency(reward.discount_value)}</div>
                )}
              </div>
              <div className="text-xs text-gray-400 mb-3">
                {reward.max_redemptions 
                  ? `${reward.current_redemptions}/${reward.max_redemptions} utilisations`
                  : `${reward.current_redemptions} utilisations`
                }
              </div>
              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
                  <Edit2 size={14} />
                </button>
                <button 
                  onClick={() => onDelete(reward.id)}
                  className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MembersTab({ 
  cards, total, loading, searchQuery, onSearchChange, onRefresh 
}: { 
  cards: LoyaltyCard[]
  total: number
  loading: boolean
  searchQuery: string
  onSearchChange: (q: string) => void
  onRefresh: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un membre..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onRefresh}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <RefreshCw size={16} />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
            <Download size={16} />
            Exporter
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500">Chargement...</div>
      ) : cards.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          <Users size={48} className="mx-auto mb-4 opacity-20" />
          <p>Aucun membre trouvé</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b">
                <th className="pb-3 font-medium">Membre</th>
                <th className="pb-3 font-medium">N° Carte</th>
                <th className="pb-3 font-medium">Palier</th>
                <th className="pb-3 font-medium text-right">Points</th>
                <th className="pb-3 font-medium text-right">Total achats</th>
                <th className="pb-3 font-medium text-center">Visites</th>
                <th className="pb-3 font-medium">Dernière visite</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cards.map(card => (
                <tr key={card.id} className="hover:bg-gray-50">
                  <td className="py-3">
                    <div className="font-medium text-gray-900">{card.customer?.name || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{card.customer?.phone || '-'}</div>
                  </td>
                  <td className="py-3 font-mono text-sm">{card.card_number}</td>
                  <td className="py-3">
                    {card.current_tier && (
                      <span 
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: `${card.current_tier.color}20`,
                          color: card.current_tier.color
                        }}
                      >
                        {card.current_tier.name}
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-right font-semibold text-emerald-600">{formatNumber(card.points_balance)}</td>
                  <td className="py-3 text-right">{formatCurrency(card.total_spent)}</td>
                  <td className="py-3 text-center">{card.total_visits}</td>
                  <td className="py-3 text-sm text-gray-500">
                    {card.last_visit ? new Date(card.last_visit).toLocaleDateString('fr-FR') : '-'}
                  </td>
                  <td className="py-3 text-right">
                    <button className="text-emerald-600 hover:text-emerald-800 text-sm">
                      Détails <ChevronRight size={14} className="inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > cards.length && (
        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>{cards.length} sur {total} membres</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 border rounded hover:bg-gray-50">Précédent</button>
            <button className="px-3 py-1 border rounded hover:bg-gray-50">Suivant</button>
          </div>
        </div>
      )}
    </div>
  )
}
