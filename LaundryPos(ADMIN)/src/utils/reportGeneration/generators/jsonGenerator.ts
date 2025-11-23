/**
 * JSON Export Generator
 */

import { BaseGenerator } from './baseGenerator'
import { ExportGenerator, ReportData, ExportOptions } from '../types'

export class JSONGenerator extends BaseGenerator implements ExportGenerator {
  async generate(reportData: ReportData, options: ExportOptions): Promise<string | Blob> {
    this.validateReportData(reportData)
    
    const jsonData: any = {
      metadata: reportData.metadata,
      summary: options.includeSummary !== false ? reportData.summary : undefined,
      data: reportData.rows,
      headers: reportData.headers,
      generatedAt: new Date().toISOString()
    }
    
    const jsonContent = JSON.stringify(jsonData, null, 2)
    const filename = this.getFilename(reportData, options, 'json')
    
    this.downloadFile(jsonContent, filename, 'application/json')
    
    return new Blob([jsonContent], { type: 'application/json' })
  }

  async preview(reportData: ReportData, options: ExportOptions): Promise<string> {
    const jsonData: any = {
      metadata: reportData.metadata,
      summary: options.includeSummary !== false ? reportData.summary : undefined,
      data: reportData.rows,
      headers: reportData.headers
    }
    
    const jsonContent = JSON.stringify(jsonData, null, 2)
    return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`
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

