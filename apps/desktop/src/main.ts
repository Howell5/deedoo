/**
 * DeepSeek Harness desktop shell.
 *
 * The renderer remains sandboxed and loads the shipped Web client. The
 * Harness profile runs in an Electron Utility Process so a backend crash does
 * not take down the native shell. This first carrier uses an OS-assigned
 * loopback port; the client/host protocol already leaves room for replacing
 * it with IPC without changing the product UI.
 */
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import {
  app,
  BrowserWindow,
  dialog,
  Menu,
  nativeTheme,
  session,
  shell,
  utilityProcess,
  type MenuItemConstructorOptions,
  type UtilityProcess,
} from 'electron'

const APP_NAME = 'DeepSeek Harness'
const BACKEND_READY = /dsh web: (http:\/\/127\.0\.0\.1:\d+)/
const STARTUP_TIMEOUT_MS = 120_000
const SHUTDOWN_TIMEOUT_MS = 8_000
const LOG_TAIL_LINES = 80
const moduleDir = dirname(fileURLToPath(import.meta.url))
const startupPage = join(moduleDir, '../assets/startup.html')
const require = createRequire(import.meta.url)

let mainWindow: BrowserWindow | undefined
let backend: UtilityProcess | undefined
let backendUrl: string | undefined
let backendGeneration = 0
let stopping = false
let quitting = false
let logTail: string[] = []

function appendLog(source: 'stdout' | 'stderr', chunk: Buffer | string): void {
  const text = String(chunk)
  const sink = source === 'stderr' ? console.error : console.log
  sink(`[harness:${source}] ${text.trimEnd()}`)
  const lines = text
    .split(/\r?\n/)
    .filter(line => line !== '')
    .map(line => `[${source}] ${line}`)
  logTail = [...logTail, ...lines].slice(-LOG_TAIL_LINES)
}

function resolveCliBin(): string {
  const manifest = require.resolve('@deepseek-ai/dsh/package.json')
  return join(dirname(manifest), 'lib/bin.js')
}

function backgroundColor(): string {
  return nativeTheme.shouldUseDarkColors ? '#17191d' : '#f7f8fa'
}

function isExternalUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}

function configureNavigation(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalUrl(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event, url) => {
    const allowed = (() => {
      if (url.startsWith('file:')) return url === pathToFileURL(startupPage).href
      if (backendUrl === undefined) return false
      try {
        return new URL(url).origin === new URL(backendUrl).origin
      } catch {
        return false
      }
    })()
    if (allowed) return
    event.preventDefault()
    if (isExternalUrl(url)) void shell.openExternal(url)
  })
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    title: APP_NAME,
    width: 1400,
    height: 900,
    minWidth: 920,
    minHeight: 640,
    show: false,
    backgroundColor: backgroundColor(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      navigateOnDragDrop: false,
      partition: 'persist:dsh-desktop',
    },
  })
  configureNavigation(window)
  window.once('ready-to-show', () => { window.show() })
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = undefined
  })
  void window.loadFile(startupPage)
  mainWindow = window
  if (backendUrl !== undefined) void window.loadURL(backendUrl)
  return window
}

function showStartupPage(): void {
  if (mainWindow === undefined) createWindow()
  else void mainWindow.loadFile(startupPage)
}

function backendErrorMessage(reason: string): string {
  const details = logTail.length === 0 ? '后端没有输出诊断信息。' : logTail.join('\n')
  return `${reason}\n\n最近的启动日志：\n${details}`
}

async function offerRecovery(reason: string): Promise<void> {
  if (quitting) return
  const owner = mainWindow
  const options = {
    type: 'error' as const,
    title: `${APP_NAME} 启动失败`,
    message: 'DeepSeek Harness 后端未能启动',
    detail: backendErrorMessage(reason),
    buttons: ['重试', '退出'],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  }
  const result = owner === undefined
    ? await dialog.showMessageBox(options)
    : await dialog.showMessageBox(owner, options)
  if (result.response === 0) {
    await restartBackend()
    return
  }
  app.quit()
}

