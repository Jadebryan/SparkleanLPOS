import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useUser } from '../context/UserContext'
import { usePermissions } from '../hooks/usePermissions'
import LoadingSpinner from './LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  resource: string
  action: string
  fallbackPath?: string
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  resource,
  action,
  fallbackPath = '/dashboard'
}) => {
  // ALL HOOKS MUST BE CALLED FIRST - before any conditional returns
  const { user } = useUser()
  const { hasPermission, isLoading, hasError, clearCache } = usePermissions()
  const [showLoadingError, setShowLoadingError] = useState(false)
  const [showRecoveryForm, setShowRecoveryForm] = useState(false)
  const [recoveryKey, setRecoveryKey] = useState('')
  const [isRecovering, setIsRecovering] = useState(false)

  // Show error if loading takes too long
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowLoadingError(true)
      }, 5000)
      return () => clearTimeout(timer)
    } else {
      setShowLoadingError(false)
    }
  }, [isLoading])

  // Check permission for all users (including admin)
  const hasAccess = hasPermission(resource, action)
  
  // Special case: if trying to access dashboard and don't have permission, 
  // check if user has ANY permission to avoid redirect loop
  const hasDashboardAccess = hasPermission('dashboard', 'read')
  
  useEffect(() => {
    if (!isLoading && !hasAccess && user) {
      toast.error(`Access denied. You don't have permission to ${action} ${resource}.`)
    }
  }, [isLoading, hasAccess, resource, action, user])

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recoveryKey.trim()) {
      toast.error('Please enter a recovery key')
      return
    }

    setIsRecovering(true)
    try {
      const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${API_URL}/rbac/emergency-recover-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ secretKey: recoveryKey })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success('Admin permissions restored! Refreshing...', {
          duration: 2000,
          icon: '✅'
        })
        
        // Clear permissions cache
        if (clearCache) {
          clearCache()
        }
        
        // Clear all localStorage and sessionStorage to ensure fresh state
        localStorage.clear()
        sessionStorage.clear()
        
        // Enforce hard page refresh after a short delay
        setTimeout(() => {
          // Force hard refresh by adding timestamp to bypass cache
          const url = new URL(window.location.href)
          url.searchParams.set('recovered', Date.now().toString())
          window.location.href = url.toString()
        }, 1500)
      } else {
        toast.error(data.message || 'Invalid recovery key', {
          duration: 3000
        })
      }
    } catch (error: any) {
      console.error('Recovery error:', error)
      toast.error(error.message || 'Failed to recover admin permissions', {
        duration: 3000
      })
    } finally {
      setIsRecovering(false)
    }
  }

  // NOW we can do conditional returns
  // Check if user is logged in
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Show loading while checking permissions (with timeout fallback)
  if (isLoading) {
    if (showLoadingError) {
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          padding: '20px',
          textAlign: 'center',
          backgroundColor: 'var(--bg-primary, #ffffff)'
        }}>
          <h2 style={{ marginBottom: '16px', color: 'var(--text-primary, #333)' }}>
            Loading Permissions...
          </h2>
          <p style={{ color: 'var(--text-secondary, #666)', marginBottom: '24px' }}>
            Taking longer than expected. Please refresh the page or contact support.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--color-primary, #3b82f6)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
        </div>
      )
    }

    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: 'var(--bg-primary, #ffffff)'
      }}>
        <LoadingSpinner />
      </div>
    )
  }

  if (!hasAccess) {
    // If redirecting to dashboard but don't have dashboard access, 
    // redirect to first available page or show error
    if (fallbackPath === '/dashboard' && !hasDashboardAccess) {
      // Try to find first accessible page
      if (hasPermission('orders', 'read')) {
        return <Navigate to="/orders" replace />
      } else if (hasPermission('customers', 'read')) {
        return <Navigate to="/customers" replace />
      } else if (hasPermission('reports', 'read')) {
        return <Navigate to="/reports" replace />
      } else if (hasPermission('rbac', 'read')) {
        return <Navigate to="/rbac" replace />
      } else {
        // No permissions at all - show error page with recovery option for admins
        const isAdmin = user?.role === 'admin'
        
        return (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh',
            padding: '20px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-primary, #f5f5f5)'
          }}>
            <div style={{
              background: 'white',
              padding: '40px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              maxWidth: '500px',
              width: '100%'
            }}>
              <h2 style={{ marginBottom: '16px', color: 'var(--text-primary, #333)', fontSize: '24px' }}>
                Access Denied
              </h2>
              <p style={{ color: 'var(--text-secondary, #666)', marginBottom: '24px', fontSize: '14px' }}>
                You don't have permission to access this page. Please contact your administrator.
              </p>

              {isAdmin && (
                <div style={{
                  marginTop: '30px',
                  padding: '20px',
                  background: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '8px',
                  marginBottom: '20px'
                }}>
                  <p style={{ 
                    color: '#856404', 
                    marginBottom: '16px', 
                    fontSize: '13px',
                    fontWeight: '600'
                  }}>
                    🔓 Admin Recovery Available
                  </p>
                  {!showRecoveryForm ? (
                    <button
                      onClick={() => setShowRecoveryForm(true)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#ffc107',
                        color: '#856404',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}
                    >
                      Enter Recovery Key
                    </button>
                  ) : (
                    <form onSubmit={handleRecovery} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <input
                        type="password"
                        value={recoveryKey}
                        onChange={(e) => setRecoveryKey(e.target.value)}
                        placeholder="Enter recovery key"
                        disabled={isRecovering}
                        style={{
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '14px',
                          width: '100%'
                        }}
                        autoFocus
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="submit"
                          disabled={isRecovering || !recoveryKey.trim()}
                          style={{
                            flex: 1,
                            padding: '10px',
                            backgroundColor: isRecovering ? '#ccc' : '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: isRecovering ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: '600'
                          }}
                        >
                          {isRecovering ? 'Recovering...' : 'Recover Access'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowRecoveryForm(false)
                            setRecoveryKey('')
                          }}
                          disabled={isRecovering}
                          style={{
                            padding: '10px 16px',
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: isRecovering ? 'not-allowed' : 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              <button
                onClick={() => window.location.href = '/login'}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--color-primary, #3b82f6)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Go to Login
              </button>
            </div>
          </div>
        )
      }
    }
    return <Navigate to={fallbackPath} replace />
  }

  return <>{children}</>
}

export default ProtectedRoute

