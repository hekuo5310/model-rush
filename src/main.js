// Model Rush · NodeLoc Blocks 版。所有可变进度只经 effects 写入用户自己的 KV 命名空间。

const SAVE_KEY = 'model-rush-save-v1';
// 与网页版一致的研发树；Blocks 以队列显示依赖、研发等级与可升级状态。
const TECHS = [
  tech('flash_attention', 'Flash Attention', 1, [], 30, 5, .20, 0, 0), tech('mixed_precision', 'Mixed Precision', 1, [], 30, 5, .15, 0, 0),
  tech('rope', 'RoPE 位置编码', 1, [], 25, 3, .05, .01, 0), tech('data_dedup', '数据去重与清洗', 1, [], 20, 2, 0, .03, 0),
  tech('curriculum', '课程学习', 1, [], 35, 4, .10, .01, 0), tech('seq_packing', '序列打包', 1, [], 15, 2, .15, 0, 0),
  tech('swiglu', 'SwiGLU 激活函数', 1, [], 20, 3, 0, .02, 0), tech('rmsnorm', 'RMSNorm', 1, [], 20, 3, .08, 0, 0),
  tech('gqa', 'GQA 分组查询', 2, ['flash_attention'], 45, 8, .10, 0, .05), tech('zero3', 'ZeRO-3 分布式训练', 2, ['mixed_precision'], 45, 10, .10, 0, 0),
  tech('ring_attention', 'Ring Attention', 2, ['flash_attention'], 50, 10, .08, .01, 0), tech('sparse_attention', 'Sparse Attention', 2, ['flash_attention'], 40, 8, .50, -.01, 0),
  tech('lora', 'LoRA 微调', 2, [], 30, 5, .15, 0, 0), tech('distillation', '知识蒸馏', 2, [], 50, 12, 0, .03, 0),
  tech('rlaif', 'RLAIF 自动反馈', 2, ['distillation'], 40, 8, 0, .02, 0), tech('grad_checkpoint', '梯度检查点', 2, ['mixed_precision'], 25, 4, .05, 0, 0),
  tech('kv_cache', 'KV Cache 优化', 2, ['gqa'], 30, 6, 0, 0, .20), tech('moe', 'MoE 混合专家', 3, ['parallel3d'], 90, 50, .30, .02, 0),
  tech('mtp', '多 Token 预测', 3, ['gqa'], 60, 20, .25, .01, 0), tech('parallel3d', '3D 并行训练', 3, ['zero3'], 60, 15, .10, 0, 0),
  tech('grpo', 'GRPO 强化学习', 3, ['rlaif'], 70, 30, .10, .03, 0), tech('constitutional', 'Constitutional AI', 3, ['distillation'], 40, 8, 0, .01, 0),
  tech('qat', '量化感知训练', 3, ['mixed_precision'], 50, 10, 0, .01, .10), tech('speculative', '推测解码', 3, ['distillation'], 60, 15, 0, 0, .50),
  tech('fp8_training', 'FP8 训练', 4, ['mixed_precision', 'parallel3d'], 75, 35, .22, 0, 0), tech('fsdp2', 'FSDP2 分片并行', 4, ['zero3', 'grad_checkpoint'], 80, 40, .18, .01, 0),
  tech('tokenizer_opt', '领域 Tokenizer', 4, ['rope', 'data_dedup'], 55, 25, 0, .02, 0), tech('synthetic_curriculum', '合成课程数据', 4, ['curriculum', 'rlaif'], 85, 45, 0, .03, 0),
  tech('continuous_batching', '连续批处理', 4, ['kv_cache', 'speculative'], 65, 30, 0, 0, .30), tech('open_source_ecosystem', '开源生态运营', 4, ['distillation', 'constitutional'], 70, 32, 0, 0, .50, .50),
  tech('expert_parallel', '专家并行', 4, ['moe', 'parallel3d'], 95, 55, .28, 0, 0), tech('kernel_fusion', '算子融合编译', 4, ['fp8_training', 'flash_attention'], 75, 38, .16, 0, 0),
  tech('retrieval_pretraining', '检索增强预训练', 4, ['data_dedup', 'tokenizer_opt'], 80, 42, 0, .03, 0), tech('context_compression', '上下文压缩', 4, ['ring_attention', 'gqa'], 70, 34, .08, .01, 0),
  tech('preference_optimization', '偏好优化管线', 4, ['grpo', 'constitutional'], 85, 48, 0, .03, 0), tech('tool_use_training', '工具调用训练', 4, ['grpo', 'synthetic_curriculum'], 90, 52, 0, .03, 0),
  tech('smooth_quantization', '平滑量化部署', 4, ['qat', 'continuous_batching'], 65, 30, 0, 0, .25), tech('privacy_preserving_data', '隐私保护数据管线', 4, ['data_dedup', 'constitutional'], 75, 40, 0, .03, 0),
];
function tech(key, name, tier, deps, days, cost, efficiency, quality, income, openIncome = 0) { return { key, name, tier, deps, days, cost, efficiency, quality, income, openIncome }; }
const TRAINING_TIERS = [
  { key: 'compact', name: '紧凑模型', params: '8B', data: 10, minGpus: 8, maxGpus: 8, days: 4, baseScore: 42 },
  { key: 'standard', name: '标准模型', params: '70B', data: 30, minGpus: 16, maxGpus: 16, days: 7, baseScore: 58 },
  { key: 'frontier', name: '前沿模型', params: '400B', data: 100, minGpus: 32, maxGpus: 32, days: 11, baseScore: 75 },
];
const GPUS = {
  A100: { price: 48, power: 0.40, score: 1.0, unlock: 0 },
  H100: { price: 80, power: 0.70, score: 1.8, unlock: 200 },
  H200: { price: 120, power: 0.70, score: 2.5, unlock: 500 },
  B200: { price: 150, power: 1.00, score: 2.8, unlock: 1000 },
  B300: { price: 190, power: 1.40, score: 3.1, unlock: 2000 },
  GB300: { price: 240, power: 1.80, score: 4.0, unlock: 5000 },
  MI300X: { price: 60, power: 0.75, score: 1.55, unlock: 300 },
  MI325X: { price: 84, power: 0.75, score: 2.05, unlock: 800 },
  Rubin: { price: 270, power: 1.80, score: 6.3, unlock: 10000 },
};
const DATA_SOURCES = {
  web_crawl: { name: '网页爬取', cost: 12, tokens: 10, days: 2, quality: 0.55, category: '通用' },
  books: { name: '书籍语料', cost: 30, tokens: 10, days: 3, quality: 0.85, category: '知识' },
  code_repos: { name: '代码仓库', cost: 40, tokens: 10, days: 3, quality: 0.80, category: '编程' },
  academic: { name: '学术论文', cost: 50, tokens: 10, days: 4, quality: 0.90, category: '推理' },
  synthetic: { name: '合成数据', cost: 60, tokens: 10, days: 3, quality: 0.75, category: '通用' },
  multilingual: { name: '多语言语料', cost: 20, tokens: 10, days: 2, quality: 0.65, category: '多语言' },
};

