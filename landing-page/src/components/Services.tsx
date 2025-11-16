import { motion } from 'framer-motion'
import { FiTruck, FiDroplet, FiWind, FiShield } from 'react-icons/fi'
import './Services.css'

const services = [
  {
    icon: <FiDroplet />,
    title: 'Washing',
    description: 'Professional washing service for your everyday laundry needs. Clean, fresh, and perfectly folded.',
    price: 'Affordable pricing'
  },
  {
    icon: <FiWind />,
    title: 'Dry Cleaning',
    description: 'Expert dry cleaning for delicate fabrics, formal wear, and special garments.',
    price: 'Premium service'
  },
  {
    icon: <FiTruck />,
    title: 'Ironing',
    description: 'Professional pressing and ironing service to keep your clothes crisp and wrinkle-free.',
    price: 'Quick turnaround'
  },
  {
    icon: <FiShield />,
    title: 'Special Services',
    description: 'Specialized care for luxury items, wedding dresses, curtains, and other special garments.',
    price: 'Custom pricing'
  }
]

const Services = () => {
  return (
    <section id="services" className="services">
      <div className="services-container">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="section-title">Our Services</h2>
          <p className="section-description">
            Comprehensive laundry solutions tailored to meet all your needs
          </p>
        </motion.div>

        <div className="services-grid">
          {services.map((service, index) => (
            <motion.div
              key={index}
              className="service-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -10 }}
            >
              <div className="service-icon">{service.icon}</div>
              <h3 className="service-title">{service.title}</h3>
              <p className="service-description">{service.description}</p>
              <div className="service-price">{service.price}</div>
              <button className="service-btn">Learn More</button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Services

