// 贡献者名单数据和渲染逻辑
const contributors = [
  {
    user: "BG4JTS",
    name: "BG4JTS",
    desc: "项目开发",
  },
];

document.addEventListener('DOMContentLoaded', () => {
  console.log('[GitHubFast] DOMContentLoaded 事件触发喵！');
  const list = document.getElementById('contributors-list');
  if (!list) {
    console.error('[GitHubFast] 找不到贡献者列表容器喵！', list);
    return;
  }
  console.log('[GitHubFast] 找到贡献者列表容器喵！', list);

  if (contributors.length === 0) {
    console.warn('[GitHubFast] 贡献者名单为空喵！');
    return;
  }
  console.log('[GitHubFast] 准备渲染贡献者名单，数量：', contributors.length);

  contributors.forEach(c => {
    console.log('[GitHubFast] 渲染贡献者：', c.user);
    const url = `https://github.com/${c.user}`;
    const avatar = `https://github.com/${c.user}.png`;
    const item = document.createElement('a');
    item.href = url;
    item.target = "_blank";
    item.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      text-decoration: none;
      transition: transform .2s, box-shadow .2s;
      box-shadow: 0 2px 12px #0001;
      border-radius: 16px;
      padding: 18px 18px 12px 18px;
      background: linear-gradient(135deg, #f8fafc 60%, #e0e7ef 100%);
      margin-bottom: 8px;
    `;
    item.onmouseenter = () => { item.style.transform = 'scale(1.08)'; item.style.boxShadow = '0 6px 24px #0078d733'; };
    item.onmouseleave = () => { item.style.transform = 'scale(1)'; item.style.boxShadow = '0 2px 12px #0001'; };
    item.innerHTML = `
      <img src="${avatar}" alt="${c.name}" style="width:72px;height:72px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px #0078d722;object-fit:cover;transition:box-shadow .2s;">
      <div style="margin-top:10px;font-weight:bold;font-size:15px;color:#222;">${c.name}</div>
      <div style="font-size:13px;color:#888;">${c.desc}</div>
    `;
    list.appendChild(item);
  });
}); 