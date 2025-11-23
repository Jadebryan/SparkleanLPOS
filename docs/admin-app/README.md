# Report Generation System

A comprehensive, modular report generation system following enterprise best practices.

## Architecture

The system is built with a clear separation of concerns:

```
reportGeneration/
├── types.ts              # Type definitions and interfaces
├── reportService.ts      # Main orchestrator service
├── compatibility.ts      # Compatibility layer for existing code
├── formatters/          # Report type-specific formatters
│   ├── baseFormatter.ts
│   ├── ordersFormatter.ts
│   ├── customersFormatter.ts
│   ├── expensesFormatter.ts
│   ├── servicesFormatter.ts
│   ├── revenueFormatter.ts
│   ├── employeeFormatter.ts
│   ├── salesPerBranchFormatter.ts
│   ├── cashflowPerBranchFormatter.ts
│   └── index.ts
└── generators/           # Export format generators
    ├── baseGenerator.ts
    ├── pdfGenerator.ts
    ├── csvGenerator.ts
    ├── excelGenerator.ts
    ├── jsonGenerator.ts
    └── index.ts
```

## Features

### ✅ All Current Features Retained
- Multiple report types (Orders, Revenue, Customers, Expenses, Services, Employee, Sales per Branch, Cashflow per Branch)
- Multiple export formats (PDF, CSV, Excel, JSON)
- Preview functionality
- Date range filtering
- Summary statistics
- Total amounts at bottom of tables
- Digital signatures and tracking IDs
- Page numbering and headers/footers

### 🚀 New Improvements
- **Modular Architecture**: Easy to extend and maintain
- **Type Safety**: Full TypeScript support
- **Separation of Concerns**: Formatters, generators, and service are independent
- **Factory Pattern**: Easy to add new report types or export formats
- **Error Handling**: Comprehensive validation and error messages
- **Best Practices**: Follows enterprise report generation patterns

## Usage

### Basic Usage

```typescript
import { ReportService } from './utils/reportGeneration'
import { ReportType, ExportFormat } from './utils/reportGeneration/types'

// Generate and export a report
const result = await ReportService.generateReport(
  'orders' as ReportType,
  rawData,
  summary,
  { from: '2024-01-01', to: '2024-01-31' },
  { username: 'admin', role: 'admin' },
  'PDF' as ExportFormat,
  { filename: 'orders_report' }
)
```

### Using Compatibility Layer

```typescript
import { exportReport, previewReport } from './utils/reportGeneration/compatibility'

// Export report (automatically handles data extraction)
await exportReport(
  'orders',
  generatedReportData,
  '2024-01-01',
  '2024-01-31',
  'PDF',
  { username: 'admin', role: 'admin' },
  'orders_report'
)

// Preview report
const previewUrl = await previewReport(
  'orders',
  generatedReportData,
  '2024-01-01',
  '2024-01-31',
  'PDF',
  { username: 'admin', role: 'admin' }
)
```

## Adding New Report Types

1. Create a new formatter in `formatters/`:

```typescript
import { BaseFormatter } from './baseFormatter'

export class MyReportFormatter extends BaseFormatter {
  protected formatData(data: any, summary: any): any[] {
    // Format your data here
    return data.map(item => ({
      'Column 1': item.field1,
      'Column 2': item.field2,
      // ...
    }))
  }

  protected getDefaultHeaders(): string[] {
    return ['Column 1', 'Column 2', /* ... */]
  }

  protected getSummaryFields(): string[] {
    return ['totalItems', 'totalAmount', /* ... */]
  }
}
```

2. Register it in `formatters/index.ts`:

```typescript
import { MyReportFormatter } from './myReportFormatter'

FormatterFactory.registerFormatter('my-report', new MyReportFormatter())
```

## Adding New Export Formats

1. Create a new generator in `generators/`:

```typescript
import { BaseGenerator } from './baseGenerator'
import { ExportGenerator, ReportData, ExportOptions } from '../types'

export class MyFormatGenerator extends BaseGenerator implements ExportGenerator {
  async generate(reportData: ReportData, options: ExportOptions): Promise<string | Blob> {
    // Generate export here
  }

  async preview(reportData: ReportData, options: ExportOptions): Promise<string> {
    // Generate preview URL here
  }
}
```

2. Register it in `generators/index.ts`:

```typescript
import { MyFormatGenerator } from './myFormatGenerator'

GeneratorFactory.registerGenerator('MyFormat', new MyFormatGenerator())
```

## Report Types

- `orders` - Orders Report
- `revenue` - Revenue Report
- `customers` - Customers Report
- `expenses` - Expenses Report
- `services` - Services Report
- `employee` - Employee Report
- `sales-per-branch` - Sales per Branch Report
- `cashflow-per-branch` - Cashflow per Branch Report

## Export Formats

- `PDF` - Portable Document Format (with totals, headers, footers)
- `CSV` - Comma-separated values (with total row)
- `Excel` - Microsoft Excel format (with total row)
- `JSON` - JavaScript Object Notation (full data structure)

## Best Practices

1. **Always validate data** before generating reports
2. **Use the compatibility layer** for easy integration
3. **Extend BaseFormatter** when creating new formatters
4. **Extend BaseGenerator** when creating new generators
5. **Handle errors gracefully** with try-catch blocks
6. **Provide meaningful error messages** to users

## Migration from Old System

The new system is backward compatible. The `compatibility.ts` layer automatically:
- Extracts data from the old format
- Converts it to the new format
- Falls back to the old system if needed

No changes required to existing code - it will automatically use the new system when available.

