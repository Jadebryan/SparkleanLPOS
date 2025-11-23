// Export utilities for React Native Web
import { Platform } from 'react-native';

// Helper function to download files (works in React Native Web)
const downloadFile = (content: string, filename: string, mimeType: string) => {
  try {
    // For React Native Web, we can use the browser's Blob API
    if (typeof window !== 'undefined' && window.Blob) {
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } else {
      // Fallback for non-browser environments
      console.warn('File download not supported in this environment');
      console.log(`File content would be saved as ${filename}`);
    }
  } catch (error) {
    console.error('Download error:', error);
    throw new Error('Failed to download file');
  }
};

// Get export filename with timestamp
export const getExportFilename = (prefix: string = 'orders') => {
  const now = new Date();
  const timestamp = now.toISOString().split('T')[0]; // YYYY-MM-DD format
  return `${prefix}_${timestamp}`;
};

// Order type definition for export
export interface OrderForExport {
  orderId?: string;
  id?: string;
  _id?: string;
  date?: string;
  createDate?: string;
  customer?: string;
  customerName?: string;
  payment?: string;
  total?: string;
  totalFee?: number;
  paid?: number | string;
  balance?: string;
  change?: number | string;
  items?: Array<{
    service: string;
    quantity: string;
    status?: string;
    amount?: number;
  }>;
  notes?: string;
  stationId?: string;
}

// CSV Export Functions
export const exportToCSV = (orders: OrderForExport[], filename: string = 'orders') => {
  const headers = [
    'Order ID',
    'Date',
    'Customer',
    'Payment Status',
    'Total Amount',
    'Paid Amount',
    'Balance',
    'Change',
    'Services',
    'Item Status',
    'Station',
    'Notes'
  ];

  const csvContent = [
    headers.join(','),
    ...orders.map(order => {
      const orderId = order.orderId || order.id || order._id || 'N/A';
      const date = order.date || order.createDate || 'N/A';
      const customer = order.customer || order.customerName || 'N/A';
      const payment = order.payment || 'Unpaid';
      const total = order.total || (order.totalFee ? `₱${order.totalFee.toFixed(2)}` : '₱0.00');
      const paidAmount = typeof order.paid === 'number' ? `₱${order.paid.toFixed(2)}` : (order.paid || '₱0.00');
      const balance = order.balance || '₱0.00';
      const change = typeof order.change === 'number' ? `₱${order.change.toFixed(2)}` : (order.change || '₱0.00');
      const services = (order.items || []).map(item => `${item.service} (${item.quantity})`).join('; ');
      const itemStatuses = (order.items || []).map(item => item.status || 'Pending').join('; ');
      const station = order.stationId || 'N/A';
      const notes = order.notes || '';
      
      return [
        `"${orderId}"`,
        `"${date}"`,
        `"${customer}"`,
        `"${payment}"`,
        `"${total}"`,
        `"${paidAmount}"`,
        `"${balance}"`,
        `"${change}"`,
        `"${services}"`,
        `"${itemStatuses}"`,
        `"${station}"`,
        `"${notes}"`
      ].join(',');
    })
  ].join('\n');

  downloadFile(csvContent, `${filename}.csv`, 'text/csv');
};

