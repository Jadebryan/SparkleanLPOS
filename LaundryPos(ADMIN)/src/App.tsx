import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import ToastContainer from './components/Toast'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import OrderManagement from './pages/OrderManagement'
import CustomerManagement from './pages/CustomerManagement'
import EmployeeManagement from './pages/EmployeeManagement'
import StationManagement from './pages/StationManagement'
import ServicesManagement from './pages/ServicesManagement'
import DiscountsManagement from './pages/DiscountsManagement'
import VouchersManagement from './pages/VouchersManagement'
import ExpenseManagement from './pages/ExpenseManagement'
import ReportsGeneration from './pages/ReportsGeneration'
import Settings from './pages/Settings'
import RBACManagement from './pages/RBACManagement'
import RBACDocumentation from './pages/RBACDocumentation'
import Help from './pages/Help'
import Feedback from './pages/Feedback'
import InvoiceReceipt from './pages/InvoiceReceipt'

function App() {
  return (
    <Router>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute resource="dashboard" action="read">
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/orders" 
          element={
            <ProtectedRoute resource="orders" action="read">
              <OrderManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/customers" 
          element={
            <ProtectedRoute resource="customers" action="read">
              <CustomerManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/employees" 
          element={
            <ProtectedRoute resource="employees" action="read">
              <EmployeeManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/stations" 
          element={
            <ProtectedRoute resource="stations" action="read">
              <StationManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/services" 
          element={
            <ProtectedRoute resource="services" action="read">
              <ServicesManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/discounts" 
          element={
            <ProtectedRoute resource="discounts" action="read">
              <DiscountsManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/vouchers" 
          element={
            <ProtectedRoute resource="discounts" action="read">
              <VouchersManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/expenses" 
          element={
            <ProtectedRoute resource="expenses" action="read">
              <ExpenseManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/reports" 
          element={
            <ProtectedRoute resource="reports" action="read">
              <ReportsGeneration />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/rbac" 
          element={
            <ProtectedRoute resource="rbac" action="read">
              <RBACManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute resource="settings" action="read">
              <Layout><Settings /></Layout>
            </ProtectedRoute>
          } 
        />
        <Route path="/help" element={<Layout><Help /></Layout>} />
        <Route path="/feedback" element={<Layout><Feedback /></Layout>} />
        <Route path="/invoice" element={<InvoiceReceipt />} />
        <Route path="/invoice/:id" element={<InvoiceReceipt />} />
        <Route 
          path="/rbac/documentation" 
          element={
            <ProtectedRoute resource="rbac" action="read">
              <RBACDocumentation />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  )
}

export default App

