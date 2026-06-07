import { useEffect, useState } from 'react'

export function FullscreenToggle(): React.ReactElement {
  const [isFullScreen, setIsFullScreen] = useState(false)

  useEffect(() => {
    void window.producerApi.window.isFullScreen().then(setIsFullScreen)
    return window.producerApi.window.subscribeFullScreenChanged(setIsFullScreen)
  }, [])

  async function handleToggle(): Promise<void> {
    const next = await window.producerApi.window.toggleFullScreen()
    setIsFullScreen(next)
  }

  return (
    <button
      type="button"
      className="btn btn--compact fullscreen-toggle"
      aria-pressed={isFullScreen}
      title={isFullScreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}
      onClick={() => void handleToggle()}
    >
      <span className="fullscreen-toggle__icon" aria-hidden="true">
        {isFullScreen ? '⤡' : '⤢'}
      </span>
      <span>{isFullScreen ? 'Exit fullscreen' : 'Fullscreen'}</span>
    </button>
  )
}
