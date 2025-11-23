/**
 * Report Generation Service
 * Main orchestrator for report generation following enterprise patterns
 */

import { 
  ReportType, 
  ExportFormat, 
  ReportData, 
  ReportMetadata, 
  ExportOptions,
  ReportGenerationResult,
  DateRange
} from './types'
import { FormatterFactory } from './formatters'
import { GeneratorFactory } from './generators'

export class ReportService {
  /**
   * Generate a complete report with formatting and export
   */
  static async generateReport(
    reportType: ReportType,
    rawData: any,
    summary: any,
    dateRange: DateRange,
    user: { username?: string; role?: string },
    exportFormat: ExportFormat,
    options?: Partial<ExportOptions>
  ): Promise<ReportGenerationResult> {
    try {
      // Create metadata
      const metadata = this.createMetadata(reportType, dateRange, user)
      
      // Get formatter and format data
      const formatter = FormatterFactory.getFormatter(reportType)
      const reportData = formatter.format(rawData, summary, metadata)
      
      // Get generator and export
      const generator = GeneratorFactory.getGenerator(exportFormat)
      const exportOptions: ExportOptions = {
        format: exportFormat,
        includeSummary: true,
        includeMetadata: true,
        ...options
      }
      
      await generator.generate(reportData, exportOptions)
      
      return {
        success: true,
        data: reportData
      }
    } catch (error: any) {
      console.error('Report generation error:', error)
      return {
        success: false,
        error: error.message || 'Failed to generate report'
      }
    }
  }

  /**
   * Generate preview URL for a report
   */
  static async generatePreview(
    reportType: ReportType,
    rawData: any,
    summary: any,
    dateRange: DateRange,
    user: { username?: string; role?: string },
    exportFormat: ExportFormat,
    options?: Partial<ExportOptions>
  ): Promise<string> {
    // Create metadata
    const metadata = this.createMetadata(reportType, dateRange, user)
    
    // Get formatter and format data
    const formatter = FormatterFactory.getFormatter(reportType)
    const reportData = formatter.format(rawData, summary, metadata)
    
    // Get generator and create preview
    const generator = GeneratorFactory.getGenerator(exportFormat)
    const exportOptions: ExportOptions = {
      format: exportFormat,
      includeSummary: true,
      includeMetadata: true,
      ...options
    }
    
    return await generator.preview(reportData, exportOptions)
  }

  /**
   * Format report data without exporting
   */
  static formatReportData(
    reportType: ReportType,
    rawData: any,
    summary: any,
    dateRange: DateRange,
    user: { username?: string; role?: string }
  ): ReportData {
    const metadata = this.createMetadata(reportType, dateRange, user)
    const formatter = FormatterFactory.getFormatter(reportType)
    return formatter.format(rawData, summary, metadata)
  }

  /**
   * Create report metadata
   */
  private static createMetadata(
    reportType: ReportType,
    dateRange: DateRange,
    user: { username?: string; role?: string }
  ): ReportMetadata {
    const actor = user?.username 
      ? `${user.username}${user.role ? ` (${user.role})` : ''}` 
      : 'System Admin'
    
    const timestamp = new Date().toISOString()
    const dateRangeLabel = `${dateRange.from} → ${dateRange.to}`
    
    const reportTitles: Record<ReportType, string> = {
      'orders': 'Orders',
      'revenue': 'Revenue',
      'customers': 'Customers',
      'expenses': 'Expenses',
      'services': 'Services',
      'employee': 'Employee',
      'sales-per-branch': 'Sales per Branch',
      'cashflow-per-branch': 'Cashflow per Branch'
    }
    
    return {
      trackingId: `SPKLN-${Date.now().toString(36).toUpperCase()}`,
      generatedBy: actor,
      generatedAt: new Date().toLocaleString(),
      digitalSignature: `Digitally signed by ${actor} on ${new Date().toLocaleString()}`,
      dateRange: dateRangeLabel,
      reportType,
      reportTitle: reportTitles[reportType] || 'Report'
    }
  }

  /**
   * Validate report generation parameters
   */
  static validateParameters(
    reportType: ReportType,
    dateRange: DateRange,
    exportFormat: ExportFormat
  ): { valid: boolean; error?: string } {
    if (!reportType) {
      return { valid: false, error: 'Report type is required' }
    }
    
    if (!dateRange.from || !dateRange.to) {
      return { valid: false, error: 'Date range is required' }
    }
    
    if (new Date(dateRange.from) > new Date(dateRange.to)) {
      return { valid: false, error: 'Start date must be before end date' }
    }
    
    if (!exportFormat) {
      return { valid: false, error: 'Export format is required' }
    }
    
    return { valid: true }
  }
}

