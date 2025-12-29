import crypto from 'node:crypto';
import { Pool } from 'pg';

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

const defaultCategories: Category[] = [
  { id: 'general', name: 'General', color: '#22c55e' },
  { id: 'servicios', name: 'Servicios', color: '#38bdf8' },
  { id: 'infra', name: 'Infraestructura', color: '#fbbf24' },
  { id: 'mantenimiento', name: 'Mantenimiento', color: '#a855f7' },
];

const shouldUseSSL = (process.env.DATABASE_SSL || '').toLowerCase() === 'true';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: shouldUseSSL ? { rejectUnauthorized: false } : false,
});

const formatDate = (value: unknown) => {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  try {
    return (value as Date).toISOString().slice(0, 10);
  } catch {
    return null;
  }
};

const ensureSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS concepts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      amount NUMERIC NOT NULL CHECK (amount >= 0),
      introduced_at DATE,
      category_id TEXT NOT NULL DEFAULT 'general' REFERENCES categories(id) ON DELETE SET DEFAULT
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
      amount NUMERIC NOT NULL CHECK (amount >= 0),
      paid_at DATE NOT NULL DEFAULT CURRENT_DATE
    );
  `);
};

const seedDefaultCategories = async () => {
  const insertPromises = defaultCategories.map((cat) =>
    pool.query(
      `INSERT INTO categories (id, name, color) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [cat.id, cat.name, cat.color]
    )
  );
  await Promise.all(insertPromises);
};

const initPromise = (async () => {
  await ensureSchema();
  await seedDefaultCategories();
})();

const ensureCategory = async (categoryId: string) => {
  const { rows } = await pool.query(`SELECT id FROM categories WHERE id = $1`, [categoryId]);
  if (!rows.length) return 'general';
  return categoryId;
};

const parseAmount = (value: unknown) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('BAD_REQUEST: importe inválido');
  return amount;
};

export const getState = async (): Promise<{ categories: Category[]; concepts: Concept[] }> => {
  await initPromise;

  const categoriesResult = await pool.query(`SELECT id, name, color FROM categories ORDER BY name ASC`);
  const conceptsResult = await pool.query(
    `SELECT id, title, amount, introduced_at, category_id FROM concepts ORDER BY introduced_at DESC NULLS LAST`
  );
  const paymentsResult = await pool.query(
    `SELECT id, concept_id, amount, paid_at FROM payments ORDER BY paid_at DESC, id DESC`
  );

  const paymentsByConcept = paymentsResult.rows.reduce<Record<string, Payment[]>>((acc, row) => {
    const payment: Payment = {
      id: row.id,
      amount: Number(row.amount),
      date: formatDate(row.paid_at) || '',
    };
    acc[row.concept_id] = acc[row.concept_id] ? [...acc[row.concept_id], payment] : [payment];
    return acc;
  }, {});

  const concepts: Concept[] = conceptsResult.rows.map((row) => ({
    id: row.id,
    title: row.title,
    amount: Number(row.amount),
    introducedAt: formatDate(row.introduced_at),
    categoryId: row.category_id,
    payments: paymentsByConcept[row.id] || [],
  }));

  return { categories: categoriesResult.rows, concepts };
};

export const createCategory = async (name: string, color: string): Promise<Category> => {
  await initPromise;
  const id = name.toLowerCase().trim().replace(/\s+/g, '-');
  if (!id) throw new Error('BAD_REQUEST: nombre de categoría requerido');
  await pool.query(`INSERT INTO categories (id, name, color) VALUES ($1, $2, $3)`, [id, name, color]);
  return { id, name, color };
};

export const renameCategory = async (id: string, name: string) => {
  await initPromise;
  if (id === 'general') throw new Error('BAD_REQUEST: no se puede renombrar la categoría general');
  await pool.query(`UPDATE categories SET name = $1 WHERE id = $2`, [name, id]);
};

export const deleteCategory = async (id: string) => {
  await initPromise;
  if (id === 'general') throw new Error('BAD_REQUEST: no se puede eliminar la categoría general');
  await pool.query('BEGIN');
  try {
    await pool.query(`UPDATE concepts SET category_id = 'general' WHERE category_id = $1`, [id]);
    await pool.query(`DELETE FROM categories WHERE id = $1`, [id]);
    await pool.query('COMMIT');
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  }
};

export const createConcept = async (params: {
  title: string;
  amount: unknown;
  introducedAt?: string | null;
  categoryId?: string;
}): Promise<Concept> => {
  await initPromise;
  const title = (params.title || '').toString().trim();
  if (!title) throw new Error('BAD_REQUEST: el título es obligatorio');
  const amount = parseAmount(params.amount);
  const introducedAt = params.introducedAt || null;
  const categoryId = await ensureCategory(params.categoryId || 'general');
  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO concepts (id, title, amount, introduced_at, category_id) VALUES ($1, $2, $3, $4, $5)`,
    [id, title, amount, introducedAt, categoryId]
  );
  return {
    id,
    title,
    amount,
    introducedAt,
    categoryId,
    payments: [],
  };
};

export const createPayment = async (params: { conceptId: string; amount: unknown; date?: string | null }) => {
  await initPromise;
  const amount = parseAmount(params.amount);
  const conceptId = params.conceptId;
  if (!conceptId) throw new Error('BAD_REQUEST: conceptId requerido');
  const date = params.date || null;

  const concept = await pool.query(`SELECT amount FROM concepts WHERE id = $1`, [conceptId]);
  if (!concept.rowCount) throw new Error('BAD_REQUEST: concepto no encontrado');

  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO payments (id, concept_id, amount, paid_at) VALUES ($1, $2, $3, $4)`,
    [id, conceptId, amount, date]
  );
};
