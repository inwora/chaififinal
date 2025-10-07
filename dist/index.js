// server/index.ts
import dotenv2 from "dotenv";
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import dotenv from "dotenv";
import { randomUUID } from "crypto";
import { format } from "date-fns";

// server/db/mongodb.ts
import { MongoClient } from "mongodb";
var MongoStorage = class {
  client;
  db;
  users;
  categories;
  menuItems;
  transactions;
  dailySummaries;
  weeklySummaries;
  monthlySummaries;
  inventorySessions;
  inventoryItems;
  isConnected = false;
  constructor(connectionString, databaseName = "chai-fi") {
    this.client = new MongoClient(connectionString);
    this.db = this.client.db(databaseName);
    this.users = this.db.collection("users");
    this.categories = this.db.collection("categories");
    this.menuItems = this.db.collection("menu_items");
    this.transactions = this.db.collection("transactions");
    this.dailySummaries = this.db.collection("daily_summaries");
    this.weeklySummaries = this.db.collection("weekly_summaries");
    this.monthlySummaries = this.db.collection("monthly_summaries");
    this.inventorySessions = this.db.collection("inventory_sessions");
    this.inventoryItems = this.db.collection("inventory_items");
  }
  async connect() {
    if (!this.isConnected) {
      await this.client.connect();
      this.isConnected = true;
      console.log("Connected to MongoDB Atlas");
      await this.initializeDefaultData();
    }
  }
  async disconnect() {
    if (this.isConnected) {
      await this.client.close();
      this.isConnected = false;
      console.log("Disconnected from MongoDB Atlas");
    }
  }
  async initializeDefaultData() {
    const existingAdmin = await this.users.findOne({ username: "admin" });
    if (!existingAdmin) {
      await this.createUser({ username: "admin", password: "admin@2020" });
    }
    const existingUser = await this.users.findOne({ username: "Chai-fi" });
    if (!existingUser) {
      await this.createUser({ username: "Chai-fi", password: "Chai-fi@2025" });
    }
    const categoryCount = await this.categories.countDocuments();
    if (categoryCount === 0) {
      await this.initializeCategories();
    }
    const menuCount = await this.menuItems.countDocuments();
    if (menuCount === 0) {
      await this.initializeMenuItems();
    }
    await this.createIndexes();
  }
  async createIndexes() {
    await this.users.createIndex({ username: 1 }, { unique: true });
    await this.categories.createIndex({ name: 1 }, { unique: true });
    await this.transactions.createIndex({ date: 1 });
    await this.transactions.createIndex({ createdAt: -1 });
    await this.dailySummaries.createIndex({ date: 1 }, { unique: true });
    await this.weeklySummaries.createIndex({ weekStart: 1 }, { unique: true });
    await this.monthlySummaries.createIndex({ month: 1 }, { unique: true });
  }
  async initializeCategories() {
    const defaultCategories = [
      { name: "Tea", subCategories: [] },
      { name: "Coffee", subCategories: [] },
      { name: "Snacks", subCategories: [] },
      { name: "Beverages", subCategories: [] }
    ];
    for (const category of defaultCategories) {
      await this.createCategory(category);
    }
  }
  async initializeMenuItems() {
    const defaultItems = [
      {
        name: "Masala Chai",
        description: "Traditional spiced tea",
        price: "25.00",
        category: "Tea",
        image: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        available: true
      },
      {
        name: "Green Tea",
        description: "Healthy herbal tea",
        price: "30.00",
        category: "Tea",
        image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        available: true
      },
      {
        name: "Cappuccino",
        description: "Rich coffee with foam",
        price: "80.00",
        category: "Coffee",
        image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        available: true
      },
      {
        name: "Black Coffee",
        description: "Strong black coffee",
        price: "50.00",
        category: "Coffee",
        image: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        available: true
      },
      {
        name: "Samosa",
        description: "Crispy fried snack",
        price: "20.00",
        category: "Snacks",
        image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        available: true
      },
      {
        name: "Veg Sandwich",
        description: "Fresh vegetable sandwich",
        price: "60.00",
        category: "Snacks",
        image: "https://images.unsplash.com/photo-1509722747041-616f39b57569?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        available: true
      },
      {
        name: "Orange Juice",
        description: "Fresh squeezed orange",
        price: "40.00",
        category: "Beverages",
        image: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        available: true
      },
      {
        name: "Mango Lassi",
        description: "Sweet yogurt drink",
        price: "45.00",
        category: "Beverages",
        image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        available: true
      }
    ];
    for (const item of defaultItems) {
      await this.createMenuItem(item);
    }
  }
  // Users
  async getUser(id) {
    const user = await this.users.findOne({ id });
    return user || void 0;
  }
  async getUserByUsername(username) {
    const user = await this.users.findOne({ username });
    return user || void 0;
  }
  async createUser(insertUser) {
    const id = (/* @__PURE__ */ new Date()).getTime().toString();
    const user = { ...insertUser, id };
    await this.users.insertOne(user);
    return user;
  }
  // Categories
  async getCategories() {
    return await this.categories.find({}).toArray();
  }
  async getCategory(id) {
    const category = await this.categories.findOne({ id });
    return category || void 0;
  }
  async getCategoryByName(name) {
    const category = await this.categories.findOne({ name });
    return category || void 0;
  }
  async createCategory(insertCategory) {
    const id = (/* @__PURE__ */ new Date()).getTime().toString();
    const category = {
      ...insertCategory,
      id,
      createdAt: /* @__PURE__ */ new Date(),
      subCategories: insertCategory.subCategories || []
    };
    await this.categories.insertOne(category);
    return category;
  }
  async updateCategory(id, updateData) {
    const result = await this.categories.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: "after" }
    );
    return result || void 0;
  }
  async deleteCategory(id) {
    const result = await this.categories.deleteOne({ id });
    return result.deletedCount > 0;
  }
  // Menu Items
  async getMenuItems() {
    const items = await this.menuItems.find({}).toArray();
    console.log(`Total items in MongoDB: ${items.length}`);
    console.log(`Returning all ${items.length} menu items (no filtering)`);
    return items;
  }
  async getMenuItem(id) {
    const item = await this.menuItems.findOne({ id });
    return item || void 0;
  }
  async createMenuItem(insertItem) {
    const id = (/* @__PURE__ */ new Date()).getTime().toString();
    const item = {
      ...insertItem,
      id,
      available: insertItem.available ?? true
    };
    console.log("Creating menu item in MongoDB:", item);
    await this.menuItems.insertOne(item);
    console.log("Menu item inserted successfully with ID:", id);
    const verifyItem = await this.menuItems.findOne({ id });
    console.log("Verification - Item found in DB:", verifyItem ? "Yes" : "No");
    return item;
  }
  async updateMenuItem(id, updateData) {
    const result = await this.menuItems.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: "after" }
    );
    return result || void 0;
  }
  async deleteMenuItem(id) {
    const result = await this.menuItems.deleteOne({ id });
    return result.deletedCount > 0;
  }
  async deleteMenuItems(ids) {
    const result = await this.menuItems.deleteMany({ id: { $in: ids } });
    return result.deletedCount;
  }
  async deleteAllMenuItems() {
    const result = await this.menuItems.deleteMany({});
    return result.deletedCount;
  }
  // Transactions
  async createTransaction(insertTransaction) {
    const id = (/* @__PURE__ */ new Date()).getTime().toString();
    const now = /* @__PURE__ */ new Date();
    const transaction = {
      ...insertTransaction,
      id,
      createdAt: now,
      billerName: insertTransaction.billerName || "Sriram",
      extras: insertTransaction.extras || null,
      splitPayment: insertTransaction.splitPayment || null,
      creditor: insertTransaction.creditor || null
    };
    await this.transactions.insertOne(transaction);
    await this.updateSummaries(transaction);
    return transaction;
  }
  async getTransactions(limit) {
    const query = this.transactions.find({}).sort({ createdAt: -1 });
    if (limit) query.limit(limit);
    return await query.toArray();
  }
  async getTransactionsByDate(date) {
    return await this.transactions.find({ date }).sort({ createdAt: -1 }).toArray();
  }
  async getTransactionsByDateRange(startDate, endDate) {
    return await this.transactions.find({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ createdAt: -1 }).toArray();
  }
  // Daily Summaries
  async createDailySummary(insertSummary) {
    const id = (/* @__PURE__ */ new Date()).getTime().toString();
    const summary = {
      ...insertSummary,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    await this.dailySummaries.insertOne(summary);
    return summary;
  }
  async getDailySummary(date) {
    const summary = await this.dailySummaries.findOne({ date });
    return summary || void 0;
  }
  async getDailySummaries(limit) {
    const query = this.dailySummaries.find({}).sort({ date: -1 });
    if (limit) query.limit(limit);
    return await query.toArray();
  }
  // Weekly Summaries
  async createWeeklySummary(insertSummary) {
    const id = (/* @__PURE__ */ new Date()).getTime().toString();
    const summary = {
      ...insertSummary,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    await this.weeklySummaries.insertOne(summary);
    return summary;
  }
  async getWeeklySummary(weekStart) {
    const summary = await this.weeklySummaries.findOne({ weekStart });
    return summary || void 0;
  }
  async getWeeklySummaries(limit) {
    const query = this.weeklySummaries.find({}).sort({ weekStart: -1 });
    if (limit) query.limit(limit);
    return await query.toArray();
  }
  // Monthly Summaries
  async createMonthlySummary(insertSummary) {
    const id = (/* @__PURE__ */ new Date()).getTime().toString();
    const summary = {
      ...insertSummary,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    await this.monthlySummaries.insertOne(summary);
    return summary;
  }
  async getMonthlySummary(month) {
    const summary = await this.monthlySummaries.findOne({ month });
    return summary || void 0;
  }
  async getMonthlySummaries(limit) {
    const query = this.monthlySummaries.find({}).sort({ month: -1 });
    if (limit) query.limit(limit);
    return await query.toArray();
  }
  async updateSummaries(transaction) {
    let gpayAmount = 0;
    let cashAmount = 0;
    if (transaction.paymentMethod === "gpay") {
      gpayAmount = parseFloat(transaction.totalAmount);
    } else if (transaction.paymentMethod === "cash") {
      cashAmount = parseFloat(transaction.totalAmount);
    } else if (transaction.paymentMethod === "split" && transaction.splitPayment) {
      const splitData = transaction.splitPayment;
      gpayAmount = splitData.gpayAmount || 0;
      cashAmount = splitData.cashAmount || 0;
    }
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
        orderCount: 1
      });
    }
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
        orderCount: 1
      });
    }
    const month = transaction.date.substring(0, 7);
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
        orderCount: 1
      });
    }
  }
  getWeekStart(date) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    return monday.toISOString().split("T")[0];
  }
  getWeekEnd(date) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? 0 : 7);
    const sunday = new Date(date.setDate(diff));
    return sunday.toISOString().split("T")[0];
  }
  // Clear data methods
  async clearDataByDay(date) {
    const dailySummary = await this.getDailySummary(date);
    await this.transactions.deleteMany({ date });
    const inventorySession = await this.getInventorySessionByDate(date);
    if (inventorySession) {
      await this.inventoryItems.deleteMany({ sessionId: inventorySession.id });
      await this.inventorySessions.deleteOne({ id: inventorySession.id });
    }
    if (dailySummary) {
      const weekStart = this.getWeekStart(new Date(date));
      const existingWeekly = await this.getWeeklySummary(weekStart);
      if (existingWeekly) {
        existingWeekly.totalAmount = (parseFloat(existingWeekly.totalAmount) - parseFloat(dailySummary.totalAmount)).toFixed(2);
        existingWeekly.gpayAmount = (parseFloat(existingWeekly.gpayAmount) - parseFloat(dailySummary.gpayAmount)).toFixed(2);
        existingWeekly.cashAmount = (parseFloat(existingWeekly.cashAmount) - parseFloat(dailySummary.cashAmount)).toFixed(2);
        existingWeekly.orderCount -= dailySummary.orderCount;
        await this.weeklySummaries.updateOne(
          { weekStart },
          { $set: existingWeekly }
        );
      }
      const month = date.substring(0, 7);
      const existingMonthly = await this.getMonthlySummary(month);
      if (existingMonthly) {
        existingMonthly.totalAmount = (parseFloat(existingMonthly.totalAmount) - parseFloat(dailySummary.totalAmount)).toFixed(2);
        existingMonthly.gpayAmount = (parseFloat(existingMonthly.gpayAmount) - parseFloat(dailySummary.gpayAmount)).toFixed(2);
        existingMonthly.cashAmount = (parseFloat(existingMonthly.cashAmount) - parseFloat(dailySummary.cashAmount)).toFixed(2);
        existingMonthly.orderCount -= dailySummary.orderCount;
        await this.monthlySummaries.updateOne(
          { month },
          { $set: existingMonthly }
        );
      }
    }
    await this.dailySummaries.deleteOne({ date });
  }
  async clearDataByWeek(weekStart) {
    const weekEnd = this.getWeekEnd(new Date(weekStart));
    const weeklySummary = await this.getWeeklySummary(weekStart);
    await this.transactions.deleteMany({
      date: {
        $gte: weekStart,
        $lte: weekEnd
      }
    });
    const dates = this.getDatesBetween(weekStart, weekEnd);
    for (const date of dates) {
      const inventorySession = await this.getInventorySessionByDate(date);
      if (inventorySession) {
        await this.inventoryItems.deleteMany({ sessionId: inventorySession.id });
        await this.inventorySessions.deleteOne({ id: inventorySession.id });
      }
    }
    await this.dailySummaries.deleteMany({
      date: {
        $gte: weekStart,
        $lte: weekEnd
      }
    });
    if (weeklySummary) {
      const month = weekStart.substring(0, 7);
      const existingMonthly = await this.getMonthlySummary(month);
      if (existingMonthly) {
        existingMonthly.totalAmount = (parseFloat(existingMonthly.totalAmount) - parseFloat(weeklySummary.totalAmount)).toFixed(2);
        existingMonthly.gpayAmount = (parseFloat(existingMonthly.gpayAmount) - parseFloat(weeklySummary.gpayAmount)).toFixed(2);
        existingMonthly.cashAmount = (parseFloat(existingMonthly.cashAmount) - parseFloat(weeklySummary.cashAmount)).toFixed(2);
        existingMonthly.orderCount -= weeklySummary.orderCount;
        await this.monthlySummaries.updateOne(
          { month },
          { $set: existingMonthly }
        );
      }
    }
    await this.weeklySummaries.deleteOne({ weekStart });
  }
  async clearDataByMonth(month) {
    const startDate = month + "-01";
    const endDate = month + "-31";
    await this.transactions.deleteMany({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });
    const dates = this.getDatesBetween(startDate, endDate);
    for (const date of dates) {
      const inventorySession = await this.getInventorySessionByDate(date);
      if (inventorySession) {
        await this.inventoryItems.deleteMany({ sessionId: inventorySession.id });
        await this.inventorySessions.deleteOne({ id: inventorySession.id });
      }
    }
    await this.dailySummaries.deleteMany({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });
    await this.weeklySummaries.deleteMany({
      weekStart: {
        $gte: startDate,
        $lte: endDate
      }
    });
    await this.monthlySummaries.deleteOne({ month });
  }
  // Inventory methods
  async createInventorySession(session) {
    const id = (/* @__PURE__ */ new Date()).getTime().toString();
    const inventorySession = {
      ...session,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    await this.inventorySessions.insertOne(inventorySession);
    return inventorySession;
  }
  async getInventorySessionByDate(date) {
    const session = await this.inventorySessions.findOne({ date });
    return session || void 0;
  }
  async getInventorySessions() {
    return await this.inventorySessions.find({}).sort({ startTime: -1 }).toArray();
  }
  async updateInventorySession(id, updates) {
    const result = await this.inventorySessions.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: "after" }
    );
    return result || void 0;
  }
  async createInventoryItem(item) {
    const id = (/* @__PURE__ */ new Date()).getTime().toString() + Math.random().toString(36).substr(2, 9);
    const inventoryItem = {
      ...item,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    await this.inventoryItems.insertOne(inventoryItem);
    return inventoryItem;
  }
  async getInventoryItemsBySession(sessionId) {
    return await this.inventoryItems.find({ sessionId }).toArray();
  }
  async updateInventoryItem(id, updates) {
    const result = await this.inventoryItems.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: "after" }
    );
    return result || void 0;
  }
  async getInventoryItemsWithMenu(sessionId) {
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
  async calculateStockOutForSession(sessionId, date) {
    const transactions2 = await this.getTransactionsByDate(date);
    const inventoryItems2 = await this.getInventoryItemsBySession(sessionId);
    const stockOutMap = /* @__PURE__ */ new Map();
    for (const transaction of transactions2) {
      const items = transaction.items;
      for (const item of items) {
        const currentStockOut = stockOutMap.get(item.id) || 0;
        stockOutMap.set(item.id, currentStockOut + item.quantity);
      }
    }
    const updatePromises = inventoryItems2.map((inventoryItem) => {
      const stockOut = stockOutMap.get(inventoryItem.menuItemId) || 0;
      const stockLeft = inventoryItem.stockIn - stockOut;
      return this.updateInventoryItem(inventoryItem.id, {
        stockOut,
        stockLeft
      });
    });
    await Promise.all(updatePromises);
  }
  async clearInventoryByDate(date) {
    const inventorySession = await this.getInventorySessionByDate(date);
    if (inventorySession) {
      await this.inventoryItems.deleteMany({ sessionId: inventorySession.id });
      await this.inventorySessions.deleteOne({ id: inventorySession.id });
    }
  }
};

