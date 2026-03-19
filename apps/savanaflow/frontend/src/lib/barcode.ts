/**
 * Utilitaires pour les codes-barres
 * Support: EAN-13, EAN-8, UPC-A, Code128, QR Code
 */

export type BarcodeType = 'EAN13' | 'EAN8' | 'UPC' | 'CODE128' | 'QRCODE'

export interface BarcodeResult {
  type: BarcodeType
  code: string
  isValid: boolean
  format: string
}

/**
 * Génère un code-barres EAN-13 valide
 */
export function generateEAN13(prefix: string = '612'): string {
  // Préfixe 612-614 pour la Guinée (Code Pays OBI)
  const base = prefix + Math.random().toString().slice(2, 11).slice(0, 9)
  const checksum = calculateEAN13Checksum(base)
  return base + checksum
}

/**
 * Calcule le checksum EAN-13
 */
export function calculateEAN13Checksum(code: string): string {
  if (code.length !== 12) {
    // Padding si nécessaire
    code = code.padStart(12, '0').slice(0, 12)
  }
  
  let sum = 0
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i], 10)
    sum += digit * (i % 2 === 0 ? 1 : 3)
  }
  const checksum = (10 - (sum % 10)) % 10
  return checksum.toString()
}

/**
 * Vérifie si un code EAN-13 est valide
 */
export function isValidEAN13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false
  const checksum = calculateEAN13Checksum(code.slice(0, 12))
  return checksum === code[12]
}

/**
 * Génère un code-barres EAN-8 valide
 */
export function generateEAN8(): string {
  const base = Math.floor(Math.random() * 10000000).toString().padStart(7, '0')
  const checksum = calculateEAN8Checksum(base)
  return base + checksum
}

/**
 * Calcule le checksum EAN-8
 */
export function calculateEAN8Checksum(code: string): string {
  if (code.length !== 7) {
    code = code.padStart(7, '0').slice(0, 7)
  }
  
  let sum = 0
  for (let i = 0; i < 7; i++) {
    const digit = parseInt(code[i], 10)
    sum += digit * (i % 2 === 0 ? 3 : 1)
  }
  const checksum = (10 - (sum % 10)) % 10
  return checksum.toString()
}

/**
 * Vérifie si un code EAN-8 est valide
 */
export function isValidEAN8(code: string): boolean {
  if (!/^\d{8}$/.test(code)) return false
  const checksum = calculateEAN8Checksum(code.slice(0, 7))
  return checksum === code[7]
}

/**
 * Génère un code CODE128
 */
export function generateCode128(prefix: string = 'GN'): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${prefix}${timestamp}${random}`
}

/**
 * Détecte automatiquement le type de code-barres
 */
export function detectBarcodeType(code: string): BarcodeType {
  const cleanCode = code.trim()
  
  if (/^\d{13}$/.test(cleanCode)) {
    return isValidEAN13(cleanCode) ? 'EAN13' : 'EAN13' // Return type even if invalid
  }
  if (/^\d{8}$/.test(cleanCode)) {
    return 'EAN8'
  }
  if (/^\d{12}$/.test(cleanCode)) {
    return 'UPC'
  }
  if (cleanCode.length <= 48 && /^[A-Za-z0-9\-\.\$\/\+\%\: ]+$/.test(cleanCode)) {
    return 'CODE128'
  }
  return 'CODE128'
}

/**
 * Valide un code-barres
 */
export function validateBarcode(code: string): BarcodeResult {
  const cleanCode = code.trim()
  const type = detectBarcodeType(cleanCode)
  
  let isValid = false
  let format = ''
  
  switch (type) {
    case 'EAN13':
      isValid = isValidEAN13(cleanCode)
      format = 'EAN-13 (13 chiffres)'
      break
    case 'EAN8':
      isValid = isValidEAN8(cleanCode)
      format = 'EAN-8 (8 chiffres)'
      break
    case 'UPC':
      isValid = /^\d{12}$/.test(cleanCode)
      format = 'UPC-A (12 chiffres)'
      break
    case 'CODE128':
      isValid = cleanCode.length > 0 && cleanCode.length <= 48
      format = 'Code 128 (alphanumérique)'
      break
    default:
      isValid = false
      format = 'Format inconnu'
  }
  
  return { type, code: cleanCode, isValid, format }
}

/**
 * Génère un SKU unique pour un produit
 */
export function generateSKU(categoryCode: string = 'GEN'): string {
  const date = new Date()
  const yearCode = date.getFullYear().toString().slice(-2)
  const monthCode = (date.getMonth() + 1).toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
  return `${categoryCode}-${yearCode}${monthCode}-${random}`
}

/**
 * Génère un code-barres produit complet avec SKU
 */
export function generateProductBarcode(categoryCode?: string): {
  barcode: string
  sku: string
} {
  return {
    barcode: generateEAN13('612'), // Préfixe Guinée
    sku: generateSKU(categoryCode)
  }
}

/**
 * Formate un code-barres pour l'affichage
 */
export function formatBarcode(code: string, type: BarcodeType): string {
  switch (type) {
    case 'EAN13':
      return `${code.slice(0, 1)} ${code.slice(1, 7)} ${code.slice(7)}`
    case 'EAN8':
      return `${code.slice(0, 4)} ${code.slice(4)}`
    case 'UPC':
      return `${code.slice(0, 1)} ${code.slice(1, 6)} ${code.slice(6)}`
    default:
      return code
  }
}

/**
 * Classe pour gérer le scanner de code-barres via la caméra
 */
export class BarcodeScanner {
  private videoElement: HTMLVideoElement | null = null
  private canvas: HTMLCanvasElement | null = null
  private stream: MediaStream | null = null
  private scanning: boolean = false
  private onDetected: ((code: string) => void) | null = null
  private onError: ((error: string) => void) | null = null

  async start(
    videoElement: HTMLVideoElement,
    onDetected: (code: string) => void,
    onError?: (error: string) => void
  ): Promise<void> {
    this.videoElement = videoElement
    this.onDetected = onDetected
    this.onError = onError || null

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      
      this.videoElement.srcObject = this.stream
      await this.videoElement.play()
      
      this.canvas = document.createElement('canvas')
      this.scanning = true
      this.scanLoop()
    } catch (error) {
      this.onError?.('Impossible d\'accéder à la caméra. Vérifiez les permissions.')
    }
  }

  private scanLoop(): void {
    if (!this.scanning || !this.videoElement || !this.canvas) return

    const ctx = this.canvas.getContext('2d')
    if (!ctx) return

    const videoWidth = this.videoElement.videoWidth
    const videoHeight = this.videoElement.videoHeight

    if (videoWidth && videoHeight) {
      this.canvas.width = videoWidth
      this.canvas.height = videoHeight
      ctx.drawImage(this.videoElement, 0, 0, videoWidth, videoHeight)
      
      // Ici, on utiliserait une bibliothèque comme QuaggaJS ou ZXing
      // Pour la démo, on simule une détection
    }

    requestAnimationFrame(() => this.scanLoop())
  }

  stop(): void {
    this.scanning = false
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null
    }
  }

  isScanning(): boolean {
    return this.scanning
  }
}

// Instance globale du scanner
export const barcodeScanner = new BarcodeScanner()
