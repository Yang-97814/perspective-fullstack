import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const guestbook = sqliteTable('guestbook', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  body: text('body').notNull(),
  createdAt: integer('created_at').notNull(),
}, table => [index('guestbook_user_time_idx').on(table.userId,table.createdAt), index('guestbook_time_idx').on(table.createdAt)]);
