/**
 * Export Generators Index
 */

import { PDFGenerator } from './pdfGenerator'
import { CSVGenerator } from './csvGenerator'
import { ExcelGenerator } from './excelGenerator'
import { JSONGenerator } from './jsonGenerator'
import { ExportGenerator, ExportFormat } from '../types'

export class GeneratorFactory {
  private static generators: Map<ExportFormat, ExportGenerator> = new Map([
    ['PDF', new PDFGenerator()],
    ['CSV', new CSVGenerator()],
    ['Excel', new ExcelGenerator()],
    ['JSON', new JSONGenerator()]
  ])

  static getGenerator(format: ExportFormat): ExportGenerator {
    const generator = this.generators.get(format)
    if (!generator) {
      throw new Error(`No generator found for format: ${format}`)
    }
    return generator
  }

  static registerGenerator(format: ExportFormat, generator: ExportGenerator): void {
    this.generators.set(format, generator)
  }
}

export { PDFGenerator, CSVGenerator, ExcelGenerator, JSONGenerator }

