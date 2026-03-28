import { db } from './database';
import { api } from '@/lib/api';
import { storage } from '@/lib/storage';

interface SyncProgress {
  total: number;
  completed: number;
  current: string;
}

type SyncCallback = (progress: SyncProgress) => void;

class SyncService {
  private isSyncing = false;

  async syncAll(onProgress?: SyncCallback): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      // Upload pending data first
      await this.uploadPendingData(onProgress);
      
      // Then download fresh data
      await this.downloadData(onProgress);
    } finally {
      this.isSyncing = false;
    }
  }

  private async uploadPendingData(onProgress?: SyncCallback): Promise<void> {
    // Sync pending invoices
    const invoices = await db.getPendingInvoices();
    for (const invoice of invoices) {
      try {
        await api.post('facturepro', '/invoices', invoice);
        await db.markInvoiceSynced(invoice.id);
      } catch (error) {
        console.error(`Failed to sync invoice ${invoice.id}:`, error);
      }
      
      onProgress?.({
        total: invoices.length,
        completed: invoices.indexOf(invoice) + 1,
        current: `Syncing invoice ${invoice.id}`,
      });
    }

    // Sync pending sales
    const sales = await db.getPendingSales();
    for (const sale of sales) {
      try {
        await api.post('savanaflow', '/sales', sale);
        await db.markSaleSynced(sale.id);
      } catch (error) {
        console.error(`Failed to sync sale ${sale.id}:`, error);
      }
      
      onProgress?.({
        total: sales.length,
        completed: sales.indexOf(sale) + 1,
        current: `Syncing sale ${sale.id}`,
      });
    }

    // Sync pending attendance
    const attendance = await db.getPendingAttendance();
    for (const record of attendance) {
      try {
        await api.post('schoolflow', '/attendance', record);
        await db.markAttendanceSynced(record.id);
      } catch (error) {
        console.error(`Failed to sync attendance ${record.id}:`, error);
      }
      
      onProgress?.({
        total: attendance.length,
        completed: attendance.indexOf(record) + 1,
        current: `Syncing attendance ${record.id}`,
      });
    }
  }

  private async downloadData(onProgress?: SyncCallback): Promise<void> {
    // Download products
    try {
      const response = await api.get('savanaflow', '/products');
      const products = response.data;
      
      for (const product of products) {
        await db.upsertProduct(product.id, product);
      }
      
      await db.setLastSync('products');
      onProgress?.({ total: products.length, completed: products.length, current: 'Products synced' });
    } catch (error) {
      console.error('Failed to sync products:', error);
    }

    // Download students
    try {
      const response = await api.get('schoolflow', '/students');
      const students = response.data;
      
      for (const student of students) {
        await db.upsertStudent(student.id, student, student.classId);
      }
      
      await db.setLastSync('students');
      onProgress?.({ total: students.length, completed: students.length, current: 'Students synced' });
    } catch (error) {
      console.error('Failed to sync students:', error);
    }
  }

  async syncProducts(): Promise<void> {
    try {
      const response = await api.get('savanaflow', '/products');
      const products = response.data;
      
      for (const product of products) {
        await db.upsertProduct(product.id, product);
      }
      
      await db.setLastSync('products');
    } catch (error) {
      console.error('Failed to sync products:', error);
      throw error;
    }
  }

  async syncStudents(): Promise<void> {
    try {
      const response = await api.get('schoolflow', '/students');
      const students = response.data;
      
      for (const student of students) {
        await db.upsertStudent(student.id, student, student.classId);
      }
      
      await db.setLastSync('students');
    } catch (error) {
      console.error('Failed to sync students:', error);
      throw error;
    }
  }

  getIsSyncing(): boolean {
    return this.isSyncing;
  }
}

export const syncService = new SyncService();
