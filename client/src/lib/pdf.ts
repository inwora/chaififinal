import jsPDF from "jspdf";
import { format } from "date-fns";
import type { Transaction, DailySummary, WeeklySummary, MonthlySummary } from "@shared/schema";

export const generateInvoicePDF = async (transaction: Transaction) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFillColor(255, 102, 51); // Orange color
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text('Chai-Fi', 20, 25);
  doc.setFontSize(12);
  doc.text('Modern Billing Solution', 20, 32);
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(`Invoice #${transaction.id.slice(-6).toUpperCase()}`, 150, 25);
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  // Bill Details
  doc.setFontSize(14);
  doc.text('Bill Details', 20, 60);
  doc.setFontSize(10);
  doc.text(`Date: ${transaction.date}`, 20, 70);
  doc.text(`Day: ${transaction.dayName}`, 20, 77);
  doc.text(`Time: ${transaction.time}`, 20, 84);
  doc.text(`Biller: ${transaction.billerName}`, 20, 91);
  
  // Payment Details
  doc.setFontSize(14);
  doc.text('Payment Details', 110, 60);
  doc.setFontSize(10);
  doc.text(`Method: ${transaction.paymentMethod === 'gpay' ? 'Google Pay' : 'Cash'}`, 110, 70);
  doc.text('Status: Paid', 110, 77);
  
  // Items
  doc.setFontSize(14);
  doc.text('Items Ordered', 20, 110);
  
  let yPos = 120;
  const items = Array.isArray(transaction.items) ? transaction.items : [];
  
  items.forEach((item: any, index: number) => {
    doc.setFontSize(10);
    doc.text(`${item.name} x${item.quantity}`, 20, yPos);
    doc.text(`₹${(parseFloat(item.price) * item.quantity).toFixed(2)}`, 150, yPos);
    yPos += 7;
  });
  
  // Total
  yPos += 10;
  doc.setFontSize(14);
  doc.text('Total Amount:', 20, yPos);
  doc.text(`₹${transaction.totalAmount}`, 150, yPos);
  
  // Footer
  yPos += 20;
  doc.setFontSize(10);
  doc.text('Thank you for choosing Chai-Fi!', 20, yPos);
  doc.text('For support, contact us at support@chai-fi.com', 20, yPos + 7);
  
  doc.save(`chai-fi-invoice-${transaction.id.slice(-6)}.pdf`);
};

export const generateDailySummaryPDF = async (summary: DailySummary, transactions: Transaction[]) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFillColor(255, 102, 51);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text('Chai-Fi', 20, 25);
  doc.setFontSize(12);
  doc.text('Daily Summary Report', 20, 32);
  
  doc.setTextColor(0, 0, 0);
  
  // Summary Details
  doc.setFontSize(16);
  doc.text(`Daily Summary - ${summary.date}`, 20, 60);
  
  doc.setFontSize(12);
  doc.text(`Total Sales: ₹${summary.totalAmount}`, 20, 80);
  doc.text(`GPay Payments: ₹${summary.gpayAmount}`, 20, 90);
  doc.text(`Cash Payments: ₹${summary.cashAmount}`, 20, 100);
  doc.text(`Total Orders: ${summary.orderCount}`, 20, 110);
  
  // Add downloading time
  doc.setFontSize(10);
  doc.text(`Downloaded on: ${new Date().toLocaleString()}`, 20, 130);
  
  doc.save(`chai-fi-daily-summary-${summary.date}.pdf`);
};

export const generateWeeklySummaryPDF = async (summary: WeeklySummary, transactions: Transaction[], dailySummaries?: any[]) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFillColor(255, 102, 51);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text('Chai-Fi', 20, 25);
  doc.setFontSize(12);
  doc.text('Weekly Summary Report', 20, 32);
  
  doc.setTextColor(0, 0, 0);
  
  // Summary Details
  doc.setFontSize(16);
  doc.text(`Weekly Summary - ${summary.weekStart} to ${summary.weekEnd}`, 20, 60);
  
  doc.setFontSize(12);
  doc.text(`Total Sales: ₹${summary.totalAmount}`, 20, 80);
  doc.text(`GPay Payments: ₹${summary.gpayAmount}`, 20, 90);
  doc.text(`Cash Payments: ₹${summary.cashAmount}`, 20, 100);
  doc.text(`Total Orders: ${summary.orderCount}`, 20, 110);
  
  // Add daily breakdown if available
  if (dailySummaries && dailySummaries.length > 0) {
    doc.setFontSize(14);
    doc.text('Daily Breakdown:', 20, 130);
    
    let yPosition = 145;
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Generate dates for the week
    const startDate = new Date(summary.weekStart);
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateString = format(currentDate, 'yyyy-MM-dd');
      const dayName = dayNames[i];
      const formattedDate = currentDate.toLocaleDateString('en-GB');
      
      // Find daily summary for this date
      const dailySummary = dailySummaries.find(ds => ds.date === dateString);
      const totalAmount = dailySummary?.totalAmount || '0.00';
      const gpayAmount = dailySummary?.gpayAmount || '0.00';
      const cashAmount = dailySummary?.cashAmount || '0.00';
      
      doc.setFontSize(10);
      doc.text(`${dayName} (${formattedDate}):`, 25, yPosition);
      yPosition += 7;
      doc.text(`  Total: ₹${totalAmount}`, 30, yPosition);
      yPosition += 7;
      doc.text(`  G Pay: ₹${gpayAmount}`, 30, yPosition);
      yPosition += 7;
      doc.text(`  Cash: ₹${cashAmount}`, 30, yPosition);
      yPosition += 12; // Extra space between days
    }
    
    // Add downloading time
    doc.setFontSize(10);
    doc.text(`Downloaded on: ${new Date().toLocaleString()}`, 20, yPosition + 10);
  } else {
    // Add downloading time
    doc.setFontSize(10);
    doc.text(`Downloaded on: ${new Date().toLocaleString()}`, 20, 130);
  }
  
  doc.save(`chai-fi-weekly-summary-${summary.weekStart}.pdf`);
};

