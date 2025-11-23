import { Order, Customer, Employee } from '../types'

// Helper function to normalize currency to peso format (₱)
const formatToPeso = (value: any): string => {
  if (value === null || value === undefined) return '₱0.00'
  
  // If already in peso format, return as is
  if (typeof value === 'string' && value.trim().startsWith('₱')) {
    return value.trim()
  }
  
  // If it's a number, format it
  if (typeof value === 'number') {
    return `₱${value.toFixed(2)}`
  }
  
  // If it's a string, parse it
  const str = String(value).trim()
  
  // Handle PHP prefix
  if (str.toUpperCase().includes('PHP')) {
    const num = parseFloat(str.replace(/[^\d.]/g, '')) || 0
    return `₱${num.toFixed(2)}`
  }
  
  // Extract number from string
  const num = parseFloat(str.replace(/[^\d.]/g, '')) || 0
  return `₱${num.toFixed(2)}`
}

// CSV Export Functions
export const exportToCSV = (orders: Order[], filename: string = 'orders') => {
  const headers = [
    'Order ID',
    'Date',
    'Customer',
    'Payment Status',
    'Total Amount',
    'Paid Amount',
    'Balance',
    'Services',
    'Item Status',
    'Notes'
  ]

  // Calculate totals
  let totalAmount = 0
  let totalPaid = 0
  let totalBalance = 0
  
  orders.forEach(order => {
    const totalStr = order.total || '₱0'
    const totalNum = parseFloat(totalStr.replace(/[₱,]/g, '')) || 0
    totalAmount += totalNum
    
    const paidAmount = typeof (order as any).paid === 'number' 
      ? (order as any).paid 
      : parseFloat(String((order as any).paid || '0').replace(/[^\d.]/g, '')) || 0
    totalPaid += paidAmount
    
    const balanceStr = order.balance || '₱0'
    const balanceNum = parseFloat(balanceStr.replace(/[₱,]/g, '')) || 0
    totalBalance += balanceNum
  })

  const csvContent = [
    headers.join(','),
    ...orders.map(order => {
      const itemsArr: any[] = Array.isArray((order as any).items) ? (order as any).items : []
      const services = itemsArr.map(item => `${item.service} (${item.quantity})`).join('; ')
      const itemStatuses = itemsArr.map(item => item.status).join('; ')
      const paidAmount = typeof (order as any).paid === 'number' 
        ? (order as any).paid 
        : parseFloat(String((order as any).paid || '0').replace(/[^\d.]/g, '')) || 0
      const totalFormatted = formatToPeso(order.total)
      const balanceFormatted = formatToPeso(order.balance)
      const paidFormatted = formatToPeso(paidAmount)
      
      return [
        `"${order.id}"`,
        `"${order.date}"`,
        `"${order.customer}"`,
        `"${order.payment}"`,
        `"${totalFormatted}"`,
        `"${paidFormatted}"`,
        `"${balanceFormatted}"`,
        `"${services}"`,
        `"${itemStatuses}"`,
        `"${order.notes || ''}"`
      ].join(',')
    }),
    // Add total row
    `"TOTAL","","","","${formatToPeso(totalAmount)}","${formatToPeso(totalPaid)}","${formatToPeso(totalBalance)}","","",""`
  ].join('\n')

  // Add UTF-8 BOM for proper encoding in Excel
  const BOM = '\uFEFF'
  const csvWithBOM = BOM + csvContent
  downloadFile(csvWithBOM, `${filename}.csv`, 'text/csv;charset=utf-8')
}

