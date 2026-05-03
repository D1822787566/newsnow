import { useEffect, useState } from "react"

interface DirectIframeProps {
  url: string
  onTrySnapshot: () => void
}

export function DirectIframe({ url, onTrySnapshot }: DirectIframeProps) {
  const [loading, setLoading] = useState(true)
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    setLoading(true)
    setSlow(false)
    const timer = window.setTimeout(() => {
      setSlow(true)
    }, 8000)
    return () => window.clearTimeout(timer)
  }, [url])

  return (
    <div className="preview-drawer__iframe-wrap">
      {loading && (
        <div className="preview-drawer__loading preview-drawer__loading--overlay">
          <span className="i-ph:spinner-duotone animate-spin text-2xl" />
          <span>正在加载原始页面...</span>
        </div>
      )}

      {slow && (
        <div className="preview-drawer__slow-notice">
          <span>页面加载较慢或可能被站点限制。</span>
          <button type="button" onClick={onTrySnapshot}>尝试快照</button>
        </div>
      )}

      <iframe
        src={url}
        className="preview-drawer__iframe"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        onLoad={() => setLoading(false)}
        title="NewsNow 原页预览"
      />
    </div>
  )
}
