# Naive UI SSR Spike（M0）

本文件记录 M0 阶段对 **Naive UI + Nuxt 3 SSR** 的可行性验证（spike）。验收后
`pages/spike.vue` 保留为 e2e 冒烟页。

## 验证目标

在 Nuxt 3 SSR 下确认：

1. Naive UI 组件可被服务端渲染，且 `@css-render/vue3-ssr` 能正确收集首屏样式。
2. `pnpm build` 与 `node .output/server/index.mjs` 启动后无水合（hydration）报错。
3. 明暗主题防闪烁内联脚本（对齐旧 `src/lib/theme/theme.ts` 第 14–24 行逻辑）可经
   `useHead` 注入并在首帧前生效。

## 实现要点

- **全局注册**：`plugins/naive-ui.ts` 通过 `nuxtApp.vueApp.use(naive)` 注册全部 Naive
  UI 组件，页面即可直接使用 `<n-*>` 标签。
- **样式收集**：同一插件在 `import.meta.server` 分支内调用
  `setup(nuxtApp.vueApp)`（`@css-render/vue3-ssr`），在 `app:rendered` 钩子中
  `collect()` 收集 css-render 样式，并通过 `useHead` 以 `<style>` 注入 `<head>`。
- **主题防闪烁**：`shared/theme.ts` 提供 `THEME_INITIALIZATION_SCRIPT`，经
  `app.vue` 的 `useHead({ script: [{ innerHTML }] })` 注入。脚本同步解析
  `localStorage` 偏好并回退 `prefers-color-scheme`，在首帧前写入
  `document.documentElement` 的 `data-theme`。Naive UI 主题经
  `composables/useColorTheme.ts` 在 `onMounted` 后同步，避免水合不一致。

## 验证结果

渲染的组件（`pages/spike.vue`）：`n-form`、`n-data-table`、`n-modal`，并覆盖
`n-config-provider` / `n-message-provider` / `n-dialog-provider` / `n-card` /
`n-button` / `n-input` / `n-select` / `n-space` / `n-h1` / `n-text`。

| 门禁 | 结果 |
| --- | --- |
| `pnpm build` | ✅ 通过（`.output` 产物生成） |
| `node .output/server/index.mjs` | ✅ 启动并响应 `/`（200）与 `/spike`（200） |
| SSR 样式收集 | ✅ `/spike` HTML 注入 20 个 `<style>`（含 `--n-*` 变量） |
| 主题防闪烁脚本 | ✅ `data-theme` 内联脚本存在 |
| `pnpm test:e2e`（Chromium） | ✅ 2 passed，0 console error，0 hydration error |

## SSR 不兼容组件清单

**空清单。** 本次验证涉及的所有 Naive UI 组件均可在 Nuxt 3 SSR 下正常渲染并完成
水合，未发现需要 `<ClientOnly>` 包裹或仅客户端渲染的组件。

> 说明：`n-modal` 默认 `show = false`，其弹层内容由客户端交互触发渲染，未参与首屏
> SSR；打开交互已在 e2e 中验证。后续如引入新的弹层/传送门类组件，应在此清单补充
> 复测结论。

## 复现方式

```powershell
corepack pnpm@10.33.0 install
corepack pnpm@10.33.0 build
node .output/server/index.mjs        # 访问 / 与 /spike
corepack pnpm@10.33.0 test:e2e       # Chromium 冒烟（含水合/控制台断言）
```
