/**
 * Blessed TUI 界面
 */

import blessed from 'blessed';
import contrib from 'blessed-contrib';
import { formatRelativeTime, formatCurrentTime, truncate, getToolInputSummary } from '../utils/format.js';
import { getActiveSessions, getSessionWithStats } from '../services/sessionParser.js';

const PROGRESS_MAX_TOOLS = 20;

/**
 * 创建 TUI 界面
 * @param {Object} options
 * @returns {Object} 界面实例
 */
export function createTUI(options = {}) {
  // 创建屏幕
  const screen = blessed.screen({
    smartCSR: true,
    title: 'Claude Code Monitor',
    fullUnicode: true,
  });

  // 创建布局
  const grid = new contrib.grid({ rows: 12, cols: 12, screen });

  // 标题栏
  const header = grid.set(0, 0, 1, 12, blessed.box, {
    content: '{center}{bold}{blue-fg}Claude Code Monitor{/blue-fg}{/bold}{/center}',
    tags: true,
    style: {
      bg: 'black',
    },
  });

  // 主内容区 - 会话列表
  const mainBox = grid.set(1, 0, 10, 12, blessed.box, {
    label: ' 活跃会话 ',
    content: '',
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: ' ',
      track: {
        bg: 'blue',
      },
      style: {
        inverse: true,
      },
    },
    style: {
      border: {
        fg: 'blue',
      },
    },
  });

  // 底部状态栏
  const footer = grid.set(11, 0, 1, 12, blessed.box, {
    content: '',
    tags: true,
    style: {
      bg: 'black',
    },
  });

  // 渲染会话内容
  function renderSessions() {
    const sessions = getActiveSessions();
    const sessionsWithStats = sessions.map(s => getSessionWithStats(s));

    let content = '';

    if (sessionsWithStats.length === 0) {
      content = '{yellow-fg}没有发现活跃的 Claude Code 会话{/yellow-fg}\n请确保 Claude Code 正在运行';
    } else {
      sessionsWithStats.forEach((session, index) => {
        const statusColor = session.active ? 'green' : 'red';
        const statusText = session.active ? '● 运行中' : '○ 已停止';

        content += `{bold}会话 ${session.sessionId?.slice(0, 8)}...{/bold}\n`;
        content += `{grey-fg}PID: ${session.pid}{/grey-fg}\n`;
        content += `{grey-fg}工作目录: ${session.cwd}{/grey-fg}\n`;
        content += `{${statusColor}-fg}状态: ${statusText}{/${statusColor}-fg}\n`;

        if (session.stats) {
          const stats = session.stats;
          content += `\n{bold}{magenta-fg}执行统计{/magenta-fg}{/bold}\n`;
          content += `{grey-fg}${'─'.repeat(40)}{/grey-fg}\n`;

          // 进度条
          const progress = Math.min(1, stats.toolCalls / PROGRESS_MAX_TOOLS);
          const percent = Math.round(progress * 100);
          const filled = Math.round(20 * progress);
          const empty = 20 - filled;
          content += `进度: {green-fg}${'█'.repeat(filled)}{/green-fg}{grey-fg}${'░'.repeat(empty)}{/grey-fg} ${percent}%\n`;

          content += `\n{cyan-fg}消息数:{/cyan-fg} ${stats.userMessages} 用户 / ${stats.assistantMessages} 助手\n`;
          content += `{cyan-fg}工具调用:{/cyan-fg} ${stats.toolCalls} 次\n`;

          // 思考状态
          if (stats.thinking) {
            content += `\n{yellow-fg}⏳ Claude 正在思考...{/yellow-fg}\n`;
          }

          // 当前工具
          if (stats.currentTool && !stats.thinking) {
            content += `\n{blue-fg}当前工具: ${stats.currentTool}{/blue-fg}\n`;
          }

          // 工具历史
          if (stats.toolHistory?.length > 0) {
            content += `\n{bold}{magenta-fg}最近工具调用{/magenta-fg}{/bold}\n`;
            stats.toolHistory.slice(-5).forEach(tool => {
              const time = formatRelativeTime(tool.time);
              const summary = getToolInputSummary(tool);
              content += `{grey-fg}  ${time}{/grey-fg} {green-fg}${tool.name}{/green-fg} {grey-fg}${summary}{/grey-fg}\n`;
            });
          }

          // 待确认操作
          if (session.pending?.length > 0) {
            content += `\n{bold}{yellow-bg}{black-fg} ⚠ 需要确认的操作 {/black-fg}{/yellow-bg}{/bold}\n`;
            session.pending.forEach(action => {
              content += `{yellow-fg}  [${action.tool}]{/yellow-fg}\n`;
              if (action.input?.file_path) {
                content += `{grey-fg}    文件: ${action.input.file_path}{/grey-fg}\n`;
              }
              if (action.input?.command) {
                content += `{grey-fg}    命令: ${truncate(action.input.command, 50)}{/grey-fg}\n`;
              }
            });
          }
        }

        if (index < sessionsWithStats.length - 1) {
          content += `\n{grey-fg}${'─'.repeat(50)}{/grey-fg}\n\n`;
        }
      });
    }

    mainBox.setContent(content);
    screen.render();
  }

  // 更新底部状态栏
  function updateFooter() {
    const time = formatCurrentTime();
    footer.setContent(`{grey-fg}最后更新: ${time}{/grey-fg}  |  {grey-fg}按 ESC 或 q 退出{/grey-fg}`);
  }

  // 初始渲染
  renderSessions();
  updateFooter();

  // 定时刷新
  const refreshInterval = options.refreshInterval || 2000;
  const timer = setInterval(() => {
    renderSessions();
    updateFooter();
  }, refreshInterval);

  // 键盘事件
  screen.key(['escape', 'q'], () => {
    clearInterval(timer);
    screen.destroy();
    process.exit(0);
  });

  // 窗口大小变化
  screen.on('resize', () => {
    screen.render();
  });

  return {
    screen,
    refresh: renderSessions,
    destroy: () => {
      clearInterval(timer);
      screen.destroy();
    },
  };
}