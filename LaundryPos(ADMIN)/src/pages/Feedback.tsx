import React, { useState } from 'react'
import { FiMessageCircle } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { supportAPI } from '../utils/api'
import './Feedback.css'

const DEVELOPER_EMAIL = 'bryanjadesalahag@gmail.com'
const DEVELOPER_PHONE = '09750543087'

const Feedback: React.FC = () => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [feedbackType, setFeedbackType] = useState('feature')
  const [isLoading, setIsLoading] = useState(false)

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setContactEmail('')
    setContactPhone('')
    setFeedbackType('feature')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title || !description) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsLoading(true)
    
    try {
      console.log('Submitting feedback:', { title, feedbackType, description: description.substring(0, 50) + '...' })
      
      const result = await supportAPI.submitFeedback({
        title,
        description,
        feedbackType,
        reporterEmail: contactEmail || undefined,
        reporterPhone: contactPhone || undefined,
        recipientEmail: DEVELOPER_EMAIL,
        recipientPhone: DEVELOPER_PHONE,
        submittedAt: new Date().toISOString(),
      })
      
      console.log('Feedback API response:', result)
      
      if (result && result.success !== false) {
        toast.success(result.message || 'Feature request sent successfully! The development team will review your request.')
        resetForm()
      } else {
        throw new Error(result?.message || 'Failed to send feedback')
      }
    } catch (error: any) {
      console.error('Feedback API failed:', error)
      console.error('Error details:', {
        message: error?.message,
        status: error?.status,
        data: error?.data,
        stack: error?.stack
      })
      
      let errorMessage = 'Failed to send feedback. '
      
      // Check for network errors
      if (error?.message?.includes('Network error') || error?.message?.includes('Failed to fetch') || error?.message?.includes('fetch')) {
        errorMessage = 'Network error: Cannot connect to server. Please make sure the server is running on http://localhost:5000'
      } else if (error?.message) {
        errorMessage = error.message
      } else if (error?.data?.message) {
        errorMessage = error.data.message
      } else if (error?.toString) {
        errorMessage = error.toString()
      } else {
        errorMessage += 'Please check your server connection or contact the developer directly.'
      }
      
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="feedback-page">
      <div className="feedback-header">
        <div className="feedback-title">
          <FiMessageCircle className="feedback-icon" />
          <h1>Feature Request & Feedback</h1>
        </div>
        <p className="feedback-subtitle">
          Request new features, report bugs, or suggest improvements. Your feedback will be sent directly to the development team for review.
        </p>
      </div>

      <div className="feedback-content">
        <form onSubmit={handleSubmit} className="feedback-form">
          <div className="form-section">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of your feedback"
              required
            />
          </div>

          <div className="form-grid-two">
            <div className="form-section">
              <label htmlFor="contactEmail">Your Email (optional)</label>
              <input
                type="email"
                id="contactEmail"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            <div className="form-section">
              <label htmlFor="contactPhone">Phone (optional)</label>
              <input
                type="tel"
                id="contactPhone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+63 9XX XXX XXXX"
              />
            </div>
          </div>

          <div className="form-section">
            <label htmlFor="feedbackType">Request Type *</label>
            <select
              id="feedbackType"
              value={feedbackType}
              onChange={(e) => setFeedbackType(e.target.value)}
              required
            >
              <option value="feature">Feature Request</option>
              <option value="bug">Bug Report</option>
              <option value="improvement">Improvement Suggestion</option>
              <option value="urgent">Urgent Request</option>
            </select>
            <small style={{ display: 'block', marginTop: '4px', color: 'var(--color-gray-500)', fontSize: '12px' }}>
              Select the type of request you're making to the development team
            </small>
          </div>

          <div className="form-section">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide detailed information about your feature request, bug report, or improvement suggestion. Include any relevant details, use cases, or examples that would help the development team understand your request..."
              rows={8}
              required
            />
            <small style={{ display: 'block', marginTop: '4px', color: 'var(--color-gray-500)', fontSize: '12px' }}>
              Be as detailed as possible. The more information you provide, the better the development team can understand and implement your request.
            </small>
          </div>


          <div className="form-actions">
            <button 
              type="submit" 
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Submitting...' : 'Send to Development Team'}
            </button>
          </div>
        </form>

        <div className="feedback-sidebar">
          <div className="contact-card">
            <h3>Development Team Contact</h3>
            <p>Your feedback will be sent directly to the development team. For urgent matters, you can also contact them directly:</p>
            
            <div className="contact-methods">
              <div className="contact-method">
                <strong>Developer Email</strong>
                <a href={`mailto:${DEVELOPER_EMAIL}`}>{DEVELOPER_EMAIL}</a>
              </div>
              <div className="contact-method">
                <strong>Developer Phone</strong>
                <a href={`tel:${DEVELOPER_PHONE}`}>{DEVELOPER_PHONE}</a>
              </div>
              <div className="contact-method">
                <strong>Response Time</strong>
                <span>Typically within 1-3 business days</span>
              </div>
            </div>
          </div>

          <div className="contact-card" style={{ marginTop: '24px' }}>
            <h3>What Happens Next?</h3>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: 'var(--color-gray-600)', lineHeight: '1.6' }}>
              <li style={{ marginBottom: '8px' }}>Your request is sent to the development team</li>
              <li style={{ marginBottom: '8px' }}>The team reviews and prioritizes your request</li>
              <li style={{ marginBottom: '8px' }}>You'll be contacted if additional information is needed</li>
              <li>Feature requests are added to the development roadmap</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Feedback
