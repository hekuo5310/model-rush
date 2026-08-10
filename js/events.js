// Model Rush - 随机事件系统
// 作者：mukunjin
// 仓库：https://github.com/mukunjin/model-rush
const Events = {
  trigger() {
    const event = CONFIG.EVENTS[Math.floor(Math.random() * CONFIG.EVENTS.length)];
    const s = Game.state;

    Game.addLog('[Day ' + s.day + '] ' + event.name + ': ' + event.desc);

    switch (event.effect) {
      case 'lose_gpu':
        const lostPct = event.value || 0.02;
        for (const key of Object.keys(s.gpuInventory)) {
          const lost = Math.floor(s.gpuInventory[key] * lostPct);
          if (lost > 0) {
            s.gpuInventory[key] -= lost;
            s.gpuTotal -= lost;
            Datacenter.removeGPUs(key, lost);
          }
        }
        Game.addLog('损失约 ' + (lostPct * 100).toFixed(0) + '% GPU');
        break;

      case 'blackout':
        s.blackoutDays = event.days || 2;
        Game.addLog('停电 ' + s.blackoutDays + ' 天');
        break;

      case 'fine':
        const fine = event.value + Math.random() * event.value;
        s.cash -= fine;
        Game.addLog('罚款 $' + Economy.formatMoney(fine));
        break;

      case 'power_fault':
        const oldPower = s.powerCapacityMW;
        s.powerCapacityMW *= (1 - event.value);
        s.activeEffects.push({
          name: event.name,
          effect: 'power_fault_restore',
          value: oldPower,
          daysLeft: event.days
        });
        break;

      case 'eff_penalty':
        s.activeEffects.push({
          name: event.name,
          effect: 'eff_penalty',
          value: event.value,
          daysLeft: event.days
        });
        break;

      case 'training_boost':
        if (s.activeTraining) {
          const boostDays = Math.floor(s.activeTraining.totalDays * event.value);
          s.activeTraining.elapsedDays += boostDays;
          // 同步更新阶段天数 - 重新计算当前阶段
          let remainingDayBoost = boostDays;
          while (remainingDayBoost > 0) {
            const t = s.activeTraining;
            let phaseTotal = t.pretrainingDays;
            if (t.phase === 'sft') phaseTotal = t.sftDays;
            if (t.phase === 'alignment') phaseTotal = t.alignmentDays;
            const phaseRemaining = phaseTotal - t.phaseElapsedDays;
            if (remainingDayBoost >= phaseRemaining) {
              remainingDayBoost -= phaseRemaining;
              // 推进到下一阶段
              if (t.phase === 'pretraining') {
                t.phase = 'sft';
                t.phaseElapsedDays = 0;
              } else if (t.phase === 'sft') {
                t.phase = 'alignment';
                t.phaseElapsedDays = 0;
              } else {
                // 对齐阶段完成
                t.phaseElapsedDays = t.alignmentDays;
                break;
              }
            } else {
              t.phaseElapsedDays += remainingDayBoost;
              remainingDayBoost = 0;
            }
          }
          Game.addLog('当前训练加速 ' + (event.value * 100).toFixed(0) + '%');
        }
        break;

      case 'subsidy':
        s.cash += event.value;
        Game.addLog('获得补贴 $' + Economy.formatMoney(event.value));
        break;

      case 'income_penalty':
        s.activeEffects.push({
          name: event.name,
          effect: 'income_penalty',
          value: event.value,
          daysLeft: event.days
        });
        break;

      case 'buy_ban':
        s.buyBanDays = event.days;
        Game.addLog('芯片禁运 ' + event.days + ' 天');
        break;

      case 'valuation_boost':
        s.valuation *= (1 + event.value);
        Game.addLog('估值上升 ' + (event.value * 100).toFixed(0) + '%');
        break;

      case 'next_train_boost':
        s.activeEffects.push({
          name: event.name,
          effect: 'next_train_boost',
          value: event.value,
          daysLeft: 999
        });
        break;
    }

    UI.update();
  }
};