export async function render(ctx, api) {
  const account = normalizeAccount(await api.kv.get(SAVE_KEY));
  return response(account.slots[account.activeSlot], account);
}

export async function onAction(ctx, api) {
  const account = normalizeAccount(await api.kv.get(SAVE_KEY));
  const game = account.slots[account.activeSlot];
  const action = ctx.action_id;

  if (action === 'new_slot') {
    const id = 'slot-' + Date.now();
    account.slots[id] = createGame('已创建新存档');
    account.activeSlot = id;
    return { ...response(account.slots[id], account), effects: [{ type: 'kv.set', key: SAVE_KEY, value: account }] };
  }
  if (action === 'switch_slot') {
    const id = ctx.inputs?.save_slot;
    if (account.slots[id]) account.activeSlot = id;
    return { ...response(account.slots[account.activeSlot], account), effects: [{ type: 'kv.set', key: SAVE_KEY, value: account }] };
  }
  if (action === 'delete_slot') {
    const ids = Object.keys(account.slots);
    if (ids.length <= 1) return { ...response(game, account), effects: [{ type: 'kv.set', key: SAVE_KEY, value: account }] };
    delete account.slots[account.activeSlot];
    account.activeSlot = Object.keys(account.slots)[0];
    return { ...response(account.slots[account.activeSlot], account), effects: [{ type: 'kv.set', key: SAVE_KEY, value: account }] };
  }
  if (action === 'next_day') advanceDay(game);
  else if (action === 'collect') startCollection(game, ctx.inputs?.data_source);
  else if (action === 'buy_gpu') buyGpu(game, ctx.inputs?.gpu_type);
  else if (action === 'expand_power') expandInfrastructure(game, 'power');
  else if (action === 'expand_cooling') expandInfrastructure(game, 'cooling');
  else if (action === 'expand_datacenter') expandInfrastructure(game, 'datacenter');
  else if (action === 'hire_researcher') hireResearcher(game, ctx.inputs?.researcher_tier);
  else if (action === 'fundraise') fundraise(game);
  else if (action.startsWith('start_research:')) startResearch(game, action.slice('start_research:'.length));
  else if (action.startsWith('toggle_tech:')) toggleSelectedTech(game, action.slice('toggle_tech:'.length));
  else if (action === 'add_train_gpu') addTrainingGpu(game, ctx.inputs || {});
  else if (action === 'clear_train_gpu') { game.trainDraft = {}; game.message = '训练 GPU 分配草稿已清空'; }
  else if (action === 'start_training') startTraining(game, ctx.inputs || {});
  else if (action.startsWith('toggle_training:')) toggleTraining(game, action.slice('toggle_training:'.length));
  else if (action.startsWith('abandon_training:')) abandonTraining(game, action.slice('abandon_training:'.length));
  else if (action.startsWith('rollback_training:')) rollbackTraining(game, action.slice('rollback_training:'.length));
  else if (action.startsWith('deploy:')) deployCompleted(game, action.slice('deploy:'.length));
  else if (action.startsWith('manual_deploy:')) deployCompleted(game, action.slice('manual_deploy:'.length), ctx.inputs || {});
  else if (action.startsWith('adjust_deploy:')) adjustDeployment(game, action.slice('adjust_deploy:'.length), ctx.inputs || {});
  else if (action.startsWith('undeploy:')) undeploy(game, action.slice('undeploy:'.length));
  else if (action === 'demolish_gpu') demolishGpu(game, ctx.inputs?.gpu_type, ctx.inputs?.gpu_count);
  else if (action === 'reset') {
    const fresh = createGame('已重开存档');
    account.slots[account.activeSlot] = fresh;
    return { ...response(fresh, account), effects: [{ type: 'kv.set', key: SAVE_KEY, value: account }] };
  }

  return {
    ...response(game, account),
    effects: [{ type: 'kv.set', key: SAVE_KEY, value: account }],
  };
}

function createGame(message = '欢迎来到 Model Rush') {
  return {
    day: 1, cash: 500, valuation: 500, data: 0, gpus: 0, gpuInventory: { A100: 0, H100: 0, B200: 0 },
    powerCapacity: 5, coolingCapacity: 4, datacenterSlots: 64, researchers: { junior: 0, senior: 0, principal: 0 }, lastHireDay: -30,
    research: null, techLevels: {}, selectedTechs: [], trainDraft: {}, dataSources: {}, dataJobs: [], trainings: [], completed: [], deployed: [], effects: [], blackoutDays: 0, buyBanDays: 0,
    lastFundraiseDay: -180, nextEventDay: 30, eventLog: [], message, serial: 1,
  };
}

function normalizeAccount(value) {
  if (value?.slots && value?.activeSlot) {
    for (const id of Object.keys(value.slots)) value.slots[id] = normalize(value.slots[id]);
    if (!value.slots[value.activeSlot]) value.activeSlot = Object.keys(value.slots)[0];
    return value;
  }
  return { activeSlot: 'slot-1', slots: { 'slot-1': normalize(value) } };
}

