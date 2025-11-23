/**
 * Base Report Formatter
 * Provides common functionality for all report formatters
 */

import { ReportFormatter, ReportData, ReportMetadata, ReportSummary } from '../types'

export abstract class BaseFormatter implements ReportFormatter {
  protected abstract formatData(data: any, summary: any): any[]
  protected abstract getDefaultHeaders(): string[]
  protected abstract getSummaryFields(): string[]

  format(data: any, summary: any, metadata: ReportMetadata): ReportData {
    const formattedRows = this.formatData(data, summary)
    const headers = this.getHeaders()
    const calculatedSummary = this.calculateSummary(data, summary)
    const totals = this.calculateTotals(formattedRows)

    return {
      rows: formattedRows,
      summary: { ...calculatedSummary, ...totals },
      headers,
      metadata
    }
  }

  getHeaders(): string[] {
    return this.getDefaultHeaders()
  }

  calculateTotals(data: any[]): Record<string, number> {
    const totals: Record<string, number> = {}
    const amountKeywords = ['total', 'amount', 'revenue', 'expenses', 'profit', 'spent', 'cashflow', 'paid', 'balance']
    
    this.getHeaders().forEach(header => {
      const headerLower = header.toLowerCase()
      const isAmountColumn = amountKeywords.some(keyword => headerLower.includes(keyword))
      
      if (isAmountColumn) {
        let total = 0
        data.forEach(row => {
          const key = this.normalizeKey(header)
          const value = row[key] || row[header] || ''
          total += this.extractNumericValue(value)
        })
        totals[header] = total
      }
    })
    
    return totals
  }

  protected calculateSummary(data: any, summary: any): ReportSummary {
    const calculated: ReportSummary = {}
    this.getSummaryFields().forEach(field => {
      if (summary && summary[field] !== undefined) {
        calculated[field] = summary[field]
      }
    })
    return calculated
  }

  protected extractNumericValue(value: any): number {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const cleaned = value.replace(/[₱PHP,]/g, '').trim()
      return parseFloat(cleaned) || 0
    }
    return 0
  }

  protected normalizeKey(key: string): string {
    return key.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
  }

  protected formatCurrency(value: any): string {
    if (value === null || value === undefined) return '₱0.00'
    if (typeof value === 'string' && value.trim().startsWith('₱')) return value.trim()
    if (typeof value === 'number') return `₱${value.toFixed(2)}`
    
    const str = String(value).trim()
    if (str.toUpperCase().includes('PHP')) {
      const num = parseFloat(str.replace(/[^\d.]/g, '')) || 0
      return `₱${num.toFixed(2)}`
    }
    
    const num = parseFloat(str.replace(/[^\d.]/g, '')) || 0
    return `₱${num.toFixed(2)}`
  }

  protected formatCurrencyForExport(value: any): string {
    const peso = this.formatCurrency(value)
    return peso.replace('₱', 'PHP ')
  }
}

