import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiSave, FiUserPlus, FiCalendar, FiHash, FiMail, FiLock, FiEye, FiEyeOff, FiMapPin, FiZap } from 'react-icons/fi'
import toast from 'react-hot-toast'
import Button from './Button'
import EmailInput from './EmailInput'
import { Employee } from '../types'
import { employeeAPI, stationAPI } from '../utils/api'
import { generateStrongPassword } from '../utils/passwordStrength'
import './AddEmployeeModal.css'

interface AddEmployeeModalProps {
  isOpen: boolean
  onClose: () => void
  onEmployeeAdded: (employee: Employee) => void
  existingEmployees: Employee[]
  title?: string
  subtitle?: string
}

const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  isOpen,
  onClose,
  onEmployeeAdded,
  existingEmployees,
  title = "Add New Employee",
  subtitle = "Enter employee information to add them to the system"
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [stations, setStations] = useState<Array<{ _id: string; stationId: string; name: string }>>([])
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    employeeId: '',
    username: '',
    email: '',
    password: '',
    hireDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    status: 'Active' as 'Active' | 'Inactive',
    stationId: ''
  })

  // Fetch stations on mount
  useEffect(() => {
    const fetchStations = async () => {
      try {
        const data = await stationAPI.getAll({ showArchived: false })
        // Filter only active stations
        const activeStations = data.filter((s: any) => s.isActive !== false)
        setStations(activeStations)
      } catch (error) {
        console.error('Error fetching stations:', error)
      }
    }
    
    if (isOpen) {
      fetchStations()
    }
  }, [isOpen])


  const generateEmployeeId = () => {
    const lastEmployee = existingEmployees
      .filter(emp => emp.employeeId.startsWith('EMP-'))
      .sort((a, b) => {
        const aNum = parseInt(a.employeeId.split('-')[1])
        const bNum = parseInt(b.employeeId.split('-')[1])
        return bNum - aNum
      })[0]
    
    if (lastEmployee) {
      const lastNum = parseInt(lastEmployee.employeeId.split('-')[1])
      return `EMP-${String(lastNum + 1).padStart(3, '0')}`
    }
    return 'EMP-001'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newEmployee.name || !newEmployee.employeeId || !newEmployee.username || !newEmployee.email || !newEmployee.password) {
      toast.error('Please fill in all required fields')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmployee.email)) {
      toast.error('Please enter a valid email address')
      return
    }

    // Validate password length
    if (newEmployee.password.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }

    // Check if employee ID already exists
    const idExists = existingEmployees.some(emp => emp.employeeId === newEmployee.employeeId)
    if (idExists) {
      toast.error('An employee with this ID already exists')
      return
    }

    setIsLoading(true)
    
    try {
      const response = await employeeAPI.create({
        name: newEmployee.name,
        employeeId: newEmployee.employeeId,
        username: newEmployee.username,
        email: newEmployee.email,
        password: newEmployee.password,
        hireDate: newEmployee.hireDate,
        status: newEmployee.status,
        stationId: newEmployee.stationId || null
      })

      onEmployeeAdded(response)
      
      // Reset form
      setNewEmployee({
        name: '',
        employeeId: '',
        username: '',
        email: '',
        password: '',
        hireDate: new Date().toISOString().split('T')[0],
        status: 'Active',
        stationId: ''
      })
      
      toast.success('Employee and account created successfully!')
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add employee. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAutoGenerateId = () => {
    setNewEmployee(prev => ({
      ...prev,
      employeeId: generateEmployeeId()
    }))
  }

  const handleInputChange = (field: string, value: string) => {
    setNewEmployee(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSuggestPassword = () => {
    const suggested = generateStrongPassword(16)
    setNewEmployee(prev => ({
      ...prev,
      password: suggested
    }))
    setShowPassword(true) // Show the password so admin can see it
    toast.success('Strong password generated!')
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="modal-large"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <div className="modal-title-section">
              <div className="modal-icon">
                <FiUserPlus />
              </div>
              <div>
                <h3 className="modal-title">{title}</h3>
                <p className="modal-subtitle">{subtitle}</p>
              </div>
            </div>
            <button className="btn-icon" onClick={onClose}>
              <FiX />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">
                  <FiUserPlus className="label-icon" />
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  placeholder="Enter employee's full name"
                  value={newEmployee.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="employeeId">
                  <FiHash className="label-icon" />
                  Employee ID *
                  <button
                    type="button"
                    className="auto-generate-btn"
                    onClick={handleAutoGenerateId}
                    title="Auto-generate ID"
                  >
                    Auto
                  </button>
                </label>
                <input
                  type="text"
                  id="employeeId"
                  placeholder="EMP-001"
                  value={newEmployee.employeeId}
                  onChange={(e) => handleInputChange('employeeId', e.target.value.toUpperCase())}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="username">
                  <FiUserPlus className="label-icon" />
                  Username *
                </label>
                <input
                  type="text"
                  id="username"
                  placeholder="Enter username for login"
                  value={newEmployee.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  required
                  minLength={3}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">
                  <FiMail className="label-icon" />
                  Email *
                </label>
                <EmailInput
                  id="email"
                  placeholder="employee@example.com"
                  value={newEmployee.email}
                  onChange={(e) => handleInputChange('email', e.target.value.toLowerCase())}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiLock className="label-icon" />
                    Password *
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleSuggestPassword}
                      className="suggest-password-btn"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        background: '#EFF6FF',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#3B82F6',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#DBEAFE'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#EFF6FF'
                      }}
                      title="Generate a strong password"
                    >
                      <FiZap size={12} />
                      Suggest
                    </button>
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                    </button>
                  </div>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="Minimum 6 characters"
                  value={newEmployee.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="form-group">
                <label htmlFor="hireDate">
                  <FiCalendar className="label-icon" />
                  Hire Date
                </label>
                <input
                  type="date"
                  id="hireDate"
                  value={newEmployee.hireDate}
                  onChange={(e) => handleInputChange('hireDate', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="stationId">
                  <FiMapPin className="label-icon" />
                  Station/Branch
                </label>
                <select
                  id="stationId"
                  value={newEmployee.stationId}
                  onChange={(e) => handleInputChange('stationId', e.target.value)}
                >
                  <option value="">Select a station/branch (Optional)</option>
                  {stations.map((station) => (
                    <option key={station._id} value={station.stationId}>
                      {station.stationId} - {station.name}
                    </option>
                  ))}
                </select>
                <small style={{ color: '#6B7280', fontSize: '12px', marginTop: '4px' }}>
                  Assign which station/branch this employee belongs to
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="status">
                  <FiUserPlus className="label-icon" />
                  Account Status
                </label>
                <select
                  id="status"
                  value={newEmployee.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                >
                  <option value="Active">Enabled</option>
                  <option value="Inactive">Disabled</option>
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <Button variant="secondary" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="loading-spinner-small"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <FiSave />
                    Add Employee
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default AddEmployeeModal
