import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiShield, FiKey, 
  FiCheck, FiX, FiAlertCircle, FiSettings, FiSave, FiSend, FiType,
  FiDatabase, FiFileText, FiServer, FiDownload, FiTrash2, FiRefreshCw,
  FiSearch, FiFilter, FiCalendar, FiClock, FiActivity, FiTrendingUp, FiEdit3
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useUser } from '../context/UserContext'
import { authAPI, backupAPI, auditLogAPI, settingsAPI } from '../utils/api'
import { availableFonts, getFontPreference, applyFont, loadFont } from '../utils/fontManager'
import { HexColorPicker, HexColorInput } from 'react-colorful'
import {
  colorPalettes,
  getColorPalettePreference,
  setColorPalettePreference,
  applyColorPalette,
  createCustomPalette,
  updateCustomPalette,
  deleteCustomPalette,
  getAllPalettes,
  ColorPalette
} from '../utils/colorPalette'
import { Backup, BackupStats, AuditLog, AuditLogStats } from '../types'
import ConfirmDialog from '../components/ConfirmDialog'
import EmailInput from '../components/EmailInput'
import BackupManagement from '../components/BackupManagement'
import AuditLogManagement from '../components/AuditLogManagement'
import './Settings.css'

const DEFAULT_SESSION_SETTINGS = {
  enabled: true,
  timeoutMinutes: 15,
  warningSeconds: 60,
}

const SAVED_COLOR_STORAGE_KEY = 'admin_saved_palette_colors'
const DEFAULT_SAVED_COLORS = [
  '#F97316',
  '#2563EB',
  '#059669',
  '#7C3AED',
  '#DC2626',
  '#14B8A6',
  '#F59E0B',
  '#0EA5E9',
  '#F43F5E',
  '#10B981',
  '#EC4899',
  '#1E3A8A'
]

const FONT_SECTION_COLLAPSED_KEY = 'admin_font_section_collapsed'

