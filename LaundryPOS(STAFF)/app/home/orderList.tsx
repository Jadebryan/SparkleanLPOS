import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
  Animated,
  Dimensions,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import BrandIcon from '../components/BrandIcon';
import GlobalStyles from "../styles/GlobalStyle";
import designSystem, { colors, typography, spacing, borderRadius, cardStyles, buttonStyles, badgeStyles, tabletUtils } from '@/app/theme/designSystem';
import { useColors } from '@/app/theme/useColors';
import { useButtonStyles } from '@/app/theme/useButtonStyles';

// Components
import ModernSidebar from "./components/ModernSidebar";
import Header from "./components/Header";
import SearchFilter from "./orderListComponents/searchFilter";
import OrderTable from "./orderListComponents/orderTable";
import ViewTransaction from "./orderListComponents/viewTransaction";
import AddOrderModal from "./addOrderComponents/AddOrderModal";
import { API_BASE_URL } from "@/constants/api";
import { api } from "@/utils/api";
import { exportToCSV, exportToExcel, exportToPDF, getExportFilename } from "@/utils/exportUtils";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermissions } from "@/hooks/usePermissions";
import { logger } from "@/utils/logger";
import { useToast } from "@/app/context/ToastContext";
import { ShimmerStatsCard } from "@/components/ui/ShimmerLoader";
import InlineFilters, { FilterOption } from "@/components/ui/InlineFilters";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { TodaySummary } from "@/components/ui/TodaySummary";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { useRouter } from "expo-router";

// Type for orders
type Order = {
  orderId: string;
  customerName: string;
  createDate: string;
  laundryStatus: string;
  feeStatus: string;
  totalFee: number;
  isCompleted?: boolean;
  change?: number;
  lastEditedBy?: any;
  lastEditedAt?: string | Date;
  __raw?: any;
};

