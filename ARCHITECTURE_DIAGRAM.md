# System Architecture - Menu & Category Management

## 🏗️ Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND LAYER                                 │
│                         (React + TypeScript)                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP/REST
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│  Admin Page   │         │   Menu Page   │         │ Inventory Page│
│               │         │               │         │               │
│ • Add Items   │         │ • View Items  │         │ • Stock Mgmt  │
│ • Edit Items  │         │ • Search      │         │ • Track Sales │
│ • Categories  │         │ • Filter      │         │ • Reports     │
│ • Subcats     │         │ • Cart        │         │               │
└───────┬───────┘         └───────┬───────┘         └───────┬───────┘
        │                         │                         │
        │                         │                         │
        └─────────────────────────┼─────────────────────────┘
                                  │
                                  │ React Query
                                  │ (Cache Management)
                                  │
┌─────────────────────────────────────────────────────────────────────────┐
│                         REACT QUERY CACHE                                │
│                                                                          │
│  Query Keys:                                                             │
│  • ["/api/menu"]        → Menu Items (with auto-invalidation)           │
│  • ["/api/categories"]  → Categories (with auto-invalidation)           │
│                                                                          │
│  Features:                                                               │
│  • Automatic refetch on mount                                            │
│  • Cache invalidation on mutations                                       │
│  • Stale time: 5 minutes                                                 │
│  • Refetch on window focus                                               │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ HTTP Requests
                                  │
┌─────────────────────────────────────────────────────────────────────────┐
│                           API LAYER                                      │
│                      (Express.js Routes)                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│ Menu Routes   │       │Category Routes│       │ Other Routes  │
│               │       │               │       │               │
│ GET    /menu  │       │ GET    /cat   │       │ • Transactions│
│ POST   /menu  │       │ POST   /cat   │       │ • Inventory   │
│ PUT    /menu  │       │ PUT    /cat   │       │ • Dashboard   │
│ DELETE /menu  │       │ DELETE /cat   │       │ • Auth        │
└───────┬───────┘       └───────┬───────┘       └───────┬───────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                                │ Storage Interface
                                │
┌─────────────────────────────────────────────────────────────────────────┐
│                         STORAGE INTERFACE                                │
│                          (IStorage)                                      │
│                                                                          │
│  Methods:                                                                │
│  • getMenuItems()      • getCategories()                                 │
│  • createMenuItem()    • createCategory()                                │
│  • updateMenuItem()    • updateCategory()                                │
│  • deleteMenuItem()    • deleteCategory()                                │
│  • getTransactions()   • createTransaction()                             │
│  • getInventory()      • updateInventory()                               │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
                ▼                               ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│     MemStorage            │   │     MongoStorage          │
│   (Development)           │   │    (Production)           │
│                           │   │                           │
│ • In-Memory Maps          │   │ • MongoDB Collections     │
│ • Fast for testing        │   │ • Persistent storage      │
│ • No persistence          │   │ • Scalable                │
│ • Auto-seeded data        │   │ • Cloud-based             │
└───────────┬───────────────┘   └───────────┬───────────────┘
            │                               │
            ▼                               ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│   JavaScript Maps         │   │   MongoDB Atlas           │
│                           │   │                           │
│ • users: Map              │   │ • users collection        │
│ • categories: Map         │   │ • categories collection   │
│ • menuItems: Map          │   │ • menuItems collection    │
│ • transactions: Map       │   │ • transactions collection │
│ • inventorySessions: Map  │   │ • inventorySessions coll  │
│ • inventoryItems: Map     │   │ • inventoryItems coll     │
└───────────────────────────┘   └───────────────────────────┘
```

---

## 📊 Data Flow Diagrams

### 1. Add Menu Item Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ STEP 1: User Action                                              │
│ Admin fills form and clicks "Save Item"                          │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 2: Frontend Validation                                      │
│ • Check required fields (name, price, category)                  │
│ • Validate data types                                            │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 3: API Request                                              │
│ POST /api/menu                                                   │
│ Body: {                                                          │
│   name: "Vanilla Ice Cream",                                     │
│   description: "Creamy vanilla",                                 │
│   price: "80.00",                                                │
│   category: "Desserts",                                          │
│   subCategory: "Ice Cream",                                      │
│   image: "https://...",                                          │
│   available: true                                                │
│ }                                                                │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 4: Backend Route Handler                                    │
│ • Extract request body                                           │
│ • Wait for storage initialization                                │
│ • Call storage.createMenuItem()                                  │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 5: Storage Layer                                            │
│ MemStorage:                    MongoStorage:                     │
│ • Generate UUID                • Generate timestamp ID           │
│ • Create MenuItem object       • Create MenuItem object          │
│ • Store in Map                 • Insert into MongoDB             │
│ • Return item                  • Return item                     │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 6: Database Persistence                                     │
│ MemStorage: Map.set(id, item)                                    │
│ MongoStorage: collection.insertOne(item)                         │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 7: Response to Frontend                                     │
│ Status: 200 OK                                                   │
│ Body: { id, name, description, ... }                             │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 8: Cache Invalidation                                       │
│ queryClient.invalidateQueries({ queryKey: ["/api/menu"] })       │
│ • Marks cache as stale                                           │
│ • Triggers refetch on all components using this query            │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 9: UI Updates                                               │
│ • Admin page: Table updates with new item                        │
│ • Menu page: Grid updates (if mounted)                           │
│ • Inventory page: Stock list updates (if mounted)                │
│ • Toast notification: "Menu item created successfully"           │
└──────────────────────────────────────────────────────────────────┘
```