const Settings: React.FC = () => {
  const { user } = useUser()
  const [activeTab, setActiveTab] = useState('profile')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isEmailVerificationSent, setIsEmailVerificationSent] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [isCodeVerified, setIsCodeVerified] = useState(false)
  const [sessionSettings, setSessionSettings] = useState(() => ({ ...DEFAULT_SESSION_SETTINGS }))
  const [isSessionLoading, setIsSessionLoading] = useState(false)
  const [isSessionSaving, setIsSessionSaving] = useState(false)

  // Debug: Log user data
  console.log('Settings component rendered, user:', user)

  // Form states
  const [profileForm, setProfileForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    fullName: user?.fullName || ''
  })

  // Load user data when user changes
  useEffect(() => {
    if (user) {
      setProfileForm({
        username: user.username || '',
        email: user.email || '',
        fullName: user.fullName || ''
      })
    }
  }, [user])

  useEffect(() => {
    const fetchSessionSettings = async () => {
      if (!user) return
      try {
        setIsSessionLoading(true)
        const response = await settingsAPI.getInactivitySettings()
        const roleKey = user.role === 'staff' ? 'staff' : 'admin'
        const roleSettings = response?.[roleKey]
        if (roleSettings) {
          setSessionSettings({
            enabled: roleSettings.enabled ?? DEFAULT_SESSION_SETTINGS.enabled,
            timeoutMinutes: roleSettings.timeoutMinutes ?? DEFAULT_SESSION_SETTINGS.timeoutMinutes,
            warningSeconds: roleSettings.warningSeconds ?? DEFAULT_SESSION_SETTINGS.warningSeconds,
          })
        } else {
          setSessionSettings({ ...DEFAULT_SESSION_SETTINGS })
        }
      } catch (error) {
        console.error('Failed to load session timeout settings:', error)
        toast.error('Failed to load session timeout settings')
      } finally {
        setIsSessionLoading(false)
      }
    }

    fetchSessionSettings()
  }, [user])

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [emailForm, setEmailForm] = useState({
    newEmail: '',
    confirmEmail: ''
  })

  const tabs = [
    { id: 'profile', label: 'Profile', icon: FiUser },
    { id: 'security', label: 'Security', icon: FiShield },
    { id: 'email', label: 'Email', icon: FiMail },
    { id: 'appearance', label: 'Appearance', icon: FiType },
    // Admin-only tabs
    ...(user?.role === 'admin' ? [
      { id: 'backups', label: 'Backups', icon: FiDatabase },
      { id: 'audit-logs', label: 'Audit Logs', icon: FiFileText },
      { id: 'system', label: 'System', icon: FiServer }
    ] : [])
  ]

  // Font preference state
  const [selectedFont, setSelectedFont] = useState<string>(getFontPreference())
  const [isFontSelectorHidden, setIsFontSelectorHidden] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(FONT_SECTION_COLLAPSED_KEY) === 'true'
  })
  
  // Color palette preference state
  const [selectedPalette, setSelectedPalette] = useState<string>(getColorPalettePreference())
  const [availablePalettes, setAvailablePalettes] = useState<ColorPalette[]>(colorPalettes)
  const [customPaletteName, setCustomPaletteName] = useState('My Custom Palette')
  const [primaryColor, setPrimaryColor] = useState('#F97316')
  const [accentColor, setAccentColor] = useState('#2563EB')
  const [savedColors, setSavedColors] = useState<string[]>(DEFAULT_SAVED_COLORS)
  const [paletteLoading, setPaletteLoading] = useState(false)
  const [colorFocus, setColorFocus] = useState<'primary' | 'accent'>('primary')
  const [editingPaletteId, setEditingPaletteId] = useState<string | null>(null)
  const [palettePendingDelete, setPalettePendingDelete] = useState<ColorPalette | null>(null)

  // Backup states
  const [backups, setBackups] = useState<Backup[]>([])
  const [backupStats, setBackupStats] = useState<BackupStats | null>(null)
  const [isBackupLoading, setIsBackupLoading] = useState(false)
  const [backupDialog, setBackupDialog] = useState<{
    isOpen: boolean
    action: 'restore' | 'delete' | null
    backup: Backup | null
  }>({ isOpen: false, action: null, backup: null })
  const [restoreDropExisting, setRestoreDropExisting] = useState(false)

  // Audit log states
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditLogStats, setAuditLogStats] = useState<AuditLogStats | null>(null)
  const [isAuditLogLoading, setIsAuditLogLoading] = useState(false)
  const [auditLogFilters, setAuditLogFilters] = useState({
    type: '',
    action: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 50
  })
  const [auditLogPagination, setAuditLogPagination] = useState({
    total: 0,
    pages: 1
  })

  // Initialize font on mount (only once)
  useEffect(() => {
    const savedFont = getFontPreference()
    setSelectedFont(savedFont)
    applyFont(savedFont)
    
    // Initialize color palette
    const savedPalette = getColorPalettePreference()
    setSelectedPalette(savedPalette)
    applyColorPalette(savedPalette)
  }, [])

  // Preload all fonts when appearance tab is opened for preview
  useEffect(() => {
    if (activeTab === 'appearance') {
      // Load all fonts for preview
      availableFonts.forEach(font => {
        loadFont(font.googleFontsUrl)
      })
    }
  }, [activeTab])

  useEffect(() => {
    refreshPalettes()
    loadSavedColors()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(FONT_SECTION_COLLAPSED_KEY)
    if (stored !== null) {
      setIsFontSelectorHidden(stored === 'true')
    }
  }, [])

  const toggleFontSelector = () => {
    setIsFontSelectorHidden(prev => {
      const next = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem(FONT_SECTION_COLLAPSED_KEY, next ? 'true' : 'false')
      }
      return next
    })
  }

  const refreshPalettes = () => {
    setPaletteLoading(true)
    try {
      const palettes = getAllPalettes()
      setAvailablePalettes(palettes)
    } finally {
      setPaletteLoading(false)
    }
  }

  const loadSavedColors = () => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(SAVED_COLOR_STORAGE_KEY)
    if (stored) {
      try {
        const parsed: string[] = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length) {
          const unique = Array.from(new Set([...DEFAULT_SAVED_COLORS, ...parsed.map(color => color.toUpperCase())]))
          setSavedColors(unique.slice(0, 20))
        }
      } catch (error) {
        console.error('Failed to parse saved colors', error)
      }
    }
  }

  const persistSavedColors = (colors: string[]) => {
    if (typeof window === 'undefined') return
    const customOnly = colors.filter(color => !DEFAULT_SAVED_COLORS.includes(color))
    localStorage.setItem(SAVED_COLOR_STORAGE_KEY, JSON.stringify(customOnly))
  }

  const isValidHexColor = (value: string) => /^#[0-9A-F]{6}$/i.test(value)

  const normalizeHexValue = (value: string) => {
    const cleaned = value.replace('#', '').replace(/[^0-9a-fA-F]/g, '').slice(0, 6)
    return `#${cleaned.toUpperCase()}`
  }

  const handleAddSavedColor = (color: string) => {
    if (!isValidHexColor(color) || savedColors.includes(color.toUpperCase())) return
    const next = [...savedColors, color.toUpperCase()].slice(-20)
    setSavedColors(next)
    persistSavedColors(next)
  }

  const editingPalette = editingPaletteId ? availablePalettes.find(palette => palette.id === editingPaletteId) : null

  const cancelEditingPalette = () => {
    setEditingPaletteId(null)
    setCustomPaletteName('My Custom Palette')
    setPrimaryColor('#F97316')
    setAccentColor('#2563EB')
  }

  const handlePaletteSelection = (paletteId: string, paletteName: string) => {
    if (editingPaletteId && paletteId !== editingPaletteId) {
      cancelEditingPalette()
    }
    setSelectedPalette(paletteId)
    setColorPalettePreference(paletteId)
    toast.success(`Color palette changed to ${paletteName}`)
  }

  const handleSaveCustomPalette = () => {
    if (!customPaletteName.trim()) {
      toast.error('Please provide a name for your palette.')
      return
    }
    if (!isValidHexColor(primaryColor) || !isValidHexColor(accentColor)) {
      toast.error('Enter valid HEX colors (e.g. #F97316).')
      return
    }
    try {
      setPaletteLoading(true)
      if (editingPaletteId) {
        const palette = updateCustomPalette(editingPaletteId, {
          name: customPaletteName.trim(),
          primaryColor,
          accentColor,
        })
        refreshPalettes()
        handlePaletteSelection(palette.id, palette.name)
        toast.success('Custom palette updated')
      } else {
        const palette = createCustomPalette({
          name: customPaletteName.trim(),
          primaryColor,
          accentColor,
        })
        refreshPalettes()
        handlePaletteSelection(palette.id, palette.name)
      }
      setCustomPaletteName('My Custom Palette')
      setEditingPaletteId(null)
    } catch (error) {
      console.error('Failed to save custom palette', error)
      toast.error('Unable to save custom palette.')
    } finally {
      setPaletteLoading(false)
    }
  }

  const handleDeletePalette = (palette: ColorPalette) => {
    if (palette.type !== 'custom') return
    setPalettePendingDelete(palette)
  }

  const confirmDeletePalette = () => {
    if (!palettePendingDelete) return
    deleteCustomPalette(palettePendingDelete.id)
    refreshPalettes()
    if (selectedPalette === palettePendingDelete.id) {
    handlePaletteSelection('default', 'Sparklean Orange & Blue')
    }
    if (editingPaletteId === palettePendingDelete.id) {
      cancelEditingPalette()
    }
    setPalettePendingDelete(null)
  }

  const cancelDeletePalette = () => {
    setPalettePendingDelete(null)
  }

  const handleEditPalette = (palette: ColorPalette) => {
    if (palette.type !== 'custom') return
    setEditingPaletteId(palette.id)
    setCustomPaletteName(palette.name)
    setPrimaryColor(palette.metadata?.primarySource || palette.primary.blue)
    setAccentColor(palette.metadata?.accentSource || palette.accent.orange)
    setColorFocus('primary')
    toast.success(`Editing ${palette.name}`)
  }


  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      // Update profile via API
      await authAPI.updateProfile({
        username: profileForm.username,
        email: profileForm.email
      })
      
      // Update local storage user data
      const userData = localStorage.getItem('user')
      if (userData) {
        const parsedUser = JSON.parse(userData)
        parsedUser.username = profileForm.username
        parsedUser.email = profileForm.email
        localStorage.setItem('user', JSON.stringify(parsedUser))
      }
      
      toast.success('Profile updated successfully!')
    } catch (error: any) {
      console.error('Profile update error:', error)
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendVerificationEmail = async () => {
    if (!emailForm.newEmail || !emailForm.confirmEmail || emailForm.newEmail !== emailForm.confirmEmail) {
      toast.error('Please enter matching email addresses')
      return
    }

    setIsLoading(true)
    
    try {
      await authAPI.sendVerificationCode({ email: emailForm.newEmail })
      
      setIsEmailVerificationSent(true)
      toast.success('Verification code sent to your email! Please check your inbox.', { 
        duration: 4000 
      })
    } catch (error: any) {
      console.error('Send verification email error:', error)
      toast.error(error.message || 'Failed to send verification code')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code')
      return
    }

    setIsLoading(true)
    
    try {
      await authAPI.verifyEmailCode({ 
        email: emailForm.newEmail, 
        code: verificationCode 
      })
      
      setIsCodeVerified(true)
      toast.success('Email verified successfully!')
    } catch (error: any) {
      console.error('Verify code error:', error)
      toast.error(error.message || 'Invalid verification code')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }

    setIsLoading(true)
    
    try {
      // Change password via API
      await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      })
      
      toast.success('Password changed successfully!')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error: any) {
      console.error('Password change error:', error)
      toast.error(error.message || 'Password change failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (emailForm.newEmail !== emailForm.confirmEmail) {
      toast.error('Email addresses do not match')
      return
    }

    if (!isCodeVerified) {
      toast.error('Please verify your email address first')
      return
    }

    setIsLoading(true)
    
    try {
      // Update email via API
      await authAPI.updateProfile({
        email: emailForm.newEmail
      })
      
      // Update local storage user data
      const userData = localStorage.getItem('user')
      if (userData) {
        const parsedUser = JSON.parse(userData)
        parsedUser.email = emailForm.newEmail
        localStorage.setItem('user', JSON.stringify(parsedUser))
      }
      
      // Update profile form
      setProfileForm({ ...profileForm, email: emailForm.newEmail })
      
      toast.success('Email changed successfully!')
      setEmailForm({ newEmail: '', confirmEmail: '' })
      setIsEmailVerificationSent(false)
      setIsCodeVerified(false)
      setVerificationCode('')
    } catch (error: any) {
      console.error('Email change error:', error)
      toast.error(error.message || 'Failed to change email')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSessionFieldChange = (field: 'timeoutMinutes' | 'warningSeconds', value: number) => {
    setSessionSettings(prev => {
      if (field === 'timeoutMinutes') {
        const minutes = Math.min(Math.max(Number(value) || 0, 1), 240)
        const maxWarning = Math.max(minutes * 60 - 5, 5)
        return {
          ...prev,
          timeoutMinutes: minutes,
          warningSeconds: Math.min(prev.warningSeconds, maxWarning),
        }
      }
      if (field === 'warningSeconds') {
        return {
          ...prev,
          warningSeconds: Math.max(Number(value) || 0, 5),
        }
      }
      return prev
    })
  }

  const handleSessionSettingsSave = async () => {
    if (!user) return

    const minutes = Number(sessionSettings.timeoutMinutes)
    if (minutes < 5 || minutes > 240) {
      toast.error('Timeout must be between 5 and 240 minutes')
      return
    }

    const maxWarning = Math.max(minutes * 60 - 5, 5)
    const warning = Number(sessionSettings.warningSeconds)
    if (warning < 5 || warning > maxWarning) {
      toast.error(`Warning countdown must be between 5 and ${maxWarning} seconds`)
      return
    }

    try {
      setIsSessionSaving(true)
      await settingsAPI.updateInactivitySettings({
        enabled: sessionSettings.enabled,
        timeoutMinutes: minutes,
        warningSeconds: warning,
        role: user.role === 'staff' ? 'staff' : 'admin',
      })
      toast.success('Session timeout updated')
    } catch (error: any) {
      console.error('Session settings update error:', error)
      toast.error(error?.message || 'Failed to update session timeout')
    } finally {
      setIsSessionSaving(false)
    }
  }

  const handleSessionReset = () => {
    setSessionSettings({ ...DEFAULT_SESSION_SETTINGS })
  }

  // Early return if user is not available
  if (!user) {
    return (
      <div className="settings-page">
        <div className="settings-header">
          <div className="settings-title">
            <FiSettings className="settings-icon" />
            <h1>Settings</h1>
          </div>
          <p className="settings-subtitle">Please log in to access settings</p>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div className="settings-title">
          <FiSettings className="settings-icon" />
          <h1>Settings</h1>
        </div>
        <p className="settings-subtitle">Manage your account settings and preferences</p>
      </div>

      <div className="settings-container">
        <div className="settings-sidebar">
          <div className="settings-tabs">
            {tabs.map((tab) => {
              const IconComponent = tab.icon
              return (
                <button
                  key={tab.id}
                  className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <IconComponent />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="settings-content">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="settings-panel"
          >
            {activeTab === 'profile' && (
              <div className="settings-section">
                <div className="section-header">
                  <h2>Profile Information</h2>
                  <p>Update your personal information and profile details</p>
                </div>

                <form onSubmit={handleProfileUpdate} className="settings-form">
                  <div className="form-group">
                    <label htmlFor="username">
                      <FiUser className="label-icon" />
                      Username
                    </label>
                    <input
                      type="text"
                      id="username"
                      value={profileForm.username}
                      onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                      placeholder="Enter your username"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="fullName">
                      <FiUser className="label-icon" />
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      value={profileForm.fullName}
                      onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">
                      <FiMail className="label-icon" />
                      Email Address
                    </label>
                    <EmailInput
                      id="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      placeholder="Enter your email address"
                      required
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-primary" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <div className="spinner"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <FiSave />
                          Update Profile
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <>
                <div className="settings-section">
                  <div className="section-header">
                    <h2>Change Password</h2>
                    <p>Update your password to keep your account secure</p>
                  </div>

                  <form onSubmit={handlePasswordChange} className="settings-form">
                    <div className="form-group">
                      <label htmlFor="currentPassword">
                        <FiLock className="label-icon" />
                        Current Password
                      </label>
                      <div className="password-input">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          id="currentPassword"
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                          placeholder="Enter your current password"
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="newPassword">
                        <FiKey className="label-icon" />
                        New Password
                      </label>
                      <div className="password-input">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          id="newPassword"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          placeholder="Enter your new password"
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="confirmPassword">
                        <FiLock className="label-icon" />
                        Confirm New Password
                      </label>
                      <div className="password-input">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          id="confirmPassword"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                          placeholder="Confirm your new password"
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                      {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                        <div className="error-message">
                          <FiAlertCircle />
                          Passwords do not match
                        </div>
                      )}
                    </div>

                    <div className="form-group full-width">
                      <div className="password-requirements">
                        <div className={`requirement ${passwordForm.newPassword.length >= 8 ? 'met' : ''}`}>
                          <FiCheck className="check-icon" />
                          At least 8 characters
                        </div>
                        <div className={`requirement ${/[A-Z]/.test(passwordForm.newPassword) ? 'met' : ''}`}>
                          <FiCheck className="check-icon" />
                          One uppercase letter
                        </div>
                        <div className={`requirement ${/[0-9]/.test(passwordForm.newPassword) ? 'met' : ''}`}>
                          <FiCheck className="check-icon" />
                          One number
                        </div>
                      </div>
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="btn-primary" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <div className="spinner"></div>
                            Changing Password...
                          </>
                        ) : (
                          <>
                            <FiShield />
                            Change Password
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="settings-section session-break">
                  <div className="section-header">
                    <h2>Session Timeout</h2>
                    <p>Control automatic logout after inactivity.</p>
                  </div>

                  {isSessionLoading ? (
                    <p className="form-description">Loading session timeout settings...</p>
                  ) : (
                    <div className="session-settings-grid">
                      <div className="session-toggle-row">
                        <div>
                          <h4>Automatic logout</h4>
                          <p>Disable to keep the session active indefinitely.</p>
                        </div>
                        <label className="settings-switch">
                          <input
                            type="checkbox"
                            checked={sessionSettings.enabled}
                            onChange={(e) => setSessionSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                          />
                          <span className="slider round"></span>
                        </label>
                      </div>

                      <div className="session-input-row">
                        <label>Timeout duration (minutes)</label>
                        <input
                          type="number"
                          min={5}
                          max={240}
                          value={sessionSettings.timeoutMinutes}
                          disabled={!sessionSettings.enabled}
                          onChange={(e) => handleSessionFieldChange('timeoutMinutes', Number(e.target.value))}
                        />
                        <small>Auto logout will trigger after this many minutes of inactivity (between 5 and 240 minutes).</small>
                      </div>

                      <div className="session-input-row">
                        <label>Warning countdown (seconds)</label>
                        <input
                          type="number"
                          min={5}
                          max={Math.max(sessionSettings.timeoutMinutes * 60 - 5, 5)}
                          value={sessionSettings.warningSeconds}
                          disabled={!sessionSettings.enabled}
                          onChange={(e) => handleSessionFieldChange('warningSeconds', Number(e.target.value))}
                        />
                        <small>Users see a warning before logout. Must be at least 5 seconds.</small>
                      </div>
                    </div>
                  )}

                  <div className="form-actions session-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleSessionReset}
                      disabled={isSessionSaving}
                    >
                      Reset to Default
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleSessionSettingsSave}
                      disabled={isSessionSaving || isSessionLoading}
                    >
                      {isSessionSaving ? (
                        <>
                          <div className="spinner"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <FiSave />
                          Save Session Settings
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'email' && (
              <div className="settings-section">
                <div className="section-header">
                  <h2>Change Email Address</h2>
                  <p>Update your email address with verification</p>
                </div>

                <div className="current-email">
                  <div className="current-email-label">Current Email:</div>
                  <div className="current-email-value">{profileForm.email}</div>
                </div>

                <form onSubmit={handleEmailChange} className="settings-form">
                  <div className="form-group">
                    <label htmlFor="newEmail">
                      <FiMail className="label-icon" />
                      New Email Address
                    </label>
                    <EmailInput
                      id="newEmail"
                      value={emailForm.newEmail}
                      onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                      placeholder="Enter your new email address"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmEmail">
                      <FiMail className="label-icon" />
                      Confirm New Email
                    </label>
                    <EmailInput
                      id="confirmEmail"
                      value={emailForm.confirmEmail}
                      onChange={(e) => setEmailForm({ ...emailForm, confirmEmail: e.target.value })}
                      placeholder="Confirm your new email address"
                      required
                    />
                    {emailForm.confirmEmail && emailForm.newEmail !== emailForm.confirmEmail && (
                      <div className="error-message">
                        <FiAlertCircle />
                        Email addresses do not match
                      </div>
                    )}
                  </div>

                  {!isEmailVerificationSent ? (
                    <div className="form-actions">
                      <button 
                        type="button" 
                        className="btn-secondary" 
                        onClick={handleSendVerificationEmail}
                        disabled={isLoading || !emailForm.newEmail || !emailForm.confirmEmail || emailForm.newEmail !== emailForm.confirmEmail}
                      >
                        {isLoading ? (
                          <>
                            <div className="spinner"></div>
                            Sending...
                          </>
                        ) : (
                          <>
                            <FiSend />
                            Send Verification Code
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="verification-section">
                      <div className="verification-status">
                        <FiCheck className="status-icon success" />
                        <span>Verification code sent to {emailForm.newEmail}</span>
                      </div>

                      <div className="form-group">
                        <label htmlFor="verificationCode">
                          <FiKey className="label-icon" />
                          Verification Code
                        </label>
                        <input
                          type="text"
                          id="verificationCode"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="Enter 6-digit code"
                          maxLength={6}
                          className="verification-input"
                        />
                      </div>

                      <div className="form-actions">
                        <button 
                          type="button" 
                          className="btn-secondary" 
                          onClick={handleVerifyCode}
                          disabled={isLoading || verificationCode.length !== 6}
                        >
                          {isLoading ? (
                            <>
                              <div className="spinner"></div>
                              Verifying...
                            </>
                          ) : (
                            <>
                              <FiCheck />
                              Verify Code
                            </>
                          )}
                        </button>
                      </div>

                      {isCodeVerified && (
                        <div className="form-actions">
                          <button type="submit" className="btn-primary" disabled={isLoading}>
                            {isLoading ? (
                              <>
                                <div className="spinner"></div>
                                Updating Email...
                              </>
                            ) : (
                              <>
                                <FiMail />
                                Update Email Address
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </form>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="settings-section">
                <div className="section-header">
                  <h2>Appearance Settings</h2>
                  <p>Customize the look and feel of your application</p>
                </div>

                <div className="appearance-form">
                  <div className="form-group">
                    <div className="form-label-row">
                      <label htmlFor="fontSelect">
                        <FiType className="label-icon" />
                        Font Family
                      </label>
                      <button
                        type="button"
                        className="section-toggle-btn"
                        onClick={toggleFontSelector}
                      >
                        {isFontSelectorHidden ? (
                          <>
                            <FiEye />
                            Show fonts
                          </>
                        ) : (
                          <>
                            <FiEyeOff />
                            Hide fonts
                          </>
                        )}
                      </button>
                    </div>

                    {!isFontSelectorHidden && (
                      <>
                        <p className="form-description">
                          Choose a font that matches your preference. Changes apply immediately.
                        </p>
                        <div className="font-selector">
                          {availableFonts.map((font) => (
                            <div
                              key={font.name}
                              className={`font-option ${selectedFont === font.name ? 'selected' : ''}`}
                              onClick={() => {
                                setSelectedFont(font.name)
                                applyFont(font.name)
                                toast.success(`Font changed to ${font.displayName}`, { duration: 2000 })
                              }}
                            >
                              <div className="font-option-header">
                                <div 
                                  className="font-option-name"
                                  style={{ fontFamily: font.cssFamily }}
                                >
                                  {font.displayName}
                                </div>
                                {selectedFont === font.name && (
                                  <FiCheck className="font-check-icon" />
                                )}
                              </div>
                              <div 
                                className="font-preview"
                                style={{ fontFamily: font.cssFamily }}
                              >
                                The quick brown fox jumps over the lazy dog
                              </div>
                              <div 
                                className="font-description"
                                style={{ fontFamily: font.cssFamily }}
                              >
                                {font.description}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="section-break" />

                  <div className="form-group">
                    <label>
                      <FiSettings className="label-icon" />
                      Color Palette
                    </label>
                    <p className="form-description">
                      Choose a color scheme that matches your style. Changes apply immediately.
                    </p>
                    <div className="color-palette-selector">
                      {paletteLoading ? (
                        <div className="palette-loading-card">
                          <div className="spinner sm"></div>
                          <p>Loading palettes…</p>
                        </div>
                      ) : (
                        availablePalettes.map((palette) => (
                        <div
                          key={palette.id}
                          className={`color-palette-option ${selectedPalette === palette.id ? 'selected' : ''}`}
                            onClick={() => handlePaletteSelection(palette.id, palette.name)}
                        >
                          <div className="palette-preview">
                            {palette.preview.map((color, index) => (
                              <div
                                key={index}
                                className="palette-color-swatch"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          <div className="palette-info">
                              <div className="palette-header">
                            <div className="palette-name">{palette.name}</div>
                                {palette.type === 'custom' && <span className="palette-badge">Custom</span>}
                              </div>
                            <div className="palette-description">{palette.description}</div>
                          </div>
                          {selectedPalette === palette.id && (
                            <FiCheck className="palette-check-icon" />
                          )}
                            {palette.type === 'custom' && (
                              <div className="palette-actions" onClick={(event) => event.stopPropagation()}>
                                <button
                                  type="button"
                                  className="palette-action"
                                  onClick={() => handleEditPalette(palette)}
                                  aria-label={`Edit ${palette.name}`}
                                >
                                  <FiEdit3 />
                                </button>
                                <button
                                  type="button"
                                  className="palette-action danger"
                                  onClick={() => handleDeletePalette(palette)}
                                  aria-label={`Delete ${palette.name}`}
                                >
                                  <FiTrash2 />
                                </button>
                        </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="custom-palette-card">
                      <div className="custom-palette-header">
                        <h3>Build your own palette</h3>
                        <p>Pick two colors you love. We’ll generate matching shades for the entire dashboard.</p>
                      </div>

                      {editingPalette && (
                        <div className="editing-banner">
                          <FiEdit3 />
                          <span>Editing {editingPalette.name}</span>
                          <button type="button" onClick={cancelEditingPalette}>Cancel</button>
                        </div>
                      )}

                      <div className="custom-palette-grid">
                        <div className="color-picker-panel" onPointerDown={() => setColorFocus('primary')}>
                          <label>Primary color</label>
                          <HexColorPicker color={primaryColor} onChange={(value) => setPrimaryColor(normalizeHexValue(value))} />
                          <div className="hex-input-row">
                            <span>#</span>
                            <HexColorInput color={primaryColor} onChange={(value) => setPrimaryColor(normalizeHexValue(value))} prefixed />
                          </div>
                          <button
                            type="button"
                            className="btn-secondary small"
                            onClick={() => handleAddSavedColor(primaryColor)}
                            disabled={!isValidHexColor(primaryColor)}
                          >
                            Save color
                          </button>
                        </div>

                        <div className="color-picker-panel" onPointerDown={() => setColorFocus('accent')}>
                          <label>Accent color</label>
                          <HexColorPicker color={accentColor} onChange={(value) => setAccentColor(normalizeHexValue(value))} />
                          <div className="hex-input-row">
                            <span>#</span>
                            <HexColorInput color={accentColor} onChange={(value) => setAccentColor(normalizeHexValue(value))} prefixed />
                          </div>
                          <button
                            type="button"
                            className="btn-secondary small"
                            onClick={() => handleAddSavedColor(accentColor)}
                            disabled={!isValidHexColor(accentColor)}
                          >
                            Save color
                          </button>
                        </div>

                        <div className="saved-color-panel">
                          <div className="saved-header">
                            <span>Saved colors</span>
                          </div>
                          <div className="saved-color-grid">
                            {savedColors.map((color) => (
                              <button
                                key={color}
                                className="saved-color-swatch"
                                style={{ background: color }}
                                onClick={() => {
                                  if (colorFocus === 'primary') {
                                    setPrimaryColor(color)
                                  } else {
                                    setAccentColor(color)
                                  }
                                }}
                              />
                            ))}
                          </div>
                          <input
                            className="palette-name-input"
                            value={customPaletteName}
                            onChange={(e) => setCustomPaletteName(e.target.value)}
                            placeholder="Palette name (e.g. Sunrise Glow)"
                          />
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={handleSaveCustomPalette}
                            disabled={
                              paletteLoading ||
                              !customPaletteName.trim() ||
                              !isValidHexColor(primaryColor) ||
                              !isValidHexColor(accentColor)
                            }
                          >
                            {paletteLoading ? (
                              <>
                                <div className="spinner sm"></div>
                                Saving…
                              </>
                            ) : (
                              <>
                                <FiSave />
                                {editingPaletteId ? 'Update palette' : 'Save custom palette'}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Admin-only tabs */}
            {user?.role === 'admin' && (
              <>
                {activeTab === 'backups' && (
                  <BackupManagement key={activeTab} userRole={user.role} />
                )}

                {activeTab === 'audit-logs' && (
                  <AuditLogManagement userRole={user.role} />
                )}

                {activeTab === 'system' && (
                  <div className="settings-section">
                    <div className="section-header">
                      <h2>System Information</h2>
                      <p>View system status and configuration</p>
                    </div>

                    <div className="system-info">
                      <div className="info-card">
                        <h3>Security Features</h3>
                        <ul>
                          <li>✅ HTTPS/SSL Encryption</li>
                          <li>✅ Automated Database Backups</li>
                          <li>✅ Audit Trail Logging</li>
                          <li>✅ Role-Based Access Control</li>
                          <li>✅ User Authentication</li>
                        </ul>
                      </div>

                      <div className="info-card">
                        <h3>Backup Configuration</h3>
                        <p>Automated backups run daily at 2 AM</p>
                        <p>Old backups are cleaned up automatically based on retention policy</p>
                        <p>Backups are stored in: <code>server/backups/</code></p>
                      </div>

                      <div className="info-card">
                        <h3>Logging Configuration</h3>
                        <p>All user actions are logged for audit purposes</p>
                        <p>Security events are tracked and monitored</p>
                        <p>Logs are stored in: <code>server/logs/</code></p>
                        <p>Audit logs are stored in database and auto-deleted after 90 days</p>
                      </div>

                      <div className="info-card">
                        <h3>System Health</h3>
                        <p>✅ Database: Connected</p>
                        <p>✅ Authentication: Active</p>
                        <p>✅ Backups: Enabled</p>
                        <p>✅ Logging: Active</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </div>

        {palettePendingDelete && (
          <div className="delete-modal-overlay">
            <div className="delete-modal-card" role="dialog" aria-modal="true" aria-labelledby="deletePaletteTitle">
              <div className="delete-icon-circle">
                <FiAlertCircle size={28} />
              </div>
              <h3 id="deletePaletteTitle">Delete palette?</h3>
              <p>
                Are you sure you want to delete “{palettePendingDelete.name}”? This action cannot be undone.
              </p>
              <div className="delete-modal-actions">
                <button type="button" className="btn-secondary" onClick={cancelDeletePalette}>
                  Cancel
                </button>
                <button type="button" className="btn-primary danger" onClick={confirmDeletePalette}>
                  <FiTrash2 />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Settings
