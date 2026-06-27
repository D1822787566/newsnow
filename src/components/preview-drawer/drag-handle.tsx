import { useEffect, useRef, useCallback } from "react"

interface DragHandleProps {
  onResize: (delta: number) => void
  onResizeEnd: () => void
}

const DRAG_THRESHOLD = 3

export function DragHandle({ onResize, onResizeEnd }: DragHandleProps) {
  const draggingRef = useRef(false)
  const movedRef = useRef(false)

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingRef.current) return
    if (!movedRef.current) return // 未达到阈值前不触发
    e.preventDefault()
    onResize(e.movementX)
  }, [onResize])

  const handleMouseUp = useCallback(() => {
    if (!draggingRef.current) return
    draggingRef.current = false
    movedRef.current = false
    document.body.style.userSelect = ""
    document.body.style.cursor = ""
    onResizeEnd()
  }, [onResizeEnd])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    draggingRef.current = true
    movedRef.current = false
    document.body.style.userSelect = "none"
    document.body.style.cursor = "col-resize"

    // 用一次性 listener 检测是否真正拖拽（移动超过阈值）
    const onFirstMove = (me: MouseEvent) => {
      const dist = Math.abs(me.clientX - e.clientX)
      if (dist >= DRAG_THRESHOLD) {
        movedRef.current = true
        document.removeEventListener("mousemove", onFirstMove)
      }
    }
    document.addEventListener("mousemove", onFirstMove)
    // mouseup 时清理这个一次性 listener
    const onFirstUp = () => {
      document.removeEventListener("mousemove", onFirstMove)
      document.removeEventListener("mouseup", onFirstUp)
    }
    document.addEventListener("mouseup", onFirstUp)
  }, [])

  // Touch events
  const lastTouchXRef = useRef(0)
  const touchStartXRef = useRef(0)

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!draggingRef.current) return
    if (!movedRef.current) return
    e.preventDefault()
    const touch = e.touches[0]
    const deltaX = touch.clientX - lastTouchXRef.current
    lastTouchXRef.current = touch.clientX
    onResize(deltaX)
  }, [onResize])

  const handleTouchEnd = useCallback(() => {
    if (!draggingRef.current) return
    draggingRef.current = false
    movedRef.current = false
    document.body.style.userSelect = ""
    document.body.style.cursor = ""
    onResizeEnd()
  }, [onResizeEnd])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    lastTouchXRef.current = touch.clientX
    touchStartXRef.current = touch.clientX
    draggingRef.current = true
    movedRef.current = false
    document.body.style.userSelect = "none"
    document.body.style.cursor = "col-resize"

    const onFirstMove = (te: TouchEvent) => {
      const t = te.touches[0]
      const dist = Math.abs(t.clientX - touchStartXRef.current)
      if (dist >= DRAG_THRESHOLD) {
        movedRef.current = true
        document.removeEventListener("touchmove", onFirstMove)
      }
    }
    document.addEventListener("touchmove", onFirstMove, { passive: false })
    const onFirstEnd = () => {
      document.removeEventListener("touchmove", onFirstMove)
      document.removeEventListener("touchend", onFirstEnd)
      document.removeEventListener("touchcancel", onFirstEnd)
    }
    document.addEventListener("touchend", onFirstEnd)
    document.addEventListener("touchcancel", onFirstEnd)
  }, [])

  // Attach global mouse/touch listeners
  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    document.addEventListener("touchmove", handleTouchMove, { passive: false })
    document.addEventListener("touchend", handleTouchEnd)
    document.addEventListener("touchcancel", handleTouchEnd)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("touchend", handleTouchEnd)
      document.removeEventListener("touchcancel", handleTouchEnd)
    }
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

  return (
    <div
      className="preview-drawer__drag-handle"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    />
  )
}
