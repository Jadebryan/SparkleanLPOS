import { motion } from 'framer-motion'
import { FiCalendar, FiPackage, FiTruck, FiCheckCircle } from 'react-icons/fi'
import './HowItWorks.css'

const steps = [
  {
    icon: <FiCalendar />,
    title: 'Schedule Pickup',
    description: 'Book a pickup time that works for you through our app or website.'
  },
  {
    icon: <FiPackage />,
    title: 'We Collect',
    description: 'Our team picks up your laundry from your doorstep at the scheduled time.'
  },
  {
    icon: <FiTruck />,
    title: 'We Clean',
    description: 'Your clothes are professionally cleaned using eco-friendly methods.'
  },
  {
    icon: <FiCheckCircle />,
    title: 'We Deliver',
    description: 'Fresh, clean clothes delivered back to you within 48 hours.'
  }
]

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="how-it-works">
      <div className="how-it-works-container">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="section-title">How It Works</h2>
          <p className="section-description">
            Simple, fast, and convenient. Get your laundry done in 4 easy steps
          </p>
        </motion.div>

        <div className="steps-container">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              className="step"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <div className="step-number">{index + 1}</div>
              <div className="step-icon">{step.icon}</div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-description">{step.description}</p>
              {index < steps.length - 1 && <div className="step-connector"></div>}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HowItWorks

