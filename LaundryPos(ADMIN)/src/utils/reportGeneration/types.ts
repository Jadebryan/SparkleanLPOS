/**
 * Comprehensive Report Generation System - Type Definitions
 * Based on enterprise report generation best practices
 */

export type ExportFormat = 'PDF' | 'CSV' | 'Excel'

export type ReportType = 
  | 'orders' 
  | 'revenue' 
  | 'customers' 
  | 'expenses' 
  | 'services' 
  | 'employee' 
  | 'sales-per-branch' 
  | 'cashflow-per-branch'

export interface DateRange {
  from: string
  to: string
}

export interface ReportMetadata {
  trackingId: string
  generatedBy: string
  generatedAt: string
  digitalSignature: string
  dateRange: string
  reportType: ReportType
  reportTitle: string
}

export interface ReportSummary {
  [key: string]: string | number
}

export interface ReportData {
  rows: any[]
  summary: ReportSummary
  headers: string[]
  metadata: ReportMetadata
}

export interface ExportOptions {
  format: ExportFormat
  filename?: string
  includeSummary?: boolean
  includeMetadata?: boolean
  pageSize?: 'A4' | 'Letter'
  orientation?: 'portrait' | 'landscape'
}

export interface ReportFormatter {
  format(data: any, summary: any, metadata: ReportMetadata): ReportData
  getHeaders(): string[]
  calculateTotals(data: any[]): Record<string, number>
}

export interface ExportGenerator {
  generate(reportData: ReportData, options: ExportOptions): Promise<string | Blob>
  preview(reportData: ReportData, options: ExportOptions): Promise<string>
}

export interface ReportGenerationResult {
  success: boolean
  data?: ReportData
  error?: string
  previewUrl?: string
}

