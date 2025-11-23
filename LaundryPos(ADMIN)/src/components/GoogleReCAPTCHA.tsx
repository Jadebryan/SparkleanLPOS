import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import './ReCAPTCHA.css'

interface GoogleReCAPTCHAProps {
  onVerify: (token: string | null) => void
  onExpire?: () => void
  onError?: () => void
  action?: string
  className?: string
}

// Declare grecaptcha global
declare global {
  interface Window {
    grecaptcha: any
  }
}

const GoogleReCAPTCHA: React.FC<GoogleReCAPTCHAProps> = ({
  onVerify,
  onExpire,
  onError,
  action: _action = 'submit',
  className = ''
}) => {
  const { theme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<number | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFallback, setShowFallback] = useState(false)
  const [isFallbackChecked, setIsFallbackChecked] = useState(false)

  // reCAPTCHA Site Key - Using Google's test key
  const RECAPTCHA_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'

  useEffect(() => {
    let attempts = 0
    const maxAttempts = 20
    let mounted = true
    let timeoutId: NodeJS.Timeout

    const renderRecaptcha = () => {
      if (!mounted || !containerRef.current) return

      attempts++

      // Check if grecaptcha is available
      if (window.grecaptcha && window.grecaptcha.render && !widgetIdRef.current) {
        try {
          // Clear the container first
          if (containerRef.current) {
            containerRef.current.innerHTML = ''
          }

          // Render the reCAPTCHA
          const widgetId = window.grecaptcha.render(containerRef.current, {
            sitekey: RECAPTCHA_SITE_KEY,
            theme: 'light',
            callback: (token: string) => {
              console.log('reCAPTCHA verified:', token)
              onVerify(token)
            },
            'expired-callback': () => {
              console.log('reCAPTCHA expired')
              onExpire?.()
              onVerify(null)
            },
            'error-callback': () => {
              console.log('reCAPTCHA error')
              setError('reCAPTCHA error occurred')
              onError?.()
            }
          })

          widgetIdRef.current = widgetId
          setIsLoaded(true)
          console.log('reCAPTCHA rendered successfully, widget ID:', widgetId)
        } catch (err) {
          console.error('Error rendering reCAPTCHA:', err)
          if (attempts < maxAttempts) {
            timeoutId = setTimeout(renderRecaptcha, 300)
          } else {
            setError('Failed to load reCAPTCHA')
          }
        }
      } else if (attempts < maxAttempts) {
        // Keep trying
        timeoutId = setTimeout(renderRecaptcha, 300)
      } else {
        setError('reCAPTCHA script not loaded')
      }
    }

    // Load the script if not already loaded
    const ensureScript = () => {
      if (window.grecaptcha) return true
      const existing = document.querySelector('script[src^="https://www.google.com/recaptcha/api.js"]') as HTMLScriptElement | null
      if (existing) return false
      const script = document.createElement('script')
      script.async = true
      script.defer = true
      script.src = 'https://www.google.com/recaptcha/api.js'
      document.head.appendChild(script)
      return false
    }

    ensureScript()

    // Start rendering after a short delay
    timeoutId = setTimeout(renderRecaptcha, 1000)

    // Add a maximum timeout of 5 seconds, then show fallback
    const maxTimeout = setTimeout(() => {
      if (!isLoaded && mounted) {
        console.log('reCAPTCHA timeout - showing fallback')
        setShowFallback(true)
        setIsLoaded(true)
      }
    }, 5000)

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      clearTimeout(maxTimeout)
      
      // Reset reCAPTCHA on unmount
      if (widgetIdRef.current !== null && window.grecaptcha && window.grecaptcha.reset) {
        try {
          window.grecaptcha.reset(widgetIdRef.current)
        } catch (err) {
          console.error('Error resetting reCAPTCHA:', err)
        }
      }
    }
  }, [theme, onVerify, onExpire, onError, isLoaded])

  const handleFallbackCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked
    setIsFallbackChecked(checked)
    
    if (checked) {
      onVerify('fallback-token-' + Date.now())
    } else {
      onVerify(null)
    }
  }

  if (error) {
    return (
      <div className={`recaptcha-error ${className}`}>
        <div className="error-icon">⚠️</div>
        <span>{error}</span>
        <button 
          type="button" 
          className="retry-btn"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className={`recaptcha-loading ${className}`}>
        <div className="loading-spinner"></div>
        <span>Loading reCAPTCHA...</span>
      </div>
    )
  }

  if (showFallback) {
    return (
      <div className={`recaptcha-container fallback-recaptcha ${className}`} data-theme={theme}>
        <div className="fallback-checkbox">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isFallbackChecked}
              onChange={handleFallbackCheck}
              className="checkbox-input"
            />
            <span className="checkbox-custom">
              {isFallbackChecked && <span className="checkmark">✓</span>}
            </span>
            <span className="checkbox-text">I'm not a robot</span>
          </label>
          <div className="recaptcha-footer">
            <span className="recaptcha-brand">reCAPTCHA</span>
            <span className="recaptcha-links">
              <a href="#" className="recaptcha-link">Privacy</a>
              <span className="separator">-</span>
              <a href="#" className="recaptcha-link">Terms</a>
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`recaptcha-container ${className}`} data-theme={theme}>
      <div ref={containerRef} className="recaptcha-widget"></div>
    </div>
  )
}

export default GoogleReCAPTCHA
