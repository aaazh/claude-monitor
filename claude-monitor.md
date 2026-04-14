# Claude Code Monitor

一个终端 TUI 工具，用于可视化监控 Claude Code 的执行进度和待确认操作。

## 功能特性

- **流畅 TUI 界面** - 基于 blessed 的无闪烁终端界面
- **实时监控** - 显示所有活跃的 Claude Code 会话
- **可视化进度** - 进度条展示执行进度
- **工具历史** - 显示最近的工具调用记录
- **系统托盘** - 支持最小化到托盘，后台运行
- **系统通知** - 待确认操作时自动弹出通知

## 安装

### 安装依赖

```bash
cd /Users/didi/project/claude-monitor
npm install
```

### 添加别名（推荐）

在 `~/.zshrc` 中添加：

```bash
# Claude Code Monitor
alias claude-monitor='node /Users/didi/project/claude-monitor/src/index.js'
```

然后执行：

```bash
source ~/.zshrc
```

## 使用方式

```bash
# 正常启动，显示 TUI 界面
claude-monitor

# 后台模式，最小化到系统托盘
claude-monitor -d
claude-monitor --background

# 禁用系统托盘
claude-monitor --no-tray

# 禁用系统通知
claude-monitor --no-notify

# 显示帮助
claude-monitor --help
```

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `ESC` | 退出程序 |
| `q` | 退出程序 |

## 界面说明

```
┌─────────────────────────────────────────────────┐
│            Claude Code Monitor                   │
├─────────────────────────────────────────────────┤
│  活跃会话                                        │
│                                                  │
│  会话 21a254a9...                               │
│  PID: 63040                                     │
│  工作目录: /Users/didi/project/xxx              │
│  状态: ● 运行中                                  │
│                                                  │
│  执行统计                                        │
│  ────────────────────────────────────────       │
│  进度: ████████░░░░░░░░░░░░ 40%                 │
│                                                  │
│  消息数: 5 用户 / 6 助手                         │
│  工具调用: 8 次                                  │
│                                                  │
│  ⏳ Claude 正在思考...                          │
│                                                  │
│  当前工具: Read                                  │
│                                                  │
│  最近工具调用                                    │
│    10秒前 Read claude-monitor.js                │
│    30秒前 Write claude-monitor.js               │
│                                                  │
│  ⚠ 需要确认的操作                               │
│    [Write]                                      │
│      文件: /path/to/file.ts                     │
│                                                  │
├─────────────────────────────────────────────────┤
│  最后更新: 16:30:45    按 ESC 或 q 退出         │
└─────────────────────────────────────────────────┘
```

## 系统托盘

当使用 `-d` 或 `--background` 参数启动时，程序会在后台运行并在系统托盘显示图标。

托盘菜单：
- 显示窗口 - 重新显示 TUI 界面
- 隐藏窗口 - 隐藏 TUI 界面
- 退出 - 完全退出程序

## 系统通知

当 Claude Code 有需要确认的操作时（如 Write、Edit、Bash），会自动弹出系统通知：
- macOS: 通知中心
- Windows: Toast 通知
- Linux: notify-send

## 项目结构

```
claude-monitor/
├── package.json              # 项目配置
├── src/
│   ├── index.js              # 入口文件
│   ├── services/
│   │   ├── tui.js            # TUI 界面 (blessed)
│   │   ├── tray.js           # 托盘服务
│   │   ├── notifier.js       # 通知服务
│   │   └── sessionParser.js  # 会话解析
│   └── utils/
│       └── format.js         # 格式化工具
├── assets/
│   └── icon.png              # 托盘图标 (可选)
└── claude-monitor.js         # 旧版本备份
```

## 注意事项

1. 需要 Node.js 18+ 和 npm
2. 系统托盘功能在 macOS/Windows/Linux 上均可用
3. 通知功能需要系统通知权限
4. 按 ESC 或 q 可退出程序

## 版本历史

- **v2.0.0** - 重构为 blessed TUI，添加系统托盘和通知支持
- **v1.0.0** - 初始版本，基于 ANSI 转义码