// Excel Export Functions (using HTML table approach)
export const exportToExcel = (orders: OrderForExport[], filename: string = 'orders') => {
  const headers = [
    'Order ID',
    'Date',
    'Customer',
    'Payment Status',
    'Total Amount',
    'Paid Amount',
    'Balance',
    'Change',
    'Services',
    'Item Status',
    'Station',
    'Notes'
  ];

  // Create HTML table for Excel
  const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:x="urn:schemas-microsoft-com:office:excel" 
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <meta name="ExcelCreated" content="true">
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .amount { text-align: right; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            ${headers.map(header => `<th>${header}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${orders.map(order => {
            const orderId = order.orderId || order.id || order._id || 'N/A';
            const date = order.date || order.createDate || 'N/A';
            const customer = order.customer || order.customerName || 'N/A';
            const payment = order.payment || 'Unpaid';
            const total = order.total || (order.totalFee ? `₱${order.totalFee.toFixed(2)}` : '₱0.00');
            const paidAmount = typeof order.paid === 'number' ? `₱${order.paid.toFixed(2)}` : (order.paid || '₱0.00');
            const balance = order.balance || '₱0.00';
            const change = typeof order.change === 'number' ? `₱${order.change.toFixed(2)}` : (order.change || '₱0.00');
            const services = (order.items || []).map(item => `${item.service} (${item.quantity})`).join('; ');
            const itemStatuses = (order.items || []).map(item => item.status || 'Pending').join('; ');
            const station = order.stationId || 'N/A';
            const notes = (order.notes || '').replace(/"/g, '&quot;');
            
            return `
              <tr>
                <td>${orderId}</td>
                <td>${date}</td>
                <td>${customer}</td>
                <td>${payment}</td>
                <td class="amount">${total}</td>
                <td class="amount">${paidAmount}</td>
                <td class="amount">${balance}</td>
                <td class="amount">${change}</td>
                <td>${services}</td>
                <td>${itemStatuses}</td>
                <td>${station}</td>
                <td>${notes}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  downloadFile(htmlContent, `${filename}.xls`, 'application/vnd.ms-excel');
};

// JSON Export Functions
export const exportToJSON = (data: any, filename: string = 'export') => {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, `${filename}.json`, 'application/json');
};

// Helper function to calculate totals for amount columns
const calculateTotals = (data: any[], headers: string[]): any => {
  const totals: any = {};
  const currencyKeywords = ['revenue', 'expenses', 'profit', 'spent', 'cashflow', 'balance', 'amount', 'price', 'cost', 'total revenue', 'total spent', 'paid amount', 'change', 'total'];
  const countKeywords = ['orders', 'count', 'quantity', 'items'];
  
  headers.forEach(header => {
    const headerLower = header.toLowerCase();
    
    // Check if it's a currency column - "Total" by itself should be treated as currency
    const isCurrencyColumn = currencyKeywords.some(keyword => headerLower.includes(keyword)) || headerLower === 'total';
    
    // Check if it's a count column (but not if it's also a currency column)
    const isCountColumn = !isCurrencyColumn && countKeywords.some(keyword => headerLower.includes(keyword));
    
    // Special handling for "total" columns - if header is "Total" or contains "total" with currency keywords
    const hasTotal = headerLower.includes('total');
    const isTotalCurrency = hasTotal && (currencyKeywords.some(keyword => headerLower.includes(keyword)) || headerLower === 'total');
    const isTotalCount = hasTotal && !isTotalCurrency && countKeywords.some(keyword => headerLower.includes(keyword));
    
    // Special handling for "paid orders", "unpaid orders", "partial orders" - these are counts
    const isOrderCount = headerLower.includes('orders') && (headerLower.includes('paid') || headerLower.includes('unpaid') || headerLower.includes('partial'));
    
    if (isCurrencyColumn || isTotalCurrency) {
      // Currency column
      let total = 0;
      data.forEach(row => {
        let value = row[header as keyof typeof row];
        if (value === undefined || value === null || value === '') {
          const rowKeys = Object.keys(row);
          const matchingKey = rowKeys.find(key => key.toLowerCase() === headerLower);
          if (matchingKey) {
            value = row[matchingKey as keyof typeof row];
          }
        }
        const valueStr = String(value || '');
        // Extract numeric value from strings like "PHP 100.00" or "₱100.00" or just numbers
        const numStr = valueStr.replace(/[^0-9.-]/g, '');
        const numValue = parseFloat(numStr) || 0;
        total += numValue;
      });
      // Always add totals if there's data, even if total is 0
      if (data.length > 0) {
        totals[header] = { value: total, type: 'currency' };
      }
    } else if (isCountColumn || isTotalCount || isOrderCount) {
      // Count column
      let total = 0;
      data.forEach(row => {
        let value = row[header as keyof typeof row];
        if (value === undefined || value === null || value === '') {
          const rowKeys = Object.keys(row);
          const matchingKey = rowKeys.find(key => key.toLowerCase() === headerLower);
          if (matchingKey) {
            value = row[matchingKey as keyof typeof row];
          }
        }
        const valueStr = String(value || '');
        const numStr = valueStr.replace(/[^0-9.-]/g, '');
        const numValue = parseFloat(numStr) || 0;
        total += Math.round(numValue); // Round to ensure integer counts
      });
      // Always add totals if there's data, even if total is 0
      if (data.length > 0) {
        totals[header] = { value: total, type: 'count' };
      }
    }
  });
  
  return totals;
};

// PDF Export Functions - Creates actual PDF using jsPDF
export const exportToPDF = async (orders: OrderForExport[], filename: string = 'orders') => {
  // Calculate summary for orders
  const summary = {
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, order) => {
      const totalStr = order.total || (order.totalFee ? `₱${order.totalFee.toFixed(2)}` : '₱0');
      const numStr = totalStr.replace(/[₱,]/g, '');
      return sum + (parseFloat(numStr) || 0);
    }, 0).toFixed(2),
    paidOrders: orders.filter(o => o.payment === 'Paid').length,
    unpaidOrders: orders.filter(o => o.payment === 'Unpaid').length,
    partialOrders: orders.filter(o => o.payment === 'Partial').length
  };
  
  // Transform orders data for PDF
  const orderData = orders.map((order: any) => ({
    'Order ID': order.orderId || order.id || order._id || 'N/A',
    'Date': order.date || order.createDate || 'N/A',
    'Customer': order.customer || order.customerName || 'N/A',
    'Payment': order.payment || 'Unpaid',
    'Total': typeof order.total === 'string' && order.total.includes('₱')
      ? order.total.replace('₱', 'PHP ')
      : `PHP ${(parseFloat(String(order.total || order.totalFee || 0).replace(/[₱,]/g, '')) || 0).toFixed(2)}`,
    'Paid Amount': typeof order.paid === 'number' 
      ? `PHP ${order.paid.toFixed(2)}` 
      : (typeof order.paid === 'string' && order.paid.includes('₱')
          ? order.paid.replace('₱', 'PHP ')
          : 'PHP 0.00'),
    'Balance': typeof order.balance === 'string' && order.balance.includes('₱')
      ? order.balance.replace('₱', 'PHP ')
      : `PHP ${(parseFloat(String(order.balance || '0').replace(/[₱,]/g, '')) || 0).toFixed(2)}`,
    'Change': typeof order.change === 'number' 
      ? `PHP ${order.change.toFixed(2)}` 
      : (typeof order.change === 'string' && order.change.includes('₱')
          ? order.change.replace('₱', 'PHP ')
          : 'PHP 0.00'),
    'Services': (order.items || []).map((item: any) => `${item.service} (${item.quantity})`).join('; ') || '',
    'Status': (order.items || []).map((item: any) => item.status || 'Pending').join('; ') || '',
    'Station': order.stationId || 'N/A',
    'Notes': order.notes || ''
  }));

  // Generate tracking ID (once for the document)
  const trackingId = `SPKLN-${Date.now().toString(36).toUpperCase()}`;

  // Try to use jsPDF if available (for web only)
  try {
    // Only import jsPDF on web platform to avoid native bundling issues
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Dynamic import of jsPDF - only on web
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const maxWidth = pageWidth - (margin * 2);
      const headerHeight = 30;
      const footerHeight = 20;
      const contentTop = headerHeight + 10;
      const contentBottom = pageHeight - footerHeight;
      
      let yPos = contentTop;
      
      // Helper to add new page if needed
      const checkPageBreak = (requiredHeight: number) => {
        if (yPos + requiredHeight > contentBottom) {
          doc.addPage();
          yPos = contentTop;
        }
      };
      
      // Draw header on first page
      doc.setFillColor(37, 99, 235); // Blue background
      doc.rect(0, 0, pageWidth, headerHeight, 'F');
      doc.setTextColor(255, 255, 255); // White text
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('ORDERS REPORT', margin, 18);
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      const dateText = new Date().toLocaleDateString();
      const dateWidth = doc.getTextWidth(dateText);
      doc.text(dateText, pageWidth - margin - dateWidth, 18);
      doc.setTextColor(0, 0, 0); // Reset to black
      
      // Title
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('REPORT DETAILS', margin, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, yPos);
      yPos += 7;
      
      // Add tracking ID in report details
      doc.setFontSize(9);
      doc.setFont(undefined, 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text(`Tracking: ${trackingId}`, margin, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      
      // Summary section
      if (summary && Object.keys(summary).length > 0) {
        checkPageBreak(25);
        doc.setFillColor(245, 247, 250);
        doc.roundedRect(margin, yPos - 5, maxWidth, 0, 3, 3, 'F');
        
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('SUMMARY', margin, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        Object.entries(summary).forEach(([key, value]) => {
          checkPageBreak(8);
          const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
          const text = `${formattedKey}: ${value}`;
          doc.setFontSize(9);
          doc.text('•', margin + 2, yPos);
          doc.text(text, margin + 8, yPos);
          yPos += 7;
        });
        yPos += 8;
      }
      
      // Data section
      if (orderData && orderData.length > 0) {
        checkPageBreak(25);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`DATA (${orderData.length} record${orderData.length === 1 ? '' : 's'})`, margin, yPos);
        yPos += 10;
        
        // Get headers
        const headers = Object.keys(orderData[0]);
        const maxColumns = Math.min(headers.length, 5);
        const displayHeaders = headers.slice(0, maxColumns);
        
        // Distribute columns evenly with minimal padding
        const columnPadding = 1.5; // Minimal padding between columns
        const totalPadding = columnPadding * (displayHeaders.length - 1);
        const availableWidth = maxWidth - totalPadding;
        const colWidth = availableWidth / displayHeaders.length;
        const normalizedWidths = displayHeaders.map(() => colWidth);
        
        // Determine column alignment based on header/content type (before drawing headers)
        const columnAlignments: ('left' | 'right')[] = displayHeaders.map(header => {
          const headerLower = header.toLowerCase();
          // Right-align currency and numeric columns
          const isCurrency = headerLower.includes('revenue') || headerLower.includes('expenses') || 
                            headerLower.includes('profit') || headerLower.includes('amount') || 
                            headerLower.includes('price') || headerLower.includes('cost') ||
                            headerLower.includes('total revenue') || headerLower.includes('total spent') ||
                            headerLower.includes('balance') || headerLower.includes('paid') ||
                            headerLower.includes('cashflow') || headerLower.includes('change') ||
                            headerLower.includes('net cashflow') ||
                            (headerLower.includes('total') && (headerLower.includes('revenue') || headerLower.includes('spent') || headerLower.includes('amount')))
          const isNumeric = headerLower.includes('orders') || headerLower.includes('count') || 
                           headerLower.includes('quantity') || headerLower.includes('items')
          return (isCurrency || isNumeric) ? 'right' : 'left';
        });
        
        // Table header background
        doc.setFillColor(240, 242, 245);
        doc.roundedRect(margin, yPos - 5, maxWidth, 8, 2, 2, 'F');
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        let xPos = margin + 2;
        displayHeaders.forEach((header, index) => {
          const colWidth = normalizedWidths[index];
          const alignment = columnAlignments[index];
          let headerText = header;
          const maxHeaderWidth = colWidth - 4; // Leave 2mm padding on each side
          
          // Truncate header if too long
          if (doc.getTextWidth(headerText) > maxHeaderWidth) {
            while (doc.getTextWidth(headerText + '...') > maxHeaderWidth && headerText.length > 0) {
              headerText = headerText.substring(0, headerText.length - 1);
            }
            headerText = headerText + '...';
          }
          
          // Apply same alignment as data columns
          if (alignment === 'right') {
            const textWidth = doc.getTextWidth(headerText);
            doc.text(headerText, xPos + colWidth - textWidth - 2, yPos);
          } else {
          doc.text(headerText, xPos, yPos);
          }
          xPos += colWidth + columnPadding;
        });
        yPos += 8;
        
        // Draw horizontal line
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
        
        // Draw data rows
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        orderData.forEach((row, rowIndex) => {
          checkPageBreak(10);
          
          if (rowIndex % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(margin, yPos - 5, maxWidth, 7, 'F');
          }
          
          xPos = margin + 2;
          displayHeaders.forEach((header, index) => {
            const colWidth = normalizedWidths[index];
            const alignment = columnAlignments[index];
            let value = String(row[header as keyof typeof row] || '');
            const maxValueWidth = colWidth - 4; // Leave 2mm padding on each side
            
            // Truncate value if it exceeds column width
            if (doc.getTextWidth(value) > maxValueWidth) {
              let truncated = value;
              while (doc.getTextWidth(truncated + '...') > maxValueWidth && truncated.length > 0) {
                truncated = truncated.substring(0, truncated.length - 1);
              }
              value = truncated + '...';
            }
            
            // Apply alignment
            if (alignment === 'right') {
              const textWidth = doc.getTextWidth(value);
              doc.text(value, xPos + colWidth - textWidth - 2, yPos);
            } else {
            doc.text(value, xPos, yPos);
            }
            xPos += colWidth + columnPadding;
          });
          yPos += 7;
        });
        
        // Calculate totals for amount columns (use all headers, not just displayed ones)
        const totals = calculateTotals(orderData, headers);
        const hasTotals = Object.keys(totals).length > 0;
        
        // Add total row directly below the table
        if (hasTotals) {
          checkPageBreak(10);
          yPos += 2;
          
          // Draw separator line above total row
          doc.setDrawColor(150, 150, 150);
          doc.setLineWidth(0.8);
          doc.line(margin, yPos, pageWidth - margin, yPos);
          yPos += 5;
          
          // Total row background (highlighted)
          doc.setFillColor(240, 248, 255);
          doc.rect(margin, yPos - 5, maxWidth, 8, 'F');
          
          // Draw total row - use same alignment as data rows
          xPos = margin + 2;
          displayHeaders.forEach((header, index) => {
            const colWidth = normalizedWidths[index];
            const alignment = columnAlignments[index];
            
            if (totals[header] !== undefined) {
              const totalInfo = totals[header];
              let totalText: string;
              
              // Format based on type
              if (totalInfo.type === 'currency') {
                totalText = `PHP ${totalInfo.value.toFixed(2)}`;
              } else if (totalInfo.type === 'count') {
                totalText = totalInfo.value.toString();
              } else {
                // Backward compatibility
                totalText = `PHP ${totalInfo.value.toFixed(2)}`;
              }
              
              doc.setFontSize(9);
              doc.setFont(undefined, 'bold');
              doc.setTextColor(0, 0, 0);
              
              // Apply same alignment as data rows
              if (alignment === 'right') {
              const textWidth = doc.getTextWidth(totalText);
              doc.text(totalText, xPos + colWidth - textWidth - 2, yPos);
              } else {
                doc.text(totalText, xPos, yPos);
              }
            } else if (header === displayHeaders[0]) {
              // First column shows "TOTAL" label (always left-aligned)
              doc.setFontSize(9);
              doc.setFont(undefined, 'bold');
              doc.setTextColor(0, 0, 0);
              doc.text('TOTAL', xPos, yPos);
            }
            xPos += colWidth + columnPadding;
          });
          yPos += 8;
          
          // Draw bottom border for total row
          doc.setDrawColor(150, 150, 150);
          doc.setLineWidth(0.8);
          doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
        }
        
        // Note about columns if truncated
        if (headers.length > maxColumns) {
          checkPageBreak(8);
          yPos += 3;
          doc.setFontSize(8);
          doc.setFont(undefined, 'italic');
          doc.setTextColor(150, 150, 150);
          doc.text(`Note: Showing ${maxColumns} of ${headers.length} columns. Export to Excel/CSV for full data.`, margin, yPos);
          doc.setTextColor(0, 0, 0);
        }
      } else {
        checkPageBreak(10);
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('No data available.', margin, yPos);
        doc.setTextColor(0, 0, 0);
      }
      
      // Draw footer on all pages
      const totalPages = doc.internal.pages.length - 1;
      
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        // Footer line
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(margin, pageHeight - footerHeight + 5, pageWidth - margin, pageHeight - footerHeight + 5);
        
        // Footer text - prevent overlapping by spacing properly
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        
        // Page number (centered)
        const pageText = `Page ${i} of ${totalPages}`;
        const pageTextWidth = doc.getTextWidth(pageText);
        const pageTextCenter = (pageWidth - pageTextWidth) / 2;
        doc.text(pageText, pageTextCenter, pageHeight - 10);
        
        // Tracking ID (left side) - ensure it doesn't overlap with page number
        doc.setFontSize(8);
        doc.setFont(undefined, 'italic');
        const trackingText = `Tracking: ${trackingId}`;
        const trackingWidth = doc.getTextWidth(trackingText);
        // Only show tracking if there's enough space (at least 10mm gap from page number)
        if (trackingWidth + margin + 10 < pageTextCenter) {
          doc.text(trackingText, margin, pageHeight - 10);
        }
        
        // Timestamp (right side) - ensure it doesn't overlap with page number
        const timestamp = new Date().toLocaleString();
        const timestampWidth = doc.getTextWidth(timestamp);
        const pageTextRight = pageTextCenter + pageTextWidth;
        // Only show timestamp if there's enough space (at least 10mm gap from page number)
        if (pageWidth - margin - timestampWidth > pageTextRight + 10) {
          doc.text(timestamp, pageWidth - margin - timestampWidth, pageHeight - 10);
        }
        
        doc.setTextColor(0, 0, 0);
      }
      
      // Save the PDF
      doc.save(`${filename}.pdf`);
    } else if (Platform.OS !== 'web') {
      // Fallback to text file for non-web environments (iOS/Android)
      console.warn('PDF export is only available on web. Falling back to text format.');
      let content = `ORDERS REPORT\n`;
      content += `${'='.repeat(50)}\n`;
      content += `Generated on: ${new Date().toLocaleDateString()}\n`;
      content += `${'='.repeat(50)}\n\n`;
      
      if (summary && Object.keys(summary).length > 0) {
        content += `SUMMARY:\n`;
        content += `${'-'.repeat(50)}\n`;
        content += `Total Orders: ${summary.totalOrders}\n`;
        content += `Total Revenue: ₱${summary.totalRevenue}\n`;
        content += `Paid Orders: ${summary.paidOrders}\n`;
        content += `Unpaid Orders: ${summary.unpaidOrders}\n`;
        content += `Partial Orders: ${summary.partialOrders}\n`;
        content += `\n${'='.repeat(50)}\n\n`;
      }
      
      if (orderData && orderData.length > 0) {
        content += `DATA (${orderData.length} record${orderData.length === 1 ? '' : 's'}):\n`;
        content += `${'-'.repeat(50)}\n\n`;
        orderData.forEach((row, index) => {
          content += `Record ${index + 1}:\n`;
          Object.entries(row).forEach(([key, value]) => {
            content += `  ${key}: ${value}\n`;
          });
          content += `${'-'.repeat(50)}\n`;
        });
      } else {
        content += `No data available.\n`;
      }
      
      downloadFile(content, `${filename}.txt`, 'text/plain');
    }
  } catch (error) {
    console.error('PDF generation error:', error);
    // Fallback to text file if PDF generation fails
    let content = `ORDERS REPORT\n`;
    content += `${'='.repeat(50)}\n`;
    content += `Generated on: ${new Date().toLocaleDateString()}\n`;
    content += `${'='.repeat(50)}\n\n`;
    
    if (summary && Object.keys(summary).length > 0) {
      content += `SUMMARY:\n`;
      content += `${'-'.repeat(50)}\n`;
      content += `Total Orders: ${summary.totalOrders}\n`;
      content += `Total Revenue: ₱${summary.totalRevenue}\n`;
      content += `Paid Orders: ${summary.paidOrders}\n`;
      content += `Unpaid Orders: ${summary.unpaidOrders}\n`;
      content += `Partial Orders: ${summary.partialOrders}\n`;
      content += `\n${'='.repeat(50)}\n\n`;
    }
    
    if (orderData && orderData.length > 0) {
      content += `DATA (${orderData.length} record${orderData.length === 1 ? '' : 's'}):\n`;
      content += `${'-'.repeat(50)}\n\n`;
      orderData.forEach((row, index) => {
        content += `Record ${index + 1}:\n`;
        Object.entries(row).forEach(([key, value]) => {
          content += `  ${key}: ${value}\n`;
        });
        content += `${'-'.repeat(50)}\n`;
      });
    } else {
      content += `No data available.\n`;
    }
    
    downloadFile(content, `${filename}.txt`, 'text/plain');
    throw new Error('PDF generation failed. Text file created instead.');
  }
};

