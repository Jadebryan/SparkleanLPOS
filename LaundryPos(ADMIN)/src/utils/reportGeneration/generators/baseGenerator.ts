/**
 * Base Export Generator
 * Provides common functionality for all export generators
 */

import { ExportGenerator, ReportData, ExportOptions } from '../types'

export abstract class BaseGenerator implements ExportGenerator {
  abstract generate(reportData: ReportData, options: ExportOptions): Promise<string | Blob>
  abstract preview(reportData: ReportData, options: ExportOptions): Promise<string>

  protected validateReportData(reportData: ReportData): void {
    if (!reportData) {
      throw new Error('Report data is required')
    }
    if (!reportData.rows || !Array.isArray(reportData.rows)) {
      throw new Error('Report data must contain rows array')
    }
    if (!reportData.headers || !Array.isArray(reportData.headers)) {
      throw new Error('Report data must contain headers array')
    }
  }

  protected getFilename(reportData: ReportData, options: ExportOptions, extension: string): string {
    if (options.filename) {
      return `${options.filename}.${extension}`
    }
    const dateRange = reportData.metadata.dateRange.replace(/\s+/g, '_').replace(/[→]/g, 'to')
    const title = reportData.metadata.reportTitle.replace(/\s+/g, '_')
    return `${title}_${dateRange}.${extension}`
  }

  protected formatCurrency(value: number): string {
    return `PHP ${value.toFixed(2)}`
  }
}

