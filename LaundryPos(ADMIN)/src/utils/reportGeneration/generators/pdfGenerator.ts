/**
 * PDF Export Generator
 * Enhanced PDF generation with professional formatting
 */

import { BaseGenerator } from './baseGenerator'
import { ExportGenerator, ReportData, ExportOptions } from '../types'

export class PDFGenerator extends BaseGenerator implements ExportGenerator {
  async generate(reportData: ReportData, options: ExportOptions): Promise<string | Blob> {
    this.validateReportData(reportData)
    
    try {
      // Generate PDF document
      const doc = await this.createPDFDocument(reportData, options)
      
      // Generate blob
      const pdfBlob = doc.output('blob')
      
      // Save file (only for actual downloads, not previews)
      const filename = this.getFilename(reportData, options, 'pdf')
      doc.save(filename)
      
      return pdfBlob
    } catch (error) {
      console.error('PDF generation error:', error)
      throw new Error('Failed to generate PDF report')
    }
  }

  async preview(reportData: ReportData, options: ExportOptions): Promise<string> {
    this.validateReportData(reportData)
    
    try {
      // Generate PDF document without saving
      const doc = await this.createPDFDocument(reportData, options)
      
      // Generate blob for preview (no save call)
      const pdfBlob = doc.output('blob')
      
      // Return preview URL
      return URL.createObjectURL(pdfBlob)
    } catch (error) {
      console.error('PDF preview error:', error)
      throw new Error('Failed to generate PDF preview')
    }
  }