function normalize(value) {
  const game = value && typeof value === 'object' ? value : createGame();
  game.day = Math.max(1, Number(game.day) || 1);
  game.cash = Number(game.cash) || 0;
  game.data = Math.max(0, Number(game.data) || 0);
  game.gpus = Math.max(0, Number(game.gpus) || 0);
  game.valuation = Math.max(0, Number(game.valuation) || game.cash);
  game.gpuInventory = game.gpuInventory || {};
  for (const key of Object.keys(GPUS)) game.gpuInventory[key] = Math.max(0, Number(game.gpuInventory[key]) || 0);
  game.gpus = Object.values(game.gpuInventory).reduce((sum, count) => sum + count, 0);
  game.powerCapacity = Math.max(1, Number(game.powerCapacity) || 5);
  game.coolingCapacity = Math.max(1, Number(game.coolingCapacity) || 4);
  game.datacenterSlots = Math.max(8, Number(game.datacenterSlots) || 64);
  game.researchers = game.researchers || { junior: 0, senior: 0, principal: 0 };
  game.techLevels = game.techLevels || {};
  game.selectedTechs = Array.isArray(game.selectedTechs) ? game.selectedTechs : [];
  game.trainDraft = game.trainDraft && typeof game.trainDraft === 'object' ? game.trainDraft : {};
  game.dataSources = game.dataSources && typeof game.dataSources === 'object' ? game.dataSources : {};
  game.effects = Array.isArray(game.effects) ? game.effects : [];
  game.blackoutDays = Math.max(0, Number(game.blackoutDays) || 0);
  game.buyBanDays = Math.max(0, Number(game.buyBanDays) || 0);
  game.lastFundraiseDay = Number.isFinite(game.lastFundraiseDay) ? game.lastFundraiseDay : -180;
  game.lastHireDay = Number.isFinite(game.lastHireDay) ? game.lastHireDay : -30;
  game.nextEventDay = Math.max(game.day + 1, Number(game.nextEventDay) || game.day + 30);
  game.eventLog = Array.isArray(game.eventLog) ? game.eventLog.slice(0, 30) : [];
  game.dataJobs = Array.isArray(game.dataJobs) ? game.dataJobs : [];
  game.trainings = Array.isArray(game.trainings) ? game.trainings : [];
  game.completed = Array.isArray(game.completed) ? game.completed : [];
  game.deployed = Array.isArray(game.deployed) ? game.deployed : [];
  game.serial = Math.max(1, Number(game.serial) || 1);
  return game;
}

function response(game, account) {
  return { blocks: view(game, account), state: {}, effects: [] };
}

function advanceDay(game) {
  game.day += 1;
  if (game.blackoutDays > 0) game.blackoutDays--;
  if (game.buyBanDays > 0) game.buyBanDays--;
  game.effects = game.effects.map(effect => ({ ...effect, days: effect.days - 1 })).filter(effect => effect.days > 0);
  const deployedIncome = game.deployed.reduce((sum, model) => sum + model.income, 0);
  const gpuCost = Object.entries(game.gpuInventory).reduce((sum, [key, count]) => sum + count * GPUS[key].power * 0.22, 0);
  const researcherCost = game.researchers.junior * 1 + game.researchers.senior * 3 + game.researchers.principal * 7;
  const networkCost = game.deployed.length * .05;
  const rentCost = 2 / 30;
  game.cash += deployedIncome - gpuCost - researcherCost - networkCost - rentCost;
  game.valuation = Math.max(game.cash, game.valuation * 0.995 + Math.max(0, deployedIncome - gpuCost - researcherCost - networkCost - rentCost) * 3);

  const completedCollections = [];
  for (const job of game.dataJobs) {
    job.daysLeft -= 1;
    if (job.daysLeft <= 0) completedCollections.push(job);
  }
  for (const job of completedCollections) {
    game.dataJobs = game.dataJobs.filter(item => item.id !== job.id);
    const tokens = job.tokens + (game.techLevels.data || 0) * 2;
    game.data += tokens;
    game.dataSources[job.sourceKey] = (game.dataSources[job.sourceKey] || 0) + tokens;
    game.message = job.name + ' 采集完成，获得 ' + tokens + 'B tokens';
  }

  if (game.research) {
    game.research.daysLeft -= researcherSpeed(game);
    if (game.research.daysLeft <= 0) {
      const level = (game.techLevels[game.research.key] || 0) + 1;
      game.techLevels[game.research.key] = level;
      game.message = game.research.name + ' 研发完成，已升至 Lv.' + level;
      game.research = null;
    }
  }

  const finished = [];
  for (const task of game.trainings) {
    if (!task.paused && game.blackoutDays <= 0) {
      const penalty = game.effects.some(effect => effect.type === 'eff_penalty') ? 0.8 : 1;
      task.daysLeft -= trainingSpeed(game, task) * penalty;
      task.elapsed = (task.elapsed || 0) + 1;
      saveCheckpoint(task);
      if (randomEvent(game, task)) task.eventPenalty = (task.eventPenalty || 0) + 1;
      if (task.daysLeft <= 0) finished.push(task);
    }
  }
  for (const task of finished) {
    game.trainings = game.trainings.filter(item => item.id !== task.id);
    const score = scoreTraining(game, task);
    game.completed.push({ id: task.id, name: task.name, params: task.params || '--', paramsB: task.paramsB || 70, score, openSource: task.openSource, techs: task.techs, income: modelIncome(score, task.openSource, task.techs, game) });
    game.message = task.name + ' 训练完成，等待手动部署';
  }
  if (!finished.length && !completedCollections.length && !game.research) game.message = '第 ' + game.day + ' 天结算：部署收入 $' + money(deployedIncome) + 'M，GPU 成本 $' + money(gpuCost) + 'M';
  if (game.day >= game.nextEventDay) triggerCompanyEvent(game);
}

