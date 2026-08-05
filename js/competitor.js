// Model Rush - 竞争对手 AI
const Competitor = {
  state: {
    models: [] // [{name, company, score, openSource, rank}]
  },

  init() {
    // 初始竞争对手模型 - 使用 basePower 计算，分梯队控制方差
    for (const comp of CONFIG.COMPETITORS) {
      // 梯队越低方差越小，保持排名稳定
      const power = comp.basePower;
      let variance;
      if (power >= 0.92) variance = 2;      // Tier 1: OpenAI, Google, Anthropic 极小波动
      else if (power >= 0.85) variance = 4;  // Tier 2: DeepSeek, Qwen, xAI, Kimi
      else variance = 6;                      // Tier 3: GLM, Minimax

      const score = power * 88 + (Math.random() * variance - variance / 2);
      this.state.models.push({
        name: comp.name,
        company: comp.name,
        score: Math.min(95, Math.max(55, score)),
        openSource: comp.openSource,
        rank: 0,
        tier: power >= 0.92 ? 1 : power >= 0.85 ? 2 : 3
      });
    }

    Benchmark.updateRankings();
  },

  release() {
    // 随机选一家厂商发布新模型
    const comp = CONFIG.COMPETITORS[Math.floor(Math.random() * CONFIG.COMPETITORS.length)];
    const existing = this.state.models.find(m => m.company === comp.name);

    // 梯队控制增长：Tier1增长慢但稳定，Tier3可以快但上限低
    const tier = existing ? existing.tier : (comp.basePower >= 0.92 ? 1 : comp.basePower >= 0.85 ? 2 : 3);
    let growth;
    if (tier === 1) {
      growth = 0.5 + Math.random() * 1.5;    // Tier 1: 0.5~2.0 分增长
    } else if (tier === 2) {
      growth = 1.0 + Math.random() * 2.5;    // Tier 2: 1.0~3.5 分增长
    } else {
      growth = 1.5 + Math.random() * 4.0;    // Tier 3: 1.5~5.5 分增长
    }

    // 各梯队分数上限
    const tierCap = tier === 1 ? 95 : tier === 2 ? 90 : 85;

    const baseScore = existing ? existing.score : comp.basePower * 88;
    const newScore = Math.min(tierCap, baseScore + growth);

    if (existing) {
      existing.score = newScore;
      Game.addLog(comp.name + ' 发布新模型，得分: ' + newScore.toFixed(1) + (comp.openSource ? ' [开源]' : ''));
    } else {
      this.state.models.push({
        name: comp.name,
        company: comp.name,
        score: newScore,
        openSource: comp.openSource,
        rank: 0,
        tier: tier
      });
      Game.addLog(comp.name + ' 首次发布模型，得分: ' + newScore.toFixed(1) + (comp.openSource ? ' [开源]' : ''));
    }

    // 开源冲击检查
    const top3Open = this.state.models.filter(m => m.openSource && m.rank <= 3).length > 0;
    if (top3Open && Game.state.deployedModels.length > 0) {
      const playerModels = Game.state.deployedModels.filter(m => !m.openSource);
      if (playerModels.length > 0) {
        Game.addLog('开源模型占据前3，闭源模型收入受冲击');
      }
    }

    Benchmark.updateRankings();
    UI.update();
  }
};