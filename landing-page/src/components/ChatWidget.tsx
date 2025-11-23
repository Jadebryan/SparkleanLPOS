import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiMessageCircle, FiX, FiExternalLink, FiMapPin, FiLoader, FiArrowLeft, FiPhone } from 'react-icons/fi'
import BrandIcon from './BrandIcon'
import { stationAPI, Station } from '../utils/api'
import './ChatWidget.css'

// Helper function to get Facebook Page ID by branch name (partial match)
const getFacebookPageIdByBranchName = (branchName: string): string | null => {
  const nameLower = branchName.toLowerCase()
  
  // Match by branch name keywords
  // Sparklean Laundry Shop Butuan/Ampayon
  if (nameLower.includes('butuan') || nameLower.includes('ampayon')) {
    return '110110378534866'
  }
  // Sparklean Laundry Shop Buenavista
  if (nameLower.includes('buenavista')) {
    return '326250760552042'
  }
  // Sparklean Laundry Shop Cabadbaran/CBR2
  if (nameLower.includes('cabadbaran') || nameLower.includes('cbr2')) {
    return '104895775723345'
  }
  // Sparklean Laundry Shop Baan
  if (nameLower.includes('baan')) {
    return '101851219659256'
  }
  
  return null
}

interface Branch {
  id: string
  name: string
  address: string
  phone?: string
}

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [isLoadingBranches, setIsLoadingBranches] = useState(false)
  const [showBranchSelection, setShowBranchSelection] = useState(true)

  useEffect(() => {
    if (isOpen && branches.length === 0 && !isLoadingBranches) {
      fetchBranches()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const fetchBranches = async () => {
    setIsLoadingBranches(true)
    try {
      const stations = await stationAPI.getAll({ showArchived: false })
      const mappedBranches: Branch[] = stations
        .filter((station: Station) => station.address && station.address.trim() !== '')
        .map((station: Station) => ({
          id: station.stationId,
          name: station.name,
          address: station.address || '',
          phone: station.phone
        }))
      setBranches(mappedBranches)
    } catch (error) {
      console.error('[ChatWidget] Failed to load branches:', error)
      // If API fails, use empty array - will show default option
      setBranches([])
    } finally {
      setIsLoadingBranches(false)
    }
  }

  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranch(branch)
    setShowBranchSelection(false)
  }

  const handleBackToBranches = () => {
    setSelectedBranch(null)
    setShowBranchSelection(true)
  }

  const getBranchFacebookPageId = (branch: Branch | null): string | null => {
    if (!branch) return null
    
    // Get Facebook Page ID by matching branch name
    return getFacebookPageIdByBranchName(branch.name)
  }

  const handleChatClick = () => {
    // Get Facebook Page ID for selected branch
    const facebookPageId = getBranchFacebookPageId(selectedBranch)
    
    if (facebookPageId) {
    // Redirect to Facebook Messenger
      const messengerUrl = `https://m.me/${facebookPageId}`
    window.open(messengerUrl, '_blank')
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setSelectedBranch(null)
    setShowBranchSelection(true)
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
                  <h3>
                    {selectedBranch ? selectedBranch.name : 'Sparklean Support'}
                  </h3>
                  <p>
                    {selectedBranch 
                      ? `Chat with ${selectedBranch.name} on Messenger`
                      : 'Chat with us on Messenger'
                    }
                  </p>
                </div>
              </div>
              <div className="chat-header-actions">
                {selectedBranch && (
                  <button
                    className="chat-header-btn"
                    onClick={handleBackToBranches}
                    aria-label="Back to branches"
                    title="Back to branches"
                  >
                    <FiArrowLeft />
                  </button>
                )}
                <button
                  className="chat-header-btn"
                  onClick={handleClose}
                  aria-label="Close chat"
                >
                  <FiX />
                </button>
              </div>
            </div>

            {/* Chat Content */}
            <div className="chat-content">
              {showBranchSelection ? (
                <>
              <div className="chat-greeting">
                    <p>Select a branch to message:</p>
              </div>
              
                  {isLoadingBranches ? (
                    <div className="chat-branches-loading">
                      <FiLoader className="loading-spinner" />
                      <p>Loading branches...</p>
                    </div>
                  ) : branches.length > 0 ? (
                    <div className="chat-branches-list">
                      {branches.map((branch) => {
                        const hasMessenger = getBranchFacebookPageId(branch) !== null
                        return (
                          <button
                            key={branch.id}
                            className="chat-branch-item"
                            onClick={() => handleBranchSelect(branch)}
                          >
                            <div className="chat-branch-icon">
                              <FiMapPin />
                            </div>
                            <div className="chat-branch-info">
                              <div className="chat-branch-header">
                                <div className="chat-branch-name">{branch.name}</div>
                                {!hasMessenger && (
                                  <span className="chat-branch-badge coming-soon">Coming Soon</span>
                                )}
                                {hasMessenger && (
                                  <span className="chat-branch-badge available">Available</span>
                                )}
                              </div>
                              <div className="chat-branch-address">{branch.address}</div>
                              {branch.phone && (
                                <div className="chat-branch-phone">{branch.phone}</div>
                              )}
                            </div>
                            <FiExternalLink className="chat-branch-arrow" />
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="chat-no-branches">
                      <p>No branches available at the moment.</p>
              <button
                className="chat-messenger-btn"
                onClick={handleChatClick}
              >
                <FiMessageCircle />
                <span>Chat with us on Messenger</span>
                <FiExternalLink />
              </button>
                    </div>
                  )}
                </>
              ) : selectedBranch ? (
                <>
                  <div className="chat-greeting">
                    <p>Hi! How can we help you?</p>
                    <div className="chat-selected-branch">
                      <FiMapPin />
                      <span>{selectedBranch.name}</span>
                    </div>
                  </div>
                  
                  {getBranchFacebookPageId(selectedBranch) ? (
                    <button
                      className="chat-messenger-btn"
                      onClick={handleChatClick}
                    >
                      <FiMessageCircle />
                      <span>Chat with {selectedBranch.name} on Messenger</span>
                      <FiExternalLink />
                    </button>
                  ) : (
                    <div className="chat-coming-soon">
                      <div className="chat-coming-soon-icon">
                        <FiMessageCircle />
                      </div>
                      <h4>Messenger Coming Soon</h4>
                      <p>We're setting up Messenger for {selectedBranch.name}. Please check back soon!</p>
                      {selectedBranch.phone && (
                        <div className="chat-coming-soon-contact">
                          <p>Or contact us directly:</p>
                          <a href={`tel:${selectedBranch.phone}`} className="chat-phone-link">
                            <FiPhone />
                            <span>{selectedBranch.phone}</span>
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default ChatWidget

