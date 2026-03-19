/**
 * Système de génération de reçus pour SavanaFlow
 * Support: Impression thermique, PDF, Email, WhatsApp
 */

import { CURRENCIES, formatCurrency } from './currency'

export interface ReceiptItem {
  name: string
  quantity: number
  unitPrice: number
  taxRate: number
  lineTotal: number
  barcode?: string
}

export interface ReceiptData {
  // En-tête
  storeName: string
  storeAddress: string
  storePhone?: string
  storeEmail?: string
  receiptNumber: string
  date: Date
  cashier: string
  
  // Client (optionnel)
  customerName?: string
  customerPhone?: string
  
  // Articles
  items: ReceiptItem[]
  
  // Totaux
  subtotal: number
  taxAmount: number
  discountAmount: number
  total: number
  
  // Paiement
  paymentMethod: 'CASH' | 'MOBILE_MONEY' | 'CARD' | 'MIXED'
  paymentReference?: string
  amountReceived?: number
  change?: number
  
  // Devise
  currency: string
  
  // Fidélité
  loyaltyPointsEarned?: number
  loyaltyPointsUsed?: number
  loyaltyBalance?: number
  
  // Pied de page
  footer?: string
  taxNumber?: string
  qrCode?: string
}

/**
 * Génère le texte du reçu pour impression thermique (58mm/80mm)
 */
export function generateThermalReceipt(data: ReceiptData, width: '58mm' | '80mm' = '80mm'): string {
  const lineWidth = width === '58mm' ? 32 : 48
  const separator = '─'.repeat(lineWidth)
  const doubleSeparator = '═'.repeat(lineWidth)
  
  const center = (text: string) => {
    const padding = Math.max(0, Math.floor((lineWidth - text.length) / 2))
    return ' '.repeat(padding) + text
  }
  
  const right = (text: string) => {
    const padding = Math.max(0, lineWidth - text.length)
    return ' '.repeat(padding) + text
  }
  
  const formatPrice = (amount: number) => formatCurrency(amount, data.currency)
  
  let receipt = ''
  
  // En-tête
  receipt += center(data.storeName) + '\n'
  receipt += center(data.storeAddress) + '\n'
  if (data.storePhone) receipt += center(`Tél: ${data.storePhone}`) + '\n'
  receipt += separator + '\n'
  
  // Infos ticket
  receipt += `Ticket: ${data.receiptNumber}\n`
  receipt += `Date: ${formatDate(data.date)}\n`
  receipt += `Caissier: ${data.cashier}\n`
  
  if (data.customerName) {
    receipt += separator + '\n'
    receipt += `Client: ${data.customerName}\n`
    if (data.customerPhone) receipt += `Tél: ${data.customerPhone}\n`
  }
  
  receipt += doubleSeparator + '\n'
  
  // Articles
  receipt += 'ARTICLE                QTE     PRIX   TOTAL\n'
  receipt += separator + '\n'
  
  for (const item of data.items) {
    // Nom de l'article (tronqué si nécessaire)
    const name = item.name.length > 20 ? item.name.slice(0, 18) + '..' : item.name
    receipt += name + '\n'
    
    // Ligne quantité/prix
    const qty = item.quantity.toString().padStart(4)
    const price = formatPrice(item.unitPrice).padStart(8)
    const total = formatPrice(item.lineTotal).padStart(10)
    receipt += `                    ${qty} ${price} ${total}\n`
  }
  
  receipt += separator + '\n'
  
  // Totaux
  receipt += right(`Sous-total: ${formatPrice(data.subtotal)}`) + '\n'
  if (data.taxAmount > 0) {
    receipt += right(`TVA: ${formatPrice(data.taxAmount)}`) + '\n'
  }
  if (data.discountAmount > 0) {
    receipt += right(`Remise: -${formatPrice(data.discountAmount)}`) + '\n'
  }
  
  receipt += doubleSeparator + '\n'
  receipt += right(`TOTAL: ${formatPrice(data.total)}`) + '\n'
  receipt += doubleSeparator + '\n'
  
  // Paiement
  const paymentLabels: Record<string, string> = {
    CASH: 'Espèces',
    MOBILE_MONEY: 'Mobile Money',
    CARD: 'Carte Bancaire',
    MIXED: 'Paiement Mixte'
  }
  
  receipt += `Paiement: ${paymentLabels[data.paymentMethod]}\n`
  
  if (data.paymentMethod === 'CASH') {
    if (data.amountReceived) {
      receipt += right(`Reçu: ${formatPrice(data.amountReceived)}`) + '\n'
      if (data.change && data.change > 0) {
        receipt += right(`Rendu: ${formatPrice(data.change)}`) + '\n'
      }
    }
  } else if (data.paymentReference) {
    receipt += `Réf: ${data.paymentReference}\n`
  }
  
  // Fidélité
  if (data.loyaltyPointsEarned || data.loyaltyPointsUsed) {
    receipt += separator + '\n'
    receipt += 'PROGRAMME FIDÉLITÉ\n'
    if (data.loyaltyPointsUsed) {
      receipt += `Points utilisés: ${data.loyaltyPointsUsed}\n`
    }
    if (data.loyaltyPointsEarned) {
      receipt += `Points gagnés: ${data.loyaltyPointsEarned}\n`
    }
    if (data.loyaltyBalance) {
      receipt += `Solde points: ${data.loyaltyBalance}\n`
    }
  }
  
  // Pied de page
  receipt += separator + '\n'
  if (data.footer) {
    receipt += center(data.footer) + '\n'
  }
  receipt += center('Merci de votre visite!') + '\n'
  receipt += center('À bientôt') + '\n'
  
  if (data.taxNumber) {
    receipt += center(`NIF: ${data.taxNumber}`) + '\n'
  }
  
  receipt += '\n\n'
  
  return receipt
}

