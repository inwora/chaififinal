import dotenv from "dotenv";
dotenv.config();

import { type User, type InsertUser, type Category, type InsertCategory, type MenuItem, type InsertMenuItem, type Transaction, type InsertTransaction, type DailySummary, type InsertDailySummary, type WeeklySummary, type InsertWeeklySummary, type MonthlySummary, type InsertMonthlySummary, type InventorySession, type InsertInventorySession, type InventoryItem, type InsertInventoryItem } from "@shared/schema";
import { randomUUID } from "crypto";
import { format } from "date-fns";
import { MongoStorage } from "./db/mongodb";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Categories
  getCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  getCategoryByName(name: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<Category>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;

  // Menu Items
  getMenuItems(): Promise<MenuItem[]>;
  getMenuItem(id: string): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: string, item: Partial<MenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: string): Promise<boolean>;
  deleteMenuItems(ids: string[]): Promise<number>;
  deleteAllMenuItems(): Promise<number>;

  // Transactions
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactions(limit?: number): Promise<Transaction[]>;
  getTransactionsByDate(date: string): Promise<Transaction[]>;
  getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]>;

  // Daily Summaries
  createDailySummary(summary: InsertDailySummary): Promise<DailySummary>;
  getDailySummary(date: string): Promise<DailySummary | undefined>;
  getDailySummaries(limit?: number): Promise<DailySummary[]>;

  // Weekly Summaries
  createWeeklySummary(summary: InsertWeeklySummary): Promise<WeeklySummary>;
  getWeeklySummary(weekStart: string): Promise<WeeklySummary | undefined>;
  getWeeklySummaries(limit?: number): Promise<WeeklySummary[]>;

  // Monthly Summaries
  createMonthlySummary(summary: InsertMonthlySummary): Promise<MonthlySummary>;
  getMonthlySummary(month: string): Promise<MonthlySummary | undefined>;
  getMonthlySummaries(limit?: number): Promise<MonthlySummary[]>;

  // Clear data methods
  clearDataByDay(date: string): Promise<void>;
  clearDataByWeek(weekStart: string): Promise<void>;
  clearDataByMonth(month: string): Promise<void>;

  // Inventory methods
  createInventorySession(session: InsertInventorySession): Promise<InventorySession>;
  getInventorySessionByDate(date: string): Promise<InventorySession | undefined>;
  getInventorySessions(): Promise<InventorySession[]>;
  updateInventorySession(id: string, updates: Partial<InventorySession>): Promise<InventorySession | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  getInventoryItemsBySession(sessionId: string): Promise<InventoryItem[]>;
  updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem | undefined>;
  getInventoryItemsWithMenu(sessionId: string): Promise<(InventoryItem & { menuItem: MenuItem })[]>;
  calculateStockOutForSession(sessionId: string, date: string): Promise<void>;
  clearInventoryByDate(date: string): Promise<void>;

  // MongoDB connection methods
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private categories: Map<string, Category>;
  private menuItems: Map<string, MenuItem>;
  private transactions: Map<string, Transaction>;
  private dailySummaries: Map<string, DailySummary>;
  private weeklySummaries: Map<string, WeeklySummary>;
  private monthlySummaries: Map<string, MonthlySummary>;
  private inventorySessions: Map<string, InventorySession>;
  private inventoryItems: Map<string, InventoryItem>;

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.menuItems = new Map();
    this.transactions = new Map();
    this.dailySummaries = new Map();
    this.weeklySummaries = new Map();
    this.monthlySummaries = new Map();
    this.inventorySessions = new Map();
    this.inventoryItems = new Map();

    // Initialize default users
    this.createUser({ username: "admin", password: "admin@2020" }); // Admin user
    this.createUser({ username: "Chai-fi", password: "Chai-fi@2025" }); // Regular user

    // Initialize categories
    this.initializeCategories();

    // Initialize menu items
    this.initializeMenuItems();
  }

  private async initializeMenuItems() {
    const defaultItems: InsertMenuItem[] = [
      {
        name: "Masala Chai",
        description: "Traditional spiced tea",
        price: "25.00",
        category: "Tea",
        image: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        available: true,
      },
      {
        name: "Green Tea",
        description: "Healthy herbal tea",
        price: "30.00",
        category: "Tea",
        image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        available: true,
      },
      {
        name: "Cappuccino",
        description: "Rich coffee with foam",
        price: "80.00",
        category: "Coffee",
        image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        available: true,
      },
      {
        name: "Black Coffee",
        description: "Strong black coffee",
        price: "50.00",
        category: "Coffee",
        image: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        available: true,
      },
      {
        name: "Samosa",
        description: "Crispy fried snack",
        price: "20.00",
        category: "Snacks",
        image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        available: true,
      },
      {
        name: "Veg Sandwich",
        description: "Fresh vegetable sandwich",
        price: "60.00",
        category: "Snacks",
        image: "https://images.unsplash.com/photo-1509722747041-616f39b57569?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        available: true,
      },
      {
        name: "Orange Juice",
        description: "Fresh squeezed orange",
        price: "40.00",
        category: "Beverages",
        image: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        available: true,
      },
      {
        name: "Mango Lassi",
        description: "Sweet yogurt drink",
        price: "45.00",
        category: "Beverages",
        image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        available: true,
      },
    ];

    for (const item of defaultItems) {
      await this.createMenuItem(item);
    }
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Categories
  private async initializeCategories() {
    const defaultCategories: InsertCategory[] = [
      { name: "Tea", subCategories: [] },
      { name: "Coffee", subCategories: [] },
      { name: "Snacks", subCategories: [] },
      { name: "Beverages", subCategories: [] },
    ];

    for (const category of defaultCategories) {
      await this.createCategory(category);
    }
  }

  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async getCategory(id: string): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async getCategoryByName(name: string): Promise<Category | undefined> {
    return Array.from(this.categories.values()).find(
      (category) => category.name === name,
    );
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = randomUUID();
    const category: Category = { 
      ...insertCategory, 
      id,
      createdAt: new Date(),
      subCategories: insertCategory.subCategories || []
    };
    this.categories.set(id, category);
    return category;
  }

  async updateCategory(id: string, updateData: Partial<Category>): Promise<Category | undefined> {
    const existing = this.categories.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updateData };
    this.categories.set(id, updated);
    return updated;
  }

  async deleteCategory(id: string): Promise<boolean> {
    return this.categories.delete(id);
  }

  // Menu Items
  async getMenuItems(): Promise<MenuItem[]> {
    const items = Array.from(this.menuItems.values());
    console.log(`Total items in MemStorage: ${items.length}`);
    console.log(`Returning all ${items.length} menu items (no filtering)`);
    return items;
  }

  async getMenuItem(id: string): Promise<MenuItem | undefined> {
    return this.menuItems.get(id);
  }

  async createMenuItem(insertItem: InsertMenuItem): Promise<MenuItem> {
    const id = randomUUID();
    const item: MenuItem = { ...insertItem, id, available: insertItem.available ?? true };
    console.log("Creating menu item in MemStorage:", item);
    this.menuItems.set(id, item);
    console.log("Menu item stored successfully with ID:", id);
    return item;
  }

  async updateMenuItem(id: string, updateData: Partial<MenuItem>): Promise<MenuItem | undefined> {
    const existing = this.menuItems.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updateData };
    this.menuItems.set(id, updated);
    return updated;
  }

  async deleteMenuItem(id: string): Promise<boolean> {
    return this.menuItems.delete(id);
  }

  async deleteMenuItems(ids: string[]): Promise<number> {
    let deletedCount = 0;
    for (const id of ids) {
      if (this.menuItems.delete(id)) {
        deletedCount++;
      }
    }
    return deletedCount;
  }

  async deleteAllMenuItems(): Promise<number> {
    const count = this.menuItems.size;
    this.menuItems.clear();
    return count;
  }

  // Transactions
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = randomUUID();
    const now = new Date();
    const transaction: Transaction = { 
      ...insertTransaction, 
      id,
      createdAt: now,
      billerName: insertTransaction.billerName || 'Sriram',
      extras: insertTransaction.extras || null,
      splitPayment: insertTransaction.splitPayment || null
    };
    this.transactions.set(id, transaction);

    // Update summaries
    await this.updateSummaries(transaction);

    return transaction;
  }

  async getTransactions(limit?: number): Promise<Transaction[]> {
    const transactions = Array.from(this.transactions.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return limit ? transactions.slice(0, limit) : transactions;
  }

  async getTransactionsByDate(date: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(t => t.date === date)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(t => t.date >= startDate && t.date <= endDate)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Daily Summaries
  async createDailySummary(insertSummary: InsertDailySummary): Promise<DailySummary> {
    const id = randomUUID();
    const summary: DailySummary = { 
      ...insertSummary, 
      id,
      createdAt: new Date()
    };
    this.dailySummaries.set(insertSummary.date, summary);
    return summary;
  }

  async getDailySummary(date: string): Promise<DailySummary | undefined> {
    return this.dailySummaries.get(date);
  }

  async getDailySummaries(limit?: number): Promise<DailySummary[]> {
    const summaries = Array.from(this.dailySummaries.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return limit ? summaries.slice(0, limit) : summaries;
  }

  // Weekly Summaries
  async createWeeklySummary(insertSummary: InsertWeeklySummary): Promise<WeeklySummary> {
    const id = randomUUID();
    const summary: WeeklySummary = { 
      ...insertSummary, 
      id,
      createdAt: new Date()
    };
    this.weeklySummaries.set(insertSummary.weekStart, summary);
    return summary;
  }

  async getWeeklySummary(weekStart: string): Promise<WeeklySummary | undefined> {
    return this.weeklySummaries.get(weekStart);
  }

  async getWeeklySummaries(limit?: number): Promise<WeeklySummary[]> {
    const summaries = Array.from(this.weeklySummaries.values())
      .sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime());
    
    return limit ? summaries.slice(0, limit) : summaries;
  }

  // Monthly Summaries
  async createMonthlySummary(insertSummary: InsertMonthlySummary): Promise<MonthlySummary> {
    const id = randomUUID();
    const summary: MonthlySummary = { 
      ...insertSummary, 
      id,
      createdAt: new Date()
    };
    this.monthlySummaries.set(insertSummary.month, summary);
    return summary;
  }

  async getMonthlySummary(month: string): Promise<MonthlySummary | undefined> {
    return this.monthlySummaries.get(month);
  }

  async getMonthlySummaries(limit?: number): Promise<MonthlySummary[]> {
    const summaries = Array.from(this.monthlySummaries.values())
      .sort((a, b) => new Date(b.month + '-01').getTime() - new Date(a.month + '-01').getTime());
    
    return limit ? summaries.slice(0, limit) : summaries;
  }

  private async updateSummaries(transaction: Transaction) {
    let gpayAmount = 0;
    let cashAmount = 0;

    if (transaction.paymentMethod === 'gpay') {
      gpayAmount = parseFloat(transaction.totalAmount);
    } else if (transaction.paymentMethod === 'cash') {
      cashAmount = parseFloat(transaction.totalAmount);
    } else if (transaction.paymentMethod === 'split' && transaction.splitPayment) {
      const splitData = transaction.splitPayment as any;
      gpayAmount = splitData.gpayAmount || 0;
      cashAmount = splitData.cashAmount || 0;
    }

    // Update daily summary
    const existingDaily = await this.getDailySummary(transaction.date);
    if (existingDaily) {
      existingDaily.totalAmount = (parseFloat(existingDaily.totalAmount) + parseFloat(transaction.totalAmount)).toFixed(2);
      existingDaily.gpayAmount = (parseFloat(existingDaily.gpayAmount) + gpayAmount).toFixed(2);
      existingDaily.cashAmount = (parseFloat(existingDaily.cashAmount) + cashAmount).toFixed(2);
      existingDaily.orderCount += 1;
      this.dailySummaries.set(transaction.date, existingDaily);
    } else {
      await this.createDailySummary({
        date: transaction.date,
        totalAmount: transaction.totalAmount,
        gpayAmount: gpayAmount.toFixed(2),
        cashAmount: cashAmount.toFixed(2),
        orderCount: 1,
      });
    }

    // Update weekly summary
    const weekStart = this.getWeekStart(new Date(transaction.date));
    const weekEnd = this.getWeekEnd(new Date(transaction.date));
    const existingWeekly = await this.getWeeklySummary(weekStart);
    if (existingWeekly) {
      existingWeekly.totalAmount = (parseFloat(existingWeekly.totalAmount) + parseFloat(transaction.totalAmount)).toFixed(2);
      existingWeekly.gpayAmount = (parseFloat(existingWeekly.gpayAmount) + gpayAmount).toFixed(2);
      existingWeekly.cashAmount = (parseFloat(existingWeekly.cashAmount) + cashAmount).toFixed(2);
      existingWeekly.orderCount += 1;
      this.weeklySummaries.set(weekStart, existingWeekly);
    } else {
      await this.createWeeklySummary({
        weekStart,
        weekEnd,
        totalAmount: transaction.totalAmount,
        gpayAmount: gpayAmount.toFixed(2),
        cashAmount: cashAmount.toFixed(2),
        orderCount: 1,
      });
    }

    // Update monthly summary
    const month = transaction.date.substring(0, 7); // YYYY-MM
    const existingMonthly = await this.getMonthlySummary(month);
    if (existingMonthly) {
      existingMonthly.totalAmount = (parseFloat(existingMonthly.totalAmount) + parseFloat(transaction.totalAmount)).toFixed(2);
      existingMonthly.gpayAmount = (parseFloat(existingMonthly.gpayAmount) + gpayAmount).toFixed(2);
      existingMonthly.cashAmount = (parseFloat(existingMonthly.cashAmount) + cashAmount).toFixed(2);
      existingMonthly.orderCount += 1;
      this.monthlySummaries.set(month, existingMonthly);
    } else {
      await this.createMonthlySummary({
        month,
        totalAmount: transaction.totalAmount,
        gpayAmount: gpayAmount.toFixed(2),
        cashAmount: cashAmount.toFixed(2),
        orderCount: 1,
      });
    }
  }

  private getWeekStart(date: Date): string {
    const day = date.getDay();
    const diff = date.getDate() - day;
    const weekStart = new Date(date.setDate(diff));
    return format(weekStart, 'yyyy-MM-dd');
  }

  private getWeekEnd(date: Date): string {
    const day = date.getDay();
    const diff = date.getDate() - day + 6;
    const weekEnd = new Date(date.setDate(diff));
    return format(weekEnd, 'yyyy-MM-dd');
  }

  // Clear data methods
  async clearDataByDay(date: string): Promise<void> {
    // Get the daily summary before deleting to update higher-level summaries
    const dailySummary = await this.getDailySummary(date);

    // Remove transactions for the day
    const transactionsToDelete = Array.from(this.transactions.entries())
      .filter(([_, transaction]) => transaction.date === date)
      .map(([id, _]) => id);

    transactionsToDelete.forEach(id => this.transactions.delete(id));

    // Remove inventory data for the day
    const inventorySession = await this.getInventorySessionByDate(date);
    if (inventorySession) {
      // Remove all inventory items for this session
      const itemsToDelete = Array.from(this.inventoryItems.entries())
        .filter(([_, item]) => item.sessionId === inventorySession.id)
        .map(([id, _]) => id);
      
      itemsToDelete.forEach(id => this.inventoryItems.delete(id));
      
      // Remove the inventory session
      this.inventorySessions.delete(inventorySession.id);
    }

    // Update weekly summary by subtracting the daily amounts
    if (dailySummary) {
      const weekStart = this.getWeekStart(new Date(date));
      const existingWeekly = await this.getWeeklySummary(weekStart);
      if (existingWeekly) {
        existingWeekly.totalAmount = (parseFloat(existingWeekly.totalAmount) - parseFloat(dailySummary.totalAmount)).toFixed(2);
        existingWeekly.gpayAmount = (parseFloat(existingWeekly.gpayAmount) - parseFloat(dailySummary.gpayAmount)).toFixed(2);
        existingWeekly.cashAmount = (parseFloat(existingWeekly.cashAmount) - parseFloat(dailySummary.cashAmount)).toFixed(2);
        existingWeekly.orderCount -= dailySummary.orderCount;
        this.weeklySummaries.set(weekStart, existingWeekly);
      }

      // Update monthly summary by subtracting the daily amounts
      const month = date.substring(0, 7); // YYYY-MM
      const existingMonthly = await this.getMonthlySummary(month);
      if (existingMonthly) {
        existingMonthly.totalAmount = (parseFloat(existingMonthly.totalAmount) - parseFloat(dailySummary.totalAmount)).toFixed(2);
        existingMonthly.gpayAmount = (parseFloat(existingMonthly.gpayAmount) - parseFloat(dailySummary.gpayAmount)).toFixed(2);
        existingMonthly.cashAmount = (parseFloat(existingMonthly.cashAmount) - parseFloat(dailySummary.cashAmount)).toFixed(2);
        existingMonthly.orderCount -= dailySummary.orderCount;
        this.monthlySummaries.set(month, existingMonthly);
      }
    }

    // Remove daily summary
    this.dailySummaries.delete(date);
  }

  async clearDataByWeek(weekStart: string): Promise<void> {
    const weekEnd = this.getWeekEnd(new Date(weekStart));

    // Get the weekly summary before deleting to update monthly summary
    const weeklySummary = await this.getWeeklySummary(weekStart);

    // Remove transactions for the week
    const transactionsToDelete = Array.from(this.transactions.entries())
      .filter(([_, transaction]) => transaction.date >= weekStart && transaction.date <= weekEnd)
      .map(([id, _]) => id);

    transactionsToDelete.forEach(id => this.transactions.delete(id));

    // Remove inventory data for the week
    const dates = this.getDatesBetween(weekStart, weekEnd);
    for (const date of dates) {
      const inventorySession = await this.getInventorySessionByDate(date);
      if (inventorySession) {
        // Remove all inventory items for this session
        const itemsToDelete = Array.from(this.inventoryItems.entries())
          .filter(([_, item]) => item.sessionId === inventorySession.id)
          .map(([id, _]) => id);
        
        itemsToDelete.forEach(id => this.inventoryItems.delete(id));
        
        // Remove the inventory session
        this.inventorySessions.delete(inventorySession.id);
      }
    }

    // Update monthly summary by subtracting the weekly amounts
    if (weeklySummary) {
      const month = weekStart.substring(0, 7); // YYYY-MM
      const existingMonthly = await this.getMonthlySummary(month);
      if (existingMonthly) {
        existingMonthly.totalAmount = (parseFloat(existingMonthly.totalAmount) - parseFloat(weeklySummary.totalAmount)).toFixed(2);
        existingMonthly.gpayAmount = (parseFloat(existingMonthly.gpayAmount) - parseFloat(weeklySummary.gpayAmount)).toFixed(2);
        existingMonthly.cashAmount = (parseFloat(existingMonthly.cashAmount) - parseFloat(weeklySummary.cashAmount)).toFixed(2);
        existingMonthly.orderCount -= weeklySummary.orderCount;
        this.monthlySummaries.set(month, existingMonthly);
      }
    }

    // Remove weekly summary
    this.weeklySummaries.delete(weekStart);

    // Remove affected daily summaries
    dates.forEach(date => this.dailySummaries.delete(date));
  }

  async clearDataByMonth(month: string): Promise<void> {
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;
    
    // Remove transactions for the month
    const transactionsToDelete = Array.from(this.transactions.entries())
      .filter(([_, transaction]) => transaction.date >= startDate && transaction.date <= endDate)
      .map(([id, _]) => id);
    
    transactionsToDelete.forEach(id => this.transactions.delete(id));
    
    // Remove inventory data for the month
    const dates = this.getDatesBetween(startDate, endDate);
    for (const date of dates) {
      const inventorySession = await this.getInventorySessionByDate(date);
      if (inventorySession) {
        // Remove all inventory items for this session
        const itemsToDelete = Array.from(this.inventoryItems.entries())
          .filter(([_, item]) => item.sessionId === inventorySession.id)
          .map(([id, _]) => id);
        
        itemsToDelete.forEach(id => this.inventoryItems.delete(id));
        
        // Remove the inventory session
        this.inventorySessions.delete(inventorySession.id);
      }
    }
    
    // Remove monthly summary
    this.monthlySummaries.delete(month);
    
    // Remove affected daily summaries
    dates.forEach(date => this.dailySummaries.delete(date));
    
    // Remove affected weekly summaries
    const weeklySummariesToDelete = Array.from(this.weeklySummaries.entries())
      .filter(([weekStart, _]) => weekStart >= startDate && weekStart <= endDate)
      .map(([weekStart, _]) => weekStart);
    
    weeklySummariesToDelete.forEach(weekStart => this.weeklySummaries.delete(weekStart));
  }

  private getDatesBetween(startDate: string, endDate: string): string[] {
    const dates = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }

  // Inventory methods
  async createInventorySession(session: InsertInventorySession): Promise<InventorySession> {
    const id = randomUUID();
    const inventorySession: InventorySession = {
      ...session,
      id,
      createdAt: new Date(),
    };
    this.inventorySessions.set(id, inventorySession);
    return inventorySession;
  }

  async getInventorySessionByDate(date: string): Promise<InventorySession | undefined> {
    return Array.from(this.inventorySessions.values()).find(
      session => session.date === date
    );
  }

  async getInventorySessions(): Promise<InventorySession[]> {
    return Array.from(this.inventorySessions.values())
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }

  async updateInventorySession(id: string, updates: Partial<InventorySession>): Promise<InventorySession | undefined> {
    const existing = this.inventorySessions.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.inventorySessions.set(id, updated);
    return updated;
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const id = randomUUID();
    const inventoryItem: InventoryItem = {
      ...item,
      id,
      createdAt: new Date(),
    };
    this.inventoryItems.set(id, inventoryItem);
    return inventoryItem;
  }

  async getInventoryItemsBySession(sessionId: string): Promise<InventoryItem[]> {
    return Array.from(this.inventoryItems.values())
      .filter(item => item.sessionId === sessionId);
  }

  async updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem | undefined> {
    const existing = this.inventoryItems.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.inventoryItems.set(id, updated);
    return updated;
  }

  async getInventoryItemsWithMenu(sessionId: string): Promise<(InventoryItem & { menuItem: MenuItem })[]> {
    const items = await this.getInventoryItemsBySession(sessionId);
    const result = [];
    
    for (const item of items) {
      const menuItem = await this.getMenuItem(item.menuItemId);
      if (menuItem) {
        result.push({ ...item, menuItem });
      }
    }
    
    return result;
  }

  async calculateStockOutForSession(sessionId: string, date: string): Promise<void> {
    const transactions = await this.getTransactionsByDate(date);
    const inventoryItems = await this.getInventoryItemsBySession(sessionId);
    
    // Calculate stock out for each inventory item
    for (const inventoryItem of inventoryItems) {
      let stockOut = 0;
      
      // Sum up quantities from all transactions
      for (const transaction of transactions) {
        const items = transaction.items as any[];
        const soldItem = items.find(i => i.id === inventoryItem.menuItemId);
        if (soldItem) {
          stockOut += soldItem.quantity;
        }
      }
      
      // Update inventory item
      const stockLeft = inventoryItem.stockIn - stockOut;
      await this.updateInventoryItem(inventoryItem.id, {
        stockOut,
        stockLeft,
      });
    }
  }

  async clearInventoryByDate(date: string): Promise<void> {
    // Remove inventory data for the specified date only
    const inventorySession = await this.getInventorySessionByDate(date);
    if (inventorySession) {
      // Remove all inventory items for this session
      const itemsToDelete = Array.from(this.inventoryItems.entries())
        .filter(([_, item]) => item.sessionId === inventorySession.id)
        .map(([id, _]) => id);
      
      itemsToDelete.forEach(id => this.inventoryItems.delete(id));
      
      // Remove the inventory session
      this.inventorySessions.delete(inventorySession.id);
    }
  }
}

// Storage instance for graceful shutdown
let storageInstance: IStorage;

// Initialize storage synchronously for in-memory, async for MongoDB
const mongoConnectionString = process.env.MONGODB_URI || process.env.DATABASE_URL;

export let storage: IStorage;
let storageInitialized = false;
let storageInitPromise: Promise<void> | null = null;

// Initialize storage immediately
if (mongoConnectionString && mongoConnectionString.includes('mongodb')) {
  console.log("  Initializing MongoDB Atlas storage...");
  // Initialize in-memory storage first as fallback
  storage = new MemStorage();
  storageInstance = storage;
  
  // Then try to connect to MongoDB
  storageInitPromise = (async () => {
    try {
      const mongoStorage = new MongoStorage(mongoConnectionString);
      await mongoStorage.connect();
      storage = mongoStorage;
      storageInstance = mongoStorage;
      storageInitialized = true;
      console.log(" MongoDB Atlas storage initialized successfully");
    } catch (error) {
      console.error("❌ MongoDB Atlas initialization failed:", error);
      console.log("  Using in-memory storage...");
      storageInitialized = true;
    }
  })();
} else {
  console.log("📝 MongoDB connection string not provided, using in-memory storage");
  storage = new MemStorage();
  storageInstance = storage;
  storageInitialized = true;
  console.log(" In-memory storage initialized");
}

// Export a function to wait for storage initialization
export async function waitForStorage(): Promise<IStorage> {
  if (storageInitPromise) {
    await storageInitPromise;
  }
  return storage;
}

// Graceful shutdown for MongoDB
process.on('SIGINT', async () => {
  if (storageInstance && 'disconnect' in storageInstance) {
    await storageInstance.disconnect?.();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (storageInstance && 'disconnect' in storageInstance) {
    await storageInstance.disconnect?.();
  }
  process.exit(0);
});