---

### 2. Category Management Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ USER CREATES CATEGORY                                            │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ Admin clicks "Add Category"                                      │
│ • Enters name: "Desserts"                                        │
│ • Adds subcategories: ["Ice Cream", "Cake", "Pastry"]           │
│ • Clicks "Save Category"                                         │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ POST /api/categories                                             │
│ Body: {                                                          │
│   name: "Desserts",                                              │
│   subCategories: ["Ice Cream", "Cake", "Pastry"]                │
│ }                                                                │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ Backend Validation                                               │
│ • Check if category name already exists                          │
│ • If exists: Return 400 error                                    │
│ • If not: Proceed to create                                      │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ Storage Layer                                                    │
│ • Generate ID                                                    │
│ • Create Category object                                         │
│ • Save to database                                               │
│ • Return category                                                │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ Cache Invalidation                                               │
│ queryClient.invalidateQueries({ queryKey: ["/api/categories"] }) │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ UI Updates                                                       │
│ • Category appears in category list                              │
│ • Category appears in menu item dropdown                         │
│ • Subcategories available when category selected                │
└──────────────────────────────────────────────────────────────────┘
```

---

### 3. Page Navigation & Data Refresh

```
┌──────────────────────────────────────────────────────────────────┐
│ USER NAVIGATES BETWEEN PAGES                                     │
└────────────────────────────┬─────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Admin Page   │    │   Menu Page   │    │ Inventory Page│
└───────┬───────┘    └───────┬───────┘    └───────┬───────┘
        │                    │                    │
        │ useQuery           │ useQuery           │ useQuery
        │ ["/api/menu"]      │ ["/api/menu"]      │ ["/api/menu"]
        │                    │ refetchOnMount     │ refetchOnMount
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ React Query Cache Check                                          │
│                                                                  │
│ IF cache is fresh (< 5 min):                                    │
│   → Return cached data                                           │
│   → No API call                                                  │
│                                                                  │
│ IF cache is stale OR refetchOnMount:                            │
│   → Make API call                                                │
│   → Update cache                                                 │
│   → Return fresh data                                            │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ Component Renders with Data                                      │
│ • Admin: Shows table with all items                              │
│ • Menu: Shows grid with filtered items                           │
│ • Inventory: Shows stock management table                        │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### Categories Table
```typescript
{
  id: string (PK),
  name: string (UNIQUE, NOT NULL),
  subCategories: string[] (JSONB, optional),
  createdAt: Date
}
```

**Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Desserts",
  "subCategories": ["Ice Cream", "Cake", "Pastry"],
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```

### Menu Items Table
```typescript
{
  id: string (PK),
  name: string (NOT NULL),
  description: string (NOT NULL),
  price: string (NOT NULL),
  category: string (NOT NULL),
  subCategory: string (optional),
  image: string (NOT NULL),
  available: boolean (default: true)
}
```

**Example:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "name": "Vanilla Ice Cream",
  "description": "Creamy vanilla ice cream",
  "price": "80.00",
  "category": "Desserts",
  "subCategory": "Ice Cream",
  "image": "https://example.com/vanilla.jpg",
  "available": true
}
```

---

## 🔄 State Management

### React Query Cache Structure

