import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect, useCallback, useRef } from "react"
import { MobileViewportIframe } from "./mobile-viewport-iframe"
import { DragHandle } from "./drag-handle"

interface PreviewDrawerProps {
  open: boolean
  onClose: () => void
  url: string | null
}

type PreviewState =
  | { kind: "idle" }
  | { kind: "iframe"; url: string }
  | { kind: "error"; message: string }

const STORAGE_KEY = "newsnow-preview-width"
const MIN_WIDTH = 320
const MAX_WIDTH_RATIO = 0.8 // 80vw

function getDefaultWidth() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    const w = parseInt(stored, 10)
    if (!isNaN(w) && w >= MIN_WIDTH) return w
  }
  return Math.max(MIN_WIDTH, Math.min(480, window.innerWidth * 0.5))
}

function heading(url: string | null) {
  if (!url) return "未选择文章"

  try {
    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

function copyLink(url: string | null) {
  if (!url) return
  void navigator.clipboard?.writeText(url)
}

export function PreviewDrawer({ open, onClose, url }: PreviewDrawerProps) {
  const [state, setState] = useState<PreviewState>({ kind: "idle" })
  const [width, setWidth] = useState(getDefaultWidth)
  const widthRef = useRef(width)

  // Sync ref
  useEffect(() => { widthRef.current = width }, [width])

  // Open state
  useEffect(() => {
    if (open && url) {
      setState({ kind: "iframe", url })
    } else if (!open) {
      setState({ kind: "idle" })
    }
  }, [open, url])

  // ESC close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (open) document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onClose])

  const handleResize = useCallback((delta: number) => {
    const maxW = window.innerWidth * MAX_WIDTH_RATIO
    const newWidth = Math.max(MIN_WIDTH, Math.min(maxW, widthRef.current - delta))
    // Handle is on the left edge, so dragging left (delta<0) increases width
    // movementX: right is positive, so we subtract delta
    setWidth(newWidth)
    widthRef.current = newWidth
  }, [])

  const handleResizeEnd = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, String(widthRef.current))
    isDraggingRef.current = false
  }, [])

  const handleError = useCallback((message: string) => {
    setState({ kind: "error", message })
  }, [])

  const handleLoad = useCallback(() => {
    // iframe load complete
  }, [])

  const currentHeading = heading(url)
  const externalUrl = url

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="preview-drawer__overlay"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="preview-drawer"
            style={{ width: `${width}px` }}
          >
            <DragHandle onResize={handleResize} onResizeEnd={handleResizeEnd} />

            <div className="preview-drawer__top">
              <div>
                <div className="preview-drawer__label">侧栏打开</div>
                <div className="preview-drawer__heading">{currentHeading}</div>
              </div>
              <div className="flex gap-2 items-center">
                {url && (
                  <button
                    type="button"
                    className="preview-drawer__icon-btn"
                    title="复制链接"
                    onClick={() => copyLink(url)}
                  >
                    <span className="i-ph:link-duotone" />
                  </button>
                )}
                {externalUrl && (
                  <button
                    type="button"
                    className="preview-drawer__icon-btn"
                    title="在新标签页打开"
                    onClick={() => window.open(externalUrl, "_blank")}
                  >
                    <span className="i-ph:arrow-square-out-duotone" />
                  </button>
                )}
                <button
                  type="button"
                  className="preview-drawer__icon-btn"
                  title="关闭"
                  onClick={onClose}
                >
                  <span className="i-ph:x-duotone" />
                </button>
              </div>
            </div>

            <div className="preview-drawer__iframe-container">
              {state.kind === "iframe" && (
                <MobileViewportIframe
                  url={state.url}
                  containerWidth={width}
                  onLoad={handleLoad}
                  onError={handleError}
                />
              )}

              {state.kind === "error" && (
                <div className="preview-drawer__error">
                  <span className="i-ph:warning-circle-duotone text-2xl" />
                  <p>{state.message}</p>
                  <div className="flex gap-2 items-center">
                    {url && (
                      <button
                        type="button"
                        className="preview-drawer__error-btn"
                        onClick={() => copyLink(url)}
                      >
                        复制链接
                      </button>
                    )}
                    {externalUrl && (
                      <button
                        type="button"
                        className="preview-drawer__error-btn"
                        onClick={() => window.open(externalUrl, "_blank")}
                      >
                        在新标签页打开
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