// Helper: print invoice/receipt preview & print (supports both invoice and receipt formats)
const printInvoiceWindow = (invoiceData: any, stationInfo?: any) => {
  // Debug logging
  console.log('printInvoiceWindow called with stationInfo:', stationInfo);
  console.log('printInvoiceWindow invoiceData.format:', invoiceData?.format);
  
  // Prefer explicit format flag; fallback to heuristic
  const format = invoiceData.format || (invoiceData.time !== undefined || invoiceData.change !== undefined ? 'receipt' : 'invoice');
  const isReceipt = format === 'receipt';
  
  console.log('printInvoiceWindow - format:', format, 'isReceipt:', isReceipt);
  const logoSvg = `
  <svg width="40" height="40" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#60A5FA" />
        <stop offset="100%" stop-color={dynamicColors.primary[500]} />
      </linearGradient>
      <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#E0F2FE" />
        <stop offset="100%" stop-color="#BFDBFE" />
      </linearGradient>
    </defs>
    <rect x="4" y="6" width="56" height="48" rx="14" fill="url(#bg)" />
    <g transform="translate(14,14)">
      <rect x="0" y="0" width="36" height="30" rx="6" fill="#F8FAFC" />
      <rect x="0.75" y="0.75" width="34.5" height="28.5" rx="5.25" stroke="#94A3B8" stroke-width="1.5" fill="none" />
      <circle cx="6" cy="6" r="2" fill="#F59E0B" />
      <circle cx="12" cy="6" r="2" fill="#F59E0B" fill-opacity="0.6" />
      <circle cx="20" cy="18" r="9.5" fill="url(#glass)" stroke="#60A5FA" stroke-width="2" />
      <circle cx="20" cy="18" r="6.5" fill="#E8F1FF" fill-opacity="0.6" />
      <circle cx="18" cy="17" r="1.2" fill="#0F172A" />
      <circle cx="22" cy="17" r="1.2" fill="#0F172A" />
      <path d="M17 20c1.2 1 3.8 1 5 0" stroke="#0F172A" stroke-width="1.5" stroke-linecap="round" />
    </g>
    <g fill="#E0F2FE">
      <circle cx="15" cy="14" r="3" />
      <circle cx="22" cy="10" r="2" />
      <circle cx="50" cy="12" r="2.4" />
      <circle cx="48" cy="50" r="2.8" />
    </g>
  </svg>`;

  // Helper
  const parseAmount = (val: any): number => {
    if (typeof val === 'number' && isFinite(val)) return val;
    if (typeof val === 'string') {
      const cleaned = val.replace(/[^0-9.\-]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  if (!isReceipt) {
    console.log('Building INVOICE format with stationInfo:', stationInfo);
    const subtotal = parseAmount(invoiceData.subtotal ?? invoiceData.amount ?? 0);
    const discountAmount = parseAmount(invoiceData.discountAmount ?? (subtotal - parseAmount(invoiceData.total ?? invoiceData.totalFee ?? subtotal)));
    const total = parseAmount(invoiceData.total ?? invoiceData.totalFee ?? (subtotal - discountAmount));
    const paid = parseAmount(invoiceData.paid ?? 0);
    const balance = Math.max(0, total - paid);
    const change = Math.max(0, paid - total);
    const items = Array.isArray(invoiceData.items) ? invoiceData.items : [];

    const serviceItems = items.map((it: any) => {
      const name = it.service || it.name || 'Service';
      const qty = it.quantity || '1';
      const amount = parseAmount(it.amount ?? 0);
      return `
        <div class="service-item">
          <div class="service-name">${name} (${qty})</div>
          <div class="service-price">₱${amount.toFixed(2)}</div>
        </div>`;
    }).join('');

    // Build station info strings
    const stationName = stationInfo?.name ? ` - ${stationInfo.name}` : '';
    const stationAddress = stationInfo?.address || '123 Laundry Street, Clean City';
    const stationPhone = stationInfo?.phone ? `Phone: ${stationInfo.phone}` : 'Phone: +63 912 345 6789';
    
    console.log('Invoice station details:', { stationName, stationAddress, stationPhone });

    const content = `
      <div class="order-receipt">
        <div class="receipt-header">
          <div class="company-info">
            <div class="company-logo">${logoSvg}</div>
            <div class="company-details">
              <h2>Sparklean Laundry Shop${stationName}</h2>
              <p>${stationAddress}</p>
              <p>${stationPhone}</p>
            </div>
          </div>
          <div class="receipt-info">
            <h3>INVOICE</h3>
            <p>Date: ${invoiceData.date || ''}</p>
            ${invoiceData.dueDate ? `<p>Due Date: ${invoiceData.dueDate}</p>` : ''}
            <p>Invoice #: ${invoiceData.invoiceNumber || invoiceData.id || ''}</p>
          </div>
        </div>
        <div class="receipt-content">
          <div class="customer-section">
            <h4>Customer</h4>
            <p><strong>${invoiceData.customer?.name || invoiceData.customer || 'N/A'}</strong></p>
            <p>${invoiceData.customer?.phone || invoiceData.customerPhone || ''}</p>
          </div>
          <div class="service-section">
            <h4>Service Details</h4>
            ${serviceItems}
          </div>
          <div class="payment-section">
            <div class="payment-row"><span>Subtotal:</span><span>₱${subtotal.toFixed(2)}</span></div>
            ${discountAmount > 0 ? `<div class=\"payment-row\"><span>Discount:</span><span>-₱${discountAmount.toFixed(2)}</span></div>` : ''}
            <div class="payment-row total"><span>Total:</span><span>₱${total.toFixed(2)}</span></div>
            ${change > 0 ? `<div class=\"payment-row change\"><span>Change:</span><span>₱${change.toFixed(2)}</span></div>` : balance > 0 ? `<div class=\"payment-row balance\"><span>Balance Due:</span><span>₱${balance.toFixed(2)}</span></div>` : `<div class=\"payment-row paid\"><span>Status:</span><span>Fully Paid ✓</span></div>`}
          </div>
          <div class="status-section">
            ${invoiceData.notes ? `<p><strong>Notes:</strong> ${invoiceData.notes}</p>` : ''}
          </div>
        </div>
        <div class="receipt-footer">
          <p>Thank you for your business!</p>
          <p>Keep this invoice for your records</p>
        </div>
        <div class="signature-section">
          <div class="signature-line"></div>
          <div class="signature-label">Staff Signature</div>
          ${invoiceData.staffName ? `<div class="signature-sub" style="font-size:9px;color:#6B7280; margin-top:2px;">${invoiceData.staffName}</div>` : ''}
        </div>
      </div>`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset=\"utf-8\" />
          <meta name=\"viewport\" content=\"width=device-width, initial-scale=1, maximum-scale=1\" />
          <title>Invoice Preview - Sparklean Laundry Shop</title>
          <style>
            body { margin: 0; padding: 20px; font-family: 'Courier New', monospace; background: #f5f5f5; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; }
            .preview-container { background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 20px; max-width: 420px; }
            .preview-header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #007bff; }
            .preview-title { font-size: 18px; font-weight: bold; color: #007bff; margin-bottom: 10px; }
            .preview-subtitle { font-size: 14px; color: #666; margin-bottom: 15px; }
            .print-buttons { display: flex; gap: 10px; justify-content: center; margin-bottom: 20px; }
            .btn { padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold; }
            .btn-primary { background: #007bff; color: #fff; }
            .invoice-preview { border: 2px solid #000; background: white; transform: scale(0.9); transform-origin: top center; margin: 0 auto; }
            .order-receipt { width: 80mm; padding: 5mm; font-size: 12px; line-height: 1.2; box-sizing: border-box; }
            .receipt-header { text-align: center; margin-bottom: 5mm; padding-bottom: 3mm; border-bottom: 1px dashed #000; }
            .company-info { display: flex; flex-direction: column; align-items: center; margin-bottom: 3mm; }
            .company-logo { margin-bottom: 2mm; }
            .company-details h2 { font-size: 14px; font-weight: bold; margin: 0 0 1mm 0; }
            .company-details p { font-size: 10px; margin: 0; }
            .receipt-info h3 { font-size: 16px; font-weight: bold; margin: 2mm 0; }
            .receipt-info p { font-size: 10px; margin: 0; }
            .receipt-content { margin-bottom: 5mm; }
            .customer-section, .service-section, .payment-section, .status-section { margin-bottom: 3mm; }
            .customer-section h4, .service-section h4 { font-size: 11px; font-weight: bold; margin: 0 0 1mm 0; text-transform: uppercase; }
            .customer-section p { font-size: 10px; margin: 0; }
            .service-item { display: flex; justify-content: space-between; padding: 1mm 0; border-bottom: 1px dotted #000; }
            .service-name { font-size: 10px; }
            .service-price { font-size: 10px; font-weight: bold; }
            .payment-row { display: flex; justify-content: space-between; padding: 0.5mm 0; font-size: 10px; }
            .payment-row.total { font-weight: bold; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 1mm 0; margin: 1mm 0; }
            .payment-row.balance { font-weight: bold; background: #f0f0f0; padding: 1mm; margin-top: 1mm; }
            .payment-row.change { font-weight: bold; background: #d1fae5; padding: 1mm; margin-top: 1mm; color: #059669; }
            .payment-row.paid { font-weight: bold; background: #d1fae5; padding: 1mm; margin-top: 1mm; color: #059669; }
            .status-section p { font-size: 9px; margin: 0.5mm 0; }
            .receipt-footer { text-align: center; padding-top: 3mm; border-top: 1px dashed #000; }
            .receipt-footer p { font-size: 9px; margin: 0.5mm 0; }
            .signature-section { text-align: center; margin-top: 6mm; }
            .signature-line { width: 50mm; height: 1px; background: #111; margin: 0 auto 2mm auto; }
            .signature-label { font-size: 9px; color: #6B7280; }
            @media print { .no-print { display:none } body { background: #fff; padding: 0; } .preview-container { display:none } }
          </style>
        </head>
        <body>
          <div class="preview-container no-print">
            <div class="preview-header">
              <div class="preview-title">🖨️ Invoice Preview</div>
              <div class="preview-subtitle">This is how your invoice will look when printed</div>
              <div class="print-buttons"><button class="btn btn-primary" onclick="printDoc()">🖨️ Print Now</button></div>
            </div>
          </div>
          <div class="invoice-preview">${content}</div>
          <script>
            function printDoc(){
              const w = window.open('', '_blank');
              if(!w) return;
              w.document.write('<!DOCTYPE html><html><head><title>Invoice</title><meta name="viewport" content="width=device-width, initial-scale=1"/><style>@page{size:80mm auto;margin:0} body{margin:0;padding:0;font-family:\'Courier New\', monospace} .order-receipt{width:80mm; padding:5mm;} .service-item{display:flex; justify-content:space-between; border-bottom:1px dotted #000; padding:1mm 0;} .payment-row{display:flex; justify-content:space-between; font-size:10px; padding:0.5mm 0;} .payment-row.total{font-weight:bold; border-top:1px solid #000; border-bottom:1px solid #000; padding:1mm 0; margin:1mm 0;} .payment-row.balance{font-weight:bold; background:#f0f0f0; padding:1mm; margin-top:1mm;} .payment-row.change{font-weight:bold; background:#d1fae5; padding:1mm; margin-top:1mm; color:#059669;} .payment-row.paid{font-weight:bold; background:#d1fae5; padding:1mm; margin-top:1mm; color:#059669;} .receipt-header{ text-align:center; padding-bottom:3mm; border-bottom:1px dashed #000; } .signature-section{text-align:center; margin-top:6mm;} .signature-line{width:50mm; height:1px; background:#111; margin:0 auto 2mm auto;} .signature-label{font-size:9px; color:#6B7280;}</style></head><body>' + document.querySelector('.invoice-preview').innerHTML + '</body></html>');
              w.document.close(); w.focus(); w.print(); w.close();
            }
          </script>
        </body>
      </html>`;

    // Native vs Web
    if (Platform.OS !== 'web') {
      (async () => {
        try {
          const Print = await import('expo-print');
          await Print.printAsync({ html });
        } catch (e) {
          Alert.alert('Print not available', 'Printing preview is only supported on web right now.');
        }
      })();
      return;
    }

    const preview = window.open('', '_blank', 'width=420,height=620,scrollbars=yes,resizable=yes');
    if (!preview) return;
    preview.document.write(html);
    preview.document.close();
    preview.focus();
    return;
  }

  // Generate receipt format (print summary style) if isReceipt is true
  if (isReceipt) {
    const serviceItems = (invoiceData.items || []).map((it: any) => `
      <div class="service-item">
        <span class="service-name">${it.service} (${it.quantity})</span>
        <span class="service-price">₱${Number(it.amount || 0).toFixed(2)}</span>
      </div>
    `).join('');

    const receiptContent = `
      <div class="order-receipt">
        <div class="receipt-header">
          <div class="company-info">
            <div class="company-logo">${logoSvg}</div>
            <div class="company-details">
              <h2>Sparklean Laundry Shop${stationInfo?.name ? ` - ${stationInfo.name}` : ''}</h2>
              <p>${stationInfo?.address || '123 Laundry Street, Clean City'}</p>
              <p>${stationInfo?.phone ? `Phone: ${stationInfo.phone}` : 'Phone: +63 912 345 6789'}</p>
            </div>
          </div>
          <div class="receipt-info">
            <h3>ORDER RECEIPT</h3>
            <p>Date: ${invoiceData.date}</p>
            <p>Time: ${invoiceData.time || ''}</p>
          </div>
        </div>
        <div class="receipt-content">
          <div class="customer-section">
            <h4>Customer</h4>
            <p><strong>${invoiceData.customer.name}</strong></p>
            <p>${invoiceData.customer.phone || 'N/A'}</p>
          </div>
          <div class="service-section">
            <h4>Service Details</h4>
            ${serviceItems}
          </div>
          <div class="payment-section">
            <div class="payment-row">
              <span>Subtotal:</span>
              <span>₱${invoiceData.subtotal.toFixed(2)}</span>
            </div>
            ${invoiceData.discount > 0 ? `
              <div class="payment-row">
                <span>Discount${invoiceData.discountCode ? ` (${invoiceData.discountCode})` : ''}:</span>
                <span>-₱${invoiceData.discount.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="payment-row total">
              <span>Total:</span>
              <span>₱${invoiceData.total.toFixed(2)}</span>
            </div>
            ${invoiceData.change > 0 ? `
              <div class="payment-row change">
                <span>Change Due:</span>
                <span>₱${invoiceData.change.toFixed(2)}</span>
              </div>
            ` : invoiceData.balanceDue > 0 ? `
              <div class="payment-row balance">
                <span>Balance Due:</span>
                <span>₱${invoiceData.balanceDue.toFixed(2)}</span>
              </div>
            ` : `
              <div class="payment-row paid">
                <span>Status:</span>
                <span>Fully Paid ✓</span>
              </div>
            `}
          </div>
          <div class="status-section">
            ${invoiceData.notes ? `<p><strong>Notes:</strong> ${invoiceData.notes}</p>` : ''}
          </div>
        </div>
        <div class="receipt-footer">
          <p>Thank you for your business!</p>
          <p>Keep this receipt for your records</p>
        </div>
      </div>
    `;

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <title>Receipt Preview - Sparklean Laundry Shop</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: 'Arial', sans-serif;
            background: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            min-height: 100vh;
          }
          .preview-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            padding: 20px;
            max-width: 400px;
          }
          .preview-header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #007bff;
          }
          .preview-title {
            font-size: 18px;
            font-weight: bold;
            color: #007bff;
            margin-bottom: 10px;
          }
          .preview-subtitle {
            font-size: 14px;
            color: #666;
            margin-bottom: 15px;
          }
          .print-buttons {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-bottom: 20px;
          }
          .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
          }
          .btn-primary {
            background: #007bff;
            color: white;
          }
          .receipt-preview {
            border: 2px solid #000;
            background: white;
            transform: scale(0.8);
            transform-origin: top center;
            margin: 0 auto;
          }
          .order-receipt {
            width: 80mm;
            padding: 5mm;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.2;
            box-sizing: border-box;
          }
          .receipt-header {
            text-align: center;
            margin-bottom: 5mm;
            padding-bottom: 3mm;
            border-bottom: 1px dashed #000;
          }
          .company-info {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-bottom: 3mm;
          }
          .company-logo {
            margin-bottom: 2mm;
          }
          .company-details h2 {
            font-size: 14px;
            font-weight: bold;
            margin: 0 0 1mm 0;
          }
          .company-details p {
            font-size: 10px;
            margin: 0;
          }
          .receipt-info h3 {
            font-size: 16px;
            font-weight: bold;
            margin: 2mm 0;
          }
          .receipt-info p {
            font-size: 10px;
            margin: 0;
          }
          .receipt-content {
            margin-bottom: 5mm;
          }
          .customer-section, .service-section, .payment-section, .status-section {
            margin-bottom: 3mm;
          }
          .customer-section h4, .service-section h4 {
            font-size: 11px;
            font-weight: bold;
            margin: 0 0 1mm 0;
            text-transform: uppercase;
          }
          .customer-section p {
            font-size: 10px;
            margin: 0;
          }
          .service-item {
            display: flex;
            justify-content: space-between;
            padding: 1mm 0;
            border-bottom: 1px dotted #000;
          }
          .service-name {
            font-size: 10px;
          }
          .service-price {
            font-size: 10px;
            font-weight: bold;
          }
          .payment-row {
            display: flex;
            justify-content: space-between;
            padding: 0.5mm 0;
            font-size: 10px;
          }
          .payment-row.total {
            font-weight: bold;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 1mm 0;
            margin: 1mm 0;
          }
          .payment-row.balance {
            font-weight: bold;
            background: #f0f0f0;
            padding: 1mm;
            margin-top: 1mm;
          }
          .payment-row.change {
            font-weight: bold;
            background: #d1fae5;
            padding: 1mm;
            margin-top: 1mm;
            color: #059669;
          }
          .payment-row.paid {
            font-weight: bold;
            background: #d1fae5;
            padding: 1mm;
            margin-top: 1mm;
            color: #059669;
          }
          .status-section p {
            font-size: 9px;
            margin: 0.5mm 0;
          }
          .receipt-footer {
            text-align: center;
            padding-top: 3mm;
            border-top: 1px dashed #000;
          }
          .receipt-footer p {
            font-size: 9px;
            margin: 0.5mm 0;
          }
          @media print {
            .no-print { display: none !important; }
            body { background: #FFFFFF; padding: 0; }
            .preview-container { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="preview-container no-print">
          <div class="preview-header">
            <div class="preview-title">🖨️ Receipt Preview</div>
            <div class="preview-subtitle">This is how your receipt will look when printed</div>
            <div class="print-buttons">
              <button class="btn btn-primary" onclick="printReceipt()">🖨️ Print Now</button>
            </div>
          </div>
        </div>
        <div class="receipt-preview">
          ${receiptContent}
        </div>
        <script>
          function printReceipt() {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
              const receiptContent = document.querySelector('.receipt-preview').innerHTML;
              printWindow.document.write(\`
                <!DOCTYPE html>
                <html>
                <head>
                  <title>Receipt</title>
                  <style>
                    @page { size: 80mm 200mm; margin: 0; }
                    body { margin: 0; padding: 0; font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.2; width: 80mm; }
                    .order-receipt { width: 80mm; padding: 5mm; box-sizing: border-box; }
                    .receipt-header { text-align: center; margin-bottom: 5mm; padding-bottom: 3mm; border-bottom: 1px dashed #000; }
                    .company-info { display: flex; flex-direction: column; align-items: center; margin-bottom: 3mm; }
                    .company-logo { margin-bottom: 2mm; }
                    .company-details h2 { font-size: 14px; font-weight: bold; margin: 0 0 1mm 0; }
                    .company-details p { font-size: 10px; margin: 0; }
                    .receipt-info h3 { font-size: 16px; font-weight: bold; margin: 2mm 0; }
                    .receipt-info p { font-size: 10px; margin: 0; }
                    .receipt-content { margin-bottom: 5mm; }
                    .customer-section, .service-section, .payment-section, .status-section { margin-bottom: 3mm; }
                    .customer-section h4, .service-section h4 { font-size: 11px; font-weight: bold; margin: 0 0 1mm 0; text-transform: uppercase; }
                    .customer-section p { font-size: 10px; margin: 0; }
                    .service-item { display: flex; justify-content: space-between; padding: 1mm 0; border-bottom: 1px dotted #000; }
                    .service-name { font-size: 10px; }
                    .service-price { font-size: 10px; font-weight: bold; }
                    .payment-row { display: flex; justify-content: space-between; padding: 0.5mm 0; font-size: 10px; }
                    .payment-row.total { font-weight: bold; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 1mm 0; margin: 1mm 0; }
                    .payment-row.balance { font-weight: bold; background: #f0f0f0; padding: 1mm; margin-top: 1mm; }
                    .payment-row.change { font-weight: bold; background: #d1fae5; padding: 1mm; margin-top: 1mm; color: #059669; }
                    .payment-row.paid { font-weight: bold; background: #d1fae5; padding: 1mm; margin-top: 1mm; color: #059669; }
                    .status-section p { font-size: 9px; margin: 0.5mm 0; }
                    .receipt-footer { text-align: center; padding-top: 3mm; border-top: 1px dashed #000; }
                    .receipt-footer p { font-size: 9px; margin: 0.5mm 0; }
                  </style>
                </head>
                <body>
                  \${receiptContent}
                </body>
                </html>
              \`);
              printWindow.document.close();
              printWindow.focus();
              printWindow.print();
              printWindow.close();
            }
          }
        </script>
      </body>
    </html>`;

    // Native (Expo Go / iOS / Android): use expo-print
    if (Platform.OS !== 'web') {
      (async () => {
        try {
          const Print = await import('expo-print');
          await Print.printAsync({ html });
        } catch (e) {
          Alert.alert('Print not available', 'Printing preview is only supported on web right now.');
        }
      })();
      return;
    }

    // Web preview window
    if (typeof window === 'undefined') return;
    const preview = window.open('', '_blank', 'width=400,height=600,scrollbars=yes,resizable=yes');
    if (!preview) return;

    preview.document.write(html);
    preview.document.close();
    preview.focus();
    return;
  }

  // Invoice format (original code)
  const rows = (invoiceData.items || []).map((it: any) => `
      <div class=\"row\"> 
        <div class=\"col-left\">${it.service} × ${it.quantity}</div>
        <div class=\"col-right\">₱${Number(it.amount || 0).toFixed(2)}</div>
      </div>
  `).join('');

  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      <title>Invoice Preview - La Bubbles Laundry Shop</title>
      <style>
        /* Thermal 58mm layout */
        @page { size: 58mm auto; margin: 0; }
        body { margin: 0; padding: 12px; background: #F3F4F6; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        .preview-title { font-size: 16px; font-weight: 800; margin-bottom: 4px; }
        .preview-subtitle { color: #6B7280; font-size: 12px; margin-bottom: 12px; }
        .print-buttons { display: flex; gap: 8px; margin-bottom: 12px; }
        .btn { padding: 8px 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: 700; }
        .btn-primary { background: ${dynamicColors.primary[500]}; color: #FFFFFF; }
        .container { background: #FFFFFF; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); padding: 10px; }
        .ticket { width: 58mm; margin: 0 auto; color: #111827; }
        .center { text-align: center; }
        .muted{color:#6B7280; font-size:11px}
        .row { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; padding: 4px 0; }
        .col-left { flex: 1; }
        .col-right { min-width: 64px; text-align: right; }
        .divider { border-top: 1px dashed #9CA3AF; margin: 6px 0; }
        .big { font-weight: 800; font-size: 13px; }
        .logo { display:flex; justify-content:center; margin-bottom: 6px; }
        @media print { .no-print { display:none } body { background: #FFFFFF; padding: 0; width: 58mm; } .container { box-shadow: none; padding: 0 } }
      </style>
    </head>
    <body>
      <div class="container no-print">
        <div class="preview-title">🖨️ Invoice Preview</div>
        <div class="preview-subtitle">This is how your invoice will look when printed</div>
        <div class="print-buttons">
          <button class="btn btn-primary" onclick="printInvoice()">🖨️ Print Now</button>
        </div>
      </div>
      <div class="container print-area">
        <div class="ticket">
          <div class="logo">${logoSvg}</div>
          <div class="center big">Sparklean Laundry Shop</div>
          <div class="center muted">123 Laundry Street, Clean City</div>
          <div class="center muted">+63 912 345 6789</div>
          <div class="center muted">sparklean@example.com</div>
          <div class="divider"></div>
          <div class="row"><div>Invoice #</div><div>${invoiceData.id}</div></div>
          <div class="row"><div>Date</div><div>${invoiceData.date}</div></div>
          <div class="row"><div>Due</div><div>${invoiceData.dueDate}</div></div>
          <div class="divider"></div>
          <div class="row"><div class="big">BILL TO</div><div></div></div>
          <div class="row"><div>${invoiceData.customer.name}</div><div></div></div>
          ${invoiceData.customer.phone ? `<div class=\"row\"><div>${invoiceData.customer.phone}</div><div></div></div>`:''}
          <div class="divider"></div>
          ${rows}
          <div class="divider"></div>
          <div class="row"><div>Subtotal</div><div>₱${invoiceData.subtotal.toFixed(2)}</div></div>
          ${invoiceData.discount>0 ? `<div class=\"row\"><div>Discount ${invoiceData.discountCode?`(${invoiceData.discountCode})`:''}</div><div>-₱${invoiceData.discount.toFixed(2)}</div></div>`:''}
          ${invoiceData.tax>0 ? `<div class=\"row\"><div>Tax</div><div>₱${invoiceData.tax.toFixed(2)}</div></div>`:''}
          <div class="row big"><div>Total</div><div>₱${invoiceData.total.toFixed(2)}</div></div>
          <div class="row"><div>Paid</div><div>₱${invoiceData.paid.toFixed(2)}</div></div>
          ${invoiceData.balance>0 ? `<div class=\"row\"><div>Balance</div><div>₱${invoiceData.balance.toFixed(2)}</div></div>`:''}
          <div class="divider"></div>
          <div class="center muted">Thank you for your business!</div>
        </div>
      </div>
      <script>
        function printInvoice(){
          const w = window.open('', '_blank');
          if(!w) return;
          w.document.write('<!DOCTYPE html><html><head><title>Invoice</title><meta name="viewport" content="width=device-width, initial-scale=1"/><style>@page{size:58mm auto;margin:0} body{font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; margin:0; padding:0; width:58mm} .ticket{width:58mm; margin:0 auto; padding:6px;} .row{display:flex; justify-content:space-between; gap:8px; font-size:11px; padding:4px 0;} .divider{border-top:1px dashed #9CA3AF; margin:6px 0;} .center{text-align:center;} .big{font-weight:800; font-size:13px;} .muted{color:#6B7280; font-size:11px;} .logo{display:flex; justify-content:center; margin-bottom:6px;}</style></head><body>' + document.querySelector('.ticket').outerHTML + '</body></html>');
          w.document.close(); w.focus(); w.print(); w.close();
        }
      </script>
    </body>
  </html>`;

  // Native (Expo Go / iOS / Android): use expo-print
  if (Platform.OS !== 'web') {
    (async () => {
      try {
        const Print = await import('expo-print');
        await Print.printAsync({ html });
      } catch (e) {
        Alert.alert('Print not available', 'Printing preview is only supported on web right now.');
      }
    })();
    return;
  }

  // Web preview window
  if (typeof window === 'undefined') return;
  const preview = window.open('', '_blank', 'width=400,height=600,scrollbars=yes,resizable=yes');
  if (!preview) return;

  preview.document.write(html);
  preview.document.close();
  preview.focus();
}
export default function Dashboard() {
  const dynamicColors = useColors();
  const dynamicButtonStyles = useButtonStyles();
  const { showSuccess, showError } = useToast();
  const [showTransaction, setShowTransaction] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // Debounce search by 300ms
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const spinValue = useRef(new Animated.Value(0)).current;
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [invoiceStationInfo, setInvoiceStationInfo] = useState<any>(null);
  const [showDrafts, setShowDrafts] = useState(false);
  const [filterPayment, setFilterPayment] = useState("All");
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [exportButtonLayout, setExportButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const exportButtonRef = useRef<any>(null);
  const [staffName, setStaffName] = useState<string>("");
  const [orderLocks, setOrderLocks] = useState<Record<string, { isLocked: boolean; lockedBy?: { name: string; email?: string }; isLockedByMe?: boolean }>>({});
  const lockCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  const [draftOrderIdForModal, setDraftOrderIdForModal] = useState<string | null>(null);
  const { hasPermission: hasPermissionFor } = usePermissions();
  const router = useRouter();
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  
  // Stats state
  const [stats, setStats] = useState({
    totalOrders: 0,
    paidOrders: 0,
    unpaidOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
  });

  // Command palette commands
  const commands = [
    {
      id: 'new-order',
      label: 'Create New Order',
      description: 'Add a new laundry order',
      icon: 'add-circle-outline' as const,
      category: 'Orders',
      keywords: ['order', 'new', 'create', 'add'],
      onPress: () => {
        setDraftOrderIdForModal(null);
        setIsCreateOrderModalOpen(true);
      },
      shortcut: 'N',
    },
    {
      id: 'view-customers',
      label: 'View Customers',
      description: 'Go to customer management',
      icon: 'people-outline' as const,
      category: 'Navigation',
      keywords: ['customer', 'people', 'clients'],
      onPress: () => router.push('/home/customer'),
      shortcut: 'C',
    },
    {
      id: 'view-requests',
      label: 'View Requests',
      description: 'Go to expense requests',
      icon: 'folder-outline' as const,
      category: 'Navigation',
      keywords: ['request', 'expense', 'folder'],
      onPress: () => router.push('/home/request'),
      shortcut: 'R',
    },
    {
      id: 'export-csv',
      label: 'Export to CSV',
      description: 'Export orders as CSV file',
      icon: 'document-text-outline' as const,
      category: 'Export',
      keywords: ['export', 'csv', 'download'],
      onPress: () => handleExport('CSV'),
    },
    {
      id: 'export-pdf',
      label: 'Export to PDF',
      description: 'Export orders as PDF file',
      icon: 'document-text-outline' as const,
      category: 'Export',
      keywords: ['export', 'pdf', 'download'],
      onPress: () => handleExport('PDF'),
    },
    {
      id: 'refresh',
      label: 'Refresh Orders',
      description: 'Reload orders from server',
      icon: 'refresh-outline' as const,
      category: 'Actions',
      keywords: ['refresh', 'reload', 'update'],
      onPress: () => handleRefresh(),
      shortcut: 'R',
    },
  ];

  // Keyboard shortcut handler for command palette
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleKeyPress = (e: any) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const json = await AsyncStorage.getItem('user');
        if (json) {
          const u = JSON.parse(json);
          setStaffName(u?.name || u?.username || "");
        }
      } catch {}
    })();
  }, []);

  // Fetch orders and calculate stats
  useEffect(() => {
    fetchOrders();
  }, [showDrafts, filterPayment]);

  // Check lock status for all orders periodically
  useEffect(() => {
    if (orders.length === 0) return;

    const checkAllLocks = async () => {
      try {
        const token = await AsyncStorage.getItem("token") || await AsyncStorage.getItem("userToken");
        if (!token) return;

        const lockPromises = orders.map(async (order) => {
          try {
            const orderId = order.orderId || order.__raw?.id || order.__raw?._id;
            if (!orderId) return { orderId: null, lockInfo: null };

            const response = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderId)}/lock`, {
              method: "GET",
              headers: {
                "Authorization": `Bearer ${token}`,
              },
            });

            if (response.ok) {
              const data = await response.json();
              return { orderId, lockInfo: data };
            }
            return { orderId, lockInfo: { isLocked: false } };
          } catch (error) {
            return { orderId: order.orderId || order.__raw?.id || order.__raw?._id, lockInfo: { isLocked: false } };
          }
        });

        const results = await Promise.all(lockPromises);
        const locksMap: Record<string, any> = {};
        results.forEach(({ orderId, lockInfo }) => {
          if (orderId && lockInfo) {
            locksMap[orderId] = lockInfo;
          }
        });
        setOrderLocks(locksMap);
      } catch (error) {
        console.error("Failed to check lock statuses:", error);
      }
    };

    checkAllLocks();
    const interval = setInterval(checkAllLocks, 3000); // Check every 3 seconds

    return () => {
      clearInterval(interval);
    };
  }, [orders]);

  // Load stats visibility preference from AsyncStorage
  useEffect(() => {
    const loadStatsPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem('order-management-show-stats');
        if (saved !== null) {
          setShowStats(JSON.parse(saved));
        }
      } catch (error) {
        logger.error('Error loading stats preference:', error);
      }
    };
    loadStatsPreference();
  }, []);

  // Save stats visibility preference to AsyncStorage
  useEffect(() => {
    const saveStatsPreference = async () => {
      try {
        await AsyncStorage.setItem('order-management-show-stats', JSON.stringify(showStats));
      } catch (error) {
        logger.error('Error saving stats preference:', error);
      }
    };
    saveStatsPreference();
  }, [showStats]);

  // Refresh orders when needed (e.g., after modal closes)
  useEffect(() => {
    if (!showTransaction) {
      // Optionally refresh orders when transaction modal closes
      // fetchOrders();
    }
  }, [showTransaction]);

  const fetchOrders = async (updateSelectedOrder: boolean = false) => {
    setLoading(true);
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      if (showDrafts) {
        queryParams.append('showDrafts', 'true');
      }
      if (filterPayment !== 'All') {
        queryParams.append('payment', filterPayment);
      }

      // Fetch orders from API using centralized API utility
      // Backend automatically filters by createdBy for staff users
      const queryString = queryParams.toString();
      const endpoint = `/orders${queryString ? `?${queryString}` : ''}`;

      const data = await api.get(endpoint);
      logger.debug("Orders API Response:", data);
      
      // Handle different response formats
      let ordersData = data;
      if (data && typeof data === 'object') {
        // Handle { success: true, data: [...] } format
        if (data.success && Array.isArray(data.data)) {
          ordersData = data.data;
        }
        // Handle { orders: [...] } format
        else if (Array.isArray(data.orders)) {
          ordersData = data.orders;
        }
        // Handle { data: { orders: [...] } } format
        else if (data.data && Array.isArray(data.data.orders)) {
          ordersData = data.data.orders;
        }
        // Handle direct array response
        else if (Array.isArray(data)) {
          ordersData = data;
        }
      }

      logger.debug("Parsed orders data:", ordersData);

      // Normalize orders data
      const ordersArray: Order[] = Array.isArray(ordersData)
        ? ordersData.map((o: any) => {
            // Parse total amount from string format (₱1,234.56 or ₱1234.56)
            let totalFee = 0;
            if (o.total) {
              const totalStr = typeof o.total === 'string' 
                ? o.total.replace(/[₱,]/g, '') 
                : o.total.toString().replace(/[₱,]/g, '');
              totalFee = parseFloat(totalStr) || 0;
            } else if (o.totalFee) {
              totalFee = parseFloat(o.totalFee) || 0;
            } else if (o.amount) {
              totalFee = parseFloat(o.amount) || 0;
            }

            // Get order status from items[0].status or isCompleted field
            let orderStatus = "Pending";
            if (o.isCompleted === true) {
              orderStatus = "Completed";
            } else if (o.items && Array.isArray(o.items) && o.items.length > 0 && o.items[0].status) {
              orderStatus = o.items[0].status;
            } else if (o.laundryStatus) {
              orderStatus = o.laundryStatus;
            } else if (o.status) {
              orderStatus = o.status;
            }

            return {
              orderId: o.orderId || o.id || o._id || `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              customerName: o.customerName || o.customer || "Unknown",
              createDate: o.createDate || o.date || o.createdAt || new Date().toISOString(),
              laundryStatus: orderStatus,
              feeStatus: o.feeStatus || o.payment || o.paymentStatus || (o.paid >= totalFee ? "Paid" : (o.paid > 0 ? "Partial" : "Unpaid")),
              totalFee: totalFee,
              isCompleted: o.isCompleted || false,
              change: o.change || 0,
              lastEditedBy: o.lastEditedBy || undefined,
              lastEditedAt: o.lastEditedAt || undefined,
              __raw: o,
            };
          })
        : [];

      logger.debug("Normalized orders:", ordersArray);
      setOrders(ordersArray);
      
      // Update selectedOrder if requested (e.g., after order update)
      if (updateSelectedOrder && selectedOrder) {
        const orderId = selectedOrder.orderId || (selectedOrder as any)?.id || (selectedOrder as any)?._id;
        const updatedOrder = ordersArray.find(o => 
          (o.orderId === orderId) || 
          (o.__raw && (o.__raw.id === orderId || o.__raw._id === orderId))
        );
        if (updatedOrder) {
          setSelectedOrder({
            ...updatedOrder,
            __raw: updatedOrder.__raw || updatedOrder
          } as any);
        }
      }
      
      calculateStats(ordersArray);
    } catch (error: any) {
      logger.error("Error fetching orders:", error);
      // Set empty array on error to prevent crashes
      setOrders([]);
      calculateStats([]);
      
      // Show error message to user
      showError(error.message || "Failed to load orders. Please check your connection and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Optimized pull-to-refresh with cooldown
  const handleRefresh = async () => {
    const now = Date.now();
    const cooldown = 2000; // 2 seconds cooldown
    
    // Prevent excessive refreshes
    if (now - lastRefreshTime < cooldown) {
      setRefreshing(false);
      return;
    }
    
    setLastRefreshTime(now);
    setRefreshing(true);
    
    // Start spinning animation
    spinValue.setValue(0);
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
    
    try {
      await fetchOrders();
    } catch (error) {
      console.error('Error refreshing orders:', error);
    } finally {
      setTimeout(() => {
        setRefreshing(false);
        spinValue.stopAnimation();
        spinValue.setValue(0);
      }, 500);
    }
  };

  const calculateStats = (ordersList: Order[]) => {
    const totalOrders = ordersList.length;
    const paidOrders = ordersList.filter(o => o.feeStatus === "Paid").length;
    const unpaidOrders = ordersList.filter(o => o.feeStatus === "Unpaid").length;
    const totalRevenue = ordersList
      .filter(o => o.feeStatus === "Paid")
      .reduce((sum, o) => sum + (o.totalFee || 0), 0);
    const pendingOrders = ordersList.filter(o => o.laundryStatus === "Pending").length;
    
    // Check for completed orders - either isCompleted flag or status === "Completed"
    const completedOrders = ordersList.filter(o => {
      // Check if order has isCompleted flag set to true
      if (o.isCompleted === true || (o.__raw && o.__raw.isCompleted === true)) {
        return true;
      }
      // Check if order status is "Completed"
      if (o.laundryStatus === "Completed") {
        return true;
      }
      // Check if first item status is "Completed"
      if (o.__raw && o.__raw.items && Array.isArray(o.__raw.items) && o.__raw.items.length > 0) {
        const firstItemStatus = o.__raw.items[0].status;
        if (firstItemStatus === "Completed") {
          return true;
        }
      }
      return false;
    }).length;

    setStats({
      totalOrders,
      paidOrders,
      unpaidOrders,
      totalRevenue,
      pendingOrders,
      completedOrders,
    });
  };

  const handleExport = async (format: 'CSV' | 'Excel' | 'PDF') => {
    // Get filtered orders based on current filters
    const ordersToExport = orders.filter(order => {
      // Apply search filter
      const matchesSearch = searchQuery === "" || 
        (order.orderId ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.customerName ?? "").toLowerCase().includes(searchQuery.toLowerCase());
      
      // Apply payment filter
      const matchesPayment = filterPayment === "All" || order.feeStatus === filterPayment;
      
      // Apply drafts filter
      const matchesDrafts = showDrafts ? (order.__raw?.isDraft === true) : (order.__raw?.isDraft !== true);
      
      return matchesSearch && matchesPayment && matchesDrafts;
    });

    if (ordersToExport.length === 0) {
      showError("No orders to export");
      return;
    }

    // Build filename with station name if available
    let filenamePrefix = 'orders';
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        // Try to get station name from the first order's station info or user's station
        const firstOrder = ordersToExport[0];
        const stationId = firstOrder?.__raw?.stationId || parsedUser.stationId;
        if (stationId) {
          // Try to fetch station name
          try {
            const response = await fetch(`${API_BASE_URL}/stations`, {
              headers: {
                'Authorization': `Bearer ${await AsyncStorage.getItem('token')}`
              }
            });
            if (response.ok) {
              const stations = await response.json();
              const stationsArray = Array.isArray(stations) ? stations : (stations.data || stations || []);
              const station = stationsArray.find((s: any) => {
                const stationStationId = String(s.stationId || '').toUpperCase().trim();
                const sId = String(s._id || s.id || '');
                const targetId = String(stationId).toUpperCase().trim();
                return stationStationId === targetId || sId === targetId;
              });
              if (station?.name || station?.stationName) {
                const stationName = station.name || station.stationName;
                // Sanitize station name for filename (remove special characters)
                const sanitizedStationName = stationName.replace(/[^a-zA-Z0-9]/g, '_');
                filenamePrefix = `${sanitizedStationName}_orders`;
              }
            }
          } catch (stationError) {
            // If station fetch fails, just use default filename
            console.warn('Could not fetch station info for filename:', stationError);
          }
        }
      }
    } catch (error) {
      // If user data fetch fails, just use default filename
      console.warn('Could not get user data for filename:', error);
    }
    
    const filename = getExportFilename(filenamePrefix);
    
    try {
      // Map orders to export format
      const ordersForExport = ordersToExport.map(order => ({
        orderId: order.orderId,
        id: order.orderId,
        date: order.createDate,
        customer: order.customerName,
        customerName: order.customerName,
        payment: order.feeStatus,
        total: `₱${order.totalFee.toFixed(2)}`,
        totalFee: order.totalFee,
        paid: order.__raw?.paid || 0,
        balance: order.__raw?.balance || '₱0.00',
        change: order.__raw?.change || order.change || 0,
        items: order.__raw?.items || [],
        notes: order.__raw?.notes || '',
        stationId: order.__raw?.stationId || ''
      }));

      switch (format) {
        case 'CSV':
          exportToCSV(ordersForExport, filename);
          break;
        case 'Excel':
          exportToExcel(ordersForExport, filename);
          break;
        case 'PDF':
          exportToPDF(ordersForExport, filename);
          break;
      }
      
      showSuccess(`${ordersToExport.length} orders exported as ${format}`);
      setShowExportDropdown(false);
    } catch (error: any) {
      showError(error.message || "Failed to export orders. Please try again.");
      logger.error('Export error:', error);
    }
  };

  const handleEditOrder = async (order: any) => {
    try {
      const orderId = order.orderId || order.id || order._id;
      if (!orderId) {
        Alert.alert("Error", "Order ID not found.");
        return;
      }

      // Check if order is both paid AND completed - only lock when both conditions are met
      const isCompleted = order.isCompleted || order.__raw?.isCompleted || false;
      const paymentStatus = order.feeStatus || order.payment || order.paymentStatus;
      const isPaid = paymentStatus === 'Paid';
      
      if (isPaid && isCompleted) {
        Alert.alert("Order Locked", "This order has been paid and completed and cannot be edited.");
        return;
      }

      // Acquire edit lock before opening modal
      const token = await AsyncStorage.getItem("token") || await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Error", "Authentication required.");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderId)}/lock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 409) {
          Alert.alert(
            "Order Being Edited", 
            data.message || `This order is currently being edited by ${data.lockedBy?.name || 'another user'}. Please wait for them to finish.`
          );
          return;
        } else {
          Alert.alert("Error", "Failed to acquire edit lock. Please try again.");
          return;
        }
      }

      // Lock acquired successfully, open modal in edit mode
      setSelectedOrder(order);
      setEditMode(true);
      setShowTransaction(true);
    } catch (error: any) {
      console.error("Failed to acquire edit lock:", error);
      Alert.alert("Error", "Failed to acquire edit lock. Please try again.");
    }
  };

  const handlePrintReceipt = async (order: any) => {
    try {
      logger.debug("handlePrintReceipt called with order:", order);
      
      if (!order) {
        Alert.alert("Error", "Order data not available.");
        return;
      }
      
      // Fetch station information - check multiple possible locations for stationId
      let stationInfo = null;
      const orderStationId = order.stationId || order.__raw?.stationId || null;
      
      if (orderStationId) {
        try {
          const response = await fetch(`${API_BASE_URL}/stations`, {
            headers: {
              'Authorization': `Bearer ${await AsyncStorage.getItem('token')}`
            }
          });
          if (response.ok) {
            const stations = await response.json();
            const stationsArray = Array.isArray(stations) ? stations : (stations.data || stations || []);
            const stationIdToMatch = String(orderStationId).toUpperCase().trim();
            stationInfo = stationsArray.find((s: any) => {
              const stationStationId = String(s.stationId || '').toUpperCase().trim();
              const stationId = String(s._id || s.id || '');
              return stationStationId === stationIdToMatch || stationId === stationIdToMatch;
            });
            if (stationInfo) {
              console.log('Station found for receipt:', stationInfo);
            } else {
              console.warn('Station not found for stationId:', orderStationId);
            }
          }
        } catch (stationError) {
          console.warn('Could not fetch station info:', stationError);
        }
      } else {
        // Try to get stationId from logged-in user as fallback
        try {
          const userData = await AsyncStorage.getItem('user');
          if (userData) {
            const parsedUser = JSON.parse(userData);
            const userStationId = parsedUser.stationId;
            if (userStationId) {
              const response = await fetch(`${API_BASE_URL}/stations`, {
                headers: {
                  'Authorization': `Bearer ${await AsyncStorage.getItem('token')}`
                }
              });
              if (response.ok) {
                const stations = await response.json();
                const stationsArray = Array.isArray(stations) ? stations : (stations.data || stations || []);
                const stationIdToMatch = String(userStationId).toUpperCase().trim();
                stationInfo = stationsArray.find((s: any) => {
                  const stationStationId = String(s.stationId || '').toUpperCase().trim();
                  const stationId = String(s._id || s.id || '');
                  return stationStationId === stationIdToMatch || stationId === stationIdToMatch;
                });
                if (stationInfo) {
                  console.log('Station found from user stationId:', stationInfo);
                }
              }
            }
          }
        } catch (e) {
          console.warn('Could not get station from user:', e);
        }
      }

      const orderId = order.orderId || order.id || order._id || "N/A";
      const customerName = order.customerName || order.customer || "N/A";
      const customerPhone = order.customerPhone || order.phone || "";
      
      // Calculate subtotal from items
      const items = order.items || (order.service ? [{
        service: order.service,
        quantity: order.quantity || "1",
        amount: order.serviceFee || order.totalFee || 0
      }] : []);
      
      const subtotal = items.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
      
      // Calculate discount amount
      let discountAmount = 0;
      let discountCode = order.discount || '0%';
      if (order.discount && order.discount !== '0%') {
        const discountMatch = String(order.discount).match(/(\d+(?:\.\d+)?)/);
        if (discountMatch && String(order.discount).includes('%')) {
          discountAmount = subtotal * (parseFloat(discountMatch[1]) / 100);
          discountCode = `${discountMatch[1]}%`;
        } else if (discountMatch) {
          discountAmount = parseFloat(discountMatch[1]);
          discountCode = `₱${discountMatch[1]}`;
        }
      }
      
      const total = subtotal - discountAmount;
      const paid = order.paid || order.amountPaid || 0;
      const balance = total - paid;
      const change = balance < 0 ? Math.abs(balance) : 0;
      const balanceDue = balance > 0 ? balance : 0;
      const computedStatus = paid >= total ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid';
      
      // Format dates
      const orderDate = order.createDate || order.date || order.createdAt;
      const formattedDate = orderDate 
        ? new Date(orderDate).toLocaleDateString()
        : new Date().toLocaleDateString();
      const formattedTime = orderDate 
        ? new Date(orderDate).toLocaleTimeString()
        : new Date().toLocaleTimeString();
      
      // Map items to receipt format (matching print summary)
      const invoiceItems = items.map((item: any) => ({
        service: item.service || "N/A",
        quantity: item.quantity || "1",
        amount: item.amount || 0
      }));

      // Format data to match print summary structure
      const receiptData = {
        id: orderId,
        date: formattedDate,
        time: formattedTime,
        customer: {
          name: customerName,
          email: '',
          phone: customerPhone,
          address: ""
        },
        items: invoiceItems,
        subtotal: subtotal,
        discount: discountAmount,
        discountCode: discountCode,
        total: total,
        paid: paid,
        change: change,
        balanceDue: balanceDue,
        paymentStatus: computedStatus,
        pickupDate: order.pickupDate ? new Date(order.pickupDate).toLocaleDateString() : null,
        notes: order.notes || '',
        format: 'receipt'
      };

      // Use the existing printInvoiceWindow function but with receipt format
      printInvoiceWindow(receiptData, stationInfo);
    } catch (error: any) {
      logger.error("Error generating receipt:", error);
      Alert.alert("Error", "Failed to generate receipt. " + (error.message || ""));
    }
  };

  const handleViewInvoice = async (order: any) => {
    try {
      logger.debug("handleViewInvoice called with order:", order);
      
      if (!order) {
        Alert.alert("Error", "Order data not available.");
        return;
      }
      
      // Fetch station information - check multiple possible locations for stationId
      let stationInfo = null;
      const orderStationId = order.stationId || order.__raw?.stationId || null;
      
      if (orderStationId) {
        try {
          const response = await fetch(`${API_BASE_URL}/stations`, {
            headers: {
              'Authorization': `Bearer ${await AsyncStorage.getItem('token')}`
            }
          });
          if (response.ok) {
            const stations = await response.json();
            const stationsArray = Array.isArray(stations) ? stations : (stations.data || stations || []);
            const stationIdToMatch = String(orderStationId).toUpperCase().trim();
            stationInfo = stationsArray.find((s: any) => {
              const stationStationId = String(s.stationId || '').toUpperCase().trim();
              const stationId = String(s._id || s.id || '');
              return stationStationId === stationIdToMatch || stationId === stationIdToMatch;
            });
            if (stationInfo) {
              console.log('Station found for invoice:', stationInfo);
            } else {
              console.warn('Station not found for stationId:', orderStationId);
            }
          }
        } catch (stationError) {
          console.warn('Could not fetch station info:', stationError);
        }
      }
      
      // If order doesn't have stationId, try to get it from the logged-in user
      if (!stationInfo) {
        try {
          const userData = await AsyncStorage.getItem('user');
          if (userData) {
            const parsedUser = JSON.parse(userData);
            const userStationId = parsedUser.stationId;
            if (userStationId) {
              const response = await fetch(`${API_BASE_URL}/stations`, {
                headers: {
                  'Authorization': `Bearer ${await AsyncStorage.getItem('token')}`
                }
              });
              if (response.ok) {
                const stations = await response.json();
                const stationsArray = Array.isArray(stations) ? stations : (stations.data || stations || []);
                const stationIdToMatch = String(userStationId).toUpperCase().trim();
                stationInfo = stationsArray.find((s: any) => {
                  const stationStationId = String(s.stationId || '').toUpperCase().trim();
                  const stationId = String(s._id || s.id || '');
                  return stationStationId === stationIdToMatch || stationId === stationIdToMatch;
                });
                if (stationInfo) {
                  console.log('Station found from user stationId for invoice:', stationInfo);
                }
              }
            }
          }
        } catch (e) {
          console.warn('Could not get station from user:', e);
        }
      }

      const orderId = order.orderId || order.id || order._id || "N/A";
      const customerName = order.customerName || order.customer || "N/A";
      const customerPhone = order.customerPhone || order.phone || "";
      const customerEmail = order.customerEmail || order.email || "";
      
      // Calculate subtotal from items
      const items = order.items || (order.service ? [{
        service: order.service,
        quantity: order.quantity || "1",
        amount: order.serviceFee || order.totalFee || 0
      }] : []);
      
      const subtotal = items.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
      
      // Calculate discount amount
      let discountAmount = 0;
      let discountCode = order.discount || '0%';
      if (order.discount && order.discount !== '0%') {
        const discountMatch = String(order.discount).match(/(\d+(?:\.\d+)?)/);
        if (discountMatch && String(order.discount).includes('%')) {
          discountAmount = subtotal * (parseFloat(discountMatch[1]) / 100);
          discountCode = `${discountMatch[1]}%`;
        } else if (discountMatch) {
          discountAmount = parseFloat(discountMatch[1]);
          discountCode = `₱${discountMatch[1]}`;
        }
      }
      
      const total = subtotal - discountAmount;
      const paid = order.paid || order.amountPaid || 0;
      const balance = Math.max(0, total - paid);
      const computedStatus2 = paid >= total ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid';
      
      // Format dates
      const orderDate = order.createDate || order.date || order.createdAt;
      const formattedDate = orderDate 
        ? new Date(orderDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'N/A';
      
      const dueDate = new Date(orderDate || Date.now());
      dueDate.setDate(dueDate.getDate() + 3);
      const formattedDueDate = dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      
      // Map items to invoice format with unit prices
      const invoiceItems = items.map((item: any) => {
        let unitPrice = item.amount || 0;
        const qty = String(item.quantity || "1");
        
        if (qty.includes('kg')) {
          const kg = parseFloat(qty.replace('kg', '')) || 1;
          unitPrice = item.amount / kg;
        } else if (qty.includes('item')) {
          const itemCount = parseFloat(qty.replace(/items?/gi, '').trim()) || 1;
          unitPrice = item.amount / itemCount;
        }
        
        return {
          service: item.service || "N/A",
          quantity: qty,
          unitPrice: unitPrice,
          amount: item.amount || 0
        };
      });

      const invoiceData = {
        id: orderId,
        date: formattedDate,
        dueDate: formattedDueDate,
        customer: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          address: ""
        },
        items: invoiceItems,
        subtotal: subtotal,
        discount: discountAmount,
        discountCode: discountCode,
        tax: 0,
        total: total,
        paid: paid,
        balance: balance,
        paymentStatus: computedStatus2,
        paymentMethod: paid > 0 ? (balance === 0 ? 'Cash' : 'Partial Payment') : 'Pending',
        paymentDate: orderDate ? new Date(orderDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '',
        notes: order.notes || 'Thank you for choosing Sparklean Laundry Shop! We appreciate your business.',
        pickupDate: order.pickupDate ? new Date(order.pickupDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null,
        deliveryDate: order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null,
        staffName: staffName,
        format: 'invoice'
      };

      console.log('Invoice - stationInfo:', stationInfo);
      console.log('Invoice - invoiceData:', invoiceData);
      console.log('Invoice - invoiceData.format:', invoiceData.format);
      
      setInvoiceData(invoiceData);
      setInvoiceStationInfo(stationInfo);
      setShowInvoice(true);
    } catch (error: any) {
      logger.error("Error generating invoice:", error);
      Alert.alert("Error", "Failed to generate invoice. " + (error.message || ""));
    }
  };

  const getOrderBackendId = (order: Order | any) => {
    if (!order) return null;
    return order.__raw?._id || order.__raw?.id || order._id || order.orderId;
  };



  return (
    <View style={GlobalStyles.mainLayout}>
      {/* Modern Sidebar */}
      <ModernSidebar />

      {/* Main content */}
      <View style={GlobalStyles.mainContent}>
        {/* Modern Header */}
        <Header title="Order Management" />

        {/* Content - ScrollView for page scrolling */}
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          {/* Page Title Section */}
          <View style={styles.pageHeader}>
            <View style={styles.titleSection}>
              <View style={styles.titleRow}>
                <Ionicons name="clipboard-outline" size={28} color="#111827" style={{ marginRight: 12 }} />
                <View>
                  <Text style={styles.pageTitle}>Order Management</Text>
                  <Text style={styles.pageSubtitle}>View and manage all orders</Text>
                </View>
                </View>
                </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleRefresh}
                disabled={refreshing || loading}
              >
                <Animated.View
                  style={{
                    transform: [{
                      rotate: spinValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    }],
                  }}
                >
                  <Ionicons 
                    name="refresh" 
                    size={18} 
                    color={refreshing ? "#9CA3AF" : "#6B7280"}
                  />
                </Animated.View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, !showStats && [styles.toggleButtonActive, { backgroundColor: dynamicColors.primary[50], borderColor: dynamicColors.primary[500] }]]}
                onPress={() => setShowStats(!showStats)}
              >
                <Ionicons 
                  name={showStats ? "eye-outline" : "eye-off-outline"} 
                  size={18} 
                  color={showStats ? "#374151" : dynamicColors.primary[500]} 
                />
                <Text style={[styles.toggleButtonText, !showStats && { color: dynamicColors.primary[500] }]}>
                  Stats
                </Text>
              </TouchableOpacity>
              <View style={styles.exportDropdownContainer}>
                <TouchableOpacity
                  ref={exportButtonRef}
                  style={[styles.exportButton, dynamicButtonStyles.primary]} 
                  onPress={() => {
                    if (exportButtonRef.current) {
                      exportButtonRef.current.measureInWindow((x, y, width, height) => {
                        setExportButtonLayout({ x, y, width, height });
                        setShowExportDropdown(!showExportDropdown);
                      });
                    } else {
                      setShowExportDropdown(!showExportDropdown);
                    }
                  }}
                >
                  <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                  <Text style={[styles.exportButtonText, dynamicButtonStyles.primaryText]}>Export</Text>
                  <Ionicons name="chevron-down" size={16} color="#FFFFFF" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.createOrderButton, dynamicButtonStyles.primary]}
                onPress={() => {
                  setDraftOrderIdForModal(null);
                  setIsCreateOrderModalOpen(true);
                }}
              >
                <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                <Text style={[styles.createOrderButtonText, dynamicButtonStyles.primaryText]}>Create Order</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Today's Summary */}
          {showStats && (
            loading ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <ShimmerStatsCard key={index} />
                ))}
              </View>
            ) : (
              <TodaySummary
                stats={[
                  {
                    label: 'Total Orders',
                    value: stats.totalOrders,
                    icon: 'receipt-outline',
                    color: dynamicColors.primary[500],
                    onPress: () => setFilterPayment('All'),
                  },
                  {
                    label: 'Paid Orders',
                    value: stats.paidOrders,
                    icon: 'checkmark-circle-outline',
                    color: colors.success[500],
                    trend: stats.totalOrders > 0 
                      ? { value: Math.round((stats.paidOrders / stats.totalOrders) * 100), isPositive: true }
                      : undefined,
                    onPress: () => setFilterPayment('Paid'),
                  },
                  {
                    label: 'Unpaid Orders',
                    value: stats.unpaidOrders,
                    icon: 'close-circle-outline',
                    color: colors.error[500],
                    onPress: () => setFilterPayment('Unpaid'),
                  },
                  {
                    label: 'Total Revenue',
                    value: `₱${stats.totalRevenue.toFixed(2)}`,
                    icon: 'cash-outline',
                    color: colors.success[600],
                  },
                  {
                    label: 'Pending',
                    value: stats.pendingOrders,
                    icon: 'time-outline',
                    color: colors.warning[500],
                  },
                  {
                    label: 'Completed',
                    value: stats.completedOrders,
                    icon: 'checkmark-done-outline',
                    color: colors.success[600],
                  },
                ]}
              />
            )
          )}

          {/* Search and Filter Section */}
          <View style={styles.searchSection}>
            <SearchFilter 
              searchQuery={debouncedSearchQuery} 
              setSearchQuery={setSearchQuery}
              showDrafts={showDrafts}
              onToggleDrafts={() => setShowDrafts(!showDrafts)}
              onOpenFilters={() => setShowFiltersModal(true)}
            />
            
            {/* Inline Payment Status Filters */}
            <InlineFilters
              filters={[
                { label: 'All', value: 'All', icon: 'list-outline', count: orders.length },
                { label: 'Paid', value: 'Paid', icon: 'checkmark-circle-outline', count: orders.filter(o => o.feeStatus === 'Paid').length },
                { label: 'Unpaid', value: 'Unpaid', icon: 'close-circle-outline', count: orders.filter(o => o.feeStatus === 'Unpaid').length },
                { label: 'Partial', value: 'Partial', icon: 'time-outline', count: orders.filter(o => o.feeStatus === 'Partial').length },
              ]}
              activeFilters={filterPayment === 'All' ? [] : [filterPayment]}
              onFilterToggle={(value) => {
                setFilterPayment(value === filterPayment ? 'All' : value);
              }}
              onClearAll={() => setFilterPayment('All')}
              title="Payment Status"
              showClearAll={filterPayment !== 'All'}
            />
            
            <View style={styles.orderCountContainer}>
              <Text style={styles.orderCountText}>
                {orders.filter(o => {
                  const matchesSearch = (o.orderId ?? "").toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                    (o.customerName ?? "").toLowerCase().includes(debouncedSearchQuery.toLowerCase());
                  const matchesPayment = filterPayment === "All" || o.feeStatus === filterPayment;
                  const matchesDrafts = showDrafts ? (o.__raw?.isDraft === true) : (o.__raw?.isDraft !== true);
                  return matchesSearch && matchesPayment && matchesDrafts;
                }).length} Orders Found
              </Text>
            </View>
          </View>

          {/* Order table - scroll disabled to allow parent ScrollView to handle scrolling */}
          <OrderTable
            setVisible={(visible) => {
              setShowTransaction(visible);
              if (!visible) {
                setEditMode(false);
              }
            }}
            setSelectedOrder={setSelectedOrder}
            searchQuery={debouncedSearchQuery}
            orders={orders}
            loading={loading}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            onEditOrder={handleEditOrder}
            onViewInvoice={handleViewInvoice}
            onPrintReceipt={handlePrintReceipt}
            orderLocks={orderLocks}
            scrollEnabled={false}
          />
        </ScrollView>

        {/* Modal for viewing transaction */}
        <ViewTransaction
          visible={showTransaction}
          setVisible={(visible) => {
            setShowTransaction(visible);
            if (!visible) {
              setEditMode(false);
            }
          }}
          orderData={selectedOrder}
          initialEditMode={editMode}
          onOrderUpdated={async () => {
            await fetchOrders(true); // Pass true to update selectedOrder
          }}
          onViewInvoice={handleViewInvoice}
        />
        
        {/* Invoice Modal */}
        {invoiceData && (
          <Modal
            visible={showInvoice}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowInvoice(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.invoiceModal}>
                <ScrollView 
                  style={styles.invoiceScrollView}
                  contentContainerStyle={styles.invoiceContentContainer}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Invoice Header */}
                  <View style={styles.invoiceHeaderSection}>
                    <View style={styles.companyInfo}>
                      <View style={[styles.companyLogo, { backgroundColor: dynamicColors.primary[500], shadowColor: dynamicColors.primary[500] }]}>
                        <BrandIcon size={36} />
                      </View>
                      <View>
                        <Text style={styles.companyName}>
                          <Text style={[styles.brandPart1, { color: dynamicColors.primary[500] }]}>Sparklean</Text> <Text style={styles.brandPart2}>Laundry Shop{invoiceStationInfo?.name ? ` - ${invoiceStationInfo.name}` : ''}</Text>
                        </Text>
                        <Text style={styles.companyDetails}>
                          {invoiceStationInfo?.address || '123 Laundry Street, Clean City'}{'\n'}
                          {invoiceStationInfo?.phone ? `Phone: ${invoiceStationInfo.phone}` : 'Phone: +63 912 345 6789'}{'\n'}
                          Email: sparklean@example.com{'\n'}
                          Facebook: fb.com/SparkleanLaundryShop
                        </Text>
                      </View>
                    </View>
                    <View style={styles.invoiceInfo}>
                      <Text style={styles.invoiceTitleText}>INVOICE</Text>
                      <Text style={[styles.invoiceNumber, { color: dynamicColors.primary[500] }]}>#{invoiceData.id}</Text>
                      <Text style={styles.invoiceDate}>
                        <Text style={styles.dateLabel}>Date: </Text>{invoiceData.date}
                      </Text>
                      {invoiceData.time ? (
                        <Text style={styles.invoiceDate}>
                          <Text style={styles.dateLabel}>Time: </Text>{invoiceData.time}
                        </Text>
                      ) : null}
                      <Text style={styles.invoiceDate}>
                        <Text style={styles.dateLabel}>Due: </Text>{invoiceData.dueDate}
                      </Text>
                    </View>
                  </View>

                  {/* Bill To / Payment Status */}
                  <View style={styles.invoiceDetailsSection}>
                    <View style={styles.billToSection}>
                      <Text style={styles.sectionLabel}>BILL TO</Text>
                      <View style={styles.customerDetails}>
                        <Text style={styles.customerName}>{invoiceData.customer.name}</Text>
                        {invoiceData.customer.address ? <Text>{invoiceData.customer.address}</Text> : null}
                        {invoiceData.customer.email ? <Text>📧 {invoiceData.customer.email}</Text> : null}
                        {invoiceData.customer.phone ? <Text>📱 {invoiceData.customer.phone}</Text> : null}
                      </View>
                    </View>
                    <View style={styles.paymentStatusSection}>
                      <Text style={styles.sectionLabel}>PAYMENT STATUS</Text>
                      <View style={[
                        styles.paymentBadge,
                        invoiceData.paymentStatus === 'Paid' && styles.paymentBadgePaid,
                        invoiceData.paymentStatus === 'Unpaid' && styles.paymentBadgeUnpaid,
                        invoiceData.paymentStatus === 'Partial' && styles.paymentBadgePartial,
                      ]}>
                        <Ionicons 
                          name={invoiceData.paymentStatus === 'Paid' ? "checkmark-circle" : "time-outline"} 
                          size={18} 
                          color={
                            invoiceData.paymentStatus === 'Paid' ? "#059669" :
                            invoiceData.paymentStatus === 'Unpaid' ? "#DC2626" : "#D97706"
                          }
                        />
                        <Text style={styles.paymentBadgeText}>{invoiceData.paymentStatus}</Text>
                      </View>
                      <View style={styles.paymentDetailsList}>
                        <Text><Text style={styles.boldText}>Method:</Text> {invoiceData.paymentMethod}</Text>
                        {invoiceData.paymentDate ? <Text><Text style={styles.boldText}>Date:</Text> {invoiceData.paymentDate}</Text> : null}
                      </View>
                    </View>
                  </View>

                  {/* Services Table */}
                  <View style={styles.tableContainer}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableHeaderText, { flex: 2 }]}>Service</Text>
                      <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Quantity</Text>
                      <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Unit Price</Text>
                      <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Amount</Text>
                    </View>
                    {invoiceData.items.map((item: any, index: number) => (
                      <View key={index} style={styles.tableRow}>
                        <Text style={[styles.tableCell, styles.serviceName, { flex: 2 }]}>{item.service}</Text>
                        <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{item.quantity}</Text>
                        <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>₱{item.unitPrice.toFixed(2)}</Text>
                        <Text style={[styles.tableCell, styles.amountCell, { flex: 1, textAlign: 'right' }]}>₱{item.amount.toFixed(2)}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Summary Section */}
                  <View style={styles.invoiceSummarySection}>
                    <View style={styles.summaryRows}>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Subtotal:</Text>
                        <Text style={styles.summaryValue}>₱{invoiceData.subtotal.toFixed(2)}</Text>
                      </View>
                      {invoiceData.discount > 0 && (
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Discount {invoiceData.discountCode ? `(${invoiceData.discountCode})` : ''}:</Text>
                          <Text style={[styles.summaryValue, styles.discountValue]}>-₱{invoiceData.discount.toFixed(2)}</Text>
                        </View>
                      )}
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Tax (0%):</Text>
                        <Text style={styles.summaryValue}>₱{invoiceData.tax.toFixed(2)}</Text>
                      </View>
                      <View style={styles.summaryDivider} />
                      <View style={[styles.summaryRow, styles.summaryRowTotal]}>
                        <Text style={styles.summaryLabelTotal}>Total:</Text>
                        <Text style={styles.summaryValueTotal}>₱{invoiceData.total.toFixed(2)}</Text>
                      </View>
                      <View style={[styles.summaryRow, styles.summaryRowBalance]}>
                        <Text style={styles.summaryLabelBalance}>Balance Due:</Text>
                        <Text style={styles.summaryValueBalance}>₱{invoiceData.balance.toFixed(2)}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Notes Section */}
                  <View style={[styles.invoiceNotes, { borderLeftColor: dynamicColors.primary[500] }]}>
                    <Text style={styles.notesTitle}>Notes</Text>
                    <Text style={styles.notesText}>{invoiceData.notes}</Text>
                    {invoiceData.pickupDate && (
                      <Text style={styles.notesText}>
                        <Text style={styles.boldText}>Pickup Date:</Text> {invoiceData.pickupDate}
                      </Text>
                    )}
                    {invoiceData.deliveryDate && (
                      <Text style={styles.notesText}>
                        <Text style={styles.boldText}>Delivery Date:</Text> {invoiceData.deliveryDate}
                      </Text>
                    )}
                    <Text style={[styles.notesText, styles.termsText]}>
                      For any questions regarding this invoice, please contact us at the above details.
                    </Text>
                  </View>

                  {/* Footer */}
                  <View style={styles.invoiceFooterSection}>
                    <View style={styles.signatureSection}>
                      <View style={styles.signatureLine} />
                      <Text style={styles.signatureLabel}>Staff Signature</Text>
                    </View>
                    <Text style={[styles.footerText, { color: dynamicColors.primary[500] }]}>Thank you for your business!</Text>
                  </View>
                </ScrollView>
                
                {/* Modal Footer Buttons */}
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    onPress={() => {
                      console.log('Print invoice - invoiceStationInfo:', invoiceStationInfo);
                      console.log('Print invoice - invoiceData:', invoiceData);
                      if (invoiceData) {
                        printInvoiceWindow(invoiceData, invoiceStationInfo);
                      }
                    }}
                    style={[styles.primaryButton, { backgroundColor: dynamicColors.primary[500] }]}
                  >
                    <Text style={styles.primaryButtonText}>Print</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowInvoice(false)}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}


        {/* Export Dropdown Modal - Using Modal to ensure it's always on top */}
        {showExportDropdown && (
          <Modal
            visible={showExportDropdown}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowExportDropdown(false)}
          >
            <TouchableOpacity
              style={styles.exportDropdownOverlay}
              activeOpacity={1}
              onPress={() => setShowExportDropdown(false)}
            >
              <View 
                style={[
                  styles.exportDropdownWrapper,
                  {
                    position: 'absolute',
                    top: exportButtonLayout.y > 0 ? exportButtonLayout.y + exportButtonLayout.height + 8 : 80,
                    right: exportButtonLayout.x > 0 
                      ? Dimensions.get('window').width - exportButtonLayout.x - exportButtonLayout.width
                      : 16,
                  }
                ]}
                onStartShouldSetResponder={() => true}
              >
                <View style={styles.exportDropdownMenu}>
                  <View style={styles.exportHeader}>
                    <Text style={styles.exportHeaderText}>Export Orders</Text>
                    <Text style={styles.exportHeaderSubtext}>
                      {orders.filter(o => 
                        (searchQuery === "" || 
                          (o.orderId ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (o.customerName ?? "").toLowerCase().includes(searchQuery.toLowerCase())) &&
                        (filterPayment === "All" || o.feeStatus === filterPayment) &&
                        (showDrafts ? (o.__raw?.isDraft === true) : (o.__raw?.isDraft !== true))
                      ).length} orders
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.exportOption} 
                    onPress={() => {
                      handleExport('CSV');
                      setShowExportDropdown(false);
                    }}
                  >
                    <Ionicons name="document-text-outline" size={18} color="#374151" />
                    <Text style={styles.exportOptionText}>CSV Format</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.exportOption} 
                    onPress={() => {
                      handleExport('Excel');
                      setShowExportDropdown(false);
                    }}
                  >
                    <Ionicons name="document-text-outline" size={18} color="#374151" />
                    <Text style={styles.exportOptionText}>Excel Format</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.exportOption, { borderBottomWidth: 0 }]} 
                    onPress={() => {
                      handleExport('PDF');
                      setShowExportDropdown(false);
                    }}
                  >
                    <Ionicons name="document-text-outline" size={18} color="#374151" />
                    <Text style={styles.exportOptionText}>PDF Format</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        {/* Create Order Modal */}
        <AddOrderModal
          isOpen={isCreateOrderModalOpen}
          onClose={() => {
            setIsCreateOrderModalOpen(false);
            setDraftOrderIdForModal(null);
          }}
          onOrderCreated={() => {
            fetchOrders();
          }}
          draftOrderId={draftOrderIdForModal}
        />

        {/* Filters Modal */}
        <Modal
          visible={showFiltersModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowFiltersModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.filtersModal}>
              <View style={styles.filtersHeader}>
                <Text style={styles.filtersTitle}>Filters</Text>
                <TouchableOpacity
                  onPress={() => setShowFiltersModal(false)}
                  style={styles.closeFiltersButton}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <View style={styles.filtersContent}>
                <Text style={styles.filterLabel}>Payment Status</Text>
                <View style={styles.filterOptions}>
                  {['All', 'Paid', 'Unpaid', 'Partial'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      onPress={() => {
                        setFilterPayment(status);
                        setShowFiltersModal(false);
                      }}
                      style={[
                        styles.filterOption,
                        filterPayment === status && styles.filterOptionActive
                      ]}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filterPayment === status && styles.filterOptionTextActive
                      ]}>
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setFilterPayment('All');
                    setShowFiltersModal(false);
                  }}
                  style={styles.clearFiltersButton}
                >
                  <Text style={styles.clearFiltersText}>Clear Filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Floating Action Button */}
        <FloatingActionButton
          mainIcon="add"
          mainAction={() => {
            setDraftOrderIdForModal(null);
            setIsCreateOrderModalOpen(true);
          }}
          actions={[
            {
              icon: 'add-circle-outline',
              label: 'New Order',
              onPress: () => {
                setDraftOrderIdForModal(null);
                setIsCreateOrderModalOpen(true);
              },
              color: dynamicColors.primary[500],
            },
            {
              icon: 'person-add-outline',
              label: 'Add Customer',
              onPress: () => router.push('/home/customer'),
              color: colors.success[500],
            },
            {
              icon: 'download-outline',
              label: 'Export',
              onPress: () => setShowExportDropdown(true),
              color: colors.warning[500],
            },
          ]}
        />

        {/* Command Palette */}
        <CommandPalette
          isVisible={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          commands={commands}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  titleSection: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageTitle: {
    ...typography.h1,
    marginBottom: spacing.xs,
  },
  pageSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  resetButton: {
    ...buttonStyles.secondary,
    gap: spacing.xs + 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  refreshingButton: {
    opacity: 0.6,
  },
  resetButtonText: {
    ...buttonStyles.secondaryText,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  toggleButtonActive: {
    backgroundColor: '#EFF6FF',
    // borderColor: '#2563EB', // Now using dynamic color via inline style
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    fontFamily: 'Poppins_500Medium',
  },
  toggleButtonTextActive: {
    // color: '#2563EB', // Now using dynamic color via inline style
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  exportButton: {
    // ...buttonStyles.primary, // Now using dynamic button styles
  },
  exportButtonText: {
    // ...buttonStyles.primaryText, // Now using dynamic button styles
    marginLeft: spacing.sm,
  },
  createOrderButton: {
    // ...buttonStyles.primary, // Now using dynamic button styles
    marginLeft: spacing.sm,
  },
  createOrderButtonText: {
    // ...buttonStyles.primaryText, // Now using dynamic button styles
    marginLeft: spacing.sm,
  },
  exportDropdownContainer: {
    position: 'relative',
  },
  exportDropdownOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  exportDropdownWrapper: {
    alignItems: 'flex-end',
  },
  exportDropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    minWidth: 200,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  exportHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  exportHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    fontFamily: 'Poppins_700Bold',
  },
  exportHeaderSubtext: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: 'Poppins_500Medium',
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  exportOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  searchSection: {
    marginBottom: 16,
  },
  orderCountContainer: {
    marginTop: -20,
    marginBottom: -20,
  },
  orderCountText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: 'Poppins_500Medium',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  invoiceModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxWidth: 800,
    maxHeight: '90%',
    height: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    overflow: 'hidden',
  },
  invoiceScrollView: {
    flex: 1,
  },
  invoiceContentContainer: {
    padding: 32,
    flexGrow: 1,
  },
  invoiceHeaderSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 24,
    marginBottom: 24,
    borderBottomWidth: 3,
    // borderBottomColor: '#2563EB', // Now using dynamic color via inline style
  },
  companyInfo: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    flex: 1,
  },
  companyLogo: {
    width: 60,
    height: 60,
    // backgroundColor: '#2563EB', // Now using dynamic color via inline style
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    // shadowColor: '#2563EB', // Now using dynamic color via inline style
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  logoEmoji: {
    fontSize: 32,
  },
  companyName: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
  },
  brandPart1: {
    // color: '#2563EB', // Now using dynamic color via inline style
  },
  brandPart2: {
    color: '#F97316',
    fontWeight: '600',
  },
  companyDetails: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
  invoiceInfo: {
    alignItems: 'flex-end',
  },
  invoiceTitleText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: 2,
  },
  invoiceNumber: {
    fontSize: 20,
    // color: '#2563EB', // Now using dynamic color via inline style
    fontWeight: '700',
    marginBottom: 12,
  },
  invoiceDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  dateLabel: {
    fontWeight: '700',
  },
  invoiceDetailsSection: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 32,
    flexWrap: 'wrap',
  },
  billToSection: {
    flex: 1,
    minWidth: 200,
  },
  paymentStatusSection: {
    flex: 1,
    minWidth: 200,
    alignItems: 'flex-end',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  customerDetails: {
    // container for customer texts (text styles applied on children)
  },
  customerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
  },
  paymentBadgePaid: {
    backgroundColor: '#D1FAE5',
    borderColor: '#059669',
  },
  paymentBadgeUnpaid: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  paymentBadgePartial: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
  },
  paymentBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  paymentDetailsList: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    alignItems: 'flex-end',
  },
  boldText: {
    fontWeight: '700',
  },
  tableContainer: {
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#D1D5DB',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Poppins_700Bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableCell: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'Poppins_400Regular',
  },
  serviceName: {
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Poppins_600SemiBold',
  },
  amountCell: {
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Poppins_700Bold',
  },
  invoiceSummarySection: {
    alignItems: 'flex-end',
    marginBottom: 32,
  },
  summaryRows: {
    minWidth: 320,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    fontFamily: 'Poppins_500Medium',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Poppins_700Bold',
  },
  discountValue: {
    color: '#059669',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#D1D5DB',
    marginVertical: 8,
  },
  summaryRowTotal: {
    paddingVertical: 16,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#111827',
  },
  summaryLabelTotal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Poppins_700Bold',
  },
  summaryValueTotal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Poppins_700Bold',
  },
  summaryRowPaid: {
    // color applied on child text via paidValue
  },
  paidValue: {
    // color: '#2563EB', // Now using dynamic color via inline style
  },
  summaryRowBalance: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    marginTop: 12,
  },
  summaryLabelBalance: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F97316',
  },
  summaryValueBalance: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F97316',
  },
  invoiceNotes: {
    backgroundColor: '#F9FAFB',
    padding: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
    // borderLeftColor: '#2563EB', // Now using dynamic color via inline style
    marginBottom: 24,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 8,
  },
  termsText: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  invoiceFooterSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 24,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  signatureSection: {
    alignItems: 'center',
  },
  signatureLine: {
    width: 250,
    height: 2,
    backgroundColor: '#111827',
    marginBottom: 8,
  },
  signatureLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  footerText: {
    fontSize: 18,
    fontWeight: '700',
    // color: '#2563EB', // Now using dynamic color via inline style
    fontFamily: 'Poppins_700Bold',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  primaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    // backgroundColor: '#2563EB', // Now using dynamic color via inline style
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
  },
  secondaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  secondaryButtonText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
  },
  filtersModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filtersTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeFiltersButton: {
    padding: 4,
  },
  filtersContent: {
    padding: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  filterOptions: {
    gap: 8,
    marginBottom: 20,
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  filterOptionActive: {
    // backgroundColor: '#2563EB', // Now using dynamic color via inline style
    // borderColor: '#2563EB', // Now using dynamic color via inline style (handled by InlineFilters component)
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  filterOptionTextActive: {
    color: '#FFFFFF',
  },
  clearFiltersButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
});