function pipeBackendOutput(child: UtilityProcess, generation: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let stdoutBuffer = ''
    let settled = false
    const timeout = setTimeout(() => {
      if (settled || generation !== backendGeneration) return
      settled = true
      reject(new Error(`启动超过 ${String(STARTUP_TIMEOUT_MS / 1000)} 秒仍未就绪`))
    }, STARTUP_TIMEOUT_MS)

    const cleanup = (): void => { clearTimeout(timeout) }
    child.stdout?.on('data', (chunk: Buffer) => {
      appendLog('stdout', chunk)
      if (settled || generation !== backendGeneration) return
      stdoutBuffer = (stdoutBuffer + chunk.toString()).slice(-4096)
      const match = BACKEND_READY.exec(stdoutBuffer)
      if (match?.[1] === undefined) return
      settled = true
      cleanup()
      resolve(match[1])
    })
    child.stderr?.on('data', (chunk: Buffer) => { appendLog('stderr', chunk) })
    child.once('exit', (code) => {
      cleanup()
      if (settled || generation !== backendGeneration || stopping || quitting) return
      settled = true
      reject(new Error(`后端进程已退出（代码 ${String(code)}）`))
    })
    child.once('error', (type, location) => {
      cleanup()
      if (settled || generation !== backendGeneration) return
      settled = true
      reject(new Error(`后端进程发生 ${type}：${location}`))
    })
  })
}

async function startBackend(): Promise<void> {
  const generation = ++backendGeneration
  logTail = []
  backendUrl = undefined
  showStartupPage()

  const child = utilityProcess.fork(resolveCliBin(), ['web', '--port', '0'], {
    cwd: process.env.DSH_CWD?.trim() || homedir(),
    execArgv: ['--expose-internals'],
    env: {
      ...process.env,
      DSH_DESKTOP: '1',
    },
    stdio: 'pipe',
    serviceName: 'DeepSeek Harness Backend',
  })
  backend = child
  child.once('spawn', () => {
    console.log(`[desktop] Harness backend spawned (pid ${String(child.pid)})`)
  })

  try {
    const url = await pipeBackendOutput(child, generation)
    if (generation !== backendGeneration || backend !== child || quitting) return
    backendUrl = url
    if (mainWindow === undefined) createWindow()
    else await mainWindow.loadURL(url)
    child.once('exit', (code) => {
      if (generation !== backendGeneration || backend !== child || stopping || quitting) return
      backend = undefined
      backendUrl = undefined
      showStartupPage()
      void offerRecovery(`后端进程意外退出（代码 ${String(code)}）`)
    })
  } catch (error) {
    if (generation !== backendGeneration || stopping || quitting) return
    console.error('[desktop] Harness backend failed:', error)
    backend = undefined
    child.kill()
    await offerRecovery(error instanceof Error ? error.message : String(error))
  }
}

async function stopBackend(): Promise<void> {
  const child = backend
  backend = undefined
  backendUrl = undefined
  ++backendGeneration
  if (child === undefined || child.pid === undefined) return
  stopping = true
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, SHUTDOWN_TIMEOUT_MS)
    child.once('exit', () => {
      clearTimeout(timeout)
      resolve()
    })
    child.kill()
  })
  stopping = false
}

async function restartBackend(): Promise<void> {
  if (stopping || quitting) return
  showStartupPage()
  await stopBackend()
  await startBackend()
}

function installMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin'
      ? [{
        label: APP_NAME,
        submenu: [
          { role: 'about' as const },
          { type: 'separator' as const },
          { role: 'hide' as const },
          { role: 'hideOthers' as const },
          { role: 'unhide' as const },
          { type: 'separator' as const },
          { role: 'quit' as const },
        ],
      }]
      : []),
    {
      label: '编辑',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload' },
        {
          label: '重新启动后端',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => { void restartBackend() },
        },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      role: 'window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

const hasSingleInstanceLock = app.requestSingleInstanceLock()
if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.setName(APP_NAME)
  app.on('second-instance', () => {
    const window = mainWindow ?? createWindow()
    if (window.isMinimized()) window.restore()
    window.show()
    window.focus()
  })

  app.whenReady().then(async () => {
    installMenu()
    session.fromPartition('persist:dsh-desktop')
      .setPermissionRequestHandler((_webContents, _permission, callback) => { callback(false) })
    createWindow()
    await startBackend()
  }).catch(async (error: unknown) => {
    console.error('[desktop] application startup failed:', error)
    await offerRecovery(error instanceof Error ? error.message : String(error))
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', (event) => {
    if (quitting || backend === undefined) return
    event.preventDefault()
    quitting = true
    void stopBackend().finally(() => { app.quit() })
  })
}
