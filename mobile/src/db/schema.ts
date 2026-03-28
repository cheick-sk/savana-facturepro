// SQLite schema for offline data storage
// This enables the app to work offline and sync when online

export const CREATE_TABLES = `
  -- Offline invoices (FacturePro)
  CREATE TABLE IF NOT EXISTS offline_invoices (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    synced INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Offline sales (SavanaFlow)
  CREATE TABLE IF NOT EXISTS offline_sales (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    synced INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Offline customers
  CREATE TABLE IF NOT EXISTS offline_customers (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    synced INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Cached products (for POS)
  CREATE TABLE IF NOT EXISTS cached_products (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Offline attendance (SchoolFlow)
  CREATE TABLE IF NOT EXISTS offline_attendance (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL,
    data TEXT NOT NULL,
    date TEXT NOT NULL,
    synced INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Cached students
  CREATE TABLE IF NOT EXISTS cached_students (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    class_id TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Sync metadata
  CREATE TABLE IF NOT EXISTS sync_metadata (
    key TEXT PRIMARY KEY,
    value TEXT,
    last_sync TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Create indexes for faster queries
  CREATE INDEX IF NOT EXISTS idx_offline_invoices_synced ON offline_invoices(synced);
  CREATE INDEX IF NOT EXISTS idx_offline_sales_synced ON offline_sales(synced);
  CREATE INDEX IF NOT EXISTS idx_offline_customers_synced ON offline_customers(synced);
  CREATE INDEX IF NOT EXISTS idx_offline_attendance_synced ON offline_attendance(synced);
  CREATE INDEX IF NOT EXISTS idx_cached_products_id ON cached_products(id);
  CREATE INDEX IF NOT EXISTS idx_cached_students_class ON cached_students(class_id);
`;

// Prepared statements for common operations
export const QUERIES = {
  // Offline invoices
  INSERT_INVOICE: `
    INSERT INTO offline_invoices (id, data, status)
    VALUES (?, ?, ?)
  `,
  
  GET_PENDING_INVOICES: `
    SELECT * FROM offline_invoices WHERE synced = 0
  `,
  
  MARK_INVOICE_SYNCED: `
    UPDATE offline_invoices SET synced = 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `,

  // Offline sales
  INSERT_SALE: `
    INSERT INTO offline_sales (id, data, status)
    VALUES (?, ?, ?)
  `,
  
  GET_PENDING_SALES: `
    SELECT * FROM offline_sales WHERE synced = 0
    ORDER BY created_at DESC
  `,
  
  MARK_SALE_SYNCED: `
    UPDATE offline_sales SET synced = 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `,

  // Cached products
  UPSERT_PRODUCT: `
    INSERT OR REPLACE INTO cached_products (id, data, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `,
  
  GET_ALL_PRODUCTS: `
    SELECT * FROM cached_products
  `,
  
  GET_PRODUCT_BY_ID: `
    SELECT * FROM cached_products WHERE id = ?
  `,
  
  SEARCH_PRODUCTS: `
    SELECT * FROM cached_products 
    WHERE json_extract(data, '$.name') LIKE ? 
    OR json_extract(data, '$.barcode') LIKE ?
  `,

  // Offline attendance
  INSERT_ATTENDANCE: `
    INSERT INTO offline_attendance (id, class_id, data, date)
    VALUES (?, ?, ?, ?)
  `,
  
  GET_PENDING_ATTENDANCE: `
    SELECT * FROM offline_attendance WHERE synced = 0
  `,
  
  MARK_ATTENDANCE_SYNCED: `
    UPDATE offline_attendance SET synced = 1
    WHERE id = ?
  `,

  // Cached students
  UPSERT_STUDENT: `
    INSERT OR REPLACE INTO cached_students (id, data, class_id, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `,
  
  GET_STUDENTS_BY_CLASS: `
    SELECT * FROM cached_students WHERE class_id = ?
  `,
  
  GET_ALL_STUDENTS: `
    SELECT * FROM cached_students
  `,

  // Sync metadata
  SET_SYNC_TIME: `
    INSERT OR REPLACE INTO sync_metadata (key, value, last_sync)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `,
  
  GET_SYNC_TIME: `
    SELECT last_sync FROM sync_metadata WHERE key = ?
  `,
};