// server/storage.ts
dotenv.config();
var MemStorage = class {
  users;
  categories;
  menuItems;
  transactions;
  dailySummaries;
  weeklySummaries;
  monthlySummaries;
  inventorySessions;
  inventoryItems;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.categories = /* @__PURE__ */ new Map();
    this.menuItems = /* @__PURE__ */ new Map();
    this.transactions = /* @__PURE__ */ new Map();
    this.dailySummaries = /* @__PURE__ */ new Map();
    this.weeklySummaries = /* @__PURE__ */ new Map();
    this.monthlySummaries = /* @__PURE__ */ new Map();
    this.inventorySessions = /* @__PURE__ */ new Map();
    this.inventoryItems = /* @__PURE__ */ new Map();
    this.createUser({ username: "admin", password: "admin@2020" });
    this.createUser({ username: "Chai-fi", password: "Chai-fi@2025" });
    this.initializeCategories();
    this.initializeMenuItems();
  }
  async initializeMenuItems() {
    const defaultItems = [
      {
        name: "Masala Chai",
        description: "Traditional spiced tea",
        price: "25.00",
        category: "Tea",
        image: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        available: true
      },
      {
        name: "Green Tea",
        description: "Healthy herbal tea",
        price: "30.00",
        category: "Tea",
        image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        available: true
      },
      {
        name: "Cappuccino",
        description: "Rich coffee with foam",
        price: "80.00",
        category: "Coffee",
        image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        available: true
      },
      {
        name: "Black Coffee",
        description: "Strong black coffee",
        price: "50.00",
        category: "Coffee",
        image: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        available: true
      },
      {
        name: "Samosa",
        description: "Crispy fried snack",
        price: "20.00",
        category: "Snacks",
        image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        available: true
      },
      {
        name: "Veg Sandwich",
        description: "Fresh vegetable sandwich",
        price: "60.00",
        category: "Snacks",
        image: "https://images.unsplash.com/photo-1509722747041-616f39b57569?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        available: true
      },
      {
        name: "Orange Juice",
        description: "Fresh squeezed orange",
        price: "40.00",
        category: "Beverages",
        image: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        available: true
      },
      {
        name: "Mango Lassi",
        description: "Sweet yogurt drink",
        price: "45.00",
        category: "Beverages",
        image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        available: true
      }
    ];
    for (const item of defaultItems) {
      await this.createMenuItem(item);
    }
  }
  // Users
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = randomUUID();
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  // Categories
  async initializeCategories() {
    const defaultCategories = [
      { name: "Tea", subCategories: [] },
      { name: "Coffee", subCategories: [] },
      { name: "Snacks", subCategories: [] },
      { name: "Beverages", subCategories: [] }
    ];
    for (const category of defaultCategories) {
      await this.createCategory(category);
    }
  }
  async getCategories() {
    return Array.from(this.categories.values());
  }
  async getCategory(id) {
    return this.categories.get(id);
  }
  async getCategoryByName(name) {
    return Array.from(this.categories.values()).find(
      (category) => category.name === name
    );
  }
  async createCategory(insertCategory) {
    const id = randomUUID();
    const category = {
      ...insertCategory,
      id,
      createdAt: /* @__PURE__ */ new Date(),
      subCategories: insertCategory.subCategories || []
    };
    this.categories.set(id, category);
    return category;
  }
  async updateCategory(id, updateData) {
    const existing = this.categories.get(id);
    if (!existing) return void 0;
    const updated = { ...existing, ...updateData };
    this.categories.set(id, updated);
    return updated;
  }
  async deleteCategory(id) {
    return this.categories.delete(id);
  }
  // Menu Items
  async getMenuItems() {
    const items = Array.from(this.menuItems.values());
    console.log(`Total items in MemStorage: ${items.length}`);
    console.log(`Returning all ${items.length} menu items (no filtering)`);
    return items;
  }
  async getMenuItem(id) {
    return this.menuItems.get(id);
  }
  async createMenuItem(insertItem) {
    const id = randomUUID();
    const item = { ...insertItem, id, available: insertItem.available ?? true };
    console.log("Creating menu item in MemStorage:", item);
    this.menuItems.set(id, item);
    console.log("Menu item stored successfully with ID:", id);
    return item;
  }
  async updateMenuItem(id, updateData) {
    const existing = this.menuItems.get(id);
    if (!existing) return void 0;
    const updated = { ...existing, ...updateData };
    this.menuItems.set(id, updated);
    return updated;
  }
  async deleteMenuItem(id) {
    return this.menuItems.delete(id);
  }
  async deleteMenuItems(ids) {
    let deletedCount = 0;
    for (const id of ids) {
      if (this.menuItems.delete(id)) {
        deletedCount++;
      }
    }
    return deletedCount;
  }
  async deleteAllMenuItems() {
    const count = this.menuItems.size;
    this.menuItems.clear();
    return count;
  }
  // Transactions
  async createTransaction(insertTransaction) {
    const id = randomUUID();
    const now = /* @__PURE__ */ new Date();
    const transaction = {
      ...insertTransaction,
      id,
      createdAt: now,
      billerName: insertTransaction.billerName || "Sriram",
      extras: insertTransaction.extras || null,
      splitPayment: insertTransaction.splitPayment || null
    };
    this.transactions.set(id, transaction);
    await this.updateSummaries(transaction);
    return transaction;
  }
  async getTransactions(limit) {
    const transactions2 = Array.from(this.transactions.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return limit ? transactions2.slice(0, limit) : transactions2;
  }
  async getTransactionsByDate(date) {
    return Array.from(this.transactions.values()).filter((t) => t.date === date).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async getTransactionsByDateRange(startDate, endDate) {
    return Array.from(this.transactions.values()).filter((t) => t.date >= startDate && t.date <= endDate).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  // Daily Summaries
  async createDailySummary(insertSummary) {
    const id = randomUUID();
    const summary = {
      ...insertSummary,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.dailySummaries.set(insertSummary.date, summary);
    return summary;
  }
  async getDailySummary(date) {
    return this.dailySummaries.get(date);
  }
  async getDailySummaries(limit) {
    const summaries = Array.from(this.dailySummaries.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return limit ? summaries.slice(0, limit) : summaries;
  }
  // Weekly Summaries
  async createWeeklySummary(insertSummary) {
    const id = randomUUID();
    const summary = {
      ...insertSummary,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.weeklySummaries.set(insertSummary.weekStart, summary);
    return summary;
  }
  async getWeeklySummary(weekStart) {
    return this.weeklySummaries.get(weekStart);
  }
  async getWeeklySummaries(limit) {
    const summaries = Array.from(this.weeklySummaries.values()).sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime());
    return limit ? summaries.slice(0, limit) : summaries;
  }
  // Monthly Summaries
  async createMonthlySummary(insertSummary) {
    const id = randomUUID();
    const summary = {
      ...insertSummary,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.monthlySummaries.set(insertSummary.month, summary);
    return summary;
  }
  async getMonthlySummary(month) {
    return this.monthlySummaries.get(month);
  }
  async getMonthlySummaries(limit) {
    const summaries = Array.from(this.monthlySummaries.values()).sort((a, b) => (/* @__PURE__ */ new Date(b.month + "-01")).getTime() - (/* @__PURE__ */ new Date(a.month + "-01")).getTime());
    return limit ? summaries.slice(0, limit) : summaries;
  }
  async updateSummaries(transaction) {
    let gpayAmount = 0;
    let cashAmount = 0;
    if (transaction.paymentMethod === "gpay") {
      gpayAmount = parseFloat(transaction.totalAmount);
    } else if (transaction.paymentMethod === "cash") {
      cashAmount = parseFloat(transaction.totalAmount);
    } else if (transaction.paymentMethod === "split" && transaction.splitPayment) {
      const splitData = transaction.splitPayment;
      gpayAmount = splitData.gpayAmount || 0;
      cashAmount = splitData.cashAmount || 0;
    }
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
        orderCount: 1
      });
    }
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
        orderCount: 1
      });
    }
    const month = transaction.date.substring(0, 7);
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
        orderCount: 1
      });
    }
  }
  getWeekStart(date) {
    const day = date.getDay();
    const diff = date.getDate() - day;
    const weekStart = new Date(date.setDate(diff));
    return format(weekStart, "yyyy-MM-dd");
  }
  getWeekEnd(date) {
    const day = date.getDay();
    const diff = date.getDate() - day + 6;
    const weekEnd = new Date(date.setDate(diff));
    return format(weekEnd, "yyyy-MM-dd");
  }
  // Clear data methods
  async clearDataByDay(date) {
    const dailySummary = await this.getDailySummary(date);
    const transactionsToDelete = Array.from(this.transactions.entries()).filter(([_, transaction]) => transaction.date === date).map(([id, _]) => id);
    transactionsToDelete.forEach((id) => this.transactions.delete(id));
    const inventorySession = await this.getInventorySessionByDate(date);
    if (inventorySession) {
      const itemsToDelete = Array.from(this.inventoryItems.entries()).filter(([_, item]) => item.sessionId === inventorySession.id).map(([id, _]) => id);
      itemsToDelete.forEach((id) => this.inventoryItems.delete(id));
      this.inventorySessions.delete(inventorySession.id);
    }
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
      const month = date.substring(0, 7);
      const existingMonthly = await this.getMonthlySummary(month);
      if (existingMonthly) {
        existingMonthly.totalAmount = (parseFloat(existingMonthly.totalAmount) - parseFloat(dailySummary.totalAmount)).toFixed(2);
        existingMonthly.gpayAmount = (parseFloat(existingMonthly.gpayAmount) - parseFloat(dailySummary.gpayAmount)).toFixed(2);
        existingMonthly.cashAmount = (parseFloat(existingMonthly.cashAmount) - parseFloat(dailySummary.cashAmount)).toFixed(2);
        existingMonthly.orderCount -= dailySummary.orderCount;
        this.monthlySummaries.set(month, existingMonthly);
      }
    }
    this.dailySummaries.delete(date);
  }
  async clearDataByWeek(weekStart) {
    const weekEnd = this.getWeekEnd(new Date(weekStart));
    const weeklySummary = await this.getWeeklySummary(weekStart);
    const transactionsToDelete = Array.from(this.transactions.entries()).filter(([_, transaction]) => transaction.date >= weekStart && transaction.date <= weekEnd).map(([id, _]) => id);
    transactionsToDelete.forEach((id) => this.transactions.delete(id));
    const dates = this.getDatesBetween(weekStart, weekEnd);
    for (const date of dates) {
      const inventorySession = await this.getInventorySessionByDate(date);
      if (inventorySession) {
        const itemsToDelete = Array.from(this.inventoryItems.entries()).filter(([_, item]) => item.sessionId === inventorySession.id).map(([id, _]) => id);
        itemsToDelete.forEach((id) => this.inventoryItems.delete(id));
        this.inventorySessions.delete(inventorySession.id);
      }
    }
    if (weeklySummary) {
      const month = weekStart.substring(0, 7);
      const existingMonthly = await this.getMonthlySummary(month);
      if (existingMonthly) {
        existingMonthly.totalAmount = (parseFloat(existingMonthly.totalAmount) - parseFloat(weeklySummary.totalAmount)).toFixed(2);
        existingMonthly.gpayAmount = (parseFloat(existingMonthly.gpayAmount) - parseFloat(weeklySummary.gpayAmount)).toFixed(2);
        existingMonthly.cashAmount = (parseFloat(existingMonthly.cashAmount) - parseFloat(weeklySummary.cashAmount)).toFixed(2);
        existingMonthly.orderCount -= weeklySummary.orderCount;
        this.monthlySummaries.set(month, existingMonthly);
      }
    }
    this.weeklySummaries.delete(weekStart);
    dates.forEach((date) => this.dailySummaries.delete(date));
  }
  async clearDataByMonth(month) {
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;
    const transactionsToDelete = Array.from(this.transactions.entries()).filter(([_, transaction]) => transaction.date >= startDate && transaction.date <= endDate).map(([id, _]) => id);
    transactionsToDelete.forEach((id) => this.transactions.delete(id));
    const dates = this.getDatesBetween(startDate, endDate);
    for (const date of dates) {
      const inventorySession = await this.getInventorySessionByDate(date);
      if (inventorySession) {
        const itemsToDelete = Array.from(this.inventoryItems.entries()).filter(([_, item]) => item.sessionId === inventorySession.id).map(([id, _]) => id);
        itemsToDelete.forEach((id) => this.inventoryItems.delete(id));
        this.inventorySessions.delete(inventorySession.id);
      }
    }
    this.monthlySummaries.delete(month);
    dates.forEach((date) => this.dailySummaries.delete(date));
    const weeklySummariesToDelete = Array.from(this.weeklySummaries.entries()).filter(([weekStart, _]) => weekStart >= startDate && weekStart <= endDate).map(([weekStart, _]) => weekStart);
    weeklySummariesToDelete.forEach((weekStart) => this.weeklySummaries.delete(weekStart));
  }
  getDatesBetween(startDate, endDate) {
    const dates = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
      dates.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }
  // Inventory methods
  async createInventorySession(session) {
    const id = randomUUID();
    const inventorySession = {
      ...session,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.inventorySessions.set(id, inventorySession);
    return inventorySession;
  }
  async getInventorySessionByDate(date) {
    return Array.from(this.inventorySessions.values()).find(
      (session) => session.date === date
    );
  }
  async getInventorySessions() {
    return Array.from(this.inventorySessions.values()).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }
  async updateInventorySession(id, updates) {
    const existing = this.inventorySessions.get(id);
    if (!existing) return void 0;
    const updated = { ...existing, ...updates };
    this.inventorySessions.set(id, updated);
    return updated;
  }
  async createInventoryItem(item) {
    const id = randomUUID();
    const inventoryItem = {
      ...item,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.inventoryItems.set(id, inventoryItem);
    return inventoryItem;
  }
  async getInventoryItemsBySession(sessionId) {
    return Array.from(this.inventoryItems.values()).filter((item) => item.sessionId === sessionId);
  }
  async updateInventoryItem(id, updates) {
    const existing = this.inventoryItems.get(id);
    if (!existing) return void 0;
    const updated = { ...existing, ...updates };
    this.inventoryItems.set(id, updated);
    return updated;
  }
  async getInventoryItemsWithMenu(sessionId) {
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
  async calculateStockOutForSession(sessionId, date) {
    const transactions2 = await this.getTransactionsByDate(date);
    const inventoryItems2 = await this.getInventoryItemsBySession(sessionId);
    const stockOutMap = /* @__PURE__ */ new Map();
    for (const transaction of transactions2) {
      const items = transaction.items;
      for (const item of items) {
        const currentStockOut = stockOutMap.get(item.id) || 0;
        stockOutMap.set(item.id, currentStockOut + item.quantity);
      }
    }
    const updatePromises = inventoryItems2.map((inventoryItem) => {
      const stockOut = stockOutMap.get(inventoryItem.menuItemId) || 0;
      const stockLeft = inventoryItem.stockIn - stockOut;
      return this.updateInventoryItem(inventoryItem.id, {
        stockOut,
        stockLeft
      });
    });
    await Promise.all(updatePromises);
  }
  async clearInventoryByDate(date) {
    const inventorySession = await this.getInventorySessionByDate(date);
    if (inventorySession) {
      const itemsToDelete = Array.from(this.inventoryItems.entries()).filter(([_, item]) => item.sessionId === inventorySession.id).map(([id, _]) => id);
      itemsToDelete.forEach((id) => this.inventoryItems.delete(id));
      this.inventorySessions.delete(inventorySession.id);
    }
  }
};
var storageInstance;
var mongoConnectionString = process.env.MONGODB_URI || process.env.DATABASE_URL;
var storage;
var storageInitialized = false;
var storageInitPromise = null;
if (mongoConnectionString && mongoConnectionString.includes("mongodb")) {
  console.log("  Initializing MongoDB Atlas storage...");
  storage = new MemStorage();
  storageInstance = storage;
  storageInitPromise = (async () => {
    try {
      const mongoStorage = new MongoStorage(mongoConnectionString);
      await mongoStorage.connect();
      storage = mongoStorage;
      storageInstance = mongoStorage;
      storageInitialized = true;
      console.log(" MongoDB Atlas storage initialized successfully");
    } catch (error) {
      console.error("\u274C MongoDB Atlas initialization failed:", error);
      console.log("  Using in-memory storage...");
      storageInitialized = true;
    }
  })();
} else {
  console.log("\u{1F4DD} MongoDB connection string not provided, using in-memory storage");
  storage = new MemStorage();
  storageInstance = storage;
  storageInitialized = true;
  console.log(" In-memory storage initialized");
}
async function waitForStorage() {
  if (storageInitPromise) {
    await storageInitPromise;
  }
  return storage;
}
process.on("SIGINT", async () => {
  if (storageInstance && "disconnect" in storageInstance) {
    await storageInstance.disconnect?.();
  }
  process.exit(0);
});
process.on("SIGTERM", async () => {
  if (storageInstance && "disconnect" in storageInstance) {
    await storageInstance.disconnect?.();
  }
  process.exit(0);
});

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  subCategories: jsonb("sub_categories").default([]),
  // Array of strings
  createdAt: timestamp("created_at").notNull().default(sql`now()`)
});
var menuItems = pgTable("menu_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  subCategory: text("sub_category"),
  image: text("image").notNull(),
  available: boolean("available").notNull().default(true)
});
var transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  items: jsonb("items").notNull(),
  // Array of {id, name, price, quantity}
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  // 'gpay', 'cash', 'split', or 'creditor'
  billerName: text("biller_name").notNull().default("Sriram"),
  splitPayment: jsonb("split_payment"),
  // {gpayAmount: number, cashAmount: number} for split payments
  extras: jsonb("extras"),
  // Array of {name: string, amount: number}
  creditor: jsonb("creditor"),
  // {name: string, totalAmount: number, paidAmount: number, balanceAmount: number} for creditor payments
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  date: text("date").notNull(),
  // YYYY-MM-DD format
  dayName: text("day_name").notNull(),
  time: text("time").notNull()
  // HH:MM AM/PM format
});
var dailySummaries = pgTable("daily_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull().unique(),
  // YYYY-MM-DD format
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  gpayAmount: decimal("gpay_amount", { precision: 10, scale: 2 }).notNull(),
  cashAmount: decimal("cash_amount", { precision: 10, scale: 2 }).notNull(),
  orderCount: integer("order_count").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`)
});
var weeklySummaries = pgTable("weekly_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  weekStart: text("week_start").notNull(),
  // YYYY-MM-DD format (Monday)
  weekEnd: text("week_end").notNull(),
  // YYYY-MM-DD format (Sunday)
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  gpayAmount: decimal("gpay_amount", { precision: 10, scale: 2 }).notNull(),
  cashAmount: decimal("cash_amount", { precision: 10, scale: 2 }).notNull(),
  orderCount: integer("order_count").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`)
});
var monthlySummaries = pgTable("monthly_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  month: text("month").notNull(),
  // YYYY-MM format
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  gpayAmount: decimal("gpay_amount", { precision: 10, scale: 2 }).notNull(),
  cashAmount: decimal("cash_amount", { precision: 10, scale: 2 }).notNull(),
  orderCount: integer("order_count").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`)
});
var inventorySessions = pgTable("inventory_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull(),
  // YYYY-MM-DD format
  status: text("status").notNull(),
  // 'pre-billing', 'billing', 'ended'
  startTime: timestamp("start_time").notNull().default(sql`now()`),
  endTime: timestamp("end_time"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`)
});
var inventoryItems = pgTable("inventory_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  menuItemId: varchar("menu_item_id").notNull(),
  stockIn: integer("stock_in").notNull(),
  stockOut: integer("stock_out").notNull().default(0),
  stockLeft: integer("stock_left").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`)
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true
});
var insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true
});
var insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true
});
var insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true
});
var insertDailySummarySchema = createInsertSchema(dailySummaries).omit({
  id: true,
  createdAt: true
});
var insertWeeklySummarySchema = createInsertSchema(weeklySummaries).omit({
  id: true,
  createdAt: true
});
var insertMonthlySummarySchema = createInsertSchema(monthlySummaries).omit({
  id: true,
  createdAt: true
});
var insertInventorySessionSchema = createInsertSchema(inventorySessions).omit({
  id: true,
  createdAt: true
});
var insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
  createdAt: true
});

// server/routes.ts
import { z } from "zod";
async function registerRoutes(app2) {
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const currentStorage = await waitForStorage();
      const user = await currentStorage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      res.json({ user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });
  app2.get("/api/categories", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const categories2 = await currentStorage.getCategories();
      res.json(categories2);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });
  app2.post("/api/categories", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const { name, subCategories } = req.body;
      const existing = await currentStorage.getCategoryByName(name);
      if (existing) {
        return res.status(400).json({ error: "Category already exists" });
      }
      const newCategory = await currentStorage.createCategory({
        name,
        subCategories: subCategories || []
      });
      res.json(newCategory);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  });
  app2.put("/api/categories/:id", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const { name, subCategories } = req.body;
      const updatedCategory = await currentStorage.updateCategory(req.params.id, {
        name,
        subCategories
      });
      if (!updatedCategory) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(updatedCategory);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ error: "Failed to update category" });
    }
  });
  app2.delete("/api/categories/:id", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const success = await currentStorage.deleteCategory(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ error: "Failed to delete category" });
    }
  });
  app2.get("/api/menu", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const items = await currentStorage.getMenuItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      res.status(500).json({ error: "Failed to fetch menu items" });
    }
  });
  app2.get("/api/menu/sales", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      let startDate, endDate;
      if (req.query.date) {
        startDate = req.query.date;
        endDate = startDate;
      } else {
        const month = req.query.month || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
        const year = parseInt(month.split("-")[0]);
        const monthNum = parseInt(month.split("-")[1]) - 1;
        startDate = new Date(year, monthNum, 1).toISOString().split("T")[0];
        endDate = new Date(year, monthNum + 1, 0).toISOString().split("T")[0];
      }
      const transactions2 = await currentStorage.getTransactionsByDateRange(startDate, endDate);
      const menuItems2 = await currentStorage.getMenuItems();
      const salesData = menuItems2.map((item) => {
        const totalSold = transactions2.reduce((count, transaction) => {
          const items = transaction.items;
          const itemSold = items.find((i) => i.id === item.id);
          return count + (itemSold ? itemSold.quantity : 0);
        }, 0);
        return {
          id: item.id,
          name: item.name,
          category: item.category,
          price: item.price,
          totalSold,
          revenue: totalSold * parseFloat(item.price)
        };
      });
      res.json(salesData.sort((a, b) => b.totalSold - a.totalSold));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch menu item sales" });
    }
  });
  app2.get("/api/menu/:id", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const item = await currentStorage.getMenuItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch menu item" });
    }
  });
  app2.post("/api/menu", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const { name, description, price, category, subCategory, image, available } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Menu item name is required" });
      }
      const newItem = await currentStorage.createMenuItem({
        name: name?.trim() || "",
        description: description?.trim() || "",
        price: price?.trim() || "",
        category: category?.trim() || "",
        subCategory: subCategory?.trim() || void 0,
        image: image?.trim() || "",
        available: available ?? true
      });
      console.log("Menu item created:", newItem);
      res.json(newItem);
    } catch (error) {
      console.error("Error creating menu item:", error);
      res.status(500).json({ error: "Failed to create menu item" });
    }
  });
  app2.put("/api/menu/:id", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const { name, description, price, category, subCategory, image, available } = req.body;
      const updatedItem = await currentStorage.updateMenuItem(req.params.id, {
        name,
        description,
        price,
        category,
        subCategory,
        image,
        available
      });
      if (!updatedItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      res.json(updatedItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to update menu item" });
    }
  });
  app2.delete("/api/menu/:id", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const item = await currentStorage.getMenuItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      const success = await currentStorage.deleteMenuItem(req.params.id);
      if (success) {
        res.json({ message: "Menu item deleted successfully" });
      } else {
        res.status(500).json({ error: "Failed to delete menu item" });
      }
    } catch (error) {
      console.error("Error deleting menu item:", error);
      res.status(500).json({ error: "Failed to delete menu item" });
    }
  });
  app2.post("/api/menu/bulk-delete", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "Invalid or empty ids array" });
      }
      const deletedCount = await currentStorage.deleteMenuItems(ids);
      res.json({
        message: `${deletedCount} menu item(s) deleted successfully`,
        deletedCount
      });
    } catch (error) {
      console.error("Error bulk deleting menu items:", error);
      res.status(500).json({ error: "Failed to delete menu items" });
    }
  });
  app2.delete("/api/menu", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const deletedCount = await currentStorage.deleteAllMenuItems();
      res.json({
        message: `All ${deletedCount} menu items deleted successfully`,
        deletedCount
      });
    } catch (error) {
      console.error("Error deleting all menu items:", error);
      res.status(500).json({ error: "Failed to delete all menu items" });
    }
  });
  app2.post("/api/transactions", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const validatedData = insertTransactionSchema.parse(req.body);
      const transaction = await currentStorage.createTransaction(validatedData);
      res.json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid transaction data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create transaction" });
    }
  });
  app2.get("/api/transactions", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const limit = req.query.limit ? parseInt(req.query.limit) : void 0;
      const transactions2 = await currentStorage.getTransactions(limit);
      res.json(transactions2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });
  app2.get("/api/transactions/date/:date", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const transactions2 = await currentStorage.getTransactionsByDate(req.params.date);
      res.json(transactions2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions for date" });
    }
  });
  app2.get("/api/summaries/daily", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const limit = req.query.limit ? parseInt(req.query.limit) : void 0;
      const summaries = await currentStorage.getDailySummaries(limit);
      res.json(summaries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch daily summaries" });
    }
  });
  app2.get("/api/summaries/daily/:date", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const summary = await currentStorage.getDailySummary(req.params.date);
      if (!summary) {
        return res.status(404).json({ error: "Daily summary not found" });
      }
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch daily summary" });
    }
  });
  app2.get("/api/summaries/weekly", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const limit = req.query.limit ? parseInt(req.query.limit) : void 0;
      const summaries = await currentStorage.getWeeklySummaries(limit);
      res.json(summaries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch weekly summaries" });
    }
  });
  app2.get("/api/summaries/monthly", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const limit = req.query.limit ? parseInt(req.query.limit) : void 0;
      const summaries = await currentStorage.getMonthlySummaries(limit);
      res.json(summaries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch monthly summaries" });
    }
  });
  app2.delete("/api/data/clear", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const { period, date } = req.query;
      if (period === "day" && date) {
        await currentStorage.clearDataByDay(date);
        res.json({ message: `Cleared data for ${date}` });
      } else if (period === "week" && date) {
        await currentStorage.clearDataByWeek(date);
        res.json({ message: `Cleared weekly data starting ${date}` });
      } else if (period === "month" && date) {
        await currentStorage.clearDataByMonth(date);
        res.json({ message: `Cleared monthly data for ${date}` });
      } else {
        res.status(400).json({ error: "Invalid parameters. Required: period (day/week/month) and date" });
      }
    } catch (error) {
      console.error("Clear data error:", error);
      res.status(500).json({ error: "Failed to clear data" });
    }
  });
  app2.get("/api/download/daily/:date", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const summary = await currentStorage.getDailySummary(req.params.date);
      const transactions2 = await currentStorage.getTransactionsByDate(req.params.date);
      if (!summary) {
        return res.status(404).json({ error: "Daily summary not found" });
      }
      res.json({ summary, transactions: transactions2 });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch daily data" });
    }
  });
  app2.get("/api/download/weekly/:weekStart", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const summary = await currentStorage.getWeeklySummary(req.params.weekStart);
      if (!summary) {
        return res.status(404).json({ error: "Weekly summary not found" });
      }
      const transactions2 = await currentStorage.getTransactionsByDateRange(
        summary.weekStart,
        summary.weekEnd
      );
      res.json({ summary, transactions: transactions2 });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch weekly data" });
    }
  });
  app2.get("/api/download/monthly/:month", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const summary = await currentStorage.getMonthlySummary(req.params.month);
      if (!summary) {
        return res.status(404).json({ error: "Monthly summary not found" });
      }
      const startDate = `${req.params.month}-01`;
      const endDate = `${req.params.month}-31`;
      const transactions2 = await currentStorage.getTransactionsByDateRange(startDate, endDate);
      res.json({ summary, transactions: transactions2 });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch monthly data" });
    }
  });
  app2.get("/api/inventory/session/current", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const session = await currentStorage.getInventorySessionByDate(today);
      if (!session) {
        return res.status(404).json({ error: "No active session for today" });
      }
      res.json(session);
    } catch (error) {
      console.error("Get current session error:", error);
      res.status(500).json({ error: "Failed to fetch current session" });
    }
  });
  app2.get("/api/inventory/items/:sessionId", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const items = await currentStorage.getInventoryItemsWithMenu(req.params.sessionId);
      res.json(items);
    } catch (error) {
      console.error("Get inventory items error:", error);
      res.status(500).json({ error: "Failed to fetch inventory items" });
    }
  });
  app2.post("/api/inventory/start", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const { items } = req.body;
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const existingSession = await currentStorage.getInventorySessionByDate(today);
      if (existingSession) {
        return res.status(400).json({ error: "Inventory session already exists for today" });
      }
      const session = await currentStorage.createInventorySession({
        date: today,
        status: "billing",
        startTime: /* @__PURE__ */ new Date()
      });
      for (const item of items) {
        await currentStorage.createInventoryItem({
          sessionId: session.id,
          menuItemId: item.menuItemId,
          stockIn: item.stockIn,
          stockOut: 0,
          stockLeft: item.stockIn
        });
      }
      res.json({ session, message: "Inventory day started successfully" });
    } catch (error) {
      console.error("Start inventory error:", error);
      res.status(500).json({ error: "Failed to start inventory day" });
    }
  });
  app2.post("/api/inventory/end", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const { sessionId } = req.body;
      const session = await currentStorage.getInventorySessionByDate(
        (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
      );
      if (!session) {
        return res.status(404).json({ error: "No active session found" });
      }
      if (session.status === "ended") {
        return res.status(400).json({ error: "Session already ended" });
      }
      await currentStorage.calculateStockOutForSession(session.id, session.date);
      await currentStorage.updateInventorySession(session.id, {
        status: "ended",
        endTime: /* @__PURE__ */ new Date()
      });
      res.json({ message: "Inventory day ended successfully" });
    } catch (error) {
      console.error("End inventory error:", error);
      res.status(500).json({ error: "Failed to end inventory day" });
    }
  });
  app2.post("/api/inventory/session/update-time", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const { sessionId, startTime, endTime } = req.body;
      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
      }
      const updates = {};
      if (startTime) {
        updates.startTime = new Date(startTime);
      }
      if (endTime) {
        updates.endTime = new Date(endTime);
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No time updates provided" });
      }
      const updatedSession = await currentStorage.updateInventorySession(sessionId, updates);
      if (!updatedSession) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json({ session: updatedSession, message: "Session time updated successfully" });
    } catch (error) {
      console.error("Update session time error:", error);
      res.status(500).json({ error: "Failed to update session time" });
    }
  });
  app2.delete("/api/inventory/delete/:date", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const { date } = req.params;
      if (!date) {
        return res.status(400).json({ error: "Date is required" });
      }
      await currentStorage.clearInventoryByDate(date);
      res.json({ message: "Inventory data deleted successfully" });
    } catch (error) {
      console.error("Delete inventory error:", error);
      res.status(500).json({ error: "Failed to delete inventory data" });
    }
  });
  app2.patch("/api/inventory/item/:itemId", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const { itemId } = req.params;
      const { stockIn } = req.body;
      if (!itemId) {
        return res.status(400).json({ error: "Item ID is required" });
      }
      if (stockIn === void 0 || stockIn === null) {
        return res.status(400).json({ error: "Stock In value is required" });
      }
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const session = await currentStorage.getInventorySessionByDate(today);
      if (!session) {
        return res.status(404).json({ error: "No active session found" });
      }
      const currentItems = await currentStorage.getInventoryItemsBySession(session.id);
      const currentItem = currentItems.find((item) => item.id === itemId);
      if (!currentItem) {
        return res.status(404).json({ error: "Inventory item not found" });
      }
      const stockLeft = stockIn - currentItem.stockOut;
      const updatedItem = await currentStorage.updateInventoryItem(itemId, {
        stockIn,
        stockLeft
      });
      if (!updatedItem) {
        return res.status(404).json({ error: "Failed to update inventory item" });
      }
      res.json({ item: updatedItem, message: "Inventory item updated successfully" });
    } catch (error) {
      console.error("Update inventory item error:", error);
      res.status(500).json({ error: "Failed to update inventory item" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server2) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server: server2 },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
dotenv2.config();
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
var server;
(async () => {
  server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  if (!process.env.VERCEL) {
    const port = parseInt(process.env.PORT || "5000", 10);
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true
    }, () => {
      log(`serving on port ${port}`);
    });
  }
})();
var index_default = app;
export {
  index_default as default
};
