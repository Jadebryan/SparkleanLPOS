import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiFileText, FiSearch, FiFilter, FiCalendar, FiRefreshCw, FiActivity, FiX } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { auditLogAPI } from '../utils/api'
import { AuditLog, AuditLogStats } from '../types'

interface AuditLogManagementProps {
  userRole: 'admin' | 'staff'
}

const AuditLogManagement: React.FC<AuditLogManagementProps> = ({ userRole }) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditLogStats, setAuditLogStats] = useState<AuditLogStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState({
    type: '',
    action: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 50
  })
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 1
  })

  useEffect(() => {
    if (userRole === 'admin') {
      loadAuditLogs()
      loadAuditLogStats()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole])

  // Reload when filters change (but not on initial mount to avoid double load)
  useEffect(() => {
    if (userRole === 'admin') {
      const timeoutId = setTimeout(() => {
        loadAuditLogs()
        loadAuditLogStats()
      }, 300) // Debounce filter changes

      return () => clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.type, filters.action, filters.startDate, filters.endDate, filters.page])

  const loadAuditLogs = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await auditLogAPI.list(filters)
      // Response structure: { success: true, count: number, data: AuditLog[], pagination: {...} }
      console.log('Audit log API response:', response)
      const logs = response?.data || []
      setAuditLogs(Array.isArray(logs) ? logs : [])
      if (response?.pagination) {
        setPagination(response.pagination)
      }
    } catch (error: any) {
      console.error('Load audit logs error:', error)
      // Check if it's a permission error
      if (error.message?.includes('403') || error.message?.includes('Access denied') || error.message?.includes('Unauthorized')) {
        toast.error('Access denied: Only administrators can view audit logs')
      } else {
        toast.error(error.message || 'Failed to load audit logs')
      }
      setAuditLogs([])
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  const loadAuditLogStats = useCallback(async () => {
    try {
      const response = await auditLogAPI.getStats(filters.startDate, filters.endDate)
      // Response structure: { success: true, data: AuditLogStats }
      console.log('Audit log stats response:', response)
      const statsData = response?.data
      if (statsData) {
        setAuditLogStats(statsData)
      }
    } catch (error: any) {
      console.error('Failed to load audit log stats:', error)
      // Don't show toast for stats errors, just log
      if (error.message?.includes('403') || error.message?.includes('Access denied')) {
        console.warn('Access denied to audit log stats - admin only')
      }
    }
  }, [filters.startDate, filters.endDate])

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value, page: 1 })
  }

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page })
  }

  const handleClearFilters = () => {
    setFilters({
      type: '',
      action: '',
      startDate: '',
      endDate: '',
      page: 1,
      limit: 50
    })
  }

  const handleRefresh = async () => {
    await Promise.all([loadAuditLogs(), loadAuditLogStats()])
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success'
      case 'failure': return 'warning'
      case 'error': return 'error'
      default: return ''
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'user_action': return 'primary'
      case 'system_event': return 'info'
      case 'security_event': return 'danger'
      default: return ''
    }
  }

  if (userRole !== 'admin') {
    return (
      <div className="settings-section">
        <div className="section-header">
          <h2>Access Denied</h2>
          <p>Only administrators can access audit logs.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-section">
      <div className="section-header">
        <h2>Audit Logs</h2>
        <p>View and monitor user activities and system events</p>
      </div>

      {/* Stats */}
      <AnimatePresence mode="wait">
        {auditLogStats && (
          <motion.div
            key="audit-stats"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="audit-stats"
          >
            <motion.div
              className="stat-card"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <FiActivity className="stat-icon" />
              <div>
                <motion.div
                  className="stat-value"
                  key={auditLogStats.totalLogs}
                  initial={{ scale: 1.2, color: '#2563eb' }}
                  animate={{ scale: 1, color: 'inherit' }}
                  transition={{ duration: 0.3 }}
                >
                  {auditLogStats.totalLogs}
                </motion.div>
                <div className="stat-label">Total Logs</div>
              </div>
            </motion.div>
            <motion.div
              className="stat-card"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2, delay: 0.05 }}
            >
              <FiFileText className="stat-icon" />
              <div>
                <motion.div
                  className="stat-value"
                  key={auditLogStats.byType.userActions}
                  initial={{ scale: 1.2, color: '#2563eb' }}
                  animate={{ scale: 1, color: 'inherit' }}
                  transition={{ duration: 0.3 }}
                >
                  {auditLogStats.byType.userActions}
                </motion.div>
                <div className="stat-label">User Actions</div>
              </div>
            </motion.div>
            <motion.div
              className="stat-card"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            >
              <FiActivity className="stat-icon" />
              <div>
                <motion.div
                  className="stat-value"
                  key={auditLogStats.byType.systemEvents}
                  initial={{ scale: 1.2, color: '#2563eb' }}
                  animate={{ scale: 1, color: 'inherit' }}
                  transition={{ duration: 0.3 }}
                >
                  {auditLogStats.byType.systemEvents}
                </motion.div>
                <div className="stat-label">System Events</div>
              </div>
            </motion.div>
            <motion.div
              className="stat-card"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2, delay: 0.15 }}
            >
              <FiFileText className="stat-icon" />
              <div>
                <motion.div
                  className="stat-value"
                  key={auditLogStats.byType.securityEvents}
                  initial={{ scale: 1.2, color: '#2563eb' }}
                  animate={{ scale: 1, color: 'inherit' }}
                  transition={{ duration: 0.3 }}
                >
                  {auditLogStats.byType.securityEvents}
                </motion.div>
                <div className="stat-label">Security Events</div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="audit-filters">
        <div className="filter-group">
          <label>
            <FiFilter />
            Type
          </label>
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
          >
            <option value="">All Types</option>
            <option value="user_action">User Actions</option>
            <option value="system_event">System Events</option>
            <option value="security_event">Security Events</option>
          </select>
        </div>
        <div className="filter-group">
          <label>
            <FiSearch />
            Action
          </label>
          <input
            type="text"
            placeholder="Search action..."
            value={filters.action}
            onChange={(e) => handleFilterChange('action', e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>
            <FiCalendar />
            Start Date
          </label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>
            <FiCalendar />
            End Date
          </label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
          />
        </div>
        <div className="filter-actions">
          <button
            className="btn-secondary"
            onClick={handleClearFilters}
            disabled={!filters.type && !filters.action && !filters.startDate && !filters.endDate}
            title="Clear all filters"
          >
            <FiX />
            Clear
          </button>
          <button
            className="btn-secondary"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <FiRefreshCw className={isLoading ? 'spinning' : ''} />
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Audit Log List */}
      <div className="audit-log-list">
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner-large"></div>
            <p>Loading audit logs...</p>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="empty-state">
            <FiFileText style={{ fontSize: '48px', opacity: 0.3, marginBottom: '16px' }} />
            <p>No audit logs found</p>
            {(filters.type || filters.action || filters.startDate || filters.endDate) && (
              <button
                className="btn-secondary"
                onClick={handleClearFilters}
                style={{ marginTop: '16px' }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Type</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Resource</th>
                  <th>Status</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {auditLogs.map((log) => (
                    <motion.tr
                      key={log._id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <td>{new Date(log.createdAt).toLocaleString()}</td>
                      <td>
                        <span className={`badge badge-${getTypeColor(log.type)}`}>
                          {log.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span className="action-text" title={log.action}>
                          {log.action}
                        </span>
                      </td>
                      <td>
                        {(() => {
                          // Handle populated userId (object with email, username, role)
                          if (log.userId && typeof log.userId === 'object' && log.userId.email) {
                            return <span title={log.userId.email}>{log.userId.email}</span>
                          }
                          // Handle userEmail string
                          if (log.userEmail) {
                            return <span title={log.userId ? String(log.userId) : ''}>{log.userEmail}</span>
                          }
                          // Handle userId as string or ObjectId
                          if (log.userId) {
                            const userIdStr = typeof log.userId === 'object' && log.userId._id 
                              ? String(log.userId._id) 
                              : String(log.userId)
                            return (
                              <span className="user-id" title={userIdStr}>
                                {userIdStr.length > 8 ? `${userIdStr.substring(0, 8)}...` : userIdStr}
                              </span>
                            )
                          }
                          return <span className="text-muted">N/A</span>
                        })()}
                      </td>
                      <td>{log.resource || <span className="text-muted">N/A</span>}</td>
                      <td>
                        <span className={`badge badge-${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                      <td>
                        <span className="ip-address" title={log.ipAddress}>
                          {log.ipAddress || <span className="text-muted">N/A</span>}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </motion.div>
        )}

        {/* Pagination */}
        {!isLoading && auditLogs.length > 0 && pagination.pages > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="pagination"
          >
            <button
              className="btn-secondary"
              onClick={() => handlePageChange(filters.page - 1)}
              disabled={filters.page === 1 || isLoading}
            >
              Previous
            </button>
            <span>
              Page {filters.page} of {pagination.pages} ({pagination.total} total)
            </span>
            <button
              className="btn-secondary"
              onClick={() => handlePageChange(filters.page + 1)}
              disabled={filters.page >= pagination.pages || isLoading}
            >
              Next
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default AuditLogManagement

