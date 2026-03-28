import { useEffect, useState, useRef, useCallback } from 'react'
import { 
  Search, Trash2, Plus, Minus, CreditCard, Smartphone, Banknote, Check,
  ScanBarcode, Printer, Receipt, Globe, ChevronDown, X, User, AlertCircle,
  DollarSign, ArrowRightLeft, Package, Gift, Star
} from 'lucide-react'
import api from '../../lib/api'
import { useCartStore } from '../../store/cart'
import { useCurrencyStore } from '../../store/currency'
import { useLoyaltyStore, type CardLookupResult } from '../../store/loyalty'
import { CURRENCIES, formatCurrency, convertCurrency, type Currency } from '../../lib/currency'
import { validateBarcode, generateEAN13, generateProductBarcode } from '../../lib/barcode'
import { generateReceiptHTML, generateReceiptNumber, printReceipt, type ReceiptData } from '../../lib/receipt'
import toast from 'react-hot-toast'

const fmt = (n: number, currency: string = 'GNF') => formatCurrency(n, currency)

export default function POSPage() {
  // États
  const [products, setProducts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [stores, setStores] = useState<any[]>([])
  const [selectedStore, setSelectedStore] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MOBILE_MONEY' | 'CARD'>('CASH')
  const [discount, setDiscount] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [lastSale, setLastSale] = useState<any>(null)
  
  // Scanner
  const [showScanner, setShowScanner] = useState(false)
  const [scannerMode, setScannerMode] = useState<'camera' | 'manual'>('manual')
  const [manualBarcode, setManualBarcode] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  
  // Multi-devises
  const [showCurrencySelector, setShowCurrencySelector] = useState(false)
  const [showExchangeCalculator, setShowExchangeCalculator] = useState(false)
  const [exchangeAmount, setExchangeAmount] = useState(0)
  const [exchangeFromCurrency, setExchangeFromCurrency] = useState('GNF')
  const [exchangeToCurrency, setExchangeToCurrency] = useState('EUR')
  
  // Client
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customers, setCustomers] = useState<any[]>([])
  
  // Loyalty
  const [showLoyaltyScanner, setShowLoyaltyScanner] = useState(false)
  const [loyaltyCardNumber, setLoyaltyCardNumber] = useState('')
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(0)
  
  // Reçu
  const [showReceipt, setShowReceipt] = useState(false)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  
  // Stores
  const cart = useCartStore()
  const currencyStore = useCurrencyStore()
  const activeCurrency = currencyStore.activeCurrency
  const { scannedCard, scannedCardLoading, lookupCard, clearScannedCard, earnPoints, redeemPoints } = useLoyaltyStore()

  // Fonction pour réinitialiser la carte fidélité
  const resetLoyalty = () => {
    clearScannedCard()
    setLoyaltyDiscount(0)
  }

  // Calcul du total avec remise fidélité
  const totalWithLoyalty = Math.max(0, totalWithDiscount - loyaltyDiscount)

  // Charger les magasins
  useEffect(() => {
    api.get('/stores').then(r => {
      setStores(r.data)
      if (r.data.length > 0) { 
        setSelectedStore(r.data[0].id)
        cart.setStore(r.data[0].id)
      }
    })
  }, [])

  // Charger les produits
  useEffect(() => {
    if (!selectedStore) return
    api.get('/products', { params: { store_id: selectedStore, size: 100, search: search || undefined } })
      .then(r => setProducts(r.data.items || []))
  }, [selectedStore, search])

  // Charger les clients
  useEffect(() => {
    if (!showCustomerSearch) return
    api.get('/customers', { params: { search: customerSearch || undefined, size: 20 } })
      .then(r => setCustomers(r.data.items || []))
      .catch(() => setCustomers([]))
  }, [customerSearch, showCustomerSearch])

  // Recherche par code-barres
  const lookupBarcode = async (code: string) => {
    if (!code.trim()) return
    const validation = validateBarcode(code)
    if (!validation.isValid) {
      toast.error(`Code-barres invalide: ${code}`)
      return
    }
    try {
      const { data } = await api.get(`/products/barcode/${code.trim()}`)
      cart.addItem(data)
      toast.success(`${data.name} ajouté au panier`)
      setSearch('')
      setManualBarcode('')
    } catch { 
      toast.error(`Produit introuvable: ${code}`) 
    }
  }

  // Scanner avec la caméra
  const startCameraScan = useCallback(async () => {
    if (!videoRef.current) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      videoRef.current.srcObject = stream
      videoRef.current.play()
      setScannerMode('camera')
    } catch {
      toast.error('Impossible d\'accéder à la caméra')
      setScannerMode('manual')
    }
  }, [])

  // Arrêter le scanner
  const stopScanner = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setShowScanner(false)
    setManualBarcode('')
  }, [])

  // Traiter la vente
  const processSale = async () => {
    if (cart.items.length === 0) { toast.error('Panier vide'); return }
    if (!selectedStore) { toast.error('Sélectionnez un magasin'); return }
    setProcessing(true)
    try {
      const { data } = await api.post('/sales', {
        store_id: selectedStore,
        items: cart.items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        payment_method: paymentMethod,
        discount_amount: discount,
        currency: activeCurrency.code,
        customer_id: selectedCustomer?.id,
      })
      setLastSale(data)
      
      // Générer le reçu
      const store = stores.find(s => s.id === selectedStore)
      const receipt: ReceiptData = {
        storeName: store?.name || 'SavanaFlow',
        storeAddress: store?.address || 'Conakry, Guinée',
        storePhone: store?.phone,
        receiptNumber: data.sale_number || generateReceiptNumber(),
        date: new Date(),
        cashier: 'Caissier',
        customerName: selectedCustomer?.name,
        customerPhone: selectedCustomer?.phone,
        items: cart.items.map(i => ({
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unit_price,
          taxRate: i.tax_rate,
          lineTotal: i.line_total,
          barcode: i.barcode ?? undefined
        })),
        subtotal: cart.subtotal(),
        taxAmount: cart.tax(),
        discountAmount: discount,
        total: cart.total() - discount,
        paymentMethod: paymentMethod,
        currency: activeCurrency.code,
        loyaltyPointsEarned: data.loyalty_points_earned,
        footer: 'Merci de votre fidélité!'
      }
      
      setReceiptData(receipt)
      setShowReceipt(true)
      
      cart.clear()
      setDiscount(0)
      setSelectedCustomer(null)
      toast.success(`Vente ${data.sale_number} enregistrée !`)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Erreur lors de la vente')
    } finally { setProcessing(false) }
  }

  // Calculs
  const subtotal = cart.subtotal()
  const taxAmount = cart.tax()
  const totalBeforeDiscount = cart.total()
  const totalWithDiscount = Math.max(0, totalBeforeDiscount - discount)
  
  // Conversion pour affichage
  const displayTotal = activeCurrency.code === 'GNF' 
    ? totalWithDiscount 
    : convertCurrency(totalWithDiscount, 'GNF', activeCurrency.code)

  // Conversion de devises
  const convertedAmount = convertCurrency(exchangeAmount, exchangeFromCurrency, exchangeToCurrency)

  // Imprimer le reçu
  const handlePrintReceipt = () => {
    if (receiptData) {
      printReceipt(receiptData)
    }
  }

  return (
    <div className="h-[calc(100vh-96px)] grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4">
      {/* PARTIE GAUCHE: Catalogue produits */}
      <div className="flex flex-col gap-3">
        {/* Barre d'outils */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Sélecteur de magasin */}
          <select 
            value={selectedStore || ''} 
            onChange={e => { const v = +e.target.value; setSelectedStore(v); cart.setStore(v) }}
            className="min-w-[160px] px-3 py-2 border rounded-lg bg-white text-sm"
          >
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          
          {/* Sélecteur de devise */}
          <div className="relative">
            <button 
              onClick={() => setShowCurrencySelector(!showCurrencySelector)}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-white text-sm hover:bg-gray-50"
            >
              <Globe size={16} />
              <span>{activeCurrency.flag} {activeCurrency.code}</span>
              <ChevronDown size={14} />
            </button>
            
            {showCurrencySelector && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                <div className="p-2 border-b bg-gray-50 flex justify-between items-center">
                  <span className="text-xs font-medium">Sélectionner une devise</span>
                  <button onClick={() => setShowCurrencySelector(false)}><X size={14} /></button>
                </div>
                {CURRENCIES.map(c => (
                  <button
                    key={c.code}
                    onClick={() => { currencyStore.setActiveCurrency(c.code); setShowCurrencySelector(false) }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${activeCurrency.code === c.code ? 'bg-blue-50 text-blue-600' : ''}`}
                  >
                    <span className="text-lg">{c.flag}</span>
                    <span className="flex-1">{c.name}</span>
                    <span className="text-gray-400">{c.symbol}</span>
                    {c.isDefault && <span className="text-xs bg-green-100 text-green-600 px-1 rounded">Défaut</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Convertisseur de devises */}
          <button 
            onClick={() => setShowExchangeCalculator(!showExchangeCalculator)}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-white text-sm hover:bg-gray-50"
          >
            <ArrowRightLeft size={16} />
            <span>Convertir</span>
          </button>
          
          {/* Scanner */}
          <button 
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-white text-sm hover:bg-gray-50"
          >
            <ScanBarcode size={16} />
            <span>Scanner</span>
          </button>
          
          {/* Recherche */}
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={barcodeInputRef}
              placeholder="Rechercher ou scanner code-barres..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') lookupBarcode(search) }}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>

        {/* Calculateur de change */}
        {showExchangeCalculator && (
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium flex items-center gap-2">
                <DollarSign size={16} />
                Convertisseur de devises
              </h3>
              <button onClick={() => setShowExchangeCalculator(false)}><X size={16} /></button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500">Montant</label>
                <input
                  type="number"
                  value={exchangeAmount}
                  onChange={e => setExchangeAmount(+e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
                />
              </div>
              <div className="w-32">
                <label className="text-xs text-gray-500">De</label>
                <select
                  value={exchangeFromCurrency}
                  onChange={e => setExchangeFromCurrency(e.target.value)}
                  className="w-full px-2 py-2 border rounded-lg text-sm mt-1"
                >
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                </select>
              </div>
              <ArrowRightLeft size={20} className="text-gray-400 mt-5" />
              <div className="w-32">
                <label className="text-xs text-gray-500">Vers</label>
                <select
                  value={exchangeToCurrency}
                  onChange={e => setExchangeToCurrency(e.target.value)}
                  className="w-full px-2 py-2 border rounded-lg text-sm mt-1"
                >
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-3 p-3 bg-gray-50 rounded-lg text-center">
              <span className="text-2xl font-bold">{formatCurrency(convertedAmount, exchangeToCurrency)}</span>
            </div>
          </div>
        )}

        {/* Modal Scanner */}
        {showScanner && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <ScanBarcode size={20} />
                  Scanner un code-barres
                </h3>
                <button onClick={stopScanner} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
              </div>
              
              {/* Onglets */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setScannerMode('manual')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium ${scannerMode === 'manual' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}`}
                >
                  Saisie manuelle
                </button>
                <button
                  onClick={() => startCameraScan()}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium ${scannerMode === 'camera' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}`}
                >
                  Caméra
                </button>
              </div>
              
              {scannerMode === 'manual' ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={manualBarcode}
                    onChange={e => setManualBarcode(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { lookupBarcode(manualBarcode); stopScanner() } }}
                    placeholder="Entrez le code-barres..."
                    className="w-full px-4 py-3 border rounded-lg text-lg font-mono"
                    autoFocus
                  />
                  <button
                    onClick={() => { lookupBarcode(manualBarcode); stopScanner() }}
                    disabled={!manualBarcode}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
                  >
                    Ajouter au panier
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-48 h-32 border-2 border-white/50 rounded-lg" />
                    </div>
                  </div>
                  <p className="text-center text-sm text-gray-500">
                    Placez le code-barres dans le cadre
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Grille produits */}
        <div className="flex-1 overflow-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 content-start">
          {products.map(p => (
            <button 
              key={p.id} 
              onClick={() => cart.addItem(p)} 
              className={`bg-white border rounded-xl p-3 text-left transition-all hover:shadow-md hover:border-blue-300 ${p.is_low_stock ? 'border-orange-300' : 'border-gray-200'}`}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="font-medium text-sm text-gray-900 line-clamp-2">{p.name}</div>
                {p.barcode && <Package size={12} className="text-gray-400 flex-shrink-0" />}
              </div>
              {p.category && <div className="text-xs text-gray-500 mt-1">{p.category}</div>}
              <div className="mt-2 font-semibold text-blue-600">{fmt(p.sell_price, activeCurrency.code)}</div>
              <div className={`text-xs mt-1 ${p.is_low_stock ? 'text-orange-500' : 'text-gray-400'}`}>
                Stock: {p.stock_quantity} {p.unit}
              </div>
            </button>
          ))}
          {products.length === 0 && (
            <div className="col-span-full py-16 text-center text-gray-500">
              <Package size={48} className="mx-auto mb-2 opacity-20" />
              <p>Aucun produit trouvé</p>
            </div>
          )}
        </div>
      </div>

      {/* PARTIE DROITE: Panier + Paiement */}
      <div className="flex flex-col bg-white border rounded-xl overflow-hidden">
        {/* En-tête panier */}
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold">
            Panier ({cart.items.length} article{cart.items.length !== 1 ? 's' : ''})
          </h2>
          <div className="flex items-center gap-2">
            {/* Loyalty */}
            <button
              onClick={() => setShowLoyaltyScanner(true)}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg ${scannedCard ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}
            >
              <Gift size={14} />
              {scannedCard ? (
                <span className="flex items-center gap-1">
                  <Star size={12} className="fill-current" />
                  {scannedCard.points_balance}
                </span>
              ) : 'Fidélité'}
            </button>
            {/* Client */}
            <button
              onClick={() => setShowCustomerSearch(true)}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg ${selectedCustomer ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
            >
              <User size={14} />
              {selectedCustomer ? selectedCustomer.name : 'Client'}
            </button>
            {cart.items.length > 0 && (
              <button onClick={() => cart.clear()} className="text-xs text-red-500 hover:underline">
                Vider
              </button>
            )}
          </div>
        </div>

        {/* Modal Fidélité */}
        {showLoyaltyScanner && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Gift size={20} className="text-purple-600" />
                  Scanner carte fidélité
                </h3>
                <button onClick={() => { setShowLoyaltyScanner(false); }} className="p-1 hover:bg-gray-100 rounded">
                  <X size={20} />
                </button>
              </div>
              
              <div className="relative mb-4">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Entrez le numéro de carte..."
                  value={loyaltyCardNumber}
                  onChange={(e) => setLoyaltyCardNumber(e.target.value.toUpperCase())}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && loyaltyCardNumber.trim()) {
                      const result = await lookupCard(loyaltyCardNumber.trim())
                      if (result) {
                        setLoyaltyCardNumber('')
                      }
                    }
                  }}
                  className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono"
                  autoFocus
                />
              </div>

              <button
                onClick={async () => {
                  if (loyaltyCardNumber.trim()) {
                    const result = await lookupCard(loyaltyCardNumber.trim())
                    if (result) {
                      setLoyaltyCardNumber('')
                    }
                  }
                }}
                disabled={scannedCardLoading || !loyaltyCardNumber.trim()}
                className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {scannedCardLoading ? 'Recherche...' : 'Rechercher'}
              </button>

              {/* Card Result */}
              {scannedCard && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-3">
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

                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div className="flex items-center gap-2">
                      <Star size={20} className="text-yellow-500 fill-yellow-500" />
                      <span className="text-gray-600">Points disponibles</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">{scannedCard.points_balance}</div>
                  </div>

                  {scannedCard.tier_discount_percent > 0 && (
                    <div className="flex items-center justify-between text-sm p-2 bg-purple-50 rounded-lg">
                      <span className="text-purple-600">Réduction {scannedCard.tier_name}</span>
                      <span className="font-medium text-purple-700">-{scannedCard.tier_discount_percent}%</span>
                    </div>
                  )}

                  {/* Redeem Points */}
                  {scannedCard.can_redeem && totalWithDiscount > 0 && (
                    <div className="pt-3 border-t">
                      <div className="text-sm text-gray-600 mb-2">
                        Utiliser des points (valeur: {scannedCard.points_value.toLocaleString('fr-FR')} GNF)
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={0}
                          max={Math.min(scannedCard.points_balance, Math.floor(totalWithDiscount * 0.5 / scannedCard.points_value))}
                          placeholder="Points"
                          className="flex-1 px-3 py-2 border rounded-lg text-sm"
                          onChange={(e) => {
                            const pts = parseInt(e.target.value) || 0
                            const maxPts = Math.min(scannedCard.points_balance, Math.floor(totalWithDiscount * 0.5 / scannedCard.points_value))
                            const validPts = Math.min(pts, maxPts)
                            setLoyaltyDiscount(validPts * scannedCard.points_value)
                          }}
                        />
                        <button
                          onClick={() => setShowLoyaltyScanner(false)}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                        >
                          Appliquer
                        </button>
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={resetLoyalty}
                    className="w-full text-sm text-red-600 hover:underline py-2"
                  >
                    Retirer la carte
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal recherche client */}
        {showCustomerSearch && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Rechercher un client</h3>
                <button onClick={() => setShowCustomerSearch(false)}><X size={20} /></button>
              </div>
              <input
                placeholder="Nom ou téléphone..."
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg mb-4"
              />
              <div className="max-h-64 overflow-auto">
                {customers.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedCustomer(c); setShowCustomerSearch(false) }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 rounded-lg flex items-center gap-3"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <User size={18} className="text-gray-400" />
                    </div>
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-sm text-gray-500">{c.phone}</div>
                    </div>
                  </button>
                ))}
                {customers.length === 0 && (
                  <p className="text-center text-gray-500 py-8">Aucun client trouvé</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Articles du panier */}
        <div className="flex-1 overflow-auto">
          {cart.items.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <ScanBarcode size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Scannez ou cliquez sur un produit</p>
            </div>
          ) : (
            <div className="divide-y">
              {cart.items.map(item => (
                <div key={item.product_id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.name}</div>
                      {item.barcode && (
                        <div className="text-xs text-gray-400 font-mono">{item.barcode}</div>
                      )}
                    </div>
                    <button onClick={() => cart.removeItem(item.product_id)} className="text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => cart.updateQty(item.product_id, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg border flex items-center justify-center hover:bg-gray-50"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button 
                        onClick={() => cart.updateQty(item.product_id, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg border flex items-center justify-center hover:bg-gray-50"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <span className="font-medium">{fmt(item.line_total, activeCurrency.code)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totaux */}
        <div className="border-t px-4 py-3 space-y-2">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Sous-total</span>
            <span>{fmt(subtotal, activeCurrency.code)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>TVA</span>
            <span>{fmt(taxAmount, activeCurrency.code)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm text-gray-500">Remise</label>
            <input 
              type="number" 
              min="0" 
              value={discount} 
              onChange={e => setDiscount(+e.target.value)} 
              className="w-24 px-2 py-1 border rounded text-right text-sm"
            />
          </div>
          {loyaltyDiscount > 0 && (
            <div className="flex justify-between text-sm text-purple-600">
              <span className="flex items-center gap-1">
                <Gift size={14} />
                Fidélité
              </span>
              <span>-{fmt(loyaltyDiscount, activeCurrency.code)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>Total</span>
            <span className="text-blue-600">{fmt(totalWithLoyalty, activeCurrency.code)}</span>
          </div>
        </div>

        {/* Mode de paiement */}
        <div className="px-4 pb-3">
          <div className="text-xs text-gray-500 mb-2">Mode de paiement</div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'CASH', icon: Banknote, label: 'Espèces' },
              { key: 'MOBILE_MONEY', icon: Smartphone, label: 'Mobile' },
              { key: 'CARD', icon: CreditCard, label: 'Carte' },
            ].map(({ key, icon: Icon, label }) => (
              <button 
                key={key} 
                onClick={() => setPaymentMethod(key as any)} 
                className={`flex flex-col items-center gap-1 py-2 rounded-lg border transition-all ${
                  paymentMethod === key 
                    ? 'border-blue-500 bg-blue-50 text-blue-600' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon size={18} />
                <span className="text-xs">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bouton de paiement */}
        <div className="px-4 pb-4">
          <button 
            onClick={processSale} 
            disabled={processing || cart.items.length === 0} 
            className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
              cart.items.length === 0 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Check size={18} />
            {processing ? 'Traitement...' : `Encaisser ${fmt(totalWithDiscount, activeCurrency.code)}`}
          </button>
        </div>

        {/* Dernière vente */}
        {lastSale && !showReceipt && (
          <div className="mx-4 mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-green-700">Vente enregistrée</div>
                <div className="text-sm text-green-600">{lastSale.sale_number}</div>
              </div>
              <button 
                onClick={() => setShowReceipt(true)}
                className="flex items-center gap-1 px-3 py-1 bg-white border rounded-lg text-sm hover:bg-gray-50"
              >
                <Receipt size={14} />
                Reçu
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Reçu */}
      {showReceipt && receiptData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
              <h3 className="font-semibold">Reçu de paiement</h3>
              <button onClick={() => setShowReceipt(false)}><X size={20} /></button>
            </div>
            <div 
              className="p-4"
              dangerouslySetInnerHTML={{ __html: generateReceiptHTML(receiptData).replace(/<script[\s\S]*?<\/script>/gi, '') }}
            />
            <div className="sticky bottom-0 bg-white border-t px-4 py-3 flex gap-2">
              <button 
                onClick={handlePrintReceipt}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2"
              >
                <Printer size={16} />
                Imprimer
              </button>
              <button 
                onClick={() => setShowReceipt(false)}
                className="flex-1 py-2 border rounded-lg"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
