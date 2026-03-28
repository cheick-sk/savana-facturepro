import { NativeModules, Platform } from 'react-native';

const { ThermalPrinter } = NativeModules;

export interface PrintReceiptData {
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  receiptNumber: string;
  date: string;
  items: {
    name: string;
    quantity: number;
    price: number;
    total: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  cashier?: string;
  footer?: string;
}

export interface PrintInvoiceData {
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  customerName: string;
  customerAddress?: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}

/**
 * Print a receipt using thermal printer
 */
export const printReceipt = async (data: PrintReceiptData): Promise<boolean> => {
  try {
    if (Platform.OS === 'android' && ThermalPrinter) {
      await ThermalPrinter.printReceipt(JSON.stringify(data));
      return true;
    }
    
    // iOS or simulator - use expo-print
    const { printAsync } = await import('expo-print');
    const html = generateReceiptHtml(data);
    await printAsync({ html });
    return true;
  } catch (error) {
    console.error('Print receipt error:', error);
    return false;
  }
};

/**
 * Print an invoice
 */
export const printInvoice = async (data: PrintInvoiceData): Promise<boolean> => {
  try {
    if (Platform.OS === 'android' && ThermalPrinter) {
      await ThermalPrinter.printInvoice(JSON.stringify(data));
      return true;
    }
    
    // iOS or simulator - use expo-print
    const { printAsync } = await import('expo-print');
    const html = generateInvoiceHtml(data);
    await printAsync({ html });
    return true;
  } catch (error) {
    console.error('Print invoice error:', error);
    return false;
  }
};

/**
 * Check if printer is connected
 */
export const isPrinterConnected = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android' && ThermalPrinter) {
      return await ThermalPrinter.isConnected();
    }
    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Connect to printer via Bluetooth
 */
export const connectPrinter = async (address?: string): Promise<boolean> => {
  try {
    if (Platform.OS === 'android' && ThermalPrinter) {
      return await ThermalPrinter.connect(address);
    }
    return false;
  } catch (error) {
    console.error('Connect printer error:', error);
    return false;
  }
};

/**
 * Disconnect printer
 */
export const disconnectPrinter = async (): Promise<void> => {
  try {
    if (Platform.OS === 'android' && ThermalPrinter) {
      await ThermalPrinter.disconnect();
    }
  } catch (error) {
    console.error('Disconnect printer error:', error);
  }
};

/**
 * Get available printers
 */
export const getAvailablePrinters = async (): Promise<string[]> => {
  try {
    if (Platform.OS === 'android' && ThermalPrinter) {
      return await ThermalPrinter.getAvailablePrinters();
    }
    return [];
  } catch (error) {
    return [];
  }
};

// Helper functions to generate HTML for printing
function generateReceiptHtml(data: PrintReceiptData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
      <style>
        body { font-family: monospace; font-size: 12px; padding: 10px; }
        .header { text-align: center; margin-bottom: 10px; }
        .business-name { font-size: 16px; font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 10px 0; }
        .item { display: flex; justify-content: space-between; margin: 5px 0; }
        .total-row { display: flex; justify-content: space-between; margin: 5px 0; }
        .grand-total { font-weight: bold; font-size: 14px; }
        .footer { text-align: center; margin-top: 15px; font-size: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="business-name">${data.businessName}</div>
        ${data.businessAddress ? `<div>${data.businessAddress}</div>` : ''}
        ${data.businessPhone ? `<div>Tél: ${data.businessPhone}</div>` : ''}
      </div>
      <div class="divider"></div>
      <div>Reçu N°: ${data.receiptNumber}</div>
      <div>Date: ${data.date}</div>
      <div class="divider"></div>
      ${data.items.map(item => `
        <div class="item">
          <span>${item.name} x${item.quantity}</span>
          <span>${item.total.toLocaleString()}</span>
        </div>
      `).join('')}
      <div class="divider"></div>
      <div class="total-row">
        <span>Sous-total:</span>
        <span>${data.subtotal.toLocaleString()} FCFA</span>
      </div>
      <div class="total-row">
        <span>TVA:</span>
        <span>${data.tax.toLocaleString()} FCFA</span>
      </div>
      <div class="total-row grand-total">
        <span>TOTAL:</span>
        <span>${data.total.toLocaleString()} FCFA</span>
      </div>
      <div class="divider"></div>
      <div>Mode de paiement: ${data.paymentMethod}</div>
      ${data.cashier ? `<div>Caissier: ${data.cashier}</div>` : ''}
      <div class="footer">
        ${data.footer || 'Merci de votre visite!'}
      </div>
    </body>
    </html>
  `;
}

function generateInvoiceHtml(data: PrintInvoiceData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; max-width: 600px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .business-info { flex: 1; }
        .business-name { font-size: 18px; font-weight: bold; }
        .invoice-title { font-size: 24px; font-weight: bold; text-align: right; }
        .invoice-number { text-align: right; color: #666; }
        .parties { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .party { flex: 1; }
        .party-label { font-weight: bold; margin-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #f3f4f6; padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
        .text-right { text-align: right; }
        .totals { margin-left: auto; width: 200px; }
        .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
        .grand-total { font-weight: bold; font-size: 16px; border-top: 2px solid #000; padding-top: 10px; }
        .notes { margin-top: 20px; padding: 10px; background: #f9fafb; border-radius: 4px; }
        .footer { margin-top: 40px; text-align: center; color: #666; font-size: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="business-info">
          <div class="business-name">${data.businessName}</div>
          ${data.businessAddress ? `<div>${data.businessAddress}</div>` : ''}
          ${data.businessPhone ? `<div>Tél: ${data.businessPhone}</div>` : ''}
          ${data.businessEmail ? `<div>${data.businessEmail}</div>` : ''}
        </div>
        <div>
          <div class="invoice-title">FACTURE</div>
          <div class="invoice-number">${data.invoiceNumber}</div>
        </div>
      </div>
      <div class="parties">
        <div class="party">
          <div class="party-label">Facturer à:</div>
          <div>${data.customerName}</div>
          ${data.customerAddress ? `<div>${data.customerAddress}</div>` : ''}
        </div>
        <div class="party">
          <div class="party-label">Date:</div>
          <div>${data.date}</div>
          ${data.dueDate ? `<div class="party-label">Échéance: ${data.dueDate}</div>` : ''}
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="text-right">Qté</th>
            <th class="text-right">Prix unitaire</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map(item => `
            <tr>
              <td>${item.description}</td>
              <td class="text-right">${item.quantity}</td>
              <td class="text-right">${item.unitPrice.toLocaleString()}</td>
              <td class="text-right">${item.total.toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="totals">
        <div class="total-row">
          <span>Sous-total:</span>
          <span>${data.subtotal.toLocaleString()} FCFA</span>
        </div>
        <div class="total-row">
          <span>TVA (18%):</span>
          <span>${data.tax.toLocaleString()} FCFA</span>
        </div>
        <div class="total-row grand-total">
          <span>TOTAL:</span>
          <span>${data.total.toLocaleString()} FCFA</span>
        </div>
      </div>
      ${data.notes ? `<div class="notes">${data.notes}</div>` : ''}
      <div class="footer">
        Merci de votre confiance!
      </div>
    </body>
    </html>
  `;
}

export default {
  printReceipt,
  printInvoice,
  isPrinterConnected,
  connectPrinter,
  disconnectPrinter,
  getAvailablePrinters,
};
