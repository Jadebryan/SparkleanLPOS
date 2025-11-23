import React, { useEffect, useState } from 'react'

interface TopLoadingBarProps {
  active: boolean
}

const TopLoadingBar: React.FC<TopLoadingBarProps> = ({ active }) => {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!active) {
      setProgress(0)
      return
    }
    let t: any
    setProgress(10)
    t = setInterval(() => {
      setProgress((p) => (p < 90 ? p + Math.random() * 10 : p))
    }, 300)
    return () => clearInterval(t)
  }, [active])

  if (!active && progress === 0) return null

  return (
    <div className="top-loading-bar" style={{ width: `${active ? progress : 100}%` }} />
  )
}

export default TopLoadingBar


