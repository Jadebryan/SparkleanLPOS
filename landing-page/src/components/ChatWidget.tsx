import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiMessageCircle, FiX, FiExternalLink } from 'react-icons/fi'
import BrandIcon from './BrandIcon'
import './ChatWidget.css'

// Facebook Page ID
const FACEBOOK_PAGE_ID = '116793284717965'

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false)

  const handleChatClick = () => {
    // Redirect to Facebook Messenger
    const messengerUrl = `https://m.me/${FACEBOOK_PAGE_ID}`
    window.open(messengerUrl, '_blank')
  }

  return (
    <>
      {/* Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            className="chat-button"
            onClick={() => setIsOpen(true)}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Open chat"
          >
            <FiMessageCircle />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Popup Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="chat-window"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Chat Header */}
            <div className="chat-header">
              <div className="chat-header-info">
                <div className="chat-avatar">
                  <BrandIcon size={32} />
                </div>
                <div>
                  <h3>Sparklean Support</h3>
                  <p>Chat with us on Messenger</p>
                </div>
              </div>
              <div className="chat-header-actions">
                <button
                  className="chat-header-btn"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close chat"
                >
                  <FiX />
                </button>
              </div>
            </div>

            {/* Chat Content */}
            <div className="chat-content">
              <div className="chat-greeting">
                <p>Hi! How can we help you?</p>
              </div>
              
              <button
                className="chat-messenger-btn"
                onClick={handleChatClick}
              >
                <FiMessageCircle />
                <span>Chat with us on Messenger</span>
                <FiExternalLink />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default ChatWidget