function startCollection(game, sourceKey) {
  const source = DATA_SOURCES[sourceKey] || DATA_SOURCES.web_crawl;
  const cost = source.cost;
  if (game.cash < cost) return fail(game, '现金不足，无法采集数据');
  game.cash -= cost;
  const id = 'data-' + game.serial++;
  game.dataJobs.push({ id, sourceKey: sourceKey in DATA_SOURCES ? sourceKey : 'web_crawl', name: source.name + '数据', tokens: source.tokens, daysLeft: source.days, quality: source.quality });
  game.message = '开始采集 ' + source.name + '数据，预计 ' + source.days + ' 天后到账';
}

function buyGpu(game, type) {
  const gpu = GPUS[type] || GPUS.H100;
  const key = GPUS[type] ? type : 'H100';
  const cost = gpu.price * 8;
  if (game.valuation < gpu.unlock) return fail(game, key + ' 需要市值 $' + gpu.unlock + 'M 才能解锁');
  if (game.buyBanDays > 0) return fail(game, '芯片禁运中，剩余 ' + game.buyBanDays + ' 天');
  if (game.gpus + 8 > game.datacenterSlots) return fail(game, '机房机架位不足，请先扩容机房');
  if (game.cash < cost) return fail(game, '现金不足，购买 8 张 ' + (type || 'H100') + ' 需要 $' + cost + 'M');
  game.cash -= cost;
  game.gpuInventory[key] += 8;
  game.gpus += 8;
  game.message = '已购买 8 张 ' + key + '，闲置 GPU 可立即投入训练';
}

function expandInfrastructure(game, type) {
  const values = { power: { cost: 55, amount: 5, label: '供电' }, cooling: { cost: 45, amount: 4, label: '冷却' }, datacenter: { cost: 70, amount: 32, label: '机房' } };
  const item = values[type];
  if (!item || game.cash < item.cost) return fail(game, '现金不足，无法扩容' + (item ? item.label : '基础设施'));
  game.cash -= item.cost;
  if (type === 'power') game.powerCapacity += item.amount;
  else if (type === 'cooling') game.coolingCapacity += item.amount;
  else game.datacenterSlots += item.amount;
  game.message = item.label + '扩容完成';
}

function hireResearcher(game, tier) {
  const tiers = { junior: { cost: 25, name: '初级研究员' }, senior: { cost: 70, name: '高级研究员' }, principal: { cost: 160, name: '首席研究员' } };
  const key = tiers[tier] ? tier : 'junior';
  const item = tiers[key];
  if ((game.researchers[key] || 0) >= 5) return fail(game, item.name + '已达到 5 人上限');
  if (game.day - game.lastHireDay < 30) return fail(game, '招聘冷却中，剩余 ' + (30 - game.day + game.lastHireDay) + ' 天');
  if (game.cash < item.cost) return fail(game, '现金不足，聘请' + item.name + '需要 $' + item.cost + 'M');
  game.cash -= item.cost;
  game.researchers[key] = (game.researchers[key] || 0) + 1;
  game.lastHireDay = game.day;
  game.message = '已聘请 1 名' + item.name;
}

function fundraise(game) {
  if (game.day - game.lastFundraiseDay < 180) return fail(game, '融资冷却中，剩余 ' + (180 - game.day + game.lastFundraiseDay) + ' 天');
  const best = game.deployed.reduce((max, model) => Math.max(max, model.score || 0), 0);
  if (best <= 0) return fail(game, '至少部署一个模型后才可融资');
  const amount = Math.round(1000 * (best / 100) * 8 * (0.8 + seeded(game.day) * 0.4));
  game.cash += amount;
  game.valuation += amount * 0.45;
  game.lastFundraiseDay = game.day;
  game.message = '融资成功，获得 $' + amount + 'M';
}

function startResearch(game, key) {
  if (game.research) return fail(game, '已有研发项目进行中');
  const tech = TECHS.find(item => item.key === key);
  if (!tech) return fail(game, '找不到该研发技术');
  const level = game.techLevels[tech.key] || 0;
  if (level >= 3) return fail(game, tech.name + ' 已达到最高等级');
  const unlockedCount = Object.values(game.techLevels).filter(value => value > 0).length;
  const researchLevel = unlockedCount >= 15 ? 4 : unlockedCount >= 8 ? 3 : unlockedCount >= 3 ? 2 : 1;
  if (tech.tier > researchLevel) return fail(game, '研发等级不足：需要 Lv.' + tech.tier + '，当前 Lv.' + researchLevel);
  if (tech.deps.some(dep => !(game.techLevels[dep] > 0))) return fail(game, '前置技术未完成：' + tech.deps.filter(dep => !(game.techLevels[dep] > 0)).join('、'));
  const cost = Math.round(tech.cost * Math.pow(1.75, level));
  if (game.cash < cost) return fail(game, '现金不足，研发需要 $' + money(cost) + 'M');
  game.cash -= cost;
  game.research = { ...tech, daysLeft: Math.ceil(tech.days * Math.pow(1.35, level)), targetLevel: level + 1 };
  game.message = '开始研发「' + tech.name + '」Lv.' + (level + 1);
}

function startTraining(game, input) {
  const paramsB = clamp(Number(input.params_b) || 70, 1, 2000);
  const gpuType = GPUS[input.train_gpu_type] ? input.train_gpu_type : 'H100';
  const gpus = clamp(Math.floor(Number(input.train_gpu_count) || 0), 1, game.gpuInventory[gpuType] || 0);
  const allocation = { ...game.trainDraft };
  if (Number(input.train_gpu_count) > 0) allocation[gpuType] = gpus;
  const allocationCount = sumAllocation(allocation);
  const neededData = Math.max(10, Math.ceil(paramsB / 5));
  if (game.data < neededData) return fail(game, '训练 ' + paramsB + 'B 至少需要 ' + neededData + 'B 数据');
  for (const [key, count] of Object.entries(allocation)) if (count < 1 || count > freeGpuByType(game, key)) return fail(game, key + ' 闲置数量不足');
  if (!allocationCount) return fail(game, '至少分配 1 张 GPU');
  const selectedTechs = game.selectedTechs.filter(key => game.techLevels[key] > 0);
  const alignment = input.alignment === 'rlhf' ? 'rlhf' : 'dpo';
  const alignmentCost = alignment === 'rlhf' ? 50 : 10;
  const techCost = selectedTechs.reduce((sum, key) => sum + (TECHS.find(tech => tech.key === key)?.cost || 0), 0);
  if (game.cash < alignmentCost + techCost) return fail(game, '现金不足，训练配置费用 $' + (alignmentCost + techCost) + 'M');
  game.cash -= alignmentCost + techCost;
  game.data -= neededData;
  const compute = Object.entries(allocation).reduce((sum, [key, count]) => sum + count * GPUS[key].score, 0);
  const totalDays = Math.max(1, Math.ceil((paramsB * paramsB / 3500) / Math.max(1, compute * trainingEfficiency(game, selectedTechs))));
  const id = 'model-' + game.serial++;
  const modelName = cleanName(input.model_name) || ('Model-' + game.day + '-' + game.serial);
  game.trainings.push({ id, name: modelName, params: paramsB + 'B', paramsB, alignment, openSource: input.open_source === 'true', techs: selectedTechs, gpuAllocation: allocation, gpus: allocationCount, daysLeft: totalDays, totalDays, elapsed: 0, checkpoints: [], paused: false });
  game.trainDraft = {};
  game.message = '已创建 ' + paramsB + 'B 训练任务，占用 ' + allocationText(allocation) + '，预计 ' + totalDays + ' 天';
}

