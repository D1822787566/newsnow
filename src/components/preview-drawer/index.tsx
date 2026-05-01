import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"
import { OverlayScrollbar } from "../common/overlay-scrollbar"
import { myFetch } from "~/utils"
import { DrawerContent } from "./content"

interface PreviewDrawerProps {
  open: boolean
  onClose: () => void
  url: string | null
  sourceId: string | null
}

interface FetchState {
  loading: boolean
  error: string | null
  title: string
  content: string
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
    title: "",
    content: "",
    source: "",
    author: "",
    usedCredential: null,
    credentialExpired: false,
    elapsed: "",
  })

  useEffect(() => {
    if (open && url && sourceId) {
      setState(s => ({ ...s, loading: true, error: null, content: "" }))
      myFetch("/preview/fetch", {
        method: "POST",
        body: { url, sourceId },
      })
        .then(res => {
          setState({
            loading: false,
            error: null,
            title: res.title,
            content: res.content,
            source: res.source,
            author: res.author || "",
            usedCredential: res.usedCredential,
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
    }
  }, [open, url, sourceId])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (open) document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onClose])

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
              <div className="flex gap-2">
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
