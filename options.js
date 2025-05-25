// == GitHub加速 设置页脚本 ==
// == GitHub Accelerator Options Page Script ==

// 获取页面元素 // Get DOM elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const chooseBtn = document.getElementById('chooseBtn');
const pingBtn = document.getElementById('pingBtn');
const resultTable = document.getElementById('resultTable');
const tbody = resultTable.querySelector('tbody');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
let nodeList = [];
let results = [];
let debug = false;

// Debug日志函数 // Debug log functions
function dlog(...args) {
  if (debug) console.log('[Options]', ...args);
}
function derr(...args) {
  if (debug) console.error('[Options]', ...args);
}

// 拖拽相关事件 // Drag & Drop events
// 拖拽进入 // Drag over
// 拖拽离开 // Drag leave
// 拖拽释放 // Drop
// 点击按钮弹出文件选择 // Click button to open file dialog
// 文件选择变化 // File input change
// 点击dropZone但不是按钮时不触发 // Only button triggers file dialog

dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('dragover');
  dlog('拖拽进入区域 Drag over drop zone');
});
dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
  dlog('拖拽离开区域 Drag leave drop zone');
});
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  dlog('文件被拖拽释放 File dropped');
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    handleFile(e.dataTransfer.files[0]);
  }
});
chooseBtn.addEventListener('click', e => {
  e.stopPropagation();
  fileInput.click();
  dlog('点击选择文件按钮 Click choose file button');
});
fileInput.addEventListener('change', e => {
  if (e.target.files && e.target.files[0]) {
    handleFile(e.target.files[0]);
    dlog('文件选择变化 File input changed');
  }
});
dropZone.addEventListener('click', e => {
  if (e.target === chooseBtn) return;
});

// 处理文件 // Handle file
function handleFile(file) {
  if (!file) return;
  dlog('开始读取文件 Start reading file:', file.name);
  const reader = new FileReader();
  reader.onload = e => {
    nodeList = e.target.result.split('\n').map(x => x.trim()).filter(Boolean);
    dlog('节点列表 Node list:', nodeList);
    if (nodeList.length) {
      pingBtn.style.display = '';
      resultTable.style.display = '';
      tbody.innerHTML = '';
      progressContainer.style.display = 'none';
    }
  };
  reader.readAsText(file);
}

// 获取延迟对应的样式 // Get delay class
function getDelayClass(ms) {
  if (ms < 300) return 'delay-low';
  if (ms < 500) return 'delay-mid';
  if (ms < 800) return 'delay-high';
  if (ms < 1200) return 'delay-veryhigh';
  return 'delay-extreme';
}

// 渲染节点表格 // Render node table
function renderTable() {
  tbody.innerHTML = '';
  results.sort((a, b) => a.ms - b.ms);
  for (const r of results) {
    const tr = document.createElement('tr');
    tr.className = r.ok ? getDelayClass(r.ms) : 'delay-extreme';
    tr.innerHTML = `<td>${r.node}</td><td class="delay-cell">${r.delay}</td><td class="${r.ok ? 'ok' : 'fail'}">${r.status}</td>
      <td><button ${r.ok ? '' : 'disabled'}>设为默认</button></td>`;
    tbody.appendChild(tr);
    const btn = tr.querySelector('button');
    if (btn && r.ok) {
      btn.addEventListener('click', () => setDefault(r.node));
      dlog('渲染设为默认按钮 Render set default button:', r.node);
    }
  }
}

