/**
 * 通知服务
 */

import notifier from 'node-notifier';

/**
 * 发送系统通知
 * @param {string} title - 标题
 * @param {string} message - 消息
 * @param {Object} options - 选项
 */
export function sendNotification(title, message, options = {}) {
  notifier.notify({
    title,
    message,
    sound: options.sound ?? true,
    wait: options.wait ?? false,
    timeout: options.timeout ?? 5,
  });
}