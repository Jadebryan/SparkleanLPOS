import { motion } from 'framer-motion'
import { FiShield, FiZap, FiDroplet, FiClock, FiStar, FiUsers } from 'react-icons/fi'
import './Features.css'

const features = [
  {
    icon: <FiShield />,
    title: '100% Satisfaction Guarantee',
    description: 'We stand behind our work with a complete satisfaction guarantee.'
  },
  {
    icon: <FiZap />,
    title: 'Fast Turnaround',
    description: 'Get your laundry back within 48 hours, or faster with express service.'
  },
  {
    icon: <FiDroplet />,
    title: 'Eco-Friendly',
    description: 'We use environmentally safe detergents and energy-efficient processes.'
  },
  {
    icon: <FiClock />,
    title: '24/7 Support',
    description: 'Our customer service team is available around the clock to help you.'
  },
  {
    icon: <FiStar />,
    title: 'Premium Quality',
    description: 'Professional-grade equipment and expert care for all your garments.'
  },
  {
    icon: <FiUsers />,
    title: 'Trusted by Thousands',
    description: 'Join over 10,000 satisfied customers who trust us with their laundry.'
  }
]

const Features = () => {
  return (
    <section id="features" className="features">
      <div className="features-container">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="section-title">Why Choose Us</h2>
          <p className="section-description">
            Experience the difference with our premium laundry services
          </p>
        </motion.div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="feature-card"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Features

