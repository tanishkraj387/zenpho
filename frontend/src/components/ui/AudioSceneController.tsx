import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { type BgmScene, useAudioStore } from '../../lib/audio'

function getSceneForPath(pathname: string): BgmScene {
  if (pathname.startsWith('/battle')) {
    return 'battle'
  }

  if (pathname.startsWith('/gyms')) {
    return 'gym'
  }

  if (pathname.startsWith('/practice')) {
    return 'route'
  }

  if (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/signup')) {
    return 'boot'
  }

  return 'hub'
}

export function AudioSceneController() {
  const location = useLocation()
  const setBgmScene = useAudioStore((state) => state.setBgmScene)

  useEffect(() => {
    setBgmScene(getSceneForPath(location.pathname))
  }, [location.pathname, setBgmScene])

  return null
}
