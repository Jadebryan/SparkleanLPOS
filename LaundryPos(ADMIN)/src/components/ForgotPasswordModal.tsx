import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiMail, FiX, FiLock, FiEye, FiEyeOff, FiCheck, FiZap } from 'react-icons/fi'
import toast from 'react-hot-toast'
import Button from './Button'
import LoadingSpinner from './LoadingSpinner'
import { authAPI } from '../utils/api'
import { checkPasswordStrength, generateStrongPassword, PasswordStrength } from '../utils/passwordStrength'
import './ForgotPasswordModal.css'

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
}

type Step = 'email' | 'code' | 'password'

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCodeVerified, setIsCodeVerified] = useState(false)

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      toast.error('Please enter your email address')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address')
      return
    }

    setIsLoading(true)

    try {
      const response = await authAPI.forgotPassword({ email })
      
      if (response.success) {
        setStep('code')
        toast.success(response.message || 'Password reset code sent to your email!')
      } else {
        toast.error(response.message || 'Failed to send reset code')
      }
    } catch (error: any) {
      console.error('Forgot password error:', error)
      toast.error(error.message || 'Failed to send reset code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!code) {
      toast.error('Please enter the reset code')
      return
    }

    if (code.length !== 6) {
      toast.error('Please enter a valid 6-digit code')
      return
    }

    setIsLoading(true)

    try {
      const response = await authAPI.verifyResetCode({ email, code })
      
      if (response.success) {
        setIsCodeVerified(true)
        setStep('password')
        toast.success('Code verified! Please set your new password.')
      } else {
        toast.error(response.message || 'Invalid reset code')
      }
    } catch (error: any) {
      console.error('Verify code error:', error)
      toast.error(error.message || 'Invalid reset code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Check password strength
  const passwordStrength = useMemo(() => {
    if (!newPassword) return null
    return checkPasswordStrength(newPassword)
  }, [newPassword])

  const handleSuggestPassword = () => {
    const suggested = generateStrongPassword(16)
    setNewPassword(suggested)
    setConfirmPassword(suggested)
    toast.success('Strong password generated!')
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields')
      return
    }

    if (!passwordStrength || !passwordStrength.isValid) {
      toast.error(passwordStrength?.feedback[0] || 'Password does not meet security requirements')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      const response = await authAPI.resetPassword({ email, code, newPassword })
      
      if (response.success) {
        toast.success('Password reset successfully! You can now log in.')
        setTimeout(() => {
          handleClose()
        }, 1500)
      } else {
        toast.error(response.message || 'Failed to reset password')
      }
    } catch (error: any) {
      console.error('Reset password error:', error)
      toast.error(error.message || 'Failed to reset password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setStep('email')
    setEmail('')
    setCode('')
    setNewPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setShowConfirmPassword(false)
    setIsCodeVerified(false)
    setIsLoading(false)
    onClose()
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(value)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="forgot-password-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="forgot-password-modal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close-btn" onClick={handleClose}>
              <FiX />
            </button>

            {/* Step 1: Enter Email */}
            {step === 'email' && (
              <motion.div
                key="email-step"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="modal-icon">🔐</div>
                <h3 className="modal-title">Forgot Password?</h3>
                <p className="modal-description">
                  Enter your email address and we'll send you a verification code to reset your password.
                </p>

                <form onSubmit={handleEmailSubmit}>
                  <div className="form-group">
                    <label htmlFor="reset-email">
                      <FiMail className="label-icon" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="reset-email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className={`submit-btn ${isLoading ? 'btn-loading' : ''}`}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <LoadingSpinner size="small" />
                        <span>Sending Code...</span>
                      </>
                    ) : (
                      <>
                        <FiMail />
                        <span>Send Reset Code</span>
                      </>
                    )}
                  </Button>
                </form>
              </motion.div>
            )}

            {/* Step 2: Enter Code */}
            {step === 'code' && (
              <motion.div
                key="code-step"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="modal-icon">📧</div>
                <h3 className="modal-title">Enter Verification Code</h3>
                <p className="modal-description">
                  We sent a 6-digit code to <strong>{email}</strong>. Please enter it below.
                </p>

                <form onSubmit={handleCodeSubmit}>
                  <div className="form-group">
                    <label htmlFor="reset-code">
                      <FiCheck className="label-icon" />
                      Verification Code
                    </label>
                    <input
                      type="text"
                      id="reset-code"
                      placeholder="000000"
                      value={code}
                      onChange={handleCodeChange}
                      disabled={isLoading}
                      autoFocus
                      maxLength={6}
                      style={{
                        textAlign: 'center',
                        fontSize: '24px',
                        letterSpacing: '8px',
                        fontFamily: 'monospace',
                        fontWeight: 'bold'
                      }}
                    />
                    <p style={{ fontSize: '12px', color: '#666', marginTop: '8px', textAlign: 'center' }}>
                      Code expires in 10 minutes
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Button 
                      type="button"
                      onClick={() => {
                        setStep('email')
                        setCode('')
                      }}
                      className="submit-btn"
                      style={{ flex: 1, background: '#6b7280' }}
                    >
                      Back
                    </Button>
                    <Button 
                      type="submit" 
                      className={`submit-btn ${isLoading ? 'btn-loading' : ''}`}
                      disabled={isLoading || code.length !== 6}
                      style={{ flex: 1 }}
                    >
                      {isLoading ? (
                        <>
                          <LoadingSpinner size="small" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <FiCheck />
                          <span>Verify Code</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Step 3: Enter New Password */}
            {step === 'password' && (
              <motion.div
                key="password-step"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="modal-icon success">✅</div>
                <h3 className="modal-title">Set New Password</h3>
                <p className="modal-description">
                  Code verified! Please enter your new password below.
                </p>

                <form onSubmit={handlePasswordSubmit}>
                  <div className="form-group">
                    <label htmlFor="new-password" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FiLock className="label-icon" />
                        New Password
                      </span>
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
                      >
                        <FiZap size={12} />
                        Suggest
                      </button>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="new-password"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={isLoading}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#6b7280',
                          padding: '4px'
                        }}
                      >
                        {showPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                    {passwordStrength && (
                      <div className="password-strength-container" style={{ marginTop: '8px' }}>
                        <div className="password-strength-bar">
                          <div 
                            className="password-strength-fill"
                            style={{
                              width: `${passwordStrength.score}%`,
                              backgroundColor: getStrengthColor(passwordStrength.strength),
                              height: '4px',
                              borderRadius: '2px',
                              transition: 'all 0.3s ease'
                            }}
                          />
                        </div>
                        <div className="password-strength-info" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                          <span 
                            style={{ 
                              fontSize: '11px', 
                              fontWeight: '700',
                              color: getStrengthColor(passwordStrength.strength)
                            }}
                          >
                            {passwordStrength.strength.toUpperCase()}
                          </span>
                          {passwordStrength.feedback.length > 0 && (
                            <span style={{ fontSize: '11px', color: '#6b7280', flex: 1 }}>
                              {passwordStrength.feedback[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirm-password">
                      <FiLock className="label-icon" />
                      Confirm Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirm-password"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#6b7280',
                          padding: '4px'
                        }}
                      >
                        {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Button 
                      type="button"
                      onClick={() => {
                        setStep('code')
                        setNewPassword('')
                        setConfirmPassword('')
                      }}
                      className="submit-btn"
                      style={{ flex: 1, background: '#6b7280' }}
                    >
                      Back
                    </Button>
                    <Button 
                      type="submit" 
                      className={`submit-btn ${isLoading ? 'btn-loading' : ''}`}
                      disabled={isLoading || !newPassword || !confirmPassword || !passwordStrength?.isValid}
                      style={{ flex: 1 }}
                    >
                      {isLoading ? (
                        <>
                          <LoadingSpinner size="small" />
                          <span>Resetting...</span>
                        </>
                      ) : (
                        <>
                          <FiLock />
                          <span>Reset Password</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const getStrengthColor = (strength: PasswordStrength | null): string => {
  if (!strength) return '#E5E7EB'
  switch (strength) {
    case 'weak': return '#EF4444'
    case 'fair': return '#F59E0B'
    case 'good': return '#3B82F6'
    case 'strong': return '#10B981'
    default: return '#E5E7EB'
  }
}

export default ForgotPasswordModal
