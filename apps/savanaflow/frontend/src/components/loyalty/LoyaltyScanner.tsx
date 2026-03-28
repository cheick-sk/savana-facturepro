import { useState } from 'react'
import { CreditCard, Search, X, Star, Gift, Award, Loader2 } from 'lucide-react'
import { useLoyaltyStore, type CardLookupResult } from '../../store/loyalty'

interface LoyaltyScannerProps {
  onCardSelected?: (card: CardLookupResult) => void
  onPointsRedeem?: (points: number) => void
  saleAmount?: number
}

export default function LoyaltyScanner({ onCardSelected, onPointsRedeem, saleAmount = 0 }: LoyaltyScannerProps) {
  const [cardNumber, setCardNumber] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [redeemPoints, setRedeemPoints] = useState(0)

  const { scannedCard, scannedCardLoading, lookupCard, clearScannedCard, redeemPoints: redeemPts } = useLoyaltyStore()

  const handleLookup = async () => {
    if (!cardNumber.trim()) return
    const result = await lookupCard(cardNumber.trim())
    if (result && onCardSelected) {
      onCardSelected(result)
    }
  }

  const handleRedeem = async () => {
    if (!scannedCard || redeemPoints <= 0) return
    const result = await redeemPts(scannedCard.card_number, redeemPoints, saleAmount)
    if (result && onPointsRedeem) {
      onPointsRedeem(result.loyalty_discount)
    }
    setRedeemPoints(0)
  }

  const maxRedeemablePoints = scannedCard && saleAmount > 0
    ? Math.min(scannedCard.points_balance, Math.floor(saleAmount * 0.5 / scannedCard.points_value))
    : 0

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setShowScanner(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
      >
        <CreditCard size={16} />
        <span>Fidélité</span>
        {scannedCard && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-200 rounded text-xs">
            <Star size={12} />
            {scannedCard.points_balance}
          </span>
        )}
      </button>

      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <CreditCard size={20} className="text-purple-600" />
                Scanner carte fidélité
              </h3>
              <button 
                onClick={() => { setShowScanner(false); clearScannedCard(); setCardNumber(''); }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Card Input */}
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Entrez le numéro de carte..."
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                  className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono"
                  autoFocus
                />
              </div>

              <button
                onClick={handleLookup}
                disabled={scannedCardLoading || !cardNumber.trim()}
                className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {scannedCardLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Recherche...
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    Rechercher
                  </>
                )}
              </button>

              {/* Card Result */}
              {scannedCard && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-4">
                  {/* Customer Info */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{scannedCard.customer_name}</div>
                      <div className="text-sm text-gray-500">{scannedCard.customer_phone || 'Pas de téléphone'}</div>
                    </div>
                    <div 
                      className="px-3 py-1 rounded-full text-sm font-medium"
                      style={{ 
                        backgroundColor: `${scannedCard.tier_color}20`,
                        color: scannedCard.tier_color
                      }}
                    >
                      {scannedCard.tier_name}
                    </div>
                  </div>

                  {/* Points Balance */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div className="flex items-center gap-2">
                      <Star size={20} className="text-yellow-500" />
                      <span className="text-gray-600">Points disponibles</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">{scannedCard.points_balance}</div>
                  </div>

                  {/* Points Value */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Valeur des points</span>
                    <span className="font-medium">{scannedCard.points_value.toLocaleString('fr-FR')} GNF</span>
                  </div>

                  {/* Tier Discount */}
                  {scannedCard.tier_discount_percent > 0 && (
                    <div className="flex items-center justify-between text-sm p-2 bg-purple-50 rounded-lg">
                      <span className="text-purple-600">Réduction {scannedCard.tier_name}</span>
                      <span className="font-medium text-purple-700">-{scannedCard.tier_discount_percent}%</span>
                    </div>
                  )}

                  {/* Redeem Points */}
                  {saleAmount > 0 && scannedCard.can_redeem && (
                    <div className="pt-4 border-t space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Utiliser des points</span>
                        <span className="text-xs text-gray-500">Max: {maxRedeemablePoints} pts</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={0}
                          max={maxRedeemablePoints}
                          value={redeemPoints}
                          onChange={(e) => setRedeemPoints(Math.min(parseInt(e.target.value) || 0, maxRedeemablePoints))}
                          className="flex-1 px-3 py-2 border rounded-lg"
                          placeholder="Points à utiliser"
                        />
                        <button
                          onClick={handleRedeem}
                          disabled={redeemPoints <= 0}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          <Gift size={16} />
                          Utiliser
                        </button>
                      </div>
                      {redeemPoints > 0 && (
                        <div className="text-sm text-gray-500">
                          Réduction: <span className="font-medium text-purple-600">
                            {(redeemPoints * scannedCard.points_value).toLocaleString('fr-FR')} GNF
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
