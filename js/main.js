// Model Rush - 主入口
window.addEventListener('DOMContentLoaded', () => {
  const competitorNames = CONFIG.COMPETITORS.map(c => c.name.toLowerCase());

  // 公司名输入
  const input = document.getElementById('company-name-input');
  const errorEl = document.getElementById('company-name-error');
  const btn = document.getElementById('start-game-btn');
  const overlay = document.getElementById('startup-overlay');

  function validateName(name) {
    const trimmed = name.trim();
    if (!trimmed) return '请输入公司名称';
    if (trimmed.length < 2) return '公司名称至少2个字符';
    if (competitorNames.includes(trimmed.toLowerCase())) return '该公司名称已被占用，请更换';
    return null;
  }

  function startGame() {
    const name = input.value.trim();
    const error = validateName(name);
    if (error) {
      errorEl.textContent = error;
      errorEl.classList.remove('hidden');
      return;
    }

    Game.state.companyName = name;
    document.getElementById('company-name-display').textContent = name;
    overlay.style.display = 'none';

    // 初始化所有系统
    Scene.init();
    Datacenter.init();
    Competitor.init();
    Game.init();
    UI.init();

    // 点击模态框遮罩关闭
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) UI.hideModal();
    });

    Game.addLog(name + ' 成立! 初始资金 $5.00B');
    Game.addLog('数据中心已就绪，供电10MW');
    console.log('Model Rush - ' + name + ' 已启动');
    console.log('可用GPU:', Object.keys(CONFIG.GPUS).join(', '));
    console.log('竞争对手:', CONFIG.COMPETITORS.map(c => c.name).join(', '));
  }

  btn.addEventListener('click', startGame);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') startGame();
    else {
      errorEl.classList.add('hidden');
    }
  });
});