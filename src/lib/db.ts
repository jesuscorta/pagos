import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

type Category = { id: string; name: string; color: string };
type Payment = { id: string; amount: number; date: string };
type Concept = {
  id: string;
  title: string;
  amount: number;
  introducedAt: string | null;
  categoryId: string;
  payments: Payment[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFile =
  process.env.SQLITE_PATH ||
  path.join(process.cwd(), 'data', process.env.NODE_ENV === 'production' ? 'data.db' : 'dev.db');

// ensure directory exists
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

const db = new Database(dbFile);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const defaultCategories: Category[] = [
  { id: 'general', name: 'General', color: '#22c55e' },
  { id: 'servicios', name: 'Servicios', color: '#38bdf8' },
  { id: 'infra', name: 'Infraestructura', color: '#fbbf24' },
  { id: 'mantenimiento', name: 'Mantenimiento', color: '#a855f7' },
];

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS concepts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    amount REAL NOT NULL CHECK (amount >= 0),
    introduced_at TEXT,
    category_id TEXT NOT NULL DEFAULT 'general' REFERENCES categories(id) ON DELETE SET DEFAULT
  );
  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    amount REAL NOT NULL CHECK (amount >= 0),
    paid_at TEXT NOT NULL
  );
`);

const seedStmt = db.prepare(
  `INSERT OR IGNORE INTO categories (id, name, color) VALUES (@id, @name, @color)`
);
const seedDefaultCategories = () => {
  const tx = db.transaction((rows: Category[]) => rows.forEach((c) => seedStmt.run(c)));
  tx(defaultCategories);
};
seedDefaultCategories();

const formatDate = (value: unknown) => {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  try {
    return (value as Date).toISOString().slice(0, 10);
  } catch {
    return null;
  }
};

const parseAmount = (value: unknown) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('BAD_REQUEST: importe inválido');
  return amount;
};

export const getState = (): { categories: Category[]; concepts: Concept[] } => {
  const categories = db.prepare(`SELECT id, name, color FROM categories ORDER BY name ASC`).all() as Category[];
  const conceptRows = db
    .prepare(`SELECT id, title, amount, introduced_at, category_id FROM concepts ORDER BY introduced_at DESC`)
    .all();
  const payments = db
    .prepare(`SELECT id, concept_id, amount, paid_at FROM payments ORDER BY paid_at DESC, id DESC`)
    .all();

  const paymentsByConcept = payments.reduce<Record<string, Payment[]>>((acc, row) => {
    const payment: Payment = {
      id: row.id,
      amount: Number(row.amount),
      date: formatDate(row.paid_at) || '',
    };
    acc[row.concept_id] = acc[row.concept_id] ? [...acc[row.concept_id], payment] : [payment];
    return acc;
  }, {});

  const concepts: Concept[] = conceptRows.map((row) => ({
    id: row.id,
    title: row.title,
    amount: Number(row.amount),
    introducedAt: formatDate(row.introduced_at),
    categoryId: row.category_id,
    payments: paymentsByConcept[row.id] || [],
  }));

  return { categories, concepts };
};

export const createCategory = (name: string, color: string): Category => {
  const id = name.toLowerCase().trim().replace(/\s+/g, '-');
  if (!id) throw new Error('BAD_REQUEST: nombre requerido');
  const exists = db.prepare(`SELECT id FROM categories WHERE id = ?`).get(id);
  if (exists) throw new Error('BAD_REQUEST: ya existe una categoría con ese nombre');
  db.prepare(`INSERT INTO categories (id, name, color) VALUES (?, ?, ?)`).run(id, name, color);
  return { id, name, color };
};

export const renameCategory = (id: string, name: string) => {
  if (id === 'general') throw new Error('BAD_REQUEST: no se puede renombrar la categoría general');
  const exists = db.prepare(`SELECT id FROM categories WHERE id = ?`).get(id);
  if (!exists) throw new Error('BAD_REQUEST: categoría no encontrada');
  db.prepare(`UPDATE categories SET name = ? WHERE id = ?`).run(name, id);
};

export const deleteCategory = (id: string) => {
  if (id === 'general') throw new Error('BAD_REQUEST: no se puede eliminar la categoría general');
  const exists = db.prepare(`SELECT id FROM categories WHERE id = ?`).get(id);
  if (!exists) throw new Error('BAD_REQUEST: categoría no encontrada');
  const tx = db.transaction((catId: string) => {
    db.prepare(`UPDATE concepts SET category_id = 'general' WHERE category_id = ?`).run(catId);
    db.prepare(`DELETE FROM categories WHERE id = ?`).run(catId);
  });
  tx(id);
};

export const createConcept = (params: {
  title: string;
  amount: unknown;
  introducedAt?: string | null;
  categoryId?: string;
}): Concept => {
  const title = (params.title || '').toString().trim();
  if (!title) throw new Error('BAD_REQUEST: el título es obligatorio');
  const amount = parseAmount(params.amount);
  const introducedAt = params.introducedAt || null;
  const categoryId = params.categoryId || 'general';
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO concepts (id, title, amount, introduced_at, category_id) VALUES (?, ?, ?, ?, ?)`
  ).run(id, title, amount, introducedAt, categoryId);
  return { id, title, amount, introducedAt, categoryId, payments: [] };
};

