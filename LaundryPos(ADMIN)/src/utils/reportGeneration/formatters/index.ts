/**
 * Report Formatters Index
 * Centralized export of all formatters
 */

import { OrdersFormatter } from './ordersFormatter'
import { CustomersFormatter } from './customersFormatter'
import { ExpensesFormatter } from './expensesFormatter'
import { ServicesFormatter } from './servicesFormatter'
import { RevenueFormatter } from './revenueFormatter'
import { EmployeeFormatter } from './employeeFormatter'
import { SalesPerBranchFormatter } from './salesPerBranchFormatter'
import { CashflowPerBranchFormatter } from './cashflowPerBranchFormatter'
import { ReportFormatter, ReportType } from '../types'

export class FormatterFactory {
  private static formatters: Map<ReportType, ReportFormatter> = new Map([
    ['orders', new OrdersFormatter()],
    ['customers', new CustomersFormatter()],
    ['expenses', new ExpensesFormatter()],
    ['services', new ServicesFormatter()],
    ['revenue', new RevenueFormatter()],
    ['employee', new EmployeeFormatter()],
    ['sales-per-branch', new SalesPerBranchFormatter()],
    ['cashflow-per-branch', new CashflowPerBranchFormatter()],
  ])

  static getFormatter(reportType: ReportType): ReportFormatter {
    const formatter = this.formatters.get(reportType)
    if (!formatter) {
      throw new Error(`No formatter found for report type: ${reportType}`)
    }
    return formatter
  }

  static registerFormatter(reportType: ReportType, formatter: ReportFormatter): void {
    this.formatters.set(reportType, formatter)
  }
}

export { 
  OrdersFormatter, 
  CustomersFormatter, 
  ExpensesFormatter, 
  ServicesFormatter,
  RevenueFormatter,
  EmployeeFormatter,
  SalesPerBranchFormatter,
  CashflowPerBranchFormatter
}

