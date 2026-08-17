# Deedoo Desktop 分发与首次安装

零成本分发决策：不购买代码签名证书（无 App Store、无付费 Developer ID），
依赖包管理器渠道与明确的首次安装说明。详见下文"签名决策"。

## 分发渠道

| 渠道 | 平台 | 首次安装体验 |
|---|---|---|
| GitHub Releases 直接下载（DMG/ZIP） | macOS | Gatekeeper 弹"无法验证开发者"，需右键打开（见下） |
| GitHub Releases 直接下载（NSIS） | Windows | SmartScreen 弹"未知发布者"，需"更多信息 → 仍要运行" |
| Homebrew Cask（规划中） | macOS | 无警告（渠道代为签名） |
| winget（规划中） | Windows | 无警告（渠道代为签名） |
| AppImage（规划中） | Linux | 无强制签名 |

## macOS 首次安装（Gatekeeper）

未签名应用首次打开会被 Gatekeeper 拦截：

1. 下载 `Deedoo-*.dmg`，双击挂载，把应用拖入"应用程序"
2. 首次打开：Finder 中找到应用 → **右键（或按住 Control 点击）→ 打开**
3. 在弹出的对话框点 **"打开"** —— 之后正常双击即可

> 不要双击就弹"无法打开，因为无法验证开发者"——右键打开是绕过验证的官方路径。

## Windows 首次安装（SmartScreen）

1. 运行安装包（NSIS 的 `.exe`）
2. SmartScreen 弹出"Windows 已保护你的电脑" → 点 **"更多信息"**
3. 点 **"仍要运行"**

## 签名决策（零成本路线）

| 项 | 决策 |
|---|---|
| 发布形态 | 未签名 / ad-hoc，直接下载 + 包管理器渠道 |
| macOS | 不买 Developer ID（$99/年）——Gatekeeper 右键打开说明兜底 |
| Windows | 不买 Authenticode 证书——SmartScreen 说明兜底；后续可用 Azure Trusted Signing 按量补 |
| 升级触发条件 | ① 每周都听到有人问"为什么有警告" ② 企业/采购开始把"是否签名"当合规项 |
| 升级顺序 | 先 macOS Developer ID（$99/年，自动更新硬前提），再 Windows |

> 注意：自动更新（electron-updater 类）在 macOS 上要求签名+公证。当前
> "自动检测 + 跳下载页手动更新"路线不受此限制；未来若做应用内自动替换，
> 必须先付苹果的 $99/年。

## 更新管线（配套）

- 上游检测：npm `@deepseek-ai/dsh` `latest` dist-tag（`pnpm run update:check`）
- 自动打包：`.github/workflows/deedoo-release.yml`（每 6h + 手动 dispatch）
- 用户端提示：设置面板右下角（`settings.footer` 槽位，`@deepseek-ai/dsh-client-ui-update`）

## Homebrew Cask（规划）

1. Fork [homebrew-cask](https://github.com/Homebrew/homebrew-cask)
2. 新建 `Casks/d/deedoo.rb`，`cask "deedoo"` 指向 GitHub Release 的 zip
   URL 与 `sha256`
3. 提交 PR；Cask 安装后 Gatekeeper 不再拦截（Homebrew 处理 quarantine 属性）

## winget（规划）

1. 在 [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs) 提交
   manifest（`manifests/h/Howell5/Deedoo/<version>/`）
2. 指向 NSIS 安装包 URL + 哈希；发布后 `winget install` 无 SmartScreen 警告
