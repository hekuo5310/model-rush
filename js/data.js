// Model Rush - 数据采集与处理系统
// 作者：mukunjin
// 仓库：https://github.com/mukunjin/model-rush
const DataCollection = {
  // state: { sources: { web_crawl: 0, books: 0, ... }, collected: false, totalTokens: 0, avgQuality: 0 }
  state: { sources: {}, collected: false, totalTokens: 0, avgQuality: 0 },

  init() {
    for (const key of Object.keys(CONFIG.DATA_SOURCES)) {
      this.state.sources[key] = 0;
    }
  },

  // 购买数据源（tokens数量，单位：亿）
  buySource(sourceKey, tokensB) {
    const src = CONFIG.DATA_SOURCES[sourceKey];
    if (!src) return false;
    const cost = src.cost * (tokensB / 10); // 每10B tokens = 基础价格
    const s = Game.state;
    if (s.cash < cost) {
      UI.toast('资金不足! 需要 $' + Economy.formatMoney(cost));
      return false;
    }
    s.cash -= cost;
    this.state.sources[sourceKey] = (this.state.sources[sourceKey] || 0) + tokensB;
    Game.addLog('采集数据: ' + src.name + ' +' + tokensB + 'B tokens ($' + Economy.formatMoney(cost) + ')');
    UI.update();
    return true;
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
