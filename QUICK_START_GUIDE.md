# Quick Start Guide - Category & Menu Management

## 🚀 Getting Started

### Prerequisites
- Node.js v20+ installed
- MongoDB Atlas account (for production) or use in-memory storage (development)

### Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   - File: `.env`
   - Already configured with MongoDB Atlas connection
   - No changes needed for testing

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:5000 (or auto-assigned port)
   - Backend: Same port (integrated)

---

## 📋 How to Use Category Management

### Access Category Manager

1. Navigate to Admin page: `/admin`
2. Click **"Categories"** button in the header
3. Category Manager panel will appear

### Add New Category

1. Click **"Add Category"** button
2. Enter category name (e.g., "Desserts")
3. **Add Subcategories (Optional):**
   - Type subcategory name (e.g., "Ice Cream")
   - Click **+** button or press **Enter**
   - Repeat for more subcategories
   - Remove by clicking **X** on tag
4. Click **"Save Category"**
5. Success toast will appear
6. Category appears in list immediately

### Edit Category

1. Find category in list
2. Click **Edit** button (pencil icon)
3. Modify name or subcategories
4. Click **"Save"**
5. Changes appear immediately

### Delete Category

1. Find category in list
2. Click **Delete** button (trash icon)
3. Confirm deletion
4. Category removed immediately

---

## 🍽️ How to Add Menu Items with Categories

### Add New Menu Item

1. In Admin page, click **"Add New Item"**
2. Fill in the form:
   - **Name:** Item name (required)
   - **Description:** Brief description (required)
   - **Price:** Price in rupees (required)
   - **Category:** Select from dropdown (required)
   - **Subcategory:** Select if available (optional)
   - **Image URL:** Full image URL (required)
3. Click **"Save Item"**
4. Item appears in table immediately

### Category & Subcategory Selection

- **Category Dropdown:**
  - Shows all categories from database
  - Dynamically updated when categories added/edited
  - Required field

- **Subcategory Dropdown:**
  - Appears below category dropdown
  - Labeled "Subcategory (Optional)"
  - Automatically populated based on selected category
  - Disabled if category has no subcategories
  - Shows "None" option to clear selection

### Edit Menu Item

1. Find item in table
2. Click **Edit** button
3. Modify any field including category/subcategory
4. Click **Save** (green checkmark)
5. Changes appear immediately

---

## 🔍 Verify Integration

### Check Menu Page

1. Navigate to `/menu`
2. Verify new items appear in grid
3. Check category filter includes new categories
4. Search for items by name
5. Click **Refresh** button to manually refetch

### Check Inventory Page

1. Navigate to `/inventory`
2. Verify new items appear in stock list
3. Items available for inventory tracking

### Check Database Persistence

1. Add a menu item and category
2. Stop server: `Ctrl+C`
3. Restart: `npm run dev`
4. Navigate to Admin page
5. Verify data still exists (MongoDB only)

---

## 🎨 UI Features

### Category Manager
- **Toggle:** Click "Categories" button to show/hide
- **Add Form:** Collapsible form for new categories
- **Category Cards:** Visual cards with edit/delete buttons
- **Subcategory Tags:** Colored tags with remove buttons
- **Inline Editing:** Edit directly in the list

### Menu Item Form
- **Dynamic Dropdowns:** Categories and subcategories from database
- **Validation:** Required fields highlighted
- **Auto-save:** Changes saved immediately
- **Toast Notifications:** Success/error messages

### Table View
- **Sortable:** Click headers to sort (if implemented)
- **Editable:** Inline editing for quick updates
- **Responsive:** Adapts to screen size
- **Actions:** Edit and delete buttons per row

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Error: EADDRINUSE: address already in use
# Solution: Kill the process using the port
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Categories Not Loading
1. Check browser console for errors
2. Verify API endpoint: `GET /api/categories`
3. Check network tab in DevTools
4. Restart server if needed

### Menu Items Not Appearing
1. Check if item has all required fields
2. Verify `available` is set to `true`
3. Check category exists
4. Refresh page or click refresh button

### Subcategories Not Showing
1. Verify category has subcategories defined
2. Check category is selected first
3. Verify subcategories array is not empty
4. Check browser console for errors

### Database Connection Issues
```bash
# Check MongoDB connection
# Look for: "MongoDB Atlas connected successfully"
# If fails: "Falling back to in-memory storage..."

# In-memory storage is fine for testing
# Data will be lost on server restart
```

---

## 📊 API Endpoints Reference

### Categories

```bash
# Get all categories
GET /api/categories

# Create category
POST /api/categories
Body: { "name": "Desserts", "subCategories": ["Ice Cream"] }

# Update category
PUT /api/categories/:id
Body: { "name": "Updated", "subCategories": ["Sub1"] }

# Delete category
DELETE /api/categories/:id
```

