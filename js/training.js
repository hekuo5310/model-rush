// Model Rush - 模型训练系统
const Training = {
  // 当前训练任务: { phase, scale, dataQuality, alignmentMethod, selectedTechs, gpuAllocated, totalDays, elapsedDays, phaseElapsedDays, modelName, openSource }
  newTraining(config) {
    const s = Game.state;
    if (s.activeTraining) {
      UI.toast('已有训练任务在进行中!');
      return false;
    }

    const scale = CONFIG.MODEL_SCALES[config.scale];
    const dataQuality = CONFIG.DATA_QUALITY[config.dataQuality];
    const gpuCount = config.gpuCount;

    if (gpuCount <= 0 || gpuCount > s.gpuTotal) {
      UI.toast('GPU数量不足!');
      return false;
    }

    // 计算总训练FLOPs（使用对数避免溢出）
    // 6 * params * tokens, 对于1T(1e12) * 20T(20e12) = 1.2e26，远超JS安全整数
    const logFlops = Math.log10(6) + Math.log10(scale.params) + Math.log10(scale.tokens);

    // 计算训练效率
    let efficiency = CONFIG.BASE_EFFICIENCY;
    for (const techKey of config.selectedTechs) {
      const tech = CONFIG.TECHNIQUES[techKey];
      if (tech && tech.effBonus) efficiency += tech.effBonus;
    }
    efficiency *= Game.getEffMultiplier();

    // 消耗 next_train_boost 效果
    Game.state.activeEffects = Game.state.activeEffects.filter(e => e.effect !== 'next_train_boost');

    // 分配GPU的平均TFLOPS
    const avgTFLOPS = Game.getTotalTFLOPS() / Math.max(1, s.gpuTotal);
    const allocatedTFLOPS = avgTFLOPS * gpuCount;

    // 训练天数（使用对数计算避免溢出）
    // totalDays = totalFlops / (allocatedTFLOPS * 1e12 * efficiency * 86400)
    const logDays = logFlops - (Math.log10(allocatedTFLOPS) + 12 + Math.log10(efficiency) + Math.log10(CONFIG.SECONDS_PER_DAY));
    const totalDays = Math.max(1, Math.ceil(Math.pow(10, logDays)));

    const pretrainingDays = Math.max(1, Math.ceil(totalDays * CONFIG.TRAINING_PHASES.pretraining.timeRatio));
    const sftDays = Math.max(1, Math.ceil(totalDays * CONFIG.TRAINING_PHASES.sft.timeRatio));
    const alignmentDays = Math.max(1, totalDays - pretrainingDays - sftDays);

    // 扣除训练费用
    let trainingCost = 0;
    // 数据质量费用
    if (dataQuality.cost) trainingCost += dataQuality.cost;
    // 对齐方法费用
    if (config.alignmentMethod === 'rlhf') trainingCost += CONFIG.ALIGNMENT_METHODS.rlhf.cost;
    else if (config.alignmentMethod === 'dpo') trainingCost += CONFIG.ALIGNMENT_METHODS.dpo.cost;
    // 技术费用
    for (const techKey of config.selectedTechs) {
      const tech = CONFIG.TECHNIQUES[techKey];
      if (tech && tech.cost) trainingCost += tech.cost;
    }

    if (trainingCost > 0 && s.cash < trainingCost) {
      UI.toast('资金不足，无法支付训练费用!');
      return false;
    }
    s.cash -= trainingCost;
    if (trainingCost > 0) {
      Game.addLog('训练费用: $' + Economy.formatMoney(trainingCost));
    }

    s.activeTraining = {
      phase: 'pretraining',
      scale: config.scale,
      dataQuality: config.dataQuality,
      alignmentMethod: config.alignmentMethod || 'dpo',
      selectedTechs: config.selectedTechs || [],
      gpuAllocated: gpuCount,
      totalDays: totalDays,
      pretrainingDays,
      sftDays,
      alignmentDays,
      elapsedDays: 0,
      phaseElapsedDays: 0,
      modelName: config.modelName || ('Model-' + s.day),
      openSource: config.openSource || false,
      interruptions: 0,
      collapsed: false
    };

    Game.addLog('开始训练 ' + s.activeTraining.modelName + ' (' + scale.name + '), 预计 ' + totalDays + ' 天');

    // 标记训练中GPU
    Datacenter.markTrainingGPUs(gpuCount);

    UI.update();
    return true;
  },

  advanceTrainingDay() {
    const t = Game.state.activeTraining;
    if (!t || t.collapsed) return;

    if (Game.state.blackoutDays > 0) {
      t.interruptions++;
      if (t.interruptions >= 3) {
        t.collapsed = true;
        Game.addLog('训练崩坏! ' + t.modelName + ' 因多次中断而失败');
        this.clearTraining();
        UI.update();
        return;
      }
      return;
    }

    t.elapsedDays++;
    t.phaseElapsedDays++;

    // 阶段切换
    if (t.phase === 'pretraining' && t.phaseElapsedDays >= t.pretrainingDays) {
      t.phase = 'sft';
      t.phaseElapsedDays = 0;
      Game.addLog(t.modelName + ' 预训练阶段完成，进入SFT微调');
    } else if (t.phase === 'sft' && t.phaseElapsedDays >= t.sftDays) {
      t.phase = 'alignment';
      t.phaseElapsedDays = 0;
      Game.addLog(t.modelName + ' SFT微调完成，进入对齐训练');
    } else if (t.phase === 'alignment' && t.phaseElapsedDays >= t.alignmentDays) {
      this.completeTraining();
    }
  },

  update(dt) {
    // 由 advanceDay 驱动，这里不需要额外逻辑
  },

  completeTraining() {
    const t = Game.state.activeTraining;
    Game.addLog(t.modelName + ' 训练完成!');

    const score = Benchmark.evaluate(t);
    const model = {
      name: t.modelName,
      scale: CONFIG.MODEL_SCALES[t.scale].label,
      score: score,
      openSource: t.openSource,
      techs: t.selectedTechs,
      rank: 0,
      deployed: true
    };

    Game.state.deployedModels.push(model);
    Game.state.completedModels.push(model);

    // 更新排行榜
    Benchmark.updateRankings();

    this.clearTraining();
    Game.addLog(t.modelName + ' 综合得分: ' + score.toFixed(1) + (t.openSource ? ' [开源]' : ' [闭源]'));
    UI.toast(t.modelName + ' 训练完成! 得分: ' + score.toFixed(1));
    UI.update();
  },

  clearTraining() {
    const s = Game.state;
    if (s.activeTraining) {
      s.activeTraining = null;
      Datacenter.unmarkTrainingGPUs();
    }
  },

  abandonTraining() {
    const s = Game.state;
    if (!s.activeTraining) {
      UI.toast('没有进行中的训练任务!');
      return;
    }
    const t = s.activeTraining;
    Game.addLog('放弃训练: ' + t.modelName + ' (已进行 ' + t.elapsedDays + ' 天)');
    this.clearTraining();
    UI.toast(t.modelName + ' 训练已放弃');
    UI.update();
  },

  getProgress() {
    const t = Game.state.activeTraining;
    if (!t) return null;

    const phaseConfig = CONFIG.TRAINING_PHASES[t.phase];
    let phaseTotalDays = t.pretrainingDays;
    if (t.phase === 'sft') phaseTotalDays = t.sftDays;
    if (t.phase === 'alignment') phaseTotalDays = t.alignmentDays;

    const overallProgress = Math.min(100, (t.elapsedDays / t.totalDays) * 100);
    const phaseProgress = Math.min(100, (t.phaseElapsedDays / Math.max(1, phaseTotalDays)) * 100);

    return {
      phase: phaseConfig.name,
      overallProgress,
      phaseProgress,
      elapsedDays: t.elapsedDays,
      totalDays: t.totalDays,
      remainingDays: t.totalDays - t.elapsedDays,
      modelName: t.modelName,
      scale: CONFIG.MODEL_SCALES[t.scale].name,
      interruptions: t.interruptions,
      collapsed: t.collapsed
    };
  }
};