export const generateMonthlySummaryPDF = async (summary: MonthlySummary, transactions: Transaction[]) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFillColor(255, 102, 51);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text('Chai-Fi', 20, 25);
  doc.setFontSize(12);
  doc.text('Monthly Summary Report', 20, 32);
  
  doc.setTextColor(0, 0, 0);
  
  // Summary Details
  doc.setFontSize(16);
  doc.text(`Monthly Summary - ${summary.month}`, 20, 60);
  
  doc.setFontSize(12);
  doc.text(`Total Sales: ₹${summary.totalAmount}`, 20, 80);
  doc.text(`GPay Payments: ₹${summary.gpayAmount}`, 20, 90);
  doc.text(`Cash Payments: ₹${summary.cashAmount}`, 20, 100);
  doc.text(`Total Orders: ${summary.orderCount}`, 20, 110);
  
  // Add downloading time
  doc.setFontSize(10);
  doc.text(`Downloaded on: ${new Date().toLocaleString()}`, 20, 130);
  
  doc.save(`chai-fi-monthly-summary-${summary.month}.pdf`);
};

export const generateMenuSalesPDF = async (menuSales: Array<{name: string, count: number}>, selectedDate?: Date) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFillColor(255, 102, 51);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text('Chai-Fi', 20, 25);
  doc.setFontSize(12);
  doc.text('Menu Sales Report', 20, 32);
  
  doc.setTextColor(0, 0, 0);
  
  // Report Details
  const reportDate = selectedDate ? selectedDate.toLocaleDateString() : new Date().toLocaleDateString();
  const reportTitle = selectedDate ? `Menu Sales - ${reportDate}` : `Today's Menu Sales - ${reportDate}`;
  doc.setFontSize(16);
  doc.text(reportTitle, 20, 60);
  
  // Calculate totals
  const totalItems = menuSales.reduce((sum, item) => sum + item.count, 0);
  const uniqueItems = menuSales.length;
  
  doc.setFontSize(12);
  doc.text(`Total Items Sold: ${totalItems}`, 20, 80);
  doc.text(`Unique Menu Items: ${uniqueItems}`, 20, 90);
  
  // Table Header
  doc.setFontSize(14);
  doc.text('Menu Item Sales Breakdown', 20, 110);
  
  // Table
  doc.setFontSize(10);
  doc.text('Item Name', 20, 125);
  doc.text('Quantity Sold', 120, 125);
  doc.text('% of Total', 160, 125);
  
  // Draw line under header
  doc.line(20, 128, 190, 128);
  
  let yPos = 135;
  menuSales.forEach((item, index) => {
    if (yPos > 270) { // Start new page if needed
      doc.addPage();
      yPos = 20;
    }
    
    const percentage = totalItems > 0 ? ((item.count / totalItems) * 100).toFixed(1) : '0.0';
    
    doc.text(item.name.length > 25 ? item.name.substring(0, 25) + '...' : item.name, 20, yPos);
    doc.text(item.count.toString(), 120, yPos);
    doc.text(`${percentage}%`, 160, yPos);
    
    yPos += 7;
  });
  
  // Footer
  yPos += 20;
  if (yPos > 270) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(10);
  doc.text('Generated by Chai-Fi Analytics', 20, yPos);
  doc.text(`Report generated on: ${new Date().toLocaleString()}`, 20, yPos + 7);
  
  const fileDate = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  const filename = `chai-fi-menu-sales-${fileDate}.pdf`;
  doc.save(filename);
};