function addTrainingGpu(game, input) {
  const type = GPUS[input.train_gpu_type] ? input.train_gpu_type : 'H100';
  const count = Math.max(0, Math.floor(Number(input.train_gpu_count) || 0));
  if (!count || count > freeGpuByType(game, type)) return fail(game, type + ' 闲置数量不足');
  game.trainDraft[type] = count;
  game.message = type + '×' + count + ' 已加入训练 GPU 分配草稿';
}

function toggleTraining(game, id) {
  const task = game.trainings.find(item => item.id === id);
  if (!task) return fail(game, '找不到该训练任务');
  task.paused = !task.paused;
  game.message = task.name + (task.paused ? ' 已暂停，GPU 已释放' : ' 已恢复训练');
}

function deployCompleted(game, id, input = null) {
  const model = game.completed.find(item => item.id === id);
  if (!model) return fail(game, '找不到待部署模型');
  const required = Math.max(1, Math.ceil((model.paramsB || 70) / 5));
  const type = input && GPUS[input.deploy_gpu_type] ? input.deploy_gpu_type : null;
  const count = input ? Math.max(0, Math.floor(Number(input.deploy_gpu_count) || 0)) : 0;
  const allocation = type && count ? { [type]: Math.min(count, freeGpuByType(game, type)) } : chooseDeployment(game, required);
  if (!allocation) return fail(game, '闲置等效算力不足，需要 ' + required + ' 张 H100 等效 GPU');
  if (h100Equivalent(allocation) < required) return fail(game, '部署算力不足，需要 ' + required + ' 张 H100 等效 GPU');
  game.completed = game.completed.filter(item => item.id !== id);
  game.deployed.push({ ...model, deploymentGPUs: allocation, gpus: sumAllocation(allocation), required, income: modelIncome(model.score, model.openSource, model.techs, game) });
  game.message = model.name + ' 已部署，每日开始产生收入';
}

function adjustDeployment(game, id, input) {
  const model = game.deployed.find(item => item.id === id);
  if (!model) return fail(game, '找不到已部署模型');
  const type = GPUS[input.deploy_gpu_type] ? input.deploy_gpu_type : 'H100';
  const wanted = Math.max(0, Math.floor(Number(input.deploy_gpu_count) || 0));
  const current = model.deploymentGPUs?.[type] || 0;
  const other = { ...(model.deploymentGPUs || {}) };
  delete other[type];
  const otherEquivalent = h100Equivalent(other);
  const available = freeGpuByType(game, type) + current;
  const next = Math.min(wanted, available);
  if (otherEquivalent + next * GPUS[type].score / GPUS.H100.score < model.required) return fail(game, '调整后不得低于 ' + model.required + ' 张 H100 等效算力');
  if (next) other[type] = next;
  model.deploymentGPUs = other;
  model.gpus = sumAllocation(other);
  game.message = model.name + ' 的部署 GPU 已调配';
}

function undeploy(game, id) {
  const model = game.deployed.find(item => item.id === id);
  if (!model) return fail(game, '找不到已部署模型');
  game.deployed = game.deployed.filter(item => item.id !== id);
  game.completed.push({ ...model });
  game.message = model.name + ' 已下架，部署 GPU 已释放';
}

function demolishGpu(game, type, count) {
  const key = GPUS[type] ? type : 'A100';
  const available = freeGpuByType(game, key);
  const amount = clamp(Math.floor(Number(count) || 0), 0, available);
  if (!amount) return fail(game, '请输入可拆除的闲置 GPU 数量');
  game.gpuInventory[key] -= amount;
  game.gpus -= amount;
  game.cash += Math.floor(GPUS[key].price * amount * 0.5);
  game.message = '已拆除 ' + amount + ' 张 ' + key + '，返还 50% 购置成本';
}

function abandonTraining(game, id) { const task = game.trainings.find(item => item.id === id); if (!task) return fail(game, '找不到训练任务'); game.trainings = game.trainings.filter(item => item.id !== id); game.message = task.name + ' 已放弃，GPU 已释放'; }
function rollbackTraining(game, id) { const task = game.trainings.find(item => item.id === id); const cp = task?.checkpoints?.pop(); if (!cp) return fail(game, '没有可用检查点'); Object.assign(task, cp); game.message = task.name + ' 已回滚至检查点'; }

