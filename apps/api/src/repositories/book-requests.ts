import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { eq, lt } from 'drizzle-orm';
import { bookRequests, adminAudit } from '@sdarm/db';

export interface CreateBookRequestInput {
  name: string;
  email: string;
  phone?: string;
  land: string;
  street: string;
  plz: string;
  city: string;
  books: string[];
  wish?: string;
  language?: string;
}

export async function createBookRequest(db: DrizzleD1Database, input: CreateBookRequestInput) {
  const [row] = await db
    .insert(bookRequests)
    .values({
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      land: input.land,
      street: input.street,
      plz: input.plz,
      city: input.city,
      books: JSON.stringify(input.books),
      wish: input.wish ?? null,
      language: input.language ?? 'de',
    })
    .returning({ id: bookRequests.id });
  return row;
}

export async function getBookRequestById(db: DrizzleD1Database, id: number) {
  const [row] = await db.select().from(bookRequests).where(eq(bookRequests.id, id)).limit(1);
  if (!row) return null;
  return { ...row, books: JSON.parse(row.books) as string[] };
}

export async function deleteExpiredBookRequests(db: DrizzleD1Database) {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const result = await db.delete(bookRequests).where(lt(bookRequests.requestedAt, cutoff));
  return result;
}

export async function logAudit(
  db: DrizzleD1Database,
  action: 'read' | 'delete',
  targetId: number,
) {
  await db.insert(adminAudit).values({ action, targetType: 'book_request', targetId });
}
