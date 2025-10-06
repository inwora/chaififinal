import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, Play, StopCircle, Edit, Trash2, Check, X, Menu, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { generateInventoryPDF } from "@/lib/pdf-inventory";
import type { MenuItem } from "@shared/schema";

type InventorySession = {
  id: string;
  date: string;
  status: 'pre-billing' | 'billing' | 'ended';
  startTime: Date;
  endTime?: Date;
};

type InventoryItemData = {
  id: string;
  sessionId: string;
  menuItemId: string;
  stockIn: number;
  stockOut: number;
  stockLeft: number;
  menuItem: MenuItem;
};

export default function InventoryPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [stockInputs, setStockInputs] = useState<Record<string, number>>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Fetch menu items
  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu"],
    refetchOnMount: true, // Always refetch when component mounts
  });

  // Fetch current inventory session
  const { data: currentSession, refetch: refetchSession, isLoading: isLoadingSession } = useQuery<InventorySession | null>({
    queryKey: ["/api/inventory/session/current"],
    queryFn: async () => {
      const response = await fetch("/api/inventory/session/current");
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Failed to fetch session");
      return response.json();
    },
  });

  // Fetch inventory items for current session
  const { data: inventoryItems = [], refetch: refetchItems, isLoading: isLoadingItems } = useQuery<InventoryItemData[]>({
    queryKey: ["/api/inventory/items", currentSession?.id],
    queryFn: async () => {
      if (!currentSession?.id) return [];
      const response = await fetch(`/api/inventory/items/${currentSession.id}`);
      if (!response.ok) throw new Error("Failed to fetch inventory items");
      return response.json();
    },
    enabled: !!currentSession?.id,
    refetchInterval: currentSession?.status === 'billing' ? 5000 : false, // Auto-refresh every 5 seconds when billing is active
  });

  // Initialize stock inputs from inventory items
  useEffect(() => {
    if (inventoryItems.length > 0) {
      const inputs: Record<string, number> = {};
      inventoryItems.forEach(item => {
        inputs[item.menuItemId] = item.stockIn;
      });
      setStockInputs(inputs);
    }
  }, [inventoryItems]);

  // Start Day mutation
  const startDayMutation = useMutation({
    mutationFn: async () => {
      const items = menuItems.map(item => ({
        menuItemId: item.id,
        stockIn: stockInputs[item.id] || 0,
      }));

      const response = await fetch("/api/inventory/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start day");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Day Started",
        description: "Inventory tracking has begun.",
      });
      refetchSession();
      refetchItems();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // End Day mutation
  const endDayMutation = useMutation({
    mutationFn: async () => {
      if (!currentSession?.id) throw new Error("No active session");

      const response = await fetch("/api/inventory/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: currentSession.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to end day");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Day Ended",
        description: "Inventory summary has been calculated.",
      });
      refetchSession();
      refetchItems();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStockInputChange = (menuItemId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setStockInputs(prev => ({ ...prev, [menuItemId]: numValue }));
  };

  const handleStartDay = () => {
    // Validate that at least some stock is entered
    const hasStock = Object.values(stockInputs).some(val => val > 0);
    if (!hasStock) {
      toast({
        title: "No Stock Entered",
        description: "Please enter stock quantities before starting the day.",
        variant: "destructive",
      });
      return;
    }
    startDayMutation.mutate();
  };

  const handleEndDay = () => {
    endDayMutation.mutate();
  };

  // Delete inventory mutation
  const deleteInventoryMutation = useMutation({
    mutationFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const response = await fetch(`/api/inventory/delete/${today}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete inventory data");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Inventory Deleted",
        description: "Inventory data has been deleted successfully.",
      });
      refetchSession();
      refetchItems();
      setStockInputs({});
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteInventory = () => {
    if (window.confirm("Are you sure you want to delete today's inventory data? This action cannot be undone.")) {
      deleteInventoryMutation.mutate();
    }
  };

  const handleGoToMenu = () => {
    navigate("/menu");
  };

  const handleDownloadPDF = async () => {
    if (!currentSession || inventoryItems.length === 0) {
      toast({
        title: "No Data",
        description: "No inventory data available to download.",
        variant: "destructive",
      });
      return;
    }

    try {
      await generateInventoryPDF(currentSession, inventoryItems);
      toast({
        title: "PDF Downloaded",
        description: "Inventory report has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF report.",
        variant: "destructive",
      });
    }
  };

  // Update stock in mutation
  const updateStockInMutation = useMutation({
    mutationFn: async ({ inventoryItemId, stockIn }: { inventoryItemId: string; stockIn: number }) => {
      const response = await fetch(`/api/inventory/item/${inventoryItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockIn }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update stock");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Stock Updated",
        description: "Stock In value has been updated successfully.",
      });
      refetchItems();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditStockIn = (menuItemId: string) => {
    setEditingItemId(menuItemId);
  };

  const handleSaveStockIn = (menuItemId: string) => {
    const inventoryItem = inventoryItems.find(inv => inv.menuItemId === menuItemId);
    if (inventoryItem) {
      const newStockIn = stockInputs[menuItemId] || 0;
      updateStockInMutation.mutate({
        inventoryItemId: inventoryItem.id,
        stockIn: newStockIn,
      });
    }
    setEditingItemId(null);
  };

  const handleCancelEdit = () => {
    // Restore original values from inventory items
    if (editingItemId && inventoryItems.length > 0) {
      const inventoryItem = inventoryItems.find(inv => inv.menuItemId === editingItemId);
      if (inventoryItem) {
        setStockInputs(prev => ({ ...prev, [editingItemId]: inventoryItem.stockIn }));
      }
    }
    setEditingItemId(null);
  };

  const handleResetStockIn = (menuItemId: string, menuItemName: string) => {
    if (window.confirm(`Are you sure you want to reset stock for "${menuItemName}" to 0?`)) {
      setStockInputs(prev => ({ ...prev, [menuItemId]: 0 }));
      toast({
        title: "Stock Reset",
        description: `Stock In for "${menuItemName}" has been reset to 0.`,
      });
    }
  };

  const isPreBilling = !currentSession || currentSession.status === 'pre-billing';
  const isBilling = currentSession?.status === 'billing';
  const isEnded = currentSession?.status === 'ended';

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <div className="container mx-auto p-4 max-w-7xl">
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-orange-500 to-amber-500 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => navigate("/dashboard")}
                  variant="outline"
                  size="sm"
                  className="bg-white text-orange-600 hover:bg-orange-50"
                >
                  <ArrowLeft className="mr-2" size={16} />
                  Back
                </Button>
                <div>
                  <CardTitle className="text-2xl font-bold">Inventory Management</CardTitle>
                  <p className="text-sm text-orange-100 mt-1">
                    Track daily stock levels and sales
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right mr-3">
                  <p className="text-sm font-semibold">{format(new Date(), 'MMM dd, yyyy')}</p>
                  <p className="text-xs text-orange-100">{format(new Date(), 'hh:mm a')}</p>
                </div>
                <Button
                  onClick={handleGoToMenu}
                  variant="outline"
                  size="sm"
                  className="bg-white text-green-600 hover:bg-green-50 border-green-300"
                >
                  <Menu className="mr-2" size={16} />
                  Go to Menu
                </Button>
                <Button
                  onClick={handleDeleteInventory}
                  variant="outline"
                  size="sm"
                  className="bg-white text-red-600 hover:bg-red-50 border-red-300"
                  disabled={deleteInventoryMutation.isPending || !currentSession}
                >
                  <Trash className="mr-2" size={16} />
                  Delete Inventory
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {/* Summary Section - Always visible when session exists */}
            {currentSession && inventoryItems.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 text-lg font-bold">📦</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Stock In</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {inventoryItems.reduce((sum, item) => sum + item.stockIn, 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total items added
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                        <span className="text-green-600 text-lg font-bold">📤</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Stock Out</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {inventoryItems.reduce((sum, item) => sum + item.stockOut, 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Items sold
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                        <span className="text-orange-600 text-lg font-bold">📊</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Stock Left</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-600 mb-1">
                      {inventoryItems.reduce((sum, item) => sum + item.stockLeft, 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Remaining items
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                        <span className="text-purple-600 text-lg font-bold">₹</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Revenue</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-600 mb-1">
                      ₹{inventoryItems.reduce((sum, item) => 
                        sum + (item.stockOut * parseFloat(item.menuItem.price)), 0
                      ).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total earnings
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Status Banner */}
            <div className={`mb-6 p-4 rounded-lg ${
              isPreBilling ? 'bg-blue-50 border border-blue-200' :
              isBilling ? 'bg-green-50 border border-green-200' :
              'bg-gray-50 border border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {isPreBilling && "Pre-Billing: Enter Stock Quantities"}
                    {isBilling && "Billing Active: Sales Being Tracked"}
                    {isEnded && "Day Ended: View Summary"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isPreBilling && "Enter the starting stock for each item and click 'Start Day'"}
                    {isBilling && "Sales are being tracked in real-time. You can edit stock quantities anytime."}
                    {isEnded && "The day has ended. Review the summary and download the report."}
                  </p>
                  {currentSession && (isBilling || isEnded) && (
                    <div className="mt-3 space-y-2">
                      {/* Session Info */}
                      <div className="flex items-center gap-2">
                        <Play className="h-4 w-4 text-green-700" />
                        <span className="font-medium text-green-700">
                          Started: {format(new Date(currentSession.startTime), 'hh:mm a')}
                        </span>
                      </div>

                      {/* End Status */}
                      {isEnded && currentSession.endTime && (
                        <div className="flex items-center gap-2">
                          <StopCircle className="h-4 w-4 text-red-700" />
                          <span className="font-medium text-red-700">
                            Ended: {format(new Date(currentSession.endTime), 'hh:mm a')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {isPreBilling && (
                    <Button
                      onClick={handleStartDay}
                      disabled={startDayMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Start Day
                    </Button>
                  )}
                  {isBilling && (
                    <Button
                      onClick={handleEndDay}
                      disabled={endDayMutation.isPending}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <StopCircle className="mr-2 h-4 w-4" />
                      End Day
                    </Button>
                  )}
                  {isEnded && (
                    <Button
                      onClick={handleDownloadPDF}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Item Name</TableHead>
                    <TableHead className="font-semibold">Category</TableHead>
                    <TableHead className="font-semibold text-center">Stock In</TableHead>
                    <TableHead className="font-semibold text-center">Stock Out</TableHead>
                    <TableHead className="font-semibold text-center">Stock Left</TableHead>
                    <TableHead className="font-semibold text-right">Revenue</TableHead>
                    <TableHead className="font-semibold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingSession || (isLoadingItems && currentSession?.id) ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Loading inventory data...
                      </TableCell>
                    </TableRow>
                  ) : (
                    menuItems.map((item) => {
                      const inventoryItem = inventoryItems.find(inv => inv.menuItemId === item.id);
                      
                      // For pre-billing phase, use stockInputs or inventoryItem data
                      // For billing/ended phases, always use inventoryItem data
                      const stockIn = inventoryItem ? inventoryItem.stockIn : (stockInputs[item.id] || 0);
                      const stockOut = inventoryItem ? inventoryItem.stockOut : 0;
                      const stockLeft = inventoryItem ? inventoryItem.stockLeft : 0;
                      const revenue = stockOut * parseFloat(item.price);

                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                              {item.category}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {(isPreBilling || editingItemId === item.id) && !isEnded ? (
                              <Input
                                type="number"
                                min="0"
                                value={stockInputs[item.id] || ''}
                                onChange={(e) => handleStockInputChange(item.id, e.target.value)}
                                className="w-20 text-center mx-auto"
                                placeholder="0"
                              />
                            ) : (
                              <span className="font-semibold">{stockIn}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-semibold ${stockOut > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                              {stockOut}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-semibold ${
                              (isBilling || isEnded) ? (stockLeft > 0 ? 'text-blue-600' : 'text-gray-400') : 'text-gray-400'
                            }`}>
                              {(isBilling || isEnded) ? stockLeft : '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`font-semibold ${revenue > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                              ₹{revenue.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              {editingItemId === item.id ? (
                                <>
                                  <Button
                                    onClick={() => handleSaveStockIn(item.id)}
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-600 hover:border-green-300"
                                    title="Save changes"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    onClick={handleCancelEdit}
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-gray-50 hover:text-gray-600 hover:border-gray-300"
                                    title="Cancel edit"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  {!isPreBilling && (
                                    <Button
                                      onClick={() => handleEditStockIn(item.id)}
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                                      title="Edit stock in"
                                      disabled={isEnded}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {isPreBilling && (
                                    <Button
                                      onClick={() => handleResetStockIn(item.id, item.name)}
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                                      title="Reset stock to 0"
                                      disabled={isEnded}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}