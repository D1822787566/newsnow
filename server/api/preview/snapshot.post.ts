import { createSnapshot } from "#/utils/snapshot"
import { assertSafePreviewUrl } from "#/utils/url-safety"

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { url }: { url?: string } = body || {}

  if (!url) {
    throw createError({ statusCode: 400, message: "url 为必填" })
  }

  try {
    assertSafePreviewUrl(url)
  } catch (error: any) {
    throw createError({ statusCode: 400, message: error.message || "URL 不安全" })
  }

  try {
    return await createSnapshot(url)
  } catch (error: any) {
    const message = error?.message || "快照生成失败"
    const statusCode = message === "snapshot-too-large" ? 413 : 502
    throw createError({
      statusCode,
      message: message === "snapshot-too-large" ? "快照页面过大，无法在侧栏显示" : message,
    })
  }
})