### Menu Items

```bash
# Get all menu items
GET /api/menu

# Create menu item
POST /api/menu
Body: {
  "name": "Item",
  "description": "Desc",
  "price": "50.00",
  "category": "Tea",
  "subCategory": "Green Tea",
  "image": "https://...",
  "available": true
}

# Update menu item
PUT /api/menu/:id
Body: { ...same as POST }

# Delete menu item (marks as unavailable)
DELETE /api/menu/:id
```

---

## 🧪 Testing Checklist

### Basic Functionality
- [ ] Server starts without errors
- [ ] Admin page loads
- [ ] Category manager opens
- [ ] Can add category
- [ ] Can edit category
- [ ] Can delete category
- [ ] Can add menu item
- [ ] Can edit menu item
- [ ] Can delete menu item

### Category Features
- [ ] Subcategories can be added
- [ ] Subcategories can be removed
- [ ] Duplicate category names prevented
- [ ] Categories appear in dropdown
- [ ] Subcategories populate based on category

### Integration
- [ ] Menu page shows new items
- [ ] Inventory page shows new items
- [ ] Category filter works on menu page
- [ ] Search finds new items
- [ ] Refresh button works

### Data Persistence (MongoDB)
- [ ] Data survives server restart
- [ ] Categories persist
- [ ] Menu items persist
- [ ] Subcategories persist

---

## 💡 Tips & Best Practices

### Category Management
- **Naming:** Use clear, descriptive names
- **Subcategories:** Keep them relevant and specific
- **Organization:** Group similar items together
- **Cleanup:** Delete unused categories regularly

### Menu Items
- **Images:** Use high-quality, consistent images
- **Descriptions:** Keep them concise but informative
- **Pricing:** Use consistent decimal format (e.g., "50.00")
- **Categories:** Assign appropriate categories
- **Availability:** Mark items unavailable instead of deleting

### Performance
- **Cache:** Let React Query handle caching
- **Refresh:** Use refresh button sparingly
- **Images:** Use optimized image URLs
- **Validation:** Fill all required fields before saving

---

## 🔧 Common Tasks

### Add a New Category with Subcategories
```
1. Admin → Categories → Add Category
2. Name: "Beverages"
3. Add subcategories:
   - "Hot Drinks"
   - "Cold Drinks"
   - "Smoothies"
4. Save
```

### Add Menu Item with Subcategory
```
1. Admin → Add New Item
2. Fill form:
   - Name: "Mango Smoothie"
   - Description: "Fresh mango smoothie"
   - Price: "120.00"
   - Category: "Beverages"
   - Subcategory: "Smoothies"
   - Image: [URL]
3. Save
```

### Update Category and Its Items
```
1. Edit category name or subcategories
2. Save category
3. Edit menu items if needed to match new subcategories
4. Save items
```

### Bulk Category Setup
```
1. Add all categories first
2. Add subcategories to each
3. Then add menu items
4. Assign categories and subcategories
```

---

## 📞 Support & Resources

### Documentation
- `MENU_INTEGRATION_VERIFICATION.md` - Complete integration details
- `IMPLEMENTATION_SUMMARY.md` - Implementation overview
- `ARCHITECTURE_DIAGRAM.md` - System architecture

### Code Locations
- **Frontend:** `client/src/pages/admin.tsx`
- **Backend Routes:** `server/routes.ts`
- **Storage:** `server/storage.ts`, `server/db/mongodb.ts`
- **Schema:** `shared/schema.ts`

### Debugging
- **Browser Console:** Check for JavaScript errors
- **Network Tab:** Inspect API requests/responses
- **Server Logs:** Check terminal for backend errors
- **React Query DevTools:** Install for cache inspection

---

## ✅ Success Indicators

You'll know everything is working when:

1. ✅ Categories button appears in admin header
2. ✅ Category manager opens/closes smoothly
3. ✅ Can add categories with subcategories
4. ✅ Categories appear in menu item dropdown
5. ✅ Subcategories populate based on category
6. ✅ Menu items save with category and subcategory
7. ✅ Items appear on menu page immediately
8. ✅ Items appear on inventory page
9. ✅ Toast notifications show success messages
10. ✅ Data persists after server restart (MongoDB)

---

## 🎉 You're Ready!

The system is fully functional and ready to use. Start by:

1. Adding a few categories with subcategories
2. Adding menu items with those categories
3. Checking the menu page to see them appear
4. Testing the inventory page
5. Experimenting with editing and deleting

**Happy managing! 🚀**

---

**Last Updated:** January 2025
**Version:** 2.0
**Status:** Production Ready ✅