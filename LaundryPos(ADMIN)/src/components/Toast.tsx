import { Toaster } from 'react-hot-toast'

const ToastContainer = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: '#363636',
          color: '#fff',
          borderRadius: '8px',
          padding: '16px',
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#059669',
            secondary: '#fff',
          },
        },
        error: {
          duration: 4000,
          iconTheme: {
            primary: '#DC2626',
            secondary: '#fff',
          },
        },
      }}
    />
  )
}

export default ToastContainer

