/**
 * Blessed TUI 界面
 */

import blessed from 'blessed';
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

  // 标题栏
  const header = blessed.box({
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    content: '{center}{bold}{blue-fg} Claude Code Monitor {/blue-fg}{/bold}{/center}',
    tags: true,
    style: {
      bg: 'black',
    },
  });

  // 简略状态栏 - 显示所有会话的快速概览
  const statusLine = blessed.box({
    top: 1,
    left: 0,
    right: 0,
    height: 1,
    content: '',
    tags: true,
    style: {
      bg: 'black',
      fg: 'white',
    },
  });

  // 主内容区 - 会话列表（可滚动）
  const mainBox = blessed.box({
    top: 2,
    left: 0,
    right: 0,
    bottom: 1,
    content: '',
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    vi: true,
    scrollbar: {
      ch: ' ',
      track: {
        bg: 'blue',
      },
      style: {
        inverse: true,
      },
    },
    border: {
      type: 'line',
    },
    style: {
      border: {
        fg: 'blue',
      },
    },
  });

  // 底部状态栏
  const footer = blessed.box({
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    content: '',
    tags: true,
    style: {
      bg: 'black',
    },
  });

  screen.append(header);
  screen.append(statusLine);
  screen.append(mainBox);
  screen.append(footer);

  // 渲染简略状态栏 - 一行显示所有会话进度
  function renderStatusLine(sessionsWithStats) {
    if (sessionsWithStats.length === 0) {
      statusLine.setContent('{yellow-fg}没有活跃会话{/yellow-fg}');
      return;
    }

    const parts = sessionsWithStats.map(session => {
      const stats = session.stats;
      const progress = stats ? Math.min(100, Math.round((stats.toolCalls / PROGRESS_MAX_TOOLS) * 100)) : 0;
      const shortId = session.sessionId?.slice(0, 6) || '??????';
      const status = session.active ? '●' : '○';
      const pending = session.pending?.length || 0;

      // 进度条微型版
      const filled = Math.round(progress / 10);
      const bar = '▓'.repeat(filled) + '░'.repeat(10 - filled);

      let text = `${status}${shortId}[${bar}]${progress}%`;
      if (pending > 0) {
        text += `{yellow-fg}⚠${pending}{/yellow-fg}`;
      }
      return text;
    });

    statusLine.setContent(parts.join(' │ '));
  }

  // 渲染会话内容
  function renderSessions() {
    const sessions = getActiveSessions();
    const sessionsWithStats = sessions.map(s => getSessionWithStats(s));

    // 更新简略状态栏
    renderStatusLine(sessionsWithStats);

    let content = '';

    if (sessionsWithStats.length === 0) {
      content = '\n{yellow-fg}没有发现活跃的 Claude Code 会话{/yellow-fg}\n请确保 Claude Code 正在运行';
    } else {
      sessionsWithStats.forEach((session, index) => {
        const statusColor = session.active ? 'green' : 'red';
        const statusText = session.active ? '● 运行中' : '○ 已停止';

        // 会话标题
        content += `{bold}{cyan-fg}━━━ 会话 ${index + 1}/${sessionsWithStats.length}: ${session.sessionId?.slice(0, 8)}... ━━━{/cyan-fg}{/bold}\n`;
        content += `{grey-fg}PID: ${session.pid} | 目录: ${session.cwd.split('/').pop()}{/grey-fg}\n`;
        content += `{${statusColor}-fg}状态: ${statusText}{/${statusColor}-fg}\n`;

        if (session.stats) {
          const stats = session.stats;
          content += `{grey-fg}────────────────────────────────────────{/grey-fg}\n`;

          // 进度条
          const progress = Math.min(1, stats.toolCalls / PROGRESS_MAX_TOOLS);
          const percent = Math.round(progress * 100);
          const filled = Math.round(20 * progress);
          const empty = 20 - filled;
          content += `进度: {green-fg}${'█'.repeat(filled)}{/green-fg}{grey-fg}${'░'.repeat(empty)}{/grey-fg} ${percent}%`;
          content += `  消息: ${stats.userMessages}/${stats.assistantMessages}  工具: ${stats.toolCalls}次\n`;

          // 思考状态
          if (stats.thinking) {
            content += `{yellow-fg}⏳ 思考中...{/yellow-fg} `;
          }

          // 当前工具
          if (stats.currentTool) {
            content += `{blue-fg}当前: ${stats.currentTool}{/blue-fg}\n`;
          } else {
            content += '\n';
          }

          // 工具历史（精简版，最多3个）
          if (stats.toolHistory?.length > 0) {
            content += `{magenta-fg}最近:{/magenta-fg} `;
            const recent = stats.toolHistory.slice(-3);
            content += recent.map(tool => {
              const summary = getToolInputSummary(tool);
              return `{green-fg}${tool.name}{/green-fg}${summary ? ` ${summary}` : ''}`;
            }).join(' → ');
            content += '\n';
          }

          // 待确认操作
          if (session.pending?.length > 0) {
            content += `\n{bold}{yellow-bg}{black-fg} ⚠ 待确认 ×${session.pending.length} {/black-fg}{/yellow-bg}{/bold}\n`;
            session.pending.slice(0, 3).forEach(action => {
              content += `  {yellow-fg}[${action.tool}]{/yellow-fg} `;
              if (action.input?.file_path) {
                content += action.input.file_path.split('/').pop();
              } else if (action.input?.command) {
                content += truncate(action.input.command, 30);
              }
              content += '\n';
            });
            if (session.pending.length > 3) {
              content += `  {grey-fg}... 还有 ${session.pending.length - 3} 个{/grey-fg}\n`;
            }
          }
        }

        content += '\n';
      });
    }

    mainBox.setContent(content);
    screen.render();
  }

  // 更新底部状态栏
  function updateFooter(sessionsWithStats) {
    const time = formatCurrentTime();
    const totalPending = sessionsWithStats.reduce((sum, s) => sum + (s.pending?.length || 0), 0);
    let status = `{grey-fg}更新: ${time}{/grey-fg}  |  {grey-fg}会话: ${sessionsWithStats.length}{/grey-fg}`;
    if (totalPending > 0) {
      status += `  |  {yellow-fg}待确认: ${totalPending}{/yellow-fg}`;
    }
    status += `  |  {grey-fg}↑↓滚动 PgUp/PgDn翻页 ESC/q退出{/grey-fg}`;
    footer.setContent(status);
  }

  // 初始渲染
  const initialSessions = getActiveSessions().map(s => getSessionWithStats(s));
  renderSessions();
  updateFooter(initialSessions);

  // 定时刷新
  const refreshInterval = options.refreshInterval || 2000;
  const timer = setInterval(() => {
    renderSessions();
    const sessions = getActiveSessions().map(s => getSessionWithStats(s));
    updateFooter(sessions);
  }, refreshInterval);

  // 键盘事件
  screen.key(['escape', 'q'], () => {
    clearInterval(timer);
    screen.destroy();
    process.exit(0);
  });

  // 上下键滚动
  screen.key(['up'], () => {
    mainBox.scroll(-1);
    screen.render();
  });

  screen.key(['down'], () => {
    mainBox.scroll(1);
    screen.render();
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