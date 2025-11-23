import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiPrinter, FiMail, FiArrowLeft, FiCheck, FiClock } from 'react-icons/fi'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import Button from '../components/Button'
import BrandIcon from '../components/BrandIcon'
import { orderAPI, stationAPI } from '../utils/api'
import LoadingSpinner from '../components/LoadingSpinner'
import { useUser } from '../context/UserContext'
import './InvoiceReceipt.css'

const InvoiceReceipt: React.FC = () => {
  const { id: urlId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useUser()
  const [isLoading, setIsLoading] = useState(true)
  const [invoice, setInvoice] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [stationInfo, setStationInfo] = useState<any>(null)

  // Fetch order data from API
  useEffect(() => {
    const fetchOrder = async () => {
      // Debug: Check what we're getting from URL params
      console.log('URL ID from params:', urlId)
      
      // Decode the ID in case it was URL encoded (handles special characters like #)
      const id = urlId ? decodeURIComponent(urlId) : null
      
      console.log('Decoded ID:', id)
      
      if (!id || id.trim() === '') {
        console.error('No order ID found in URL')
        toast.error('Order ID is required')
        setTimeout(() => navigate('/orders'), 2000)
        return
      }

      setIsLoading(true)
      try {
        console.log('Fetching order with ID:', id)
        const order = await orderAPI.getById(id)
        console.log('Order fetched:', order)
        console.log('Order stationId:', order.stationId)
        
        // Fetch station information if order has stationId
        let station = null
        const orderStationId = order.stationId
        if (orderStationId) {
          try {
            // Get all stations and find the one matching stationId
            const stations = await stationAPI.getAll()
            const stationsArray = Array.isArray(stations) ? stations : (stations.data || stations || [])
            station = stationsArray.find((s: any) => {
              // Match by stationId (string) or _id (ObjectId or string)
              const orderStationId = String(order.stationId).toUpperCase().trim()
              const stationStationId = String(s.stationId || '').toUpperCase().trim()
              const stationId = String(s._id || s.id || '')
              return stationStationId === orderStationId || stationId === orderStationId
            })
            if (station) {
              console.log('Station found:', station)
              setStationInfo(station)
            } else {
              console.warn('Station not found for stationId:', order.stationId)
            }
          } catch (stationError) {
            console.warn('Could not fetch station info:', stationError)
            // Continue without station info
          }
        }
        
        // Calculate subtotal from items
        const subtotal = order.items.reduce((sum: number, item: any) => sum + (item.amount || 0), 0)
        
        // Calculate discount amount from discount string or discountId
        let discountAmount = 0
        let discountCode = order.discount || '0%'
        if (order.discountId && typeof order.discountId === 'object') {
          const discount = order.discountId
          if (discount.type === 'percentage') {
            discountAmount = subtotal * (discount.value / 100)
            discountCode = `${discount.value}%`
          } else {
            discountAmount = discount.value
            discountCode = `₱${discount.value}`
          }
        } else if (order.discount && order.discount !== '0%') {
          // Try to parse discount string
          const discountMatch = order.discount.match(/(\d+(?:\.\d+)?)/)
          if (discountMatch && order.discount.includes('%')) {
            discountAmount = subtotal * (parseFloat(discountMatch[1]) / 100)
          } else if (discountMatch) {
            discountAmount = parseFloat(discountMatch[1])
          }
        }

        const total = subtotal - discountAmount
        const paid = order.paid || 0
        const balance = Math.max(0, total - paid)

        // Get customer info - check if customerId is populated or use customer string
        const customerName = order.customerId?.name || order.customer
        const customerEmail = order.customerId?.email || order.customerEmail || ''
        const customerPhone = order.customerId?.phone || order.customerPhone || ''
        const customerAddress = order.customerId?.address || ''

        // Map items to invoice format
        const invoiceItems = order.items.map((item: any) => ({
          service: item.service,
          quantity: item.quantity,
          unitPrice: item.quantity.includes('kg') 
            ? (item.amount / parseFloat(item.quantity.replace('kg', '')))
            : item.quantity.includes('flat')
            ? item.amount
            : item.quantity.includes('item')
            ? (item.amount / parseFloat(item.quantity.replace(/items?/gi, '').trim()))
            : item.amount,
          amount: item.amount
        }))

        // Calculate due date (default to 3 days after order date)
        const orderDate = new Date(order.date || order.createdAt)
        const dueDate = new Date(orderDate)
        dueDate.setDate(dueDate.getDate() + 3)

        const invoiceData = {
          id: order.id,
          date: orderDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          dueDate: dueDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          customer: {
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
            address: customerAddress
          },
          items: invoiceItems,
          subtotal: subtotal,
          discount: discountAmount,
          discountCode: discountCode,
          tax: 0,
          total: total,
          paid: paid,
          balance: balance,
          paymentStatus: order.payment || 'Unpaid',
          paymentMethod: paid > 0 ? (balance === 0 ? 'Cash' : 'Partial Payment') : 'Pending',
          paymentDate: order.date ? new Date(order.date).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }) : '',
          notes: order.notes || 'Thank you for choosing Sparklean Laundry Shop! We appreciate your business.',
          pickupDate: order.pickupDate ? new Date(order.pickupDate).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }) : null,
          deliveryDate: order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }) : null
        }

        setInvoice(invoiceData)
        setError(null)
      } catch (error: any) {
        console.error('Error fetching order:', error)
        setError(error.message || 'Failed to load invoice')
        toast.error(error.message || 'Failed to load invoice')
        setIsLoading(false)
        // Don't navigate immediately, let user see the error
        setTimeout(() => navigate('/orders'), 3000)
      } finally {
        setIsLoading(false)
      }
    }

    if (urlId) {
      fetchOrder()
    } else {
      // If no ID in URL, show error immediately
      setError('Order ID is required')
      setIsLoading(false)
      setTimeout(() => navigate('/orders'), 2000)
    }
  }, [urlId, navigate])

  // Show loading state
  if (isLoading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', flexDirection: 'column', gap: '16px' }}>
          <LoadingSpinner />
          <p>Loading invoice...</p>
        </div>
      </Layout>
    )
  }

  // Show error state
  if (error || !invoice) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', flexDirection: 'column', gap: '16px' }}>
          <p style={{ color: 'var(--color-error)', fontSize: '16px' }}>{error || 'Invoice not found'}</p>
          <Button onClick={() => navigate('/orders')}>Back to Orders</Button>
        </div>
      </Layout>
    )
  }

  const handlePrint = async () => {
    // Show preview first
    toast.success('Opening invoice preview...', {
      duration: 1500,
      icon: '👁️'
    })
    
    // Debug: Log station info
    console.log('Print - stationInfo:', stationInfo)
    console.log('Print - invoice:', invoice)
    
    // If stationInfo is not available, try to fetch it
    let currentStationInfo = stationInfo
    if (!currentStationInfo && invoice?.stationId) {
      try {
        const stations = await stationAPI.getAll()
        const stationsArray = Array.isArray(stations) ? stations : (stations.data || stations || [])
        const orderStationId = String(invoice.stationId)
        currentStationInfo = stationsArray.find((s: any) => {
          const stationStationId = String(s.stationId || '').toUpperCase().trim()
          const stationId = String(s._id || s.id || '').toUpperCase().trim()
          const orderId = orderStationId.toUpperCase().trim()
          return stationStationId === orderId || stationId === orderId
        })
        if (currentStationInfo) {
          console.log('Print - Fetched station:', currentStationInfo)
        }
      } catch (e) {
        console.warn('Print - Could not fetch station:', e)
      }
    }
    
    // Open preview window
    setTimeout(() => {
      const printWindow = window.open('', '_blank', 'width=400,height=600,scrollbars=yes,resizable=yes')
      if (printWindow) {
        // Build print content directly from invoice data with station info
        const stationName = currentStationInfo?.name ? ` - ${currentStationInfo.name}` : ''
        const stationAddress = currentStationInfo?.address || '123 Laundry Street, Clean City'
        const stationPhone = currentStationInfo?.phone ? `Phone: ${currentStationInfo.phone}` : 'Phone: +63 912 345 6789'
        
        console.log('Print - Using station:', { stationName, stationAddress, stationPhone })
        
        // Build the print content HTML directly - escape backticks and dollar signs for embedding in template literal
        const escapeForTemplate = (str: string) => str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${')
        const printContent = `
          <div class="order-receipt">
            <div class="receipt-header">
              <div class="company-info">
                <div class="company-logo"></div>
                <div class="company-details">
                  <h2>Sparklean Laundry Shop${stationName}</h2>
                  <p>${stationAddress}</p>
                  <p>${stationPhone}</p>
                  <p>Email: sparklean@example.com</p>
                </div>
              </div>
              <div class="receipt-info">
                <h3>INVOICE</h3>
                <p>Order: #${invoice.id}</p>
                <p>Date: ${invoice.date}</p>
                <p>Due: ${invoice.dueDate}</p>
              </div>
            </div>
            <div class="receipt-content">
              <div class="customer-section">
                <h4>Customer</h4>
                <p>${invoice.customer.name}</p>
                ${invoice.customer.phone ? `<p>${invoice.customer.phone}</p>` : ''}
                ${invoice.customer.email ? `<p>${invoice.customer.email}</p>` : ''}
                ${invoice.customer.address ? `<p>${invoice.customer.address}</p>` : ''}
              </div>
              <div class="service-section">
                <h4>Services</h4>
                ${invoice.items.map((item: any, index: number) => `
                  <div class="service-item">
                    <span class="service-name">${item.service} (${item.quantity})</span>
                    <span class="service-price">₱${item.amount.toFixed(2)}</span>
                  </div>
                `).join('')}
              </div>
              <div class="payment-section">
                <div class="payment-row">
                  <span>Subtotal:</span>
                  <span>₱${invoice.subtotal.toFixed(2)}</span>
                </div>
                ${invoice.discount > 0 ? `
                  <div class="payment-row">
                    <span>Discount ${invoice.discountCode ? `(${invoice.discountCode})` : ''}:</span>
                    <span>-₱${invoice.discount.toFixed(2)}</span>
                  </div>
                ` : ''}
                <div class="payment-row">
                  <span>Tax (0%):</span>
                  <span>₱${invoice.tax.toFixed(2)}</span>
                </div>
                <div class="payment-row total">
                  <span>Total:</span>
                  <span>₱${invoice.total.toFixed(2)}</span>
                </div>
                <div class="payment-row balance">
                  <span>Balance Due:</span>
                  <span>₱${invoice.balance.toFixed(2)}</span>
                </div>
              </div>
              <div class="status-section">
                <p>Payment Method: ${invoice.paymentMethod}</p>
                ${invoice.paymentDate ? `<p>Payment Date: ${invoice.paymentDate}</p>` : ''}
                ${invoice.pickupDate ? `<p>Pickup Date: ${invoice.pickupDate}</p>` : ''}
                ${invoice.deliveryDate ? `<p>Delivery Date: ${invoice.deliveryDate}</p>` : ''}
              </div>
            </div>
            <div class="receipt-footer">
              <div style="margin-top: 5mm; padding-top: 3mm; border-top: 1px dashed #000">
                <div style="margin-bottom: 8mm">
                  <div style="border-top: 1px solid #000; width: 60mm; margin: 0 auto 2mm; padding-top: 1mm"></div>
                  <div style="font-size: 10px; text-align: center; font-weight: bold">Staff Signature</div>
                  <div style="font-size: 9px; text-align: center; margin-top: 1mm; color: #666">
                    ${user?.fullName || user?.username || 'Staff Name: ________________'}
                  </div>
                </div>
              </div>
              <p>Thank you for your business!</p>
              <p>For questions, contact us at the above details.</p>
            </div>
          </div>
        `
        
        if (printContent) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Invoice Preview - Sparklean Laundry Shop</title>
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
                  background: var(--color-white);
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
                  transition: all 0.2s ease;
                }
                .btn-primary {
                  background: #007bff;
                  color: white;
                }
                .btn-primary:hover {
                  background: #0056b3;
                }
                .btn-secondary {
                  background: #6c757d;
                  color: white;
                }
                .btn-secondary:hover {
                  background: #545b62;
                }
                .invoice-preview {
                  border: 2px solid #000;
                  background: var(--color-white);
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
                .company-logo {
                  font-size: 20px;
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
                .preview-footer {
                  text-align: center;
                  margin-top: 20px;
                  padding-top: 15px;
                  border-top: 1px solid #ddd;
                  color: #666;
                  font-size: 12px;
                }
              </style>
            </head>
            <body>
              <div class="preview-container">
                <div class="preview-header">
                  <div class="preview-title">🖨️ Invoice Preview</div>
                  <div class="preview-subtitle">This is how your invoice will look when printed</div>
                  <div class="print-buttons">
                    <button class="btn btn-primary" onclick="printInvoice()">🖨️ Print Now</button>
                    <button class="btn btn-secondary" onclick="window.close()">❌ Close</button>
                  </div>
                </div>
                
                <div class="invoice-preview">
                  ${printContent}
                </div>
                
                <div class="preview-footer">
                  <p>💡 <strong>Tip:</strong> Make sure your thermal receipt printer is connected and set as default printer</p>
                </div>
              </div>
              
              <script>
                function printInvoice() {
                  // Create a new window for actual printing
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    // Get the invoice content from the preview (which has stationInfo)
                    const invoiceContent = document.querySelector('.invoice-preview')?.innerHTML || '';
                    printWindow.document.write(\`
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <title>Invoice</title>
                        <style>
                          @page {
                            size: 80mm 200mm;
                            margin: 0;
                          }
                          body {
                            margin: 0;
                            padding: 0;
                            font-family: 'Courier New', monospace;
                            font-size: 12px;
                            line-height: 1.2;
                            width: 80mm;
                          }
                          .order-receipt {
                            width: 80mm;
                            padding: 5mm;
                            box-sizing: border-box;
                          }
                          .receipt-header {
                            text-align: center;
                            margin-bottom: 5mm;
                            padding-bottom: 3mm;
                            border-bottom: 1px dashed #000;
                          }
                          .company-logo {
                            font-size: 20px;
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
                        </style>
                      </head>
                      <body>
                        \${invoiceContent}
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
            </html>
          `)
          printWindow.document.close()
        }
      }
    }, 300)
  }

  const handleEmail = async () => {
    if (!invoice?.customer?.email) {
      toast.error('Customer email not found')
      return
    }

    try {
      toast.loading('Sending invoice email...', { id: 'send-email' })
      
      const orderId = encodeURIComponent(invoice.id)
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/orders/${orderId}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user') || '{}')?.token || ''}`
        }
      })

      const data = await response.json()
      toast.dismiss('send-email')

      if (data.success) {
        toast.success(`Invoice sent to ${invoice.customer.email}`)
      } else {
        toast.error(data.message || 'Failed to send invoice email')
      }
    } catch (error: any) {
      toast.dismiss('send-email')
      console.error('Send email error:', error)
      toast.error(error.message || 'Failed to send invoice email')
    }
  }


  return (
    <>
      <Layout>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="invoice-page-wrapper"
        >
        {/* Action Bar - No Print */}
        <div className="invoice-actions no-print">
          <Button variant="secondary" onClick={() => navigate('/orders')}>
            <FiArrowLeft /> Back to Orders
          </Button>
          <div className="action-buttons-group">
            <Button variant="secondary" onClick={handleEmail}>
              <FiMail /> Email
            </Button>
            <Button onClick={handlePrint}>
              <FiPrinter /> Print
            </Button>
          </div>
        </div>

        {/* Invoice Container */}
        <div className="invoice-container-wrapper">
          <div className="invoice-container">
            {/* Invoice Header */}
            <div className="invoice-header">
              <div className="company-info">
                <div className="company-logo"><BrandIcon size={60} /></div>
                <div>
                  <h1 className="company-name">
                    <span className="brand-part-1">Sparklean</span> <span className="brand-part-2">Laundry Shop</span>
                    {stationInfo?.name && <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#6B7280', display: 'block', marginTop: '4px' }}>
                      {stationInfo.name}
                    </span>}
                  </h1>
                  <div className="company-details">
                    {stationInfo?.address || '123 Laundry Street, Clean City'}<br />
                    {stationInfo?.phone ? `Phone: ${stationInfo.phone}` : 'Phone: +63 912 345 6789'}<br />
                    Email: sparklean@example.com<br />
                    Facebook: fb.com/SparkleanLaundryShop
                  </div>
                </div>
              </div>
              <div className="invoice-info">
                <div className="invoice-title">INVOICE</div>
                <div className="invoice-number">#{invoice.id}</div>
                <div className="invoice-date">
                  <strong>Date:</strong> {invoice.date}
                </div>
                <div className="invoice-date">
                  <strong>Due:</strong> {invoice.dueDate}
                </div>
              </div>
            </div>

            {/* Bill To / Payment Status */}
            <div className="invoice-details-section">
              <div className="bill-to-section">
                <h3 className="section-label">BILL TO</h3>
                <div className="customer-details">
                  <div className="customer-name">{invoice.customer.name}</div>
                  {invoice.customer.address && <div>{invoice.customer.address}</div>}
                  {invoice.customer.email && <div>📧 {invoice.customer.email}</div>}
                  {invoice.customer.phone && <div>📱 {invoice.customer.phone}</div>}
                </div>
              </div>
              <div className="payment-status-section">
                <h3 className="section-label">PAYMENT STATUS</h3>
                <div className={`payment-badge ${invoice.paymentStatus.toLowerCase()}`}>
                  {invoice.paymentStatus === 'Paid' && <FiCheck />}
                  {invoice.paymentStatus === 'Unpaid' && <FiClock />}
                  {invoice.paymentStatus}
                </div>
                <div className="payment-details-list">
                  <div><strong>Method:</strong> {invoice.paymentMethod}</div>
                  {invoice.paymentDate && <div><strong>Date:</strong> {invoice.paymentDate}</div>}
                </div>
              </div>
            </div>

            {/* Services Table */}
            <table className="invoice-table">
              <thead>
                <tr>
                  <th className="text-left">Service</th>
                  <th className="text-center">Quantity</th>
                  <th className="text-right">Unit Price</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item: any, index: number) => (
                  <tr key={index}>
                    <td className="text-left service-name">{item.service}</td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-right">₱{item.unitPrice.toFixed(2)}</td>
                    <td className="text-right amount-cell">₱{item.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Summary Section */}
            <div className="invoice-summary-section">
              <div className="summary-rows">
                <div className="summary-row">
                  <span className="summary-label">Subtotal:</span>
                  <span className="summary-value">₱{invoice.subtotal.toFixed(2)}</span>
                </div>
                {invoice.discount > 0 && (
                  <div className="summary-row">
                    <span className="summary-label">Discount {invoice.discountCode ? `(${invoice.discountCode})` : ''}:</span>
                    <span className="summary-value discount">-₱{invoice.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="summary-row">
                  <span className="summary-label">Tax (0%):</span>
                  <span className="summary-value">₱{invoice.tax.toFixed(2)}</span>
                </div>
                <div className="summary-divider"></div>
                <div className="summary-row total">
                  <span className="summary-label">Total:</span>
                  <span className="summary-value">₱{invoice.total.toFixed(2)}</span>
                </div>
                <div className="summary-row balance">
                  <span className="summary-label">Balance Due:</span>
                  <span className="summary-value">₱{invoice.balance.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="invoice-notes">
              <h4 className="notes-title">Notes</h4>
              <p>{invoice.notes}</p>
              {invoice.pickupDate && (
                <p><strong>Pickup Date:</strong> {invoice.pickupDate}</p>
              )}
              {invoice.deliveryDate && (
                <p><strong>Delivery Date:</strong> {invoice.deliveryDate}</p>
              )}
              <p className="terms-text">
                For any questions regarding this invoice, please contact us at the above details.
              </p>
            </div>

            {/* Footer */}
            <div className="invoice-footer">
              <div className="signature-section">
                <div className="signature-line"></div>
                <div className="signature-label">
                  {user?.fullName || user?.username || 'Staff Signature'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginTop: '4px' }}>
                  Staff Name: {user?.fullName || user?.username || '________________'}
                </div>
              </div>
              <div className="footer-text">
                Thank you for your business!
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </Layout>

    {/* Print-only Invoice - Thermal Receipt Format */}
    <div className="print-only-invoice">
      <div className="order-receipt">
        {/* Receipt Header */}
        <div className="receipt-header">
          <div className="company-info">
            <div className="company-logo"><BrandIcon size={36} /></div>
            <div className="company-details">
              <h2>Sparklean Laundry Shop{stationInfo?.name ? ` - ${stationInfo.name}` : ''}</h2>
              <p>{stationInfo?.address || '123 Laundry Street, Clean City'}</p>
              <p>{stationInfo?.phone ? `Phone: ${stationInfo.phone}` : 'Phone: +63 912 345 6789'}</p>
              <p>Email: sparklean@example.com</p>
            </div>
          </div>
          <div className="receipt-info">
            <h3>INVOICE</h3>
            <p>Order: #{invoice.id}</p>
            <p>Date: {invoice.date}</p>
            <p>Due: {invoice.dueDate}</p>
          </div>
        </div>

        {/* Receipt Content */}
        <div className="receipt-content">
          {/* Customer Section */}
          <div className="customer-section">
            <h4>Customer</h4>
            <p>{invoice.customer.name}</p>
            {invoice.customer.phone && <p>{invoice.customer.phone}</p>}
            {invoice.customer.email && <p>{invoice.customer.email}</p>}
            {invoice.customer.address && <p>{invoice.customer.address}</p>}
            {/* Status removed from print invoice as requested */}
          </div>

          {/* Service Section */}
          <div className="service-section">
            <h4>Services</h4>
            {invoice.items.map((item: any, index: number) => (
              <div key={index} className="service-item">
                <span className="service-name">{item.service} ({item.quantity})</span>
                <span className="service-price">₱{item.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Payment Section */}
          <div className="payment-section">
            <div className="payment-row">
              <span>Subtotal:</span>
              <span>₱{invoice.subtotal.toFixed(2)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="payment-row">
                <span>Discount {invoice.discountCode ? `(${invoice.discountCode})` : ''}:</span>
                <span>-₱{invoice.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="payment-row">
              <span>Tax (0%):</span>
              <span>₱{invoice.tax.toFixed(2)}</span>
            </div>
            <div className="payment-row total">
              <span>Total:</span>
              <span>₱{invoice.total.toFixed(2)}</span>
            </div>
            <div className="payment-row balance">
              <span>Balance Due:</span>
              <span>₱{invoice.balance.toFixed(2)}</span>
            </div>
          </div>

          {/* Status Section */}
          <div className="status-section">
            <p>Payment Method: {invoice.paymentMethod}</p>
            {invoice.paymentDate && <p>Payment Date: {invoice.paymentDate}</p>}
            {invoice.pickupDate && <p>Pickup Date: {invoice.pickupDate}</p>}
            {invoice.deliveryDate && <p>Delivery Date: {invoice.deliveryDate}</p>}
          </div>
        </div>

        {/* Receipt Footer */}
        <div className="receipt-footer">
          <div style={{ marginTop: '5mm', paddingTop: '3mm', borderTop: '1px dashed #000' }}>
            <div style={{ marginBottom: '8mm' }}>
              <div style={{ borderTop: '1px solid #000', width: '60mm', margin: '0 auto 2mm', paddingTop: '1mm' }}></div>
              <div style={{ fontSize: '10px', textAlign: 'center', fontWeight: 'bold' }}>
                Staff Signature
              </div>
              <div style={{ fontSize: '9px', textAlign: 'center', marginTop: '1mm', color: '#666' }}>
                {user?.fullName || user?.username || 'Staff Name: ________________'}
              </div>
            </div>
          </div>
          <p>Thank you for your business!</p>
          <p>For questions, contact us at the above details.</p>
        </div>
      </div>
    </div>
    </>
  )
}

export default InvoiceReceipt