// Excel Export Functions (using a simple approach that works in most browsers)
export const exportToExcel = (orders: Order[], filename: string = 'orders') => {
  const headers = [
    'Order ID',
    'Date', 
    'Customer',
    'Payment Status',
    'Total Amount',
    'Paid Amount',
    'Balance',
    'Services',
    'Item Status',
    'Notes'
  ]

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
        .total-row { background-color: #e8f4f8; font-weight: bold; }
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
            const itemsArr: any[] = Array.isArray((order as any).items) ? (order as any).items : []
            const services = itemsArr.map(item => `${item.service} (${item.quantity})`).join('; ')
            const itemStatuses = itemsArr.map(item => item.status).join('; ')
            const paidAmount = typeof (order as any).paid === 'number' 
              ? (order as any).paid 
              : parseFloat(String((order as any).paid || '0').replace(/[^\d.]/g, '')) || 0
            const totalFormatted = formatToPeso(order.total)
            const balanceFormatted = formatToPeso(order.balance)
            const paidFormatted = formatToPeso(paidAmount)
            
            return `
              <tr>
                <td>${order.id}</td>
                <td>${order.date}</td>
                <td>${order.customer}</td>
                <td>${order.payment}</td>
                <td class="amount">${totalFormatted}</td>
                <td class="amount">${paidFormatted}</td>
                <td class="amount">${balanceFormatted}</td>
                <td>${services}</td>
                <td>${itemStatuses}</td>
                <td>${order.notes || ''}</td>
              </tr>
            `
          }).join('')}
          ${(() => {
            // Calculate totals
            let totalAmount = 0
            let totalPaid = 0
            let totalBalance = 0
            
            orders.forEach(order => {
              const totalStr = order.total || '₱0'
              const totalNum = parseFloat(totalStr.replace(/[₱,]/g, '')) || 0
              totalAmount += totalNum
              
              const paidAmount = typeof (order as any).paid === 'number' 
                ? (order as any).paid 
                : parseFloat(String((order as any).paid || '0').replace(/[^\d.]/g, '')) || 0
              totalPaid += paidAmount
              
              const balanceStr = order.balance || '₱0'
              const balanceNum = parseFloat(balanceStr.replace(/[₱,]/g, '')) || 0
              totalBalance += balanceNum
            })
            
            return `
              <tr class="total-row">
                <td><strong>TOTAL</strong></td>
                <td></td>
                <td></td>
                <td></td>
                <td class="amount"><strong>${formatToPeso(totalAmount)}</strong></td>
                <td class="amount"><strong>${formatToPeso(totalPaid)}</strong></td>
                <td class="amount"><strong>${formatToPeso(totalBalance)}</strong></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            `
          })()}
        </tbody>
      </table>
    </body>
    </html>
  `

  // Ensure UTF-8 encoding for peso symbol - add BOM and explicit charset
  const BOM = '\uFEFF'
  const htmlWithBOM = BOM + htmlContent
  downloadFile(htmlWithBOM, `${filename}.xls`, 'application/vnd.ms-excel;charset=utf-8')
}

// JSON Export Functions - Generic version that accepts any data
export const exportToJSON = (data: any, filename: string = 'export') => {
  const jsonContent = JSON.stringify(data, null, 2)
  downloadFile(jsonContent, `${filename}.json`, 'application/json')
}

// PDF Export Functions - Legacy function for orders (uses new PDF generator)
export const exportToPDF = async (orders: Order[], filename: string = 'orders') => {
  // Calculate summary for orders
  const summary = {
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, order) => {
      const totalStr = order.total || '₱0'
      const numStr = totalStr.replace(/[₱,]/g, '')
      return sum + (parseFloat(numStr) || 0)
    }, 0).toFixed(2),
    paidOrders: orders.filter(o => o.payment === 'Paid').length,
    unpaidOrders: orders.filter(o => o.payment === 'Unpaid').length,
    partialOrders: orders.filter(o => o.payment === 'Partial').length
  }
  
  // Transform orders data
  const orderData = orders.map((order: any) => ({
    'Order ID': order.id,
    Date: order.date,
    Customer: order.customer,
    Payment: order.payment,
    Total: typeof order.total === 'string' && order.total.includes('₱')
      ? order.total.replace('₱', 'PHP ')
      : `PHP ${(parseFloat(String(order.total).replace(/[₱,]/g, '')) || 0).toFixed(2)}`,
    'Paid Amount': typeof order.paid === 'number' ? `PHP ${order.paid.toFixed(2)}` : 'PHP 0.00',
    Balance: typeof order.balance === 'string' && order.balance.includes('₱')
      ? order.balance.replace('₱', 'PHP ')
      : `PHP ${(parseFloat(String(order.balance || '0').replace(/[₱,]/g, '')) || 0).toFixed(2)}`,
    Change: typeof order.change === 'number' ? `PHP ${order.change.toFixed(2)}` : 'PHP 0.00',
    Services: (Array.isArray(order.items) ? order.items : []).map((item: any) => `${item.service} (${item.quantity})`).join('; ') || '',
    Status: (Array.isArray(order.items) ? order.items : []).map((item: any) => item.status).join('; ') || '',
    Notes: order.notes || ''
  }))
  
  await exportDataToPDF(orderData, summary, 'Orders Report', filename)
}

// Utility function to download files
const downloadFile = (content: string, filename: string, mimeType: string) => {
  try {
    const blob = new Blob([content], { type: mimeType })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Download error:', error)
    throw new Error('Failed to download file')
  }
}

// Helper function to extract numeric value from currency strings
const extractNumericValue = (value: any): number => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    // Remove currency symbols and parse
    const cleaned = value.replace(/[₱PHP,]/g, '').trim()
    return parseFloat(cleaned) || 0
  }
  return 0
}

// Helper function to identify amount columns and calculate totals
const calculateTotals = (data: any[], headers: string[]): any => {
  const totals: any = {}
  const currencyKeywords = ['revenue', 'expenses', 'profit', 'spent', 'cashflow', 'balance', 'amount', 'price', 'cost', 'total revenue', 'total spent']
  const countKeywords = ['orders', 'count', 'quantity', 'items']
  
  headers.forEach(header => {
    const headerLower = header.toLowerCase()
    
    // Check if it's a currency column (revenue, expenses, etc.)
    const isCurrencyColumn = currencyKeywords.some(keyword => headerLower.includes(keyword))
    
    // Check if it's a count column (orders, count, etc.) - but not if it's also a currency column
    const isCountColumn = !isCurrencyColumn && countKeywords.some(keyword => headerLower.includes(keyword))
    
    // Also check for "total" columns - if it contains "total" and currency keywords, it's currency
    // If it contains "total" and count keywords, it's a count
    const hasTotal = headerLower.includes('total')
    const isTotalCurrency = hasTotal && currencyKeywords.some(keyword => headerLower.includes(keyword))
    const isTotalCount = hasTotal && countKeywords.some(keyword => headerLower.includes(keyword))
    
    // Special handling for "paid orders", "unpaid orders", "partial orders" - these are counts
    const isOrderCount = headerLower.includes('orders') && (headerLower.includes('paid') || headerLower.includes('unpaid') || headerLower.includes('partial'))
    
    if (isCurrencyColumn || isTotalCurrency) {
      // Currency column
      let total = 0
      data.forEach(row => {
        const key = header.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
        const value = row[key] || row[header] || ''
        total += extractNumericValue(value)
      })
      totals[header] = { value: total, type: 'currency' }
    } else if (isCountColumn || isTotalCount || isOrderCount) {
      // Count column
      let total = 0
      data.forEach(row => {
        const key = header.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
        const value = row[key] || row[header] || ''
        // For count columns, extract as integer
        const numValue = extractNumericValue(value)
        total += Math.round(numValue) // Round to ensure integer counts
      })
      totals[header] = { value: total, type: 'count' }
    }
  })
  
  return totals
}

// Generic CSV Export Function
export const exportDataToCSV = (data: any[], headers: string[], filename: string = 'export') => {
  if (!data || data.length === 0) {
    throw new Error('No data to export')
  }

  // Calculate totals for amount columns
  const totals = calculateTotals(data, headers)
  const hasTotals = Object.keys(totals).length > 0

  const csvContent = [
    headers.join(','),
    ...data.map(row => {
      return headers.map(header => {
        const key = header.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
        const value = row[key] || row[header] || ''
        // Escape quotes and wrap in quotes if contains comma or quote
        const stringValue = String(value).replace(/"/g, '""')
        return `"${stringValue}"`
      }).join(',')
    }),
    // Add total row if there are amount columns
    ...(hasTotals ? [headers.map(header => {
      if (totals[header] !== undefined) {
        const totalInfo = totals[header]
        if (totalInfo.type === 'currency') {
          return `"PHP ${totalInfo.value.toFixed(2)}"`
        } else if (totalInfo.type === 'count') {
          return `"${totalInfo.value}"`
        } else {
          // Backward compatibility
          return `"PHP ${totalInfo.value.toFixed(2)}"`
        }
      }
      return header === headers[0] ? '"TOTAL"' : '""'
    }).join(',')] : [])
  ].join('\n')

  downloadFile(csvContent, `${filename}.csv`, 'text/csv')
}

// Generic Excel Export Function
export const exportDataToExcel = (data: any[], headers: string[], filename: string = 'export') => {
  if (!data || data.length === 0) {
    throw new Error('No data to export')
  }

  // Calculate totals for amount columns
  const totals = calculateTotals(data, headers)
  const hasTotals = Object.keys(totals).length > 0

  // Helper function to escape HTML and handle currency symbol properly
  const escapeHtml = (value: any): string => {
    if (value === null || value === undefined) return ''
    const str = String(value)
    // Replace currency symbol properly and escape HTML
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  const htmlContent = `<?xml version="1.0" encoding="UTF-8"?>
    <?mso-application progid="Excel.Sheet"?>
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:x="urn:schemas-microsoft-com:office:excel" 
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <meta name="ProgId" content="Excel.Sheet">
      <meta name="Generator" content="Microsoft Excel">
      <style>
        <!--
        table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
        th { background-color: #f2f2f2; font-weight: bold; border: 1px solid #ddd; padding: 8px; text-align: left; }
        td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .number { text-align: right; }
        .total-row { background-color: #e8f4f8; font-weight: bold; }
        -->
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            ${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => {
            return `
              <tr>
                ${headers.map(header => {
                  const key = header.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
                  const value = row[key] || row[header] || ''
                  return `<td>${escapeHtml(value)}</td>`
                }).join('')}
              </tr>
            `
          }).join('')}
          ${hasTotals ? `
          <tr class="total-row">
            ${headers.map(header => {
              const totalInfo = totals[header]
              if (totalInfo !== undefined) {
                if (totalInfo.type === 'currency') {
                  return `<td class="number"><strong>PHP ${totalInfo.value.toFixed(2)}</strong></td>`
                } else if (totalInfo.type === 'count') {
                  return `<td class="number"><strong>${totalInfo.value}</strong></td>`
                } else {
                  // Backward compatibility
                  return `<td class="number"><strong>PHP ${totalInfo.value.toFixed(2)}</strong></td>`
                }
              }
              return header === headers[0] ? `<td><strong>TOTAL</strong></td>` : '<td></td>'
            }).join('')}
          </tr>
          ` : ''}
        </tbody>
      </table>
    </body>
    </html>
  `

  downloadFile(htmlContent, `${filename}.xls`, 'application/vnd.ms-excel')
}

export interface ReportPdfOptions {
  trackingId?: string
  generatedBy?: string
  digitalSignature?: string
  dateRange?: string
}

// Generic PDF/Text Export Function - Creates actual PDF using jsPDF
// Returns PDF blob URL for preview, and optionally saves the file
export const exportDataToPDF = async (
  data: any[],
  summary: any,
  title: string,
  filename: string = 'export',
  saveFile: boolean = true,
  options: ReportPdfOptions = {}
) => {
  try {
    // Dynamically import jsPDF to avoid loading if not needed
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    const maxWidth = pageWidth - (margin * 2)
    const headerHeight = 30
    const footerHeight = 20
    const contentTop = headerHeight + 10
    const contentBottom = pageHeight - footerHeight
    const generatedAt = new Date()
    const generatedTimestamp = generatedAt.toLocaleString()
    const generatedDateText = generatedAt.toLocaleDateString()
    const generatedTimeText = generatedAt.toLocaleTimeString()
    const trackingId = options.trackingId || `DOC-${Date.now().toString(36).toUpperCase()}`
    const generatedBy = options.generatedBy || 'Sparklean Laundry POS'
    const digitalSignature =
      options.digitalSignature || `Digitally signed by ${generatedBy} on ${generatedTimestamp}`
    const dateRangeLabel = options.dateRange
    
    let currentPage = 1
    const totalPages = () => doc.internal.pages.length - 1 // jsPDF starts with page 0
    
    // Helper function to draw header on current page
    const drawHeader = () => {
      const pageNum = doc.internal.getCurrentPageInfo().pageNumber
      
      // Header background
      doc.setFillColor(37, 99, 235) // Blue background
      doc.rect(0, 0, pageWidth, headerHeight, 'F')
      
      // Header text - Title
      doc.setTextColor(255, 255, 255) // White text
      doc.setFontSize(16)
      doc.setFont(undefined, 'bold')
      doc.text(title.toUpperCase() + ' REPORT', margin, 18)
      
      // Header text - Date (right aligned)
      doc.setFontSize(9)
      doc.setFont(undefined, 'normal')
      const dateText = generatedDateText
      const dateWidth = doc.getTextWidth(dateText)
      doc.text(dateText, pageWidth - margin - dateWidth, 18)
      
      // Header text - Company/System name (centered bottom)
      doc.setFontSize(8)
      doc.setFont(undefined, 'italic')
      const companyText = 'Laundry POS Management System'
      const companyWidth = doc.getTextWidth(companyText)
      doc.text(companyText, (pageWidth - companyWidth) / 2, 26)
      
      // Reset text color for body
      doc.setTextColor(0, 0, 0) // Black text
    }
    
    // Helper function to draw footer on current page
    const drawFooter = () => {
      // Get current page number (jsPDF uses 1-based indexing in getCurrentPageInfo)
      const currentPageInfo = doc.internal.getCurrentPageInfo()
      const pageNum = currentPageInfo.pageNumber
      // Total pages (jsPDF internal.pages includes a special first element, so subtract 1)
      const totalPagesCount = doc.internal.pages.length - 1
      
      // Footer line
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.5)
      doc.line(margin, pageHeight - footerHeight + 5, pageWidth - margin, pageHeight - footerHeight + 5)
      
      // Footer text - Page number (centered)
      doc.setFontSize(9)
      doc.setFont(undefined, 'normal')
      doc.setTextColor(100, 100, 100)
      const pageText = `Page ${pageNum} of ${totalPagesCount}`
      const pageWidth_text = doc.getTextWidth(pageText)
      doc.text(pageText, (pageWidth - pageWidth_text) / 2, pageHeight - 10)
      
      // Footer text - Tracking (left)
      doc.setFontSize(8)
      doc.setFont(undefined, 'italic')
      doc.text(`Tracking: ${trackingId}`, margin, pageHeight - 10)
      
      // Footer text - Generated timestamp (right)
      const timestamp = generatedTimestamp
      const timestampWidth = doc.getTextWidth(timestamp)
      doc.text(timestamp, pageWidth - margin - timestampWidth, pageHeight - 10)
      
      // Reset text color
      doc.setTextColor(0, 0, 0)
    }
    
    let yPos = contentTop
    const maxContentHeight = contentBottom - contentTop
    
    // Helper to add new page if needed
    const checkPageBreak = (requiredHeight: number) => {
      if (yPos + requiredHeight > contentBottom) {
        // Add new page
        doc.addPage()
        currentPage++
        // Draw header on new page
        drawHeader()
        yPos = contentTop
      }
    }
    
    // Function to draw headers and footers on all pages at the end
    const drawAllPageHeadersFooters = () => {
      const totalPages = doc.internal.pages.length - 1
      
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        
        // Draw header on every page
        drawHeader()
        
        // Draw footer on every page with correct page numbers
        // Footer line
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.5)
        doc.line(margin, pageHeight - footerHeight + 5, pageWidth - margin, pageHeight - footerHeight + 5)
        
        // Footer text - Page number (centered)
        doc.setFontSize(9)
        doc.setFont(undefined, 'normal')
        doc.setTextColor(100, 100, 100)
        const pageText = `Page ${i} of ${totalPages}`
        const pageWidth_text = doc.getTextWidth(pageText)
        doc.text(pageText, (pageWidth - pageWidth_text) / 2, pageHeight - 10)
        
        // Footer text - Tracking (left)
        doc.setFontSize(8)
        doc.setFont(undefined, 'italic')
        doc.text(`Tracking: ${trackingId}`, margin, pageHeight - 10)
        
        // Footer text - Generated timestamp (right)
        const timestamp = generatedTimestamp
        const timestampWidth = doc.getTextWidth(timestamp)
        doc.text(timestamp, pageWidth - margin - timestampWidth, pageHeight - 10)
        
        doc.setTextColor(0, 0, 0)
      }
    }
    
    // Draw header on first page
    drawHeader()
    
    // Title section (on first page only)
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text('REPORT DETAILS', margin, yPos)
    yPos += 8
    
    // Generation info
    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.text(`Generated on: ${generatedDateText} at ${generatedTimeText}`, margin, yPos)
    yPos += 6
    if (dateRangeLabel) {
      doc.text(`Date Range: ${dateRangeLabel}`, margin, yPos)
      yPos += 6
    }
    doc.text(`Tracking ID: ${trackingId}`, margin, yPos)
    yPos += 6
    doc.text(`Generated by: ${generatedBy}`, margin, yPos)
    yPos += 12
    
    // Summary section
    if (summary && Object.keys(summary).length > 0) {
      checkPageBreak(25)
      
      // Summary box background
      doc.setFillColor(245, 247, 250)
      doc.roundedRect(margin, yPos - 5, maxWidth, 0, 3, 3, 'F')
      
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('SUMMARY', margin, yPos)
      yPos += 8
      
      doc.setFontSize(10)
      doc.setFont(undefined, 'normal')
      Object.entries(summary).forEach(([key, value]) => {
        checkPageBreak(8)
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim()
        const text = `${formattedKey}: ${value}`
        
        // Draw summary items with bullet
        doc.setFontSize(9)
        doc.text('•', margin + 2, yPos)
        doc.text(text, margin + 8, yPos)
        yPos += 7
      })
      yPos += 8
    }
    
    // Data section
    if (data && data.length > 0) {
      checkPageBreak(25)
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text(`DATA (${data.length} record${data.length === 1 ? '' : 's'})`, margin, yPos)
      yPos += 10
      
      // Get all unique keys from data for headers
      const allKeys = new Set<string>()
      data.forEach(row => {
        Object.keys(row).forEach(key => allKeys.add(key))
      })
      const headers = Array.from(allKeys)
      
      // Limit columns to fit page width (max 6 columns)
      const maxColumns = Math.min(headers.length, 6)
      const displayHeaders = headers.slice(0, maxColumns)
      
      // Distribute columns evenly with minimal padding
      const columnPadding = 1.5 // Minimal padding between columns
      const totalPadding = columnPadding * (displayHeaders.length - 1)
      const availableWidth = maxWidth - totalPadding
      const colWidth = availableWidth / displayHeaders.length
      
      // Determine column alignment based on header/content type (before drawing headers)
      const columnAlignments: ('left' | 'right')[] = displayHeaders.map(header => {
        const headerLower = header.toLowerCase()
        // Right-align currency and numeric columns
        const isCurrency = headerLower.includes('revenue') || headerLower.includes('expenses') || 
                          headerLower.includes('profit') || headerLower.includes('amount') || 
                          headerLower.includes('price') || headerLower.includes('cost') ||
                          headerLower.includes('total revenue') || headerLower.includes('total spent') ||
                          headerLower.includes('balance') || headerLower.includes('paid') ||
                          headerLower.includes('cashflow') || headerLower.includes('net cashflow')
        const isNumeric = headerLower.includes('orders') || headerLower.includes('count') || 
                         headerLower.includes('quantity') || headerLower.includes('items')
        return (isCurrency || isNumeric) ? 'right' : 'left'
      })
      
      // Create table with header background
      doc.setFillColor(240, 242, 245)
      doc.roundedRect(margin, yPos - 5, maxWidth, 8, 2, 2, 'F')
      
      doc.setFontSize(9)
      doc.setFont(undefined, 'bold')
      
      // Draw table header row with proper alignment matching data columns
      let xPos = margin + 2
      displayHeaders.forEach((header, colIndex) => {
        const alignment = columnAlignments[colIndex]
        let headerText = header
        const maxHeaderWidth = colWidth - 4 // Leave 2mm padding on each side
        
        // Truncate header if too long
        if (doc.getTextWidth(headerText) > maxHeaderWidth) {
          while (doc.getTextWidth(headerText + '...') > maxHeaderWidth && headerText.length > 0) {
            headerText = headerText.substring(0, headerText.length - 1)
          }
          headerText = headerText + '...'
        }
        
        // Apply same alignment as data columns
        if (alignment === 'right') {
          const textWidth = doc.getTextWidth(headerText)
          doc.text(headerText, xPos + colWidth - textWidth - 2, yPos)
        } else {
          doc.text(headerText, xPos, yPos)
        }
        xPos += colWidth + columnPadding
      })
      yPos += 8
      
      // Draw horizontal line below header
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.5)
      doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2)
      
      // Draw data rows
      doc.setFont(undefined, 'normal')
      doc.setFontSize(9)
      data.forEach((row, rowIndex) => {
        checkPageBreak(10)
        
        // Alternate row colors for better readability
        if (rowIndex % 2 === 0) {
          doc.setFillColor(250, 250, 250)
          doc.rect(margin, yPos - 5, maxWidth, 7, 'F')
        }
        
        xPos = margin + 2
        displayHeaders.forEach((header, colIndex) => {
          let value = String(row[header] || '')
          const maxValueWidth = colWidth - 4 // Leave 2mm padding on each side
          const alignment = columnAlignments[colIndex]
          
          // Truncate value if it exceeds column width
          if (doc.getTextWidth(value) > maxValueWidth) {
            let truncated = value
            while (doc.getTextWidth(truncated + '...') > maxValueWidth && truncated.length > 0) {
              truncated = truncated.substring(0, truncated.length - 1)
            }
            value = truncated + '...'
          }
          
          // Apply alignment
          if (alignment === 'right') {
            const textWidth = doc.getTextWidth(value)
            doc.text(value, xPos + colWidth - textWidth - 2, yPos)
          } else {
            doc.text(value, xPos, yPos)
          }
          xPos += colWidth + columnPadding
        })
        yPos += 7
      })
      
      // Calculate totals for amount columns before displaying
      const totals = calculateTotals(data, headers)
      const hasTotals = Object.keys(totals).length > 0
      
      // Add total row directly below the table
      if (hasTotals) {
        checkPageBreak(10)
        yPos += 2
        
        // Draw separator line above total row
        doc.setDrawColor(150, 150, 150)
        doc.setLineWidth(0.8)
        doc.line(margin, yPos, pageWidth - margin, yPos)
        yPos += 5
        
        // Total row background (highlighted)
        doc.setFillColor(240, 248, 255)
        doc.rect(margin, yPos - 5, maxWidth, 8, 'F')
        
        // Draw total row as part of the table - use same alignment as data rows
        xPos = margin + 2
        displayHeaders.forEach((header, colIndex) => {
          const alignment = columnAlignments[colIndex]
          
          if (totals[header] !== undefined) {
            const totalInfo = totals[header]
            let totalText: string
            
            // Format based on type
            if (totalInfo.type === 'currency') {
              totalText = `PHP ${totalInfo.value.toFixed(2)}`
            } else if (totalInfo.type === 'count') {
              totalText = totalInfo.value.toString()
            } else {
              // Backward compatibility - if it's a number, treat as currency
              totalText = `PHP ${totalInfo.value.toFixed(2)}`
            }
            
            doc.setFontSize(9)
            doc.setFont(undefined, 'bold')
            doc.setTextColor(0, 0, 0)
            
            // Apply same alignment as data rows
            if (alignment === 'right') {
              const textWidth = doc.getTextWidth(totalText)
              doc.text(totalText, xPos + colWidth - textWidth - 2, yPos)
            } else {
              doc.text(totalText, xPos, yPos)
            }
          } else if (header === displayHeaders[0]) {
            // First column shows "TOTAL" label (always left-aligned)
            doc.setFontSize(9)
            doc.setFont(undefined, 'bold')
            doc.setTextColor(0, 0, 0)
            doc.text('TOTAL', xPos, yPos)
          }
          xPos += colWidth + columnPadding
        })
        yPos += 8
        
        // Draw bottom border for total row
        doc.setDrawColor(150, 150, 150)
        doc.setLineWidth(0.8)
        doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2)
      }
      
      // Note about columns if truncated
      if (headers.length > maxColumns) {
        checkPageBreak(8)
        yPos += 3
        doc.setFontSize(8)
        doc.setFont(undefined, 'italic')
        doc.setTextColor(150, 150, 150)
        doc.text(`Note: Showing ${maxColumns} of ${headers.length} columns. Export to Excel/CSV for full data.`, margin, yPos)
        doc.setTextColor(0, 0, 0)
      }
    } else {
      checkPageBreak(10)
      doc.setFontSize(10)
      doc.setTextColor(150, 150, 150)
      doc.text('No data available.', margin, yPos)
      doc.setTextColor(0, 0, 0)
    }

    // Digital signature & tracking section
    checkPageBreak(30)
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text('DIGITAL SIGNATURE', margin, yPos)
    yPos += 6
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, yPos + 4, margin + 70, yPos + 4)
    doc.setFontSize(9)
    doc.setFont(undefined, 'normal')
    doc.text(digitalSignature, margin, yPos + 12)
    doc.text(`Tracking ID: ${trackingId}`, margin, yPos + 20)
    if (dateRangeLabel) {
      doc.text(`Report Range: ${dateRangeLabel}`, margin, yPos + 28)
    }
    doc.setFontSize(8)
    doc.setTextColor(130, 130, 130)
    doc.text('Electronically generated document. Any alteration renders the signature invalid.', margin, yPos + 36, { maxWidth })
    doc.setTextColor(0, 0, 0)
    yPos += 44
    
    // Draw headers and footers on all pages with correct page numbers
    drawAllPageHeadersFooters()
    
    // Return to last page for any final content
    const lastPage = doc.internal.pages.length - 1
    doc.setPage(lastPage)
    
    // Generate PDF blob for preview
    const pdfBlob = doc.output('blob')
    const pdfUrl = URL.createObjectURL(pdfBlob)
    
    // Save the PDF if requested
    if (saveFile) {
      doc.save(`${filename}.pdf`)
    }
    
    // Return blob URL for preview
    return pdfUrl
  } catch (error) {
    console.error('PDF generation error:', error)
    // Fallback to text file if PDF library fails
    let content = `${title.toUpperCase()} REPORT\n`
    content += `${'='.repeat(50)}\n`
    content += `Generated on: ${new Date().toLocaleDateString()}\n`
    content += `${'='.repeat(50)}\n\n`
    
    if (summary && Object.keys(summary).length > 0) {
      content += `SUMMARY:\n`
      content += `${'-'.repeat(50)}\n`
      Object.entries(summary).forEach(([key, value]) => {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim()
        content += `${formattedKey}: ${value}\n`
      })
      content += `\n${'='.repeat(50)}\n\n`
    }
    
    if (data && data.length > 0) {
      content += `DATA (${data.length} record${data.length === 1 ? '' : 's'}):\n`
      content += `${'-'.repeat(50)}\n\n`
      data.forEach((row, index) => {
        content += `Record ${index + 1}:\n`
        Object.entries(row).forEach(([key, value]) => {
          const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim()
          content += `  ${formattedKey}: ${value}\n`
        })
        content += `${'-'.repeat(50)}\n`
      })
    } else {
      content += `No data available.\n`
    }
    
    downloadFile(content, `${filename}.txt`, 'text/plain')
    throw new Error('PDF generation failed. Text file created instead.')
  }
}

// Preview PDF without downloading
export const previewDataAsPDF = async (
  data: any[],
  summary: any,
  title: string,
  options?: ReportPdfOptions
) => {
  return await exportDataToPDF(data, summary, title, 'preview', false, options)
}

// Get export filename with timestamp
export const getExportFilename = (prefix: string = 'orders') => {
  const now = new Date()
  const timestamp = now.toISOString().split('T')[0] // YYYY-MM-DD format
  return `${prefix}_${timestamp}`
}

// Customer Export Functions
export const exportCustomersToCSV = (customers: Customer[], filename: string = 'customers') => {
  const headers = [
    'Customer ID',
    'Name',
    'Email',
    'Phone',
    'Total Orders',
    'Total Spent (₱)',
    'Last Order Date',
    'Average Order Value (₱)'
  ]

  const csvContent = [
    headers.join(','),
    ...customers.map(customer => {
      const avgOrderValue = customer.totalOrders > 0 ? (customer.totalSpent / customer.totalOrders).toFixed(2) : '0.00'
      
      return [
        `"${customer.id}"`,
        `"${customer.name}"`,
        `"${customer.email}"`,
        `"${customer.phone}"`,
        `"${customer.totalOrders}"`,
        `"${customer.totalSpent.toLocaleString()}"`,
        `"${customer.lastOrder}"`,
        `"${avgOrderValue}"`
      ].join(',')
    })
  ].join('\n')

  downloadFile(csvContent, `${filename}.csv`, 'text/csv')
}

export const exportCustomersToExcel = (customers: Customer[], filename: string = 'customers') => {
  const headers = [
    'Customer ID',
    'Name',
    'Email',
    'Phone',
    'Total Orders',
    'Total Spent (₱)',
    'Last Order Date',
    'Average Order Value (₱)'
  ]

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
            const avgOrderValue = customer.totalOrders > 0 ? (customer.totalSpent / customer.totalOrders).toFixed(2) : '0.00'
            
            return `
              <tr>
                <td>${customer.id}</td>
                <td>${customer.name}</td>
                <td>${customer.email}</td>
                <td>${customer.phone}</td>
                <td class="number">${customer.totalOrders}</td>
                <td class="currency">₱${customer.totalSpent.toLocaleString()}</td>
                <td>${customer.lastOrder}</td>
                <td class="currency">₱${avgOrderValue}</td>
              </tr>
            `
          }).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `

  downloadFile(htmlContent, `${filename}.xls`, 'application/vnd.ms-excel')
}

