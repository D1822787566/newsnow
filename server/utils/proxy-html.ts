import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = fileURLToPath(new URL(".", import.meta.url))

/** 读取 DFL 注入样式模板 */
export function getDflInjectCss(): string {
  try {
    const cssPath = join(__dirname, "../styles/dfl-inject.css")
    return readFileSync(cssPath, "utf-8")
  } catch {
    // Fallback inline CSS if file not found
    return getFallbackDflCss()
  }
}

function getFallbackDflCss(): string {
  return `
    :root {
      --dfl-paper: #F2EAD3;
      --dfl-ink: #1F1A14;
      --dfl-ink-2: #3D3528;
      --dfl-ink-3: #7A6E60;
      --dfl-rule: #D4C9B8;
      --dfl-blue: #2B5E8B;
      --dfl-red: #C0392B;
    }
    body {
      background: var(--dfl-paper) !important;
      color: var(--dfl-ink-2) !important;
      font-family: 'Noto Serif SC', serif !important;
      line-height: 1.8 !important;
    }
    a { color: var(--dfl-blue) !important; text-decoration: underline !important; }
    h1, h2, h3, h4, h5, h6 { font-family: 'Noto Serif SC', serif !important; color: var(--dfl-ink) !important; font-weight: 700 !important; }
    img { max-width: 100% !important; border-radius: 8px !important; }
    blockquote { border-left: 3px solid var(--dfl-rule) !important; padding-left: 12px !important; color: var(--dfl-ink-3) !important; }
    .ad, .sidebar, .nav, .header, .footer,
    [class*="ad-"], [class*="nav-"], [class*="sidebar"],
    [id*="ad"], [id*="popup"], [id*="modal"] {
      display: none !important;
    }
  `
}

/** 将 DFL 样式注入到 HTML 的 <head> 中 */
export function injectDflStyles(html: string): string {
  const css = getDflInjectCss()
  const styleTag = `<style id="dfl-injected-styles" data-dfl-preview="true">\n${css}\n</style>`

  // 尝试注入到 </head> 之前
  if (html.includes("</head>")) {
    return html.replace("</head>", `${styleTag}\n</head>`)
  }

  // 如果没有 </head>，注入到 <body> 开头或最前面
  if (html.includes("<body")) {
    return html.replace(/<body[^>]*>/, (match) => `${match}\n${styleTag}`)
  }

  return `${styleTag}\n${html}`
}

/** 移除可能限制 iframe 嵌入的 CSP meta 标签 */
export function removeCspMeta(html: string): string {
  // 移除 <meta http-equiv="Content-Security-Policy" ...>
  html = html.replace(/<meta\s+[^>]*http-equiv\s*=\s*["']?Content-Security-Policy["']?[^>]*>/gi, "")
  // 移除 <meta http-equiv="X-Frame-Options" ...>
  html = html.replace(/<meta\s+[^>]*http-equiv\s*=\s*["']?X-Frame-Options["']?[^>]*>/gi, "")
  return html
}

/** 处理完整的代理 HTML 管道 */
export function processProxyHtml(html: string): string {
  html = removeCspMeta(html)
  html = injectDflStyles(html)
  return html
}
