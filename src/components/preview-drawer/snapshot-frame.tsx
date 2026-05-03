interface SnapshotFrameProps {
  html: string
  title: string
}

export function SnapshotFrame({ html, title }: SnapshotFrameProps) {
  return (
    <div className="preview-drawer__iframe-wrap">
      <iframe
        srcDoc={html}
        className="preview-drawer__iframe preview-drawer__iframe--snapshot"
        sandbox=""
        title={title || "NewsNow 静态快照"}
      />
    </div>
  )
}