/**
 * Génère le HTML du reçu pour affichage/impression
 */
export function generateReceiptHTML(data: ReceiptData): string {
  const formatPrice = (amount: number) => formatCurrency(amount, data.currency)
  
  const paymentLabels: Record<string, string> = {
    CASH: 'Espèces',
    MOBILE_MONEY: 'Mobile Money',
    CARD: 'Carte Bancaire',
    MIXED: 'Paiement Mixte'
  }
  
  const paymentIcons: Record<string, string> = {
    CASH: '💵',
    MOBILE_MONEY: '📱',
    CARD: '💳',
    MIXED: '💰'
  }
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reçu ${data.receiptNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      background: #f5f5f5;
      padding: 20px;
      display: flex;
      justify-content: center;
    }
    .receipt {
      width: 300px;
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 2px dashed #ddd;
      padding-bottom: 15px;
      margin-bottom: 15px;
    }
    .store-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .store-address {
      font-size: 12px;
      color: #666;
    }
    .meta {
      font-size: 11px;
      margin-bottom: 15px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
    }
    .customer-info {
      background: #f9f9f9;
      padding: 8px;
      border-radius: 4px;
      margin-bottom: 15px;
      font-size: 11px;
    }
    .items {
      border-top: 1px dashed #ddd;
      border-bottom: 1px dashed #ddd;
      padding: 10px 0;
      margin-bottom: 15px;
    }
    .item {
      margin-bottom: 8px;
    }
    .item-name {
      font-size: 12px;
      font-weight: bold;
    }
    .item-details {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #666;
    }
    .totals {
      margin-bottom: 15px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 3px;
    }
    .total-row.grand-total {
      font-size: 16px;
      font-weight: bold;
      border-top: 2px solid #333;
      padding-top: 8px;
      margin-top: 8px;
    }
    .payment {
      background: #e8f5e9;
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 15px;
    }
    .payment-method {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: bold;
    }
    .loyalty {
      background: #fff3e0;
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 15px;
      font-size: 11px;
    }
    .footer {
      text-align: center;
      font-size: 11px;
      color: #666;
      padding-top: 15px;
      border-top: 1px dashed #ddd;
    }
    .barcode {
      text-align: center;
      margin: 15px 0;
    }
    .barcode-text {
      font-family: 'Libre Barcode 39', cursive;
      font-size: 48px;
    }
    .actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }
    .btn {
      flex: 1;
      padding: 10px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: bold;
    }
    .btn-print {
      background: #2196f3;
      color: white;
    }
    .btn-whatsapp {
      background: #25d366;
      color: white;
    }
    @media print {
      body { background: white; padding: 0; }
      .receipt { box-shadow: none; }
      .actions { display: none; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="store-name">${data.storeName}</div>
      <div class="store-address">${data.storeAddress}</div>
      ${data.storePhone ? `<div class="store-address">Tél: ${data.storePhone}</div>` : ''}
    </div>
    
    <div class="meta">
      <div class="meta-row">
        <span>Ticket N°:</span>
        <span>${data.receiptNumber}</span>
      </div>
      <div class="meta-row">
        <span>Date:</span>
        <span>${formatDate(data.date)}</span>
      </div>
      <div class="meta-row">
        <span>Caissier:</span>
        <span>${data.cashier}</span>
      </div>
    </div>
    
    ${data.customerName ? `
    <div class="customer-info">
      <strong>Client:</strong> ${data.customerName}<br>
      ${data.customerPhone ? `<strong>Tél:</strong> ${data.customerPhone}` : ''}
    </div>
    ` : ''}
    
    <div class="items">
      ${data.items.map(item => `
      <div class="item">
        <div class="item-name">${item.name}</div>
        <div class="item-details">
          <span>${item.quantity} x ${formatPrice(item.unitPrice)}</span>
          <span>${formatPrice(item.lineTotal)}</span>
        </div>
      </div>
      `).join('')}
    </div>
    
    <div class="totals">
      <div class="total-row">
        <span>Sous-total</span>
        <span>${formatPrice(data.subtotal)}</span>
      </div>
      ${data.taxAmount > 0 ? `
      <div class="total-row">
        <span>TVA</span>
        <span>${formatPrice(data.taxAmount)}</span>
      </div>
      ` : ''}
      ${data.discountAmount > 0 ? `
      <div class="total-row">
        <span>Remise</span>
        <span>-${formatPrice(data.discountAmount)}</span>
      </div>
      ` : ''}
      <div class="total-row grand-total">
        <span>TOTAL</span>
        <span>${formatPrice(data.total)}</span>
      </div>
    </div>
    
    <div class="payment">
      <div class="payment-method">
        <span>${paymentIcons[data.paymentMethod]}</span>
        <span>${paymentLabels[data.paymentMethod]}</span>
      </div>
      ${data.paymentMethod === 'CASH' && data.amountReceived ? `
      <div class="total-row" style="margin-top: 8px;">
        <span>Reçu</span>
        <span>${formatPrice(data.amountReceived)}</span>
      </div>
      ${data.change && data.change > 0 ? `
      <div class="total-row">
        <span>Rendu</span>
        <span>${formatPrice(data.change)}</span>
      </div>
      ` : ''}
      ` : ''}
      ${data.paymentReference ? `
      <div style="font-size: 10px; margin-top: 5px; color: #666;">
        Réf: ${data.paymentReference}
      </div>
      ` : ''}
    </div>
    
    ${data.loyaltyPointsEarned || data.loyaltyPointsUsed ? `
    <div class="loyalty">
      <strong>🎁 Programme Fidélité</strong><br>
      ${data.loyaltyPointsUsed ? `Points utilisés: ${data.loyaltyPointsUsed}<br>` : ''}
      ${data.loyaltyPointsEarned ? `Points gagnés: ${data.loyaltyPointsEarned}<br>` : ''}
      ${data.loyaltyBalance ? `Solde: ${data.loyaltyBalance} points` : ''}
    </div>
    ` : ''}
    
    <div class="footer">
      ${data.footer ? `<p>${data.footer}</p>` : ''}
      <p>Merci de votre visite!</p>
      <p>À bientôt</p>
      ${data.taxNumber ? `<p style="margin-top: 10px;">NIF: ${data.taxNumber}</p>` : ''}
    </div>
    
    <div class="actions">
      <button class="btn btn-print" onclick="window.print()">
        🖨️ Imprimer
      </button>
      <button class="btn btn-whatsapp" onclick="sendWhatsApp()">
        📱 WhatsApp
      </button>
    </div>
  </div>
  
  <script>
    function sendWhatsApp() {
      const text = encodeURIComponent(generateReceiptText());
      window.open('https://wa.me/?text=' + text, '_blank');
    }
    
    function generateReceiptText() {
      return \`${data.storeName}\\n${data.storeAddress}\\nTicket: ${data.receiptNumber}\\nTotal: ${formatPrice(data.total)}\\nMerci de votre visite!\`;
    }
  </script>
</body>
</html>
`
}

/**
 * Génère un PDF de reçu (format base64)
 */
export async function generateReceiptPDF(data: ReceiptData): Promise<string> {
  // Cette fonction nécessiterait une bibliothèque comme jsPDF
  // Pour l'instant, on retourne le HTML qui peut être imprimé en PDF
  return generateReceiptHTML(data)
}

/**
 * Formatte une date pour le reçu
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-GN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

/**
 * Génère un numéro de reçu unique
 */
export function generateReceiptNumber(storeCode: string = 'GN'): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
  return `${storeCode}${year}${month}${day}-${random}`
}

/**
 * Ouvre le reçu dans une nouvelle fenêtre pour impression
 */
export function printReceipt(data: ReceiptData): void {
  const html = generateReceiptHTML(data)
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
  }
}