export const exportCustomersToJSON = (customers: Customer[], filename: string = 'customers') => {
  const jsonContent = JSON.stringify(customers, null, 2)
  downloadFile(jsonContent, `${filename}.json`, 'application/json')
}

export const exportCustomersToPDF = (customers: Customer[], filename: string = 'customers') => {
  const totalRevenue = customers.reduce((sum, customer) => sum + customer.totalSpent, 0)
  const totalOrders = customers.reduce((sum, customer) => sum + customer.totalOrders, 0)
  const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00'

  const content = `
    CUSTOMER REPORT
    Generated on: ${new Date().toLocaleDateString()}
    Total Customers: ${customers.length}
    Total Revenue: ₱${totalRevenue.toLocaleString()}
    Total Orders: ${totalOrders}
    Average Order Value: ₱${avgOrderValue}
    
    ${customers.map(customer => `
    Customer ID: ${customer.id}
    Name: ${customer.name}
    Email: ${customer.email}
    Phone: ${customer.phone}
    Total Orders: ${customer.totalOrders}
    Total Spent: ₱${customer.totalSpent.toLocaleString()}
    Last Order: ${customer.lastOrder}
    Average Order Value: ₱${customer.totalOrders > 0 ? (customer.totalSpent / customer.totalOrders).toFixed(2) : '0.00'}
    ${'='.repeat(50)}
    `).join('\n')}
  `

  downloadFile(content, `${filename}.txt`, 'text/plain')
}

