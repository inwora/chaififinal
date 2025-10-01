import { MongoClient, Db, Collection } from 'mongodb';
import { 
  type User, 
  type InsertUser, 
  type MenuItem, 
  type InsertMenuItem, 
  type Transaction, 
  type InsertTransaction, 
  type DailySummary, 
  type InsertDailySummary, 
  type WeeklySummary, 
  type InsertWeeklySummary, 
  type MonthlySummary, 
  type InsertMonthlySummary 
} from "@shared/schema";
import { type IStorage } from "../storage";

export class MongoStorage implements IStorage {
  private client: MongoClient;
  private db: Db;
  private users: Collection<User>;
  private menuItems: Collection<MenuItem>;
  private transactions: Collection<Transaction>;
  private dailySummaries: Collection<DailySummary>;
  private weeklySummaries: Collection<WeeklySummary>;
  private monthlySummaries: Collection<MonthlySummary>;
  private isConnected: boolean = false;

  constructor(connectionString: string, databaseName: string = 'chai-fi') {
    this.client = new MongoClient(connectionString);
    this.db = this.client.db(databaseName);
    this.users = this.db.collection<User>('users');
    this.menuItems = this.db.collection<MenuItem>('menu_items');
    this.transactions = this.db.collection<Transaction>('transactions');
    this.dailySummaries = this.db.collection<DailySummary>('daily_summaries');
    this.weeklySummaries = this.db.collection<WeeklySummary>('weekly_summaries');
    this.monthlySummaries = this.db.collection<MonthlySummary>('monthly_summaries');
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
      this.isConnected = true;
      console.log('Connected to MongoDB Atlas');
      
      // Initialize default data
      await this.initializeDefaultData();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.close();
      this.isConnected = false;
      console.log('Disconnected from MongoDB Atlas');
    }
  }

  private async initializeDefaultData(): Promise<void> {
    // Create default users if they don't exist
    const existingAdmin = await this.users.findOne({ username: "admin" });
    if (!existingAdmin) {
      await this.createUser({ username: "admin", password: "admin@2020" }); // Admin user
    }
    
    const existingUser = await this.users.findOne({ username: "Chai-fi" });
    if (!existingUser) {
      await this.createUser({ username: "Chai-fi", password: "Chai-fi@2025" }); // Regular user
    }

    // Create default menu items if collection is empty
    const menuCount = await this.menuItems.countDocuments();
    if (menuCount === 0) {
      await this.initializeMenuItems();
    }

    // Create indexes
    await this.createIndexes();
  }

  private async createIndexes(): Promise<void> {
    await this.users.createIndex({ username: 1 }, { unique: true });
    await this.transactions.createIndex({ date: 1 });
    await this.transactions.createIndex({ createdAt: -1 });
    await this.dailySummaries.createIndex({ date: 1 }, { unique: true });
    await this.weeklySummaries.createIndex({ weekStart: 1 }, { unique: true });
    await this.monthlySummaries.createIndex({ month: 1 }, { unique: true });
  }

  private async initializeMenuItems(): Promise<void> {
    const defaultItems: (InsertMenuItem & { _id?: string })[] = [
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
    const user = await this.users.findOne({ id });
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await this.users.findOne({ username });
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = new Date().getTime().toString();
    const user: User = { ...insertUser, id };
    await this.users.insertOne(user);
    return user;
  }

  // Menu Items
  async getMenuItems(): Promise<MenuItem[]> {
    return await this.menuItems.find({}).toArray();
  }

  async getMenuItem(id: string): Promise<MenuItem | undefined> {
    const item = await this.menuItems.findOne({ id });
    return item || undefined;
  }

  async createMenuItem(insertItem: InsertMenuItem): Promise<MenuItem> {
    const id = new Date().getTime().toString();
    const item: MenuItem = { 
      ...insertItem, 
      id,
      available: insertItem.available ?? true 
    };
    await this.menuItems.insertOne(item);
    return item;
  }

  async updateMenuItem(id: string, updateData: Partial<MenuItem>): Promise<MenuItem | undefined> {
    const result = await this.menuItems.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    return result || undefined;
  }

  // Transactions
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = new Date().getTime().toString();
    const now = new Date();
    const transaction: Transaction = { 
      ...insertTransaction, 
      id,
      createdAt: now,
      billerName: insertTransaction.billerName || 'Sriram',
      extras: insertTransaction.extras || null,
      splitPayment: insertTransaction.splitPayment || null,
      creditor: insertTransaction.creditor || null
    };
    
    await this.transactions.insertOne(transaction);
    await this.updateSummaries(transaction);
    
    return transaction;
  }

  async getTransactions(limit?: number): Promise<Transaction[]> {
    const query = this.transactions.find({}).sort({ createdAt: -1 });
    if (limit) query.limit(limit);
    return await query.toArray();
  }

  async getTransactionsByDate(date: string): Promise<Transaction[]> {
    return await this.transactions
      .find({ date })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
    return await this.transactions
      .find({ 
        date: { 
          $gte: startDate, 
          $lte: endDate 
        } 
      })
      .sort({ createdAt: -1 })
      .toArray();
  }

  // Daily Summaries
  async createDailySummary(insertSummary: InsertDailySummary): Promise<DailySummary> {
    const id = new Date().getTime().toString();
    const summary: DailySummary = { 
      ...insertSummary, 
      id,
      createdAt: new Date()
    };
    
    await this.dailySummaries.insertOne(summary);
    return summary;
  }

  async getDailySummary(date: string): Promise<DailySummary | undefined> {
    const summary = await this.dailySummaries.findOne({ date });
    return summary || undefined;
  }

  async getDailySummaries(limit?: number): Promise<DailySummary[]> {
    const query = this.dailySummaries.find({}).sort({ date: -1 });
    if (limit) query.limit(limit);
    return await query.toArray();
  }

  // Weekly Summaries
  async createWeeklySummary(insertSummary: InsertWeeklySummary): Promise<WeeklySummary> {
    const id = new Date().getTime().toString();
    const summary: WeeklySummary = { 
      ...insertSummary, 
      id,
      createdAt: new Date()
    };
    
    await this.weeklySummaries.insertOne(summary);
    return summary;
  }

  async getWeeklySummary(weekStart: string): Promise<WeeklySummary | undefined> {
    const summary = await this.weeklySummaries.findOne({ weekStart });
    return summary || undefined;
  }

  async getWeeklySummaries(limit?: number): Promise<WeeklySummary[]> {
    const query = this.weeklySummaries.find({}).sort({ weekStart: -1 });
    if (limit) query.limit(limit);
    return await query.toArray();
  }

  // Monthly Summaries
  async createMonthlySummary(insertSummary: InsertMonthlySummary): Promise<MonthlySummary> {
    const id = new Date().getTime().toString();
    const summary: MonthlySummary = { 
      ...insertSummary, 
      id,
      createdAt: new Date()
    };
    
    await this.monthlySummaries.insertOne(summary);
    return summary;
  }

  async getMonthlySummary(month: string): Promise<MonthlySummary | undefined> {
    const summary = await this.monthlySummaries.findOne({ month });
    return summary || undefined;
  }

  async getMonthlySummaries(limit?: number): Promise<MonthlySummary[]> {
    const query = this.monthlySummaries.find({}).sort({ month: -1 });
    if (limit) query.limit(limit);
    return await query.toArray();
  }

  private async updateSummaries(transaction: Transaction): Promise<void> {
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
      const newTotalAmount = (parseFloat(existingDaily.totalAmount) + parseFloat(transaction.totalAmount)).toFixed(2);
      const newGpayAmount = (parseFloat(existingDaily.gpayAmount) + gpayAmount).toFixed(2);
      const newCashAmount = (parseFloat(existingDaily.cashAmount) + cashAmount).toFixed(2);
      const newOrderCount = existingDaily.orderCount + 1;

      await this.dailySummaries.updateOne(
        { date: transaction.date },
        {
          $set: {
            totalAmount: newTotalAmount,
            gpayAmount: newGpayAmount,
            cashAmount: newCashAmount,
            orderCount: newOrderCount
          }
        }
      );
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
      const newTotalAmount = (parseFloat(existingWeekly.totalAmount) + parseFloat(transaction.totalAmount)).toFixed(2);
      const newGpayAmount = (parseFloat(existingWeekly.gpayAmount) + gpayAmount).toFixed(2);
      const newCashAmount = (parseFloat(existingWeekly.cashAmount) + cashAmount).toFixed(2);
      const newOrderCount = existingWeekly.orderCount + 1;

      await this.weeklySummaries.updateOne(
        { weekStart },
        {
          $set: {
            totalAmount: newTotalAmount,
            gpayAmount: newGpayAmount,
            cashAmount: newCashAmount,
            orderCount: newOrderCount
          }
        }
      );
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
      const newTotalAmount = (parseFloat(existingMonthly.totalAmount) + parseFloat(transaction.totalAmount)).toFixed(2);
      const newGpayAmount = (parseFloat(existingMonthly.gpayAmount) + gpayAmount).toFixed(2);
      const newCashAmount = (parseFloat(existingMonthly.cashAmount) + cashAmount).toFixed(2);
      const newOrderCount = existingMonthly.orderCount + 1;

      await this.monthlySummaries.updateOne(
        { month },
        {
          $set: {
            totalAmount: newTotalAmount,
            gpayAmount: newGpayAmount,
            cashAmount: newCashAmount,
            orderCount: newOrderCount
          }
        }
      );
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
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    return monday.toISOString().split('T')[0];
  }

  private getWeekEnd(date: Date): string {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? 0 : 7);
    const sunday = new Date(date.setDate(diff));
    return sunday.toISOString().split('T')[0];
  }

  // Clear data methods
  async clearDataByDay(date: string): Promise<void> {
    await this.transactions.deleteMany({ date });
    await this.dailySummaries.deleteOne({ date });
  }

  async clearDataByWeek(weekStart: string): Promise<void> {
    const weekEnd = this.getWeekEnd(new Date(weekStart));
    await this.transactions.deleteMany({ 
      date: { 
        $gte: weekStart, 
        $lte: weekEnd 
      } 
    });
    await this.weeklySummaries.deleteOne({ weekStart });
  }

  async clearDataByMonth(month: string): Promise<void> {
    const startDate = month + '-01';
    const endDate = month + '-31';
    await this.transactions.deleteMany({ 
      date: { 
        $gte: startDate, 
        $lte: endDate 
      } 
    });
    await this.monthlySummaries.deleteOne({ month });
  }
}
