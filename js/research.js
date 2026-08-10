// Model Rush - 技术研发系统
const Research = {
  // state: { unlocked: [], techLevels: { key: level }, researching: { key: { daysElapsed, totalDays, cost, targetLevel } }, queue: [] }
  state: { unlocked: [], techLevels: {}, researching: {}, queue: [] },

  init() {
    // 无需初始解锁
  },

  // 检查某项技术是否已解锁
  isUnlocked(techKey) {
    return Array.isArray(this.state.unlocked) && this.state.unlocked.includes(techKey);
  },

  getTechLevel(techKey) {
    if (!this.isUnlocked(techKey)) return 0;
    return Math.max(1, Number(this.state.techLevels?.[techKey]) || 1);
  },

  getMaxTechLevel(techKey) {
    return CONFIG.TECH_RESEARCH[techKey]?.maxLevel || CONFIG.TECH_UPGRADE_MAX_LEVEL;
  },

  getUpgradeInfo(techKey, targetLevel = this.getTechLevel(techKey) + 1) {
    const tech = CONFIG.TECH_RESEARCH[techKey];
    if (!tech) return null;
    const step = Math.max(0, targetLevel - 1);
    return {
      targetLevel,
      maxLevel: this.getMaxTechLevel(techKey),
      cost: Math.ceil(tech.cost * Math.pow(CONFIG.TECH_UPGRADE_COST_MULTIPLIER, step)),
      days: Math.ceil(tech.days * Math.pow(CONFIG.TECH_UPGRADE_DAYS_MULTIPLIER, step))
    };
  },

  getLevelInfo() {
    const completed = this.state.unlocked.length;
    let level = 1;
    for (const [key, info] of Object.entries(CONFIG.RESEARCH_LEVELS)) {
      if (completed >= info.requiredCompleted) level = Number(key);
    }
    const current = CONFIG.RESEARCH_LEVELS[level];
    const next = CONFIG.RESEARCH_LEVELS[level + 1] || null;
    return {
      level,
      name: current.name,
      completed,
      next,
      progress: next ? Math.min(100, completed / next.requiredCompleted * 100) : 100
    };
  },

  // 检查是否可以开始研发某项技术
  canResearch(techKey) {
    if (this.state.researching[techKey]) return { ok: false, reason: '已在研发中' };
    const tech = CONFIG.TECH_RESEARCH[techKey];
    if (!tech) return { ok: false, reason: '未知技术' };
    const currentLevel = this.getTechLevel(techKey);
    if (currentLevel >= this.getMaxTechLevel(techKey)) return { ok: false, reason: '已升至最高等级', blockType: 'maxed' };
    const levelInfo = this.getLevelInfo();
    const requiredLevel = tech.tier || 1;
    if (levelInfo.level < requiredLevel) {
      const required = CONFIG.RESEARCH_LEVELS[requiredLevel];
      return { ok: false, reason: '研发等级不足：需要 Lv.' + requiredLevel + '（累计完成 ' + required.requiredCompleted + ' 项技术）', blockType: 'level' };
    }
    // 检查前置依赖
    for (const dep of tech.deps) {
      if (!this.isUnlocked(dep)) {
        const depName = CONFIG.TECH_RESEARCH[dep]?.name || dep;
        return { ok: false, reason: '需要先解锁: ' + depName, blockType: 'deps' };
      }
    }
    // 检查队列是否已满（最多同时研发2项 + 研究员加成）
    const maxConcurrent = 2 + Math.floor(Economy.getTotalResearchers() / 3);
    const currentCount = Object.keys(this.state.researching).length;
    if (currentCount >= maxConcurrent) {
      return { ok: false, reason: '研发队列已满 (' + currentCount + '/' + maxConcurrent + ')', blockType: 'queue' };
    }
    return { ok: true, targetLevel: currentLevel + 1 };
  },

  // 获取阻塞原因类型（用于UI显示不同badge）
  getBlockInfo(techKey) {
    const tech = CONFIG.TECH_RESEARCH[techKey];
    if (!tech) return { type: 'invalid', text: '未知' };
    // 检查未解锁的前置
    const missingDeps = tech.deps.filter(d => !this.isUnlocked(d));
    if (missingDeps.length > 0) {
      const names = missingDeps.map(d => CONFIG.TECH_RESEARCH[d]?.name || d).join(', ');
      return { type: 'deps', text: '需前置: ' + names };
    }
    if (this.getTechLevel(techKey) >= this.getMaxTechLevel(techKey)) return { type: 'maxed', text: '已达最高等级' };
    const levelInfo = this.getLevelInfo();
    const requiredLevel = tech.tier || 1;
    if (levelInfo.level < requiredLevel) {
      const required = CONFIG.RESEARCH_LEVELS[requiredLevel];
      return { type: 'level', text: '需研发 Lv.' + requiredLevel + '（完成 ' + required.requiredCompleted + ' 项）' };
    }
    // 检查队列
    const maxConcurrent = 2 + Math.floor(Economy.getTotalResearchers() / 3);
    const currentCount = Object.keys(this.state.researching).length;
    if (currentCount >= maxConcurrent) {
      return { type: 'queue', text: '队列已满 ' + currentCount + '/' + maxConcurrent };
    }
    return { type: 'unknown', text: '不可研发' };
  },

  // 开始研发
  startResearch(techKey) {
    const check = this.canResearch(techKey);
    if (!check.ok) {
      UI.toast(check.reason);
      return false;
    }
    const tech = CONFIG.TECH_RESEARCH[techKey];
    const s = Game.state;
    const upgrade = this.getUpgradeInfo(techKey, check.targetLevel);
    if (s.cash < upgrade.cost) {
      UI.toast('资金不足!');
      return false;
    }
    s.cash -= upgrade.cost;
    this.state.researching[techKey] = {
      daysElapsed: 0,
      totalDays: upgrade.days,
      cost: upgrade.cost,
      targetLevel: upgrade.targetLevel
    };
    Game.addLog('开始研发: ' + tech.name + ' Lv.' + upgrade.targetLevel + ' (预计 ' + upgrade.days + ' 天, 花费 $' + Economy.formatMoney(upgrade.cost) + ')');
    UI.update();
    return true;
  },

  // 每日推进研发
  advanceDay() {
    // 研究员按等级加速研发（初级+2%/高级+4%/首席+6%，与训练加成一致）
    const r = Game.state.researchers;
    const researcherBonus = 1 + r.junior * 0.02 + r.senior * 0.04 + r.principal * 0.06;
    for (const [key, prog] of Object.entries(this.state.researching)) {
      prog.daysElapsed += researcherBonus;
      if (prog.daysElapsed >= prog.totalDays) {
        this.completeResearch(key);
      }
    }
  },

  // 完成研发
  completeResearch(techKey) {
    const tech = CONFIG.TECH_RESEARCH[techKey];
    const prog = this.state.researching[techKey];
    const level = prog?.targetLevel || (this.getTechLevel(techKey) + 1);
    if (!this.isUnlocked(techKey)) this.state.unlocked.push(techKey);
    if (!this.state.techLevels) this.state.techLevels = {};
    this.state.techLevels[techKey] = level;
    delete this.state.researching[techKey];
    Game.addLog('研发完成: ' + tech.name + ' Lv.' + level + '!');
    UI.toast('研发完成: ' + tech.name + ' Lv.' + level);
    UI.update();
  },

  // 取消研发
  cancelResearch(techKey) {
    if (!this.state.researching[techKey]) return false;
    const tech = CONFIG.TECH_RESEARCH[techKey];
    const refund = Math.floor((this.state.researching[techKey].cost || tech.cost) * 0.3);
    Game.state.cash += refund;
    delete this.state.researching[techKey];
    Game.addLog('取消研发: ' + tech.name + ' (返还 $' + Economy.formatMoney(refund) + ')');
    UI.update();
    return true;
  },

  // 获取所有可用技术（含研发状态）
  getTechStatus() {
    const result = {};
    for (const [key, tech] of Object.entries(CONFIG.TECH_RESEARCH)) {
      let status = 'locked';
      let blockInfo = null;
      const currentLevel = this.getTechLevel(key);
      if (this.state.researching[key]) status = 'researching';
      else if (currentLevel >= this.getMaxTechLevel(key)) status = 'maxed';
      else {
        const check = this.canResearch(key);
        if (check.ok) {
          status = currentLevel > 0 ? 'upgradeable' : 'available';
        } else {
          status = 'blocked';
          blockInfo = this.getBlockInfo(key);
        }
      }
      result[key] = { ...tech, status, blockInfo, currentLevel, maxLevel: this.getMaxTechLevel(key), upgrade: this.getUpgradeInfo(key, currentLevel + 1) };
    }
    return result;
  },

  // 获取当前研发进度列表
  getResearchingList() {
    return Object.entries(this.state.researching).map(([key, prog]) => {
      const tech = CONFIG.TECH_RESEARCH[key];
      return {
        key,
        name: tech.name + ' Lv.' + (prog.targetLevel || this.getTechLevel(key) + 1),
        progress: (prog.daysElapsed / prog.totalDays) * 100,
        remaining: Math.max(0, Math.ceil(prog.totalDays - prog.daysElapsed)),
        totalDays: prog.totalDays
      };
    });
  }
};
