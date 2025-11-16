import { useEffect } from 'react'

interface FacebookMessengerProps {
  pageId: string
  appId?: string
}

const FacebookMessenger = ({ pageId, appId }: FacebookMessengerProps) => {
  useEffect(() => {
    // Load Facebook SDK
    window.fbAsyncInit = function() {
      if (window.FB) {
        window.FB.init({
          xfbml: true,
          version: 'v18.0'
        })
      }
    }

    // Load SDK script
    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script')
      script.id = 'facebook-jssdk'
      script.src = 'https://connect.facebook.net/en_US/sdk/xfbml.customerchat.js'
      script.async = true
      script.defer = true
      document.body.appendChild(script)
    }

    return () => {
      // Cleanup if needed
    }
  }, [])

  if (!pageId) {
    console.warn('Facebook Messenger: Page ID is required')
    return null
  }

  return (
    <>
      <div
        className="fb-customerchat"
        attribution="setup_tool"
        page_id={pageId}
        theme_color="#2563EB"
        logged_in_greeting="Hi! How can we help you today?"
        logged_out_greeting="Hi! How can we help you today?"
      />
    </>
  )
}

declare global {
  interface Window {
    FB?: any
    fbAsyncInit?: () => void
  }
}

export default FacebookMessenger