function fail(game, message) { game.message = message; }
function toggleSelectedTech(game, key) {
  if (!(game.techLevels[key] > 0)) return fail(game, '仅可选择已研发技术');
  game.selectedTechs = game.selectedTechs.includes(key) ? game.selectedTechs.filter(item => item !== key) : [...game.selectedTechs, key];
  game.message = '训练技术选择已更新';
}
function freeGpus(game) {
  const training = game.trainings.filter(task => !task.paused).reduce((sum, task) => sum + task.gpus, 0);
  const serving = game.deployed.reduce((sum, model) => sum + model.gpus, 0);
  return Math.max(0, game.gpus - training - serving);
}
function freeGpuByType(game, type) {
  const usedTraining = game.trainings.filter(task => !task.paused).reduce((sum, task) => sum + (task.gpuAllocation?.[type] || 0), 0);
  const usedServing = game.deployed.reduce((sum, model) => sum + (model.deploymentGPUs?.[type] || 0), 0);
  return Math.max(0, (game.gpuInventory[type] || 0) - usedTraining - usedServing);
}
function sumAllocation(allocation) { return Object.values(allocation || {}).reduce((sum, count) => sum + count, 0); }
function allocationText(allocation) { return Object.entries(allocation || {}).map(([key, count]) => key + '×' + count).join(' + ') || '--'; }
function trainingPhase(task) { const progress = Math.max(0, Math.min(1, ((task.totalDays || 1) - task.daysLeft) / (task.totalDays || 1))); return progress < .72 ? '预训练' : progress < .92 ? 'SFT 微调' : '对齐训练'; }
function h100Equivalent(allocation) { return Object.entries(allocation || {}).reduce((sum, [key, count]) => sum + count * (GPUS[key]?.score || 1) / GPUS.H100.score, 0); }
function chooseDeployment(game, required) {
  const allocation = {};
  let total = 0;
  for (const key of Object.keys(GPUS).sort((a, b) => GPUS[b].score - GPUS[a].score)) {
    const count = freeGpuByType(game, key);
    if (!count) continue;
    const need = Math.ceil((required - total) * GPUS.H100.score / GPUS[key].score);
    const used = Math.min(count, Math.max(0, need));
    if (used) allocation[key] = used;
    total += used * GPUS[key].score / GPUS.H100.score;
    if (total >= required) return allocation;
  }
  return null;
}
function trainingEfficiency(game, keys) { return 0.35 + keys.reduce((sum, key) => sum + (TECHS.find(tech => tech.key === key)?.efficiency || 0) * (game.techLevels[key] || 0), 0); }
function trainingSpeed(game, task) { return (1 + game.researchers.junior * .02 + game.researchers.senior * .04 + game.researchers.principal * .06) / (1 + (task.eventPenalty || 0) * .08); }
function researcherSpeed(game) { return 1 + game.researchers.junior * .02 + game.researchers.senior * .04 + game.researchers.principal * .06; }
function scoreTraining(game, task) {
  const techQuality = (task.techs || []).reduce((sum, key) => sum + (TECHS.find(tech => tech.key === key)?.quality || 0) * (game.techLevels[key] || 0), 0);
  const alignment = task.alignment === 'rlhf' ? .03 : .01;
  const dataQuality = averageDataQuality(game);
  return Math.round(Math.min(99.9, 35 + Math.log10(task.paramsB || 70) * 12 + (task.gpus || 1) * .5 + (dataQuality - .5) * 30 + techQuality * 100 + alignment * 100) * 10) / 10;
}
function averageDataQuality(game) {
  let total = 0, quality = 0;
  for (const [key, tokens] of Object.entries(game.dataSources || {})) { const source = DATA_SOURCES[key]; if (source) { total += tokens; quality += tokens * source.quality; } }
  return Math.min(.95, (total ? quality / total : .55) + (game.techLevels.data_dedup || 0) * .03);
}
function modelIncome(score, openSource, techs, game) {
  let mult = openSource ? .35 : 1;
  for (const key of techs || []) { const tech = TECHS.find(item => item.key === key); mult *= 1 + (tech?.income || 0) * (game.techLevels[key] || 0); if (openSource) mult *= 1 + (tech?.openIncome || 0) * (game.techLevels[key] || 0); }
  return Math.round(score * .9 * mult * 10) / 10;
}
function saveCheckpoint(task) { const every = Math.max(1, Math.ceil(task.totalDays / 10)); if (task.elapsed > 0 && task.elapsed % every === 0) task.checkpoints.push({ daysLeft: task.daysLeft, elapsed: task.elapsed, eventPenalty: task.eventPenalty || 0 }); }
function randomEvent(game, task) { if (seeded(game.day + task.elapsed + task.gpus) < .08) { task.eventPenalty = (task.eventPenalty || 0) + 1; addLog(game, '训练事件：' + task.name + ' 出现训练减速'); return true; } return false; }
function triggerCompanyEvent(game) { const events = ['硬件故障', '电网波动', '数据泄露', '技术突破', '政策利好', '芯片禁运', '行业盛会']; const event = events[Math.floor(seeded(game.day * 17) * events.length)]; if (event === '硬件故障') { const key = Object.keys(GPUS).find(type => game.gpuInventory[type] > 0); if (key) game.gpuInventory[key] -= Math.max(1, Math.floor(game.gpuInventory[key] * .02)); } if (event === '电网波动') game.blackoutDays = 2; if (event === '数据泄露') game.cash -= 100; if (event === '技术突破') game.effects.push({ type: 'eff_penalty', days: 0 }); if (event === '政策利好') game.cash += 500; if (event === '芯片禁运') game.buyBanDays = 30; if (event === '行业盛会') game.valuation *= 1.15; game.nextEventDay = game.day + 30 + Math.floor(seeded(game.day) * 60); game.message = '随机事件：' + event; addLog(game, 'Day ' + game.day + '：' + event); }
function addLog(game, message) { game.eventLog.unshift(message); game.eventLog = game.eventLog.slice(0, 30); }
function seeded(value) { return ((Math.sin(value * 9301 + 49297) * 233280) % 1 + 1) % 1; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function cleanName(value) { return String(value || '').replace(/[<>]/g, '').trim().slice(0, 20); }
function money(value) { return Math.max(0, value).toFixed(1); }
function button(label, action, variant = 'secondary', disabled = false) {
  return { type: 'button', label, action, variant, disabled };
}

function view(game, account) {
  const free = freeGpus(game);
  const dailyIncome = game.deployed.reduce((sum, model) => sum + model.income, 0);
  const dailyCost = game.gpus * 0.16;
  const children = [
    { type: 'text', value: '╔══════════ MODEL RUSH / NODELOC TERMINAL ══════════╗', weight: 'bold' },
    { type: 'text', value: '║ DAY ' + pad(game.day, 3) + '  CASH $' + pad(money(game.cash), 8) + 'M  VALUE $' + pad(money(game.valuation), 7) + 'M     ║', weight: 'medium' },
    { type: 'text', value: '║ GPU ' + pad(game.gpus, 3) + ' TOTAL / ' + pad(free, 3) + ' FREE  |  RUN ' + pad(game.trainings.length, 2) + '  SERVE ' + pad(game.deployed.length, 2) + '        ║' },
    { type: 'text', value: '╚════════════════════════════════════════════════════╝', weight: 'bold' },
    { type: 'text', value: '[ SYSTEM ] ' + (game.message || '准备开始经营'), weight: 'medium' },
    { type: 'select', name: 'save_slot', value: account.activeSlot, options: Object.entries(account.slots).map(([id, slot], index) => ({ value: id, label: '存档 ' + (index + 1) + ' / Day ' + slot.day + ' / $' + money(slot.cash) + 'M' })) },
    { type: 'hstack', gap: 'small', children: [button('[ SWITCH SAVE ]', 'switch_slot'), button('[ NEW SAVE ]', 'new_slot'), button('[ DELETE SAVE ]', 'delete_slot', 'danger')] },
    { type: 'hstack', gap: 'small', children: [
      button('[ +1 DAY ]', 'next_day', 'primary'), button('[ COLLECT ]', 'collect'), button('[ BUY RACK ]', 'buy_gpu'),
    ] },
    { type: 'hstack', gap: 'small', children: [
      button('[ RESET SAVE ]', 'reset', 'danger'),
    ] },
  ];

  panel(children, 'OPERATIONS', [
    'CASHFLOW  IN $' + money(dailyIncome) + 'M / DAY   OUT $' + money(dailyCost) + 'M / DAY',
    'DATA      ' + game.data + 'B AVAILABLE  |  POWER ' + powerLoad(game).toFixed(1) + '/' + game.powerCapacity + 'MW  |  COOL ' + coolingLoad(game).toFixed(1) + '/' + game.coolingCapacity + 'MW',
    'DATACENTER ' + game.gpus + '/' + game.datacenterSlots + ' GPU SLOTS  |  TEAM J' + game.researchers.junior + ' S' + game.researchers.senior + ' P' + game.researchers.principal,
    'COLLECT   ' + collectionText(game),
    'RESEARCH  ' + researchText(game),
    'TECH      ' + TECHS.map(tech => tech.name + ':L' + (game.techLevels[tech.key] || 0)).join('  |  '),
  ]);

  panel(children, 'RESOURCE CONTROL', ['选择后点击对应操作按钮。']);
  children.push({ type: 'select', name: 'data_source', value: 'web_crawl', options: Object.entries(DATA_SOURCES).map(([key, item]) => ({ value: key, label: item.name + '（' + item.category + '）/ $' + item.cost + 'M / ' + item.tokens + 'B / ' + item.days + 'D' })) });
  children.push({ type: 'select', name: 'gpu_type', value: 'H100', options: Object.entries(GPUS).map(([key, item]) => ({ value: key, label: key + ' / $' + (item.price * 8) + 'M per 8 / ' + item.score + 'x' })) });
  children.push({ type: 'hstack', gap: 'small', children: [
    button('[ EXPAND POWER +5MW ]', 'expand_power'), button('[ EXPAND COOLING +4MW ]', 'expand_cooling'), button('[ EXPAND DC +32 ]', 'expand_datacenter'),
  ] });
  children.push({ type: 'select', name: 'researcher_tier', value: 'junior', options: [
    { value: 'junior', label: '初级研究员 / $25M / 训练 +2%' },
    { value: 'senior', label: '高级研究员 / $70M / 训练 +4%' },
    { value: 'principal', label: '首席研究员 / $160M / 训练 +6%' },
  ] });
  children.push({ type: 'hstack', gap: 'small', children: [button('[ HIRE ]', 'hire_researcher'), button('[ FUNDRAISE ]', 'fundraise', 'primary')] });
  children.push({ type: 'select', name: 'deploy_gpu_type', value: 'H100', options: Object.keys(GPUS).map(key => ({ value: key, label: '部署 GPU：' + key + ' / 闲置 ' + freeGpuByType(game, key) })) });
  children.push({ type: 'input', name: 'deploy_gpu_count', placeholder: '部署/调配数量（不填则自动等效分配）', value: '' });

  if (!game.research) {
    const unlockedCount = Object.values(game.techLevels).filter(value => value > 0).length;
    const researchLevel = unlockedCount >= 15 ? 4 : unlockedCount >= 8 ? 3 : unlockedCount >= 3 ? 2 : 1;
    panel(children, 'RESEARCH QUEUE', ['研发等级 Lv.' + researchLevel + ' / 已完成 ' + unlockedCount + ' 项 / 每项最高 Lv.3']);
    for (const tech of TECHS) {
      const level = game.techLevels[tech.key] || 0;
      const cost = Math.round(tech.cost * Math.pow(1.75, level));
      const blocked = level >= 3 || tech.tier > researchLevel || tech.deps.some(dep => !(game.techLevels[dep] > 0));
      children.push(button('[ R&D ] T' + tech.tier + ' ' + tech.name + '  L' + (level + 1) + '  $' + cost + 'M / ' + Math.ceil(tech.days * Math.pow(1.35, level)) + 'D', 'start_research:' + tech.key, 'secondary', blocked));
    }
  }

  panel(children, 'TRAINING LAUNCHER', ['自由参数 1B–2000B；可选择 GPU、对齐、开源与已研发技术。']);
  children.push({ type: 'input', name: 'model_name', placeholder: '模型名称（默认自动命名）', value: '' });
  children.push({ type: 'input', name: 'params_b', placeholder: '参数规模 1–2000（B）', value: '70' });
  children.push({ type: 'select', name: 'train_gpu_type', value: 'H100', options: Object.keys(GPUS).map(key => ({ value: key, label: key + ' / 闲置 ' + freeGpuByType(game, key) + ' / 等效 ' + GPUS[key].score })) });
  children.push({ type: 'input', name: 'train_gpu_count', placeholder: '训练 GPU 数量（可逐型号加入草稿）', value: '' });
  children.push({ type: 'select', name: 'alignment', value: 'dpo', options: [{ value: 'dpo', label: 'DPO / $10M / 稳定' }, { value: 'rlhf', label: 'RLHF + PPO / $50M / 质量更高' }] });
  children.push({ type: 'select', name: 'open_source', value: 'false', options: [{ value: 'false', label: '闭源 / API 收入' }, { value: 'true', label: '开源 / 生态收入较低' }] });
  const unlockedTechs = TECHS.filter(tech => game.techLevels[tech.key] > 0);
  children.push({ type: 'text', value: '训练技术：' + (game.selectedTechs.length ? game.selectedTechs.map(key => TECHS.find(tech => tech.key === key)?.name).join('、') : '未选择') });
  children.push({ type: 'text', value: 'GPU 分配草稿：' + allocationText(game.trainDraft) });
  children.push({ type: 'hstack', gap: 'small', children: [button('[ ADD / UPDATE GPU TYPE ]', 'add_train_gpu'), button('[ CLEAR GPU DRAFT ]', 'clear_train_gpu')] });
  for (const tech of unlockedTechs) children.push(button((game.selectedTechs.includes(tech.key) ? '[ ✓ ] ' : '[   ] ') + tech.name + ' Lv.' + game.techLevels[tech.key], 'toggle_tech:' + tech.key, 'flat'));
  children.push(button('[ START TRAINING ]', 'start_training', 'primary'));
  panel(children, 'ACTIVE JOBS', []);

  if (!game.trainings.length) children.push({ type: 'text', value: '> NO ACTIVE JOBS. PAUSED JOBS RELEASE THEIR GPU ALLOCATION.' });
  for (const task of game.trainings) {
    children.push({ type: 'text', value: '> ' + task.name + ' [' + (task.params || '--') + ']  ' + (task.paused ? 'PAUSED' : 'RUNNING') + '  ' + trainingPhase(task) + '  ETA ' + Math.max(0, Math.ceil(task.daysLeft)) + 'D  GPU ' + allocationText(task.gpuAllocation) });
    children.push({ type: 'progress', value: Math.max(0, task.totalDays - task.daysLeft), max: task.totalDays });
    children.push({ type: 'hstack', gap: 'small', children: [button(task.paused ? '[ RESUME JOB ]' : '[ PAUSE JOB ]', 'toggle_training:' + task.id), button('[ ROLLBACK CHECKPOINT ]', 'rollback_training:' + task.id), button('[ ABANDON ]', 'abandon_training:' + task.id, 'danger')] });
  }

  panel(children, 'DEPLOYMENT QUEUE', []);
  if (!game.completed.length) children.push({ type: 'text', value: '> NO PENDING MODELS. COMPLETED TRAINING WILL APPEAR HERE.' });
  for (const model of game.completed) {
    children.push({ type: 'text', value: '> ' + model.name + ' [' + model.params + ']  ' + (model.openSource ? 'OPEN' : 'CLOSED') + '  SCORE ' + model.score + '  REV $' + model.income + 'M/D' });
    children.push({ type: 'hstack', gap: 'small', children: [button('[ AUTO DEPLOY ]', 'deploy:' + model.id, 'primary'), button('[ MANUAL DEPLOY ]', 'manual_deploy:' + model.id)] });
  }
  if (game.deployed.length) {
    panel(children, 'LIVE SERVICES', []);
    for (const model of game.deployed) { children.push({ type: 'text', value: '> ONLINE  ' + model.name + '  REV $' + money(model.income) + 'M/D  GPU ' + allocationText(model.deploymentGPUs) + ' / MIN H100×' + model.required }); children.push({ type: 'hstack', gap: 'small', children: [button('[ SAVE GPU ADJUSTMENT ]', 'adjust_deploy:' + model.id), button('[ UNDEPLOY ]', 'undeploy:' + model.id, 'danger')] }); }
  }
  panel(children, 'GPU INVENTORY / EVENT LOG', []);
  children.push({ type: 'text', value: Object.keys(GPUS).map(key => key + ':' + game.gpuInventory[key] + '(FREE ' + freeGpuByType(game, key) + ')').join('  |  ') });
  children.push({ type: 'input', name: 'gpu_count', placeholder: '拆除数量（仅闲置 GPU）', value: '0' });
  children.push(button('[ DEMOLISH SELECTED GPU ]', 'demolish_gpu', 'danger'));
  for (const log of game.eventLog.slice(0, 8)) children.push({ type: 'text', value: '> ' + log });
  return { type: 'vstack', gap: 'small', padding: 'medium', children };
}

function panel(children, title, lines) {
  children.push({ type: 'divider' }, { type: 'text', value: '┌─[ ' + title + ' ]─────────────────────────────────', weight: 'bold' });
  for (const line of lines) children.push({ type: 'text', value: '│ ' + line });
  children.push({ type: 'text', value: '└────────────────────────────────────────────────────' });
}

function pad(value, width) { return String(value).padStart(width, ' '); }
function powerLoad(game) { return Object.entries(game.gpuInventory).reduce((sum, [key, count]) => sum + count * GPUS[key].power, 0); }
function coolingLoad(game) { return powerLoad(game) * 0.28; }

function researchText(game) {
  if (!game.research) return 'IDLE. SELECT A TECH FROM THE QUEUE BELOW.';
  return game.research.name + ' L' + ((game.techLevels[game.research.key] || 0) + 1) + '  /  ETA ' + Math.max(0, game.research.daysLeft) + 'D';
}

function collectionText(game) {
  if (!game.dataJobs.length) return 'IDLE. COLLECTIONS SETTLE IN 2-3 DAYS BY SOURCE.';
  return game.dataJobs.map(job => job.name + ' ' + job.tokens + 'B / ETA ' + Math.max(0, job.daysLeft) + 'D').join('  |  ');
}
