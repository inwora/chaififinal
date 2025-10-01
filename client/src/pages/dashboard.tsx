import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, IndianRupee, Receipt, Trash2, TrendingUp, BarChart3, ArrowLeft, Menu, Settings, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { generateDailySummaryPDF, generateWeeklySummaryPDF, generateMonthlySummaryPDF, generateMenuSalesPDF } from "@/lib/pdf";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format, addDays, parseISO } from "date-fns";
import type { DailySummary, WeeklySummary, MonthlySummary } from "@shared/schema";



type MenuItemSales = {
  name: string;
  count: number;
};

export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<"today" | "week" | "month">("today");
  const [clearPeriod, setClearPeriod] = useState<"day" | "week" | "month">("day");
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedMenuSalesDate, setSelectedMenuSalesDate] = useState<Date | undefined>(new Date());

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: dailySummaries = [] } = useQuery<DailySummary[]>({
    queryKey: ["/api/summaries/daily"],
  });

  const { data: weeklySummaries = [] } = useQuery<WeeklySummary[]>({
    queryKey: ["/api/summaries/weekly"],
  });

  const { data: monthlySummaries = [] } = useQuery<MonthlySummary[]>({
    queryKey: ["/api/summaries/monthly"],
  });



  const today = format(new Date(), 'yyyy-MM-dd');
  const selectedDateString = selectedMenuSalesDate ? format(selectedMenuSalesDate, 'yyyy-MM-dd') : today;
  const { data: menuItemSales = [], isLoading: menuItemSalesLoading, error: menuItemSalesError } = useQuery<any[]>({
    queryKey: ["/api/menu/sales", selectedDateString],
    queryFn: async () => {
      const response = await fetch(`/api/menu/sales?date=${selectedDateString}`);
      if (!response.ok) throw new Error('Failed to fetch menu sales');
      return response.json();
    },
  });

  const todaySummary = dailySummaries.find(s => s.date === today);
  const currentWeek = weeklySummaries[0];
  const currentMonth = monthlySummaries[0];

  // Generate week dates with sales data for display
  const getWeekDatesWithSales = (weekStart: string, dailySummaries: DailySummary[]) => {
    try {
      const startDate = parseISO(weekStart);
      const weekDates = [];
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      
      for (let i = 0; i < 7; i++) {
        const date = addDays(startDate, i);
        const dateString = format(date, 'yyyy-MM-dd');
        const dailySummary = dailySummaries.find(summary => summary.date === dateString);
        
        weekDates.push({
          day: dayNames[i],
          date: format(date, 'dd/MM'),
          fullDate: dateString,
          totalAmount: dailySummary?.totalAmount || '0.00'
        });
      }
      return weekDates;
    } catch (error) {
      return [];
    }
  };

  const weekDates = currentWeek ? getWeekDatesWithSales(currentWeek.weekStart, dailySummaries) : [];



  // Prepare chart data with colors
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff', '#00ffff', '#ff0000', '#0000ff', '#ffff00'];
  
  const chartData = menuItemSales
    .filter(item => item.totalSold > 0) // Only show items with sales
    .slice(0, 10)
    .map((item, index) => ({
      name: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
      fullName: item.name,
      count: item.totalSold || 0,
      revenue: item.revenue || 0,
      color: COLORS[index % COLORS.length],
    }));

  const chartConfig = {
    sales: {
      label: "Sales Count",
      color: "hsl(var(--primary))",
    },
  };

  const handleClearData = async () => {
    try {
      let dateParam = today;
      
      if (clearPeriod === 'week') {
        // Get Monday of current week
        const currentDate = new Date();
        const day = currentDate.getDay();
        const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(currentDate.setDate(diff));
        dateParam = format(monday, 'yyyy-MM-dd');
      } else if (clearPeriod === 'month') {
        dateParam = today.substring(0, 7); // YYYY-MM format
      }

      const response = await fetch(`/api/data/clear?period=${clearPeriod}&date=${dateParam}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Data Cleared",
          description: result.message,
        });
        
        // Refresh all queries
        queryClient.invalidateQueries({ queryKey: ["/api/summaries/daily"] });
        queryClient.invalidateQueries({ queryKey: ["/api/summaries/weekly"] });
        queryClient.invalidateQueries({ queryKey: ["/api/summaries/monthly"] });
        queryClient.invalidateQueries({ queryKey: ["/api/menu/sales"] });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to clear data",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear data",
        variant: "destructive",
      });
    }
  };

  const handleDownloadDaily = async () => {
    if (!todaySummary) return;
    
    try {
      await generateDailySummaryPDF(todaySummary, []);
    } catch (error) {
      console.error("Failed to generate daily PDF:", error);
    }
  };

  const handleDownloadDailyByDate = async () => {
    if (!selectedDate) {
      toast({
        title: "No Date Selected",
        description: "Please select a date first",
        variant: "destructive",
      });
      return;
    }

    const dateString = format(selectedDate, 'yyyy-MM-dd');
    
    try {
      const response = await fetch(`/api/summaries/daily/${dateString}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: "No Summary Available",
            description: "No daily summary available for the selected date",
            variant: "destructive",
          });
          return;
        }
        throw new Error('Failed to fetch daily summary');
      }
      
      const summary = await response.json();
      await generateDailySummaryPDF(summary, []);
      toast({
        title: "PDF Downloaded",
        description: `Daily summary for ${format(selectedDate, 'MMM dd, yyyy')} has been downloaded`,
      });
    } catch (error) {
      console.error("Failed to generate daily PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate daily summary PDF",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDailyByDate = async () => {
    if (!selectedDate) {
      toast({
        title: "No Date Selected",
        description: "Please select a date first",
        variant: "destructive",
      });
      return;
    }

    const dateString = format(selectedDate, 'yyyy-MM-dd');
    
    try {
      const response = await fetch(`/api/data/clear?period=day&date=${dateString}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Data Deleted",
          description: `Daily summary for ${format(selectedDate, 'MMM dd, yyyy')} has been deleted`,
        });
        
        // Refresh all queries
        queryClient.invalidateQueries({ queryKey: ["/api/summaries/daily"] });
        queryClient.invalidateQueries({ queryKey: ["/api/summaries/weekly"] });
        queryClient.invalidateQueries({ queryKey: ["/api/summaries/monthly"] });
        queryClient.invalidateQueries({ queryKey: ["/api/menu/sales"] });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to delete daily summary",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete daily summary",
        variant: "destructive",
      });
    }
  };

  const handleDownloadWeekly = async () => {
    if (!currentWeek) return;
    
    try {
      await generateWeeklySummaryPDF(currentWeek, [], dailySummaries);
    } catch (error) {
      console.error("Failed to generate weekly PDF:", error);
    }
  };

  const handleDownloadMonthly = async () => {
    if (!currentMonth) return;
    
    try {
      await generateMonthlySummaryPDF(currentMonth, []);
    } catch (error) {
      console.error("Failed to generate monthly PDF:", error);
    }
  };

  const handleDownloadMenuSales = async () => {
    if (!selectedMenuSalesDate) {
      toast({
        title: "No Date Selected",
        description: "Please select a date first",
        variant: "destructive",
      });
      return;
    }

    if (!menuItemSales || menuItemSales.length === 0) {
      toast({
        title: "No Summary Available",
        description: "No summary available for the selected date",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Transform the data to match the expected format for PDF generation
      const transformedData = menuItemSales.map(item => ({
        name: item.name,
        count: item.totalSold || 0
      }));
      
      await generateMenuSalesPDF(transformedData, selectedMenuSalesDate);
      toast({
        title: "PDF Downloaded",
        description: `Menu sales report for ${format(selectedMenuSalesDate, 'MMM yyyy')} has been downloaded successfully`,
      });
    } catch (error) {
      console.error("Failed to generate menu sales PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate menu sales PDF",
        variant: "destructive",
      });
    }
  };



  return (
    <div className="min-h-screen bg-background px-3 py-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col gap-4 mb-6 sm:mb-8">
          {/* Title and Navigation Row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate("/menu")}
                variant="outline"
                size="sm"
                className="px-3 py-2 rounded-lg font-semibold hover:bg-secondary hover:text-secondary-foreground transition-colors"
              >
                <ArrowLeft className="mr-2" size={16} />
                <span className="hidden xs:inline">Back to Menu</span>
                <span className="xs:hidden">Back</span>
              </Button>
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-secondary" data-testid="dashboard-title">Dashboard</h1>
                <p className="text-xs sm:text-sm lg:text-base text-muted-foreground" data-testid="dashboard-subtitle">Transaction summaries and analytics</p>
              </div>
            </div>

            {/* Clear Data Button - Mobile Optimized */}
            <div className="flex justify-center sm:justify-start">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 w-full sm:w-auto">
                    <Trash2 className="w-4 h-4 mr-2" />
                    <span className="hidden xs:inline">Clear Data</span>
                    <span className="xs:hidden">Clear</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="w-[95vw] max-w-lg mx-2">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear Data</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm">
                      This action will permanently delete data from both frontend and MongoDB backend. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4 space-y-3">
                    <label className="text-sm font-medium">Select period to clear:</label>
                    <Select value={clearPeriod} onValueChange={(value: "day" | "week" | "month") => setClearPeriod(value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Today's Data</SelectItem>
                        <SelectItem value="week">This Week's Data</SelectItem>
                        <SelectItem value="month">This Month's Data</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row">
                    <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearData} className="w-full sm:w-auto bg-red-600 hover:bg-red-700">
                      Clear Data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Period Selection Buttons */}
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start sm:gap-3">
            <Button
              variant={selectedPeriod === "today" ? "default" : "secondary"}
              onClick={() => setSelectedPeriod("today")}
              data-testid="button-period-today"
              size="sm"
              className="px-3 py-2 text-sm min-w-[80px] sm:min-w-[100px]"
            >
              Today
            </Button>
            <Button
              variant={selectedPeriod === "week" ? "default" : "secondary"}
              onClick={() => setSelectedPeriod("week")}
              data-testid="button-period-week"
              size="sm"
              className="px-3 py-2 text-sm min-w-[80px] sm:min-w-[100px]"
            >
              Week
            </Button>
            <Button
              variant={selectedPeriod === "month" ? "default" : "secondary"}
              onClick={() => setSelectedPeriod("month")}
              data-testid="button-period-month"
              size="sm"
              className="px-3 py-2 text-sm min-w-[80px] sm:min-w-[100px]"
            >
              Month
            </Button>
          </div>

          {/* Date-based Actions */}
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start sm:gap-3 mt-4">
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`px-3 py-2 text-sm justify-start text-left font-normal date-picker-button ${
                      selectedDate ? "text-foreground bg-blue-50 border-blue-200 hover:bg-blue-100" : "text-muted-foreground"
                    }`}
                    data-selected={selectedDate ? "true" : "false"}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "MMM dd, yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 calendar-popover" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    className="rounded-md border"
                  />
                </PopoverContent>
              </Popover>
              
              <Button
                onClick={handleDownloadDailyByDate}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm"
                disabled={!selectedDate}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Daily Summary PDF
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50 px-3 py-2 text-sm"
                    disabled={!selectedDate}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Daily Summary
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="w-[95vw] max-w-lg mx-2">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Daily Summary</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm">
                      Are you sure you want to delete the daily summary for {selectedDate ? format(selectedDate, 'MMM dd, yyyy') : 'the selected date'}? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row">
                    <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteDailyByDate} className="w-full sm:w-auto bg-red-600 hover:bg-red-700">
                      Delete Summary
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <IndianRupee className="text-primary text-lg sm:text-xl" />
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground" data-testid="text-today-label">Today</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-secondary mb-1" data-testid="text-daily-total">
                ₹{todaySummary?.totalAmount || "0.00"}
              </div>
              <div className="text-xs sm:text-sm text-green-600" data-testid="text-daily-growth">+0% from yesterday</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-lg sm:text-xl font-bold">G</span>
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground" data-testid="text-gpay-label">GPay</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-secondary mb-1" data-testid="text-gpay-total">
                ₹{todaySummary?.gpayAmount || "0.00"}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground" data-testid="text-gpay-percentage">
                {todaySummary ? Math.round((parseFloat(todaySummary.gpayAmount) / parseFloat(todaySummary.totalAmount)) * 100) : 0}% of total
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-500/10 rounded-lg flex items-center justify-center">
                  <span className="text-gray-600 text-lg sm:text-xl">₹</span>
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground" data-testid="text-cash-label">Cash</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-secondary mb-1" data-testid="text-cash-total">
                ₹{todaySummary?.cashAmount || "0.00"}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground" data-testid="text-cash-percentage">
                {todaySummary ? Math.round((parseFloat(todaySummary.cashAmount) / parseFloat(todaySummary.totalAmount)) * 100) : 0}% of total
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <Receipt className="text-blue-600 text-lg sm:text-xl" />
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground" data-testid="text-orders-label">Orders</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-secondary mb-1" data-testid="text-order-count">
                {todaySummary?.orderCount || 0}
              </div>
              <div className="text-xs sm:text-sm text-green-600" data-testid="text-order-growth">+0 from yesterday</div>
            </CardContent>
          </Card>
        </div>



        {/* Transaction Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-semibold text-secondary" data-testid="daily-summary-title">Daily Summary</h2>
                <Button
                  onClick={handleDownloadDaily}
                  className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors w-full sm:w-auto"
                  disabled={!todaySummary}
                  data-testid="button-download-daily"
                >
                  <Download className="mr-2" size={16} />
                  <span className="hidden xs:inline">Download</span>
                  <span className="xs:hidden">PDF</span>
                </Button>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 sm:p-4 bg-muted rounded-lg gap-2">
                  <div>
                    <div className="font-medium text-secondary text-sm sm:text-base" data-testid="text-total-sales">Total Sales</div>
                    <div className="text-xs sm:text-sm text-muted-foreground" data-testid="text-today-orders">
                      Today • {todaySummary?.orderCount || 0} orders
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-lg sm:text-xl font-bold text-primary" data-testid="text-today-total">
                      ₹{todaySummary?.totalAmount || "0.00"}
                    </div>
                    <div className="text-xs sm:text-sm text-green-600" data-testid="text-today-change">+0%</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-xs sm:text-sm text-green-700 mb-1" data-testid="text-gpay-payments">GPay Payments</div>
                    <div className="text-base sm:text-lg font-bold text-green-800" data-testid="text-gpay-amount">
                      ₹{todaySummary?.gpayAmount || "0.00"}
                    </div>
                  </div>
                  <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-xs sm:text-sm text-gray-700 mb-1" data-testid="text-cash-payments">Cash Payments</div>
                    <div className="text-base sm:text-lg font-bold text-gray-800" data-testid="text-cash-amount">
                      ₹{todaySummary?.cashAmount || "0.00"}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-secondary" data-testid="weekly-summary-title">Weekly Summary</h2>
                  {weekDates.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Week Dates with Sales:</p>
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {weekDates.map((dayInfo, index) => (
                          <div 
                            key={index}
                            className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200 flex flex-col items-center"
                          >
                            <span className="font-medium">{dayInfo.day} {dayInfo.date}</span>
                            <span className="text-blue-600 font-bold">₹{dayInfo.totalAmount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleDownloadWeekly}
                  className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors w-full sm:w-auto"
                  disabled={!currentWeek}
                  data-testid="button-download-weekly"
                >
                  <Download className="mr-2" size={16} />
                  <span className="hidden xs:inline">Download</span>
                  <span className="xs:hidden">PDF</span>
                </Button>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 sm:p-4 bg-muted rounded-lg gap-2">
                  <div>
                    <div className="font-medium text-secondary text-sm sm:text-base" data-testid="text-week-total">Week Total</div>
                    <div className="text-xs sm:text-sm text-muted-foreground" data-testid="text-week-orders">
                      {currentWeek ? `${currentWeek.weekStart} to ${currentWeek.weekEnd} • ${currentWeek.orderCount} orders` : "No data"}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-lg sm:text-xl font-bold text-primary" data-testid="text-week-amount">
                      ₹{currentWeek?.totalAmount || "0.00"}
                    </div>
                    <div className="text-xs sm:text-sm text-green-600" data-testid="text-week-change">+0%</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-xs sm:text-sm text-green-700 mb-1" data-testid="text-week-gpay">GPay Total</div>
                    <div className="text-base sm:text-lg font-bold text-green-800" data-testid="text-week-gpay-amount">
                      ₹{currentWeek?.gpayAmount || "0.00"}
                    </div>
                  </div>
                  <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-xs sm:text-sm text-gray-700 mb-1" data-testid="text-week-cash">Cash Total</div>
                    <div className="text-base sm:text-lg font-bold text-gray-800" data-testid="text-week-cash-amount">
                      ₹{currentWeek?.cashAmount || "0.00"}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Summary */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-secondary" data-testid="monthly-summary-title">Monthly Summary</h2>
              <Button
                onClick={handleDownloadMonthly}
                className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors w-full sm:w-auto"
                disabled={!currentMonth}
                data-testid="button-download-monthly"
              >
                <Download className="mr-2" size={16} />
                <span className="hidden xs:inline">Download</span>
                <span className="xs:hidden">PDF</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              <div className="p-4 sm:p-6 invoice-gradient text-white rounded-xl">
                <div className="mb-3 sm:mb-4">
                  <div className="text-xs sm:text-sm opacity-90" data-testid="text-month-period">
                    {currentMonth ? new Date(currentMonth.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : "No data"}
                  </div>
                  <div className="text-xl sm:text-2xl font-bold" data-testid="text-month-total">
                    ₹{currentMonth?.totalAmount || "0.00"}
                  </div>
                </div>
                <div className="text-xs sm:text-sm opacity-90" data-testid="text-month-orders">
                  {currentMonth?.orderCount || 0} total orders
                </div>
              </div>

              <div className="p-4 sm:p-6 bg-green-50 rounded-xl border border-green-200">
                <div className="mb-3 sm:mb-4">
                  <div className="text-xs sm:text-sm text-green-700" data-testid="text-month-gpay-label">GPay Payments</div>
                  <div className="text-xl sm:text-2xl font-bold text-green-800" data-testid="text-month-gpay-total">
                    ₹{currentMonth?.gpayAmount || "0.00"}
                  </div>
                </div>
                <div className="text-xs sm:text-sm text-green-600" data-testid="text-month-gpay-percentage">
                  {currentMonth ? ((parseFloat(currentMonth.gpayAmount) / parseFloat(currentMonth.totalAmount)) * 100).toFixed(1) : 0}% of total
                </div>
              </div>

              <div className="p-4 sm:p-6 bg-gray-50 rounded-xl border border-gray-200">
                <div className="mb-3 sm:mb-4">
                  <div className="text-xs sm:text-sm text-gray-700" data-testid="text-month-cash-label">Cash Payments</div>
                  <div className="text-xl sm:text-2xl font-bold text-gray-800" data-testid="text-month-cash-total">
                    ₹{currentMonth?.cashAmount || "0.00"}
                  </div>
                </div>
                <div className="text-xs sm:text-sm text-gray-600" data-testid="text-month-cash-percentage">
                  {currentMonth ? ((parseFloat(currentMonth.cashAmount) / parseFloat(currentMonth.totalAmount)) * 100).toFixed(1) : 0}% of total
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Menu Item Sales Analytics */}
        <div className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* Sales Table */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col gap-3 mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h2 className="text-lg sm:text-xl font-semibold text-secondary">Items Sold Summary</h2>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <Button
                      onClick={() => navigate("/menu")}
                      variant="outline"
                      className="px-3 py-2 rounded-lg text-sm hover:bg-secondary hover:text-secondary-foreground transition-colors flex-1 sm:flex-none"
                    >
                      <Menu className="mr-2" size={16} />
                      <span className="hidden xs:inline">View Menu</span>
                      <span className="xs:hidden">Menu</span>
                    </Button>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                      <BarChart3 className="text-purple-600 text-lg sm:text-xl" />
                    </div>
                  </div>
                </div>
                
                {/* Date Selection and Download for Menu Sales */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`px-3 py-2 text-sm justify-start text-left font-normal date-picker-button ${
                          selectedMenuSalesDate ? "text-foreground" : "text-muted-foreground"
                        }`}
                        data-selected={selectedMenuSalesDate ? "true" : "false"}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedMenuSalesDate ? format(selectedMenuSalesDate, "MMM yyyy") : "Select month/year"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 calendar-popover" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedMenuSalesDate}
                        onSelect={setSelectedMenuSalesDate}
                        initialFocus
                        className="rounded-md border"
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Button
                    onClick={handleDownloadMenuSales}
                    className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors"
                    disabled={!selectedMenuSalesDate}
                    data-testid="button-download-menu-sales"
                  >
                    <Download className="mr-2" size={16} />
                    <span className="hidden xs:inline">Download</span>
                    <span className="xs:hidden">PDF</span>
                  </Button>
                </div>
              </div>

              {menuItemSalesLoading ? (
                <div className="text-center py-4">Loading sales data...</div>
              ) : menuItemSalesError ? (
                <div className="text-center py-4 text-red-600">Error loading sales data</div>
              ) : (
                <div className="space-y-4">
                  {menuItemSales && menuItemSales.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto">
                      {/* Mobile Card Layout */}
                      <div className="block sm:hidden space-y-2">
                        {menuItemSales.map((item, index) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                            <span className="font-medium text-sm">{item.name}</span>
                            <span className="font-bold text-purple-600 text-sm">{item.totalSold || 0}</span>
                          </div>
                        ))}
                      </div>
                      {/* Desktop Table Layout */}
                      <div className="hidden sm:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Menu Item</TableHead>
                              <TableHead className="text-right">Sales Count</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {menuItemSales.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell className="text-right font-bold text-purple-600">
                                  {item.totalSold || 0}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No sales data available for today
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sales Chart */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-semibold text-secondary">Individual Menu Item Sales</h2>
                <div className="flex items-center gap-2 sm:gap-3">
                  <Select value={chartType} onValueChange={(value: "bar" | "pie") => setChartType(value)}>
                    <SelectTrigger className="w-28 sm:w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar">Bar Chart</SelectItem>
                      <SelectItem value="pie">Pie Chart</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <TrendingUp className="text-green-600 text-lg sm:text-xl" />
                  </div>
                </div>
              </div>

              {menuItemSalesLoading ? (
                <div className="text-center py-6 sm:py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading sales data...</p>
                </div>
              ) : menuItemSalesError ? (
                <div className="text-center py-6 sm:py-8">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-red-600 text-2xl">⚠️</span>
                  </div>
                  <p className="text-red-600 font-medium">Error loading sales data</p>
                  <p className="text-sm text-muted-foreground mt-2">Please try refreshing the page</p>
                </div>
              ) : (
                <div className="h-60 sm:h-72 lg:h-80">
                  {chartData && chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === "bar" ? (
                        <BarChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            fontSize={10}
                            interval={0}
                          />
                          <YAxis fontSize={11} />
                          <Tooltip
                            formatter={(value, name, props) => [
                              `${value} sold`,
                              props.payload.fullName
                            ]}
                            labelFormatter={(label) => `Item: ${label}`}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #ccc',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                              fontSize: '12px'
                            }}
                          />
                          <Bar
                            dataKey="count"
                            fill="#8884d8"
                            radius={[3, 3, 0, 0]}
                          />
                        </BarChart>
                      ) : (
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, count, percent }) => `${count}`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value, name, props) => [
                              `${value} sold`,
                              props.payload.fullName
                            ]}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #ccc',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                              fontSize: '12px'
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                        </PieChart>
                      )}
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                      </div>
                      <p className="text-base sm:text-lg font-medium">No sales data available</p>
                      <p className="text-xs sm:text-sm mt-2">Start selling items to see the visualization</p>
                    </div>
                  )}
                </div>
              )}

              {/* Sales Summary */}
              {chartData && chartData.length > 0 && (
                <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="text-center">
                      <p className="text-xl sm:text-2xl font-bold text-primary">{chartData.length}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">Items Sold</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl sm:text-2xl font-bold text-green-600">
                        {chartData.reduce((sum, item) => sum + item.count, 0)}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">Total Quantity</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl sm:text-2xl font-bold text-blue-600">
                        ₹{chartData.reduce((sum, item) => sum + item.revenue, 0).toFixed(2)}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">Total Revenue</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl sm:text-2xl font-bold text-purple-600">
                        ₹{chartData.length > 0 ? (chartData.reduce((sum, item) => sum + item.revenue, 0) / chartData.reduce((sum, item) => sum + item.count, 0)).toFixed(2) : '0.00'}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">Avg. Price</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

       
        {/* Powered by Innowara */}
        
        
        

        <footer className="mt-12 border-t border-border pt-4 text-center text-xs text-muted-foreground">
           <h3>©️ 2025 - 2026 Inwora.in</h3>
        </footer>
      </div>
    </div>
  );
}
