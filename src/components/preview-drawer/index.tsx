import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect, useCallback, useRef } from "react"
import { myFetch } from "~/utils"
import { DirectIframe } from "./direct-iframe"
import { SnapshotFrame } from "./snapshot-frame"

interface PreviewDrawerProps {
  open: boolean
  onClose: () => void
  url: string | null
  sourceId: string | null
}

type PreviewState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "iframe", url: string, finalUrl?: string }
  | { kind: "snapshotLoading", reason?: string }
  | { kind: "snapshot", html: string, title: string, finalUrl?: string }
  | { kind: "error", message: string, details?: string }

interface CheckFrameResponse {
  embeddable: boolean
  reason: string | null
  details: string | null
  finalUrl: string
}

interface SnapshotResponse {
  title: string
  html: string
  finalUrl: string
}

function statusLabel(state: PreviewState) {
  switch (state.kind) {
    case "checking":
      return "检查中"
    case "iframe":
      return "原页"
    case "snapshotLoading":
      return "生成快照"
    case "snapshot":
      return "静态快照"
    case "error":
      return "打开失败"
    case "idle":
    default:
      return "待打开"
  }
}

function heading(url: string | null, state: PreviewState) {
  if (state.kind === "snapshot" && state.title) return state.title
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
  const requestIdRef = useRef(0)

  const startRequest = useCallback(() => {
    requestIdRef.current += 1
    return requestIdRef.current
  }, [])

  const isCurrentRequest = useCallback((requestId: number) => {
    return requestIdRef.current === requestId
  }, [])

  const loadSnapshot = useCallback((reason?: string, requestId = startRequest()) => {
    if (!url || !isCurrentRequest(requestId)) return

    setState({ kind: "snapshotLoading", reason })

    myFetch<SnapshotResponse>("/preview/snapshot", {
      method: "POST",
      body: { url },
    })
      .then(res => {
        if (!isCurrentRequest(requestId)) return
        setState({
          kind: "snapshot",
          title: res.title || "静态快照",
          html: res.html,
          finalUrl: res.finalUrl,
        })
      })
      .catch(err => {
        if (!isCurrentRequest(requestId)) return
        setState({
          kind: "error",
          message: err?.message || "生成静态快照失败，请在新标签页打开原文。",
          details: reason,
        })
      })
  }, [isCurrentRequest, startRequest, url])

  const loadPreview = useCallback(() => {
    if (!url) return

    const requestId = startRequest()
    setState({ kind: "checking" })

    myFetch<CheckFrameResponse>("/preview/check-frame", {
      method: "POST",
      body: { url },
    })
      .then(res => {
        if (!isCurrentRequest(requestId)) return
        if (res.embeddable) {
          setState({
            kind: "iframe",
            url: res.finalUrl || url,
            finalUrl: res.finalUrl,
          })
          return
        }

        loadSnapshot(res.reason || res.details || "frame-blocked", requestId)
      })
      .catch(err => {
        if (!isCurrentRequest(requestId)) return
        loadSnapshot(err?.message || "iframe-check-failed", requestId)
      })
  }, [isCurrentRequest, loadSnapshot, startRequest, url])

  useEffect(() => {
    if (open && url) {
      loadPreview()
    } else if (!open) {
      startRequest()
      setState({ kind: "idle" })
    }
  }, [open, url, loadPreview, startRequest])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (open) document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onClose])

  const currentHeading = heading(url, state)
  const currentStatusLabel = statusLabel(state)
  const externalUrl =
    state.kind === "iframe" || state.kind === "snapshot"
      ? state.finalUrl || url
      : url

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
          >
            <div className="preview-drawer__top">
              <div>
                <div className="preview-drawer__label">侧栏打开</div>
                <div className="preview-drawer__heading">{currentHeading}</div>
              </div>
              <div className="flex gap-2 items-center">
                <div className="preview-drawer__status-badge">{currentStatusLabel}</div>
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
              {state.kind === "checking" && (
                <div className="preview-drawer__loading">
                  <span className="i-ph:spinner-duotone animate-spin text-2xl" />
                  <span>正在检查页面是否支持侧栏打开...</span>
                </div>
              )}

              {state.kind === "snapshotLoading" && (
                <div className="preview-drawer__loading">
                  <span className="i-ph:spinner-duotone animate-spin text-2xl" />
                  <span>原页无法直接嵌入，正在生成静态快照...</span>
                </div>
              )}

              {state.kind === "iframe" && (
                <DirectIframe
                  url={state.finalUrl || state.url}
                  onTrySnapshot={() => loadSnapshot("manual-snapshot")}
                />
              )}

              {state.kind === "snapshot" && (
                <SnapshotFrame html={state.html} title={state.title} />
              )}

              {state.kind === "error" && (
                <div className="preview-drawer__error">
                  <span className="i-ph:warning-circle-duotone text-2xl" />
                  <p>{state.message}</p>
                  {state.details && <p className="preview-drawer__error-detail">{state.details}</p>}
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
