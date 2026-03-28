import { Star, Award, TrendingUp } from 'lucide-react'

interface PointsDisplayProps {
  points: number
  tier?: {
    name: string
    color: string
    multiplier: number
  }
  showMultiplier?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function PointsDisplay({ points, tier, showMultiplier = false, size = 'md' }: PointsDisplayProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 24,
  }

  const formatNumber = (n: number) => n.toLocaleString('fr-FR')

  return (
    <div className="inline-flex items-center gap-2">
      {/* Points */}
      <div className={`flex items-center gap-1.5 px-2.5 py-1 bg-yellow-50 rounded-lg ${sizeClasses[size]}`}>
        <Star size={iconSizes[size]} className="text-yellow-500 fill-yellow-500" />
        <span className="font-bold text-yellow-700">{formatNumber(points)}</span>
        <span className="text-yellow-600 text-xs">pts</span>
      </div>

      {/* Tier Badge */}
      {tier && (
        <div 
          className={`flex items-center gap-1 px-2 py-1 rounded-lg ${sizeClasses[size]}`}
          style={{ 
            backgroundColor: `${tier.color}20`,
            color: tier.color
          }}
        >
          <Award size={iconSizes[size] - 2} />
          <span className="font-medium">{tier.name}</span>
        </div>
      )}

      {/* Multiplier */}
      {showMultiplier && tier && tier.multiplier > 1 && (
        <div className={`flex items-center gap-1 px-2 py-1 bg-green-50 rounded-lg text-green-600 ${sizeClasses[size]}`}>
          <TrendingUp size={iconSizes[size] - 4} />
          <span className="font-medium">{tier.multiplier}x</span>
        </div>
      )}
    </div>
  )
}

// Card Member Badge Component
export function MemberBadge({ 
  cardNumber, 
  tier, 
  points,
  compact = false 
}: { 
  cardNumber: string
  tier?: { name: string; color: string }
  points: number
  compact?: boolean
}) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        {tier && (
          <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: tier.color }}
          />
        )}
        <span className="text-gray-600">{points.toLocaleString('fr-FR')} pts</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2">
        <Star size={16} className="text-yellow-500 fill-yellow-500" />
        <span className="font-bold text-gray-900">{points.toLocaleString('fr-FR')}</span>
      </div>
      {tier && (
        <div 
          className="px-2 py-0.5 rounded text-xs font-medium"
          style={{ 
            backgroundColor: tier.color,
            color: 'white'
          }}
        >
          {tier.name}
        </div>
      )}
      <div className="text-xs text-gray-400 font-mono">{cardNumber}</div>
    </div>
  )
}

// Tier Progress Component
export function TierProgress({ 
  currentPoints, 
  tiers 
}: { 
  currentPoints: number
  tiers: Array<{ name: string; min_points: number; color: string }>
}) {
  const sortedTiers = [...tiers].sort((a, b) => a.min_points - b.min_points)
  
  const currentTierIndex = sortedTiers.reduce((acc, tier, idx) => {
    if (currentPoints >= tier.min_points) return idx
    return acc
  }, 0)

  const currentTier = sortedTiers[currentTierIndex]
  const nextTier = sortedTiers[currentTierIndex + 1]

  const progress = nextTier
    ? ((currentPoints - currentTier.min_points) / (nextTier.min_points - currentTier.min_points)) * 100
    : 100

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between text-sm">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: currentTier.color }}
          />
          <span className="font-medium">{currentTier.name}</span>
        </div>
        <span className="text-gray-500">{currentPoints.toLocaleString('fr-FR')} pts</span>
      </div>

      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{ 
            width: `${Math.min(progress, 100)}%`,
            backgroundColor: currentTier.color
          }}
        />
      </div>

      {nextTier && (
        <div className="flex justify-between text-xs text-gray-500">
          <span>{(nextTier.min_points - currentPoints).toLocaleString('fr-FR')} pts jusqu'à {nextTier.name}</span>
          <span>{nextTier.min_points.toLocaleString('fr-FR')} pts</span>
        </div>
      )}
    </div>
  )
}
