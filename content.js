// == GitHub加速 内容脚本 ==
// == GitHub Accelerator Content Script ==

let debug = false;
chrome.storage.local.get(['debug'], res => {
  debug = !!res.debug;
});

function dlog(...args) {
  if (debug) console.log('[GitHubFast]', ...args);
}
function derr(...args) {
  if (debug) console.error('[GitHubFast]', ...args);
}

// 注入美化样式
(function injectStyle() {
  dlog('开始注入样式喵~');
  if (document.getElementById('ghfast-process-style')) {
    dlog('样式已存在，跳过注入喵~');
    return;
  }
  const style = document.createElement('style');
  style.id = 'ghfast-process-style';
  style.textContent = `
    #ghfast-process-box {
      position: fixed;
      top: 20px; right: 20px;
      width: 370px;
      background: #fff;
      border-radius: 10px;
      box-shadow: 0 2px 16px #0002;
      z-index: 99999;
      font-family: 'Segoe UI', Arial, sans-serif;
      padding: 18px 20px 12px 20px;
      color: #222;
      font-size: 15px;
      line-height: 1.7;
      max-height: 70vh;
      overflow-y: auto;
      border: 1.5px solid #0078d7;
      animation: ghfast-fadein 0.4s;
    }
    @keyframes ghfast-fadein { from { opacity: 0; transform: translateY(-20px);} to { opacity: 1; transform: none;}}
    #ghfast-process-box .ok { color: #388e3c; }
    #ghfast-process-box .fail, #ghfast-process-box .error { color: #d32f2f; }
    #ghfast-process-box .info { color: #1976d2; }
    #ghfast-process-box .result { color: #0078d7; font-weight: bold; }
    #ghfast-process-box .step { margin-bottom: 6px; word-break: break-all; }
    #ghfast-process-box .ghfast-close { position: absolute; top: 8px; right: 12px; color: #888; background: none; border: none; font-size: 18px; cursor: pointer; }
    #ghfast-process-box .ghfast-close:hover { color: #d32f2f; }
  `;
  document.head.appendChild(style);
  dlog('样式注入完成喵~');
})();

function showProcess(msg, type = 'info') {
  dlog(`显示消息喵~ 类型: ${type}, 内容: ${msg}`);
  let box = document.getElementById('ghfast-process-box');
  if (!box) {
    dlog('创建新的消息框喵~');
    box = document.createElement('div');
    box.id = 'ghfast-process-box';
    box.innerHTML = '<button class="ghfast-close" title="关闭">×</button>';
    document.body.appendChild(box);
    box.querySelector('.ghfast-close').onclick = () => {
      dlog('关闭消息框喵~');
      box.remove();
    };
  }
  const step = document.createElement('div');
  step.className = 'step ' + type;
  step.innerHTML = msg;
  box.appendChild(step);
  box.scrollTop = box.scrollHeight;
}

async function pingNode(domain) {
  dlog(`开始ping节点喵~ 域名: ${domain}`);
  try {
    const start = performance.now();
    await fetch(`https://${domain}`, {mode: 'no-cors', cache: 'no-store', method: 'HEAD'});
    const ms = Math.round(performance.now() - start);
    dlog(`节点ping成功喵~ 延迟: ${ms}ms`);
    return ms;
  } catch (error) {
    dlog(`节点ping失败喵~ 错误: ${error.message}`);
    return null;
  }
}

