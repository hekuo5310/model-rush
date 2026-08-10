// Model Rush - 单存档系统（LocalStorage）
// 作者：mukunjin
// 仓库：https://github.com/mukunjin/model-rush
const SaveSystem = {
  SAVE_KEY: 'model_rush_save',

  // 保存游戏
  save(silent) {
    const s = Game.state;
    const data = {
      version: 2,
      timestamp: Date.now(),
      companyName: s.companyName,
      gameState: {
        cash: s.cash,
        valuation: s.valuation,
        day: s.day,
        speed: s.speed,
        gpuInventory: s.gpuInventory,
        gpuTotal: s.gpuTotal,
        powerCapacityMW: s.powerCapacityMW,
        coolingCapacityMW: s.coolingCapacityMW,
        activeTraining: s.activeTraining ? { ...s.activeTraining } : null,
        activeTrainings: Game.getActiveTrainings().map(t => ({ ...t })),
        deployedModels: s.deployedModels,
        completedModels: s.completedModels,
        dailyIncome: s.dailyIncome,
        dailyExpense: s.dailyExpense,
        lastMonthlyDay: s.lastMonthlyDay,
        lastFundraiseDay: s.lastFundraiseDay,
        nextEventDay: s.nextEventDay,
        activeEffects: s.activeEffects,
        blackoutDays: s.blackoutDays,
        buyBanDays: s.buyBanDays,
        eventLog: s.eventLog,
        canFundraise: s.canFundraise,
        researchers: s.researchers,
        lastHireDay: s.lastHireDay,
        datacenterExpands: s.datacenterExpands
      },
      researchState: Research.state,
      dataCollectionState: DataCollection.state,
      datacenter: {
        ROWS: Datacenter.ROWS,
        COLS: Datacenter.COLS,
        FLOORS: Datacenter.FLOORS,
        gpuBlocks: Datacenter.gpuBlocks.map(b => ({
          type: b.type,
          row: b.row,
          col: b.col,
          floor: b.floor,
          training: b.training
        }))
      }
    };
    try {
      localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
      if (silent) {
        Game.addLog('自动存档已保存');
      } else {
        UI.toast('游戏已保存');
        Game.addLog('存档已保存');
      }
      return true;
    } catch (e) {
      UI.toast('保存失败: ' + e.message);
      return false;
    }
  },

  // 加载游戏
  load() {
    try {
      const raw = localStorage.getItem(this.SAVE_KEY);
      if (!raw) {
        UI.toast('没有找到存档');
        return false;
      }
      const data = JSON.parse(raw);
      if (!data.version || !data.gameState) {
        UI.toast('存档格式无效');
        return false;
      }
      return this.restore(data);
    } catch (e) {
      UI.toast('加载失败: ' + e.message);
      return false;
    }
  },

  // 恢复游戏状态
  restore(data) {
    const gs = data.gameState;
    const s = Game.state;

    s.companyName = data.companyName || s.companyName || '';

    s.cash = gs.cash !== undefined ? gs.cash : CONFIG.INITIAL_CASH;
    s.valuation = gs.valuation !== undefined ? gs.valuation : CONFIG.INITIAL_CASH;
    s.day = gs.day !== undefined ? gs.day : 1;
    s.speed = Math.min(gs.speed === undefined ? 1 : gs.speed, 4);
    s.gpuInventory = {};
    if (gs.gpuInventory && typeof gs.gpuInventory === 'object') {
      for (const key of Object.keys(CONFIG.GPUS)) {
        s.gpuInventory[key] = typeof gs.gpuInventory[key] === 'number' ? gs.gpuInventory[key] : 0;
      }
    } else {
      for (const key of Object.keys(CONFIG.GPUS)) {
        s.gpuInventory[key] = 0;
      }
    }
    s.gpuTotal = gs.gpuTotal || 0;
    s.powerCapacityMW = gs.powerCapacityMW !== undefined ? gs.powerCapacityMW : CONFIG.INITIAL_POWER_CAPACITY_MW;
    s.coolingCapacityMW = gs.coolingCapacityMW !== undefined ? gs.coolingCapacityMW : CONFIG.INITIAL_COOLING_CAPACITY_MW;
    s.activeTrainings = Array.isArray(gs.activeTrainings) ? gs.activeTrainings : (gs.activeTraining ? [gs.activeTraining] : []);
    Game.syncPrimaryTraining();
    s.deployedModels = gs.deployedModels || [];
    s.completedModels = gs.completedModels || [];

    // 存档迁移：旧格式兼容
    for (const t of Game.getActiveTrainings()) {
      if (!t.params && t.scale) {
        const sc = CONFIG.MODEL_SCALES[t.scale];
        if (sc) { t.params = sc.params; t.label = sc.label; }
      }
      if (!t.gpuAllocation && t.gpuAllocated) {
        t.gpuAllocation = { _legacy: t.gpuAllocated };
      }
      if (!t.id) t.id = 'train_restore_' + s.day + '_' + Math.random().toString(36).slice(2);
      if (t.paused === undefined) t.paused = false;
    }
    Game.syncPrimaryTraining();
    for (const model of s.deployedModels) {
      if (!model.params && model.scale) {
        const sc = Object.values(CONFIG.MODEL_SCALES).find(v => v.label === model.scale);
        if (sc) { model.params = sc.params; model.label = model.scale; }
      }
      model.deployed = true;
      if (!model.deploymentGPUs && model.deployed) {
        const rec = recommendedInferenceGPUs(model.params || 70e9);
        model.deploymentGPUs = { _legacy: rec };
      }
    }
    const modelKey = (model) => {
      if (model.id) return 'id:' + model.id;
      return 'legacy:' + [model.name || '', model.params || model.scale || '', Number(model.score || 0).toFixed(4)].join('|');
    };
    const deployedKeys = new Set(s.deployedModels.map(modelKey));
    s.completedModels = s.completedModels.filter(model => {
      if (deployedKeys.has(modelKey(model))) return false;
      model.deployed = false;
      model.deploymentGPUs = null;
      return true;
    });
    s.dailyIncome = gs.dailyIncome || 0;
    s.dailyExpense = gs.dailyExpense || 0;
    s.lastMonthlyDay = gs.lastMonthlyDay || 1;
    s.lastFundraiseDay = gs.lastFundraiseDay !== undefined ? gs.lastFundraiseDay : -CONFIG.FUNDRAISE_COOLDOWN_DAYS;
    s.nextEventDay = gs.nextEventDay || (s.day + CONFIG.EVENT_MIN_DAYS + Math.floor(Math.random() * (CONFIG.EVENT_MAX_DAYS - CONFIG.EVENT_MIN_DAYS)));
    s.activeEffects = gs.activeEffects || [];
    s.blackoutDays = gs.blackoutDays || 0;
    s.buyBanDays = gs.buyBanDays || 0;
    s.eventLog = gs.eventLog || [];
    s.canFundraise = gs.canFundraise !== undefined ? gs.canFundraise : true;
    s.researchers = Object.assign({ junior: 0, senior: 0, principal: 0 }, gs.researchers || {});
    s.lastHireDay = gs.lastHireDay || 0;
    s.datacenterExpands = gs.datacenterExpands || 0;

    if (data.researchState && typeof data.researchState === 'object') {
      Research.state = {
        unlocked: Array.isArray(data.researchState.unlocked) ? data.researchState.unlocked : [],
        techLevels: (data.researchState.techLevels && typeof data.researchState.techLevels === 'object') ? data.researchState.techLevels : {},
        researching: (data.researchState.researching && typeof data.researchState.researching === 'object') ? data.researchState.researching : {},
        queue: Array.isArray(data.researchState.queue) ? data.researchState.queue : []
      };
      for (const key of Research.state.unlocked) {
        if (!Research.state.techLevels[key]) Research.state.techLevels[key] = 1;
      }
    }

    if (data.dataCollectionState && typeof data.dataCollectionState === 'object') {
      DataCollection.state = data.dataCollectionState;
      if (!DataCollection.state.sources || typeof DataCollection.state.sources !== 'object') {
        DataCollection.state.sources = {};
      }
      for (const key of Object.keys(CONFIG.DATA_SOURCES)) {
        if (typeof DataCollection.state.sources[key] !== 'number') {
          DataCollection.state.sources[key] = 0;
        }
      }
    }

    if (data.datacenter) {
      Datacenter.ROWS = data.datacenter.ROWS || Datacenter.ROWS;
      Datacenter.COLS = data.datacenter.COLS || Datacenter.COLS;
      Datacenter.FLOORS = data.datacenter.FLOORS || 1;
      Datacenter.rebuildGPUBlocks(data.datacenter.gpuBlocks || []);
      Datacenter.updatePlatform();
      Datacenter.updateGround();
      const placed = Datacenter.gpuBlocks.length;
      if (s.gpuTotal > placed) {
        Game.addLog('警告: 有 ' + (s.gpuTotal - placed) + ' 张GPU因机架位不足未显示，请加盖楼层');
      }
    }

    Datacenter.unmarkTrainingGPUs();
    if (Game.getActiveTrainings().length > 0) Datacenter.markTrainingGPUs(Game.getTrainingGPUAllocation());
    s.elapsed = 0;
    s.lastFrame = performance.now();
    s.running = true;

    Game.setSpeed(s.speed);
    UI.update();
    Game.addLog('存档已加载 (第 ' + s.day + ' 天)');
    UI.toast('存档已加载');
    return true;
  },

  // 删除存档并重置游戏
  delete() {
    try {
      localStorage.removeItem(this.SAVE_KEY);
      this.resetGame();
      return true;
    } catch (e) {
      UI.toast('删除失败');
      return false;
    }
  },

  resetGame() {
    Game.state.running = false;
    Game.state.speed = 0;

    if (Datacenter.gpuBlocks) {
      for (const block of Datacenter.gpuBlocks) {
        if (block.group) Scene.scene.remove(block.group);
      }
      Datacenter.gpuBlocks = [];
    }

    const s = Game.state;
    s.cash = CONFIG.INITIAL_CASH;
    s.valuation = CONFIG.INITIAL_CASH;
    s.day = 1;
    s.elapsed = 0;
    s.speed = 1;
    s.gpuInventory = {};
    for (const key of Object.keys(CONFIG.GPUS)) {
      s.gpuInventory[key] = 0;
    }
    s.gpuTotal = 0;
    s.powerCapacityMW = CONFIG.INITIAL_POWER_CAPACITY_MW;
    s.coolingCapacityMW = CONFIG.INITIAL_COOLING_CAPACITY_MW;
    s.activeTraining = null;
    s.activeTrainings = [];
    s.deployedModels = [];
    s.completedModels = [];
    s.dailyIncome = 0;
    s.dailyExpense = 0;
    s.lastMonthlyDay = 1;
    s.lastFundraiseDay = -CONFIG.FUNDRAISE_COOLDOWN_DAYS;
    s.nextEventDay = 0;
    s.activeEffects = [];
    s.blackoutDays = 0;
    s.buyBanDays = 0;
    s.eventLog = [];
    s.canFundraise = true;
    s.researchers = { junior: 0, senior: 0, principal: 0 };
    s.lastHireDay = 0;
    s.datacenterExpands = 0;
    s.companyName = '';
    Game.autoSaveTimer = 0;

    Research.state = { unlocked: [], techLevels: {}, researching: {}, queue: [] };
    DataCollection.state = { sources: {}, collected: false, totalTokens: 0, avgQuality: 0 };
    DataCollection.init();

    UI.update();
    document.getElementById('startup-overlay').style.display = 'flex';
    document.getElementById('company-name-input').value = '';
    document.getElementById('company-name-display').textContent = '';

    UI.toast('存档已删除，游戏已重置');
  },

  hasSave() {
    return !!localStorage.getItem(this.SAVE_KEY);
  },

  getSaveInfo() {
    try {
      const raw = localStorage.getItem(this.SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return {
        companyName: data.companyName,
        day: data.gameState.day,
        cash: data.gameState.cash,
        timestamp: data.timestamp
      };
    } catch (e) {
      return null;
    }
  }
};