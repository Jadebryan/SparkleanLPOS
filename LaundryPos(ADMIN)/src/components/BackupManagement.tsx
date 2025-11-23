import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiDatabase, FiDownload, FiTrash2, FiRefreshCw, FiClock, FiHardDrive } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { backupAPI } from '../utils/api'
import { Backup, BackupStats } from '../types'
import ConfirmDialog from './ConfirmDialog'

interface BackupManagementProps {
  userRole: 'admin' | 'staff'
}

const BackupManagement: React.FC<BackupManagementProps> = ({ userRole }) => {
  const [backups, setBackups] = useState<Backup[]>([])
  const [backupStats, setBackupStats] = useState<BackupStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [backupDialog, setBackupDialog] = useState<{
    isOpen: boolean
    action: 'restore' | 'delete' | null
    backup: Backup | null
  }>({ isOpen: false, action: null, backup: null })
  const [restoreDropExisting, setRestoreDropExisting] = useState(false)

  useEffect(() => {
    if (userRole === 'admin') {
      loadBackups()
      loadBackupStats()
    }
  }, [userRole])

  // Refresh backups periodically (optional - can be removed if not needed)
  // useEffect(() => {
  //   if (userRole === 'admin') {
  //     const interval = setInterval(() => {
  //       loadBackups()
  //     }, 30000) // Refresh every 30 seconds
  //     return () => clearInterval(interval)
  //   }
  // }, [userRole])

  const loadBackups = async () => {
    try {
      setIsLoading(true)
      const response = await backupAPI.list()
      // Response structure: { success: true, count: number, data: Backup[] }
      console.log('Backup API response:', response)
      const backups = response?.data || []
      setBackups(Array.isArray(backups) ? backups : [])
    } catch (error: any) {
      console.error('Load backups error:', error)
      toast.error(error.message || 'Failed to load backups')
      setBackups([])
    } finally {
      setIsLoading(false)
    }
  }

  const loadBackupStats = async () => {
    try {
      const response = await backupAPI.getStats()
      // Response structure: { success: true, data: BackupStats }
      console.log('Backup stats response:', response)
      const statsData = response?.data
      if (statsData) {
        setBackupStats(statsData)
      }
    } catch (error: any) {
      console.error('Failed to load backup stats:', error)
    }
  }

  const handleCreateBackup = async () => {
    setIsCreating(true)
    const startTime = Date.now()
    let backupCreated = false
    
    // Get initial backup count to compare later
    let initialBackupCount = backups.length
    
    try {
      const response = await backupAPI.create()
      console.log('Create backup response:', response)
      
      // Check if response indicates success
      if (response && (response.success !== false)) {
      backupCreated = true
      toast.success('Backup created successfully!')
      // Reload backups and stats immediately after creation
      await Promise.all([loadBackups(), loadBackupStats()])
      } else {
        // Response indicates failure, but still verify
        throw new Error(response?.error || response?.message || 'Backup creation failed')
      }
    } catch (error: any) {
      console.error('Create backup error:', error)
      
      // Check if error is due to timeout, network failure, or fetch error
      const errorMessage = error?.message || error?.toString() || ''
      const errorName = error?.name || ''
      const isNetworkError = 
        errorMessage.includes('timeout') || 
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('fetch') ||
        errorName === 'TypeError' ||
        errorName === 'AbortError' ||
        (error instanceof TypeError && errorMessage.includes('fetch'))
      
      // For ANY error (especially network errors), verify if backup was actually created
      // This handles cases where the server creates the backup but the client doesn't receive the response
      if (isNetworkError || true) { // Always verify for any error
        console.log('Network/request error detected, verifying if backup was actually created...')
        
        // Wait progressively longer for backup to complete (mongodump can take time)
        // First wait 3 seconds
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // Try to verify backup creation with retries
        let verificationAttempts = 0
        const maxVerificationAttempts = 3
        
        while (verificationAttempts < maxVerificationAttempts && !backupCreated) {
        try {
          // Refresh backups list to check if a new backup was created
          const response = await backupAPI.list()
            const currentBackups = response?.data || []
            
            // Check if backup count increased or if a new backup was created around the time we started
            const backupCountIncreased = currentBackups.length > initialBackupCount
          
            // Also check for recent backups (within 15 minutes to account for time differences)
            const recentBackups = currentBackups.filter((backup: Backup) => {
              try {
            const backupTime = new Date(backup.timestamp).getTime()
            const timeDiff = backupTime - startTime
                // Check if backup was created within the last 15 minutes (allowing for time differences)
                return timeDiff > -900000 && timeDiff < 900000
              } catch (e) {
                // If timestamp parsing fails, check if it's a new backup by comparing names
                return backupCountIncreased
              }
          })
          
            if (backupCountIncreased || recentBackups.length > 0) {
            // A new backup was found, so it was created successfully
            backupCreated = true
              toast.success('Backup created successfully! (Verified after network issue)')
            await Promise.all([loadBackups(), loadBackupStats()])
              break
            } else if (verificationAttempts < maxVerificationAttempts - 1) {
              // No backup found yet, wait longer and try again
              console.log(`Backup not found yet, waiting longer... (attempt ${verificationAttempts + 1}/${maxVerificationAttempts})`)
              await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 more seconds
            }
          } catch (verifyError) {
            console.error(`Error verifying backup creation (attempt ${verificationAttempts + 1}):`, verifyError)
            // If verification fails, wait and retry
            if (verificationAttempts < maxVerificationAttempts - 1) {
              await new Promise(resolve => setTimeout(resolve, 5000))
            }
          }
          
          verificationAttempts++
        }
        
        if (!backupCreated) {
          // No backup found after all attempts
          if (isNetworkError) {
            toast.error('Network error occurred. The backup may have been created - please check the backups list to confirm.', {
              duration: 6000
            })
          } else {
            toast.error(errorMessage || 'Failed to create backup. Please check the backups list to confirm.', {
              duration: 6000
            })
          }
          // Still refresh the list in case it was created but we couldn't detect it
          try {
            await Promise.all([loadBackups(), loadBackupStats()])
          } catch (refreshError) {
            console.error('Error refreshing backups:', refreshError)
          }
        }
      } else {
        // Other errors (not network-related, like validation errors)
        toast.error(errorMessage || 'Failed to create backup')
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleRestore = async () => {
    if (!backupDialog.backup) return

    try {
      await backupAPI.restore(backupDialog.backup.name, restoreDropExisting)
      toast.success('Backup restored successfully!')
      setBackupDialog({ isOpen: false, action: null, backup: null })
      setRestoreDropExisting(false)
      // Reload backups and stats after restore
      await Promise.all([loadBackups(), loadBackupStats()])
    } catch (error: any) {
      console.error('Restore backup error:', error)
      toast.error(error.message || 'Failed to restore backup')
    }
  }

  const handleDelete = async () => {
    if (!backupDialog.backup) return

    try {
      await backupAPI.delete(backupDialog.backup.name)
      toast.success('Backup deleted successfully!')
      setBackupDialog({ isOpen: false, action: null, backup: null })
      // Reload backups and stats immediately after deletion
      await Promise.all([loadBackups(), loadBackupStats()])
    } catch (error: any) {
      console.error('Delete backup error:', error)
      toast.error(error.message || 'Failed to delete backup')
    }
  }

  const handleCleanup = async () => {
    try {
      const result = await backupAPI.cleanup()
      const deletedCount = result?.data?.deletedCount || result?.deletedCount || 0
      toast.success(`Cleanup completed: ${deletedCount} backup(s) deleted`)
      // Reload backups and stats after cleanup
      await Promise.all([loadBackups(), loadBackupStats()])
    } catch (error: any) {
      console.error('Cleanup backups error:', error)
      toast.error(error.message || 'Failed to cleanup backups')
    }
  }

  if (userRole !== 'admin') {
    return (
      <div className="settings-section">
        <div className="section-header">
          <h2>Access Denied</h2>
          <p>Only administrators can access backup management.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-section">
      <div className="section-header">
        <h2>Database Backups</h2>
        <p>Create, restore, and manage database backups</p>
      </div>

      {/* Backup Stats */}
      <AnimatePresence mode="wait">
        {backupStats && (
          <motion.div
            key="backup-stats"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="backup-stats"
          >
            <motion.div
              className="stat-card"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <FiDatabase className="stat-icon" />
              <div>
                <motion.div
                  className="stat-value"
                  key={backupStats.totalBackups}
                  initial={{ scale: 1.2, color: '#2563eb' }}
                  animate={{ scale: 1, color: 'inherit' }}
                  transition={{ duration: 0.3 }}
                >
                  {backupStats.totalBackups}
                </motion.div>
                <div className="stat-label">Total Backups</div>
              </div>
            </motion.div>
            <motion.div
              className="stat-card"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2, delay: 0.05 }}
            >
              <FiHardDrive className="stat-icon" />
              <div>
                <motion.div
                  className="stat-value"
                  key={backupStats.totalSize}
                  initial={{ scale: 1.2, color: '#2563eb' }}
                  animate={{ scale: 1, color: 'inherit' }}
                  transition={{ duration: 0.3 }}
                >
                  {backupStats.totalSize}
                </motion.div>
                <div className="stat-label">Total Size</div>
              </div>
            </motion.div>
            <motion.div
              className="stat-card"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            >
              <FiClock className="stat-icon" />
              <div>
                <div className="stat-value">{backupStats.retentionDays}</div>
                <div className="stat-label">Retention (days)</div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="backup-actions">
        <button
          className="btn-primary"
          onClick={handleCreateBackup}
          disabled={isCreating}
        >
          {isCreating ? (
            <>
              <div className="spinner"></div>
              Creating...
            </>
          ) : (
            <>
              <FiDatabase />
              Create Backup
            </>
          )}
        </button>
        <button
          className="btn-secondary"
          onClick={async () => {
            await Promise.all([loadBackups(), loadBackupStats()])
          }}
          disabled={isLoading}
        >
          <FiRefreshCw className={isLoading ? 'spinning' : ''} />
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
        <button
          className="btn-secondary"
          onClick={handleCleanup}
        >
          <FiTrash2 />
          Cleanup Old Backups
        </button>
      </div>

      {/* Backup List */}
      <div className="backup-list">
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner-large"></div>
            <p>Loading backups...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="empty-state">No backups found</div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <table className="backup-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Date</th>
                <th>Size</th>
                <th>Database</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {backups.map((backup) => (
                  <motion.tr
                    key={backup.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <td>{backup.name}</td>
                    <td>{new Date(backup.timestamp).toLocaleString()}</td>
                    <td>{backup.sizeFormatted}</td>
                    <td>{backup.database}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon"
                          onClick={() => setBackupDialog({ isOpen: true, action: 'restore', backup })}
                          title="Restore"
                        >
                          <FiDownload />
                        </button>
                        <button
                          className="btn-icon danger"
                          onClick={() => setBackupDialog({ isOpen: true, action: 'delete', backup })}
                          title="Delete"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          </motion.div>
        )}
      </div>

      {/* Restore Dialog */}
      <ConfirmDialog
        isOpen={backupDialog.isOpen && backupDialog.action === 'restore'}
        title="Restore Backup"
        message={`Are you sure you want to restore backup "${backupDialog.backup?.name}"? This will overwrite existing data.`}
        confirmText="Restore"
        cancelText="Cancel"
        onConfirm={handleRestore}
        onCancel={() => setBackupDialog({ isOpen: false, action: null, backup: null })}
        type="warning"
      >
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={restoreDropExisting}
              onChange={(e) => setRestoreDropExisting(e.target.checked)}
            />
            Drop existing collections before restore
          </label>
        </div>
      </ConfirmDialog>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={backupDialog.isOpen && backupDialog.action === 'delete'}
        title="Delete Backup"
        message={`Are you sure you want to delete backup "${backupDialog.backup?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setBackupDialog({ isOpen: false, action: null, backup: null })}
        type="danger"
      />
    </div>
  )
}

export default BackupManagement

