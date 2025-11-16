import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiMapPin, FiPhone, FiExternalLink, FiLoader } from 'react-icons/fi'
import { stationAPI, Station } from '../utils/api'
import './Branches.css'

interface Branch {
  id: string
  name: string
  address: string
  phone: string
}

const Branches = () => {
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBranches = async () => {
      setIsLoading(true)
      setError(null)
      try {
        console.log('[Branches] Fetching branches...')
        const stations = await stationAPI.getAll({ showArchived: false })
        console.log('[Branches] Received stations:', stations)
        
        // Map stations to branch format
        const mappedBranches: Branch[] = stations.map((station: Station) => ({
          id: station.stationId,
          name: station.name,
          address: station.address || '',
          phone: station.phone || 'Contact us for details'
        }))
        
        console.log('[Branches] Mapped branches:', mappedBranches)
        
        if (mappedBranches.length === 0) {
          console.warn('[Branches] No branches found. Check if stations exist and have addresses.')
          setError('No branch locations found. Please ensure stations are configured with addresses in the admin panel.')
        } else {
          setBranches(mappedBranches)
        }
      } catch (err: any) {
        console.error('[Branches] Failed to load branches:', err)
        setError(`Unable to load branch locations: ${err.message || 'Please check your API connection and try again.'}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBranches()
  }, [])

  const getMapUrl = (branch: Branch) => {
    return `https://www.google.com/maps?q=${encodeURIComponent(branch.address)}&output=embed`
  }

  const openGoogleMaps = (branch: Branch) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.address)}`
    window.open(url, '_blank')
  }

  return (
    <section id="branches" className="branches">
      <div className="branches-container">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="section-title">Our Branches</h2>
          <p className="section-description">
            Visit us at any of our convenient locations across the city
          </p>
        </motion.div>

        {isLoading ? (
          <div className="branches-loading">
            <FiLoader className="loading-spinner" />
            <p>Loading branch locations...</p>
          </div>
        ) : error ? (
          <div className="branches-error">
            <p>{error}</p>
          </div>
        ) : branches.length === 0 ? (
          <div className="branches-empty">
            <FiMapPin className="empty-icon" />
            <p>No branch locations available at this time.</p>
            <p className="empty-subtext">Please check back later or contact us for more information.</p>
          </div>
        ) : (
          <div className="branches-grid">
            {branches.map((branch, index) => (
              <motion.div
                key={branch.id}
                className="branch-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <div className="branch-map">
                  <iframe
                    title={`${branch.name} Location`}
                    width="100%"
                    height="100%"
                    style={{ border: 0, borderRadius: '12px 12px 0 0' }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={getMapUrl(branch)}
                  />
                </div>
                <div className="branch-info">
                  <div className="branch-header">
                    <h3 className="branch-name">{branch.name}</h3>
                    <span className="branch-id">{branch.id}</span>
                  </div>
                  <div className="branch-details">
                    <div className="branch-detail-item">
                      <FiMapPin className="detail-icon" />
                      <span>{branch.address}</span>
                    </div>
                    {branch.phone && branch.phone !== 'Contact us for details' && (
                      <div className="branch-detail-item">
                        <FiPhone className="detail-icon" />
                        <span>{branch.phone}</span>
                      </div>
                    )}
                  </div>
                  <button 
                    className="branch-map-btn"
                    onClick={() => openGoogleMaps(branch)}
                  >
                    <FiExternalLink /> Open in Google Maps
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default Branches