// Employee Export Functions
export const exportEmployeesToCSV = (employees: Employee[], filename: string = 'employees') => {
  const headers = [
    'Employee ID',
    'Name',
    'Employee Number',
    'Position',
    'Department',
    'Status',
    'Hire Date',
    'Tenure (Months)'
  ]

  const csvContent = [
    headers.join(','),
    ...employees.map(employee => {
      const hireDate = new Date(employee.hireDate)
      const currentDate = new Date()
      const tenureMonths = Math.floor((currentDate.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
      
      return [
        `"${employee.id}"`,
        `"${employee.name}"`,
        `"${employee.employeeId}"`,
        `"${employee.position}"`,
        `"${employee.department}"`,
        `"${employee.status}"`,
        `"${employee.hireDate}"`,
        `"${tenureMonths}"`
      ].join(',')
    })
  ].join('\n')

  downloadFile(csvContent, `${filename}.csv`, 'text/csv')
}

export const exportEmployeesToExcel = (employees: Employee[], filename: string = 'employees') => {
  const headers = [
    'Employee ID',
    'Name',
    'Employee Number',
    'Position',
    'Department',
    'Status',
    'Hire Date',
    'Tenure (Months)'
  ]

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
        .status-active { color: #059669; font-weight: bold; }
        .status-inactive { color: #DC2626; font-weight: bold; }
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
          ${employees.map(employee => {
            const hireDate = new Date(employee.hireDate)
            const currentDate = new Date()
            const tenureMonths = Math.floor((currentDate.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
            const statusClass = employee.status === 'Active' ? 'status-active' : 'status-inactive'
            
            return `
              <tr>
                <td>${employee.id}</td>
                <td>${employee.name}</td>
                <td>${employee.employeeId}</td>
                <td>${employee.position}</td>
                <td>${employee.department}</td>
                <td class="${statusClass}">${employee.status}</td>
                <td>${employee.hireDate}</td>
                <td class="number">${tenureMonths}</td>
              </tr>
            `
          }).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `

  downloadFile(htmlContent, `${filename}.xls`, 'application/vnd.ms-excel')
}

export const exportEmployeesToJSON = (employees: Employee[], filename: string = 'employees') => {
  const jsonContent = JSON.stringify(employees, null, 2)
  downloadFile(jsonContent, `${filename}.json`, 'application/json')
}

export const exportEmployeesToPDF = (employees: Employee[], filename: string = 'employees') => {
  const totalEmployees = employees.length
  const activeEmployees = employees.filter(e => e.status === 'Active').length
  const inactiveEmployees = employees.filter(e => e.status === 'Inactive').length
  const managers = employees.filter(e => e.position.toLowerCase().includes('manager')).length
  const avgTenure = employees.length > 0 ? 
    employees.reduce((sum, emp) => {
      const hireDate = new Date(emp.hireDate)
      const currentDate = new Date()
      const tenureMonths = Math.floor((currentDate.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
      return sum + tenureMonths
    }, 0) / employees.length : 0

  const content = `
    EMPLOYEE REPORT
    Generated on: ${new Date().toLocaleDateString()}
    Total Employees: ${totalEmployees}
    Active Employees: ${activeEmployees}
    Inactive Employees: ${inactiveEmployees}
    Managers: ${managers}
    Average Tenure: ${avgTenure.toFixed(1)} months
    
    ${employees.map(employee => {
      const hireDate = new Date(employee.hireDate)
      const currentDate = new Date()
      const tenureMonths = Math.floor((currentDate.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
      
      return `
    Employee ID: ${employee.id}
    Name: ${employee.name}
    Employee Number: ${employee.employeeId}
    Position: ${employee.position}
    Department: ${employee.department}
    Status: ${employee.status}
    Hire Date: ${employee.hireDate}
    Tenure: ${tenureMonths} months
    ${'='.repeat(50)}
    `
    }).join('\n')}
  `

  downloadFile(content, `${filename}.txt`, 'text/plain')
}