  /**
   * Create PDF document without saving
   */
  private async createPDFDocument(reportData: ReportData, options: ExportOptions): Promise<any> {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'mm',
      format: options.pageSize || 'a4'
    })
    
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    const maxWidth = pageWidth - (margin * 2)
    const headerHeight = 30
    const footerHeight = 20
    const contentTop = headerHeight + 10
    const contentBottom = pageHeight - footerHeight
    
    let yPos = contentTop
    let currentPage = 1
    
    // Draw header
    this.drawHeader(doc, reportData, pageWidth, headerHeight, margin)
    
    // Draw summary if enabled
    if (options.includeSummary !== false && reportData.summary) {
      yPos = this.drawSummary(doc, reportData.summary, margin, yPos, maxWidth, contentBottom)
      yPos += 10
    }
    
    // Draw data table
    yPos = this.drawTable(doc, reportData, margin, yPos, maxWidth, contentBottom, pageWidth, pageHeight)
    
    // Draw footer on all pages
    this.drawFooters(doc, reportData, pageWidth, pageHeight, footerHeight, margin)
    
    return doc
  }

  private drawHeader(doc: any, reportData: ReportData, pageWidth: number, headerHeight: number, margin: number): void {
    // Header background
    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, pageWidth, headerHeight, 'F')
    
    // Title
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont(undefined, 'bold')
    doc.text(`${reportData.metadata.reportTitle.toUpperCase()} REPORT`, margin, 18)
    
    // Date
    doc.setFontSize(9)
    doc.setFont(undefined, 'normal')
    const dateText = new Date().toLocaleDateString()
    const dateWidth = doc.getTextWidth(dateText)
    doc.text(dateText, pageWidth - margin - dateWidth, 18)
    
    // Company name
    doc.setFontSize(8)
    doc.setFont(undefined, 'italic')
    const companyText = 'Laundry POS Management System'
    const companyWidth = doc.getTextWidth(companyText)
    doc.text(companyText, (pageWidth - companyWidth) / 2, 26)
    
    doc.setTextColor(0, 0, 0)
  }

  private drawSummary(doc: any, summary: any, margin: number, yPos: number, maxWidth: number, contentBottom: number): number {
    if (yPos + 30 > contentBottom) {
      doc.addPage()
      yPos = 35
    }
    
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text('SUMMARY', margin, yPos)
    yPos += 8
    
    doc.setFillColor(245, 247, 250)
    doc.roundedRect(margin, yPos - 5, maxWidth, Object.keys(summary).length * 7 + 5, 3, 3, 'F')
    
    doc.setFontSize(9)
    doc.setFont(undefined, 'normal')
    Object.entries(summary).forEach(([key, value]) => {
      const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim()
      doc.text('•', margin + 2, yPos)
      doc.text(`${formattedKey}: ${value}`, margin + 8, yPos)
      yPos += 7
    })
    
    return yPos + 5
  }

  private drawTable(
    doc: any, 
    reportData: ReportData, 
    margin: number, 
    yPos: number, 
    maxWidth: number, 
    contentBottom: number,
    pageWidth: number,
    pageHeight: number
  ): number {
    if (yPos + 25 > contentBottom) {
      doc.addPage()
      yPos = 35
    }
    
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text(`DATA (${reportData.rows.length} record${reportData.rows.length === 1 ? '' : 's'})`, margin, yPos)
    yPos += 10
    
    const headers = reportData.headers
    const maxColumns = Math.min(headers.length, 6)
    const displayHeaders = headers.slice(0, maxColumns)
    
    // Distribute columns evenly with minimal padding
    const columnPadding = 1.5 // Minimal padding between columns
    const totalPadding = columnPadding * (displayHeaders.length - 1)
    const availableWidth = maxWidth - totalPadding
    const colWidth = availableWidth / displayHeaders.length
    const normalizedWidths = displayHeaders.map(() => colWidth)
    
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
    
    // Table header
    doc.setFillColor(240, 242, 245)
    doc.roundedRect(margin, yPos - 5, maxWidth, 8, 2, 2, 'F')
    
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    let xPos = margin + 2
    displayHeaders.forEach((header, index) => {
      const colWidth = normalizedWidths[index]
      const alignment = columnAlignments[index]
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
    
    // Header line
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.5)
    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2)
    
    // Data rows
    doc.setFont(undefined, 'normal')
    doc.setFontSize(9)
    reportData.rows.forEach((row, rowIndex) => {
      if (yPos + 10 > contentBottom) {
        doc.addPage()
        yPos = 35
      }
      
      if (rowIndex % 2 === 0) {
        doc.setFillColor(250, 250, 250)
        doc.rect(margin, yPos - 5, maxWidth, 7, 'F')
      }
      
      xPos = margin + 2
      displayHeaders.forEach((header, index) => {
        const colWidth = normalizedWidths[index]
        const alignment = columnAlignments[index]
        const key = header.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
        let value = String(row[key] || row[header] || '')
        const maxValueWidth = colWidth - 4 // Leave 2mm padding on each side
        
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
    
    // Total row
    const totals = this.calculateTotals(reportData)
    if (Object.keys(totals).length > 0) {
      if (yPos + 10 > contentBottom) {
        doc.addPage()
        yPos = 35
      }
      
      yPos += 2
      doc.setDrawColor(150, 150, 150)
      doc.setLineWidth(0.8)
      doc.line(margin, yPos, pageWidth - margin, yPos)
      yPos += 5
      
      doc.setFillColor(240, 248, 255)
      doc.rect(margin, yPos - 5, maxWidth, 8, 'F')
      
      xPos = margin + 2
      displayHeaders.forEach((header, index) => {
        const colWidth = normalizedWidths[index]
        const alignment = columnAlignments[index]
        
        if (totals[header] !== undefined) {
          const totalInfo = totals[header]
          let totalText: string
          
          // Format based on type
          if (totalInfo.type === 'currency') {
            totalText = `PHP ${totalInfo.value.toFixed(2)}`
          } else if (totalInfo.type === 'count') {
            totalText = totalInfo.value.toString()
          } else {
            // Backward compatibility
            totalText = `PHP ${totalInfo.value.toFixed(2)}`
          }
          
          doc.setFontSize(9)
          doc.setFont(undefined, 'bold')
          
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
          doc.text('TOTAL', xPos, yPos)
        }
        xPos += colWidth + columnPadding
      })
      yPos += 8
      
      doc.setDrawColor(150, 150, 150)
      doc.setLineWidth(0.8)
      doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2)
    }
    
    return yPos
  }

  private calculateTotals(reportData: ReportData): Record<string, { value: number; type: 'currency' | 'count' }> {
    const totals: Record<string, { value: number; type: 'currency' | 'count' }> = {}
    const currencyKeywords = ['revenue', 'expenses', 'profit', 'spent', 'cashflow', 'balance', 'amount', 'price', 'cost', 'total revenue', 'total spent']
    const countKeywords = ['orders', 'count', 'quantity', 'items']
    
    reportData.headers.forEach(header => {
      const headerLower = header.toLowerCase()
      
      // Check if it's a currency column
      const isCurrencyColumn = currencyKeywords.some(keyword => headerLower.includes(keyword))
      
      // Check if it's a count column (but not if it's also a currency column)
      const isCountColumn = !isCurrencyColumn && countKeywords.some(keyword => headerLower.includes(keyword))
      
      // Special handling for "total" columns
      const hasTotal = headerLower.includes('total')
      const isTotalCurrency = hasTotal && currencyKeywords.some(keyword => headerLower.includes(keyword))
      const isTotalCount = hasTotal && countKeywords.some(keyword => headerLower.includes(keyword))
      
      // Special handling for "paid orders", "unpaid orders", "partial orders" - these are counts
      const isOrderCount = headerLower.includes('orders') && (headerLower.includes('paid') || headerLower.includes('unpaid') || headerLower.includes('partial'))
      
      if (isCurrencyColumn || isTotalCurrency) {
        // Currency column
        let total = 0
        reportData.rows.forEach(row => {
          const key = header.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
          const value = row[key] || row[header] || ''
          total += this.extractNumericValue(value)
        })
        totals[header] = { value: total, type: 'currency' }
      } else if (isCountColumn || isTotalCount || isOrderCount) {
        // Count column
        let total = 0
        reportData.rows.forEach(row => {
          const key = header.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
          const value = row[key] || row[header] || ''
          const numValue = this.extractNumericValue(value)
          total += Math.round(numValue) // Round to ensure integer counts
        })
        totals[header] = { value: total, type: 'count' }
      }
    })
    
    return totals
  }

  private extractNumericValue(value: any): number {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const cleaned = value.replace(/[₱PHP,]/g, '').trim()
      return parseFloat(cleaned) || 0
    }
    return 0
  }

  private drawFooters(doc: any, reportData: ReportData, pageWidth: number, pageHeight: number, footerHeight: number, margin: number): void {
    const totalPages = doc.internal.pages.length - 1
    
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      
      // Footer line
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.5)
      doc.line(margin, pageHeight - footerHeight + 5, pageWidth - margin, pageHeight - footerHeight + 5)
      
      // Page number
      doc.setFontSize(9)
      doc.setFont(undefined, 'normal')
      doc.setTextColor(100, 100, 100)
      const pageText = `Page ${i} of ${totalPages}`
      const pageWidth_text = doc.getTextWidth(pageText)
      doc.text(pageText, (pageWidth - pageWidth_text) / 2, pageHeight - 10)
      
      // Tracking ID
      doc.setFontSize(8)
      doc.setFont(undefined, 'italic')
      doc.text(`Tracking: ${reportData.metadata.trackingId}`, margin, pageHeight - 10)
      
      // Timestamp
      const timestamp = reportData.metadata.generatedAt
      const timestampWidth = doc.getTextWidth(timestamp)
      doc.text(timestamp, pageWidth - margin - timestampWidth, pageHeight - 10)
      
      doc.setTextColor(0, 0, 0)
    }
  }
}

