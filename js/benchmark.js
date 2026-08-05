// Model Rush - Benchmark 评分系统
const Benchmark = {
  evaluate(training) {
    const scale = CONFIG.MODEL_SCALES[training.scale];
    const dataQuality = CONFIG.DATA_QUALITY[training.dataQuality];

    // 基础分: 基于参数量 (对数缩放，上限52)
    const logParams = Math.log10(scale.params);
    let baseScore = 22 + Math.max(0, (logParams - 9)) * 10; // 1B(22) -> 70B(40) -> 400B(48) -> 1T(52)
    baseScore = Math.max(15, Math.min(52, baseScore));

    // 质量加成（加法叠加，上限1.5）
    let qualitySum = 1.0 + dataQuality.scoreMod;

    for (const techKey of training.selectedTechs) {
      const tech = CONFIG.TECHNIQUES[techKey];
      if (tech && tech.qualityMod) {
        qualitySum += tech.qualityMod;
      }
    }

    if (training.alignmentMethod === 'rlhf') {
      qualitySum += 0.05;
    } else if (training.alignmentMethod === 'dpo') {
      qualitySum += 0.02;
    }

    qualitySum = Math.min(qualitySum, 1.5);

    let score = baseScore * qualitySum;

    // 中断惩罚（-5%每次）
    score *= (1 - training.interruptions * 0.05);

    // 随机波动 +/-5%
    score *= (0.95 + Math.random() * 0.10);

    return Math.max(0, Math.min(100, score));
  },

  updateRankings() {
    const s = Game.state;

    // 收集所有模型（玩家 + 竞争对手）
    let allModels = [];
    for (const model of s.deployedModels) {
      allModels.push({ ...model, isPlayer: true });
    }

    // 竞争对手模型
    for (const comp of Competitor.state.models) {
      allModels.push({ ...comp, isPlayer: false });
    }

    // 按分数降序排列
    allModels.sort((a, b) => b.score - a.score);

    // 分配排名
    for (let i = 0; i < allModels.length; i++) {
      allModels[i].rank = i + 1;
    }

    // 更新玩家模型排名
    for (const model of s.deployedModels) {
      const found = allModels.find(m => m.name === model.name && m.isPlayer);
      if (found) model.rank = found.rank;
    }

    Competitor.state.models = allModels.filter(m => !m.isPlayer);
  }
};