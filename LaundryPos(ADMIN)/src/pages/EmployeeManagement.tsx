import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiUserPlus, FiEdit2, FiArchive, FiEye, FiMail, FiPhone, FiX, FiDownload, FiToggleLeft, FiToggleRight, FiCalendar, FiBriefcase, FiEyeOff, FiRotateCcw, FiChevronDown, FiFileText, FiFolder, FiRotateCw, FiSave } from 'react-icons/fi'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import Button from '../components/Button'
import LoadingSpinner from '../components/LoadingSpinner'
import { TableSkeleton, CardSkeleton } from '../components/LoadingSkeleton'
import EmptyState from '../components/EmptyState'
import { FilterChips } from '../components/FilterChip'
import ErrorState from '../components/ErrorState'
import ConfirmDialog from '../components/ConfirmDialog'
import AddEmployeeModal from '../components/AddEmployeeModal'
import ViewToggle, { ViewMode } from '../components/ViewToggle'
import { Employee } from '../types'
import { exportEmployeesToCSV, exportEmployeesToExcel, exportEmployeesToPDF, getExportFilename } from '../utils/exportUtils'
import { exportEmployeesDirect } from '../utils/reportGeneration/helpers'
import { ExportFormat } from '../utils/reportGeneration/types'
import { employeeAPI, stationAPI } from '../utils/api'
import './EmployeeManagement.css'

