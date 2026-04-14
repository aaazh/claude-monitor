/**
 * 格式化工具函数
 */

/**
 * 格式化相对时间
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return 'N/A';
  const now = Date.now();
  const diff = now - new Date(timestamp).getTime();
  if (diff < 1000) return '刚刚';
  if (diff < 60000) return `${Math.floor(diff / 1000)}秒前`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  return `${Math.floor(diff / 3600000)}小时前`;
}

/**
 * 格式化当前时间
 */
export function formatCurrentTime() {
  return new Date().toLocaleTimeString('zh-CN');
}

/**
 * 截断字符串
 */
export function truncate(str, maxLength) {
  if (!str) return '';
  return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
}

/**
 * 获取工具输入摘要
 */
export function getToolInputSummary(tool) {
  if (!tool.input) return '';

  if (tool.input.file_path) {
    return tool.input.file_path.split('/').pop();
  }
  if (tool.input.command) {
    return truncate(tool.input.command, 30);
  }
  if (tool.input.pattern) {
    return tool.input.pattern;
  }
  if (tool.input.url) {
    return truncate(tool.input.url, 40);
  }
  return '';
}

/**
 * 获取待确认操作的描述
 */
export function getPendingActionDescription(action) {
  if (action.input?.file_path) {
    return action.input.file_path.split('/').pop();
  }
  if (action.input?.command) {
    return truncate(action.input.command, 50);
  }
  return '';
}