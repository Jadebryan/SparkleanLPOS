/**
 * CSV Export Generator
 */

import { BaseGenerator } from './baseGenerator'
import { ExportGenerator, ReportData, ExportOptions } from '../types'

export class CSVGenerator extends BaseGenerator implements ExportGenerator {
  async generate(reportData: ReportData, options: ExportOptions): Promise<string | Blob> {
    this.validateReportData(reportData)
    
    const csvContent = this.buildCSVContent(reportData)
    const filename = this.getFilename(reportData, options, 'csv')
    
    // Add UTF-8 BOM for proper encoding
    const BOM = '\uFEFF'
    const csvWithBOM = BOM + csvContent
    
    this.downloadFile(csvWithBOM, filename, 'text/csv;charset=utf-8')
    
    return new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8' })
  }

  async preview(reportData: ReportData, options: ExportOptions): Promise<string> {
    const csvContent = this.buildCSVContent(reportData)
    return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`
  }

  private buildCSVContent(reportData: ReportData): string {
    const headers = reportData.headers
    const rows = reportData.rows.map(row => {
      return headers.map(header => {
        const key = header.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
        const value = row[key] || row[header] || ''
        const stringValue = String(value).replace(/"/g, '""')
        return `"${stringValue}"`
      }).join(',')
    })
    
    // Add total row
    const totals = this.calculateTotals(reportData)
    const hasTotals = Object.keys(totals).length > 0
    
    if (hasTotals) {
      const totalRow = headers.map(header => {
        if (totals[header] !== undefined) {
          return `"PHP ${totals[header].toFixed(2)}"`
        }
        return header === headers[0] ? '"TOTAL"' : '""'
      }).join(',')
      rows.push(totalRow)
    }
    
    return [headers.join(','), ...rows].join('\n')
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

  private extractNumericValue(value: any): number {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const cleaned = value.replace(/[₱PHP,]/g, '').trim()
      return parseFloat(cleaned) || 0
    }
    return 0
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType })
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

