import { motion } from 'framer-motion'
import { FiStar } from 'react-icons/fi'
import './Testimonials.css'

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Busy Professional',
    image: '👩',
    rating: 5,
    text: 'Sparklean has been a lifesaver! The pickup and delivery service fits perfectly into my busy schedule. The clothes always come back perfectly cleaned and folded.'
  },
  {
    name: 'Michael Chen',
    role: 'Small Business Owner',
    image: '👨',
    rating: 5,
    text: 'I\'ve tried many laundry services, but Sparklean stands out. Their attention to detail and eco-friendly approach gives me peace of mind. Highly recommended!'
  },
  {
    name: 'Emily Rodriguez',
    role: 'Parent',
    image: '👩',
    rating: 5,
    text: 'As a parent of three, laundry is overwhelming. Sparklean handles everything with care, and the 48-hour turnaround is amazing. Worth every penny!'
  }
]

const Testimonials = () => {
  return (
    <section id="testimonials" className="testimonials">
      <div className="testimonials-container">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="section-title">What Our Customers Say</h2>
          <p className="section-description">
            Don't just take our word for it - hear from our satisfied customers
          </p>
        </motion.div>

        <div className="testimonials-grid">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              className="testimonial-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <div className="testimonial-rating">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <FiStar key={i} className="star-icon" />
                ))}
              </div>
              <p className="testimonial-text">"{testimonial.text}"</p>
              <div className="testimonial-author">
                <div className="author-avatar">{testimonial.image}</div>
                <div className="author-info">
                  <div className="author-name">{testimonial.name}</div>
                  <div className="author-role">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Testimonials

