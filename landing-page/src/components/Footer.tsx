import { FiMail, FiPhone, FiMapPin, FiFacebook, FiTwitter, FiInstagram } from 'react-icons/fi'
import BrandIcon from './BrandIcon'
import './Footer.css'

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-logo">
              <BrandIcon size={32} />
              <span className="logo-text">Sparklean</span>
            </div>
            <p className="footer-description">
              Sparklean Laundry Shop - Professional laundry services made simple. Experience the convenience of premium cleaning.
            </p>
            <div className="social-links">
              <a href="#" aria-label="Facebook"><FiFacebook /></a>
              <a href="#" aria-label="Twitter"><FiTwitter /></a>
              <a href="#" aria-label="Instagram"><FiInstagram /></a>
            </div>
          </div>

          <div className="footer-section">
            <h3 className="footer-title">Services</h3>
            <ul className="footer-links">
              <li><a href="#services">Washing</a></li>
              <li><a href="#services">Dry Cleaning</a></li>
              <li><a href="#services">Ironing</a></li>
              <li><a href="#services">Special Services</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h3 className="footer-title">Company</h3>
            <ul className="footer-links">
              <li><a href="#about">About Us</a></li>
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#branches">Our Branches</a></li>
              <li><a href="#testimonials">Testimonials</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h3 className="footer-title">Contact</h3>
            <ul className="footer-contact">
              <li>
                <FiPhone /> <span>+63 912 345 6789</span>
              </li>
              <li>
                <FiMail /> <span>info@sparklean.com</span>
              </li>
              <li>
                <FiMapPin /> <span>Multiple locations across Metro Manila</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2024 Sparklean Laundry Shop. All rights reserved.</p>
          <div className="footer-legal">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer

