import { useState, useRef, useEffect } from "react"

interface MobileViewportIframeProps {
  url: string
  containerWidth: number
  onLoad: () => void
  onError: (msg: string) => void
}

export function MobileViewportIframe({ url, containerWidth, onLoad, onError }: MobileViewportIframeProps) {
  const [loading, setLoading] = useState(true)
  const [slowNotice, setSlowNotice] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    setLoading(true)
    setSlowNotice(false)

    timerRef.current = setTimeout(() => {
      setSlowNotice(true)
    }, 8000)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [url])

  const handleLoad = () => {
    setLoading(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    onLoad()
  }

  const handleError = () => {
    setLoading(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    onError("该网站不允许嵌入预览")
  }

  return (
    <div
      className="preview-drawer__iframe-wrap"
      style={{ overflow: "hidden", width: `${containerWidth}px` }}
    >
      {loading && (
        <div className="preview-drawer__loading preview-drawer__loading--overlay">
          <span className="i-ph:spinner-duotone animate-spin text-2xl" />
          <span>正在加载页面...</span>
        </div>
      )}

      {slowNotice && (
        <div className="preview-drawer__slow-notice">
          <span>页面加载较慢或该网站不允许嵌入预览。</span>
          <button
            type="button"
            onClick={() => window.open(url, "_blank")}
          >
            在新标签页打开
          </button>
        </div>
      )}

      <iframe
        className="preview-drawer__iframe"
        src={url}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        onLoad={handleLoad}
        onError={handleError}
        title="预览"
        referrerPolicy="no-referrer"
      />
    </div>
  )
}
