// Model Rush - 主入口
function initMain() {
  const input = document.getElementById('company-name-input');
  const errorEl = document.getElementById('company-name-error');
  const btn = document.getElementById('start-game-btn');
  const overlay = document.getElementById('startup-overlay');
  const continueSection = document.getElementById('continue-section');
  const saveSlotsList = document.getElementById('save-slots-list');
  let modalCloseBound = false;

  function bindModalClose() {
    if (modalCloseBound) return;
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) UI.hideModal();
    });
    modalCloseBound = true;
  }

  function renderSaveSlots() {
    const slots = SaveSystem.getSlots();
    if (slots.length === 0) return;
    saveSlotsList.innerHTML = '';
    for (const slot of slots) {
      const button = document.createElement('button');
      button.className = 'modal-btn w-full text-left py-2';
      button.textContent = slot.name + '｜第 ' + slot.day + ' 天｜$' + Economy.formatMoney(slot.cash) + '｜' + new Date(slot.timestamp).toLocaleString('zh-CN');
      button.addEventListener('click', () => continueGame(slot.id));
      saveSlotsList.appendChild(button);
    }
    continueSection.classList.remove('hidden');
  }

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

    try {
      // 所有依赖系统完成后才启动游戏循环，避免首帧访问未初始化的研发或界面状态。
      Game.state.companyName = name;
      document.getElementById('company-name-display').textContent = name;
      Scene.init();
      Datacenter.init();
      Research.init();
      DataCollection.init();
      UI.init();
      bindModalClose();
      Game.init();

      Game.addLog(name + ' 成立! 初始资金 $' + Economy.formatMoney(CONFIG.INITIAL_CASH));
      Game.addLog('数据中心已就绪，供电 ' + CONFIG.INITIAL_POWER_CAPACITY_MW + 'MW');
      SaveSystem.createSlot(name + ' · 第 1 天');
      UI.update();
      overlay.style.display = 'none';
    } catch (e) {
      // 初始化失败时不要隐藏入口，用户可直接重试而不是陷入空白页面。
      Game.state.running = false;
      console.error('游戏初始化失败', e);
      errorEl.textContent = '初始化失败，请刷新页面后重试';
      errorEl.classList.remove('hidden');
    }
  }

  function continueGame(slotId) {
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

    bindModalClose();

    // 加载存档
    const loaded = SaveSystem.load(slotId);
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

  renderSaveSlots();

  btn.addEventListener('click', startGame);
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
}

// 常规脚本会在 DOMContentLoaded 前执行；但部分 CDN/优化器可能延后脚本执行。
// 此处兼容两种时机，确保“进入游戏”按钮始终完成绑定。
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMain, { once: true });
} else {
  initMain();
}
