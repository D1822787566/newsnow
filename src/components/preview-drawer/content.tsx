import DOMPurify from "dompurify"

interface DrawerContentProps {
  title: string
  content: string
  source: string
  author?: string
  usedCredential?: string | null
  credentialExpired?: boolean
  elapsed?: string
  url: string
}

export function DrawerContent({
  title, content, source, author,
  usedCredential, credentialExpired, elapsed, url,
}: DrawerContentProps) {
  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "a", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "code", "pre", "img", "figure", "figcaption"],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "class", "target", "rel"],
    ADD_HOOKS: {
      afterSanitizeAttributes: (node: Element) => {
        if (node.tagName === "A" && node.getAttribute("href")) {
          node.setAttribute("target", "_blank")
          node.setAttribute("rel", "noopener noreferrer")
        }
      },
    },
  })

  return (
    <div className="preview-drawer__content">
      <div className="preview-drawer__header">
        <div className="preview-drawer__meta">
          <span className="preview-drawer__source">{source}</span>
          {author && <span className="preview-drawer__author">{author}</span>}
        </div>
        <h2 className="preview-drawer__title">{title}</h2>
      </div>

      <div
        className="preview-drawer__body"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />

      <div className="preview-drawer__footer">
        <span className="preview-drawer__status">
          {usedCredential && (
            credentialExpired
              ? <span className="preview-drawer__status--warn">&#9888;&#65039; 凭证可能已过期</span>
              : <span>&#9989; 已使用「{usedCredential}」凭证</span>
          )}
        </span>
        {elapsed && <span className="preview-drawer__time">提取耗时 {elapsed}s</span>}
      </div>
    </div>
  )
}
