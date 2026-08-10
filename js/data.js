// Model Rush - 数据采集与处理系统
const DataCollection = {
  // state: { sources, collected, activeJobs: [{ sourceKey, totalTokensB, collectedTokensB, daysTotal, daysElapsed }] }
  state: { sources: {}, collected: false, totalTokens: 0, avgQuality: 0, activeJobs: [] },
  TOKENS_PER_DAY_B: 5,

  init() {
    for (const key of Object.keys(CONFIG.DATA_SOURCES)) {
      this.state.sources[key] = 0;
    }
    if (!Array.isArray(this.state.activeJobs)) this.state.activeJobs = [];
  },

  // 启动实时采集任务（tokens 数量，单位：B）；费用预付，数据按游戏天持续到账。
  startCollection(sourceKey, tokensB) {
    const src = CONFIG.DATA_SOURCES[sourceKey];
    if (!src) return false;
    const cost = src.cost * (tokensB / 10); // 每10B tokens = 基础价格
    const s = Game.state;
    if (s.cash < cost) {
      UI.toast('资金不足! 需要 $' + Economy.formatMoney(cost));
      return false;
    }
    s.cash -= cost;
    const daysTotal = Math.max(1, Math.ceil(tokensB / this.TOKENS_PER_DAY_B));
    this.state.activeJobs.push({
      id: 'data_' + Game.state.day + '_' + Date.now(),
      sourceKey,
      name: src.name,
      totalTokensB: tokensB,
      collectedTokensB: 0,
      daysTotal,
      daysElapsed: 0
    });
    Game.addLog('开始实时采集: ' + src.name + ' ' + tokensB + 'B tokens（预计 ' + daysTotal + ' 天，预付 $' + Economy.formatMoney(cost) + '）');
    UI.update();
    return true;
  },

  // 兼容旧调用名称。
  buySource(sourceKey, tokensB) { return this.startCollection(sourceKey, tokensB); },

  getActiveJobs() { return Array.isArray(this.state.activeJobs) ? this.state.activeJobs : []; },

  advanceDay() {
    const completed = [];
    for (const job of this.getActiveJobs()) {
      const remaining = Math.max(0, job.totalTokensB - job.collectedTokensB);
      const dailyTokens = job.totalTokensB / Math.max(1, job.daysTotal);
      const gained = Math.min(remaining, dailyTokens);
      this.state.sources[job.sourceKey] = (this.state.sources[job.sourceKey] || 0) + gained;
      job.collectedTokensB += gained;
      job.daysElapsed++;
      if (job.collectedTokensB >= job.totalTokensB - 1e-6) completed.push(job);
    }
    if (completed.length > 0) {
      this.state.activeJobs = this.getActiveJobs().filter(job => !completed.includes(job));
      for (const job of completed) Game.addLog('数据采集完成: ' + job.name + ' +' + job.totalTokensB + 'B tokens');
    }
    // 采集量按天到帐时，正在打开的数据窗口也同步显示最新进度。
    if (this.getActiveJobs().length > 0 || completed.length > 0) UI.refreshActiveModal(['collect-data', 'new-training']);
  },

  // 计算数据总tokens和平均质量
  getStats() {
    let totalTokens = 0;
    let qualitySum = 0;
    for (const [key, tokensB] of Object.entries(this.state.sources)) {
      if (tokensB > 0) {
        const src = CONFIG.DATA_SOURCES[key];
        totalTokens += tokensB;
        qualitySum += tokensB * src.qualityBase;
      }
    }
    const avgQuality = totalTokens > 0 ? qualitySum / totalTokens : 0;
    const qualityLabel = avgQuality >= 0.85 ? '极高' : avgQuality >= 0.75 ? '良好' : avgQuality >= 0.60 ? '一般' : '低';
    return { totalTokens, avgQuality, qualityLabel };
  },

  // 应用数据去重技术加成
  getEffectiveQuality() {
    const stats = this.getStats();
    let quality = stats.avgQuality;
    if (Research.isUnlocked('data_dedup')) {
      quality += 0.08 * Research.getTechLevel('data_dedup');
    }
    return Math.min(quality, 0.95);
  },

  getEffectiveQualityLabel() {
    const q = this.getEffectiveQuality();
    return q >= 0.85 ? '极高' : q >= 0.75 ? '良好' : q >= 0.60 ? '一般' : '低';
  },

  // 确认数据采集完成，进入训练
  finalize() {
    const stats = this.getStats();
    if (stats.totalTokens <= 0) {
      UI.toast('请先采集至少一种数据源!');
      return false;
    }
    this.state.collected = true;
    Game.addLog('数据采集完成: ' + stats.totalTokens + 'B tokens, 质量: ' + stats.qualityLabel);
    return true;
  },

  // 重置数据采集（用于新一轮训练）
  reset() {
    for (const key of Object.keys(this.state.sources)) {
      this.state.sources[key] = 0;
    }
    this.state.collected = false;
    this.state.totalTokens = 0;
    this.state.avgQuality = 0;
    this.state.activeJobs = [];
  },

  // 获取数据类别分布（用于影响benchmark）
  getCategoryDistribution() {
    const dist = { reasoning: 0, coding: 0, comprehension: 0, multilingual: 0, safety: 0, long_context: 0 };
    let totalTokens = 0;
    for (const [key, tokensB] of Object.entries(this.state.sources)) {
      if (tokensB > 0) {
        totalTokens += tokensB;
        const src = CONFIG.DATA_SOURCES[key];
        switch (src.category) {
          case '推理': dist.reasoning += tokensB; break;
          case '编程': dist.coding += tokensB; break;
          case '知识': dist.comprehension += tokensB; break;
          case '多语言': dist.multilingual += tokensB; break;
          default: // 通用
            dist.comprehension += tokensB * 0.5;
            dist.reasoning += tokensB * 0.3;
            dist.coding += tokensB * 0.2;
        }
      }
    }
    return dist;
  }
};
