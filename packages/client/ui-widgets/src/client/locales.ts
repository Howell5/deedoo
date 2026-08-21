/** Product copy for the Widgets application. */

export const en = {
  'nav': 'Widgets',
  'title': 'Widgets',
  'subtitle': 'Small local applications, made for the way you work.',
  'create': 'New Widget',
  'creating': 'Creating…',
  'import': 'Import folder',
  'edit': 'Talk to this Widget',
  'refresh': 'Refresh',
  'openSource': 'Open project',
  'more': 'More',
  'closePreview': 'Close preview',
  'showPreview': 'Show Widget preview',
  'hidePreview': 'Hide Widget preview',
  'previewNotFound': 'This session is not connected to an installed Widget project.',
  'aspectRatio': 'Change aspect ratio',
  'loading': 'Loading Widget…',
  'empty': 'No Widgets installed yet.',
  'emptyDetail': 'Create one with Agent, or import an existing local Widget project.',
  'failed': 'Widget could not be loaded',
  'overflow': 'Widget does not fit its canvas',
  'overflowDetail': 'The document exceeds its fixed canvas. Edit the project so every element fits without scrolling.',
  'network': 'Network access',
  'offline': 'Offline',
} as const

/** Simplified Chinese Widgets copy. */
export const zh: Record<keyof typeof en, string> = {
  'nav': 'Widgets 小组件',
  'title': 'Widgets',
  'subtitle': '为你的工作方式量身制作的本地小应用。',
  'create': '新建 Widget',
  'creating': '正在创建…',
  'import': '导入文件夹',
  'edit': '和它聊聊',
  'refresh': '刷新',
  'openSource': '打开项目',
  'more': '更多',
  'closePreview': '关闭预览',
  'showPreview': '打开 Widget 预览',
  'hidePreview': '关闭 Widget 预览',
  'previewNotFound': '当前会话没有关联到已安装的 Widget 项目。',
  'aspectRatio': '切换画布比例',
  'loading': '正在加载 Widget…',
  'empty': '还没有安装 Widget。',
  'emptyDetail': '直接让 Agent 创建，或者导入已有的本地 Widget 项目。',
  'failed': 'Widget 加载失败',
  'overflow': 'Widget 不适配当前画布',
  'overflowDetail': '页面内容超出了固定画布。请编辑项目，让所有元素无需滚动即可完整显示。',
  'network': '网络访问',
  'offline': '离线',
}

/** Locale keys owned by the Widgets application. */
export type WidgetsKey = keyof typeof en
