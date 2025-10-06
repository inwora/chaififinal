import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  subCategories: jsonb("sub_categories").default([]), // Array of strings
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const menuItems = pgTable("menu_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  subCategory: text("sub_category"),
  image: text("image").notNull(),
  available: boolean("available").notNull().default(true),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  items: jsonb("items").notNull(), // Array of {id, name, price, quantity}
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(), // 'gpay', 'cash', 'split', or 'creditor'
  billerName: text("biller_name").notNull().default('Sriram'),
  splitPayment: jsonb("split_payment"), // {gpayAmount: number, cashAmount: number} for split payments
  extras: jsonb("extras"), // Array of {name: string, amount: number}
  creditor: jsonb("creditor"), // {name: string, totalAmount: number, paidAmount: number, balanceAmount: number} for creditor payments
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  date: text("date").notNull(), // YYYY-MM-DD format
  dayName: text("day_name").notNull(),
  time: text("time").notNull(), // HH:MM AM/PM format
});

export const dailySummaries = pgTable("daily_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull().unique(), // YYYY-MM-DD format
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  gpayAmount: decimal("gpay_amount", { precision: 10, scale: 2 }).notNull(),
  cashAmount: decimal("cash_amount", { precision: 10, scale: 2 }).notNull(),
  orderCount: integer("order_count").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const weeklySummaries = pgTable("weekly_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  weekStart: text("week_start").notNull(), // YYYY-MM-DD format (Monday)
  weekEnd: text("week_end").notNull(), // YYYY-MM-DD format (Sunday)
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  gpayAmount: decimal("gpay_amount", { precision: 10, scale: 2 }).notNull(),
  cashAmount: decimal("cash_amount", { precision: 10, scale: 2 }).notNull(),
  orderCount: integer("order_count").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const monthlySummaries = pgTable("monthly_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  month: text("month").notNull(), // YYYY-MM format
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  gpayAmount: decimal("gpay_amount", { precision: 10, scale: 2 }).notNull(),
  cashAmount: decimal("cash_amount", { precision: 10, scale: 2 }).notNull(),
  orderCount: integer("order_count").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const inventorySessions = pgTable("inventory_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull(), // YYYY-MM-DD format
  status: text("status").notNull(), // 'pre-billing', 'billing', 'ended'
  startTime: timestamp("start_time").notNull().default(sql`now()`),
  endTime: timestamp("end_time"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const inventoryItems = pgTable("inventory_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  menuItemId: varchar("menu_item_id").notNull(),
  stockIn: integer("stock_in").notNull(),
  stockOut: integer("stock_out").notNull().default(0),
  stockLeft: integer("stock_left").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertDailySummarySchema = createInsertSchema(dailySummaries).omit({
  id: true,
  createdAt: true,
});

export const insertWeeklySummarySchema = createInsertSchema(weeklySummaries).omit({
  id: true,
  createdAt: true,
});

export const insertMonthlySummarySchema = createInsertSchema(monthlySummaries).omit({
  id: true,
  createdAt: true,
});

export const insertInventorySessionSchema = createInsertSchema(inventorySessions).omit({
  id: true,
  createdAt: true,
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type DailySummary = typeof dailySummaries.$inferSelect;
export type InsertDailySummary = z.infer<typeof insertDailySummarySchema>;

export type WeeklySummary = typeof weeklySummaries.$inferSelect;
export type InsertWeeklySummary = z.infer<typeof insertWeeklySummarySchema>;

export type MonthlySummary = typeof monthlySummaries.$inferSelect;
export type InsertMonthlySummary = z.infer<typeof insertMonthlySummarySchema>;

export type InventorySession = typeof inventorySessions.$inferSelect;
export type InsertInventorySession = z.infer<typeof insertInventorySessionSchema>;

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;

// Cart item type for frontend
export type CartItem = {
  id: string;
  name: string;
  price: string;
  quantity: number;
};
