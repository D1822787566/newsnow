import { motion, AnimatePresence } from "framer-motion"
import { useEffect } from "react"

export interface ContextMenuItem {
  label: string
  icon?: string
  action: () => void
  danger?: boolean
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      onClose()
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("click", handler)
    document.addEventListener("keydown", keyHandler)
    return () => {
      document.removeEventListener("click", handler)
      document.removeEventListener("keydown", keyHandler)
    }
  }, [onClose])

  const menuWidth = 200
  const menuHeight = items.length * 40
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 10)
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 10)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        className="newsnow-context-menu"
        style={{
          position: "fixed",
          left: adjustedX,
          top: adjustedY,
          zIndex: 9999,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item, i) => (
          <button
            key={i}
            type="button"
            className={$(
              "context-menu__item",
              item.danger && "context-menu__item--danger",
            )}
            onClick={(e) => {
              e.stopPropagation()
              item.action()
              onClose()
            }}
          >
            {item.icon && <span className={item.icon} />}
            <span>{item.label}</span>
          </button>
        ))}
      </motion.div>
    </AnimatePresence>
  )
}
