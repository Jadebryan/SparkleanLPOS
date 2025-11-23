import React from 'react'

interface AccessInfoModalProps {
  isOpen: boolean
  onClose: () => void
}

const AccessInfoModal: React.FC<AccessInfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-small" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Request Admin Access</h3>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p>If you need an admin account, please contact:</p>
          <ul>
            <li>Email: sparklean@example.com</li>
            <li>Phone: +63 912 345 6789</li>
            <li>Facebook: fb.com/SparkleanLaundryShop</li>
          </ul>
          <p>Your request should include your full name and role.</p>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

export default AccessInfoModal


