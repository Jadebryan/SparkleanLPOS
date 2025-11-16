import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiMenu, FiX } from 'react-icons/fi'
import BrandIcon from './BrandIcon'
import './Header.css'

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <motion.header
      className={`header ${isScrolled ? 'scrolled' : ''}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="header-container">
        <div className="logo">
          <BrandIcon size={32} />
          <span className="logo-text">Sparklean</span>
        </div>

        <nav className={`nav ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <a href="#services" onClick={() => setIsMobileMenuOpen(false)}>Services</a>
          <a href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)}>How It Works</a>
          <a href="#features" onClick={() => setIsMobileMenuOpen(false)}>Features</a>
          <a href="#branches" onClick={() => setIsMobileMenuOpen(false)}>Branches</a>
          <a href="#testimonials" onClick={() => setIsMobileMenuOpen(false)}>Reviews</a>
          <button className="btn-primary">Get Started</button>
        </nav>

        <button
          className="mobile-menu-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <FiX /> : <FiMenu />}
        </button>
      </div>
    </motion.header>
  )
}

export default Header

