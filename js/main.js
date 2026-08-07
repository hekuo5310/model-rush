// Model Rush - 主入口
window.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('company-name-input');
  const errorEl = document.getElementById('company-name-error');
  const btn = document.getElementById('start-game-btn');
  const overlay = document.getElementById('startup-overlay');
  const continueSection = document.getElementById('continue-section');
  const continueBtn = document.getElementById('continue-game-btn');
  const saveInfo = document.getElementById('save-info');

  function validateName(name) {
    const trimmed = name.trim();
    if (!trimmed) return '请输入公司名称';
    if (trimmed.length < 2) return '公司名称至少2个字符';
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
    Game.init();
    Research.init();
    DataCollection.init();
    UI.init();

    // 点击模态框遮罩关闭
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) UI.hideModal();
    });

    Game.addLog(name + ' 成立! 初始资金 $' + Economy.formatMoney(CONFIG.INITIAL_CASH));
    Game.addLog('数据中心已就绪，供电 ' + CONFIG.INITIAL_POWER_CAPACITY_MW + 'MW');
    UI.update();
  }

  function continueGame() {
    overlay.style.display = 'none';

    // 先初始化场景和数据中心
    Scene.init();
    Datacenter.init();

    // 初始化游戏循环（但不重置状态）
    Game.state.lastFrame = performance.now();
    Game.state.running = true;
    Game.state.elapsed = 0;
    Research.init();
    DataCollection.init();
    UI.init();

    // 点击模态框遮罩关闭
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) UI.hideModal();
    });

    // 加载存档
    const loaded = SaveSystem.load();
    if (!loaded) {
      UI.toast('存档加载失败，开始新游戏');
      Game.state.companyName = '新公司';
      document.getElementById('company-name-display').textContent = '新公司';
      Game.init();
    } else {
      document.getElementById('company-name-display').textContent = Game.state.companyName;
      // 启动游戏循环
      Game.loop(performance.now());
    }
    UI.update();
  }

  // 检查是否有存档
  try {
    const raw = localStorage.getItem('model_rush_save');
    if (raw) {
      const data = JSON.parse(raw);
      if (data && data.gameState && data.companyName) {
        const saveDate = new Date(data.timestamp);
        const saveDay = data.gameState.day || 1;
        const saveCash = data.gameState.cash || 0;
        saveInfo.textContent = data.companyName + ' | 第 ' + saveDay + ' 天 | $' + Economy.formatMoney(saveCash) + ' | ' + saveDate.toLocaleString('zh-CN');
        continueSection.classList.remove('hidden');
      }
    }
  } catch (e) {
    // 存档损坏，忽略
  }

  btn.addEventListener('click', startGame);
  continueBtn.addEventListener('click', continueGame);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') startGame();
    else {
      errorEl.classList.remove('hidden');
    }
  });

  // 页面关闭/刷新时自动保存
  window.addEventListener('beforeunload', () => {
    if (Game.state && Game.state.running && Game.state.companyName) {
      try { SaveSystem.save(true); } catch (e) { /* 忽略 */ }
    }
  });
});
