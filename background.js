// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "openWithFast",
    title: "用GitHub加速插件打开",
    contexts: ["link"]
  });
  chrome.runtime.openOptionsPage();
});

// 处理右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "openWithFast") {
    const url = info.linkUrl || tab.url;
    // 只在github页面发送消息
    if (/^https:\/\/github\.com\//.test(tab.url)) {
      chrome.tabs.sendMessage(tab.id, {
        action: "openWithGitHubFast",
        url: url
      }, (response) => {
        if (chrome.runtime.lastError) {
          // 兼容 Manifest V3 和旧版API
          if (chrome.scripting && chrome.scripting.executeScript) {
            chrome.scripting.executeScript({
              target: {tabId: tab.id},
              func: () => alert("插件未能正常注入，请刷新页面后重试，或确保在GitHub页面使用！（如果加速页面正常显示请无视 QwQ）")
            }); 
          } else if (chrome.tabs.executeScript) {
            chrome.tabs.executeScript(tab.id, {
              code: 'alert("插件未能正常注入，请刷新页面后重试，或确保在GitHub页面使用！");'
            });
          } else {
            alert("插件未能正常注入，请刷新页面后重试，或确保在GitHub页面使用！");
          }
        }
      });
    } else {
      chrome.tabs.update(tab.id, { url: "https://github.com" });
    }
  }
}); 