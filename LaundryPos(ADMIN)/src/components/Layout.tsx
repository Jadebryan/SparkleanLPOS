import React from 'react'
import { useNavigate } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import OfflineIndicator from './OfflineIndicator'
import { useUser } from '../context/UserContext'
import { useTheme } from '../context/ThemeContext'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'
import { settingsAPI } from '../utils/api'

import './Layout.css'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useUser()
  const { sidebarCollapsed, toggleSidebar } = useTheme()
  const navigate = useNavigate()

  // Global navigation shortcuts
  useKeyboardShortcut([
    {
      key: 'b',
      ctrl: true,
      callback: () => {
        toggleSidebar()
      }
    },
    {
      key: 'n',
      ctrl: true,
      alt: true,
      callback: () => {
        navigate('/orders')
      }
    },
    {
      key: 'd',
      ctrl: true,
      callback: () => {
        navigate('/dashboard')
      }
    },
    {
      key: 'o',
      ctrl: true,
      callback: () => {
        navigate('/orders')
      }
    },
    {
      key: 'c',
      ctrl: true,
      callback: () => {
        navigate('/customers')
      }
    },
    {
      key: 's',
      ctrl: true,
      callback: () => {
        navigate('/services')
      }
    },
    {
      key: 'r',
      ctrl: true,
      callback: () => {
        navigate('/reports')
      }
    },
    {
      key: 'e',
      ctrl: true,
      callback: () => {
        navigate('/expenses')
      }
    }
  ])

  // Auto logout on inactivity with warning
  const defaultIdleConfig = React.useMemo(() => ({
    enabled: true,
    timeoutMinutes: 15,
    warningSeconds: 60,
  }), [])

  const [idleSettings, setIdleSettings] = React.useState(defaultIdleConfig)
  const [idleSettingsLoaded, setIdleSettingsLoaded] = React.useState(false)
  const [showIdleWarning, setShowIdleWarning] = React.useState(false)
  const [warningCountdown, setWarningCountdown] = React.useState(defaultIdleConfig.warningSeconds)

  React.useEffect(() => {
    let isMounted = true
    const loadSettings = async () => {
      if (!user) return
      try {
        const response = await settingsAPI.getInactivitySettings()
        if (!isMounted) return
        const roleKey = user.role === 'staff' ? 'staff' : 'admin'
        const roleSettings = response?.[roleKey]
        if (roleSettings) {
          setIdleSettings({
            enabled: roleSettings.enabled ?? defaultIdleConfig.enabled,
            timeoutMinutes: roleSettings.timeoutMinutes ?? defaultIdleConfig.timeoutMinutes,
            warningSeconds: roleSettings.warningSeconds ?? defaultIdleConfig.warningSeconds,
          })
        } else {
          setIdleSettings(defaultIdleConfig)
        }
      } catch (error) {
        console.error('Failed to load inactivity settings:', error)
        setIdleSettings(defaultIdleConfig)
      } finally {
        if (isMounted) setIdleSettingsLoaded(true)
      }
    }

    loadSettings()

    return () => {
      isMounted = false
    }
  }, [user, defaultIdleConfig])

  React.useEffect(() => {
    setWarningCountdown(Math.max(Math.floor(idleSettings.warningSeconds ?? 60), 5))
  }, [idleSettings.warningSeconds])

  React.useEffect(() => {
    if (!user || !idleSettingsLoaded) return
    if (!idleSettings.enabled) {
      setShowIdleWarning(false)
      return
    }

    const timeoutMinutes = Math.max(idleSettings.timeoutMinutes || 15, 1)
    const IDLE_MS = timeoutMinutes * 60 * 1000
    const maxWarningSeconds = Math.max(timeoutMinutes * 60 - 5, 5)
    const warningSeconds = Math.min(Math.max(idleSettings.warningSeconds || 60, 5), maxWarningSeconds)
    const WARNING_MS = warningSeconds * 1000
    setWarningCountdown(Math.floor(warningSeconds))

    let lastActivity = Date.now()
    let pollInterval: number | undefined
    let countdownInterval: number | undefined
    let warned = false

    const reset = () => {
      lastActivity = Date.now()
      if (warned) {
        warned = false
        setShowIdleWarning(false)
        setWarningCountdown(60)
        if (countdownInterval) window.clearInterval(countdownInterval)
      }
    }

    const onVisibility = () => { if (!document.hidden) reset() }

    const start = () => {
      pollInterval = window.setInterval(() => {
        if (!user) return
        const elapsed = Date.now() - lastActivity

        if (!warned && elapsed >= IDLE_MS - WARNING_MS && elapsed < IDLE_MS) {
          warned = true
          setShowIdleWarning(true)
          const remaining = Math.ceil((IDLE_MS - elapsed) / 1000)
          setWarningCountdown(remaining)
          countdownInterval = window.setInterval(() => {
            setWarningCountdown(prev => {
              if (prev <= 1) {
                if (countdownInterval) window.clearInterval(countdownInterval)
              }
              return Math.max(prev - 1, 0)
            })
          }, 1000)
        }

        if (elapsed >= IDLE_MS) {
          window.clearInterval(pollInterval)
          if (countdownInterval) window.clearInterval(countdownInterval)
          document.removeEventListener('mousemove', reset)
          document.removeEventListener('keydown', reset)
          document.removeEventListener('click', reset)
          document.removeEventListener('scroll', reset)
          document.removeEventListener('visibilitychange', onVisibility)
          logout()
          navigate('/login')
        }
      }, 30000)
    }

    // Activity listeners
    document.addEventListener('mousemove', reset)
    document.addEventListener('keydown', reset)
    document.addEventListener('click', reset)
    document.addEventListener('scroll', reset)
    document.addEventListener('visibilitychange', onVisibility)
    start()

    return () => {
      if (pollInterval) window.clearInterval(pollInterval)
      if (countdownInterval) window.clearInterval(countdownInterval)
      document.removeEventListener('mousemove', reset)
      document.removeEventListener('keydown', reset)
      document.removeEventListener('click', reset)
      document.removeEventListener('scroll', reset)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [
    user,
    logout,
    navigate,
    idleSettingsLoaded,
    idleSettings.enabled,
    idleSettings.timeoutMinutes,
    idleSettings.warningSeconds,
  ])

  const stayLoggedIn = () => {
    setShowIdleWarning(false)
    setWarningCountdown(Math.max(Math.floor(idleSettings.warningSeconds ?? 60), 5))
  }
  
  return (
    <div className="layout">
      <Header username={user?.username} role={user?.role} />
      <div className="layout-container">
        <Sidebar />
        <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          {children}
        </div>
      </div>

      {showIdleWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, width: 360, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>You will be logged out soon</h3>
            <p style={{ margin: 0, color: '#374151' }}>No activity detected. You will be logged out in <strong>{warningCountdown}</strong> seconds.</p>
            <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={stayLoggedIn} style={{ padding: '8px 12px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Stay Logged In</button>
            </div>
          </div>
        </div>
      )}
      
      <OfflineIndicator />
    </div>
  )
}

export default Layout

