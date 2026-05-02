import { useState } from "react"

interface ProxyIframeProps {
  proxyUrl: string
  externalUrl?: string
}

export function ProxyIframe({ proxyUrl, externalUrl }: ProxyIframeProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="preview-drawer__iframe-wrap">
      {loading && !error && (
        <div className="preview-drawer__loading">
          <span className="i-ph:spinner-duotone animate-spin text-2xl" />
          <span>正在加载原始页面...</span>
        </div>
      )}

      {error && (
        <div className="preview-drawer__error">
          <span className="i-ph:warning-circle-duotone text-2xl" />
          <p>{error}</p>
          {externalUrl && (
            <button
              type="button"
              className="preview-drawer__error-btn"
              onClick={() => window.open(externalUrl, "_blank")}
            >
              &rarr; 在浏览器中打开
            </button>
          )}
        </div>
      )}

      <iframe
        src={proxyUrl}
        className="preview-drawer__iframe"
        sandbox="allow-scripts allow-same-origin allow-popups"
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false)
          setError("页面加载失败")
        }}
        title="预览原始网页"
      />
    </div>
  )
}
