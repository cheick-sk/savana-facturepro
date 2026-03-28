import { Platform, PermissionsAndroid, Alert } from 'react-native';

// Bluetooth printer interface for thermal receipt printers
// Common in Africa: Sunmi, PAX, generic ESC/POS printers

interface PrinterDevice {
  id: string;
  name: string;
  address: string;
  type: 'bluetooth' | 'usb' | 'network';
}

interface PrintOptions {
  paperWidth?: 58 | 80; // mm
  copies?: number;
}

class BluetoothPrinterService {
  private connectedPrinter: PrinterDevice | null = null;
  private listeners: Set<(status: string) => void> = new Set();

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      ]);

      return Object.values(granted).every(
        result => result === PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (err) {
      console.warn('Bluetooth permissions error:', err);
      return false;
    }
  }

  async scanForPrinters(): Promise<PrinterDevice[]> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Bluetooth permissions not granted');
    }

    // In a real implementation, this would use react-native-bluetooth-classic
    // or a native module to scan for paired printers
    // For now, return mock devices
    return [
      { id: '1', name: 'Sunmi V2 Printer', address: '00:11:22:33:44:55', type: 'bluetooth' },
      { id: '2', name: 'Thermal Printer', address: '66:77:88:99:AA:BB', type: 'bluetooth' },
    ];
  }

  async connect(printer: PrinterDevice): Promise<boolean> {
    try {
      // In real implementation, establish Bluetooth connection
      this.connectedPrinter = printer;
      this.notifyListeners('connected');
      return true;
    } catch (error) {
      console.error('Failed to connect to printer:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connectedPrinter) {
      // Close connection
      this.connectedPrinter = null;
      this.notifyListeners('disconnected');
    }
  }

  isConnected(): boolean {
    return this.connectedPrinter !== null;
  }

  getConnectedPrinter(): PrinterDevice | null {
    return this.connectedPrinter;
  }

  async printReceipt(receipt: ReceiptData, options?: PrintOptions): Promise<boolean> {
    if (!this.connectedPrinter) {
      throw new Error('No printer connected');
    }

    try {
      // Build ESC/POS commands
      const commands = this.buildReceiptCommands(receipt, options);
      
      // In real implementation, send commands via Bluetooth
      console.log('Printing receipt:', commands);
      
      return true;
    } catch (error) {
      console.error('Print error:', error);
      return false;
    }
  }

  private buildReceiptCommands(receipt: ReceiptData, options?: PrintOptions): string {
    const width = options?.paperWidth || 58;
    
    // ESC/POS commands
    let commands = '';
    
    // Initialize printer
    commands += '\x1B\x40'; // ESC @
    
    // Center align
    commands += '\x1B\x61\x01'; // ESC a 1
    
    // Store name (double height/width)
    commands += '\x1B\x21\x30'; // Double height/width
    commands += receipt.storeName + '\n';
    commands += '\x1B\x21\x00'; // Normal
    
    // Store info
    if (receipt.storeAddress) {
      commands += receipt.storeAddress + '\n';
    }
    if (receipt.storePhone) {
      commands += 'Tel: ' + receipt.storePhone + '\n';
    }
    
    // Separator
    commands += '='.repeat(width === 80 ? 48 : 32) + '\n';
    
    // Receipt number and date
    commands += `Ticket: ${receipt.receiptNumber}\n`;
    commands += `Date: ${receipt.date}\n`;
    if (receipt.customerName) {
      commands += `Client: ${receipt.customerName}\n`;
    }
    
    // Separator
    commands += '-'.repeat(width === 80 ? 48 : 32) + '\n';
    
    // Items
    commands += '\x1B\x61\x00'; // Left align
    receipt.items.forEach(item => {
      const qty = item.quantity.toString().padStart(3);
      const price = item.unitPrice.toLocaleString().padStart(12);
      const total = (item.quantity * item.unitPrice).toLocaleString().padStart(12);
      
      commands += item.name.substring(0, 20) + '\n';
      commands += `${qty} x ${price} = ${total}\n`;
    });
    
    // Separator
    commands += '-'.repeat(width === 80 ? 48 : 32) + '\n';
    
    // Totals
    commands += '\x1B\x61\x02'; // Right align
    commands += `Total: ${receipt.total.toLocaleString()} FCFA\n`;
    if (receipt.discount > 0) {
      commands += `Remise: -${receipt.discount.toLocaleString()} FCFA\n`;
    }
    commands += '\x1B\x21\x20'; // Double width
    commands += `A PAYER: ${receipt.amountPaid.toLocaleString()} FCFA\n`;
    commands += '\x1B\x21\x00'; // Normal
    
    if (receipt.paymentMethod) {
      commands += `Paiement: ${receipt.paymentMethod}\n`;
    }
    if (receipt.change > 0) {
      commands += `Monnaie: ${receipt.change.toLocaleString()} FCFA\n`;
    }
    
    // Footer
    commands += '\x1B\x61\x01'; // Center
    commands += '\n';
    commands += 'Merci de votre visite!\n';
    commands += 'A bientot\n';
    
    // Cut paper
    commands += '\n\n\n';
    commands += '\x1D\x56\x00'; // GS V 0 (full cut)
    
    return commands;
  }

  subscribe(listener: (status: string) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(status: string) {
    this.listeners.forEach(listener => listener(status));
  }
}

interface ReceiptData {
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  receiptNumber: string;
  date: string;
  customerName?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  change: number;
  paymentMethod: string;
}

export const bluetoothPrinter = new BluetoothPrinterService();
