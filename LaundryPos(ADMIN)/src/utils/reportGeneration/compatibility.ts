/**
 * Compatibility Layer
 * Wraps the new report generation system for easy integration with existing code
 */

import { ReportService } from './reportService'
import { ReportType, ExportFormat, DateRange } from './types'

/**
 * Get raw data based on report type from generated report data
 */
function getRawDataForReport(reportType: ReportType, generatedReportData: any): any {
  switch (reportType) {
    case 'orders':
      return generatedReportData.orders || []
    case 'customers':
      return generatedReportData.allCustomers || generatedReportData.topCustomers || []
    case 'expenses':
      return generatedReportData.expenses || []
    case 'services':
      return generatedReportData.services || []
    case 'employee':
      return generatedReportData.employees || []
    case 'revenue':
      return generatedReportData.dailyBreakdown || []
    case 'sales-per-branch':
      return generatedReportData.branches || []
    case 'cashflow-per-branch':
      return generatedReportData.branches || []
    default:
      return []
  }
}

/**
 * Export report using the new system (compatibility wrapper)
 */
export async function exportReport(
  reportType: ReportType,
  generatedReportData: any,
  dateFrom: string,
  dateTo: string,
  exportFormat: ExportFormat,
  user: { username?: string; role?: string },
  filename?: string
): Promise<void> {
  // Validate parameters
  const dateRange: DateRange = { from: dateFrom, to: dateTo }
  const validation = ReportService.validateParameters(reportType, dateRange, exportFormat)
  
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // Get raw data
  const rawData = getRawDataForReport(reportType, generatedReportData)
  
  if (!rawData || (Array.isArray(rawData) && rawData.length === 0)) {
    throw new Error(`No data available for ${reportType} report`)
  }

  // Get summary
  const summary = generatedReportData.summary || {}

  // Generate report
  const result = await ReportService.generateReport(
    reportType,
    rawData,
    summary,
    dateRange,
    user,
    exportFormat,
    { filename }
  )

  if (!result.success) {
    throw new Error(result.error || 'Failed to generate report')
  }
}

/**
 * Preview report using the new system
 */
export async function previewReport(
  reportType: ReportType,
  generatedReportData: any,
  dateFrom: string,
  dateTo: string,
  exportFormat: ExportFormat,
  user: { username?: string; role?: string }
): Promise<string> {
  const dateRange: DateRange = { from: dateFrom, to: dateTo }
  const rawData = getRawDataForReport(reportType, generatedReportData)
  const summary = generatedReportData.summary || {}

  return await ReportService.generatePreview(
    reportType,
    rawData,
    summary,
    dateRange,
    user,
    exportFormat
  )
}

/**
 * Format report data without exporting (for previews)
 */
export function formatReportData(
  reportType: ReportType,
  generatedReportData: any,
  dateFrom: string,
  dateTo: string,
  user: { username?: string; role?: string }
) {
  const dateRange: DateRange = { from: dateFrom, to: dateTo }
  const rawData = getRawDataForReport(reportType, generatedReportData)
  const summary = generatedReportData.summary || {}

  return ReportService.formatReportData(
    reportType,
    rawData,
    summary,
    dateRange,
    user
  )
}

