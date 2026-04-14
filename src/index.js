#!/usr/bin/env node
/**
 * Claude Code Monitor - 主入口
 *
 * 使用方式:
 *   node src/index.js              # 正常启动
 *   node src/index.js -d           # 后台模式
 *   node src/index.js --background # 后台模式
 *   node src/index.js --no-tray    # 禁用托盘
 *   node src/index.js --no-notify  # 禁用通知
 */

import { createTUI } from './services/tui.js';
import { createTray } from './services/tray.js';
import { sendNotification } from './services/notifier.js';
import { getActiveSessions, getSessionWithStats } from './services/sessionParser.js';

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    background: args.includes('-d') || args.includes('--background'),
    noTray: args.includes('--no-tray'),
    noNotify: args.includes('--no-notify'),
    help: args.includes('-h') || args.includes('--help'),
  };
}

// 显示帮助信息
function showHelp() {
  console.log(`
Claude Code Monitor - 监控 Claude Code 执行状态

使用方式:
  claude-monitor [选项]

选项:
  -d, --background  后台模式，最小化到系统托盘
  --no-tray         禁用系统托盘
  --no-notify       禁用系统通知
  -h, --help        显示帮助信息

快捷键:
  ESC / q           退出程序
`);
}

// 检查待确认操作并发送通知
let lastPendingCount = 0;
function checkAndNotify(options) {
  if (options.noNotify) return;

  const sessions = getActiveSessions();
  const sessionsWithStats = sessions.map(s => getSessionWithStats(s));
  const allPending = sessionsWithStats.flatMap(s => s.pending || []);
  const currentCount = allPending.length;

  if (currentCount > lastPendingCount) {
    // 有新的待确认操作
    const newAction = allPending[allPending.length - 1];
    let message = '';
    if (newAction.input?.file_path) {
      message = `${newAction.tool}: ${newAction.input.file_path.split('/').pop()}`;
    } else if (newAction.input?.command) {
      message = `${newAction.tool}: ${newAction.input.command.slice(0, 50)}`;
    } else {
      message = `${newAction.tool}`;
    }
    sendNotification('Claude Code 需要确认', message);
  }

  lastPendingCount = currentCount;
}

// 主函数
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  let tui = null;
  let systray = null;

  // 创建托盘
  if (!options.noTray) {
    try {
      systray = await createTray({
        onShow: () => {
          if (!tui) {
            tui = createTUI(options);
          }
        },
        onHide: () => {
          if (tui) {
            tui.destroy();
            tui = null;
          }
        },
        onExit: () => {
          if (tui) {
            tui.destroy();
          }
          process.exit(0);
        },
      });
    } catch (error) {
      console.warn('系统托盘初始化失败:', error.message);
    }
  }

  // 启动 TUI（非后台模式）
  if (!options.background) {
    tui = createTUI(options);
  } else {
    // 后台模式提示
    console.log('Claude Code Monitor 已在后台运行');
    console.log('点击托盘图标可显示窗口');
    if (!options.noNotify) {
      sendNotification('Claude Monitor', '监控已在后台启动');
    }
  }

  // 定时检查通知
  const notifyTimer = setInterval(() => checkAndNotify(options), 2000);

  // 处理退出
  const cleanup = () => {
    clearInterval(notifyTimer);
    if (tui) {
      tui.destroy();
    }
    if (systray) {
      systray.kill();
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main().catch((error) => {
  console.error('启动失败:', error);
  process.exit(1);
});