const EmployeeManagement: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [performanceMetrics, setPerformanceMetrics] = useState({
    ordersProcessed: 0,
    attendance: 0,
    rating: 0
  })
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterStation, setFilterStation] = useState('All')
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('employees-view-mode')
    return (saved === 'cards' || saved === 'list') ? saved : 'cards'
  })
  
  // Save view mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('employees-view-mode', viewMode)
  }, [viewMode])
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const exportDropdownRef = useRef<HTMLDivElement>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    employee: Employee | null
    action: 'activate' | 'deactivate' | null
  }>({ isOpen: false, employee: null, action: null })
  const [stations, setStations] = useState<Array<{ _id: string; stationId: string; name: string }>>([])
  
  // Employee page stats visibility state
  const [hiddenSections, setHiddenSections] = useState<{
    stats: boolean
  }>(() => {
    const saved = localStorage.getItem('employee-hidden-sections')
    return saved ? JSON.parse(saved) : {
      stats: false
    }
  })

  // Save hidden sections to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('employee-hidden-sections', JSON.stringify(hiddenSections))
  }, [hiddenSections])

  // Fetch stations for dropdown
  useEffect(() => {
    const fetchStations = async () => {
      try {
        const data = await stationAPI.getAll({ showArchived: false })
        const activeStations = data.filter((s: any) => s.isActive !== false)
        setStations(activeStations)
      } catch (error) {
        console.error('Error fetching stations:', error)
      }
    }
    fetchStations()
  }, [])

  // Fetch employees from API
  useEffect(() => {
    const fetchEmployees = async () => {
      setIsLoading(true)
      try {
        const data = await employeeAPI.getAll({ 
          status: filterStatus !== 'All' ? filterStatus : undefined,
          showArchived 
        })
        // Map backend data to frontend Employee interface
        const mappedEmployees: Employee[] = data.map((e: any) => ({
          id: e._id || e.id,
          name: e.name,
          employeeId: e.employeeId,
          position: e.position,
          department: e.department || '',
          status: e.status,
          hireDate: e.hireDate ? new Date(e.hireDate).toLocaleDateString() : '',
          avatar: e.avatar,
          stationId: e.stationId || '',
          isArchived: e.isArchived || false
        }))
        setEmployees(mappedEmployees)
      } catch (error: any) {
        console.error('Error fetching employees:', error)
        setError(error)
        toast.error('Failed to load employees')
      } finally {
        setIsLoading(false)
      }
    }

    fetchEmployees()
  }, [filterStatus, showArchived])

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false)
      }
    }

    if (showExportDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showExportDropdown])

  const toggleSection = (section: keyof typeof hiddenSections) => {
    setHiddenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const resetAllSections = () => {
    setHiddenSections({
      stats: false
    })
  }

  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      const data = await employeeAPI.getAll({ 
        status: filterStatus !== 'All' ? filterStatus : undefined,
        showArchived 
      })
      // Map backend data to frontend Employee interface
      const mappedEmployees: Employee[] = data.map((e: any) => ({
        id: e._id || e.id,
        name: e.name,
        employeeId: e.employeeId,
        position: e.position,
        department: e.department || '',
        status: e.status,
        hireDate: e.hireDate ? new Date(e.hireDate).toLocaleDateString() : '',
        avatar: e.avatar,
        stationId: e.stationId || '',
        isArchived: e.isArchived || false
      }))
      setEmployees(mappedEmployees)
      toast.success('Employees refreshed successfully')
    } catch (error: any) {
      console.error('Error refreshing employees:', error)
      toast.error('Failed to refresh employees')
    } finally {
      setIsLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const openModal = async (employee: Employee) => {
    setSelectedEmployee({ ...employee })
    setIsModalOpen(true)
    setIsEditMode(false)
    
    // Fetch performance metrics only if employee has a valid ID
    setIsLoadingMetrics(true)
    try {
      if (!employee.id) {
        console.warn('Employee ID is missing, skipping performance fetch')
        setPerformanceMetrics({
          ordersProcessed: 0,
          attendance: 0,
          rating: 0
        })
        setIsLoadingMetrics(false)
        return
      }
      const metrics = await employeeAPI.getPerformance(employee.id)
      setPerformanceMetrics(metrics)
    } catch (error: any) {
      console.error('Error fetching performance metrics:', error)
      // Set default values on error
      setPerformanceMetrics({
        ordersProcessed: 0,
        attendance: 0,
        rating: 0
      })
    } finally {
      setIsLoadingMetrics(false)
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedEmployee(null)
    setIsEditMode(false)
  }

  const handleUpdate = () => {
    setIsEditMode(true)
  }

  const handleSave = async () => {
    if (!selectedEmployee) return

    setIsLoading(true)
    
    try {
      // Parse hireDate from string format to Date
      let hireDateValue: string | undefined
      try {
        const dateObj = new Date(selectedEmployee.hireDate)
        if (!isNaN(dateObj.getTime())) {
          hireDateValue = dateObj.toISOString().split('T')[0] // Format as YYYY-MM-DD
        }
      } catch (error) {
        console.error('Error parsing hire date:', error)
      }

      // Prepare the data to send to the backend
      const updateData: any = {
        name: selectedEmployee.name,
        employeeId: selectedEmployee.employeeId,
        position: selectedEmployee.position,
        department: selectedEmployee.department || 'Staff',
        status: selectedEmployee.status,
        stationId: selectedEmployee.stationId || null
      }

      // Add hireDate if it was parsed successfully
      if (hireDateValue) {
        updateData.hireDate = hireDateValue
      }

      // Call the API to update the employee in the database
      const response = await employeeAPI.update(selectedEmployee.id, updateData)
      
      // Get the updated employee data from response
      const updatedEmployeeData = response.data || response

      // Map the response to frontend Employee interface
      const updatedEmployee: Employee = {
        id: updatedEmployeeData._id || updatedEmployeeData.id || selectedEmployee.id,
        name: updatedEmployeeData.name || selectedEmployee.name,
        employeeId: updatedEmployeeData.employeeId || selectedEmployee.employeeId,
        position: updatedEmployeeData.position || selectedEmployee.position,
        department: updatedEmployeeData.department || selectedEmployee.department || 'Staff',
        status: (updatedEmployeeData.status || selectedEmployee.status) as 'Active' | 'Inactive',
        hireDate: updatedEmployeeData.hireDate 
          ? new Date(updatedEmployeeData.hireDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })
          : selectedEmployee.hireDate,
        avatar: selectedEmployee.avatar,
        stationId: updatedEmployeeData.stationId || selectedEmployee.stationId || '',
        isArchived: updatedEmployeeData.isArchived || selectedEmployee.isArchived || false
      }

      // Update local state with the server response
      setEmployees(employees.map(emp => 
        emp.id === selectedEmployee.id ? updatedEmployee : emp
      ))
      
      // Also update selectedEmployee so the modal shows the updated data
      setSelectedEmployee(updatedEmployee)
      
      setIsEditMode(false)
      toast.success('Employee updated successfully!')
      closeModal()
    } catch (error: any) {
      console.error('Error updating employee:', error)
      toast.error(error.message || 'Failed to update employee. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleStatus = (employee: Employee) => {
    const action = employee.status === 'Active' ? 'deactivate' : 'activate'
    setConfirmDialog({ isOpen: true, employee, action })
  }

  const confirmToggleStatus = async () => {
    if (confirmDialog.employee) {
      try {
        const newIsActive = confirmDialog.action === 'activate'
        const response = await employeeAPI.toggleAccountStatus(confirmDialog.employee.id, newIsActive)
        const newStatus = newIsActive ? 'Active' : 'Inactive'
        setEmployees(employees.map(emp => 
          emp.id === confirmDialog.employee!.id 
            ? { ...emp, status: newStatus }
            : emp
        ))
        toast.success(response.message || `Account ${confirmDialog.action === 'activate' ? 'enabled' : 'disabled'} successfully!`)
        setConfirmDialog({ isOpen: false, employee: null, action: null })
      } catch (error: any) {
        toast.error(error.message || 'Failed to update account status')
      }
    }
  }

  const handleArchive = async (employeeId: string, employeeName: string) => {
    try {
      await employeeAPI.archive(employeeId)
      setEmployees(employees.map(e => e.id === employeeId ? { ...e, isArchived: true } : e))
      toast.success(`${employeeName} archived`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to archive employee')
    }
  }

  const handleUnarchive = async (employeeId: string, employeeName: string) => {
    try {
      await employeeAPI.unarchive(employeeId)
      setEmployees(employees.map(e => e.id === employeeId ? { ...e, isArchived: false } : e))
      toast.success(`${employeeName} unarchived`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to unarchive employee')
    }
  }

  const openAddModal = () => {
    setIsAddModalOpen(true)
  }

  const closeAddModal = () => {
    setIsAddModalOpen(false)
  }

  const handleEmployeeAdded = (newEmployee: Employee) => {
    setEmployees(prev => [...prev, newEmployee])
  }

  const filteredEmployees = employees.filter(employee => {
    if (!showArchived && employee.isArchived) return false
    if (showArchived && !employee.isArchived) return false
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.position.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'All' || employee.status === filterStatus
    const matchesStation = filterStation === 'All' || 
                           employee.stationId === filterStation ||
                           (filterStation && (employee.stationId || '') === filterStation)
    return matchesSearch && matchesStatus && matchesStation
  })

  // Export functions
  const handleExport = async (format: 'CSV' | 'Excel' | 'PDF') => {
    const employeesToExport = filteredEmployees

    if (employeesToExport.length === 0) {
      toast.error('No employees to export')
      return
    }

    const filename = getExportFilename('employees')
    
    try {
      // Try new system first
      try {
        await exportEmployeesDirect(employeesToExport, format as ExportFormat, filename)
        toast.success(`${employeesToExport.length} employees exported as ${format}`)
        setShowExportDropdown(false)
        return
      } catch (newSystemError: any) {
        // Fallback to old system
        console.warn('New export system failed, using fallback:', newSystemError)
      }

      // Fallback to old system
      switch (format) {
        case 'CSV':
          exportEmployeesToCSV(employeesToExport, filename)
          break
        case 'Excel':
          exportEmployeesToExcel(employeesToExport, filename)
          break
        case 'PDF':
          exportEmployeesToPDF(employeesToExport, filename)
          break
      }
      
      toast.success(`${employeesToExport.length} employees exported as ${format}`)
      setShowExportDropdown(false)
    } catch (error) {
      toast.error('Export failed. Please try again.')
      console.error('Export error:', error)
    }
  }

  // Calculate stats
  const totalEmployees = employees.length
  const activeStaff = employees.filter(e => e.status === 'Active').length
  const managers = employees.filter(e => e.position.toLowerCase().includes('manager')).length
  const newThisMonth = 2 // Mock data

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="employee-management-wrapper"
      >
        {/* Header */}
        <div className="page-header-compact">
          <div>
            <h1 className="page-title">👨‍💼 Employee Management</h1>
            <p className="page-subtitle">Manage staff and access permissions</p>
          </div>
          <div className="header-actions">
            <div className="dashboard-controls">
              <button 
                className="control-btn"
                onClick={handleRefresh}
                disabled={isLoading}
                title="Refresh employees"
              >
                <FiRotateCw style={{ 
                  animation: isLoading ? 'spin 1s linear infinite' : 'none',
                  display: 'inline-block'
                }} />
              </button>
              <button 
                className={`control-btn ${hiddenSections.stats ? 'active' : ''}`}
                onClick={() => toggleSection('stats')}
                title={hiddenSections.stats ? 'Show stats' : 'Hide stats'}
              >
                {hiddenSections.stats ? <FiEyeOff /> : <FiEye />}
                <span>Stats</span>
              </button>
            </div>
            <div className="export-dropdown" ref={exportDropdownRef}>
              <Button onClick={() => setShowExportDropdown(!showExportDropdown)}>
                <FiDownload /> Export <FiChevronDown />
              </Button>
              {showExportDropdown && (
                <motion.div 
                  className="export-dropdown-menu"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="export-header">
                    <span>Export Employee Data</span>
                    <small>{filteredEmployees.length} employees</small>
                  </div>
                  <div className="export-options">
                    <button onClick={() => handleExport('CSV')} className="export-option">
                      <FiFileText /> CSV Format
                    </button>
                    <button onClick={() => handleExport('Excel')} className="export-option">
                      <FiFileText /> Excel Format
                    </button>
                    <button onClick={() => handleExport('PDF')} className="export-option">
                      <FiFileText /> PDF Format
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
            <Button onClick={openAddModal}>
              <FiUserPlus /> Add Employee
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        {!hiddenSections.stats && (
          <motion.div 
            className="employee-stats-grid"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
          <motion.div 
            className="stat-card-small blue"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <div className="stat-icon-small">👥</div>
            <div>
              <div className="stat-number-small">{totalEmployees}</div>
              <div className="stat-label-small">Total Employees</div>
            </div>
          </motion.div>

          <motion.div 
            className="stat-card-small green"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="stat-icon-small">✅</div>
            <div>
              <div className="stat-number-small">{activeStaff}</div>
              <div className="stat-label-small">Active Staff</div>
            </div>
          </motion.div>

          <motion.div 
            className="stat-card-small orange"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="stat-icon-small">👔</div>
            <div>
              <div className="stat-number-small">{managers}</div>
              <div className="stat-label-small">Managers</div>
            </div>
          </motion.div>

          <motion.div 
            className="stat-card-small purple"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="stat-icon-small">📅</div>
            <div>
              <div className="stat-number-small">{newThisMonth}</div>
              <div className="stat-label-small">New This Month</div>
            </div>
          </motion.div>
          </motion.div>
        )}

        {/* Search and Filters */}
        <div className="search-filter-bar">
          <div className="search-box-large">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by name, ID, or position..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-search" onClick={() => setSearchTerm('')}>
                <FiX />
              </button>
            )}
          </div>

          <div className="filter-controls">
            <select
              className="filter-select"
              value={filterStation}
              onChange={(e) => setFilterStation(e.target.value)}
            >
              <option value="All">All Stations</option>
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
            
            <select
              className="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option>All Status</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
            
            <ViewToggle
              currentView={viewMode}
              onViewChange={setViewMode}
              className="view-toggle-employees"
            />
            
            <button
              className={`archive-toggle-btn ${showArchived ? 'active' : ''}`}
              onClick={() => setShowArchived(!showArchived)}
              title={showArchived ? 'Show Active' : 'Show Archived'}
            >
              <FiFolder size={16} />
              <span>{showArchived ? 'Archived' : 'Active'}</span>
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        {(filterStatus !== 'All' || filterStation !== 'All' || searchTerm) && (
          <FilterChips
            filters={[
              ...(filterStation !== 'All' ? [{
                label: `Station: ${stations.find(s => (s.stationId || s._id || s.id) === filterStation)?.name || filterStation}`,
                value: 'station',
                variant: 'primary' as const
              }] : []),
              ...(filterStatus !== 'All' ? [{
                label: `Status: ${filterStatus}`,
                value: 'status',
                variant: 'default' as const
              }] : []),
              ...(searchTerm ? [{
                label: `Search: "${searchTerm}"`,
                value: 'search',
                variant: 'default' as const
              }] : [])
            ]}
            onRemove={(value) => {
              if (value === 'station') setFilterStation('All')
              if (value === 'status') setFilterStatus('All')
              if (value === 'search') setSearchTerm('')
            }}
            onClearAll={() => {
              setFilterStation('All')
              setFilterStatus('All')
              setSearchTerm('')
            }}
          />
        )}

        {/* Error State */}
        {error && !isLoading && (
          <ErrorState
            title="Failed to load employees"
            message={error.message || 'An error occurred while loading employees. Please try again.'}
            error={error}
            onRetry={() => {
              setError(null)
              // Trigger refetch
              const fetchEmployees = async () => {
                setIsLoading(true)
                try {
                  const data = await employeeAPI.getAll({ showArchived })
                  const mappedEmployees: Employee[] = data.map((e: any) => ({
                    id: e._id || e.id,
                    name: e.name,
                    email: e.email || '',
                    phone: e.phone || '',
                    employeeId: e.employeeId,
                    position: e.position,
                    department: e.department || '',
                    status: e.status,
                    hireDate: e.hireDate ? new Date(e.hireDate).toLocaleDateString() : '',
                    avatar: e.avatar,
                    stationId: e.stationId || '',
                    isArchived: e.isArchived || false
                  }))
                  setEmployees(mappedEmployees)
                } catch (err: any) {
                  setError(err)
                  toast.error('Failed to load employees')
                } finally {
                  setIsLoading(false)
                }
              }
              fetchEmployees()
            }}
            variant="network"
          />
        )}

        {/* Employees Display */}
        {!error && (
          <div className={`employees-container ${viewMode === 'list' ? 'list-view' : 'grid-view'}`}>
            {isLoading ? (
              viewMode === 'cards' ? (
                <CardSkeleton count={6} />
              ) : (
                <TableSkeleton rows={5} columns={7} />
              )
            ) : filteredEmployees.length === 0 ? (
              <EmptyState
                icon={<FiBriefcase />}
                title={searchTerm || filterStatus !== 'All' || filterStation !== 'All' ? 'No employees found' : 'No employees yet'}
                description={
                  searchTerm || filterStatus !== 'All' || filterStation !== 'All'
                    ? 'Try adjusting your search or filter criteria to find employees.'
                    : 'Start by adding your first employee to the system.'
                }
                actionLabel={searchTerm || filterStatus !== 'All' || filterStation !== 'All' ? undefined : 'Add Employee'}
                onAction={searchTerm || filterStatus !== 'All' || filterStation !== 'All' ? undefined : () => setIsAddModalOpen(true)}
                type={searchTerm || filterStatus !== 'All' || filterStation !== 'All' ? 'no-results' : 'empty'}
              />
            ) : viewMode === 'cards' ? (
              <div className="employees-grid">
                {filteredEmployees.map((employee, index) => (
                <motion.div
                  key={employee.id}
                  className={`employee-card ${employee.status.toLowerCase()} ${employee.isArchived ? 'archived' : ''}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                >
                  {/* Status Badge */}
                  <div className={`employee-status-badge-top ${employee.status.toLowerCase()}`}>
                    {employee.status}
                  </div>

                  <div className="employee-card-header">
                    <div className={`employee-avatar-large ${employee.status.toLowerCase()}`}>
                      {getInitials(employee.name)}
                    </div>
                  </div>

                  <div className="employee-card-body">
                    <h3 className="employee-name-large">{employee.name}</h3>
                    <div className="employee-id-badge">{employee.employeeId}</div>
                    
                    <div className="employee-info-grid">
                      <div className="info-item">
                        <FiBriefcase size={14} />
                        <span>{employee.position}</span>
                      </div>
                      <div className="info-item">
                        <FiCalendar size={14} />
                        <span>Hired: {employee.hireDate}</span>
                      </div>
                      {employee.stationId && (
                        <div className="info-item" style={{ color: '#2563EB', fontFamily: 'monospace', fontSize: '12px' }}>
                          <span>📍 {employee.stationId}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="employee-card-footer">
                    <button
                      className="btn-icon-small"
                      onClick={() => openModal(employee)}
                      title="View Details"
                    >
                      <FiEye />
                    </button>
                    <button
                      className="btn-icon-small edit"
                      onClick={() => {
                        openModal(employee)
                        handleUpdate()
                      }}
                      title="Edit"
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      className={`btn-toggle ${employee.status === 'Active' ? 'active' : 'inactive'}`}
                      onClick={() => handleToggleStatus(employee)}
                      title={employee.status === 'Active' ? 'Deactivate Account' : 'Activate Account'}
                    >
                      {employee.status === 'Active' ? <FiToggleRight size={20} /> : <FiToggleLeft size={20} />}
                      {employee.status === 'Active' ? 'Active' : 'Inactive'}
                    </button>
                    <button
                      onClick={() => showArchived ? handleUnarchive(employee.id, employee.name) : handleArchive(employee.id, employee.name)}
                      title={showArchived ? 'Unarchive' : 'Archive'}
                      className={`btn-icon-small ${showArchived ? 'restore' : 'delete'}`}
                    >
                      {showArchived ? <FiRotateCw /> : <FiArchive />}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
            ) : (
              <div className="employees-table-container">
                <div className="table-header-info">
                  <div className="table-count">
                    <span className="count-label">Showing</span>
                    <span className="count-number">{filteredEmployees.length}</span>
                    <span className="count-label">
                      {filteredEmployees.length === 1 ? 'employee' : 'employees'}
                      {filterStation !== 'All' && ` in ${stations.find(s => (s.stationId || s._id || s.id) === filterStation)?.name || filterStation}`}
                    </span>
                  </div>
                </div>
                <div className="table-wrapper">
                  <table className="employees-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Position</th>
                        <th>Employee ID</th>
                        <th>Station</th>
                        <th>Hire Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((employee, index) => (
                      <motion.tr
                        key={employee.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`employee-row ${employee.status.toLowerCase()}`}
                      >
                        <td>
                          <div className="employee-cell">
                            <div className={`employee-avatar ${employee.status.toLowerCase()}`}>
                              {getInitials(employee.name)}
                            </div>
                            <span className="employee-name">{employee.name}</span>
                          </div>
                        </td>
                        <td>
                          <span className="employee-position">{employee.position}</span>
                        </td>
                        <td>
                          <span className="employee-id">{employee.employeeId}</span>
                        </td>
                        <td>
                          <span className="stat-value" style={{ 
                            fontFamily: 'monospace', 
                            fontSize: '13px',
                            color: employee.stationId ? '#2563EB' : '#6B7280'
                          }}>
                            {employee.stationId || 'N/A'}
                          </span>
                        </td>
                        <td>
                          <span className="hire-date">{employee.hireDate}</span>
                        </td>
                        <td>
                          <span className={`employee-status-badge ${employee.status.toLowerCase()}`}>
                            {employee.status}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons-row">
                            <button
                              className="btn-icon-small"
                              onClick={() => openModal(employee)}
                              title="View Details"
                              aria-label={`View details for ${employee.name}`}
                            >
                              <FiEye />
                            </button>
                            <button
                              className="btn-icon-small edit"
                              onClick={() => {
                                openModal(employee)
                                handleUpdate()
                              }}
                              title="Edit"
                              aria-label={`Edit employee ${employee.name}`}
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              className={`btn-toggle-small ${employee.status === 'Active' ? 'active' : 'inactive'}`}
                              onClick={() => handleToggleStatus(employee)}
                              title={employee.status === 'Active' ? 'Deactivate Account' : 'Activate Account'}
                              aria-label={employee.status === 'Active' ? `Deactivate account for ${employee.name}` : `Activate account for ${employee.name}`}
                            >
                              {employee.status === 'Active' ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
                            </button>
                            <button
                              onClick={() => showArchived ? handleUnarchive(employee.id, employee.name) : handleArchive(employee.id, employee.name)}
                              title={showArchived ? 'Unarchive' : 'Archive'}
                              className={`btn-icon-small ${showArchived ? 'restore' : 'delete'}`}
                              aria-label={showArchived ? `Unarchive employee ${employee.name}` : `Archive employee ${employee.name}`}
                            >
                              {showArchived ? <FiRotateCw /> : <FiArchive />}
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        {/* Employee Details Modal */}
        <AnimatePresence>
          {isModalOpen && selectedEmployee && (
            <div className="modal-overlay" onClick={closeModal}>
              <motion.div
                className="modal-large"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h3 className="modal-title">Employee Details</h3>
                  <button className="btn-icon" onClick={closeModal}>
                    <FiX />
                  </button>
                </div>
                
                <div className="modal-body">
                  <div className="employee-details-header">
                    <div className={`employee-avatar-large ${selectedEmployee.status.toLowerCase()}`}>
                      {getInitials(selectedEmployee.name)}
                    </div>
                    <div className="employee-info-section">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={selectedEmployee.name}
                          onChange={(e) => setSelectedEmployee({ ...selectedEmployee, name: e.target.value })}
                          className="employee-name-input-edit"
                        />
                      ) : (
                        <h2 className="employee-name-modal">{selectedEmployee.name}</h2>
                      )}
                      {isEditMode ? (
                        <input
                          type="text"
                          value={selectedEmployee.employeeId}
                          onChange={(e) => setSelectedEmployee({ ...selectedEmployee, employeeId: e.target.value.toUpperCase() })}
                          className="employee-id-input-edit"
                        />
                      ) : (
                        <p className="employee-id-modal">{selectedEmployee.employeeId}</p>
                      )}
                      {isEditMode ? (
                        <select
                          value={selectedEmployee.status}
                          onChange={(e) => setSelectedEmployee({ ...selectedEmployee, status: e.target.value as 'Active' | 'Inactive' })}
                          className="status-select-edit"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      ) : (
                        <span className={`employee-status-badge-modal ${selectedEmployee.status.toLowerCase()}`}>
                          {selectedEmployee.status}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="details-grid-2">
                    <div className="detail-card">
                      <label>Position</label>
                      {isEditMode ? (
                        <select
                          value={selectedEmployee.position}
                          onChange={(e) => setSelectedEmployee({ ...selectedEmployee, position: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '2px solid var(--color-gray-300)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '14px',
                            fontFamily: 'var(--font-family)'
                          }}
                        >
                          <option value="Operations Manager">Operations Manager</option>
                          <option value="Customer Service Rep">Customer Service Rep</option>
                          <option value="Laundry Technician">Laundry Technician</option>
                          <option value="Cashier">Cashier</option>
                          <option value="Supervisor">Supervisor</option>
                          <option value="Assistant Manager">Assistant Manager</option>
                          <option value="Maintenance Staff">Maintenance Staff</option>
                          <option value="Delivery Driver">Delivery Driver</option>
                        </select>
                      ) : (
                        <div className="detail-value">{selectedEmployee.position}</div>
                      )}
                    </div>
                    <div className="detail-card">
                      <label>Employee ID</label>
                      {isEditMode ? (
                        <input
                          type="text"
                          value={selectedEmployee.employeeId}
                          onChange={(e) => setSelectedEmployee({ ...selectedEmployee, employeeId: e.target.value.toUpperCase() })}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '2px solid var(--color-gray-300)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '14px',
                            fontFamily: 'var(--font-family)'
                          }}
                        />
                      ) : (
                        <div className="detail-value">{selectedEmployee.employeeId}</div>
                      )}
                    </div>
                    <div className="detail-card">
                      <label>Hire Date</label>
                      {isEditMode ? (
                        <input
                          type="date"
                          value={(() => {
                            // Parse the hireDate string (e.g., "Jan 15, 2023") to YYYY-MM-DD format
                            try {
                              const date = new Date(selectedEmployee.hireDate)
                              if (!isNaN(date.getTime())) {
                                return date.toISOString().split('T')[0]
                              }
                              return new Date().toISOString().split('T')[0]
                            } catch {
                              return new Date().toISOString().split('T')[0]
                            }
                          })()}
                          onChange={(e) => {
                            const newDate = new Date(e.target.value).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                            setSelectedEmployee({ ...selectedEmployee, hireDate: newDate })
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '2px solid var(--color-gray-300)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '14px',
                            fontFamily: 'var(--font-family)'
                          }}
                        />
                      ) : (
                        <div className="detail-value">
                          <FiCalendar size={16} /> {selectedEmployee.hireDate}
                        </div>
                      )}
                    </div>
                    <div className="detail-card">
                      <label>Department</label>
                      {isEditMode ? (
                        <select
                          value={selectedEmployee.department}
                          onChange={(e) => setSelectedEmployee({ ...selectedEmployee, department: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '2px solid var(--color-gray-300)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '14px',
                            fontFamily: 'var(--font-family)'
                          }}
                        >
                          <option value="Staff">Staff</option>
                          <option value="Management">Management</option>
                          <option value="Operations">Operations</option>
                          <option value="Sales">Sales</option>
                        </select>
                      ) : (
                        <div className="detail-value">{selectedEmployee.department}</div>
                      )}
                    </div>
                    <div className="detail-card">
                      <label>Station/Branch</label>
                      {isEditMode ? (
                        <select
                          value={selectedEmployee.stationId || ''}
                          onChange={(e) => setSelectedEmployee({ ...selectedEmployee, stationId: e.target.value || undefined })}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '2px solid var(--color-gray-300)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '14px',
                            fontFamily: 'var(--font-family)'
                          }}
                        >
                          <option value="">No Station Assigned</option>
                          {stations.map((station) => (
                            <option key={station._id} value={station.stationId}>
                              {station.stationId} - {station.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="detail-value highlight-blue" style={{ fontFamily: 'monospace' }}>
                          {selectedEmployee.stationId || 'No Station Assigned'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="performance-section">
                    <h4>Performance Metrics</h4>
                    <div className="metrics-grid">
                      <div className="metric-card">
                        <div className="metric-value">
                          {isLoadingMetrics ? '...' : performanceMetrics.ordersProcessed}
                        </div>
                        <div className="metric-label">Orders Processed</div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-value">
                          {isLoadingMetrics ? '...' : `${performanceMetrics.attendance}%`}
                        </div>
                        <div className="metric-label">Attendance</div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-value">
                          {isLoadingMetrics ? '...' : performanceMetrics.rating}
                        </div>
                        <div className="metric-label">Rating</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="modal-footer">
                  <Button variant="secondary" onClick={closeModal}>
                    {isEditMode ? 'Cancel' : 'Close'}
                  </Button>
                  {isEditMode ? (
                    <Button onClick={handleSave} disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <LoadingSpinner size="small" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <FiSave /> Save Changes
                        </>
                      )}
                    </Button>
                  ) : (
                    <>
                      <Button variant="secondary" onClick={handleUpdate}>
                        <FiEdit2 /> Edit
                      </Button>
                      <Button 
                        onClick={() => {
                          closeModal()
                          handleToggleStatus(selectedEmployee)
                        }}
                      >
                        {selectedEmployee.status === 'Active' ? (
                          <><FiToggleLeft /> Deactivate Account</>
                        ) : (
                          <><FiToggleRight /> Activate Account</>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Confirmation Dialog */}
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.action === 'activate' ? 'Activate Employee Account?' : 'Deactivate Employee Account?'}
          message={
            confirmDialog.action === 'activate'
              ? `Are you sure you want to activate ${confirmDialog.employee?.name}'s account? They will regain access to the system.`
              : `Are you sure you want to deactivate ${confirmDialog.employee?.name}'s account? They will lose access to the system.`
          }
          confirmLabel={confirmDialog.action === 'activate' ? 'Activate' : 'Deactivate'}
          cancelLabel="Cancel"
          type={confirmDialog.action === 'deactivate' ? 'warning' : 'info'}
          onConfirm={confirmToggleStatus}
          onCancel={() => setConfirmDialog({ isOpen: false, employee: null, action: null })}
        />

        <AddEmployeeModal
          isOpen={isAddModalOpen}
          onClose={closeAddModal}
          onEmployeeAdded={handleEmployeeAdded}
          existingEmployees={employees}
        />
      </motion.div>
    </Layout>
  )
}

export default EmployeeManagement
