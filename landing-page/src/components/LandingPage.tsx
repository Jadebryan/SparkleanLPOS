import { motion } from 'framer-motion'
import Header from './Header'
import Hero from './Hero'
import Services from './Services'
import HowItWorks from './HowItWorks'
import Features from './Features'
import Branches from './Branches'
import Testimonials from './Testimonials'
import CTA from './CTA'
import Footer from './Footer'
import ChatWidget from './ChatWidget'
import './LandingPage.css'

const LandingPage = () => {
  return (
    <div className="landing-page">
      <Header />
      <Hero />
      <Services />
      <HowItWorks />
      <Features />
      <Branches />
      <Testimonials />
      <CTA />
      <Footer />
      <ChatWidget />
    </div>
  )
}

export default LandingPage

