// 获取当前状态
chrome.storage.local.get(['debug', 'defaultNode'], (res) => {
  const status = document.querySelector('.status');
  if (res.debug) {
    status.textContent = '当前状态：调试模式已开启';
    status.style.background = '#fff3cd';
    status.style.color = '#856404';
  }
  if (res.defaultNode) {
    status.textContent += `\n默认节点：${res.defaultNode}`;
  }
});

// 添加主题支持
chrome.storage.local.get(['theme'], res => {
  document.body.classList.remove('modern-theme', 'glass-theme', 'dark-theme', 'minimal-theme');
  if (res.theme === 'glass') document.body.classList.add('glass-theme');
  else if (res.theme === 'dark') document.body.classList.add('dark-theme');
  else if (res.theme === 'minimal') document.body.classList.add('minimal-theme');
  else document.body.classList.add('modern-theme');
}); 