// Customer type definition for export
export interface CustomerForExport {
  _id?: string;
  id?: string;
  customerName?: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  phone?: string;
  totalOrders?: number;
  totalSpent?: number;
  lastOrder?: string;
}

// Customer Export Functions
export const exportCustomersToCSV = (customers: CustomerForExport[], filename: string = 'customers') => {
  const headers = [
    'Customer ID',
    'Name',
    'Email',
    'Phone',
    'Total Orders',
    'Total Spent (₱)',
    'Last Order Date',
    'Average Order Value (₱)'
  ];

  const csvContent = [
    headers.join(','),
    ...customers.map(customer => {
      const customerId = customer._id || customer.id || 'N/A';
      const name = customer.customerName || customer.name || 'N/A';
      const email = customer.email || 'N/A';
      const phone = customer.phoneNumber || customer.phone || 'N/A';
      const totalOrders = customer.totalOrders || 0;
      const totalSpent = customer.totalSpent || 0;
      const lastOrder = customer.lastOrder || 'No orders yet';
      const avgOrderValue = totalOrders > 0 ? (totalSpent / totalOrders).toFixed(2) : '0.00';
      
      return [
        `"${customerId}"`,
        `"${name}"`,
        `"${email}"`,
        `"${phone}"`,
        `"${totalOrders}"`,
        `"${totalSpent.toLocaleString()}"`,
        `"${lastOrder}"`,
        `"${avgOrderValue}"`
      ].join(',');
    })
  ].join('\n');

  downloadFile(csvContent, `${filename}.csv`, 'text/csv');
};

