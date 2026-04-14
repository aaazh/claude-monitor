/**
 * 系统托盘服务
 */

import SysTray from 'systray2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 默认托盘图标 (16x16 PNG base64)
// 这是一个简单的蓝色圆形图标
const DEFAULT_ICON = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAE7SURBVDiNpZMxSwNBEIW/TdyExMLKxsZCFkY2PhY2/gHxH1j4ARb+MraJhYWVhY2FhYWFhY2FhY2Njb1JpCWw0LvT3Zmd2VzKIIgoSnfmzJm5M7MIPHDmzJwzA4iAiSb6P0m/AI6AO/ABvAAa0Gq1KKVQKpXGapqmiKKo1WqFbduGYRiYpnmADaMoilZ939/b7XZ3drtdu91u1Ov1uK7r4e5utVq9bLfbk+cc5Jxbr9eLwzCEgud5zIP9e2cYBoa5MQwD12onfd/HBc/z4LquDV3XUe57aHq9HoQQCIKAIAhwzrscx0FRFBRFgTAMsygKdF2XdrtNeZ6zKIoY5zy3mDAMC4BznnEcn6goyjzPuV6vzwHbtrnruvAcRxhG0h4cBkVRQJYlRFEE0zSl6vW6C4KAeZ6z2e12eZ53YP5I4DiOsCwLruvCcRwYlkU4jsO6rjBN0xxAURTHZBD2R8exgN8AmYp/xWJtZZsAAAAASUVORK5CYII=';

/**
 * 创建托盘实例
 * @param {Object} options
 * @param {Function} options.onShow - 显示窗口回调
 * @param {Function} options.onHide - 隐藏窗口回调
 * @param {Function} options.onExit - 退出回调
 */
export async function createTray(options = {}) {
  const { onShow, onHide, onExit } = options;

  // 尝试读取自定义图标
  let iconBase64 = DEFAULT_ICON;
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  if (fs.existsSync(iconPath)) {
    const iconBuffer = fs.readFileSync(iconPath);
    iconBase64 = iconBuffer.toString('base64');
  }

  const systray = new SysTray({
    menu: {
      icon: iconBase64,
      isTemplateIcon: process.platform === 'darwin',
      title: 'Claude Monitor',
      tooltip: 'Claude Code Monitor',
      items: [
        { id: 'show', title: '显示窗口', enabled: true, checked: false },
        { id: 'hide', title: '隐藏窗口', enabled: true, checked: false },
        SysTray.separator,
        { id: 'exit', title: '退出', enabled: true, checked: false },
      ],
    },
    debug: false,
  });

  await systray.ready();

  // 处理点击事件
  systray.onClick((action) => {
    switch (action.item.id) {
      case 'show':
        onShow?.();
        break;
      case 'hide':
        onHide?.();
        break;
      case 'exit':
        systray.kill();
        onExit?.();
        break;
    }
  });

  return systray;
}

/**
 * 更新托盘菜单
 * @param {Object} systray - 托盘实例
 * @param {Object} updates - 更新内容
 */
export function updateTrayMenu(systray, updates) {
  if (!systray) return;

  systray.sendAction({
    type: 'update-menu',
    menu: updates,
  });
}

/**
 * 设置托盘图标状态（是否有待确认操作）
 * @param {Object} systray - 托盘实例
 * @param {boolean} hasPending - 是否有待确认操作
 */
export function setTrayPendingStatus(systray, hasPending) {
  if (!systray) return;

  // 可以在这里更新图标或标题来表示状态
  const title = hasPending ? 'Claude Monitor (待确认)' : 'Claude Monitor';
  systray.sendAction({
    type: 'update-menu',
    menu: {
      title,
    },
  });
}
