import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Save, X, BarChart3, FolderTree, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { MenuItem, InsertMenuItem, Category, InsertCategory } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

interface EditingMenuItem extends Partial<MenuItem> {
  isEditing?: boolean;
}

interface EditingCategory extends Partial<Category> {
  isEditing?: boolean;
}

export default function AdminPage() {
  const [editingItem, setEditingItem] = useState<EditingMenuItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EditingCategory | null>(null);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [newCategory, setNewCategory] = useState<InsertCategory>({
    name: "",
    subCategories: [],
  });
  const [subCategoryInput, setSubCategoryInput] = useState("");
  const [newItem, setNewItem] = useState<InsertMenuItem>({
    name: "",
    description: "",
    price: "",
    category: "",
    subCategory: "",
    image: "",
    available: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { data: menuItems = [], isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu"],
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Get subcategories for selected category
  const getSubCategories = (categoryName: string) => {
    const category = categories.find(cat => cat.name === categoryName);
    return category?.subCategories || [];
  };

  // Initialize default category when categories are loaded
  useEffect(() => {
    if (categories.length > 0 && !newItem.category) {
      setNewItem(prev => ({ ...prev, category: categories[0].name }));
    }
  }, [categories]);

  const handleCreateItem = async () => {
    // Only validate that at least name is provided
    if (!newItem.name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Item name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest("POST", "/api/menu", newItem);
      if (response.ok) {
        const createdItem = await response.json();
        console.log("Menu item created successfully:", createdItem);
        
        toast({
          title: "Success",
          description: "Menu item created successfully",
        });
        setNewItem({
          name: "",
          description: "",
          price: "",
          category: categories[0]?.name || "",
          subCategory: "",
          image: "",
          available: true,
        });
        setIsAddingNew(false);
        
        // Invalidate and refetch menu items
        await queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
        await queryClient.refetchQueries({ queryKey: ["/api/menu"] });
      } else {
        const errorData = await response.json();
        console.error("Failed to create menu item:", errorData);
        toast({
          title: "Error",
          description: errorData.error || "Failed to create menu item",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating menu item:", error);
      toast({
        title: "Error",
        description: "Failed to create menu item. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateItem = async (id: string) => {
    if (!editingItem) return;

    try {
      const response = await apiRequest("PUT", `/api/menu/${id}`, editingItem);
      if (response.ok) {
        toast({
          title: "Success",
          description: "Menu item updated successfully",
        });
        setEditingItem(null);
        queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update menu item",
        variant: "destructive",
      });
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm("Are you sure you want to permanently delete this item? This action cannot be undone.")) {
      try {
        const response = await apiRequest("DELETE", `/api/menu/${id}`);
        if (response.ok) {
          toast({
            title: "Success",
            description: "Menu item deleted successfully",
          });
          // Remove from selected items if it was selected
          setSelectedItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
          });
          queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete menu item",
          variant: "destructive",
        });
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: "No items selected",
        description: "Please select items to delete",
        variant: "destructive",
      });
      return;
    }

    if (confirm(`Are you sure you want to permanently delete ${selectedItems.size} item(s)? This action cannot be undone.`)) {
      try {
        const response = await apiRequest("POST", "/api/menu/bulk-delete", {
          ids: Array.from(selectedItems)
        });
        if (response.ok) {
          const data = await response.json();
          toast({
            title: "Success",
            description: data.message || "Items deleted successfully",
          });
          setSelectedItems(new Set());
          queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete selected items",
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteAll = async () => {
    if (confirm("⚠️ WARNING: Are you sure you want to delete ALL menu items? This will permanently delete all items from the database and cannot be undone!")) {
      try {
        const response = await apiRequest("DELETE", "/api/menu");
        if (response.ok) {
          const data = await response.json();
          toast({
            title: "Success",
            description: data.message || "All menu items deleted successfully",
          });
          setSelectedItems(new Set());
          queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete all menu items",
          variant: "destructive",
        });
      }
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === menuItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(menuItems.map(item => item.id)));
    }
  };

  const startEditing = (item: MenuItem) => {
    setEditingItem({ ...item, isEditing: true });
  };

  const cancelEditing = () => {
    setEditingItem(null);
  };

  // Category Management Functions
  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest("POST", "/api/categories", newCategory);
      if (response.ok) {
        toast({
          title: "Success",
          description: "Category created successfully",
        });
        setNewCategory({ name: "", subCategories: [] });
        setSubCategoryInput("");
        setIsAddingNewCategory(false);
        queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      });
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editingCategory) return;

    try {
      const response = await apiRequest("PUT", `/api/categories/${id}`, {
        name: editingCategory.name,
        subCategories: editingCategory.subCategories,
      });
      if (response.ok) {
        toast({
          title: "Success",
          description: "Category updated successfully",
        });
        setEditingCategory(null);
        queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm("Are you sure you want to delete this category?")) {
      try {
        const response = await apiRequest("DELETE", `/api/categories/${id}`);
        if (response.ok) {
          toast({
            title: "Success",
            description: "Category deleted successfully",
          });
          queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete category",
          variant: "destructive",
        });
      }
    }
  };

  const addSubCategoryToNew = () => {
    if (subCategoryInput.trim()) {
      setNewCategory({
        ...newCategory,
        subCategories: [...(newCategory.subCategories || []), subCategoryInput.trim()],
      });
      setSubCategoryInput("");
    }
  };

  const removeSubCategoryFromNew = (index: number) => {
    setNewCategory({
      ...newCategory,
      subCategories: newCategory.subCategories?.filter((_, i) => i !== index) || [],
    });
  };

  const addSubCategoryToEditing = (subCat: string) => {
    if (editingCategory && subCat.trim()) {
      setEditingCategory({
        ...editingCategory,
        subCategories: [...(editingCategory.subCategories || []), subCat.trim()],
      });
    }
  };

  const removeSubCategoryFromEditing = (index: number) => {
    if (editingCategory) {
      setEditingCategory({
        ...editingCategory,
        subCategories: editingCategory.subCategories?.filter((_, i) => i !== index) || [],
      });
    }
  };

  if (isLoading || categoriesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-secondary">Admin Panel</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage menu items and operations</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Button
              onClick={() => navigate("/dashboard")}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 px-4 py-2"
            >
              <BarChart3 size={18} />
              Dashboard
            </Button>
            <Button
              onClick={() => setShowCategoryManager(!showCategoryManager)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 px-4 py-2"
            >
              <FolderTree size={18} />
              Categories
            </Button>
            <Button
              onClick={() => setIsAddingNew(true)}
              size="sm"
              className="bg-primary text-primary-foreground px-4 py-2"
              disabled={isAddingNew}
            >
              <Plus className="mr-2" size={18} />
              Add New Item
            </Button>
          </div>
        </div>

        {/* Category Manager */}
        {showCategoryManager && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg sm:text-xl">Category Management</CardTitle>
                <Button
                  onClick={() => setIsAddingNewCategory(true)}
                  size="sm"
                  disabled={isAddingNewCategory}
                >
                  <Plus className="mr-2" size={16} />
                  Add Category
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Add New Category Form */}
              {isAddingNewCategory && (
                <div className="mb-6 p-4 border border-border rounded-lg bg-muted/50">
                  <h3 className="font-semibold mb-4">New Category</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-category-name">Category Name</Label>
                      <Input
                        id="new-category-name"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                        placeholder="Enter category name"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Subcategories (Optional)</Label>
                      <div className="flex gap-2">
                        <Input
                          value={subCategoryInput}
                          onChange={(e) => setSubCategoryInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addSubCategoryToNew()}
                          placeholder="Enter subcategory name"
                          className="h-11"
                        />
                        <Button onClick={addSubCategoryToNew} size="sm" type="button">
                          <Plus size={16} />
                        </Button>
                      </div>
                      {newCategory.subCategories && newCategory.subCategories.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {newCategory.subCategories.map((subCat, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-2"
                            >
                              {subCat}
                              <button
                                onClick={() => removeSubCategoryFromNew(index)}
                                className="hover:text-destructive"
                              >
                                <X size={14} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() => {
                        setIsAddingNewCategory(false);
                        setNewCategory({ name: "", subCategories: [] });
                        setSubCategoryInput("");
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <X className="mr-2" size={16} />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateCategory}
                      size="sm"
                      disabled={!newCategory.name.trim()}
                    >
                      <Save className="mr-2" size={16} />
                      Save Category
                    </Button>
                  </div>
                </div>
              )}

              {/* Categories List */}
              <div className="space-y-3">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {editingCategory?.id === category.id ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Category Name</Label>
                          <Input
                            value={editingCategory.name}
                            onChange={(e) =>
                              setEditingCategory({ ...editingCategory, name: e.target.value })
                            }
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Subcategories</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add subcategory"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  addSubCategoryToEditing((e.target as HTMLInputElement).value);
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }}
                              className="h-10"
                            />
                          </div>
                          {editingCategory.subCategories && editingCategory.subCategories.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {editingCategory.subCategories.map((subCat, index) => (
                                <span
                                  key={index}
                                  className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-2"
                                >
                                  {subCat}
                                  <button
                                    onClick={() => removeSubCategoryFromEditing(index)}
                                    className="hover:text-destructive"
                                  >
                                    <X size={14} />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleUpdateCategory(category.id)}
                            size="sm"
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <Save className="mr-2" size={16} />
                            Save
                          </Button>
                          <Button
                            onClick={() => setEditingCategory(null)}
                            variant="outline"
                            size="sm"
                          >
                            <X className="mr-2" size={16} />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{category.name}</h4>
                          {category.subCategories && category.subCategories.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {category.subCategories.map((subCat, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-secondary/20 text-secondary text-xs rounded"
                                >
                                  {subCat}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => setEditingCategory({ ...category, isEditing: true })}
                            size="icon"
                            variant="outline"
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            onClick={() => handleDeleteCategory(category.id)}
                            size="icon"
                            variant="outline"
                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {categories.length === 0 && !isAddingNewCategory && (
                  <p className="text-center text-muted-foreground py-8">
                    No categories yet. Click "Add Category" to create one.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add New Item Form */}
        {isAddingNew && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Add New Menu Item</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-name">Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="new-name"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="Enter item name"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-price">Price (₹)</Label>
                  <Input
                    id="new-price"
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                    placeholder="Enter price"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-category">Category</Label>
                  <select
                    id="new-category"
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value, subCategory: "" })}
                    className="w-full h-11 px-3 border border-border rounded-md bg-background"
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-subcategory">Subcategory (Optional)</Label>
                  <select
                    id="new-subcategory"
                    value={newItem.subCategory || ""}
                    onChange={(e) => setNewItem({ ...newItem, subCategory: e.target.value })}
                    className="w-full h-11 px-3 border border-border rounded-md bg-background"
                    disabled={!newItem.category || getSubCategories(newItem.category).length === 0}
                  >
                    <option value="">None</option>
                    {newItem.category && getSubCategories(newItem.category).map((subCat) => (
                      <option key={subCat} value={subCat}>
                        {subCat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-image">Image URL</Label>
                  <Input
                    id="new-image"
                    value={newItem.image}
                    onChange={(e) => setNewItem({ ...newItem, image: e.target.value })}
                    placeholder="Enter image URL"
                    className="h-11"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="new-description">Description</Label>
                  <Input
                    id="new-description"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="Enter description"
                    className="h-11"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-3 mt-6">
                <Button
                  onClick={() => setIsAddingNew(false)}
                  variant="outline"
                  size="sm"
                >
                  <X className="mr-2" size={16} />
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateItem}
                  size="sm"
                  className="bg-primary text-primary-foreground"
                  disabled={!newItem.name?.trim()}
                >
                  <Save className="mr-2" size={16} />
                  Save Item
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Menu Items Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg sm:text-xl">
                Menu Items ({menuItems.length})
                {selectedItems.size > 0 && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({selectedItems.size} selected)
                  </span>
                )}
              </CardTitle>
              <div className="flex gap-2">
                {selectedItems.size > 0 && (
                  <Button
                    onClick={handleBulkDelete}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="mr-2" size={16} />
                    Delete Selected ({selectedItems.size})
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 className="mr-2" size={16} />
                      Delete Options
                      <ChevronDown className="ml-2" size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={handleBulkDelete}
                      disabled={selectedItems.size === 0}
                    >
                      Delete Selected ({selectedItems.size})
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleDeleteAll}
                      className="text-destructive focus:text-destructive"
                    >
                      Delete All Items
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm lg:text-base">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 w-12">
                      <Checkbox
                        checked={menuItems.length > 0 && selectedItems.size === menuItems.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all items"
                      />
                    </th>
                    <th className="text-left p-2">Image</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-left p-2">Price</th>
                    <th className="text-left p-2">Category</th>
                    <th className="text-left p-2">Subcategory</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="p-2">
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => toggleSelectItem(item.id)}
                          aria-label={`Select ${item.name}`}
                        />
                      </td>
                      <td className="p-2">
                        <img
                          src={item.image || 'https://via.placeholder.com/100x100?text=No+Image'}
                          alt={item.name || 'Menu item'}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100x100?text=No+Image';
                          }}
                          className="w-12 h-12 object-cover rounded"
                        />
                      </td>
                      <td className="p-2">
                        {editingItem?.id === item.id ? (
                          <Input
                            value={editingItem?.name || ''}
                            onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                            className="w-full h-10"
                          />
                        ) : (
                          <span className="font-semibold">{item.name || 'Unnamed Item'}</span>
                        )}
                      </td>
                      <td className="p-2 max-w-xs">
                        {editingItem?.id === item.id ? (
                          <Input
                            value={editingItem?.description || ''}
                            onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                            className="w-full h-10"
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground truncate">
                            {item.description || 'No description'}
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        {editingItem?.id === item.id ? (
                          <Input
                            value={editingItem?.price || ''}
                            onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                            className="w-24 h-10"
                          />
                        ) : (
                          <span className="font-bold text-primary">₹{item.price || '0'}</span>
                        )}
                      </td>
                      <td className="p-2">
                        {editingItem?.id === item.id ? (
                          <select
                            value={editingItem?.category || ''}
                            onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value, subCategory: "" })}
                            className="p-2 border border-border rounded"
                          >
                            <option value="">Select category</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.name}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm">{item.category || 'No category'}</span>
                        )}
                      </td>
                      <td className="p-2">
                        {editingItem?.id === item.id ? (
                          <select
                            value={editingItem?.subCategory || ""}
                            onChange={(e) => setEditingItem({ ...editingItem, subCategory: e.target.value })}
                            className="p-2 border border-border rounded"
                            disabled={!editingItem?.category || getSubCategories(editingItem?.category || '').length === 0}
                          >
                            <option value="">None</option>
                            {editingItem?.category && getSubCategories(editingItem.category).map((subCat) => (
                              <option key={subCat} value={subCat}>
                                {subCat}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {item.subCategory || "-"}
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            item.available
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {item.available ? "Available" : "Unavailable"}
                        </span>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          {editingItem?.id === item.id ? (
                            <>
                              <Button
                                onClick={() => handleUpdateItem(item.id)}
                                size="icon"
                                className="bg-green-500 hover:bg-green-600 text-white"
                                aria-label="Save changes"
                              >
                                <Save size={14} />
                              </Button>
                              <Button
                                onClick={cancelEditing}
                                size="icon"
                                variant="outline"
                                aria-label="Cancel editing"
                              >
                                <X size={14} />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                onClick={() => startEditing(item)}
                                size="icon"
                                variant="outline"
                                aria-label="Edit item"
                              >
                                <Edit size={14} />
                              </Button>
                              <Button
                                onClick={() => handleDeleteItem(item.id)}
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
