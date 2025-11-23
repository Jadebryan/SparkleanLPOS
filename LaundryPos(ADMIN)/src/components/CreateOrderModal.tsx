import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiUser, FiPhone, FiSave, FiCheck, FiUserPlus, FiPlus, FiX, FiPrinter } from 'react-icons/fi'
import BrandIcon from './BrandIcon'
import toast from 'react-hot-toast'
import Button from './Button'
import AddCustomerModal from './AddCustomerModalBasic'
import ConfirmDialog from './ConfirmDialog'
import { Customer, Service } from '../types'
import { customerAPI, serviceAPI, discountAPI, orderAPI, stationAPI } from '../utils/api'
import './CreateOrderModal.css'
import '../pages/CreateOrder.css'

interface Discount {
  id: string
  code: string
  name: string
  type: 'percentage' | 'fixed'
  value: number
  minPurchase: number
  validFrom: string
  validUntil: string
  isActive: boolean
  usageCount: number
  maxUsage: number
  isArchived?: boolean
}

interface OrderServiceItem {
  id: string
  serviceId: string
  quantity: number
}

interface CreateOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onOrderCreated?: () => void
  draftOrderId?: string | null
}

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  onOrderCreated,
  draftOrderId: initialDraftOrderId = null
}) => {
  const [draftOrderId, setDraftOrderId] = useState<string | null>(initialDraftOrderId)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [orderServices, setOrderServices] = useState<OrderServiceItem[]>([])
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [selectedDiscountId, setSelectedDiscountId] = useState('')
  const [paidAmount, setPaidAmount] = useState('')
  const [pickupDate, setPickupDate] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('Unpaid')
  const [notes, setNotes] = useState('')
  const [selectedStationId, setSelectedStationId] = useState<string>('')
  const [amount, setAmount] = useState(0)
  const [totalDue, setTotalDue] = useState(0)
  const [balance, setBalance] = useState(0)
  
  // Data states
  const [customers, setCustomers] = useState<Customer[]>([])
  const [availableServices, setAvailableServices] = useState<Service[]>([])
  const [availableDiscounts, setAvailableDiscounts] = useState<Discount[]>([])
  const [stations, setStations] = useState<any[]>([])
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false)
  const [pendingCustomerData, setPendingCustomerData] = useState<{name: string, phone: string} | null>(null)
  const [showCustomerConfirmationModal, setShowCustomerConfirmationModal] = useState(false)
  const [skipCustomerCreation, setSkipCustomerCreation] = useState(false)
  const [showOverpaymentModal, setShowOverpaymentModal] = useState(false)
  const [overpaymentData, setOverpaymentData] = useState<{paidValue: number, totalDue: number, changeDue: number} | null>(null)
  const [pendingOrderCreation, setPendingOrderCreation] = useState(false)
  
  // Autocomplete states
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0)
  const customerNameInputRef = useRef<HTMLInputElement>(null)
  const customerSuggestionsRef = useRef<HTMLDivElement>(null)

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset all form fields
      setCustomerName('')
      setCustomerPhone('')
      setOrderServices([])
      setSelectedServiceId('')
      setQuantity(1)
      setSelectedDiscountId('')
      setPaidAmount('')
      setPickupDate('')
      setPaymentStatus('Unpaid')
      setNotes('')
      setShowCustomerSuggestions(false)
      setPendingCustomerData(null)
      setShowCustomerConfirmationModal(false)
      setShowOverpaymentModal(false)
      setOverpaymentData(null)
      setPendingOrderCreation(false)
      setSkipCustomerCreation(false)
      // Reset draftOrderId when modal closes
      setDraftOrderId(null)
    }
  }, [isOpen])

  // Fetch customers, services, and discounts from API
  useEffect(() => {
    if (!isOpen) return
    
    const fetchData = async () => {
      try {
        let customersData, servicesData, discountsData, stationsData
        
        try {
          [customersData, servicesData, discountsData, stationsData] = await Promise.all([
            customerAPI.getAll({ showArchived: false }),
            serviceAPI.getAll({ showArchived: false }),
            discountAPI.getAll({ showArchived: false }),
            stationAPI.getAll({ showArchived: false })
          ])
        } catch (error: any) {
          // If offline or network error, try to use cached data
          console.log('API fetch failed, trying cache...', error)
          if (!navigator.onLine || error.message?.includes('No internet connection') || error.message?.includes('Failed to fetch')) {
            const { cacheManager } = await import('../utils/cacheManager')
            const cachedCustomers = (cacheManager.get<any[]>('api_customers') || cacheManager.get<{ success: boolean; data: any[] }>('api_/customers') || []) as any
            const cachedServices = (cacheManager.get<any[]>('api_services') || cacheManager.get<{ success: boolean; data: any[] }>('api_/services') || []) as any
            const cachedDiscounts = (cacheManager.get<any[]>('api_discounts') || cacheManager.get<{ success: boolean; data: any[] }>('api_/discounts') || []) as any
            const cachedStations = (cacheManager.get<any[]>('api_stations') || cacheManager.get<{ success: boolean; data: any[] }>('api_/stations') || []) as any
            
            // Extract data if wrapped in response format
            customersData = Array.isArray(cachedCustomers) ? cachedCustomers : (cachedCustomers?.data || cachedCustomers || [])
            servicesData = Array.isArray(cachedServices) ? cachedServices : (cachedServices?.data || cachedServices || [])
            discountsData = Array.isArray(cachedDiscounts) ? cachedDiscounts : (cachedDiscounts?.data || cachedDiscounts || [])
            stationsData = Array.isArray(cachedStations) ? cachedStations : (cachedStations?.data || cachedStations || [])
            
            if (customersData.length > 0 || servicesData.length > 0 || discountsData.length > 0 || stationsData.length > 0) {
              toast('Using cached data (offline mode)', { icon: '📦' })
              console.log('Loaded from cache:', { customers: customersData.length, services: servicesData.length, discounts: discountsData.length, stations: stationsData.length })
            } else {
              throw error
            }
          } else {
            throw error
          }
        }

        // Map customers
        const mappedCustomers: Customer[] = customersData.map((c: any) => ({
          id: c._id || c.id,
          name: c.name,
          email: c.email || '',
          phone: c.phone,
          totalOrders: c.totalOrders || 0,
          totalSpent: c.totalSpent || 0,
          lastOrder: c.lastOrder ? new Date(c.lastOrder).toLocaleDateString() : 'No orders yet'
        }))

        // Map services - only include active and non-archived services
        const mappedServices: Service[] = servicesData
          .filter((s: any) => s.isActive === true && !s.isArchived)
          .map((s: any) => ({
            id: s._id || s.id,
            name: s.name,
            category: s.category,
            price: s.price,
            unit: s.unit,
            description: s.description || '',
            isActive: true,
            isPopular: s.isPopular || false
          }))

        // Map discounts - only include active and non-archived discounts
        const mappedDiscounts: Discount[] = discountsData
          .filter((d: any) => d.isActive === true && !d.isArchived)
          .map((d: any) => ({
            id: d._id || d.id,
            code: d.code,
            name: d.name,
            type: d.type,
            value: d.value,
            minPurchase: d.minPurchase || 0,
            validFrom: d.validFrom ? new Date(d.validFrom).toLocaleDateString() : '',
            validUntil: d.validUntil ? new Date(d.validUntil).toLocaleDateString() : '',
            isActive: true,
            usageCount: d.usageCount || 0,
            maxUsage: d.maxUsage || 0
          }))

        setCustomers(mappedCustomers)
        setAvailableServices(mappedServices)
        setAvailableDiscounts(mappedDiscounts)
        const activeStations = (stationsData || []).filter((s: any) => s.isArchived !== true && s.isActive !== false)
        setStations(activeStations)
        if (activeStations.length > 0) setSelectedStationId(activeStations[0].stationId || activeStations[0]._id || activeStations[0].id)
      } catch (error: any) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load order data. Please check your internet connection.')
      }
    }

    fetchData()
  }, [isOpen])

  // Update draftOrderId when prop changes
  useEffect(() => {
    if (initialDraftOrderId !== null) {
      setDraftOrderId(initialDraftOrderId)
    }
  }, [initialDraftOrderId])

  // Load draft from database if draftOrderId is provided
  useEffect(() => {
    if (isOpen && draftOrderId && availableServices.length > 0) {
      loadDraftFromDatabase(draftOrderId)
    }
  }, [isOpen, draftOrderId, availableServices])

  // Load draft from database
  const loadDraftFromDatabase = async (draftId: string) => {
    try {
      const draft = await orderAPI.getById(draftId)
      if (draft && draft.isDraft) {
        setCustomerName(draft.customer || '')
        setCustomerPhone(draft.customerPhone || '')
        
        // Map items back to orderServices format
        const mappedServices: OrderServiceItem[] = draft.items.map((item: any, index: number) => {
          const service = availableServices.find(s => s.name === item.service)
          if (service) {
            let qty = 1
            if (item.quantity.includes('kg')) {
              qty = parseFloat(item.quantity.replace('kg', '')) || 1
            } else if (item.quantity.includes('item')) {
              qty = parseInt(item.quantity.replace(/items?/gi, '').trim()) || 1
            } else if (item.quantity.includes('flat')) {
              qty = 1
            }
            
            return {
              id: `service-${index}-${Date.now()}`,
              serviceId: service.id,
              quantity: qty
            }
          }
          return null
        }).filter(Boolean) as OrderServiceItem[]
        
        setOrderServices(mappedServices)
        setSelectedDiscountId(draft.discountId?._id || draft.discountId || '')
        setPaidAmount(draft.paid?.toString() || '')
        setPickupDate(draft.pickupDate ? new Date(draft.pickupDate).toISOString().split('T')[0] : '')
        setPaymentStatus(draft.payment || 'Unpaid')
        setNotes(draft.notes || '')
        
        toast.success('Draft order loaded!', { icon: '📝', duration: 2000 })
      }
    } catch (error: any) {
      console.error('Error loading draft:', error)
      toast.error('Failed to load draft order')
    }
  }

  // Auto-save to localStorage when form data changes (debounced)
  useEffect(() => {
    if (!isOpen) return
    
    const timeoutId = setTimeout(() => {
      if (customerName.trim() || orderServices.length > 0 || paidAmount || notes.trim()) {
        saveDraftToLocalStorage()
      }
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [isOpen, customerName, customerPhone, orderServices, selectedDiscountId, paidAmount, pickupDate, notes])

  // Save draft to localStorage
  const saveDraftToLocalStorage = () => {
    const draft = {
      customerName,
      customerPhone,
      orderServices,
      selectedDiscountId,
      paidAmount,
      pickupDate,
      paymentStatus,
      notes,
      savedAt: new Date().toISOString()
    }
    localStorage.setItem('orderDraft', JSON.stringify(draft))
  }

  // Add service to order
  const handleAddService = () => {
    if (!selectedServiceId || selectedServiceId.trim() === '') {
      toast.error('Please select a service')
      return
    }
    
    const service = availableServices.find(s => s.id === selectedServiceId)
    if (!service) {
      toast.error('Selected service is invalid or no longer available')
      return
    }

    if (service.isActive === false || (service as any).isArchived === true) {
      toast.error('This service is not available')
      return
    }

    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Quantity must be a number greater than 0')
      return
    }
    
    if (quantity > 10000) {
      toast.error('Quantity cannot exceed 10,000')
      return
    }

    const serviceExists = orderServices.find(os => os.serviceId === selectedServiceId)
    if (serviceExists) {
      toast.error('Service already added. Please update quantity or remove and re-add.')
      return
    }
    const newServiceItem: OrderServiceItem = {
      id: Date.now().toString(),
      serviceId: selectedServiceId,
      quantity: quantity
    }
    setOrderServices([...orderServices, newServiceItem])
    setSelectedServiceId('')
    setQuantity(1)
    toast.success('Service added to order')
  }

  // Remove service from order
  const handleRemoveService = (serviceItemId: string) => {
    setOrderServices(orderServices.filter(os => os.id !== serviceItemId))
    toast.success('Service removed')
  }

  // Update service quantity
  const handleUpdateQuantity = (serviceItemId: string, newQuantity: number) => {
    if (isNaN(newQuantity)) {
      toast.error('Quantity must be a valid number')
      return
    }
    
    if (newQuantity <= 0) {
      handleRemoveService(serviceItemId)
      return
    }
    
    if (newQuantity > 10000) {
      toast.error('Quantity cannot exceed 10,000')
      return
    }
    setOrderServices(orderServices.map(os => 
      os.id === serviceItemId ? { ...os, quantity: newQuantity } : os
    ))
  }

  useEffect(() => {
    // Calculate total amount from all services
    const calculateAmount = () => {
      let total = 0
      orderServices.forEach(orderService => {
        const service = availableServices.find(s => s.id === orderService.serviceId)
        if (service) {
          if (service.unit === 'flat') {
            total += service.price
          } else {
            total += service.price * orderService.quantity
          }
        }
      })
      return total
    }

    const amt = calculateAmount()
    setAmount(amt)

    let discountValue = 0
    if (selectedDiscountId && amt > 0) {
      const selectedDiscount = availableDiscounts.find(d => d.id === selectedDiscountId && d.isActive === true && !d.isArchived)
      if (selectedDiscount) {
        if (amt >= selectedDiscount.minPurchase) {
          if (selectedDiscount.type === 'percentage') {
            discountValue = amt * (selectedDiscount.value / 100)
          } else {
            discountValue = selectedDiscount.value
          }
        } else {
          if (selectedDiscount.minPurchase > 0) {
            toast.error(`Minimum purchase of ₱${selectedDiscount.minPurchase} required for this discount`, { duration: 3000 })
          }
        }
      }
    }

    const total = Math.max(0, amt - discountValue)
    setTotalDue(total)

    const paid = parseFloat(paidAmount.replace(/[^0-9.]/g, '')) || 0
    const bal = total - paid
    setBalance(bal)
  }, [orderServices, selectedDiscountId, paidAmount, availableServices, availableDiscounts])

  // Filter customers for autocomplete
  const filteredCustomerSuggestions = customerName.trim()
    ? customers.filter(customer => 
        customer.name.toLowerCase().includes(customerName.toLowerCase()) ||
        customer.phone.includes(customerName)
      ).slice(0, 5)
    : []

  // Check if customer exists in the system
  const isExistingCustomer = (name: string, phone: string) => {
    return customers.some(customer => 
      customer.name.toLowerCase() === name.toLowerCase() ||
      customer.phone === phone
    )
  }

  // Handle customer selection from autocomplete
  const handleCustomerSelect = (customer: Customer) => {
    setCustomerName(customer.name)
    setCustomerPhone(customer.phone)
    setShowCustomerSuggestions(false)
    setSelectedSuggestionIndex(0)
  }

  // Handle keyboard navigation in autocomplete
  const handleCustomerNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showCustomerSuggestions || filteredCustomerSuggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedSuggestionIndex(prev => 
        prev < filteredCustomerSuggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : 0)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredCustomerSuggestions[selectedSuggestionIndex]) {
        handleCustomerSelect(filteredCustomerSuggestions[selectedSuggestionIndex])
      }
    } else if (e.key === 'Escape') {
      setShowCustomerSuggestions(false)
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        customerNameInputRef.current && 
        !customerNameInputRef.current.contains(event.target as Node) &&
        customerSuggestionsRef.current &&
        !customerSuggestionsRef.current.contains(event.target as Node)
      ) {
        setShowCustomerSuggestions(false)
      }
    }

    if (showCustomerSuggestions) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCustomerSuggestions])

  // Validate order data before submission
  const validateOrderData = (): { isValid: boolean; error?: string } => {
    if (!customerName || !customerName.trim()) {
      return { isValid: false, error: 'Customer name is required' }
    }

    if (!orderServices || orderServices.length === 0) {
      return { isValid: false, error: 'Please add at least one service to the order' }
    }

    for (let i = 0; i < orderServices.length; i++) {
      const serviceItem = orderServices[i]
      const service = availableServices.find(s => s.id === serviceItem.serviceId)
      
      if (!service) {
        return { isValid: false, error: `Service ${i + 1} is invalid or no longer available` }
      }
      
      if (!serviceItem.quantity || serviceItem.quantity <= 0) {
        return { isValid: false, error: `Service "${service.name}" must have a quantity greater than 0` }
      }
      
      const servicePrice = getServicePrice(serviceItem)
      if (isNaN(servicePrice) || servicePrice < 0) {
        return { isValid: false, error: `Service "${service.name}" has an invalid price` }
      }
    }

    const paidValue = parseFloat(paidAmount.replace(/[^0-9.]/g, '')) || 0
    if (isNaN(paidValue)) {
      return { isValid: false, error: 'Paid amount must be a valid number' }
    }
    
    if (paidValue < 0) {
      return { isValid: false, error: 'Paid amount cannot be negative' }
    }

    if (!pickupDate || !pickupDate.trim()) {
      return { isValid: false, error: 'Pickup date is required. Please select a pickup date.' }
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(pickupDate.trim())) {
      return { isValid: false, error: 'Pickup date must be in YYYY-MM-DD format' }
    }
    
    const date = new Date(pickupDate)
    if (isNaN(date.getTime())) {
      return { isValid: false, error: 'Pickup date is invalid' }
    }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (date < today) {
      return { isValid: false, error: 'Pickup date cannot be in the past' }
    }

    if (selectedDiscountId && selectedDiscountId.trim()) {
      const selectedDiscount = availableDiscounts.find(d => d.id === selectedDiscountId)
      if (!selectedDiscount) {
        return { isValid: false, error: 'Selected discount is invalid or no longer available' }
      }
      
      const subtotal = orderServices.reduce((sum, item) => sum + getServicePrice(item), 0)
      if (selectedDiscount.minPurchase && subtotal < selectedDiscount.minPurchase) {
        return { 
          isValid: false, 
          error: `This discount requires a minimum purchase of ₱${selectedDiscount.minPurchase}. Current subtotal: ₱${subtotal.toFixed(2)}` 
        }
      }
    }

    return { isValid: true }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validation = validateOrderData()
    if (!validation.isValid) {
      toast.error(validation.error || 'Please check your input and try again.')
      return
    }

    if (!isExistingCustomer(customerName, customerPhone)) {
      setPendingCustomerData({ name: customerName, phone: customerPhone })
      setShowCustomerConfirmationModal(true)
      return
    }

    await createOrder()
  }

  const createOrder = async () => {
    if (orderServices.length === 0) {
      toast.error('Please add at least one service to the order')
      return
    }

    const paidValue = parseFloat(paidAmount.replace(/[^0-9.]/g, '')) || 0
    
    if (paidValue < 0) {
      toast.error('Paid amount cannot be negative')
      return
    }

    if (paidValue > totalDue && totalDue > 0) {
      const changeDue = paidValue - totalDue
      setOverpaymentData({
        paidValue,
        totalDue,
        changeDue
      })
      setPendingOrderCreation(true)
      setShowOverpaymentModal(true)
      return
    }

    await proceedWithOrderCreation(paidValue)
  }

  const proceedWithOrderCreation = async (paidValue: number) => {
    try {
      const items = orderServices.map(os => {
        const service = availableServices.find(s => s.id === os.serviceId)
        if (!service) throw new Error('Service not found')
        
        let quantityStr = ''
        if (service.unit === 'kg') {
          quantityStr = `${os.quantity}kg`
        } else if (service.unit === 'flat') {
          quantityStr = '1 flat'
        } else {
          quantityStr = `${os.quantity} ${service.unit === 'item' ? 'item' : service.unit}${os.quantity > 1 ? 's' : ''}`
        }

        const itemAmount = service.unit === 'flat' ? service.price : service.price * os.quantity

        return {
          service: service.name,
          quantity: quantityStr,
          discount: '0%',
          status: 'Pending',
          amount: itemAmount
        }
      })

      const actualPaid = paidValue

      const orderData = {
        customer: customerName.trim(),
        customerPhone: customerPhone.trim(),
        items: items,
        discountId: selectedDiscountId && selectedDiscountId.trim() !== '' ? selectedDiscountId : null,
        paid: actualPaid,
        pickupDate: pickupDate && pickupDate.trim() !== '' ? pickupDate : null,
        notes: notes || '',
        stationId: selectedStationId || null,
        draftId: draftOrderId || null,
        skipCustomerCreation: skipCustomerCreation
      }
      
      setSkipCustomerCreation(false)

      await orderAPI.create(orderData)
      
      const currentDraftId = draftOrderId
      
      if (currentDraftId) {
        toast.success('Order created successfully! Draft has been linked to the order.', { icon: '✅', duration: 3000 })
      } else {
        toast.success('Order created successfully!', { icon: '✅' })
      }
      
      localStorage.removeItem('orderDraft')
      
      // Reset form
      setCustomerName('')
      setCustomerPhone('')
      setOrderServices([])
      setSelectedServiceId('')
      setQuantity(1)
      setSelectedDiscountId('')
      setPaidAmount('')
      setPickupDate('')
      setPaymentStatus('Unpaid')
      setNotes('')
      setDraftOrderId(null)
      
      // Call onOrderCreated callback to refresh orders list
      if (onOrderCreated) {
        onOrderCreated()
      }
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (error: any) {
      toast.error(error.message || 'Failed to create order')
    }
  }

  const handleCustomerAdded = async (newCustomer: Customer) => {
    setCustomers([...customers, newCustomer])
    setIsAddCustomerModalOpen(false)
    setPendingCustomerData(null)
    setSkipCustomerCreation(false)
    
    await createOrder()
  }

  const handleAddCustomerCancel = () => {
    setIsAddCustomerModalOpen(false)
    setPendingCustomerData(null)
    if (pendingCustomerData) {
      toast('Order creation cancelled. Please add customer information first.', { icon: 'ℹ️' })
    }
  }

  const handleCustomerConfirmationYes = () => {
    setShowCustomerConfirmationModal(false)
    setIsAddCustomerModalOpen(true)
  }

  const handleCustomerConfirmationSkip = async () => {
    setShowCustomerConfirmationModal(false)
    setPendingCustomerData(null)
    setSkipCustomerCreation(true)
    await createOrder()
  }

  const handleDraft = async () => {
    try {
      const paidValue = parseFloat(paidAmount.replace(/[^0-9.]/g, '')) || 0
      
      if (paidValue < 0) {
        toast.error('Paid amount cannot be negative. Please enter a valid amount.')
        return
      }

      saveDraftToLocalStorage()
      
      if (customerName.trim() && orderServices.length > 0) {
        const customer = customers.find(c => 
          c.name.toLowerCase() === customerName.toLowerCase() || 
          c.phone === customerPhone
        )

        if (customer) {
          const items = orderServices.map(os => {
            const service = availableServices.find(s => s.id === os.serviceId)
            if (!service) throw new Error('Service not found')
            
            let quantityStr = ''
            if (service.unit === 'kg') {
              quantityStr = `${os.quantity}kg`
            } else if (service.unit === 'flat') {
              quantityStr = '1 flat'
            } else {
              quantityStr = `${os.quantity} ${service.unit === 'item' ? 'item' : service.unit}${os.quantity > 1 ? 's' : ''}`
            }

            const itemAmount = service.unit === 'flat' ? service.price : service.price * os.quantity

            return {
              service: service.name,
              quantity: quantityStr,
              discount: '0%',
              status: 'Pending',
              amount: itemAmount
            }
          })

          let totalAmount = 0
          items.forEach(item => {
            totalAmount += item.amount || 0
          })

          let discountAmount = 0
          if (selectedDiscountId) {
            const selectedDiscount = availableDiscounts.find(d => d.id === selectedDiscountId && d.isActive && !d.isArchived)
            if (selectedDiscount) {
              if (selectedDiscount.type === 'percentage') {
                discountAmount = totalAmount * (selectedDiscount.value / 100)
              } else {
                discountAmount = selectedDiscount.value
              }
            }
          }

          const finalTotal = totalAmount - discountAmount
          const paid = parseFloat(paidAmount.replace(/[^0-9.]/g, '')) || 0
          const balanceAmount = finalTotal - paid

          const draftData = {
            customer: customerName.trim(),
            customerPhone: customerPhone.trim(),
            customerId: customer.id,
            items: items,
            discountId: selectedDiscountId && selectedDiscountId.trim() !== '' ? selectedDiscountId : null,
            paid: paid,
            pickupDate: pickupDate && pickupDate.trim() !== '' ? pickupDate : null,
            notes: notes || '',
            isDraft: true,
            total: `₱${finalTotal.toFixed(2)}`,
            balance: `₱${Math.max(0, balanceAmount).toFixed(2)}`,
            payment: balanceAmount <= 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Unpaid'),
            stationId: selectedStationId || null
          }

          await orderAPI.saveDraft(draftData)
          toast.success('Draft saved successfully!', { icon: '💾', duration: 2000 })
        } else {
          toast.success('Draft saved locally!', { icon: '💾', duration: 2000 })
        }
      } else {
        toast.success('Draft saved locally!', { icon: '💾', duration: 2000 })
      }
    } catch (error: any) {
      console.error('Error saving draft:', error)
      toast.success('Draft saved locally!', { icon: '💾', duration: 2000 })
    }
  }

  const getServiceLabel = (orderService: OrderServiceItem) => {
    const service = availableServices.find(s => s.id === orderService.serviceId)
    if (!service) return 'Unknown Service'
    if (service.unit === 'flat') {
      return service.name
    }
    const unitLabel = service.unit === 'kg' ? 'kg' : 'items'
    return `${service.name} (${orderService.quantity} ${unitLabel})`
  }

  const getServicePrice = (orderService: OrderServiceItem) => {
    const service = availableServices.find(s => s.id === orderService.serviceId)
    if (!service) return 0
    if (service.unit === 'flat') {
      return service.price
    }
    return service.price * orderService.quantity
  }

  const handlePrintSummary = () => {
    if (orderServices.length === 0) {
      toast.error('Please add services to the order before printing')
      return
    }

    // Get station info
    const station = stations.find(s => (s.stationId || s._id || s.id) === selectedStationId)
    
    // Get discount info
    const selectedDiscount = availableDiscounts.find(d => d.id === selectedDiscountId)
    const discountAmount = selectedDiscount 
      ? selectedDiscount.type === 'percentage' 
        ? (amount * selectedDiscount.value / 100)
        : selectedDiscount.value
      : 0
    const discountInfo = selectedDiscount ? selectedDiscount.code : ''

    const paid = parseFloat(paidAmount.replace(/[^0-9.]/g, '') || '0')
    const changeDue = paid > totalDue ? paid - totalDue : 0
    const balanceDue = totalDue > paid ? totalDue - paid : 0

    // Create or get print container
    let printContainer = document.querySelector('.print-only-summary')
    if (!printContainer) {
      printContainer = document.createElement('div')
      printContainer.className = 'print-only-summary'
      printContainer.style.display = 'none'
      document.body.appendChild(printContainer)
    }

    // Build station info strings
    const stationName = station?.name ? ` - ${station.name}` : ''
    const stationAddress = station?.address || '123 Laundry Street, Clean City'
    const stationPhone = station?.phone ? `Phone: ${station.phone}` : 'Phone: +63 912 345 6789'
    const companyName = `Sparklean Laundry Shop${stationName}`

    // Update print container content
    printContainer.innerHTML = `
      <div class="order-receipt">
        <div class="receipt-header">
          <div class="company-info">
            <div class="company-logo">
              <svg width="40" height="40" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <defs>
                  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#60A5FA" />
                    <stop offset="100%" stop-color="#2563EB" />
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
              </svg>
            </div>
            <div class="company-details">
              <h2>${companyName}</h2>
              <p>${stationAddress}</p>
              <p>${stationPhone}</p>
            </div>
          </div>
          <div class="receipt-info">
            <h3>ORDER RECEIPT</h3>
            <p>Date: ${new Date().toLocaleDateString()}</p>
            <p>Time: ${new Date().toLocaleTimeString()}</p>
          </div>
        </div>

        <div class="receipt-content">
          <div class="customer-section">
            <h4>Customer</h4>
            <p><strong>${customerName || 'N/A'}</strong></p>
            <p>${customerPhone || 'N/A'}</p>
          </div>

          <div class="service-section">
            <h4>Service Details</h4>
            ${orderServices.map((orderService) => {
              const servicePrice = getServicePrice(orderService)
              return `
                <div class="service-item">
                  <span class="service-name">${getServiceLabel(orderService)}</span>
                  <span class="service-price">₱${servicePrice.toFixed(2)}</span>
                </div>
              `
            }).join('')}
          </div>

          <div class="payment-section">
            <div class="payment-row">
              <span>Subtotal:</span>
              <span>₱${amount.toFixed(2)}</span>
            </div>
            ${discountAmount > 0 ? `
              <div class="payment-row">
                <span>Discount${discountInfo ? ` (${discountInfo})` : ''}:</span>
                <span>-₱${discountAmount.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="payment-row total">
              <span>Total:</span>
              <span>₱${totalDue.toFixed(2)}</span>
            </div>
            <div class="payment-row">
              <span>Paid:</span>
              <span>₱${paid.toFixed(2)}</span>
            </div>
            ${changeDue > 0 ? `
              <div class="payment-row change">
                <span>Change Due:</span>
                <span>₱${changeDue.toFixed(2)}</span>
              </div>
            ` : balanceDue > 0 ? `
              <div class="payment-row balance">
                <span>Balance Due:</span>
                <span>₱${balanceDue.toFixed(2)}</span>
              </div>
            ` : `
              <div class="payment-row paid">
                <span>Status:</span>
                <span>Fully Paid ✓</span>
              </div>
            `}
          </div>

          <div class="status-section">
            <p><strong>Status:</strong> ${paymentStatus.toLowerCase()}</p>
            ${pickupDate ? `<p><strong>Pickup:</strong> ${new Date(pickupDate).toISOString().split('T')[0]}</p>` : ''}
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
          </div>
        </div>

        <div class="receipt-footer">
          <p>Thank you for your business!</p>
          <p>keep this receipt for your records</p>
        </div>
      </div>
    `

    // Open preview window
    setTimeout(() => {
      const printWindow = window.open('', '_blank', 'width=400,height=600,scrollbars=yes,resizable=yes')
      if (printWindow) {
        const printContent = printContainer?.innerHTML
        if (printContent) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
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
                  overflow-x: hidden;
                }
                .preview-container {
                  background: white;
                  border-radius: 8px;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                  padding: 20px;
                  max-width: 400px;
                  width: 100%;
                  box-sizing: border-box;
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
                .receipt-preview {
                  border: 2px solid #000;
                  background: white;
                  transform: scale(0.8);
                  transform-origin: top center;
                  margin: 0 auto;
                  width: fit-content;
                  overflow: hidden;
                }
                .order-receipt {
                  width: 80mm;
                  padding: 5mm;
                  font-family: 'Courier New', monospace;
                  font-size: 12px;
                  line-height: 1.2;
                  box-sizing: border-box;
                  margin: 0;
                  overflow: hidden;
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
                  <div class="preview-title">🖨️ Receipt Preview</div>
                  <div class="preview-subtitle">This is how your receipt will look when printed</div>
                  <div class="print-buttons">
                    <button class="btn btn-primary" onclick="printReceipt()">🖨️ Print Now</button>
                    <button class="btn btn-secondary" onclick="window.close()">❌ Close</button>
                  </div>
                </div>
                
                <div class="receipt-preview">
                  ${printContent}
                </div>
                
                <div class="preview-footer">
                  <p>💡 <strong>Tip:</strong> Make sure your thermal receipt printer is connected and set as default printer</p>
                </div>
              </div>
              
              <script>
                function printReceipt() {
                  // Create a new window for actual printing
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    const receiptContent = document.querySelector('.receipt-preview').innerHTML;
                    printWindow.document.write(\`
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <title>Receipt</title>
                        <style>
                          @page {
                            size: 80mm 200mm;
                            margin: 0;
                          }
                          * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                          }
                          body {
                            margin: 0;
                            padding: 0;
                            font-family: 'Courier New', monospace;
                            font-size: 12px;
                            line-height: 1.2;
                            width: 80mm;
                            overflow: hidden;
                          }
                          .order-receipt {
                            width: 80mm;
                            padding: 5mm;
                            box-sizing: border-box;
                            margin: 0;
                            overflow: hidden;
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
            </html>
          `)
          printWindow.document.close()
        }
      }
    }, 300)
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            <motion.div
              className="com-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="com-header">
                <div className="com-title-container">
                  <h2 className="com-title">📝 Create New Order</h2>
                </div>
                <button className="com-close-btn" onClick={onClose} aria-label="Close">
                  <FiX size={24} />
                </button>
              </div>

              <div className="com-content">
                <div className="create-order-layout-modal">
                  {/* Left Column - Form */}
                  <div className="order-form-section">
                    <form onSubmit={handleSubmit}>
                      {/* Customer Info Card */}
                      <div className="form-card">
                        <h3 className="card-title">👤 Customer Information</h3>
                        <div className="form-grid-2">
                          <div className="form-group" style={{ position: 'relative' }}>
                            <label><FiUser size={14} /> Name</label>
                            <input
                              ref={customerNameInputRef}
                              type="text"
                              placeholder="Start typing customer name..."
                              value={customerName}
                              onChange={(e) => {
                                setCustomerName(e.target.value)
                                setShowCustomerSuggestions(true)
                                setSelectedSuggestionIndex(0)
                              }}
                              onFocus={() => {
                                if (filteredCustomerSuggestions.length > 0) {
                                  setShowCustomerSuggestions(true)
                                }
                              }}
                              onKeyDown={handleCustomerNameKeyDown}
                              required
                            />
                            {showCustomerSuggestions && filteredCustomerSuggestions.length > 0 && (
                              <div 
                                ref={customerSuggestionsRef}
                                className="customer-autocomplete-dropdown"
                              >
                                {filteredCustomerSuggestions.map((customer, index) => (
                                  <div
                                    key={customer.id}
                                    className={`customer-suggestion-item ${index === selectedSuggestionIndex ? 'selected' : ''}`}
                                    onClick={() => handleCustomerSelect(customer)}
                                    onMouseEnter={() => setSelectedSuggestionIndex(index)}
                                  >
                                    <div className="suggestion-item-main">
                                      <span className="suggestion-name">{customer.name}</span>
                                      <span className="suggestion-details">{customer.phone}</span>
                                    </div>
                                    {customer.email && (
                                      <span className="suggestion-email">{customer.email}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="form-group">
                            <label><FiPhone size={14} /> Phone</label>
                            <input
                              type="tel"
                              placeholder="+63 XXX XXX XXXX"
                              value={customerPhone}
                              onChange={(e) => setCustomerPhone(e.target.value)}
                            />
                          </div>
                        </div>
                        
                        {customerName && (
                          <div className="customer-status">
                            {isExistingCustomer(customerName, customerPhone) ? (
                              <div className="status-indicator existing">
                                <FiUser size={16} />
                                <span>Existing customer</span>
                              </div>
                            ) : (
                              <div className="status-indicator new">
                                <FiUserPlus size={16} />
                                <span>New customer - will be added to system</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Branch Selection Card */}
                      <div className="form-card">
                        <h3 className="card-title">🏬 Assign Branch</h3>
                        <div className="form-grid-2">
                          <div className="form-group">
                            <label>Branch</label>
                            <select
                              value={selectedStationId}
                              onChange={(e) => setSelectedStationId(e.target.value)}
                              className="payment-select"
                              required
                            >
                              {stations.map((s: any) => {
                                const id = s.stationId || s._id || s.id
                                const label = s.name ? `${s.name} (${s.stationId || id})` : (s.stationId || id)
                                return (
                                  <option key={id} value={id}>{label}</option>
                                )
                              })}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Service Details Card */}
                      <div className="form-card">
                        <h3 className="card-title">🧺 Service Details</h3>
                        
                        <div className="form-grid-3" style={{ marginBottom: '16px' }}>
                          <div className="form-group">
                            <label>Service</label>
                            <select
                              value={selectedServiceId}
                              onChange={(e) => setSelectedServiceId(e.target.value)}
                            >
                              <option value="">Select a service...</option>
                              {availableServices
                                .filter(s => s.isActive === true && (s as any).isArchived !== true && !orderServices.find(os => os.serviceId === s.id))
                                .sort((a, b) => {
                                  const aPopular = (a as any).isPopular ? 1 : 0
                                  const bPopular = (b as any).isPopular ? 1 : 0
                                  if (aPopular !== bPopular) {
                                    return bPopular - aPopular
                                  }
                                  return a.name.localeCompare(b.name)
                                })
                                .map((svc) => {
                                  const unitLabel = svc.unit === 'kg' ? 'kg' : svc.unit === 'flat' ? 'flat' : 'item'
                                  const isPopular = (svc as any).isPopular
                                  return (
                                    <option key={svc.id} value={svc.id}>
                                      {svc.name} - ₱{svc.price}/{unitLabel} {svc.category ? `(${svc.category})` : ''} {isPopular ? '🔥 Popular' : ''}
                                    </option>
                                  )
                                })}
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Quantity</label>
                            <input
                              type="number"
                              min="1"
                              value={quantity}
                              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                            />
                          </div>
                          <div className="form-group form-group-button">
                            <Button
                              variant="primary"
                              onClick={handleAddService}
                              disabled={!selectedServiceId}
                              className="add-service-btn-compact"
                            >
                              <FiPlus size={14} /> Add Service
                            </Button>
                          </div>
                        </div>

                        {orderServices.length > 0 && (
                          <div className="order-services-list">
                            <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600, color: 'var(--color-gray-700)' }}>
                              Services in Order ({orderServices.length})
                            </h4>
                            {orderServices.map((orderService) => {
                              const service = availableServices.find(s => s.id === orderService.serviceId)
                              if (!service) return null
                              const servicePrice = getServicePrice(orderService)
                              const unitLabel = service.unit === 'kg' ? 'kg' : service.unit === 'flat' ? 'flat' : 'item'
                              
                              return (
                                <div key={orderService.id} className="order-service-item">
                                  <div className="service-item-info">
                                    <div className="service-item-name">{service.name}</div>
                                    <div className="service-item-details">
                                      {service.unit !== 'flat' && (
                                        <input
                                          type="number"
                                          min="1"
                                          value={orderService.quantity}
                                          onChange={(e) => handleUpdateQuantity(orderService.id, parseInt(e.target.value) || 1)}
                                          className="service-quantity-input"
                                        />
                                      )}
                                      <span className="service-item-unit">{service.unit !== 'flat' ? unitLabel : 'flat rate'}</span>
                                      <span className="service-item-price">₱{servicePrice.toFixed(2)}</span>
                                    </div>
                                  </div>
                                  <button
                                    className="btn-remove-service"
                                    onClick={() => handleRemoveService(orderService.id)}
                                    title="Remove service"
                                  >
                                    <FiX />
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {orderServices.length === 0 && (
                          <div className="empty-services-message" style={{ 
                            textAlign: 'center', 
                            padding: '20px', 
                            color: 'var(--color-gray-500)',
                            fontSize: '14px'
                          }}>
                            No services added yet. Select a service and click "Add Service" to begin.
                          </div>
                        )}
                      </div>

                      {/* Payment & Schedule Card */}
                      <div className="form-card">
                        <h3 className="card-title">💰 Payment & Schedule</h3>
                        <div className="form-grid-2">
                          <div className="form-group">
                            <label>Pickup Date</label>
                            <input
                              type="date"
                              value={pickupDate}
                              onChange={(e) => setPickupDate(e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label>Discount</label>
                            <select
                              value={selectedDiscountId}
                              onChange={(e) => setSelectedDiscountId(e.target.value)}
                            >
                              <option value="">No Discount</option>
                              {availableDiscounts
                                .filter(d => d.isActive === true && !d.isArchived)
                                .map((disc) => {
                                  const discountText = disc.type === 'percentage' 
                                    ? `${disc.code} - ${disc.name} (${disc.value}%)`
                                    : `${disc.code} - ${disc.name} (₱${disc.value})`
                                  const minPurchaseText = disc.minPurchase > 0 ? ` (Min: ₱${disc.minPurchase})` : ''
                                  return (
                                    <option key={disc.id} value={disc.id}>
                                      {discountText}{minPurchaseText}
                                    </option>
                                  )
                                })}
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Paid Amount</label>
                            <input
                              type="text"
                              placeholder="0"
                              value={paidAmount}
                              onChange={(e) => {
                                const cleaned = e.target.value.replace(/[^0-9.]/g, '');
                                const parts = cleaned.split('.');
                                const formatted = parts.length > 2 
                                  ? parts[0] + '.' + parts.slice(1).join('') 
                                  : cleaned;
                                
                                setPaidAmount(formatted);
                                
                                const paidValue = parseFloat(formatted) || 0;
                                if (paidValue < 0) {
                                  toast.error('Paid amount cannot be negative', { duration: 2000, icon: '⚠️' });
                                } else if (formatted && totalDue > 0 && paidValue > totalDue) {
                                  const change = paidValue - totalDue;
                                  toast(`Change due: ₱${change.toFixed(2)}`, { duration: 2000, icon: '💰' });
                                }
                              }}
                              onBlur={() => {
                                const paidValue = parseFloat(paidAmount.replace(/[^0-9.]/g, '')) || 0;
                                if (paidValue < 0) {
                                  setPaidAmount('0');
                                }
                              }}
                              maxLength={15}
                              className={parseFloat(paidAmount.replace(/[^0-9.]/g, '') || '0') < 0 ? 'input-error' : ''}
                            />
                            {totalDue > 0 && (
                              <small style={{ color: '#6B7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                Total: ₱{totalDue.toFixed(2)} • {balance > 0 ? (
                                  <span>Balance: ₱{balance.toFixed(2)}</span>
                                ) : balance < 0 ? (
                                  <span style={{ color: '#059669', fontWeight: '600' }}>
                                    Change Due: ₱{Math.abs(balance).toFixed(2)}
                                  </span>
                                ) : (
                                  <span style={{ color: '#059669', fontWeight: '600' }}>Fully Paid ✓</span>
                                )}
                              </small>
                            )}
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* Right Column - Summary */}
                  <div className="order-summary-section">
                    <div className="summary-card">
                      <h3 className="summary-title">📋 Order Summary</h3>
                      
                      {orderServices.length > 0 && (
                        <div className="summary-services-list">
                          <div className="summary-services-header">
                            <span className="services-header-label">Services</span>
                            <span className="services-header-amount">Amount</span>
                          </div>
                          {orderServices.map((orderService) => {
                            const servicePrice = getServicePrice(orderService)
                            const service = availableServices.find(s => s.id === orderService.serviceId)
                            return (
                              <div key={orderService.id} className="summary-service-row">
                                <div className="service-info-summary">
                                  <span className="service-name-summary">{service?.name || 'Service'}</span>
                                  <span className="service-quantity-summary">
                                    {orderService.quantity} {service?.unit === 'kg' ? 'kg' : service?.unit === 'flat' ? 'flat' : service?.unit || 'item'}
                                    {orderService.quantity > 1 && service?.unit !== 'flat' && service?.unit !== 'kg' ? 's' : ''}
                                  </span>
                                </div>
                                <span className="service-price-summary">₱{servicePrice.toFixed(2)}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {orderServices.length === 0 && (
                        <div className="empty-summary-message">
                          <p>Add services to see order summary</p>
                        </div>
                      )}

                      {orderServices.length > 0 && (
                        <div className="summary-totals">
                          <div className="summary-item">
                            <span className="summary-label">Subtotal</span>
                            <span className="summary-value">₱{amount.toFixed(2)}</span>
                          </div>
                          
                          {(amount - totalDue) > 0 && (
                            <div className="summary-item">
                              <span className="summary-label">Discount</span>
                              <span className="summary-value discount">-₱{(amount - totalDue).toFixed(2)}</span>
                            </div>
                          )}
                          
                          <div className="summary-divider"></div>
                          
                          <div className="summary-item total">
                            <span className="summary-label">Total Amount</span>
                            <span className="summary-value">₱{totalDue.toFixed(2)}</span>
                          </div>
                          
                          <div className="summary-item">
                            <span className="summary-label">Paid</span>
                            <span className="summary-value paid">₱{parseFloat(paidAmount.replace(/[^0-9.]/g, '') || '0').toFixed(2)}</span>
                          </div>
                          
                          {balance < 0 ? (
                            <div className="summary-item" style={{ backgroundColor: '#D1FAE5', padding: '12px 16px', borderRadius: '8px', marginTop: '8px' }}>
                              <span className="summary-label" style={{ color: '#059669', fontWeight: '600' }}>Change Due</span>
                              <span className="summary-value" style={{ color: '#059669', fontWeight: '700', fontSize: '18px' }}>
                                ₱{Math.abs(balance).toFixed(2)}
                              </span>
                            </div>
                          ) : balance > 0 ? (
                          <div className="summary-item balance">
                            <span className="summary-label">Balance Due</span>
                            <span className="summary-value">₱{balance.toFixed(2)}</span>
                          </div>
                          ) : (
                            <div className="summary-item" style={{ backgroundColor: '#D1FAE5', padding: '12px 16px', borderRadius: '8px', marginTop: '8px' }}>
                              <span className="summary-label" style={{ color: '#059669', fontWeight: '600' }}>Status</span>
                              <span className="summary-value" style={{ color: '#059669', fontWeight: '700' }}>Fully Paid ✓</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="payment-status-group">
                        <label>Payment Status</label>
                        <select
                          value={paymentStatus}
                          onChange={(e) => setPaymentStatus(e.target.value)}
                          className="payment-select"
                          disabled={paymentStatus === 'Paid'}
                        >
                          <option>Unpaid</option>
                          <option>Partial</option>
                          <option>Paid</option>
                        </select>
                      </div>

                      <div className="notes-group">
                        <label>Notes</label>
                        <textarea
                          rows={3}
                          placeholder="Special instructions..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </div>

                      <div className="action-buttons-vertical">
                        <Button onClick={handleSubmit} className="btn-full">
                          <FiCheck /> Create Order
                        </Button>
                        <Button variant="secondary" onClick={handleDraft} className="btn-full">
                          <FiSave /> Save as Draft
                        </Button>
                        <Button onClick={handlePrintSummary} variant="secondary" className="btn-full" disabled={orderServices.length === 0}>
                          <FiPrinter /> Print Summary
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customer Confirmation Modal */}
      <ConfirmDialog
        isOpen={showCustomerConfirmationModal}
        title="New Customer Detected"
        message={`The customer "${pendingCustomerData?.name}" is not in the system.\n\nDo you want to add this customer to the system?`}
        confirmLabel="Yes"
        cancelLabel="Maybe Next Time"
        type="info"
        onConfirm={handleCustomerConfirmationYes}
        onCancel={handleCustomerConfirmationSkip}
      />

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={isAddCustomerModalOpen}
        onClose={handleAddCustomerCancel}
        onCustomerAdded={handleCustomerAdded}
        existingCustomers={customers}
        title="Add New Customer"
        subtitle={`Add "${pendingCustomerData?.name}" to the customer database to proceed with the order.`}
        pendingCustomerData={pendingCustomerData || undefined}
        stationId={selectedStationId || undefined}
      />

      {/* Overpayment Confirmation Modal */}
      <ConfirmDialog
        isOpen={showOverpaymentModal}
        title="Overpayment Detected"
        message={
          overpaymentData ? (
            `Customer paid: ₱${overpaymentData.paidValue.toFixed(2)}\n\nTotal amount: ₱${overpaymentData.totalDue.toFixed(2)}\n\nChange due: ₱${overpaymentData.changeDue.toFixed(2)}\n\nIs this correct?`
          ) : ''
        }
        confirmLabel="Yes, Continue"
        cancelLabel="Cancel"
        type="info"
        onConfirm={async () => {
          setShowOverpaymentModal(false)
          if (overpaymentData && pendingOrderCreation) {
            await proceedWithOrderCreation(overpaymentData.paidValue)
          }
          setOverpaymentData(null)
          setPendingOrderCreation(false)
        }}
        onCancel={() => {
          setShowOverpaymentModal(false)
          setOverpaymentData(null)
          setPendingOrderCreation(false)
        }}
      />
    </>
  )
}

export default CreateOrderModal

