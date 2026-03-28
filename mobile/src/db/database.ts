import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES, QUERIES } from './schema';

const DB_NAME = 'saas_africa_offline.db';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync(DB_NAME);
      await this.createTables();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    // Execute CREATE TABLE statements
    const statements = CREATE_TABLES.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      await this.db.execAsync(statement);
    }
  }

  getDb(): SQLite.SQLiteDatabase {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  // Generic query methods
  async runAsync(sql: string, params: any[] = []): Promise<SQLite.SQLiteRunResult> {
    return this.getDb().runAsync(sql, params);
  }

  async getFirstAsync<T>(sql: string, params: any[] = []): Promise<T | null> {
    return this.getDb().getFirstAsync<T>(sql, params);
  }

  async getAllAsync<T>(sql: string, params: any[] = []): Promise<T[]> {
    return this.getDb().getAllAsync<T>(sql, params);
  }

  // Invoice operations
  async saveInvoice(id: string, data: any, status: string = 'draft'): Promise<void> {
    await this.runAsync(QUERIES.INSERT_INVOICE, [id, JSON.stringify(data), status]);
  }

  async getPendingInvoices(): Promise<any[]> {
    const rows = await this.getAllAsync<{ id: string; data: string; status: string }>(
      QUERIES.GET_PENDING_INVOICES
    );
    return rows.map(row => ({
      id: row.id,
      ...JSON.parse(row.data),
      status: row.status,
    }));
  }

  async markInvoiceSynced(id: string): Promise<void> {
    await this.runAsync(QUERIES.MARK_INVOICE_SYNCED, [id]);
  }

  // Sale operations
  async saveSale(id: string, data: any, status: string = 'completed'): Promise<void> {
    await this.runAsync(QUERIES.INSERT_SALE, [id, JSON.stringify(data), status]);
  }

  async getPendingSales(): Promise<any[]> {
    const rows = await this.getAllAsync<{ id: string; data: string; status: string }>(
      QUERIES.GET_PENDING_SALES
    );
    return rows.map(row => ({
      id: row.id,
      ...JSON.parse(row.data),
      status: row.status,
    }));
  }

  async markSaleSynced(id: string): Promise<void> {
    await this.runAsync(QUERIES.MARK_SALE_SYNCED, [id]);
  }

  // Product operations
  async upsertProduct(id: string, data: any): Promise<void> {
    await this.runAsync(QUERIES.UPSERT_PRODUCT, [id, JSON.stringify(data)]);
  }

  async getAllProducts(): Promise<any[]> {
    const rows = await this.getAllAsync<{ id: string; data: string }>(
      QUERIES.GET_ALL_PRODUCTS
    );
    return rows.map(row => ({
      id: row.id,
      ...JSON.parse(row.data),
    }));
  }

  async searchProducts(query: string): Promise<any[]> {
    const searchPattern = `%${query}%`;
    const rows = await this.getAllAsync<{ id: string; data: string }>(
      QUERIES.SEARCH_PRODUCTS,
      [searchPattern, searchPattern]
    );
    return rows.map(row => ({
      id: row.id,
      ...JSON.parse(row.data),
    }));
  }

  // Attendance operations
  async saveAttendance(id: string, classId: string, data: any, date: string): Promise<void> {
    await this.runAsync(QUERIES.INSERT_ATTENDANCE, [id, classId, JSON.stringify(data), date]);
  }

  async getPendingAttendance(): Promise<any[]> {
    const rows = await this.getAllAsync<{ id: string; class_id: string; data: string; date: string }>(
      QUERIES.GET_PENDING_ATTENDANCE
    );
    return rows.map(row => ({
      id: row.id,
      classId: row.class_id,
      ...JSON.parse(row.data),
      date: row.date,
    }));
  }

  async markAttendanceSynced(id: string): Promise<void> {
    await this.runAsync(QUERIES.MARK_ATTENDANCE_SYNCED, [id]);
  }

  // Student operations
  async upsertStudent(id: string, data: any, classId?: string): Promise<void> {
    await this.runAsync(QUERIES.UPSERT_STUDENT, [id, JSON.stringify(data), classId || null]);
  }

  async getStudentsByClass(classId: string): Promise<any[]> {
    const rows = await this.getAllAsync<{ id: string; data: string }>(
      QUERIES.GET_STUDENTS_BY_CLASS,
      [classId]
    );
    return rows.map(row => ({
      id: row.id,
      ...JSON.parse(row.data),
    }));
  }

  async getAllStudents(): Promise<any[]> {
    const rows = await this.getAllAsync<{ id: string; data: string }>(
      QUERIES.GET_ALL_STUDENTS
    );
    return rows.map(row => ({
      id: row.id,
      ...JSON.parse(row.data),
    }));
  }

  // Sync metadata
  async setLastSync(key: string, value?: string): Promise<void> {
    await this.runAsync(QUERIES.SET_SYNC_TIME, [key, value || '']);
  }

  async getLastSync(key: string): Promise<string | null> {
    const row = await this.getFirstAsync<{ last_sync: string }>(
      QUERIES.GET_SYNC_TIME,
      [key]
    );
    return row?.last_sync || null;
  }

  // Clear all data (for logout)
  async clearAllData(): Promise<void> {
    const tables = [
      'offline_invoices',
      'offline_sales',
      'offline_customers',
      'cached_products',
      'offline_attendance',
      'cached_students',
      'sync_metadata',
    ];

    for (const table of tables) {
      await this.runAsync(`DELETE FROM ${table}`);
    }
  }

  // Get pending sync count
  async getPendingSyncCount(): Promise<{
    invoices: number;
    sales: number;
    attendance: number;
  }> {
    const [invoices, sales, attendance] = await Promise.all([
      this.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM offline_invoices WHERE synced = 0'),
      this.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM offline_sales WHERE synced = 0'),
      this.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM offline_attendance WHERE synced = 0'),
    ]);

    return {
      invoices: invoices?.count || 0,
      sales: sales?.count || 0,
      attendance: attendance?.count || 0,
    };
  }
}

export const db = new DatabaseService();