export const createPayment = (params: { conceptId: string; amount: unknown; date?: string | null }) => {
  const amount = parseAmount(params.amount);
  const conceptId = params.conceptId;
  if (!conceptId) throw new Error('BAD_REQUEST: conceptId requerido');
  const date = params.date || new Date().toISOString().slice(0, 10);
  const id = crypto.randomUUID();
  db.prepare(`INSERT INTO payments (id, concept_id, amount, paid_at) VALUES (?, ?, ?, ?)`).run(
    id,
    conceptId,
    amount,
    date
  );
};

export const updateConcept = (params: {
  id: string;
  title?: string;
  amount?: unknown;
  introducedAt?: string | null;
  categoryId?: string;
}) => {
  const { id } = params;
  if (!id) throw new Error('BAD_REQUEST: id requerido');
  const existing = db.prepare(`SELECT id FROM concepts WHERE id = ?`).get(id);
  if (!existing) throw new Error('BAD_REQUEST: concepto no encontrado');

  const title = params.title !== undefined ? String(params.title || '').trim() : undefined;
  const amount = params.amount !== undefined ? parseAmount(params.amount) : undefined;
  const introducedAt = params.introducedAt !== undefined ? formatDate(params.introducedAt) : undefined;
  const categoryId = params.categoryId !== undefined ? params.categoryId : undefined;

  const updates: string[] = [];
  const values: unknown[] = [];
  if (title !== undefined) {
    if (!title) throw new Error('BAD_REQUEST: el título es obligatorio');
    updates.push('title = ?');
    values.push(title);
  }
  if (amount !== undefined) {
    updates.push('amount = ?');
    values.push(amount);
  }
  if (introducedAt !== undefined) {
    updates.push('introduced_at = ?');
    values.push(introducedAt);
  }
  if (categoryId !== undefined) {
    updates.push('category_id = ?');
    values.push(categoryId);
  }

  if (updates.length === 0) return;
  values.push(id);
  db.prepare(`UPDATE concepts SET ${updates.join(', ')} WHERE id = ?`).run(values);
};

export const deleteConcept = (id: string) => {
  if (!id) throw new Error('BAD_REQUEST: id requerido');
  db.prepare(`DELETE FROM concepts WHERE id = ?`).run(id);
};

export const updatePayment = (params: { id: string; amount?: unknown; date?: string | null }) => {
  const { id } = params;
  if (!id) throw new Error('BAD_REQUEST: id requerido');
  const existing = db.prepare(`SELECT id FROM payments WHERE id = ?`).get(id);
  if (!existing) throw new Error('BAD_REQUEST: pago no encontrado');
  const amount = params.amount !== undefined ? parseAmount(params.amount) : undefined;
  const paidAt = params.date !== undefined ? formatDate(params.date) : undefined;

  const updates: string[] = [];
  const values: unknown[] = [];
  if (amount !== undefined) {
    updates.push('amount = ?');
    values.push(amount);
  }
  if (paidAt !== undefined) {
    updates.push('paid_at = ?');
    values.push(paidAt);
  }
  if (updates.length === 0) return;
  values.push(id);
  db.prepare(`UPDATE payments SET ${updates.join(', ')} WHERE id = ?`).run(values);
};

export const deletePayment = (id: string) => {
  if (!id) throw new Error('BAD_REQUEST: id requerido');
  db.prepare(`DELETE FROM payments WHERE id = ?`).run(id);
};
