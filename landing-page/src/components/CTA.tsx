import { motion } from 'framer-motion'
import { FiArrowRight } from 'react-icons/fi'
import './CTA.css'

const CTA = () => {
  return (
    <section className="cta">
      <div className="cta-container">
        <motion.div
          className="cta-content"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="cta-title">Ready to Experience Sparklean's Premium Laundry Services?</h2>
          <p className="cta-description">
            Join thousands of satisfied customers across Metro Manila. Visit any of our branches or contact us today!
          </p>
          <div className="cta-buttons">
            <button className="btn-cta-primary">
              Get Started Now <FiArrowRight />
            </button>
            <button className="btn-cta-secondary">
              Contact Us
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default CTA

