import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, waitForStorage } from "./storage";
import { insertTransactionSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Wait for storage to be initialized
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

  // Categories
  app.get("/api/categories", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const categories = await currentStorage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const { name, subCategories } = req.body;
      
      // Check if category already exists
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

  app.put("/api/categories/:id", async (req, res) => {
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

  app.delete("/api/categories/:id", async (req, res) => {
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

  // Menu Items
  app.get("/api/menu", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const items = await currentStorage.getMenuItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      res.status(500).json({ error: "Failed to fetch menu items" });
    }
  });

  // Menu item sales endpoint - MUST come before /api/menu/:id
  app.get("/api/menu/sales", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      let startDate: string, endDate: string;

      if (req.query.date) {
        // Daily sales
        startDate = req.query.date as string;
        endDate = startDate;
      } else {
        // Monthly sales (default)
        const month = req.query.month as string || new Date().toISOString().slice(0,7);
        const year = parseInt(month.split('-')[0]);
        const monthNum = parseInt(month.split('-')[1]) - 1; // 0-based
        startDate = new Date(year, monthNum, 1).toISOString().split('T')[0];
        endDate = new Date(year, monthNum + 1, 0).toISOString().split('T')[0]; // last day of month
      }

      const transactions = await currentStorage.getTransactionsByDateRange(startDate, endDate);
      const menuItems = await currentStorage.getMenuItems();

      const salesData = menuItems.map(item => {
        const totalSold = transactions.reduce((count, transaction) => {
          const items = transaction.items as any[];
          const itemSold = items.find(i => i.id === item.id);
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

  app.get("/api/menu/:id", async (req, res) => {
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

  app.post("/api/menu", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const { name, description, price, category, subCategory, image, available } = req.body;
      
      // Only validate that name is provided
      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Menu item name is required" });
      }
      
      const newItem = await currentStorage.createMenuItem({
        name: name?.trim() || "",
        description: description?.trim() || "",
        price: price?.trim() || "",
        category: category?.trim() || "",
        subCategory: subCategory?.trim() || undefined,
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

  app.put("/api/menu/:id", async (req, res) => {
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

  app.delete("/api/menu/:id", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const item = await currentStorage.getMenuItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      
      // Permanently delete the menu item from database
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

  // Bulk delete menu items
  app.post("/api/menu/bulk-delete", async (req, res) => {
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

  // Delete all menu items
  app.delete("/api/menu", async (req, res) => {
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

  // Transactions
  app.post("/api/transactions", async (req, res) => {
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
  

  app.get("/api/transactions", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const transactions = await currentStorage.getTransactions(limit);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.get("/api/transactions/date/:date", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const transactions = await currentStorage.getTransactionsByDate(req.params.date);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions for date" });
    }
  });

  // Daily Summaries
  app.get("/api/summaries/daily", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const summaries = await currentStorage.getDailySummaries(limit);
      res.json(summaries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch daily summaries" });
    }
  });

  app.get("/api/summaries/daily/:date", async (req, res) => {
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

  // Weekly Summaries
  app.get("/api/summaries/weekly", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const summaries = await currentStorage.getWeeklySummaries(limit);
      res.json(summaries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch weekly summaries" });
    }
  });

  // Monthly Summaries
  app.get("/api/summaries/monthly", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const summaries = await currentStorage.getMonthlySummaries(limit);
      res.json(summaries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch monthly summaries" });
    }
  });





  // Clear data endpoint
  app.delete("/api/data/clear", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const { period, date } = req.query;
      
      if (period === 'day' && date) {
        await currentStorage.clearDataByDay(date as string);
        res.json({ message: `Cleared data for ${date}` });
      } else if (period === 'week' && date) {
        await currentStorage.clearDataByWeek(date as string);
        res.json({ message: `Cleared weekly data starting ${date}` });
      } else if (period === 'month' && date) {
        await currentStorage.clearDataByMonth(date as string);
        res.json({ message: `Cleared monthly data for ${date}` });
      } else {
        res.status(400).json({ error: "Invalid parameters. Required: period (day/week/month) and date" });
      }
    } catch (error) {
      console.error("Clear data error:", error);
      res.status(500).json({ error: "Failed to clear data" });
    }
  });

  // PDF Download endpoints
  app.get("/api/download/daily/:date", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const summary = await currentStorage.getDailySummary(req.params.date);
      const transactions = await currentStorage.getTransactionsByDate(req.params.date);
      
      if (!summary) {
        return res.status(404).json({ error: "Daily summary not found" });
      }

      res.json({ summary, transactions });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch daily data" });
    }
  });

  app.get("/api/download/weekly/:weekStart", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const summary = await currentStorage.getWeeklySummary(req.params.weekStart);
      
      if (!summary) {
        return res.status(404).json({ error: "Weekly summary not found" });
      }

      const transactions = await currentStorage.getTransactionsByDateRange(
        summary.weekStart,
        summary.weekEnd
      );

      res.json({ summary, transactions });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch weekly data" });
    }
  });

  app.get("/api/download/monthly/:month", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const summary = await currentStorage.getMonthlySummary(req.params.month);
      
      if (!summary) {
        return res.status(404).json({ error: "Monthly summary not found" });
      }

      const startDate = `${req.params.month}-01`;
      const endDate = `${req.params.month}-31`;
      const transactions = await currentStorage.getTransactionsByDateRange(startDate, endDate);

      res.json({ summary, transactions });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch monthly data" });
    }
  });

  // Inventory routes
  // Get current inventory session
  app.get("/api/inventory/session/current", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const today = new Date().toISOString().split('T')[0];
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

  // Get inventory items for a session
  app.get("/api/inventory/items/:sessionId", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const items = await currentStorage.getInventoryItemsWithMenu(req.params.sessionId);
      res.json(items);
    } catch (error) {
      console.error("Get inventory items error:", error);
      res.status(500).json({ error: "Failed to fetch inventory items" });
    }
  });

  // Start inventory day
  app.post("/api/inventory/start", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const { items } = req.body;
      const today = new Date().toISOString().split('T')[0];
      
      // Check if session already exists for today
      const existingSession = await currentStorage.getInventorySessionByDate(today);
      if (existingSession) {
        return res.status(400).json({ error: "Inventory session already exists for today" });
      }
      
      // Create new session
      const session = await currentStorage.createInventorySession({
        date: today,
        status: 'billing',
        startTime: new Date(),
      });
      
      // Create inventory items
      for (const item of items) {
        await currentStorage.createInventoryItem({
          sessionId: session.id,
          menuItemId: item.menuItemId,
          stockIn: item.stockIn,
          stockOut: 0,
          stockLeft: item.stockIn,
        });
      }
      
      res.json({ session, message: "Inventory day started successfully" });
    } catch (error) {
      console.error("Start inventory error:", error);
      res.status(500).json({ error: "Failed to start inventory day" });
    }
  });

  // End inventory day
  app.post("/api/inventory/end", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const { sessionId } = req.body;
      
      const session = await currentStorage.getInventorySessionByDate(
        new Date().toISOString().split('T')[0]
      );
      
      if (!session) {
        return res.status(404).json({ error: "No active session found" });
      }
      
      if (session.status === 'ended') {
        return res.status(400).json({ error: "Session already ended" });
      }
      
      // Calculate stock out for all items
      await currentStorage.calculateStockOutForSession(session.id, session.date);
      
      // Update session status
      await currentStorage.updateInventorySession(session.id, {
        status: 'ended',
        endTime: new Date(),
      });
      
      res.json({ message: "Inventory day ended successfully" });
    } catch (error) {
      console.error("End inventory error:", error);
      res.status(500).json({ error: "Failed to end inventory day" });
    }
  });

  // Update inventory session time
  app.post("/api/inventory/session/update-time", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const { sessionId, startTime, endTime } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
      }
      
      const updates: Partial<InventorySession> = {};
      
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

  // Delete inventory data for a specific date
  app.delete("/api/inventory/delete/:date", async (req, res) => {
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

  // Update inventory item stock
  app.patch("/api/inventory/item/:itemId", async (req, res) => {
    try {
      const currentStorage = await waitForStorage();
      const { itemId } = req.params;
      const { stockIn } = req.body;
      
      if (!itemId) {
        return res.status(400).json({ error: "Item ID is required" });
      }
      
      if (stockIn === undefined || stockIn === null) {
        return res.status(400).json({ error: "Stock In value is required" });
      }
      
      // Get current session to find the item
      const today = new Date().toISOString().split('T')[0];
      const session = await currentStorage.getInventorySessionByDate(today);
      
      if (!session) {
        return res.status(404).json({ error: "No active session found" });
      }
      
      // Get the current item to calculate new stockLeft
      const currentItems = await currentStorage.getInventoryItemsBySession(session.id);
      const currentItem = currentItems.find(item => item.id === itemId);
      
      if (!currentItem) {
        return res.status(404).json({ error: "Inventory item not found" });
      }
      
      // Calculate new stockLeft based on new stockIn and existing stockOut
      const stockLeft = stockIn - currentItem.stockOut;
      
      const updatedItem = await currentStorage.updateInventoryItem(itemId, {
        stockIn,
        stockLeft,
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

  const httpServer = createServer(app);
  return httpServer;
}