export const exportCustomersToExcel = (customers: CustomerForExport[], filename: string = 'customers') => {
  const headers = [
    'Customer ID',
    'Name',
    'Email',
    'Phone',
    'Total Orders',
    'Total Spent (₱)',
    'Last Order Date',
    'Average Order Value (₱)'
  ];

  // Create HTML table for Excel
  const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:x="urn:schemas-microsoft-com:office:excel" 
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <meta name="ExcelCreated" content="true">
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .number { text-align: right; }
        .currency { text-align: right; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            ${headers.map(header => `<th>${header}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${customers.map(customer => {
            const customerId = customer._id || customer.id || 'N/A';
            const name = customer.customerName || customer.name || 'N/A';
            const email = customer.email || 'N/A';
            const phone = customer.phoneNumber || customer.phone || 'N/A';
            const totalOrders = customer.totalOrders || 0;
            const totalSpent = customer.totalSpent || 0;
            const lastOrder = customer.lastOrder || 'No orders yet';
            const avgOrderValue = totalOrders > 0 ? (totalSpent / totalOrders).toFixed(2) : '0.00';
            
            return `
              <tr>
                <td>${customerId}</td>
                <td>${name}</td>
                <td>${email}</td>
                <td>${phone}</td>
                <td class="number">${totalOrders}</td>
                <td class="currency">₱${totalSpent.toLocaleString()}</td>
                <td>${lastOrder}</td>
                <td class="currency">₱${avgOrderValue}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  downloadFile(htmlContent, `${filename}.xls`, 'application/vnd.ms-excel');
};

export const exportCustomersToJSON = (customers: CustomerForExport[], filename: string = 'customers') => {
  const jsonContent = JSON.stringify(customers, null, 2);
  downloadFile(jsonContent, `${filename}.json`, 'application/json');
};

// Customer PDF Export - Creates actual PDF using jsPDF
export const exportCustomersToPDF = async (customers: CustomerForExport[], filename: string = 'customers') => {
  // Calculate summary for customers
  const summary = {
    totalCustomers: customers.length,
    totalRevenue: customers.reduce((sum, customer) => sum + (customer.totalSpent || 0), 0).toFixed(2),
    totalOrders: customers.reduce((sum, customer) => sum + (customer.totalOrders || 0), 0),
    avgOrderValue: (() => {
      const totalOrders = customers.reduce((sum, customer) => sum + (customer.totalOrders || 0), 0);
      const totalRevenue = customers.reduce((sum, customer) => sum + (customer.totalSpent || 0), 0);
      return totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00';
    })()
  };
  
  // Transform customers data for PDF
  const customerData = customers.map((customer: any) => ({
    'Customer ID': customer._id || customer.id || 'N/A',
    'Name': customer.customerName || customer.name || 'N/A',
    'Email': customer.email || 'N/A',
    'Phone': customer.phoneNumber || customer.phone || 'N/A',
    'Total Orders': customer.totalOrders || 0,
    'Total Spent': `PHP ${(customer.totalSpent || 0).toFixed(2)}`,
    'Last Order': customer.lastOrder || 'No orders yet',
    'Avg Order Value': customer.totalOrders > 0 
      ? `PHP ${((customer.totalSpent || 0) / customer.totalOrders).toFixed(2)}` 
      : 'PHP 0.00'
  }));

  // Try to use jsPDF if available (for web only)
  try {
    // Only import jsPDF on web platform to avoid native bundling issues
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Dynamic import of jsPDF - only on web
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const maxWidth = pageWidth - (margin * 2);
      const headerHeight = 30;
      const footerHeight = 20;
      const contentTop = headerHeight + 10;
      const contentBottom = pageHeight - footerHeight;
      
      let yPos = contentTop;
      
      // Helper to add new page if needed
      const checkPageBreak = (requiredHeight: number) => {
        if (yPos + requiredHeight > contentBottom) {
          doc.addPage();
          yPos = contentTop;
        }
      };
      
      // Draw header on first page
      doc.setFillColor(37, 99, 235); // Blue background
      doc.rect(0, 0, pageWidth, headerHeight, 'F');
      doc.setTextColor(255, 255, 255); // White text
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('CUSTOMERS REPORT', margin, 18);
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      const dateText = new Date().toLocaleDateString();
      const dateWidth = doc.getTextWidth(dateText);
      doc.text(dateText, pageWidth - margin - dateWidth, 18);
      doc.setTextColor(0, 0, 0); // Reset to black
      
      // Title
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('REPORT DETAILS', margin, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, yPos);
      yPos += 7;
      
      // Generate tracking ID (once for the document)
      const customerTrackingId = `SPKLN-${Date.now().toString(36).toUpperCase()}`;
      
      // Add tracking ID in report details
      doc.setFontSize(9);
      doc.setFont(undefined, 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text(`Tracking: ${customerTrackingId}`, margin, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      
      // Summary section
      if (summary && Object.keys(summary).length > 0) {
        checkPageBreak(25);
        doc.setFillColor(245, 247, 250);
        doc.roundedRect(margin, yPos - 5, maxWidth, 0, 3, 3, 'F');
        
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('SUMMARY', margin, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        Object.entries(summary).forEach(([key, value]) => {
          checkPageBreak(8);
          const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
          const text = `${formattedKey}: ${value}`;
          doc.setFontSize(9);
          doc.text('•', margin + 2, yPos);
          doc.text(text, margin + 8, yPos);
          yPos += 7;
        });
        yPos += 8;
      }
      
      // Data section
      if (customerData && customerData.length > 0) {
        checkPageBreak(25);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`DATA (${customerData.length} record${customerData.length === 1 ? '' : 's'})`, margin, yPos);
        yPos += 10;
        
        // Get headers
        const headers = Object.keys(customerData[0]);
        const maxColumns = Math.min(headers.length, 5);
        const displayHeaders = headers.slice(0, maxColumns);
        
        // Distribute columns evenly with minimal padding
        const columnPadding = 1.5; // Minimal padding between columns
        const totalPadding = columnPadding * (displayHeaders.length - 1);
        const availableWidth = maxWidth - totalPadding;
        const colWidth = availableWidth / displayHeaders.length;
        const normalizedWidths = displayHeaders.map(() => colWidth);
        
        // Determine column alignment based on header/content type (before drawing headers)
        const columnAlignments: ('left' | 'right')[] = displayHeaders.map(header => {
          const headerLower = header.toLowerCase();
          // Right-align currency and numeric columns
          const isCurrency = headerLower.includes('revenue') || headerLower.includes('expenses') || 
                            headerLower.includes('profit') || headerLower.includes('amount') || 
                            headerLower.includes('price') || headerLower.includes('cost') ||
                            headerLower.includes('total revenue') || headerLower.includes('total spent') ||
                            headerLower.includes('balance') || headerLower.includes('paid') ||
                            headerLower.includes('cashflow') || headerLower.includes('spent') ||
                            headerLower.includes('net cashflow') ||
                            (headerLower.includes('total') && (headerLower.includes('revenue') || headerLower.includes('spent') || headerLower.includes('amount')))
          const isNumeric = headerLower.includes('orders') || headerLower.includes('count') || 
                           headerLower.includes('quantity') || headerLower.includes('items')
          return (isCurrency || isNumeric) ? 'right' : 'left';
        });
        
        // Table header background
        doc.setFillColor(240, 242, 245);
        doc.roundedRect(margin, yPos - 5, maxWidth, 8, 2, 2, 'F');
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        let xPos = margin + 2;
        displayHeaders.forEach((header, index) => {
          const colWidth = normalizedWidths[index];
          const alignment = columnAlignments[index];
          let headerText = header;
          const maxHeaderWidth = colWidth - 4; // Leave 2mm padding on each side
          
          // Truncate header if too long
          if (doc.getTextWidth(headerText) > maxHeaderWidth) {
            while (doc.getTextWidth(headerText + '...') > maxHeaderWidth && headerText.length > 0) {
              headerText = headerText.substring(0, headerText.length - 1);
            }
            headerText = headerText + '...';
          }
          
          // Apply same alignment as data columns
          if (alignment === 'right') {
            const textWidth = doc.getTextWidth(headerText);
            doc.text(headerText, xPos + colWidth - textWidth - 2, yPos);
          } else {
          doc.text(headerText, xPos, yPos);
          }
          xPos += colWidth + columnPadding;
        });
        yPos += 8;
        
        // Draw horizontal line
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
        
        // Draw data rows
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        customerData.forEach((row, rowIndex) => {
          checkPageBreak(10);
          
          if (rowIndex % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(margin, yPos - 5, maxWidth, 7, 'F');
          }
          
          xPos = margin + 2;
          displayHeaders.forEach((header, index) => {
            const colWidth = normalizedWidths[index];
            const alignment = columnAlignments[index];
            let value = String(row[header as keyof typeof row] || '');
            const maxValueWidth = colWidth - 4; // Leave 2mm padding on each side
            
            // Truncate value if it exceeds column width
            if (doc.getTextWidth(value) > maxValueWidth) {
              let truncated = value;
              while (doc.getTextWidth(truncated + '...') > maxValueWidth && truncated.length > 0) {
                truncated = truncated.substring(0, truncated.length - 1);
              }
              value = truncated + '...';
            }
            
            // Apply alignment
            if (alignment === 'right') {
              const textWidth = doc.getTextWidth(value);
              doc.text(value, xPos + colWidth - textWidth - 2, yPos);
            } else {
            doc.text(value, xPos, yPos);
            }
            xPos += colWidth + columnPadding;
          });
          yPos += 7;
        });
        
        // Calculate totals for amount columns
        const customerTotals = calculateTotals(customerData, headers);
        const hasCustomerTotals = Object.keys(customerTotals).length > 0;
        
        // Add total row directly below the table
        if (hasCustomerTotals) {
          checkPageBreak(10);
          yPos += 2;
          
          // Draw separator line above total row
          doc.setDrawColor(150, 150, 150);
          doc.setLineWidth(0.8);
          doc.line(margin, yPos, pageWidth - margin, yPos);
          yPos += 5;
          
          // Total row background (highlighted)
          doc.setFillColor(240, 248, 255);
          doc.rect(margin, yPos - 5, maxWidth, 8, 'F');
          
          // Draw total row - use same alignment as data rows
          xPos = margin + 2;
          displayHeaders.forEach((header, index) => {
            const colWidth = normalizedWidths[index];
            const alignment = columnAlignments[index];
            
            if (customerTotals[header] !== undefined) {
              const totalInfo = customerTotals[header];
              let totalText: string;
              
              // Format based on type
              if (totalInfo.type === 'currency') {
                totalText = `PHP ${totalInfo.value.toFixed(2)}`;
              } else if (totalInfo.type === 'count') {
                totalText = totalInfo.value.toString();
              } else {
                // Backward compatibility
                totalText = `PHP ${totalInfo.value.toFixed(2)}`;
              }
              
              doc.setFontSize(9);
              doc.setFont(undefined, 'bold');
              doc.setTextColor(0, 0, 0);
              
              // Apply same alignment as data rows
              if (alignment === 'right') {
              const textWidth = doc.getTextWidth(totalText);
              doc.text(totalText, xPos + colWidth - textWidth - 2, yPos);
              } else {
                doc.text(totalText, xPos, yPos);
              }
            } else if (header === displayHeaders[0]) {
              // First column shows "TOTAL" label (always left-aligned)
              doc.setFontSize(9);
              doc.setFont(undefined, 'bold');
              doc.setTextColor(0, 0, 0);
              doc.text('TOTAL', xPos, yPos);
            }
            xPos += colWidth + columnPadding;
          });
          yPos += 8;
          
          // Draw bottom border for total row
          doc.setDrawColor(150, 150, 150);
          doc.setLineWidth(0.8);
          doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
        }
        
        // Note about columns if truncated
        if (headers.length > maxColumns) {
          checkPageBreak(8);
          yPos += 3;
          doc.setFontSize(8);
          doc.setFont(undefined, 'italic');
          doc.setTextColor(150, 150, 150);
          doc.text(`Note: Showing ${maxColumns} of ${headers.length} columns. Export to Excel/CSV for full data.`, margin, yPos);
          doc.setTextColor(0, 0, 0);
        }
      } else {
        checkPageBreak(10);
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('No data available.', margin, yPos);
        doc.setTextColor(0, 0, 0);
      }
      
      // Draw footer on all pages
      const totalPages = doc.internal.pages.length - 1;
      
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        // Footer line
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(margin, pageHeight - footerHeight + 5, pageWidth - margin, pageHeight - footerHeight + 5);
        
        // Footer text - prevent overlapping by spacing properly
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        
        // Page number (centered)
        const pageText = `Page ${i} of ${totalPages}`;
        const pageTextWidth = doc.getTextWidth(pageText);
        const pageTextCenter = (pageWidth - pageTextWidth) / 2;
        doc.text(pageText, pageTextCenter, pageHeight - 10);
        
        // Tracking ID (left side) - ensure it doesn't overlap with page number
        doc.setFontSize(8);
        doc.setFont(undefined, 'italic');
        const trackingText = `Tracking: ${customerTrackingId}`;
        const trackingWidth = doc.getTextWidth(trackingText);
        // Only show tracking if there's enough space (at least 10mm gap from page number)
        if (trackingWidth + margin + 10 < pageTextCenter) {
          doc.text(trackingText, margin, pageHeight - 10);
        }
        
        // Timestamp (right side) - ensure it doesn't overlap with page number
        const timestamp = new Date().toLocaleString();
        const timestampWidth = doc.getTextWidth(timestamp);
        const pageTextRight = pageTextCenter + pageTextWidth;
        // Only show timestamp if there's enough space (at least 10mm gap from page number)
        if (pageWidth - margin - timestampWidth > pageTextRight + 10) {
          doc.text(timestamp, pageWidth - margin - timestampWidth, pageHeight - 10);
        }
        
        doc.setTextColor(0, 0, 0);
      }
      
      // Save the PDF
      doc.save(`${filename}.pdf`);
    } else if (Platform.OS !== 'web') {
      // Fallback to text file for non-web environments (iOS/Android)
      console.warn('PDF export is only available on web. Falling back to text format.');
      let content = `CUSTOMERS REPORT\n`;
      content += `${'='.repeat(50)}\n`;
      content += `Generated on: ${new Date().toLocaleDateString()}\n`;
      content += `${'='.repeat(50)}\n\n`;
      
      if (summary && Object.keys(summary).length > 0) {
        content += `SUMMARY:\n`;
        content += `${'-'.repeat(50)}\n`;
        Object.entries(summary).forEach(([key, value]) => {
          const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
          content += `${formattedKey}: ${value}\n`;
        });
        content += `\n${'='.repeat(50)}\n\n`;
      }
      
      if (customerData && customerData.length > 0) {
        content += `DATA (${customerData.length} record${customerData.length === 1 ? '' : 's'}):\n`;
        content += `${'-'.repeat(50)}\n\n`;
        customerData.forEach((row, index) => {
          content += `Record ${index + 1}:\n`;
          Object.entries(row).forEach(([key, value]) => {
            content += `  ${key}: ${value}\n`;
          });
          content += `${'-'.repeat(50)}\n`;
        });
      } else {
        content += `No data available.\n`;
      }
      
      downloadFile(content, `${filename}.txt`, 'text/plain');
    }
  } catch (error) {
    console.error('PDF generation error:', error);
    // Fallback to text file if PDF generation fails
    let content = `CUSTOMERS REPORT\n`;
    content += `${'='.repeat(50)}\n`;
    content += `Generated on: ${new Date().toLocaleDateString()}\n`;
    content += `${'='.repeat(50)}\n\n`;
    
    if (summary && Object.keys(summary).length > 0) {
      content += `SUMMARY:\n`;
      content += `${'-'.repeat(50)}\n`;
      Object.entries(summary).forEach(([key, value]) => {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
        content += `${formattedKey}: ${value}\n`;
      });
      content += `\n${'='.repeat(50)}\n\n`;
    }
    
    if (customerData && customerData.length > 0) {
      content += `DATA (${customerData.length} record${customerData.length === 1 ? '' : 's'}):\n`;
      content += `${'-'.repeat(50)}\n\n`;
      customerData.forEach((row, index) => {
        content += `Record ${index + 1}:\n`;
        Object.entries(row).forEach(([key, value]) => {
          content += `  ${key}: ${value}\n`;
        });
        content += `${'-'.repeat(50)}\n`;
      });
    } else {
      content += `No data available.\n`;
    }
    
    downloadFile(content, `${filename}.txt`, 'text/plain');
    throw new Error('PDF generation failed. Text file created instead.');
  }
};

