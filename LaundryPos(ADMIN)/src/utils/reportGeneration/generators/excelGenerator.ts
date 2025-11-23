/**
 * Excel Export Generator
 */

import { BaseGenerator } from './baseGenerator'
import { ExportGenerator, ReportData, ExportOptions } from '../types'

export class ExcelGenerator extends BaseGenerator implements ExportGenerator {
  async generate(reportData: ReportData, options: ExportOptions): Promise<string | Blob> {
    this.validateReportData(reportData)
    
    const htmlContent = this.buildExcelHTML(reportData)
    const filename = this.getFilename(reportData, options, 'xls')
    
    // Add UTF-8 BOM
    const BOM = '\uFEFF'
    const htmlWithBOM = BOM + htmlContent
    
    this.downloadFile(htmlWithBOM, filename, 'application/vnd.ms-excel;charset=utf-8')
    
    return new Blob([htmlWithBOM], { type: 'application/vnd.ms-excel' })
  }

  async preview(reportData: ReportData, options: ExportOptions): Promise<string> {
    const htmlContent = this.buildExcelHTML(reportData)
    return `data:application/vnd.ms-excel;charset=utf-8,${encodeURIComponent(htmlContent)}`
  }

  private buildExcelHTML(reportData: ReportData): string {
    const headers = reportData.headers
    const totals = this.calculateTotals(reportData)
    const hasTotals = Object.keys(totals).length > 0
    
    const escapeHtml = (value: any): string => {
      if (value === null || value === undefined) return ''
      const str = String(value)
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
    }
    
    const rows = reportData.rows.map(row => {
      return `
        <tr>
          ${headers.map(header => {
            const key = header.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
            const value = row[key] || row[header] || ''
            const isAmount = this.isAmountColumn(header)
            return `<td${isAmount ? ' class="number"' : ''}>${escapeHtml(value)}</td>`
          }).join('')}
        </tr>
      `
    }).join('')
    
    const totalRow = hasTotals ? `
      <tr class="total-row">
        ${headers.map(header => {
          if (totals[header] !== undefined) {
            return `<td class="number"><strong>PHP ${totals[header].toFixed(2)}</strong></td>`
          }
          return header === headers[0] ? `<td><strong>TOTAL</strong></td>` : '<td></td>'
        }).join('')}
      </tr>
    ` : ''
    
    return `<?xml version="1.0" encoding="UTF-8"?>
      <?mso-application progid="Excel.Sheet"?>
      <html xmlns:o="urn:schemas-microsoft-com:office:office" 
            xmlns:x="urn:schemas-microsoft-com:office:excel" 
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <meta name="ProgId" content="Excel.Sheet">
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
          th { background-color: #f2f2f2; font-weight: bold; border: 1px solid #ddd; padding: 8px; text-align: left; }
          td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .number { text-align: right; }
          .total-row { background-color: #e8f4f8; font-weight: bold; }
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
            ${rows}
            ${totalRow}
          </tbody>
        </table>
      </body>
      </html>
    `
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

