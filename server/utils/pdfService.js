const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate PDF from invoice data using PDFKit (more reliable than Puppeteer)
 * @param {Object} invoiceData - Invoice data object
 * @param {Object} stationInfo - Station information
 * @returns {Promise<Buffer>} PDF buffer
 */
const generateInvoicePDF = async (invoiceData, stationInfo) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });
      
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      const stationName = stationInfo?.name ? ` - ${stationInfo.name}` : '';
      const stationAddress = stationInfo?.address || '123 Laundry Street, Clean City';
      const stationPhone = stationInfo?.phone || '+63 912 345 6789';
      const stationEmail = stationInfo?.email || 'sparklean@example.com';
      
      // Header
      doc.fontSize(20).font('Helvetica-Bold')
         .fillColor('#007bff')
         .text('Sparklean Laundry Shop' + stationName, { align: 'center' });
      
      doc.moveDown(0.5);
      doc.fontSize(16).font('Helvetica-Bold')
         .fillColor('#000000')
         .text('INVOICE', { align: 'center' });
      
      doc.moveDown(1);
      
      // Company Info
      doc.fontSize(10).font('Helvetica')
         .fillColor('#000000')
         .text(stationAddress, { align: 'center' });
      doc.text(`Phone: ${stationPhone}`, { align: 'center' });
      doc.text(`Email: ${stationEmail}`, { align: 'center' });
      
      doc.moveDown(1);
      
      // Invoice Info
      doc.fontSize(10).font('Helvetica')
         .text(`Invoice #: ${invoiceData.id}`, 50, doc.y);
      doc.text(`Date: ${invoiceData.date}`, 50, doc.y);
      doc.text(`Due Date: ${invoiceData.dueDate}`, 50, doc.y);
      doc.text(`Payment Status: ${invoiceData.paymentStatus}`, 50, doc.y);
      
      doc.moveDown(1);
      
      // Bill To Section
      doc.fontSize(12).font('Helvetica-Bold')
         .text('BILL TO:', 50, doc.y);
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica')
         .text(invoiceData.customer.name, 50, doc.y);
      if (invoiceData.customer.email) {
        doc.text(`Email: ${invoiceData.customer.email}`, 50, doc.y);
      }
      if (invoiceData.customer.phone) {
        doc.text(`Phone: ${invoiceData.customer.phone}`, 50, doc.y);
      }
      if (invoiceData.customer.address) {
        doc.text(`Address: ${invoiceData.customer.address}`, 50, doc.y);
      }
      
      doc.moveDown(1.5);
      
      // Table Header
      const tableTop = doc.y;
      doc.fontSize(10).font('Helvetica-Bold')
         .fillColor('#ffffff')
         .rect(50, tableTop, 495, 20).fill('#007bff')
         .text('Service', 55, tableTop + 5)
         .text('Quantity', 200, tableTop + 5)
         .text('Unit Price', 320, tableTop + 5, { align: 'right' })
         .text('Amount', 420, tableTop + 5, { align: 'right' });
      
      doc.fillColor('#000000');
      let currentY = tableTop + 25;
      
      // Table Rows
      invoiceData.items.forEach((item, index) => {
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }
        
        const serviceName = String(item.service || '').substring(0, 30);
        const quantity = String(item.quantity || '');
        const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
        const amount = typeof item.amount === 'number' ? item.amount : 0;
        
        doc.fontSize(9).font('Helvetica')
           .text(serviceName, 55, currentY, { width: 140 })
           .text(quantity, 200, currentY, { width: 110 })
           .text(`₱${unitPrice.toFixed(2)}`, 320, currentY, { width: 90, align: 'right' })
           .text(`₱${amount.toFixed(2)}`, 420, currentY, { width: 120, align: 'right' });
        
        currentY += 20;
      });
      
      doc.moveDown(1);
      
      // Summary Section
      const summaryY = doc.y;
      const subtotal = typeof invoiceData.subtotal === 'number' ? invoiceData.subtotal : 0;
      const discount = typeof invoiceData.discount === 'number' ? invoiceData.discount : 0;
      const tax = typeof invoiceData.tax === 'number' ? invoiceData.tax : 0;
      const total = typeof invoiceData.total === 'number' ? invoiceData.total : 0;
      const balance = typeof invoiceData.balance === 'number' ? invoiceData.balance : 0;
      
      doc.fontSize(10).font('Helvetica')
         .text('Subtotal:', 350, summaryY)
         .text(`₱${subtotal.toFixed(2)}`, 420, summaryY, { align: 'right', width: 120 });
      
      if (discount > 0) {
        const discountText = `Discount ${invoiceData.discountCode ? `(${invoiceData.discountCode})` : ''}:`;
        doc.text(discountText, 350, doc.y + 15)
           .text(`-₱${discount.toFixed(2)}`, 420, doc.y - 15, { align: 'right', width: 120 });
      }
      
      doc.text('Tax (0%):', 350, doc.y + 15)
         .text(`₱${tax.toFixed(2)}`, 420, doc.y - 15, { align: 'right', width: 120 });
      
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica-Bold')
         .text('Total:', 350, doc.y)
         .text(`₱${total.toFixed(2)}`, 420, doc.y, { align: 'right', width: 120 });
      
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica-Bold')
         .fillColor('#d32f2f')
         .text('Balance Due:', 350, doc.y)
         .text(`₱${balance.toFixed(2)}`, 420, doc.y, { align: 'right', width: 120 });
      
      doc.fillColor('#000000');
      doc.moveDown(1);
      
      // Notes
      if (invoiceData.notes) {
        doc.fontSize(10).font('Helvetica-Bold')
           .text('Notes:', 50, doc.y);
        doc.fontSize(9).font('Helvetica')
           .text(invoiceData.notes, 50, doc.y + 15, { width: 495 });
      }
      
      doc.moveDown(2);
      
      // Footer
      doc.fontSize(9).font('Helvetica')
         .fillColor('#666666')
         .text('Thank you for your business!', { align: 'center' });
      doc.text(`For questions, contact us at ${stationPhone} or ${stationEmail}`, { align: 'center' });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateInvoicePDF
};
