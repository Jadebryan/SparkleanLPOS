import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiSave, FiEdit2 } from 'react-icons/fi'
import toast from 'react-hot-toast'
import Button from './Button'
import LoadingSpinner from './LoadingSpinner'
import { Customer } from '../types'
import { customerAPI } from '../utils/api'
import './EditCustomerModal.css'

interface EditCustomerModalProps {
  isOpen: boolean
  onClose: () => void
  onCustomerUpdated: (updatedCustomer: Customer) => void
  customer: Customer | null
  existingCustomers: Customer[]
}

const EditCustomerModal: React.FC<EditCustomerModalProps> = ({
  isOpen,
  onClose,
  onCustomerUpdated,
  customer,
  existingCustomers
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [editedCustomer, setEditedCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    totalOrders: 0,
    totalSpent: 0,
    lastOrder: ''
  })

  // Initialize form when customer changes
  useEffect(() => {
    if (customer) {
      setEditedCustomer({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent,
        lastOrder: customer.lastOrder
      })
    }
  }, [customer])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!customer) return

    if (!editedCustomer.name || !editedCustomer.email || !editedCustomer.phone) {
      toast.error('Please fill in all required fields')
      return
    }

    // Check if email already exists (excluding current customer)
    const emailExists = existingCustomers.some(c => 
      c.email.toLowerCase() === editedCustomer.email.toLowerCase() && c.id !== customer.id
    )
    if (emailExists) {
      toast.error('A customer with this email already exists')
      return
    }

    setIsLoading(true)
    
    try {
      // Prepare update data (only fields that backend supports)
      const updateData = {
        name: editedCustomer.name,
        email: editedCustomer.email,
        phone: editedCustomer.phone
      }

      // Call the API to update the customer in the database
      const response = await customerAPI.update(customer.id, updateData)
      
      // Get the updated customer data from response
      const updatedCustomerData = response.data || response

      // Create updated customer object with all fields
      const updatedCustomer: Customer = {
        id: updatedCustomerData._id || updatedCustomerData.id || customer.id,
        name: updatedCustomerData.name || editedCustomer.name,
        email: updatedCustomerData.email || editedCustomer.email,
        phone: updatedCustomerData.phone || editedCustomer.phone,
        totalOrders: customer.totalOrders, // Keep existing stats
        totalSpent: customer.totalSpent, // Keep existing stats
        lastOrder: customer.lastOrder, // Keep existing stats
        isArchived: updatedCustomerData.isArchived || customer.isArchived || false
      }
      
      onCustomerUpdated(updatedCustomer)
      handleClose()
      toast.success('Customer updated successfully!')
    } catch (error: any) {
      console.error('Error updating customer:', error)
      toast.error(error.message || 'Failed to update customer. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (customer) {
      setEditedCustomer({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent,
        lastOrder: customer.lastOrder
      })
    }
    onClose()
  }

  if (!customer) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay" onClick={handleClose}>
          <motion.div
            className="modal-large edit-customer-modal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-container">
                <FiEdit2 className="modal-title-icon" />
                <div>
                  <h3 className="modal-title">Edit Customer</h3>
                  <p className="modal-subtitle">Update customer information</p>
                </div>
              </div>
              <button className="btn-icon" onClick={handleClose}>
                <FiX />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-grid-2">
                <div className="form-group">
                  <label htmlFor="editCustomerName">Full Name *</label>
                  <input
                    type="text"
                    id="editCustomerName"
                    value={editedCustomer.name}
                    onChange={(e) => setEditedCustomer({...editedCustomer, name: e.target.value})}
                    placeholder="Enter customer's full name"
                    required
                    autoFocus
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="editCustomerEmail">Email Address *</label>
                  <input
                    type="email"
                    id="editCustomerEmail"
                    value={editedCustomer.email}
                    onChange={(e) => setEditedCustomer({...editedCustomer, email: e.target.value})}
                    placeholder="customer@example.com"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="editCustomerPhone">Phone Number *</label>
                  <input
                    type="tel"
                    id="editCustomerPhone"
                    value={editedCustomer.phone}
                    onChange={(e) => setEditedCustomer({...editedCustomer, phone: e.target.value})}
                    placeholder="+63 912 345 6789"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="editCustomerLastOrder">Last Order Date</label>
                  <input
                    type="date"
                    id="editCustomerLastOrder"
                    value={editedCustomer.lastOrder}
                    onChange={(e) => setEditedCustomer({...editedCustomer, lastOrder: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="form-grid-2">
                <div className="form-group">
                  <label htmlFor="editTotalOrders">Total Orders</label>
                  <input
                    type="number"
                    id="editTotalOrders"
                    min="0"
                    value={editedCustomer.totalOrders}
                    onChange={(e) => setEditedCustomer({...editedCustomer, totalOrders: parseInt(e.target.value) || 0})}
                    placeholder="0"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="editTotalSpent">Total Spent (₱)</label>
                  <input
                    type="number"
                    id="editTotalSpent"
                    min="0"
                    step="0.01"
                    value={editedCustomer.totalSpent}
                    onChange={(e) => setEditedCustomer({...editedCustomer, totalSpent: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div className="form-note">
                <p>💡 <strong>Note:</strong> Total orders and spent amount are usually updated automatically when customers place orders. Only modify these if you need to make corrections.</p>
              </div>
            </form>
            
            <div className="modal-footer">
              <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <LoadingSpinner size="small" />
                    Updating...
                  </>
                ) : (
                  <>
                    <FiSave />
                    Update Customer
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default EditCustomerModal
