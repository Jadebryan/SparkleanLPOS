/**
 * Report Generation System - Main Export
 * Comprehensive, modular report generation following enterprise best practices
 */

export { ReportService } from './reportService'
export { FormatterFactory } from './formatters'
export { GeneratorFactory } from './generators'
export * from './types'
export * from './compatibility'
export * from './helpers'

// Re-export for convenience
export { 
  OrdersFormatter,
  CustomersFormatter,
  ExpensesFormatter,
  ServicesFormatter,
  RevenueFormatter,
  EmployeeFormatter,
  SalesPerBranchFormatter,
  CashflowPerBranchFormatter
} from './formatters'

export {
  PDFGenerator,
  CSVGenerator,
  ExcelGenerator,
  JSONGenerator
} from './generators'

