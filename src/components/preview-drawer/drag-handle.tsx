import { useEffect, useRef, useCallback } from "react"

interface DragHandleProps {
  onResize: (delta: number) => void
  onResizeEnd: () => void
}

export function DragHandle({ onResize, onResizeEnd }: DragHandleProps) {
  const draggingRef = useRef(false)

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingRef.current) return
    e.preventDefault()
    onResize(e.movementX)
  }, [onResize])

  const handleMouseUp = useCallback(() => {
    if (!draggingRef.current) return
    draggingRef.current = false
    document.body.style.userSelect = "none"
    document.body.style.cursor = ""
    onResizeEnd()
  }, [onResizeEnd])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    draggingRef.current = true
    document.body.style.userSelect = "none"
    document.body.style.cursor = "col-resize"
  }, [])

  // Touch events
  const lastTouchXRef = useRef(0)

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!draggingRef.current) return
    e.preventDefault()
    const touch = e.touches[0]
    const deltaX = touch.clientX - lastTouchXRef.current
    lastTouchXRef.current = touch.clientX
    onResize(deltaX)
  }, [onResize])

  const handleTouchEnd = useCallback(() => {
    if (!draggingRef.current) return
    draggingRef.current = false
    document.body.style.userSelect = "none"
    document.body.style.cursor = ""
    onResizeEnd()
  }, [onResizeEnd])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    lastTouchXRef.current = touch.clientX
    draggingRef.current = true
    document.body.style.userSelect = "none"
    document.body.style.cursor = "col-resize"
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
