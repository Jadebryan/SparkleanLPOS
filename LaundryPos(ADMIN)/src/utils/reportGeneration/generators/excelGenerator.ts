/**
 * Excel Export Generator
 * Uses xlsx library to generate proper Excel files
 */

import * as XLSX from 'xlsx'
import { BaseGenerator } from './baseGenerator'
import { ExportGenerator, ReportData, ExportOptions } from '../types'

export class ExcelGenerator extends BaseGenerator implements ExportGenerator {
  async generate(reportData: ReportData, options: ExportOptions): Promise<string | Blob> {
    this.validateReportData(reportData)
    
    const workbook = this.buildWorkbook(reportData)
    const filename = this.getFilename(reportData, options, 'xlsx')
    
    // Write workbook to buffer
    const excelBuffer = XLSX.write(workbook, { 
      type: 'array', 
      bookType: 'xlsx',
      cellStyles: true 
    })
    
    // Create blob and download
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    
    this.downloadFile(blob, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    
    return blob
  }

  async preview(reportData: ReportData, options: ExportOptions): Promise<string> {
    const workbook = this.buildWorkbook(reportData)
    const excelBuffer = XLSX.write(workbook, { 
      type: 'array', 
      bookType: 'xlsx' 
    })
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    return URL.createObjectURL(blob)
  }

  private buildWorkbook(reportData: ReportData): XLSX.WorkBook {
    const headers = reportData.headers
    const totals = this.calculateTotals(reportData)
    const hasTotals = Object.keys(totals).length > 0
    
    // Prepare data rows
    const dataRows = reportData.rows.map(row => {
      return headers.map(header => {
        const key = header.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
        const value = row[key] || row[header] || ''
        // Convert to number if it's a numeric value
        if (this.isAmountColumn(header) && typeof value === 'string') {
          const numValue = this.extractNumericValue(value)
          return numValue !== 0 ? numValue : value
        }
        return value
      })
    })
    
    // Add totals row if needed
    if (hasTotals) {
      const totalRow = headers.map(header => {
        if (totals[header] !== undefined) {
          return totals[header]
        }
        return header === headers[0] ? 'TOTAL' : ''
      })
      dataRows.push(totalRow)
    }
    
    // Create worksheet data with headers
    const worksheetData = [headers, ...dataRows]
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
    
    // Set column widths
    const colWidths = headers.map((header, index) => {
      const maxLength = Math.max(
        header.length,
        ...dataRows.map(row => String(row[index] || '').length)
      )
      return { wch: Math.min(Math.max(maxLength + 2, 10), 50) }
    })
    worksheet['!cols'] = colWidths
    
    // Style header row (bold)
    const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
      if (!worksheet[cellAddress]) continue
      worksheet[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'F2F2F2' } },
        alignment: { horizontal: 'left', vertical: 'center' }
      }
    }
    
    // Style total row if exists
    if (hasTotals) {
      const lastRow = dataRows.length
      for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: lastRow, c: col })
        if (!worksheet[cellAddress]) continue
        worksheet[cellAddress].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: 'E8F4F8' } },
          alignment: { 
            horizontal: this.isAmountColumn(headers[col]) ? 'right' : 'left', 
            vertical: 'center' 
          }
        }
      }
    }
    
    // Style amount columns (right align)
    headers.forEach((header, colIndex) => {
      if (this.isAmountColumn(header)) {
        for (let row = 1; row <= dataRows.length; row++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: colIndex })
          if (worksheet[cellAddress]) {
            if (!worksheet[cellAddress].s) {
              worksheet[cellAddress].s = {}
            }
            worksheet[cellAddress].s.alignment = { 
              horizontal: 'right', 
              vertical: 'center' 
            }
          }
        }
      }
    })
    
    // Create workbook
    const workbook = XLSX.utils.book_new()
    const sheetName = reportData.metadata.reportTitle.substring(0, 31) || 'Sheet1'
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    
    return workbook
  }

  private calculateTotals(reportData: ReportData): Record<string, number> {
    const totals: Record<string, number> = {}
    const amountKeywords = ['total', 'amount', 'revenue', 'expenses', 'profit', 'spent', 'cashflow', 'paid', 'balance']
    
    reportData.headers.forEach(header => {
      const headerLower = header.toLowerCase()
      const isAmountColumn = amountKeywords.some(keyword => headerLower.includes(keyword))
      
      if (isAmountColumn) {
        let total = 0
        reportData.rows.forEach(row => {
          const key = header.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
          const value = row[key] || row[header] || ''
          total += this.extractNumericValue(value)
        })
        totals[header] = total
      }
    })
    
    return totals
  }

  private isAmountColumn(header: string): boolean {
    const amountKeywords = ['total', 'amount', 'revenue', 'expenses', 'profit', 'spent', 'cashflow', 'paid', 'balance']
    const headerLower = header.toLowerCase()
    return amountKeywords.some(keyword => headerLower.includes(keyword))
  }

  private extractNumericValue(value: any): number {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const cleaned = value.replace(/[₱PHP,]/g, '').trim()
      return parseFloat(cleaned) || 0
    }
    return 0
  }

  private downloadFile(blob: Blob, filename: string, mimeType: string): void {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }
}

