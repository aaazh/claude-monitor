/**
 * 会话数据解析服务
 * 负责读取和解析 Claude Code 会话数据
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

// 配置
const MAX_TOOL_HISTORY = 10;
const claudeDir = path.join(os.homedir(), '.claude');

/**
 * 获取活跃会话列表
 */
export function getActiveSessions() {
  const sessionsDir = path.join(claudeDir, 'sessions');
  const sessions = [];

  if (!fs.existsSync(sessionsDir)) return sessions;

  const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(sessionsDir, file), 'utf-8');
      const session = JSON.parse(content);
      // 检查进程是否还在运行
      let active = true;
      try {
        process.kill(session.pid, 0);
      } catch {
        active = false;
      }
      sessions.push({ ...session, pidFile: file, active });
    } catch {
      // 忽略解析错误
    }
  }
  return sessions;
}

/**
 * 获取项目会话数据
 */
export function getProjectSessionData(projectPath, sessionId) {
  const projectDir = path.join(claudeDir, 'projects', projectPath.replace(/\//g, '-'));
  const sessionFile = path.join(projectDir, `${sessionId}.jsonl`);

  if (!fs.existsSync(sessionFile)) return null;

  const content = fs.readFileSync(sessionFile, 'utf-8');
  const lines = content.trim().split('\n');
  const events = lines.map(line => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);

  return events;
}

/**
 * 分析会话状态
 */
export function analyzeSession(events) {
  const stats = {
    totalEvents: events.length,
    toolCalls: 0,
    messages: 0,
    userMessages: 0,
    assistantMessages: 0,
    pendingConfirmations: 0,
    lastActivity: null,
    currentTool: null,
    toolHistory: [],
    thinking: false,
    lastUserMessage: null,
  };

  for (const event of events) {
    if (event.type === 'assistant') {
      stats.assistantMessages++;
      if (event.message?.content) {
        for (const content of event.message.content) {
          if (content.type === 'tool_use') {
            stats.toolCalls++;
            stats.currentTool = content.name;
            stats.toolHistory.push({
              name: content.name,
              time: event.timestamp,
              input: content.input,
            });
          }
          if (content.type === 'thinking') {
            stats.thinking = true;
          }
        }
      }
    }
    if (event.type === 'user') {
      stats.userMessages++;
    }
    stats.lastActivity = event.timestamp;
  }

  // 只保留最近的工具调用
  stats.toolHistory = stats.toolHistory.slice(-MAX_TOOL_HISTORY);

  return stats;
}

/**
 * 检查是否有待确认的操作
 */
export function checkPendingConfirmations(events) {
  const pending = [];

  // 检查最近的工具调用是否需要确认
  for (let i = events.length - 1; i >= Math.max(0, events.length - 20); i--) {
    const event = events[i];
    if (event.type === 'assistant' && event.message?.content) {
      for (const content of event.message.content) {
        if (content.type === 'tool_use') {
          // 这些工具通常需要用户确认
          const needsConfirmation = ['Write', 'Edit', 'Bash'].includes(content.name);

          // 检查是否有对应的 tool_result
          const hasResult = events.slice(i + 1).some(e =>
            e.type === 'user' && e.message?.content?.some(c =>
              c.type === 'tool_result' && c.tool_use_id === content.id
            )
          );

          if (needsConfirmation && !hasResult) {
            pending.push({
              tool: content.name,
              input: content.input,
              time: event.timestamp,
            });
          }
        }
      }
    }
  }

  return pending;
}

/**
 * 获取会话完整信息（合并会话元数据和统计数据）
 */
export function getSessionWithStats(session) {
  const events = getProjectSessionData(session.cwd, session.sessionId);
  if (!events) {
    return { ...session, stats: null, pending: [] };
  }

  const stats = analyzeSession(events);
  const pending = checkPendingConfirmations(events);

  return { ...session, stats, pending };
}