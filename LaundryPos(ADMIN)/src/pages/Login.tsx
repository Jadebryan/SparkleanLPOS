import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useUser } from '../context/UserContext'
import LoadingSpinner from '../components/LoadingSpinner'
import BrandIcon from '../components/BrandIcon'
import TopLoadingBar from '../components/TopLoadingBar'
import GoogleReCAPTCHA from '../components/GoogleReCAPTCHA'
import ForgotPasswordModal from '../components/ForgotPasswordModal'
import ConfirmDialog from '../components/ConfirmDialog'
import './Login.css'


type UserType = 'Admin' | 'Staff'

const Login: React.FC = () => {
  const navigate = useNavigate()
  const { login, user } = useUser()
  
  // Ensure login page always loads fresh and redirect if already logged in
  React.useEffect(() => {
    // Clear any cached login page
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' })
    }
    
    // If user is already logged in, redirect to dashboard
    if (user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])
  
  // Load saved credentials if "Remember Me" was previously checked
  const loadSavedCredentials = () => {
    try {
      const saved = localStorage.getItem('rememberedCredentials')
      if (saved) {
        const credentials = JSON.parse(saved)
        return credentials
      }
    } catch (error) {
      console.error('Error loading saved credentials:', error)
    }
    return null
  }

  const savedCredentials = loadSavedCredentials()
  
  // Validate email if it's loaded from saved credentials
  const getInitialEmailValid = () => {
    if (savedCredentials?.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(savedCredentials.email)
    }
    return null
  }
  
  const [step, setStep] = useState<1 | 2>(1)
  const [userType, setUserType] = useState<UserType>('Admin')
  const [username, setUsername] = useState(savedCredentials?.username || '')
  const [email, setEmail] = useState(savedCredentials?.email || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(!!savedCredentials)
  const [isLoading, setIsLoading] = useState(false)
  const [emailValid, setEmailValid] = useState<boolean | null>(getInitialEmailValid())
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null)
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false)
  const [showRememberMeDialog, setShowRememberMeDialog] = useState(false)

  // reCAPTCHA handlers
  const handleRecaptchaVerify = (token: string | null) => {
    setRecaptchaToken(token)
    if (token) {
      toast.success('Security verification completed')
    }
  }

  const handleRecaptchaExpire = () => {
    setRecaptchaToken(null)
    toast.error('Security verification expired. Please verify again.')
  }

  const handleRecaptchaError = () => {
    setRecaptchaToken(null)
    toast.error('Security verification failed. Please try again.')
  }

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      toast.error('Please enter your email address')
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address')
      setEmailValid(false)
      return
    }
    setEmailValid(true)
    setStep(2)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!username || !password) {
      toast.error('Please fill in all fields')
      return
    }

    if (!recaptchaToken) {
      toast.error('Please complete the security verification')
      return
    }

    setIsLoading(true)
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          username: username,
          password: password,
          recaptchaToken: recaptchaToken,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Login failed')
      }

      // Store token and user data
      const role = data.data.role as 'admin' | 'staff'
      
      // Verify token exists before proceeding
      if (!data.data.token) {
        throw new Error('No token received from server')
      }
      
      // Handle "Remember Me" functionality
      if (rememberMe) {
        // Save credentials for next time
        localStorage.setItem('rememberedCredentials', JSON.stringify({
          username: username,
          email: email
        }))
      } else {
        // Remove saved credentials if "Remember Me" is unchecked
        localStorage.removeItem('rememberedCredentials')
      }

      // Update user context first (this also saves to localStorage)
      login(data.data.username, data.data.email, role, data.data.fullName, data.data.token, data.data.id)
      
      // Wait a moment for localStorage to be updated
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Verify token was saved
      const savedUser = localStorage.getItem('user')
      if (!savedUser || !JSON.parse(savedUser).token) {
        throw new Error('Failed to save authentication token')
      }
      
      toast.success(`Welcome back, ${data.data.username}!`)
      navigate('/dashboard')
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed. Please try again.'
      toast.error(errorMessage)
      console.error('Login error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    setStep(1)
  }

  const handleRememberMeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked
    
    // If unchecking, just uncheck it
    if (!newValue) {
      setRememberMe(false)
      return
    }
    
    // If checking, show confirmation dialog
    setShowRememberMeDialog(true)
  }

  const handleRememberMeConfirm = () => {
    setRememberMe(true)
    setShowRememberMeDialog(false)
    toast.success('Remember Me enabled. Your email and username will be saved for next time.')
  }

  const handleRememberMeCancel = () => {
    setShowRememberMeDialog(false)
    // Keep checkbox unchecked
  }

  return (
    <div className="login-page">
      <TopLoadingBar active={isLoading} />
      {/* Animated Background */}
      <div className="login-bg">
        <div className="bg-circle bg-circle-1"></div>
        <div className="bg-circle bg-circle-2"></div>
        <div className="bg-circle bg-circle-3"></div>
      </div>

      <motion.div 
        className="login-container"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div 
          className="logo"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <span className="logo-icon"><BrandIcon size={60} /></span>
          Sparklean Laundry Shop
        </motion.div>
        
        <motion.div 
          className="subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Point of Sale & Management System
        </motion.div>
        
        {/* Step 1: User Type & Email */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div 
              className="user-type-selector"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <button
                type="button"
                className={`user-type-btn ${userType === 'Admin' ? 'active' : ''}`}
                onClick={() => setUserType('Admin')}
              >
                Admin
              </button>
            </motion.div>

            <form onSubmit={handleStep1} aria-live="polite">
              <div className="form-group">
                <label htmlFor="email">
                  <FiMail className="label-icon" />
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (emailValid !== null) {
                      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value)
                      setEmailValid(ok)
                    }
                  }}
                  autoFocus
                  aria-invalid={emailValid === false}
                />
              </div>

              <motion.button 
                type="submit" 
                className="login-btn"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                aria-busy={isLoading}
              >
                Continue
              </motion.button>

              <div className="step-footer">
                <button 
                  type="button"
                  className="forgot-password"
                  onClick={() => setShowForgotPasswordModal(true)}
                >
                  Forgot Password?
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Step 2: Username & Password */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="step-info">
              <p className="email-display">{email}</p>
              <button className="change-email" onClick={handleBack}>Change</button>
            </div>

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="username">
                  <FiUser className="label-icon" />
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="password">
                  <FiLock className="label-icon" />
                  Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="remember-me">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={handleRememberMeChange}
                  />
                  <span>Remember me</span>
                </label>
                <button 
                  type="button"
                  className="back-btn"
                  onClick={handleBack}
                >
                  ← Back
                </button>
              </div>

              {/* reCAPTCHA Component */}
              <GoogleReCAPTCHA
                onVerify={handleRecaptchaVerify}
                onExpire={handleRecaptchaExpire}
                onError={handleRecaptchaError}
                action="login"
                className="login-recaptcha"
              />
              
              <motion.button 
                type="submit" 
                className={`login-btn ${isLoading ? 'btn-loading' : ''}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading || !recaptchaToken}
              >
                {isLoading ? <LoadingSpinner size="small" /> : 'Login'}
              </motion.button>
            </form>
          </motion.div>
        )}

        <motion.div 
          className="login-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <p>Need access? <a href="#">Contact your administrator</a></p>
        </motion.div>
        <div className="version-badge">v1.0.0</div>
      </motion.div>

      <ForgotPasswordModal 
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
      />

      <ConfirmDialog
        isOpen={showRememberMeDialog}
        title="Enable Remember Me?"
        message="This will save your email and username on this device so you don't have to enter them next time. Your password will never be saved."
        confirmLabel="Yes, Remember Me"
        cancelLabel="Cancel"
        type="info"
        onConfirm={handleRememberMeConfirm}
        onCancel={handleRememberMeCancel}
      />
    </div>
  )
}

export default Login
