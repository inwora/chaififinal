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

  const inventoryRows = menuItems.map((item) => {
    const inventoryItem = inventoryItems.find(inv => inv.menuItemId === item.id);
    const stockIn = inventoryItem ? inventoryItem.stockIn : (stockInputs[item.id] || 0);
    const stockOut = inventoryItem ? inventoryItem.stockOut : 0;
    const stockLeft = inventoryItem ? inventoryItem.stockLeft : 0;
    const revenue = stockOut * parseFloat(item.price);

    return { item, inventoryItem, stockIn, stockOut, stockLeft, revenue };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 pb-20 sm:pb-12">
      <div className="mx-auto max-w-7xl px-2 py-3 sm:px-6 sm:py-6">
        <Card className="shadow-lg overflow-hidden">
          <CardHeader className="border-b bg-gradient-to-r from-orange-500 to-amber-500 text-white p-3 sm:p-6">
            <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <Button
                  onClick={() => navigate("/dashboard")}
                  variant="outline"
                  size="sm"
                  className="w-fit bg-white text-orange-600 hover:bg-orange-50 text-xs sm:text-sm"
                >
                  <ArrowLeft className="mr-1 sm:mr-2" size={14} />
                  Back
                </Button>
                <div>
                  <CardTitle className="text-lg sm:text-2xl font-bold">Inventory Management</CardTitle>
                  <p className="text-xs sm:text-sm text-orange-100 mt-0.5 sm:mt-1">
                    Track daily stock levels and sales
                  </p>
                </div>
              </div>
              <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:gap-3 sm:justify-end md:w-auto">
                <div className="order-last flex flex-col text-left sm:order-none sm:mr-3 sm:text-right">
                  <p className="text-xs sm:text-sm font-semibold">{format(new Date(), 'MMM dd, yyyy')}</p>
                  <p className="text-[10px] sm:text-xs text-orange-100">{format(new Date(), 'hh:mm a')}</p>
                </div>
                <div className="flex flex-1 gap-1.5 sm:gap-2 sm:flex-none sm:gap-3">
                  <Button
                    onClick={handleGoToMenu}
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-white text-green-600 hover:bg-green-50 border-green-300 sm:flex-none text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <Menu className="mr-1 sm:mr-2" size={14} />
                    <span className="hidden xs:inline">Go to </span>Menu
                  </Button>
                  <Button
                    onClick={handleDeleteInventory}
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-white text-red-600 hover:bg-red-50 border-red-300 sm:flex-none text-xs sm:text-sm px-2 sm:px-3"
                    disabled={deleteInventoryMutation.isPending || !currentSession}
                  >
                    <Trash className="mr-1 sm:mr-2" size={14} />
                    Delete
                  </Button>
                </div>
                <Button
                  onClick={handleDownloadPDF}
                  className="w-full bg-blue-600 hover:bg-blue-700 sm:hidden text-xs"
                  disabled={!isEnded || inventoryItems.length === 0}
                >
                  <Download className="mr-2 h-3.5 w-3.5" />
                  Download PDF
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-2 py-3 sm:px-6 sm:py-6">
            {/* Summary Section - Always visible when session exists */}
            {currentSession && inventoryItems.length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-5">
                {[
                  {
                    label: "Stock In",
                    value: inventoryItems.reduce((sum, item) => sum + item.stockIn, 0),
                    suffix: "Total items added",
                    icon: "📦",
                    bg: "bg-blue-500/10",
                    text: "text-blue-600",
                    wrapperClass: ""
                  },
                  {
                    label: "Stock Out",
                    value: inventoryItems.reduce((sum, item) => sum + item.stockOut, 0),
                    suffix: "Items sold",
                    icon: "📤",
                    bg: "bg-green-500/10",
                    text: "text-green-600",
                    wrapperClass: ""
                  },
                  {
                    label: "Stock Left",
                    value: inventoryItems.reduce((sum, item) => sum + item.stockLeft, 0),
                    suffix: "Remaining items",
                    icon: "📊",
                    bg: "bg-orange-500/10",
                    text: "text-orange-600",
                    wrapperClass: ""
                  },
                  {
                    label: "Revenue",
                    value: `₹${inventoryItems.reduce((sum, item) => sum + (item.stockOut * parseFloat(item.menuItem.price)), 0).toFixed(2)}`,
                    suffix: "Total earnings",
                    icon: "₹",
                    bg: "bg-purple-500/10",
                    text: "text-purple-600",
                    wrapperClass: ""
                  },
                  {
                    label: "Menu Items",
                    value: menuItems.length,
                    suffix: "Tracked today",
                    icon: "🍽️",
                    bg: "bg-amber-500/10",
                    text: "text-amber-600",
                    wrapperClass: "col-span-2 sm:col-span-1"
                  }
                ].map((card) => (
                  <Card key={card.label} className={card.wrapperClass}>
                    <CardContent className="p-2.5 sm:p-4">
                      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${card.bg}`}>
                          <span className={`${card.text} text-base sm:text-lg font-bold`}>{card.icon}</span>
                        </div>
                        <span className="text-[10px] sm:text-xs text-muted-foreground">{card.label}</span>
                      </div>
                      <div className={`text-lg sm:text-2xl font-bold ${card.text} mb-0.5 sm:mb-1`}>
                        {card.value}
                      </div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground">
                        {card.suffix}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Status Banner */}
            <div className={`mt-4 mb-4 sm:mt-6 sm:mb-6 grid gap-3 sm:gap-4 rounded-lg border p-3 sm:p-4 sm:grid-cols-[1fr_auto] items-start ${
              isPreBilling ? 'bg-blue-50 border-blue-200' :
              isBilling ? 'bg-green-50 border-green-200' :
              'bg-gray-50 border-gray-200'
            }`}>
              <div>
                <h3 className="text-base sm:text-lg font-semibold">
                  {isPreBilling && "Pre-Billing: Enter Stock Quantities"}
                  {isBilling && "Billing Active: Sales Being Tracked"}
                  {isEnded && "Day Ended: View Summary"}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {isPreBilling && "Enter the starting stock for each item and click 'Start Day'"}
                  {isBilling && "Sales are being tracked in real-time. You can edit stock quantities anytime."}
                  {isEnded && "The day has ended. Review the summary and download the report."}
                </p>
                {currentSession && (isBilling || isEnded) && (
                  <div className="mt-2 sm:mt-3 space-y-1.5 sm:space-y-2">
                    {/* Session Info */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Play className="h-3 w-3 sm:h-4 sm:w-4 text-green-700" />
                      <span className="text-xs sm:text-sm font-medium text-green-700">
                        Started: {format(new Date(currentSession.startTime), 'hh:mm a')}
                      </span>
                    </div>

                    {/* End Status */}
                    {isEnded && currentSession.endTime && (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <StopCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-700" />
                        <span className="text-xs sm:text-sm font-medium text-red-700">
                          Ended: {format(new Date(currentSession.endTime), 'hh:mm a')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                {isPreBilling && (
                  <Button
                    onClick={handleStartDay}
                    disabled={startDayMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-700 sm:w-auto text-sm"
                  >
                    <Play className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Start Day
                  </Button>
                )}
                {isBilling && (
                  <Button
                    onClick={handleEndDay}
                    disabled={endDayMutation.isPending}
                    className="w-full bg-red-600 hover:bg-red-700 sm:w-auto text-sm"
                  >
                    <StopCircle className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    End Day
                  </Button>
                )}
                {isEnded && (
                  <Button
                    onClick={handleDownloadPDF}
                    className="hidden bg-blue-600 hover:bg-blue-700 sm:flex text-sm"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                )}
              </div>
            </div>

            {/* Inventory Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table className="hidden text-sm lg:table">
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
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        Loading inventory data...
                      </TableCell>
                    </TableRow>
                  ) : (
                    inventoryRows.map(({ item, stockIn, stockOut, stockLeft, revenue }) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <span className="rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-700">
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
                              className="mx-auto w-20 text-center"
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
                                  <div className="flex gap-1">
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
                                    <Button
                                      onClick={() => handleSaveStockIn(item.id)}
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-600 hover:border-green-300"
                                      title="Save stock"
                                      disabled={isEnded}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="grid gap-2 p-2 lg:hidden">
                {isLoadingSession || (isLoadingItems && currentSession?.id) ? (
                  <Card>
                    <CardContent className="py-4 text-center text-muted-foreground text-sm">
                      Loading inventory data...
                    </CardContent>
                  </Card>
                ) : (
                  inventoryRows.map(({ item, stockIn, stockOut, stockLeft, revenue }) => (
                    <Card key={item.id} className="bg-white shadow-sm">
                      <CardContent className="space-y-2 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-secondary truncate">{item.name}</h4>
                            <span className="inline-block rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] text-orange-700">
                              {item.category}
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-green-600 whitespace-nowrap">
                            ₹{revenue.toFixed(2)}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          <div className="rounded border bg-gray-50 p-1.5 text-center">
                            <p className="text-[9px] uppercase tracking-wide text-muted-foreground mb-0.5">In</p>
                            {(isPreBilling || editingItemId === item.id) && !isEnded ? (
                              <Input
                                type="number"
                                min="0"
                                value={stockInputs[item.id] || ''}
                                onChange={(e) => handleStockInputChange(item.id, e.target.value)}
                                className="h-7 text-center text-sm p-0"
                                placeholder="0"
                              />
                            ) : (
                              <p className="text-base font-bold">{stockIn}</p>
                            )}
                          </div>
                          <div className="rounded border bg-gray-50 p-1.5 text-center">
                            <p className="text-[9px] uppercase tracking-wide text-muted-foreground mb-0.5">Out</p>
                            <p className={`text-base font-bold ${stockOut > 0 ? 'text-green-600' : 'text-gray-400'}`}>{stockOut}</p>
                          </div>
                          <div className="rounded border bg-gray-50 p-1.5 text-center">
                            <p className="text-[9px] uppercase tracking-wide text-muted-foreground mb-0.5">Left</p>
                            <p className={`text-base font-bold ${
                              (isBilling || isEnded) ? (stockLeft > 0 ? 'text-blue-600' : 'text-gray-400') : 'text-gray-400'
                            }`}>
                              {(isBilling || isEnded) ? stockLeft : '-'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-1.5 pt-1">
                          {editingItemId === item.id ? (
                            <>
                              <Button
                                onClick={() => handleSaveStockIn(item.id)}
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={handleCancelEdit}
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              {!isPreBilling && (
                                <Button
                                  onClick={() => handleEditStockIn(item.id)}
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs"
                                  disabled={isEnded}
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                              )}
                              {isPreBilling && (
                                <div className="flex gap-1.5">
                                  <Button
                                    onClick={() => handleResetStockIn(item.id, item.name)}
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    onClick={() => handleSaveStockIn(item.id)}
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs"
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}