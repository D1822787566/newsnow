import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { OverlayScrollbar } from "../common/overlay-scrollbar"
import { myFetch } from "~/utils"
import { sources } from "@shared/sources"
import type { SourceID } from "@shared/types"

interface Credential {
  id: number
  sourceId: string
  domain: string
  createdAt: string
  updatedAt: string
  expired: boolean
}

interface CredentialManagerProps {
  open: boolean
  onClose: () => void
}

export function CredentialManager({ open, onClose }: CredentialManagerProps) {
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [selectedSource, setSelectedSource] = useState<SourceID>("zhihu")
  const [cookieValue, setCookieValue] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadCredentials = useCallback(() => {
    myFetch("/credentials")
      .then(res => setCredentials(res.credentials || []))
      .catch(() => setCredentials([]))
  }, [])

  useEffect(() => {
    if (open) loadCredentials()
  }, [open, loadCredentials])

  const handleAdd = async () => {
    if (!cookieValue.trim()) {
      setError("Cookie 值不能为空")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await myFetch("/credentials", {
        method: "POST",
        body: { sourceId: selectedSource, cookieValue: cookieValue.trim() },
      })
      setCookieValue("")
      loadCredentials()
    } catch (err: any) {
      setError(err?.message || "添加失败")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await myFetch(`/credentials/${id}`, { method: "DELETE" })
      loadCredentials()
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (open) document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onClose])

  const availableSources = (Object.entries(sources) as [SourceID, any][])
    .filter(([, s]) => s?.home)
    .slice(0, 30)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="credential-manager__overlay"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="credential-manager"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="credential-manager__header">
              <div>
                <h2 className="credential-manager__title">🔑 站点凭证管理</h2>
                <p className="credential-manager__desc">为需要登录的网站添加凭证，侧栏预览时自动使用</p>
              </div>
              <button type="button" className="preview-drawer__icon-btn" onClick={onClose}>
                <span className="i-ph:x-duotone" />
              </button>
            </div>

            <OverlayScrollbar
              className="credential-manager__body"
              options={{ overflow: { x: "hidden" } }}
              defer
            >
              {credentials.length > 0 && (
                <div className="credential-manager__list">
                  {credentials.map(c => (
                    <div key={c.id} className="credential-manager__item">
                      <div className="credential-manager__item-info">
                        <span className="credential-manager__item-icon" />
                        <span className="credential-manager__item-name">
                          {sources[c.sourceId as SourceID]?.name || c.sourceId}
                        </span>
                        <span className={$(
                          "credential-manager__item-badge",
                          c.expired ? "credential-manager__item-badge--expired" : "credential-manager__item-badge--valid"
                        )}>
                          {c.expired ? "已过期" : "有效"}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="credential-manager__item-delete"
                        onClick={() => handleDelete(c.id)}
                      >
                        ✕ 删除
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="credential-manager__add">
                <h3 className="credential-manager__add-title">+ 添加新凭证</h3>
                <div className="credential-manager__add-form">
                  <select
                    className="credential-manager__select"
                    value={selectedSource}
                    onChange={e => setSelectedSource(e.target.value as SourceID)}
                  >
                    {availableSources.map(([id, s]) => (
                      <option key={id} value={id}>{s.name} ({s.home})</option>
                    ))}
                  </select>
                  <textarea
                    className="credential-manager__input"
                    placeholder="粘贴浏览器中的 Cookie 值..."
                    value={cookieValue}
                    onChange={e => setCookieValue(e.target.value)}
                    rows={2}
                  />
                  {error && <p className="credential-manager__error">{error}</p>}
                  <button
                    type="button"
                    className="credential-manager__submit"
                    onClick={handleAdd}
                    disabled={saving}
                  >
                    {saving ? "保存中..." : "保存凭证"}
                  </button>
                </div>
                <p className="credential-manager__hint">
                  💡 如何获取 Cookie：在目标网站登录后 → F12 开发者工具 → Application/存储 → Cookies → 复制整个 Cookie 值
                </p>
              </div>
            </OverlayScrollbar>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
