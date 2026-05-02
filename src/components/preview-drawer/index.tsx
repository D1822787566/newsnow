import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect, useCallback } from "react"
import { OverlayScrollbar } from "../common/overlay-scrollbar"
import { myFetch } from "~/utils"
import { DrawerContent } from "./content"
import { ProxyIframe } from "./proxy-iframe"

interface PreviewDrawerProps {
  open: boolean
  onClose: () => void
  url: string | null
  sourceId: string | null
}

type PreviewMode = "readable" | "iframe"

interface FetchState {
  loading: boolean
  error: string | null
  mode: PreviewMode
  title: string
  content: string
  proxyUrl: string | null
  source: string
  author: string
  usedCredential: string | null
  credentialExpired: boolean
  elapsed: string
}

export function PreviewDrawer({ open, onClose, url, sourceId }: PreviewDrawerProps) {
  const [state, setState] = useState<FetchState>({
    loading: false,
    error: null,
    mode: "readable",
    title: "",
    content: "",
    proxyUrl: null,
    source: "",
    author: "",
    usedCredential: null,
    credentialExpired: false,
    elapsed: "",
  })

  const fetchPreview = useCallback((forceMode?: PreviewMode) => {
    if (!url || !sourceId) return

    setState({
      loading: true,
      error: null,
      mode: forceMode || "readable",
      title: "",
      content: "",
      proxyUrl: null,
      source: "",
      author: "",
      usedCredential: null,
      credentialExpired: false,
      elapsed: "",
    })

    myFetch("/preview/fetch", {
      method: "POST",
      body: { url, sourceId },
    })
      .then(res => {
        const mode = forceMode || res.mode || "readable"
        setState({
          loading: false,
          error: null,
          mode,
          title: res.title || "",
          content: res.content || "",
          proxyUrl: res.proxyUrl || null,
          source: res.source || "",
          author: res.author || "",
          usedCredential: res.usedCredential || res.credentialUsed || null,
          credentialExpired: res.credentialExpired || false,
          elapsed: res.elapsed || "",
        })
      })
      .catch(err => {
        setState(s => ({
          ...s,
          loading: false,
          error: err?.message || "请求失败，请检查网络",
        }))
      })
  }, [url, sourceId])

  useEffect(() => {
    if (open && url && sourceId) {
      fetchPreview()
    }
  }, [open, url, sourceId, fetchPreview])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (open) document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onClose])

  const handleModeToggle = () => {
    const newMode: PreviewMode = state.mode === "readable" ? "iframe" : "readable"
    fetchPreview(newMode)
  }

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
                <div className="preview-drawer__label">预览</div>
                {state.title && (
                  <div className="preview-drawer__heading">{state.title}</div>
                )}
              </div>
              <div className="flex gap-2 items-center">
                {state.mode && (
                  <div className="preview-drawer__mode-toggle">
                    <button
                      type="button"
                      className={`preview-drawer__mode-btn ${state.mode === "readable" ? "active" : ""}`}
                      onClick={() => handleModeToggle()}
                      title="阅读模式：提取正文，干净简洁"
                    >
                      阅读
                    </button>
                    <button
                      type="button"
                      className={`preview-drawer__mode-btn ${state.mode === "iframe" ? "active" : ""}`}
                      onClick={() => handleModeToggle()}
                      title="原页模式：显示原始网页，保留完整布局"
                    >
                      原页
                    </button>
                  </div>
                )}
                {url && (
                  <button
                    type="button"
                    className="preview-drawer__icon-btn"
                    title="在原始链接打开"
                    onClick={() => window.open(url, "_blank")}
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

            {state.mode === "readable" ? (
              <OverlayScrollbar
                className="preview-drawer__scroll"
                options={{ overflow: { x: "hidden" } }}
                defer
              >
                {state.loading && (
                  <div className="preview-drawer__loading">
                    <span className="i-ph:spinner-duotone animate-spin text-2xl" />
                    <span>正在抓取内容...</span>
                  </div>
                )}
                {state.error && (
                  <div className="preview-drawer__error">
                    <span className="i-ph:warning-circle-duotone text-2xl" />
                    <p>{state.error}</p>
                    {url && (
                      <button
                        type="button"
                        className="preview-drawer__error-btn"
                        onClick={() => window.open(url, "_blank")}
                      >
                        &rarr; 在浏览器中打开
                      </button>
                    )}
                  </div>
                )}
                {!state.loading && !state.error && state.content && (
                  <DrawerContent
                    title={state.title}
                    content={state.content}
                    source={state.source}
                    author={state.author}
                    usedCredential={state.usedCredential}
                    credentialExpired={state.credentialExpired}
                    elapsed={state.elapsed}
                    url={url || ""}
                  />
                )}
              </OverlayScrollbar>
            ) : (
              <div className="preview-drawer__iframe-container">
                {state.loading && (
                  <div className="preview-drawer__loading">
                    <span className="i-ph:spinner-duotone animate-spin text-2xl" />
                    <span>正在加载原始页面...</span>
                  </div>
                )}
                {state.error && (
                  <div className="preview-drawer__error">
                    <span className="i-ph:warning-circle-duotone text-2xl" />
                    <p>{state.error}</p>
                    {url && (
                      <button
                        type="button"
                        className="preview-drawer__error-btn"
                        onClick={() => window.open(url, "_blank")}
                      >
                        &rarr; 在浏览器中打开
                      </button>
                    )}
                  </div>
                )}
                {!state.loading && !state.error && state.proxyUrl && (
                  <ProxyIframe
                    proxyUrl={state.proxyUrl}
                    externalUrl={url || undefined}
                  />
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
