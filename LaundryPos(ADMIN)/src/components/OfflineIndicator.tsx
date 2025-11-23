import React, { useState, useEffect } from 'react'
import { useOffline } from '../hooks/useOffline'
import { FiWifi, FiWifiOff, FiRefreshCw, FiX, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import toast from 'react-hot-toast'
import './OfflineIndicator.css'

const HIDE_STORAGE_KEY = 'offline_indicator_hidden'

const OfflineIndicator: React.FC = () => {
  const { isOnline, isPending, pendingCount, retryQueue, clearQueue, retryFailed } = useOffline()
  const [isHidden, setIsHidden] = useState(() => {
    try {
      return localStorage.getItem(HIDE_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [wasOffline, setWasOffline] = useState(!isOnline)

  // Detect when connection is restored and show notification
  useEffect(() => {
    if (wasOffline && isOnline) {
      // Connection just restored
      if (pendingCount > 0) {
        toast.success(`Connection restored! Syncing ${pendingCount} pending action${pendingCount !== 1 ? 's' : ''}...`, {
          icon: '✅',
          duration: 3000,
        })
      } else {
        toast.success('Connection restored!', {
          icon: '✅',
          duration: 2000,
        })
      }
      setWasOffline(false)
    } else if (!isOnline) {
      setWasOffline(true)
    }
  }, [isOnline, wasOffline, pendingCount])

  // Reset hidden state when going online (so it shows when going offline again)
  useEffect(() => {
    if (isOnline && !isPending) {
      setIsHidden(false)
      localStorage.removeItem(HIDE_STORAGE_KEY)
    }
  }, [isOnline, isPending])

  const handleRetry = () => {
    retryQueue()
    toast.success('Syncing queued actions...')
  }

  const handleRetryFailed = () => {
    retryFailed()
    toast.success('Retrying failed actions...')
  }

  const handleHide = () => {
    setIsHidden(true)
    try {
      localStorage.setItem(HIDE_STORAGE_KEY, 'true')
    } catch (error) {
      console.error('Failed to save hide state:', error)
    }
  }

  const handleShow = () => {
    setIsHidden(false)
    try {
      localStorage.removeItem(HIDE_STORAGE_KEY)
    } catch (error) {
      console.error('Failed to remove hide state:', error)
    }
  }

  if (isOnline && !isPending) {
    return null
  }

  // If hidden, show a small unobtrusive indicator in the corner
  if (isHidden) {
    return (
      <div className="offline-indicator-mini" onClick={handleShow} title="Click to show offline status">
        <FiWifiOff size={16} />
        {pendingCount > 0 && <span className="mini-count">{pendingCount}</span>}
      </div>
    )
  }

  return (
    <div className={`offline-indicator ${!isOnline ? 'offline' : 'syncing'} ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="offline-indicator-content">
        {!isOnline ? (
          <>
            <FiWifiOff size={18} />
            {!isCollapsed && (
              <>
                <span>You're offline. Changes will be synced when connection is restored.</span>
                {pendingCount > 0 && (
                  <span className="pending-count">({pendingCount} pending)</span>
                )}
              </>
            )}
            {isCollapsed && pendingCount > 0 && (
              <span className="pending-count">{pendingCount} pending</span>
            )}
          </>
        ) : (
          <>
            <FiRefreshCw size={18} className="spinning" />
            {!isCollapsed && (
              <>
                <span>Syncing {pendingCount} pending action{pendingCount !== 1 ? 's' : ''}...</span>
                <button 
                  className="retry-btn" 
                  onClick={handleRetry}
                  title="Retry sync"
                >
                  <FiRefreshCw size={14} />
                </button>
              </>
            )}
            {isCollapsed && (
              <span>{pendingCount} syncing...</span>
            )}
          </>
        )}
        <button 
          className="collapse-btn" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
        </button>
        <button 
          className="close-btn" 
          onClick={handleHide}
          title="Hide indicator"
        >
          <FiX size={18} />
        </button>
      </div>
      {!isCollapsed && pendingCount > 0 && (
        <div className="offline-actions">
          <button 
            className="action-btn" 
            onClick={handleRetryFailed}
            title="Retry failed actions"
          >
            Retry Failed
          </button>
          <button 
            className="action-btn danger" 
            onClick={() => {
              if (confirm('Clear all pending actions?')) {
                clearQueue()
                toast.success('Queue cleared')
              }
            }}
            title="Clear queue"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}

export default OfflineIndicator