async function handleGithubUrl(url) {
  dlog(`开始处理GitHub链接喵~ URL: ${url}`);
  let box = document.getElementById('ghfast-process-box');
  if (box) {
    dlog('移除旧的消息框喵~');
    box.remove();
  }
  
  showProcess('开始执行 handleGithubUrl 函数，传入的 URL 是：' + url, 'info');
  showProcess('开始处理链接：' + url, 'info');
  
  // 1. 检查结构
  if (!/^https?:\/\/github\.com\//.test(url)) {
    dlog('无效的GitHub链接喵~');
    showProcess('不是有效的 GitHub 链接', 'error');
    return;
  }
  dlog('检测到有效GitHub链接喵~');
  showProcess('检测到有效 GitHub 链接', 'ok');

  // 2. 获取测速结果
  dlog('开始获取测速结果喵~');
  const { results = [] } = await new Promise(resolve => chrome.storage.local.get(['results'], resolve));
  dlog(`获取到测速结果喵~ 数量: ${results.length}`);
  
  if (!results.length) {
    dlog('没有测速结果喵~');
    showProcess('未检测到节点测速结果，请先在设置页测速', 'error');
    return;
  }
  
  // 3. 按延迟排序节点
  const sorted = results.filter(r => r.ok).sort((a, b) => a.ms - b.ms);
  dlog(`排序后的节点数量喵~: ${sorted.length}`);
  
  if (!sorted.length) {
    dlog('没有可用节点喵~');
    showProcess('没有可用的加速节点', 'error');
    return;
  }
  
  // 4. 依次ping节点
  let finalNode = null, finalDelay = null;
  for (let i = 0; i < sorted.length; i++) {
    const node = sorted[i].node;
    dlog(`尝试节点喵~ ${node}`);
    showProcess(`尝试节点：<b>${node}</b> ...`, 'info');
    const ms = await pingNode(node);
    if (ms !== null) {
      dlog(`找到可用节点喵~ ${node}, 延迟: ${ms}ms`);
      showProcess(`节点可用：<b>${node}</b>，延迟 <span style=\"color:#388e3c;\">${ms} ms</span>`, 'ok');
      finalNode = node;
      finalDelay = ms;
      break;
    } else {
      dlog(`节点不可用喵~ ${node}`);
      showProcess(`节点不可用：<b>${node}</b>`, 'fail');
    }
  }
  
  if (!finalNode) {
    dlog('没有找到可用节点喵~');
    showProcess('没有可用的加速节点', 'error');
    return;
  }
  
  // 5. 替换域名并输出
  // 只替换github.com为加速域名
  const originUrl = url.replace(/^https?:\/\//, '');
  const newUrl = `https://${finalNode}/${originUrl}`;
  dlog(`生成新链接喵~ ${newUrl}`);

  // 创建标签页容器
  const tabContainer = document.createElement('div');
  tabContainer.style.display = 'flex';
  tabContainer.style.borderBottom = '1px solid #eee';
  tabContainer.style.marginBottom = '10px';

  // 标签页内容配置
  const tabs = [
    { type: 'gitClone', text: 'Git Clone', content: `git clone ${newUrl}` },
    { type: 'wgetCurl', text: 'Wget & Curl', content: `wget ${newUrl}\n\ncurl -O ${newUrl}` },
    { type: 'directDownload', text: 'Direct Download', content: `${newUrl}` }
  ];

  // 当前激活tab
  let activeTab = 'gitClone';

  // 创建内容显示区
  const contentBox = document.createElement('div');
  contentBox.style.margin = '18px 0 0 0';

  // 创建复制按钮
  function createCopyBtn(text, customBtn) {
    const btn = customBtn || document.createElement('button');
    btn.textContent = btn.textContent || '复制';
    btn.style.marginTop = '12px';
    btn.style.background = '#0078d7';
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.borderRadius = '4px';
    btn.style.padding = '6px 18px';
    btn.style.cursor = 'pointer';
    btn.onclick = (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(text);
      const oldText = btn.textContent;
      btn.textContent = '已复制';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = oldText;
        btn.disabled = false;
      }, 1200);
    };
    return btn;
  }

  // 渲染内容
  function renderContent(tabType) {
    contentBox.innerHTML = '';
    const tab = tabs.find(t => t.type === tabType);
    if (!tab) return;
    const pre = document.createElement('pre');
    pre.textContent = tab.content;
    pre.style.background = '#fafbfc';
    pre.style.padding = '16px';
    pre.style.borderRadius = '6px';
    pre.style.fontSize = '15px';
    pre.style.overflowX = 'auto';
    pre.style.margin = '0 0 8px 0';
    contentBox.appendChild(pre);

    // 按需添加按钮
    if (tabType === 'wgetCurl') {
      // 分割命令
      const [wgetCmd, curlCmd] = tab.content.split('\n\n');
      const btnWget = document.createElement('button');
      btnWget.textContent = '复制Wget';
      btnWget.style.marginRight = '10px';
      createCopyBtn(wgetCmd, btnWget);
      const btnCurl = document.createElement('button');
      btnCurl.textContent = '复制Curl';
      createCopyBtn(curlCmd, btnCurl);
      contentBox.appendChild(btnWget);
      contentBox.appendChild(btnCurl);
    } else if (tabType === 'directDownload') {
      contentBox.appendChild(createCopyBtn(tab.content));
      const downloadBtn = document.createElement('button');
      downloadBtn.textContent = '直接下载';
      downloadBtn.style.marginLeft = '12px';
      downloadBtn.style.background = '#222';
      downloadBtn.style.color = 'white';
      downloadBtn.style.border = 'none';
      downloadBtn.style.borderRadius = '4px';
      downloadBtn.style.padding = '6px 18px';
      downloadBtn.style.cursor = 'pointer';
      downloadBtn.onclick = () => {
        window.open(tab.content, '_blank');
      };
      contentBox.appendChild(downloadBtn);
    } else {
      contentBox.appendChild(createCopyBtn(tab.content));
    }
  }

  // 创建标签页
  tabs.forEach(tab => {
    const tabBtn = document.createElement('button');
    tabBtn.textContent = tab.text;
    tabBtn.style.flex = '1';
    tabBtn.style.padding = '8px 0';
    tabBtn.style.background = 'none';
    tabBtn.style.border = 'none';
    tabBtn.style.borderBottom = tab.type === activeTab ? '2px solid #409eff' : '2px solid transparent';
    tabBtn.style.color = tab.type === activeTab ? '#409eff' : '#333';
    tabBtn.style.fontWeight = tab.type === activeTab ? 'bold' : 'normal';
    tabBtn.style.fontSize = '16px';
    tabBtn.style.cursor = 'pointer';
    tabBtn.onmouseenter = () => { tabBtn.style.background = '#f5f7fa'; };
    tabBtn.onmouseleave = () => { tabBtn.style.background = 'none'; };
    tabBtn.onclick = () => {
      activeTab = tab.type;
      Array.from(tabContainer.children).forEach(btn => {
        btn.style.borderBottom = '2px solid transparent';
        btn.style.color = '#333';
        btn.style.fontWeight = 'normal';
      });
      tabBtn.style.borderBottom = '2px solid #409eff';
      tabBtn.style.color = '#409eff';
      tabBtn.style.fontWeight = 'bold';
      renderContent(tab.type);
    };
    tabContainer.appendChild(tabBtn);
  });

  // 渲染初始内容
  renderContent(activeTab);

  // 清空原有内容并显示新内容
  box = document.getElementById('ghfast-process-box');
  if (box) {
    box.innerHTML = '<button class="ghfast-close" title="关闭">×</button>';
    box.querySelector('.ghfast-close').onclick = () => box.remove();
    box.appendChild(tabContainer);
    box.appendChild(contentBox);
  }
}

// 监听 background.js 消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('收到消息喵~', request);
  if (request.action === "openWithGitHubFast" && request.url) {
    handleGithubUrl(request.url);
  }
});

chrome.storage.local.get(['theme'], res => {
  document.body.classList.remove('modern-theme', 'glass-theme', 'dark-theme', 'minimal-theme');
  if (res.theme === 'glass') document.body.classList.add('glass-theme');
  else if (res.theme === 'dark') document.body.classList.add('dark-theme');
  else if (res.theme === 'minimal') document.body.classList.add('minimal-theme');
  else document.body.classList.add('modern-theme');
});