# Agent Note: Ad-hoc 签名 macOS 发布产物

Status: implemented

[English](2026-08-18-adhoc-sign-macos-release-artifacts.md) | 中文

## Problem

首个 Deedoo 桌面版本（v0.1.0-rc.7，由 `deedoo-release.yml` 构建）无法打开：
macOS 报"DeepSeek Harness 已损坏，无法打开。你应该将它移到废纸篓"。零成本分发
决策通过设置 `CSC_IDENTITY_AUTO_DISCOVERY=false` 跳过代码签名，这让
electron-builder 26 返回 null identity 并完全跳过签名。Electron 43 二进制自带
linker 生成的 ad-hoc 签名，要求封存 bundle 资源；没有 bundle 级 `codesign`
步骤就没有 `_CodeSignature/CodeResources`，`codesign --verify` 报 "code has no
resources but signature indicates they must be present"。Gatekeeper 把这种
无效的半签名状态判定为"已损坏"而非"未验证开发者"，没有任何放行入口。

## Decision

`apps/desktop/package.json` 设置 `build.mac.identity: "-"`，让 electron-builder
对整个 bundle（含全部嵌套 helper 与 framework）做 ad-hoc 签名并生成
`_CodeSignature/CodeResources`；同时设置 `build.mac.hardenedRuntime: false`，
因为 ad-hoc 签名 + hardened runtime 需要
`com.apple.security.cs.disable-library-validation` entitlement，否则应用启动
时会被库校验拦截。`deedoo-release.yml` 保留 `CSC_IDENTITY_AUTO_DISCOVERY=false`
防止本机钥匙串里的意外身份劫持零成本决策；显式 `identity` 本来就会绕过自动发现。
结果是有效的 ad-hoc 签名：`codesign --verify` 通过，Gatekeeper 走标准的
"无法验证开发者"右键打开路径，`spctl` 报 `rejected` 而非 damaged。已通过对损坏的
rc.7 bundle 执行 `codesign --force --deep --sign -` 验证：`codesign --verify
--deep --strict` 与 `spctl` 的结果都如预期变化。

## Alternatives considered

**用 afterPack / afterSign hook 做 ad-hoc 签名。** 未发生签名时 electron-builder
会完全跳过 `afterSign` hook（"skipping afterSign hook as no signing occurred,
perhaps you intended afterPack"）；`afterPack` hook 则是在重复配置级 identity
已经做的事。配置项是一行、first-party，且能随 staged 的 `dist/app/package.json`
一起生效。

**剥除 linker 签名（`codesign --remove-signature`）。** 得到真正未签名的应用，
但需要遍历 bundle 里每个 Mach-O，而 ad-hoc 签名后的点击通过状态正是文档化的
零成本流程。

**购买 Developer ID 证书。** 被零成本分发决策否决；将来拿到真证书时把
`identity: "-"` 去掉即可。

## Consequences

DMG 与 ZIP 产物携带有效 ad-hoc 签名，Gatekeeper 走点击通过而不是硬性
"已损坏"拒绝。`hardenedRuntime` 保持关闭，在付费证书到位前应用没有运行时加固。
已损坏的 v0.1.0-rc.7 release 与 tag 需要删除，下次流水线运行才能以修复后的
产物重新发布同一版本。
