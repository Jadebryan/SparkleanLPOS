import React, { useState } from 'react'
import { FiMessageCircle } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { supportAPI } from '../utils/api'
import './Feedback.css'

const SUPPORT_EMAIL = 'bryanjadesalahag@gmail.com'
const SUPPORT_PHONE = '09750543087'

const Feedback: React.FC = () => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [feedbackType, setFeedbackType] = useState('general')
  const [isLoading, setIsLoading] = useState(false)

  const draftSupportEmail = () => {
    const lines = [
      `Feedback Type: ${feedbackType}`,
      `Title: ${title}`,
      '',
      description,
      '',
      `Reporter Email: ${contactEmail || 'Not provided'}`,
      `Reporter Phone: ${contactPhone || 'Not provided'}`,
      `Submitted: ${new Date().toLocaleString()}`,
    ]

    const mailtoSubject = encodeURIComponent(`Sparklean Feedback: ${title}`)
    const mailtoBody = encodeURIComponent(lines.join('\n'))
    const mailtoLink = `mailto:${SUPPORT_EMAIL}?subject=${mailtoSubject}&body=${mailtoBody}`

    const newWindow = window.open(mailtoLink, '_blank')
    if (!newWindow) {
      window.location.href = mailtoLink
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setContactEmail('')
    setContactPhone('')
    setFeedbackType('general')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title || !description) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsLoading(true)
    
    try {
      await supportAPI.submitFeedback({
        title,
        description,
        feedbackType,
        reporterEmail: contactEmail || undefined,
        reporterPhone: contactPhone || undefined,
        recipientEmail: SUPPORT_EMAIL,
        recipientPhone: SUPPORT_PHONE,
        submittedAt: new Date().toISOString(),
      })
      
      toast.success('Feedback submitted successfully! Our support team will reach out if needed.')
      resetForm()
    } catch (error) {
      console.error('support feedback failed, falling back to email:', error)
      draftSupportEmail()
      toast.loading('Opening your email client. Please send the drafted message to complete the submission.')
      resetForm()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="feedback-page">
      <div className="feedback-header">
        <div className="feedback-title">
          <FiMessageCircle className="feedback-icon" />
          <h1>Feedback & Support</h1>
        </div>
        <p className="feedback-subtitle">
          Help us improve Sparklean Laundry POS by sharing your thoughts, reporting issues, or suggesting new features
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
            <label htmlFor="feedbackType">Feedback Type</label>
            <select
              id="feedbackType"
              value={feedbackType}
              onChange={(e) => setFeedbackType(e.target.value)}
            >
              <option value="general">General Feedback</option>
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
              <option value="urgent">Urgent Support</option>
            </select>
          </div>

          <div className="form-section">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide detailed information about your feedback..."
              rows={6}
              required
            />
          </div>


          <div className="form-actions">
            <button 
              type="submit" 
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>

        <div className="feedback-sidebar">
          <div className="contact-card">
            <h3>Need Immediate Help?</h3>
            <p>For urgent issues, contact our support team directly:</p>
            
            <div className="contact-methods">
              <div className="contact-method">
              <strong>Email Support</strong>
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
              </div>
              <div className="contact-method">
                <strong>Phone Support</strong>
              <a href={`tel:${SUPPORT_PHONE}`}>{SUPPORT_PHONE}</a>
              </div>
              <div className="contact-method">
                <strong>Support Hours</strong>
                <span>Mon-Fri 8AM-6PM</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Feedback