```
queryClient
  └── queries
      ├── ["/api/menu"]
      │   ├── data: MenuItem[]
      │   ├── status: "success" | "loading" | "error"
      │   ├── dataUpdatedAt: timestamp
      │   ├── staleTime: 300000 (5 min)
      │   └── refetchOnMount: true (Menu & Inventory)
      │
      └── ["/api/categories"]
          ├── data: Category[]
          ├── status: "success" | "loading" | "error"
          ├── dataUpdatedAt: timestamp
          └── staleTime: 300000 (5 min)
```

### Cache Invalidation Triggers

```
Admin Actions → Cache Invalidation → Auto Refetch
    │
    ├── Create Menu Item → invalidate ["/api/menu"]
    ├── Update Menu Item → invalidate ["/api/menu"]
    ├── Delete Menu Item → invalidate ["/api/menu"]
    │
    ├── Create Category → invalidate ["/api/categories"]
    ├── Update Category → invalidate ["/api/categories"]
    └── Delete Category → invalidate ["/api/categories"]
```

---

## 🔐 Security & Validation

### Backend Validation
```
Request → Route Handler → Validation → Storage → Database
                              │
                              ├── Check required fields
                              ├── Validate data types
                              ├── Check duplicates
                              ├── Sanitize input
                              └── Return errors if invalid
```

### Frontend Validation
```
User Input → Form Validation → API Request
                 │
                 ├── Required fields check
                 ├── Format validation
                 ├── Disable submit if invalid
                 └── Show error messages
```

---

## 📈 Performance Optimization

### Caching Strategy
```
First Load:
  User → API Request → Database → Response → Cache → UI
  Time: ~200-500ms

Subsequent Loads (within 5 min):
  User → Cache → UI
  Time: ~10-50ms (instant)

After Mutation:
  User → Mutation → Invalidate → Refetch → Cache → UI
  Time: ~200-500ms (one-time)
```

### Database Indexes
```
MongoDB Collections:
  ├── categories
  │   └── Index: { name: 1 } (unique)
  │
  ├── menuItems
  │   └── Index: { id: 1 } (primary)
  │
  └── transactions
      ├── Index: { date: 1 }
      └── Index: { createdAt: -1 }
```

---

## 🎯 Key Design Decisions

### 1. **Dual Storage System**
- **Why:** Support both development (fast) and production (persistent)
- **How:** Interface-based design with two implementations
- **Benefit:** Easy testing, seamless deployment

### 2. **React Query for State**
- **Why:** Automatic caching, refetching, and synchronization
- **How:** Query keys for each endpoint, invalidation on mutations
- **Benefit:** Less boilerplate, better UX, automatic updates

### 3. **Optional Subcategories**
- **Why:** Flexibility for different business needs
- **How:** JSONB array in database, optional field in schema
- **Benefit:** Can be used or ignored, no breaking changes

### 4. **Cache Invalidation Strategy**
- **Why:** Ensure data consistency across pages
- **How:** Manual invalidation after mutations, auto-refetch on mount
- **Benefit:** Always fresh data, minimal API calls

### 5. **TypeScript Throughout**
- **Why:** Type safety, better DX, fewer bugs
- **How:** Shared schema types, strict typing
- **Benefit:** Catch errors at compile time, better IDE support

---

## 📱 Responsive Design

```
Desktop (>1024px):
  ├── Admin: Full table with all columns
  ├── Menu: 4-column grid
  └── Inventory: Full-width table

Tablet (768-1024px):
  ├── Admin: Scrollable table
  ├── Menu: 3-column grid
  └── Inventory: Scrollable table

Mobile (<768px):
  ├── Admin: Stacked cards or horizontal scroll
  ├── Menu: 2-column grid + bottom cart bar
  └── Inventory: Stacked cards
```

---

## 🚀 Deployment Architecture

```
Production Environment:
  ├── Frontend: Vite build → Static hosting
  ├── Backend: Node.js → Cloud server
  └── Database: MongoDB Atlas → Cloud

Development Environment:
  ├── Frontend: Vite dev server
  ├── Backend: tsx watch mode
  └── Database: MemStorage (in-memory)

Environment Variables:
  ├── MONGODB_URI: MongoDB connection string
  ├── SESSION_SECRET: Session encryption key
  └── NODE_ENV: development | production
```

---

**Document Created:** January 2025
**Architecture Version:** 2.0
**Status:** Production Ready ✅