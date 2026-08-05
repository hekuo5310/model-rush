// Model Rush - UI 更新与交互
const UI = {
  init() {
    UI.update();
    UI.initPanelTabs();
    UI.initPanelResize();
  },

  initPanelTabs() {
    document.querySelectorAll('.panel-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        document.querySelector('.tab-panel[data-tab="' + target + '"]').classList.add('active');
      });
    });
  },

  initPanelResize() {
    const handle = document.getElementById('panel-resize-handle');
    const panel = document.getElementById('right-panel');
    let startX, startWidth;

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startX = e.clientX;
      startWidth = panel.offsetWidth;
      handle.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMove = (e2) => {
        const dx = e2.clientX - startX;
        const newWidth = Math.max(240, Math.min(500, startWidth - dx));
        panel.style.width = newWidth + 'px';
      };
      const onUp = () => {
        handle.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  },

  update() {
    const s = Game.state;

    // 顶部栏
    document.getElementById('cash').textContent = '$' + Economy.formatMoney(s.cash);
    document.getElementById('valuation').textContent = '$' + Economy.formatMoney(s.valuation);
    document.getElementById('day').textContent = s.day;
    if (s.speed === 0) document.getElementById('day').textContent = s.day + ' (暂停)';

    // 右侧面板 - 财务
    document.getElementById('panel-income').textContent = '+$' + Economy.formatMoney(s.dailyIncome);
    document.getElementById('panel-expense').textContent = '-$' + Economy.formatMoney(s.dailyExpense);
    const profit = s.dailyIncome - s.dailyExpense;
    const profitEl = document.getElementById('panel-profit');
    profitEl.textContent = (profit >= 0 ? '+' : '') + '$' + Economy.formatMoney(profit);
    profitEl.className = 'font-mono text-right ' + (profit >= 0 ? 'text-accent' : 'text-danger');
    document.getElementById('panel-cash').textContent = '$' + Economy.formatMoney(s.cash);

    // 训练状态
    UI.updateTrainingStatus();

    // 排行榜
    UI.updateLeaderboard();

    // GPU 库存
    UI.updateGPUInventory();

    // 事件日志
    UI.updateEventLog();

    // 融资按钮
    document.getElementById('bottombar').querySelectorAll('button')[7].textContent = s.canFundraise ? '发起融资' : '融资冷却中';

    // 研究员
    const r = s.researchers;
    const totalR = r.junior + r.senior + r.principal;
    document.getElementById('panel-researcher').textContent = totalR + ' (J:' + r.junior + ' S:' + r.senior + ' P:' + r.principal + ')';
  },

  updateTrainingStatus() {
    const s = Game.state;
    const statusEl = document.getElementById('training-status');
    const progressEl = document.getElementById('training-progress');

    if (!s.activeTraining) {
      statusEl.classList.remove('hidden');
      statusEl.textContent = '暂无训练任务';
      progressEl.classList.add('hidden');
      document.getElementById('abandon-train-btn').classList.add('hidden');
      return;
    }

    const prog = Training.getProgress();
    if (!prog) return;

    statusEl.classList.add('hidden');
    progressEl.classList.remove('hidden');
    document.getElementById('abandon-train-btn').classList.remove('hidden');

    if (prog.collapsed) {
      document.getElementById('training-phase').textContent = '训练崩坏';
      document.getElementById('training-pct').textContent = '';
      document.getElementById('training-bar').style.width = '0%';
      document.getElementById('training-bar').style.background = '#e74c3c';
      document.getElementById('training-eta').textContent = '模型已失败';
      return;
    }

    document.getElementById('training-phase').textContent = prog.modelName + ' - ' + prog.phase;
    document.getElementById('training-pct').textContent = prog.overallProgress.toFixed(1) + '%';
    document.getElementById('training-bar').style.width = prog.overallProgress + '%';
    document.getElementById('training-bar').style.background = '#00ff88';
    document.getElementById('training-eta').textContent = '剩余 ' + prog.remainingDays + ' 天 (' + prog.scale + ')';
    if (prog.interruptions > 0) {
      document.getElementById('training-eta').textContent += ' | 中断 ' + prog.interruptions + ' 次';
    }
  },

  updateLeaderboard() {
    const s = Game.state;
    const el = document.getElementById('leaderboard');

    let allModels = [];
    // 玩家模型
    for (const model of s.deployedModels) {
      allModels.push({ ...model, isPlayer: true, company: Game.state.companyName || '你' });
    }
    // 竞争对手模型
    for (const model of Competitor.state.models) {
      allModels.push({ ...model, isPlayer: false });
    }

    allModels.sort((a, b) => b.score - a.score);
    for (let i = 0; i < allModels.length; i++) {
      allModels[i].rank = i + 1;
    }

    let html = '';
    for (let i = 0; i < Math.min(10, allModels.length); i++) {
      const m = allModels[i];
      const rankClass = m.rank === 1 ? 'rank-1' : m.rank === 2 ? 'rank-2' : m.rank === 3 ? 'rank-3' : '';
      const playerClass = m.isPlayer ? 'text-accent font-bold' : '';
      const openTag = m.openSource ? ' [开源]' : '';
      const sotaTag = m.rank === 1 ? ' <span class="tag tag-amber">SOTA</span>' : '';
      html += '<div class="flex justify-between text-xs ' + playerClass + '">' +
        '<span class="' + rankClass + '">#' + m.rank + ' ' + (m.isPlayer ? m.name : m.company) + openTag + sotaTag + '</span>' +
        '<span class="font-mono">' + m.score.toFixed(1) + '</span>' +
        '</div>';
    }
    el.innerHTML = html || '<div class="text-muted italic">暂无数据</div>';
  },

  updateGPUInventory() {
    const s = Game.state;
    const el = document.getElementById('gpu-inventory');
    let html = '';
    for (const [key, count] of Object.entries(s.gpuInventory)) {
      if (count > 0) {
        const gpu = CONFIG.GPUS[key];
        const colorHex = '#' + gpu.color.toString(16).padStart(6, '0');
        html += '<div class="flex justify-between text-xs">' +
          '<span><span class="inline-block w-2 h-2 rounded-full mr-1" style="background:' + colorHex + '"></span>' + key + '</span>' +
          '<span class="font-mono">' + count + '</span>' +
          '</div>';
      }
    }
    el.innerHTML = html || '<div class="text-muted italic">暂无GPU</div>';

    const totalPower = Game.getTotalPowerMW();
    const gpuPower = Game.getGPUPowerMW();
    const coolingLoad = gpuPower * CONFIG.COOLING_RATIO;
    document.getElementById('panel-power').textContent = totalPower.toFixed(1);
    document.getElementById('panel-power-cap').textContent = s.powerCapacityMW + '';
    document.getElementById('panel-cooling-load').textContent = coolingLoad.toFixed(1);
    document.getElementById('panel-cooling-cap').textContent = s.coolingCapacityMW + '';
    document.getElementById('panel-gpu-total').textContent = s.gpuTotal;

    // 超载/冷却警告
    const powerEl = document.getElementById('panel-power');
    const coolingEl = document.getElementById('panel-cooling-load');
    if (totalPower > s.powerCapacityMW) {
      powerEl.className = 'font-mono text-danger';
    } else {
      powerEl.className = 'font-mono';
    }
    if (coolingLoad > s.coolingCapacityMW) {
      coolingEl.className = 'font-mono text-danger';
    } else {
      coolingEl.className = 'font-mono';
    }
  },

  updateEventLog() {
    const el = document.getElementById('event-log');
    const logs = Game.state.eventLog.slice(0, 20);
    el.innerHTML = logs.map(l => '<div class="text-xs text-muted">[Day ' + l.day + '] ' + l.msg + '</div>').join('');
  },

  showModal(type) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');

    let html = '';
    switch (type) {
      case 'buy-gpu': html = UI.buildBuyGPUModal(); break;
      case 'demolish-gpu': html = UI.buildDemolishGPUModal(); break;
      case 'expand-power': html = UI.buildExpandPowerModal(); break;
      case 'expand-cooling': html = UI.buildExpandCoolingModal(); break;
      case 'new-training': html = UI.buildTrainingModal(); break;
      case 'hire-researcher': html = UI.buildHireResearcherModal(); break;
    }

    content.innerHTML = html;
    overlay.classList.remove('hidden');

    // 绑定事件
    if (type === 'buy-gpu') UI.bindBuyGPUEvents();
    else if (type === 'demolish-gpu') UI.bindDemolishGPUEvents();
    else if (type === 'expand-power') UI.bindExpandPowerEvents();
    else if (type === 'expand-cooling') UI.bindExpandCoolingEvents();
    else if (type === 'new-training') UI.bindTrainingEvents();
    else if (type === 'hire-researcher') UI.bindHireResearcherEvents();
  },

  hideModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
  },

  // === 购买GPU模态框 ===
  buildBuyGPUModal() {
    const s = Game.state;
    let html = '<h2 class="text-lg font-bold text-accent mb-3">购买 GPU 机架</h2>';
    html += '<p class="text-xs text-muted mb-3">1 Rack = 8 GPU</p>';

    if (s.buyBanDays > 0) {
      html += '<div class="text-danger text-sm mb-3">芯片禁运中，剩余 ' + s.buyBanDays + ' 天</div>';
    }

    html += '<div class="grid grid-cols-2 gap-2 mb-3">';
    for (const [key, gpu] of Object.entries(CONFIG.GPUS)) {
      const colorHex = '#' + gpu.color.toString(16).padStart(6, '0');
      html += '<div class="gpu-option p-2 border border-border rounded cursor-pointer hover:border-accent" data-gpu="' + key + '">' +
        '<div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full" style="background:' + colorHex + '"></span>' +
        '<span class="font-bold text-sm">' + gpu.name + '</span></div>' +
        '<div class="text-xs text-muted mt-1">' + gpu.arch + ' | ' + gpu.tflops + ' TFLOPS</div>' +
        '<div class="text-xs text-muted">' + gpu.vram + 'GB ' + gpu.vram_type + ' | ' + gpu.power + 'W</div>' +
        '<div class="text-xs text-accent mt-1">$' + Economy.formatMoney(gpu.price) + ' / GPU</div>' +
        '</div>';
    }
    html += '</div>';

    html += '<div class="flex items-center gap-2 mb-3">' +
      '<span class="text-xs text-muted">机架数量:</span>' +
      '<input id="gpu-racks" type="number" class="modal-input w-24" value="10" min="1" max="1000">' +
      '<span class="text-xs text-muted">(= <span id="gpu-count">80</span> GPU)</span>' +
      '</div>';

    html += '<div class="text-xs text-muted mb-3">预计花费: <span id="gpu-cost" class="text-accent">$0</span></div>';

    html += '<div class="flex gap-2 justify-end">' +
      '<button onclick="UI.hideModal()" class="modal-btn">取消</button>' +
      '<button id="confirm-buy" class="modal-btn primary">确认购买</button>' +
      '</div>';

    return html;
  },

  bindBuyGPUEvents() {
    let selectedGpu = 'H100';
    const updateCost = () => {
      const racks = parseInt(document.getElementById('gpu-racks').value) || 0;
      const gpu = CONFIG.GPUS[selectedGpu];
      document.getElementById('gpu-count').textContent = racks * 8;
      document.getElementById('gpu-cost').textContent = '$' + Economy.formatMoney(racks * 8 * gpu.price);
    };

    document.querySelectorAll('.gpu-option').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.gpu-option').forEach(e => e.classList.remove('border-accent', 'bg-accent/5'));
        el.classList.add('border-accent', 'bg-accent/5');
        selectedGpu = el.dataset.gpu;
        updateCost();
      });
    });

    // 默认选中H100
    const h100El = document.querySelector('.gpu-option[data-gpu="H100"]');
    if (h100El) h100El.classList.add('border-accent', 'bg-accent/5');

    document.getElementById('gpu-racks').addEventListener('input', updateCost);
    updateCost();

    document.getElementById('confirm-buy').addEventListener('click', () => {
      const racks = parseInt(document.getElementById('gpu-racks').value) || 0;
      if (racks <= 0) return;
      Economy.buyGPUs(selectedGpu, racks);
      UI.hideModal();
    });
  },

  // === 拆除GPU模态框 ===
  buildDemolishGPUModal() {
    const s = Game.state;
    let html = '<h2 class="text-lg font-bold text-accent mb-3">拆除 GPU</h2>';
    html += '<p class="text-xs text-muted mb-3">选择要拆除的GPU型号和数量，拆除返还50%购买价</p>';

    html += '<div class="grid grid-cols-2 gap-2 mb-3">';
    for (const [key, gpu] of Object.entries(CONFIG.GPUS)) {
      const count = s.gpuInventory[key] || 0;
      const refund = Math.floor(gpu.price * 0.5);
      const colorHex = '#' + gpu.color.toString(16).padStart(6, '0');
      html += '<div class="demolish-option p-2 border border-border rounded cursor-pointer hover:border-danger ' + (count === 0 ? 'opacity-40' : '') + '" data-gpu="' + key + '">' +
        '<div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full" style="background:' + colorHex + '"></span>' +
        '<span class="font-bold text-sm">' + gpu.name + '</span></div>' +
        '<div class="text-xs text-muted">库存: ' + count + ' 张 | 返还 $' + Economy.formatMoney(refund) + '/张</div>' +
        '</div>';
    }
    html += '</div>';

    html += '<div class="flex items-center gap-2 mb-3">' +
      '<span class="text-xs text-muted">拆除数量:</span>' +
      '<input id="demolish-qty" type="number" class="modal-input w-24" value="0" min="0">' +
      '<span class="text-xs text-muted">张 GPU</span>' +
      '</div>';
    html += '<div class="text-xs text-muted mb-3">预计返还: <span id="demolish-refund" class="text-accent">$0</span></div>';

    html += '<div class="flex gap-2 justify-end">' +
      '<button onclick="UI.hideModal()" class="modal-btn">取消</button>' +
      '<button id="confirm-demolish" class="modal-btn danger">确认拆除</button>' +
      '</div>';

    return html;
  },

  bindDemolishGPUEvents() {
    let selectedGpu = null;
    let maxQty = 0;

    const updateRefund = () => {
      const qty = parseInt(document.getElementById('demolish-qty').value) || 0;
      const clampedQty = Math.min(qty, maxQty);
      if (qty !== clampedQty) document.getElementById('demolish-qty').value = clampedQty;
      if (selectedGpu) {
        const refund = Math.floor(CONFIG.GPUS[selectedGpu].price * 0.5);
        document.getElementById('demolish-refund').textContent = '$' + Economy.formatMoney(clampedQty * refund);
      } else {
        document.getElementById('demolish-refund').textContent = '$0';
      }
    };

    document.querySelectorAll('.demolish-option:not(.opacity-40)').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.demolish-option').forEach(e => e.classList.remove('border-danger', 'bg-danger/5'));
        el.classList.add('border-danger', 'bg-danger/5');
        selectedGpu = el.dataset.gpu;
        maxQty = Game.state.gpuInventory[selectedGpu] || 0;
        document.getElementById('demolish-qty').max = maxQty;
        updateRefund();
      });
    });

    document.getElementById('demolish-qty').addEventListener('input', updateRefund);

    document.getElementById('confirm-demolish').addEventListener('click', () => {
      if (!selectedGpu) return;
      const qty = parseInt(document.getElementById('demolish-qty').value) || 0;
      const clampedQty = Math.min(qty, maxQty);
      if (clampedQty <= 0) return;
      Economy.demolishGPUs(selectedGpu, clampedQty);
      UI.hideModal();
    });
  },

  // === 扩容供电模态框 ===
  buildExpandPowerModal() {
    const s = Game.state;
    let html = '<h2 class="text-lg font-bold text-accent mb-3">扩容供电</h2>';
    html += '<div class="text-xs text-muted mb-3">当前容量: ' + s.powerCapacityMW + 'MW | 扩容成本: $' + Economy.formatMoney(CONFIG.POWER_EXPAND_COST_PER_MW) + ' / MW</div>';
    html += '<div class="flex items-center gap-2 mb-3">' +
      '<span class="text-xs text-muted">扩容:</span>' +
      '<input id="power-mw" type="number" class="modal-input w-24" value="5" min="1" max="100">' +
      '<span class="text-xs text-muted">MW</span>' +
      '</div>';
    html += '<div class="text-xs text-muted mb-3">预计花费: <span id="power-cost" class="text-accent">$250M</span></div>';
    html += '<div class="flex gap-2 justify-end">' +
      '<button onclick="UI.hideModal()" class="modal-btn">取消</button>' +
      '<button id="confirm-power" class="modal-btn primary">确认扩容</button>' +
      '</div>';
    return html;
  },

  bindExpandPowerEvents() {
    const updateCost = () => {
      const mw = parseInt(document.getElementById('power-mw').value) || 0;
      document.getElementById('power-cost').textContent = '$' + Economy.formatMoney(mw * CONFIG.POWER_EXPAND_COST_PER_MW);
    };
    document.getElementById('power-mw').addEventListener('input', updateCost);
    document.getElementById('confirm-power').addEventListener('click', () => {
      const mw = parseInt(document.getElementById('power-mw').value) || 0;
      if (mw <= 0) return;
      Economy.expandPower(mw);
      UI.hideModal();
    });
  },

  // === 扩容冷却模态框 ===
  buildExpandCoolingModal() {
    const s = Game.state;
    let html = '<h2 class="text-lg font-bold text-accent mb-3">扩容冷却系统</h2>';
    html += '<div class="text-xs text-muted mb-3">当前容量: ' + s.coolingCapacityMW + 'MW | 扩容成本: $' + Economy.formatMoney(CONFIG.COOLING_EXPAND_COST_PER_MW) + ' / MW</div>';
    html += '<div class="flex items-center gap-2 mb-3">' +
      '<span class="text-xs text-muted">扩容:</span>' +
      '<input id="cooling-mw" type="number" class="modal-input w-24" value="2" min="1" max="100">' +
      '<span class="text-xs text-muted">MW</span>' +
      '</div>';
    html += '<div class="text-xs text-muted mb-3">预计花费: <span id="cooling-cost" class="text-accent">$40M</span></div>';
    html += '<div class="flex gap-2 justify-end">' +
      '<button onclick="UI.hideModal()" class="modal-btn">取消</button>' +
      '<button id="confirm-cooling" class="modal-btn primary">确认扩容</button>' +
      '</div>';
    return html;
  },

  bindExpandCoolingEvents() {
    const updateCost = () => {
      const mw = parseInt(document.getElementById('cooling-mw').value) || 0;
      document.getElementById('cooling-cost').textContent = '$' + Economy.formatMoney(mw * CONFIG.COOLING_EXPAND_COST_PER_MW);
    };
    document.getElementById('cooling-mw').addEventListener('input', updateCost);
    document.getElementById('confirm-cooling').addEventListener('click', () => {
      const mw = parseInt(document.getElementById('cooling-mw').value) || 0;
      if (mw <= 0) return;
      Economy.expandCooling(mw);
      UI.hideModal();
    });
  },

  // === 新建训练模态框 ===
  buildTrainingModal() {
    const s = Game.state;
    if (s.activeTraining) {
      return '<h2 class="text-lg font-bold text-accent mb-3">新建训练</h2>' +
        '<div class="text-amber text-sm mb-3">已有训练任务进行中，请等待完成或放弃后再创建新任务</div>' +
        '<div class="flex gap-2 justify-end">' +
        '<button onclick="UI.hideModal()" class="modal-btn primary">关闭</button>' +
        '</div>';
    }

    let html = '<h2 class="text-lg font-bold text-accent mb-3">新建训练任务</h2>';

    // 模型名称
    html += '<div class="mb-3"><label class="text-xs text-muted">模型名称</label>' +
      '<input id="train-name" type="text" class="modal-input" value="Model-' + s.day + '" maxlength="20"></div>';

    // 模型规模
    html += '<div class="mb-3"><label class="text-xs text-muted">模型规模</label><div class="grid grid-cols-2 gap-1 mt-1">';
    const scales = ['small', 'medium', 'large', 'frontier'];
    for (const key of scales) {
      const sc = CONFIG.MODEL_SCALES[key];
      html += '<div class="scale-option p-2 border border-border rounded cursor-pointer hover:border-accent text-xs" data-scale="' + key + '">' +
        sc.name + ' (' + sc.label + ')</div>';
    }
    html += '</div></div>';

    // 数据质量
    html += '<div class="mb-3"><label class="text-xs text-muted">数据质量</label><div class="grid grid-cols-2 gap-1 mt-1">';
    for (const [key, dq] of Object.entries(CONFIG.DATA_QUALITY)) {
      html += '<div class="quality-option p-2 border border-border rounded cursor-pointer hover:border-accent text-xs" data-quality="' + key + '">' +
        dq.name + ' ($' + Economy.formatMoney(dq.cost) + ')</div>';
    }
    html += '</div></div>';

    // GPU 分配
    html += '<div class="mb-3 flex items-center gap-2">' +
      '<span class="text-xs text-muted">分配GPU:</span>' +
      '<input id="train-gpu" type="number" class="modal-input w-24" value="' + Math.min(128, s.gpuTotal) + '" min="1" max="' + s.gpuTotal + '">' +
      '<span class="text-xs text-muted">/ ' + s.gpuTotal + ' 可用</span>' +
      '</div>';
    html += '<div class="text-xs text-muted mb-3">预估功耗: <span id="train-power-estimate" class="font-mono">0.0</span> MW | 当前总功耗: <span class="font-mono">' + Game.getTotalPowerMW().toFixed(1) + '</span> MW</div>';

    // 对齐方法
    html += '<div class="mb-3"><label class="text-xs text-muted">对齐方法</label><div class="flex gap-2 mt-1">' +
      '<div class="align-option p-2 border border-border rounded cursor-pointer hover:border-accent text-xs" data-align="rlhf">RLHF + PPO (高成本, 高质量)</div>' +
      '<div class="align-option p-2 border border-border rounded cursor-pointer hover:border-accent text-xs" data-align="dpo">DPO (低成本, 稳定)</div>' +
      '</div></div>';

    // 技术选择
    html += '<div class="mb-3"><label class="text-xs text-muted">技术选择 (点击选择)</label><div class="grid grid-cols-2 gap-1 mt-1" id="tech-grid">';
    for (const [key, tech] of Object.entries(CONFIG.TECHNIQUES)) {
      html += '<div class="tech-card" data-tech="' + key + '">' +
        '<div class="text-xs font-bold">' + tech.name + '</div>' +
        '<div class="text-xs text-muted">' + tech.desc + '</div>' +
        '<div class="text-xs tag ' + (tech.effBonus ? 'tag-green' : '') + (tech.qualityMod ? 'tag-amber' : '') + (tech.incomeBonus ? 'tag-green' : '') + '">' + tech.effect + '</div>' +
        '</div>';
    }
    html += '</div></div>';

    // 开源选择
    html += '<div class="mb-3"><label class="text-xs text-muted">开源策略</label><div class="flex gap-2 mt-1">' +
      '<div class="open-option p-2 border border-border rounded cursor-pointer hover:border-accent text-xs" data-open="false">闭源 (API收入)</div>' +
      '<div class="open-option p-2 border border-border rounded cursor-pointer hover:border-accent text-xs" data-open="true">开源 (社区传播)</div>' +
      '</div></div>';

    html += '<div class="flex gap-2 justify-end">' +
      '<button onclick="UI.hideModal()" class="modal-btn">取消</button>' +
      '<button id="confirm-train" class="modal-btn primary">开始训练</button>' +
      '</div>';

    return html;
  },

  bindTrainingEvents() {
    let selectedScale = 'medium';
    let selectedQuality = 'medium';
    let selectedAlign = 'dpo';
    let selectedOpen = false;
    let selectedTechs = ['flash_attention', 'mixed_precision', 'zero3'];

    document.querySelectorAll('.scale-option').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.scale-option').forEach(e => e.classList.remove('border-accent', 'bg-accent/5'));
        el.classList.add('border-accent', 'bg-accent/5');
        selectedScale = el.dataset.scale;
      });
    });
    document.querySelector('.scale-option[data-scale="medium"]').classList.add('border-accent', 'bg-accent/5');

    document.querySelectorAll('.quality-option').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.quality-option').forEach(e => e.classList.remove('border-accent', 'bg-accent/5'));
        el.classList.add('border-accent', 'bg-accent/5');
        selectedQuality = el.dataset.quality;
      });
    });
    document.querySelector('.quality-option[data-quality="medium"]').classList.add('border-accent', 'bg-accent/5');

    document.querySelectorAll('.align-option').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.align-option').forEach(e => e.classList.remove('border-accent', 'bg-accent/5'));
        el.classList.add('border-accent', 'bg-accent/5');
        selectedAlign = el.dataset.align;
      });
    });
    document.querySelector('.align-option[data-align="dpo"]').classList.add('border-accent', 'bg-accent/5');

    document.querySelectorAll('.open-option').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.open-option').forEach(e => e.classList.remove('border-accent', 'bg-accent/5'));
        el.classList.add('border-accent', 'bg-accent/5');
        selectedOpen = el.dataset.open === 'true';
      });
    });
    document.querySelector('.open-option[data-open="false"]').classList.add('border-accent', 'bg-accent/5');

    document.querySelectorAll('.tech-card').forEach(el => {
      el.addEventListener('click', () => {
        const key = el.dataset.tech;
        if (selectedTechs.includes(key)) {
          selectedTechs = selectedTechs.filter(t => t !== key);
          el.classList.remove('selected');
        } else {
          selectedTechs.push(key);
          el.classList.add('selected');
        }
      });
      if (selectedTechs.includes(el.dataset.tech)) {
        el.classList.add('selected');
      }
    });

    // 功耗预估更新
    const updatePowerEstimate = () => {
      const gpuCount = parseInt(document.getElementById('train-gpu').value) || 0;
      const avgPower = Game.getGPUPowerMW() / Math.max(1, Game.state.gpuTotal);
      const estPower = avgPower * gpuCount * (1 + CONFIG.COOLING_RATIO);
      document.getElementById('train-power-estimate').textContent = estPower.toFixed(1);
    };
    document.getElementById('train-gpu').addEventListener('input', updatePowerEstimate);
    updatePowerEstimate();

    document.getElementById('confirm-train').addEventListener('click', () => {
      const modelName = document.getElementById('train-name').value.trim() || ('Model-' + Game.state.day);
      const gpuCount = parseInt(document.getElementById('train-gpu').value) || 0;
      if (gpuCount <= 0) return;

      Training.newTraining({
        modelName,
        scale: selectedScale,
        dataQuality: selectedQuality,
        alignmentMethod: selectedAlign,
        selectedTechs,
        gpuCount,
        openSource: selectedOpen
      });
      UI.hideModal();
    });
  },

  // === 聘请研究员模态框 ===
  buildHireResearcherModal() {
    const s = Game.state;
    const r = s.researchers;
    let html = '<h2 class="text-lg font-bold text-accent mb-3">聘请研究员</h2>';
    html += '<p class="text-xs text-muted mb-3">研究员提供训练效率加成，不同等级效果不同。每级最多5位。</p>';

    for (const [key, tier] of Object.entries(CONFIG.RESEARCHER_TIERS)) {
      const count = r[key] || 0;
      const full = count >= CONFIG.RESEARCHER_MAX_PER_TIER;
      html += '<div class="researcher-tier p-3 border border-border rounded mb-2 ' + (full ? 'opacity-50' : 'cursor-pointer hover:border-accent') + '" data-tier="' + key + '">' +
        '<div class="flex justify-between items-center">' +
        '<span class="font-bold text-sm">' + tier.name + '</span>' +
        '<span class="text-xs text-muted">' + count + '/' + CONFIG.RESEARCHER_MAX_PER_TIER + '</span>' +
        '</div>' +
        '<div class="text-xs text-muted mt-1">' + tier.desc + '</div>' +
        '<div class="text-xs mt-1">' +
        '<span class="tag tag-green">训练效率 +' + (tier.effBonus * 100).toFixed(0) + '%</span>' +
        '<span class="text-muted ml-2">月薪 $' + Economy.formatMoney(tier.salary) + '</span>' +
        '</div>' +
        '</div>';
    }

    html += '<div class="flex gap-2 justify-end mt-3">' +
      '<button onclick="UI.hideModal()" class="modal-btn">关闭</button>' +
      '</div>';

    return html;
  },

  bindHireResearcherEvents() {
    document.querySelectorAll('.researcher-tier:not(.opacity-50)').forEach(el => {
      el.addEventListener('click', () => {
        const tier = el.dataset.tier;
        Economy.hireResearcher(tier);
        // 刷新模态框
        document.getElementById('modal-content').innerHTML = UI.buildHireResearcherModal();
        UI.bindHireResearcherEvents();
      });
    });
  },

  toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 2500);
  }
};