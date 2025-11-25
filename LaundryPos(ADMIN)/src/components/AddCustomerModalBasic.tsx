import React, { useState, useEffect } from 'react'
import { FiUserPlus, FiX, FiSave } from 'react-icons/fi'
import toast from 'react-hot-toast'
import EmailInput from './EmailInput'
import './AddCustomerModal.css'
import { Customer } from '../types'
import { customerAPI, stationAPI } from '../utils/api'

export interface AddCustomerModalProps {
  isOpen: boolean
  onClose: () => void
  onCustomerAdded: (customer: Customer) => void
  existingCustomers: Customer[]
  title?: string
  subtitle?: string
  pendingCustomerData?: { name: string; phone: string }
  stationId?: string
}

const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
  onCustomerAdded,
  existingCustomers,
  title = 'Add New Customer',
  subtitle = 'Enter customer information to add them to the system',
  pendingCustomerData,
  stationId
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [stations, setStations] = useState<any[]>([])
  const [selectedStationId, setSelectedStationId] = useState<string>('')
  const [newCustomer, setNewCustomer] = useState({
    name: pendingCustomerData?.name || '',
    email: '',
    phone: pendingCustomerData?.phone || '',
    lastOrder: ''
  })

  // Fetch stations if stationId is not provided (show dropdown)
  useEffect(() => {
    if (isOpen && !stationId) {
      const fetchStations = async () => {
        try {
          const data = await stationAPI.getAll()
          const activeStations = data.filter((s: any) => s.isArchived !== true && s.isActive !== false)
          setStations(activeStations)
          if (activeStations.length > 0) {
            setSelectedStationId(activeStations[0].stationId || activeStations[0]._id || activeStations[0].id)
          }
        } catch (error) {
          console.error('Error fetching stations:', error)
        }
      }
      fetchStations()
    }
  }, [isOpen, stationId])

  React.useEffect(() => {
    if (isOpen && pendingCustomerData) {
      // Pre-fill form when modal opens with pending data
      setNewCustomer({
        name: pendingCustomerData.name || '',
        phone: pendingCustomerData.phone || '',
        email: '',
        lastOrder: ''
      })
    } else if (!isOpen) {
      // Reset form when modal closes
      setNewCustomer({ name: '', email: '', phone: '', lastOrder: '' })
    }
  }, [isOpen, pendingCustomerData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newCustomer.name.trim() || !newCustomer.phone.trim()) {
      toast.error('Please fill in name and phone number')
      return
    }

    // Check if phone already exists
    const phoneExists = existingCustomers.some(c => c.phone === newCustomer.phone.trim())
    if (phoneExists) {
      toast.error('A customer with this phone number already exists')
      return
    }

    setIsLoading(true)
    
    try {
      // Use provided stationId or selectedStationId from dropdown
      const finalStationId = stationId || selectedStationId || undefined
      
      const response = await customerAPI.create({
        name: newCustomer.name.trim(),
        phone: newCustomer.phone.trim(),
        email: newCustomer.email.trim() || undefined,
        stationId: finalStationId
      })

      // Map backend response to Customer type
      const customer: Customer = {
        id: response._id || response.id,
        name: response.name,
        email: response.email || '',
        phone: response.phone,
        totalOrders: 0,
        totalSpent: 0,
        lastOrder: 'No orders yet',
        stationId: response.stationId || ''
      }
      
      onCustomerAdded(customer)
      toast.success('Customer added successfully!')
      // Don't call handleClose() here - let the parent component handle closing
      // Reset form state
      setNewCustomer({ name: '', email: '', phone: '', lastOrder: '' })
    } catch (error: any) {
      // Handle 409 Conflict - customer already exists
      if (error?.response?.status === 409 || error?.message?.includes('409')) {
        const existingCustomerFromResponse = error?.response?.data?.data
        
        if (existingCustomerFromResponse) {
          const customer: Customer = {
            id: existingCustomerFromResponse._id || existingCustomerFromResponse.id,
            name: existingCustomerFromResponse.name,
            email: existingCustomerFromResponse.email || '',
            phone: existingCustomerFromResponse.phone,
            totalOrders: existingCustomerFromResponse.totalOrders || 0,
            totalSpent: existingCustomerFromResponse.totalSpent || 0,
            lastOrder: existingCustomerFromResponse.lastOrder ? new Date(existingCustomerFromResponse.lastOrder).toLocaleDateString() : 'No orders yet',
            stationId: existingCustomerFromResponse.stationId || ''
          }
          
          onCustomerAdded(customer)
          toast.success('Customer already exists. Using existing customer.')
          // Don't call handleClose() here - let the parent component handle closing
          // Reset form state
          setNewCustomer({ name: '', email: '', phone: '', lastOrder: '' })
          return
        }
      }

      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to add customer'
      toast.error(errorMessage)
      console.error('Error adding customer:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setNewCustomer({ name: '', email: '', phone: '', lastOrder: '' })
    // onClose is called when user clicks Cancel button or closes modal
    // It should not be called when customer is successfully added
    onClose()
  }

  const handleTodayClick = () => {
    const today = new Date()
    const formattedDate = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`
    setNewCustomer({ ...newCustomer, lastOrder: formattedDate })
  }

  if (!isOpen) return null

  return (
    <div className="acm-backdrop">
      <div className="acm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="acm-header">
          <div className="acm-title-container">
            <FiUserPlus size={24} color="var(--color-primary-blue)" style={{ flexShrink: 0 }} />
            <div>
              <h3 className="acm-title">{title}</h3>
              {subtitle && <p className="acm-subtitle">{subtitle}</p>}
            </div>
          </div>
          <button className="acm-close-button" onClick={handleClose}>
            <FiX size={24} color="#6B7280" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="acm-form">
          <div className="acm-form-grid">
            <div className="acm-field">
              <label>Full Name *</label>
              <input
                type="text"
                value={newCustomer.name}
                onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="Enter customer's full name"
                required
              />
            </div>

            <div className="acm-field">
              <label>Email Address</label>
              <EmailInput
                value={newCustomer.email}
                onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })}
                placeholder="customer@example.com (optional)"
              />
            </div>

            <div className="acm-field">
              <label>Phone Number *</label>
              <input
                type="tel"
                value={newCustomer.phone}
                onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="+63 912 345 6789"
                required
              />
            </div>

            <div className="acm-field">
              <label>Last Order Date</label>
              <div className="acm-date-input-container">
                <input
                  type="text"
                  className="acm-date-input"
                  value={newCustomer.lastOrder}
                  onChange={e => setNewCustomer({ ...newCustomer, lastOrder: e.target.value })}
                  placeholder="mm/dd/yyyy"
                />
                <button
                  type="button"
                  className="acm-today-button"
                  onClick={handleTodayClick}
                >
                  Today
                </button>
                <span className="acm-calendar-icon">📅</span>
              </div>
            </div>

            {!stationId && (
              <div className="acm-field">
                <label>Branch/Station *</label>
                <select
                  value={selectedStationId}
                  onChange={e => setSelectedStationId(e.target.value)}
                  required
                  className="acm-select"
                >
                  <option value="">Select a branch...</option>
                  {stations.map((s) => {
                    const id = s.stationId || s._id || s.id
                    const label = s.name ? `${s.name} (${s.stationId || id})` : (s.stationId || id)
                    return (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    )
                  })}
                </select>
              </div>
            )}
          </div>

          <div className="acm-form-note">
            <p className="acm-form-note-text">
              💡 <strong>Note:</strong> Customer will start with 0 orders and ₱0 spent. These values will be updated automatically when they place orders.
            </p>
          </div>

          <div className="acm-actions">
            <button 
              type="button" 
              className="acm-btn acm-btn-secondary" 
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="acm-btn acm-btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="acm-spinner"></span>
                  Adding...
                </>
              ) : (
                <>
                  <FiSave size={18} />
                  Add Customer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddCustomerModal
export type { AddCustomerModalProps }
