import { motion } from 'framer-motion'
import { FiArrowRight, FiCheck } from 'react-icons/fi'
import './Hero.css'

const Hero = () => {
  return (
    <section className="hero">
      <div className="hero-container">
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="hero-badge"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <FiCheck /> Trusted by thousands of customers
          </motion.div>

          <h1 className="hero-title">
            Sparklean Laundry Shop
            <span className="gradient-text"> - Professional Care</span>
          </h1>

          <p className="hero-description">
            Experience premium laundry and dry cleaning services with fast turnaround times,
            eco-friendly solutions, and convenient pickup & delivery. Your clothes deserve the best care.
          </p>

          <div className="hero-cta">
            <button className="btn-primary-large">
              Book a Service <FiArrowRight />
            </button>
            <button className="btn-secondary-large">
              Learn More
            </button>
          </div>

          <div className="hero-stats">
            <div className="stat">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Support</div>
            </div>
            <div className="stat">
              <div className="stat-number">48hr</div>
              <div className="stat-label">Turnaround</div>
            </div>
            <div className="stat">
              <div className="stat-number">100%</div>
              <div className="stat-label">Satisfaction</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="hero-image"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="hero-image-wrapper">
            <div className="floating-card card-1">
              <div className="card-icon">👔</div>
              <div className="card-text">Dry Cleaning</div>
            </div>
            <div className="floating-card card-2">
              <div className="card-icon">🧼</div>
              <div className="card-text">Wash & Fold</div>
            </div>
            <div className="floating-card card-3">
              <div className="card-icon">✨</div>
              <div className="card-text">Ironing</div>
            </div>
            <div className="hero-main-visual">
              <div className="visual-circle"></div>
              <div className="visual-icon">🧺</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default Hero

