import { NativeModules, Platform } from 'react-native';

const { BarcodeScannerModule } = NativeModules;

export type BarcodeType = 'ean13' | 'ean8' | 'qr' | 'code128' | 'code39' | 'upc' | 'all';

export interface ScanResult {
  type: string;
  data: string;
}

/**
 * Check if camera permission is granted
 */
export const hasCameraPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android' && BarcodeScannerModule) {
      return await BarcodeScannerModule.hasCameraPermission();
    }
    return false;
  } catch (error) {
    console.error('Check camera permission error:', error);
    return false;
  }
};

/**
 * Request camera permission
 */
export const requestCameraPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android' && BarcodeScannerModule) {
      return await BarcodeScannerModule.requestCameraPermission();
    }
    return false;
  } catch (error) {
    console.error('Request camera permission error:', error);
    return false;
  }
};

/**
 * Start barcode scanner
 */
export const startScanner = async (): Promise<void> => {
  try {
    if (Platform.OS === 'android' && BarcodeScannerModule) {
      await BarcodeScannerModule.startScanner();
    }
  } catch (error) {
    console.error('Start scanner error:', error);
  }
};

/**
 * Stop barcode scanner
 */
export const stopScanner = async (): Promise<void> => {
  try {
    if (Platform.OS === 'android' && BarcodeScannerModule) {
      await BarcodeScannerModule.stopScanner();
    }
  } catch (error) {
    console.error('Stop scanner error:', error);
  }
};

/**
 * Toggle flashlight
 */
export const toggleFlashlight = async (enabled: boolean): Promise<void> => {
  try {
    if (Platform.OS === 'android' && BarcodeScannerModule) {
      await BarcodeScannerModule.toggleFlashlight(enabled);
    }
  } catch (error) {
    console.error('Toggle flashlight error:', error);
  }
};

/**
 * Parse barcode data
 */
export const parseBarcode = (data: string): {
  isValid: boolean;
  type: BarcodeType;
  formattedData: string;
} => {
  // Basic barcode type detection
  const cleanData = data.replace(/\s/g, '');
  
  // EAN-13: 13 digits
  if (/^\d{13}$/.test(cleanData)) {
    return {
      isValid: true,
      type: 'ean13',
      formattedData: cleanData,
    };
  }
  
  // EAN-8: 8 digits
  if (/^\d{8}$/.test(cleanData)) {
    return {
      isValid: true,
      type: 'ean8',
      formattedData: cleanData,
    };
  }
  
  // UPC: 12 digits
  if (/^\d{12}$/.test(cleanData)) {
    return {
      isValid: true,
      type: 'upc',
      formattedData: cleanData,
    };
  }
  
  // Code128: alphanumeric
  if (/^[A-Za-z0-9\-_.]+$/.test(cleanData)) {
    return {
      isValid: true,
      type: 'code128',
      formattedData: cleanData,
    };
  }
  
  // QR Code: can contain any data
  return {
    isValid: true,
    type: 'qr',
    formattedData: cleanData,
  };
};

/**
 * Validate EAN checksum
 */
export const validateEAN = (barcode: string): boolean => {
  const cleanBarcode = barcode.replace(/\s/g, '');
  
  if (!/^\d+$/.test(cleanBarcode)) {
    return false;
  }
  
  const length = cleanBarcode.length;
  if (length !== 8 && length !== 13) {
    return false;
  }
  
  let sum = 0;
  for (let i = 0; i < length - 1; i++) {
    const digit = parseInt(cleanBarcode[i], 10);
    const weight = i % 2 === 0 ? 1 : 3;
    sum += digit * weight;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(cleanBarcode[length - 1], 10);
};

/**
 * Generate barcode display format
 */
export const formatBarcode = (barcode: string, type: BarcodeType): string => {
  const clean = barcode.replace(/\s/g, '');
  
  switch (type) {
    case 'ean13':
      return `${clean.slice(0, 1)} ${clean.slice(1, 7)} ${clean.slice(7)}`;
    case 'ean8':
      return `${clean.slice(0, 4)} ${clean.slice(4)}`;
    case 'upc':
      return `${clean.slice(0, 1)} ${clean.slice(1, 6)} ${clean.slice(6)}`;
    default:
      return clean;
  }
};

export default {
  hasCameraPermission,
  requestCameraPermission,
  startScanner,
  stopScanner,
  toggleFlashlight,
  parseBarcode,
  validateEAN,
  formatBarcode,
};
