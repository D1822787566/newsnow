import { defineConfig, presetIcons, presetWind3, transformerDirectives, transformerVariantGroup } from "unocss"
import { hex2rgba } from "@unocss/rule-utils"
import { sources } from "./shared/sources"

export default defineConfig({
  mergeSelectors: false,
  transformers: [transformerDirectives(), transformerVariantGroup()],
  presets: [
    presetWind3(),
    presetIcons({
      scale: 1.2,
    }),
  ],
  rules: [
    [/^sprinkle-(.+)$/, ([_, d], { theme }) => {
      // @ts-expect-error >_<
      const hex: any = theme.colors?.[d]?.[400]
      if (hex) {
        return {
          "background-image": `radial-gradient(ellipse 80% 80% at 50% -30%,
         rgba(${hex2rgba(hex)?.join(", ")}, 0.3), rgba(255, 255, 255, 0));`,
        }
      }
    }],
    [
      "font-brand",
      {
        "font-family": `"Baloo 2", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", "Courier New", monospace; `,
      },
    ],
  ],
  shortcuts: {
    "color-base": "color-neutral-800 dark:color-neutral-300",
    "bg-base": "bg-zinc-200 dark:bg-dark-600",
    "btn": "op50 hover:op85 cursor-pointer transition-all",
  },
  safelist: [
    ...["orange", ...new Set(Object.values(sources).map(k => k.color))].map(k =>
      `bg-${k} color-${k} border-${k} sprinkle-${k} shadow-${k}
       bg-${k}-500 color-${k}-500
       dark:bg-${k} dark:color-${k}`.trim().split(/\s+/)).flat(),
    // DFL 主题额外需要的类
    'newsnow-card', 'newsnow-card__accent-bar', 'newsnow-card__list',
    'newsnow-card__rank', 'newsnow-card__name', 'newsnow-card__time',
    'newsnow-card__hot-tag', 'newsnow-card__item', 'newsnow-card__title',
    'newsnow-card--blue', 'newsnow-card--red', 'newsnow-card--green',
    'newsnow-card--plum', 'newsnow-card--orange', 'newsnow-card--gray',
    'newsnow-card--slate', 'newsnow-card--indigo', 'newsnow-card--emerald',
    'newsnow-card--teal',
  ],
  extendTheme: (theme) => {
    // @ts-expect-error >_<
    theme.colors.primary = theme.colors.red
    // DFL 色系映射：将 newsnow 平台色映射到 DFL 品牌色
    const dflMap: Record<string, { DEFAULT: string; 500: string }> = {
      blue:   { DEFAULT: '#3B7AB8', 500: '#3B7AB8' },   // DFL 普鲁士蓝
      red:    { DEFAULT: '#D14437', 500: '#D14437' },   // DFL 朱砂红
      green:  { DEFAULT: '#6B8E5A', 500: '#6B8E5A' },   // DFL 橄榄绿
      plum:   { DEFAULT: '#8B4A6B', 500: '#8B4A6B' },   // DFL 梅子紫
      orange: { DEFAULT: '#E8B23A', 500: '#E8B23A' },   // DFL 芥末黄（橙→黄）
      gray:   { DEFAULT: '#8B4A6B', 500: '#8B4A6B' },   // gray → DFL 梅子紫（抖音等）
      slate:  { DEFAULT: '#6B8E5A', 500: '#6B8E5A' },   // slate → DFL 橄榄绿
      indigo: { DEFAULT: '#3B7AB8', 500: '#3B7AB8' },   // indigo → DFL 蓝
      emerald:{ DEFAULT: '#6B8E5A', 500: '#6B8E5A' },   // emerald → DFL 绿
      teal:   { DEFAULT: '#6B8E5A', 500: '#6B8E5A' },   // teal → DFL 绿
    }
    Object.entries(dflMap).forEach(([k, v]) => {
      // @ts-expect-error >_<
      theme.colors[k] = v
    })
    return theme
  },
})