// 测速按钮点击 // Ping button click
pingBtn.onclick = async function() {
  dlog('开始测速 Start ping test');
  tbody.innerHTML = '';
  results = [];
  progressContainer.style.display = '';
  progressBar.style.width = '0';
  progressBar.style.background = '#4caf50';
  progressText.textContent = '';

  // 创建Worker
  const workerCode = `
    async function pingNode(domain) {
      try {
        const start = performance.now();
        await fetch('https://' + domain, {mode: 'no-cors', cache: 'no-store', method: 'HEAD'});
        const ms = Math.round(performance.now() - start);
        return { domain, ms, ok: true };
      } catch (error) {
        return { domain, ms: 99999, ok: false };
      }
    }

    self.onmessage = async function(e) {
      const { domain } = e.data;
      const result = await pingNode(domain);
      self.postMessage(result);
    };
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);

  // 并发数
  const CONCURRENT = 5;
  let completed = 0;
  let activeWorkers = 0;
  let currentIndex = 0;

  // 创建Worker池
  const workers = Array(CONCURRENT).fill(null).map(() => new Worker(workerUrl));

  // 处理Worker消息
  workers.forEach(worker => {
    worker.onmessage = function(e) {
      const { domain, ms, ok } = e.data;
      const delay = ok ? ms + ' ms' : '超时';
      const status = ok ? '可用' : '失败';
      results.push({ node: domain, delay, status, ok, ms });
      
      // 更新进度条
      completed++;
      const percent = Math.round((completed / nodeList.length) * 100);
      progressBar.style.width = percent + '%';
      if (percent < 60) progressBar.style.background = '#4caf50';
      else if (percent < 90) progressBar.style.background = '#ffc107';
      else progressBar.style.background = '#e53935';
      progressText.textContent = `已完成 ${completed} / ${nodeList.length}`;
      
      // 渲染表格
      renderTable();
      
      // 处理下一个节点
      activeWorkers--;
      processNextNode();
    };
  });

  // 处理下一个节点
  function processNextNode() {
    while (activeWorkers < CONCURRENT && currentIndex < nodeList.length) {
      const node = nodeList[currentIndex++];
      const worker = workers[activeWorkers++];
      worker.postMessage({ domain: node });
    }

    // 所有节点处理完成
    if (completed === nodeList.length) {
      // 清理Worker
      workers.forEach(worker => worker.terminate());
      URL.revokeObjectURL(workerUrl);
      
      // 自动选择最快的可用节点
      const best = results.find(r => r.ok);
      if (best) setDefault(best.node, true);
      
      // 保存测速结果
      chrome.storage.local.set({results}, () => dlog('保存测速结果 Save ping results'));
    }
  }

  // 开始处理节点
  processNextNode();
};

// 设为默认节点 // Set as default node
window.setDefault = function(node, silent) {
  chrome.storage.local.set({defaultNode: node}, () => {
    dlog('设为默认节点 Set as default node:', node);
    if (!silent) alert('已设为默认节点：' + node);
  });
};

// 其他设置保存 // Save other settings
// 自动切换 // Auto switch
// 初始化设置 // Init settings

document.getElementById('autoSwitch').onchange = function() {
  chrome.storage.local.set({autoSwitch: this.checked}, () => {
    dlog('保存autoSwitch Save autoSwitch:', this.checked);
  });
};
chrome.storage.local.get(['autoSwitch'], res => {
  document.getElementById('autoSwitch').checked = !!res.autoSwitch;
  dlog('读取autoSwitch Read autoSwitch:', !!res.autoSwitch);
});

// 读取debug状态 // Read debug status
chrome.storage.local.get(['debug'], res => {
  debug = !!res.debug;
  dlog('读取debug状态 Read debug status:', debug);
  document.getElementById('debugSwitch').checked = !!res.debug;
  dlog('debugSwitch checked:', !!res.debug);
});
// 保存debug状态 // Save debug status
document.getElementById('debugSwitch').addEventListener('change', function() {
  chrome.storage.local.set({ debug: this.checked }, () => {
    dlog('保存debug状态 Save debug status:', this.checked);
    debug = this.checked;
  });
});

// 读取主题 // Read theme
chrome.storage.local.get(['theme'], res => {
  document.getElementById('themeSelect').value = res.theme || 'modern';
  dlog('读取主题 Read theme:', res.theme || 'modern');
  applyTheme(res.theme || 'modern');
});
document.getElementById('themeSelect').addEventListener('change', function() {
  chrome.storage.local.set({ theme: this.value }, () => {
    dlog('保存主题 Save theme:', this.value);
    applyTheme(this.value);
  });
});
function applyTheme(theme) {
  dlog('切换主题 Switch theme:', theme);
  document.body.classList.remove('modern-theme', 'glass-theme', 'dark-theme', 'minimal-theme');
  if (theme === 'glass') document.body.classList.add('glass-theme');
  else if (theme === 'dark') document.body.classList.add('dark-theme');
  else if (theme === 'minimal') document.body.classList.add('minimal-theme');
  else document.body.classList.add('modern-theme');
}
