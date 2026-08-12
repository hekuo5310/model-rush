// Model Rush · NodeLoc Blocks 版。所有可变进度只经 effects 写入用户自己的 KV 命名空间。

const SAVE_KEY = 'model-rush-save-v1';
const TECHS = [
  { key: 'data', name: '数据清洗', baseDays: 3, baseCost: 18, description: '每次采集额外获得 2B 数据' },
  { key: 'optimizer', name: '优化器', baseDays: 4, baseCost: 26, description: '每级使训练每天额外推进 25%' },
  { key: 'serving', name: '推理引擎', baseDays: 5, baseCost: 38, description: '每级使部署收入提高 15%' },
];
const TRAINING_TIERS = [
  { key: 'compact', name: '紧凑模型', params: '8B', data: 10, minGpus: 8, maxGpus: 8, days: 4, baseScore: 42 },
  { key: 'standard', name: '标准模型', params: '70B', data: 30, minGpus: 16, maxGpus: 16, days: 7, baseScore: 58 },
  { key: 'frontier', name: '前沿模型', params: '400B', data: 100, minGpus: 32, maxGpus: 32, days: 11, baseScore: 75 },
];

export async function render(ctx, api) {
  const game = normalize(await api.kv.get(SAVE_KEY));
  return response(game);
}

export async function onAction(ctx, api) {
  const game = normalize(await api.kv.get(SAVE_KEY));
  const action = ctx.action_id;

  if (action === 'next_day') advanceDay(game);
  else if (action === 'collect') startCollection(game);
  else if (action === 'buy_gpu') buyGpu(game);
  else if (action.startsWith('start_research:')) startResearch(game, action.slice('start_research:'.length));
  else if (action.startsWith('start_training:')) startTraining(game, action.slice('start_training:'.length));
  else if (action.startsWith('toggle_training:')) toggleTraining(game, action.slice('toggle_training:'.length));
  else if (action.startsWith('deploy:')) deployCompleted(game, action.slice('deploy:'.length));
  else if (action === 'reset') {
    const fresh = createGame('已重开存档');
    return { ...response(fresh), effects: [{ type: 'kv.set', key: SAVE_KEY, value: fresh }] };
  }

  return {
    ...response(game),
    effects: [{ type: 'kv.set', key: SAVE_KEY, value: game }],
  };
}

function createGame(message = '欢迎来到 Model Rush') {
  return {
    day: 1, cash: 500, data: 0, gpus: 0, research: null, techLevels: {},
    dataJobs: [], trainings: [], completed: [], deployed: [], message, serial: 1,
  };
}

function normalize(value) {
  const game = value && typeof value === 'object' ? value : createGame();
  game.day = Math.max(1, Number(game.day) || 1);
  game.cash = Number(game.cash) || 0;
  game.data = Math.max(0, Number(game.data) || 0);
  game.gpus = Math.max(0, Number(game.gpus) || 0);
  game.techLevels = game.techLevels || {};
  game.dataJobs = Array.isArray(game.dataJobs) ? game.dataJobs : [];
  game.trainings = Array.isArray(game.trainings) ? game.trainings : [];
  game.completed = Array.isArray(game.completed) ? game.completed : [];
  game.deployed = Array.isArray(game.deployed) ? game.deployed : [];
  game.serial = Math.max(1, Number(game.serial) || 1);
  return game;
}

function response(game) {
  return { blocks: view(game), state: {}, effects: [] };
}

function advanceDay(game) {
  game.day += 1;
  const deployedIncome = game.deployed.reduce((sum, model) => sum + model.income, 0);
  const gpuCost = game.gpus * 0.16;
  game.cash += deployedIncome - gpuCost;

  const completedCollections = [];
  for (const job of game.dataJobs) {
    job.daysLeft -= 1;
    if (job.daysLeft <= 0) completedCollections.push(job);
  }
  for (const job of completedCollections) {
    game.dataJobs = game.dataJobs.filter(item => item.id !== job.id);
    const tokens = job.tokens + (game.techLevels.data || 0) * 2;
    game.data += tokens;
    game.message = job.name + ' 采集完成，获得 ' + tokens + 'B tokens';
  }

  if (game.research) {
    game.research.daysLeft -= 1;
    if (game.research.daysLeft <= 0) {
      const level = (game.techLevels[game.research.key] || 0) + 1;
      game.techLevels[game.research.key] = level;
      game.message = game.research.name + ' 研发完成，已升至 Lv.' + level;
      game.research = null;
    }
  }

  const finished = [];
  for (const task of game.trainings) {
    if (!task.paused) {
      task.daysLeft -= 1 + (game.techLevels.optimizer || 0) * 0.25;
      if (task.daysLeft <= 0) finished.push(task);
    }
  }
  for (const task of finished) {
    game.trainings = game.trainings.filter(item => item.id !== task.id);
    const score = (task.baseScore || 42) + task.gpus * 0.9 + (game.techLevels.data || 0) * 4 + (game.techLevels.optimizer || 0) * 2;
    game.completed.push({ id: task.id, name: task.name, params: task.params || '--', score: Math.round(score * 10) / 10, income: Math.round(score * 0.9) });
    game.message = task.name + ' 训练完成，等待手动部署';
  }
  if (!finished.length && !completedCollections.length && !game.research) game.message = '第 ' + game.day + ' 天结算：部署收入 $' + money(deployedIncome) + 'M，GPU 成本 $' + money(gpuCost) + 'M';
}

function startCollection(game) {
  const cost = 12;
  if (game.cash < cost) return fail(game, '现金不足，无法采集数据');
  game.cash -= cost;
  const id = 'data-' + game.serial++;
  game.dataJobs.push({ id, name: '通用网页数据', tokens: 10, daysLeft: 2 });
  game.message = '开始实时采集 10B 数据，预计 2 天后到账';
}

function buyGpu(game) {
  const cost = 80;
  if (game.cash < cost) return fail(game, '现金不足，购买 8 张 GPU 需要 $80M');
  game.cash -= cost;
  game.gpus += 8;
  game.message = '已购买 8 张 GPU，闲置 GPU 可立即投入训练';
}

function startResearch(game, key) {
  if (game.research) return fail(game, '已有研发项目进行中');
  const tech = TECHS.find(item => item.key === key);
  if (!tech) return fail(game, '找不到该研发技术');
  const level = game.techLevels[tech.key] || 0;
  if (level >= 3) return fail(game, tech.name + ' 已达到最高等级');
  const cost = tech.baseCost * (level + 1);
  if (game.cash < cost) return fail(game, '现金不足，研发需要 $' + money(cost) + 'M');
  game.cash -= cost;
  game.research = { ...tech, daysLeft: tech.baseDays + level * 2 };
  game.message = '开始研发「' + tech.name + '」Lv.' + (level + 1);
}

function startTraining(game, tierKey) {
  const tier = TRAINING_TIERS.find(item => item.key === tierKey);
  if (!tier) return fail(game, '找不到训练规格');
  const free = freeGpus(game);
  if (game.data < tier.data) return fail(game, tier.name + ' 至少需要 ' + tier.data + 'B 数据');
  if (free < tier.minGpus) return fail(game, tier.name + ' 至少需要 ' + tier.minGpus + ' 张闲置 GPU；暂停任务会释放其 GPU');
  game.data -= tier.data;
  const gpus = Math.min(tier.maxGpus, free);
  const id = 'model-' + game.serial++;
  game.trainings.push({ id, name: tier.name + '-' + game.day + '-' + game.serial, params: tier.params, baseScore: tier.baseScore, gpus, daysLeft: tier.days, paused: false });
  game.message = '已创建 ' + tier.name + ' 训练任务，占用 ' + gpus + ' 张 GPU';
}

function toggleTraining(game, id) {
  const task = game.trainings.find(item => item.id === id);
  if (!task) return fail(game, '找不到该训练任务');
  task.paused = !task.paused;
  game.message = task.name + (task.paused ? ' 已暂停，GPU 已释放' : ' 已恢复训练');
}

function deployCompleted(game, id) {
  const model = game.completed.find(item => item.id === id);
  if (!model) return fail(game, '找不到待部署模型');
  const required = 4;
  if (freeGpus(game) < required) return fail(game, '部署至少需要 ' + required + ' 张闲置 GPU');
  game.completed = game.completed.filter(item => item.id !== id);
  game.deployed.push({ ...model, gpus: required, income: model.income * (1 + (game.techLevels.serving || 0) * 0.15) });
  game.message = model.name + ' 已部署，每日开始产生收入';
}

function fail(game, message) { game.message = message; }
function freeGpus(game) {
  const training = game.trainings.filter(task => !task.paused).reduce((sum, task) => sum + task.gpus, 0);
  const serving = game.deployed.reduce((sum, model) => sum + model.gpus, 0);
  return Math.max(0, game.gpus - training - serving);
}
function money(value) { return Math.max(0, value).toFixed(1); }
function button(label, action, variant = 'secondary', disabled = false) {
  return { type: 'button', label, action, variant, disabled };
}

function view(game) {
  const free = freeGpus(game);
  const children = [
    { type: 'text', value: 'Model Rush · 论坛版', size: 'large', weight: 'bold' },
    { type: 'text', value: '第 ' + game.day + ' 天  ·  现金 $' + money(game.cash) + 'M  ·  可用数据 ' + game.data + 'B', weight: 'medium' },
    { type: 'text', value: 'GPU：' + game.gpus + ' 总计 / ' + free + ' 闲置  ·  已部署 ' + game.deployed.length + ' 个模型' },
    { type: 'divider' },
    { type: 'text', value: game.message || '准备开始经营', weight: 'medium' },
    { type: 'hstack', gap: 'small', children: [
      button('推进一天', 'next_day', 'primary'), button('采集 10B 数据', 'collect'), button('购买 8 张 GPU', 'buy_gpu'),
    ] },
    { type: 'hstack', gap: 'small', children: [
      button('重开存档', 'reset', 'danger'),
    ] },
    { type: 'divider' },
    { type: 'text', value: '数据采集', weight: 'bold' },
    { type: 'text', value: collectionText(game) },
    { type: 'divider' },
    { type: 'text', value: '研发', weight: 'bold' },
    { type: 'text', value: researchText(game) },
    { type: 'text', value: '技术等级：' + TECHS.map(tech => tech.name + ' Lv.' + (game.techLevels[tech.key] || 0)).join(' · ') },
  ];

  if (!game.research) {
    children.push({ type: 'text', value: '选择一项技术开始研发（每项最高 Lv.3）：' });
    for (const tech of TECHS) {
      const level = game.techLevels[tech.key] || 0;
      const cost = tech.baseCost * (level + 1);
      children.push(button(tech.name + ' Lv.' + (level + 1) + ' · $' + cost + 'M · ' + tech.description, 'start_research:' + tech.key, 'secondary', level >= 3));
    }
  }

  children.push({ type: 'divider' }, { type: 'text', value: '新建训练', weight: 'bold' });
  children.push({ type: 'text', value: '选择规格。训练可并行；创建时仅占用闲置 GPU。' });
  for (const tier of TRAINING_TIERS) {
    const unavailable = game.data < tier.data || free < tier.minGpus;
    children.push(button(tier.name + '（' + tier.params + '）· ' + tier.data + 'B 数据 / ' + tier.minGpus + ' GPU / 约 ' + tier.days + ' 天', 'start_training:' + tier.key, 'primary', unavailable));
  }
  children.push({ type: 'divider' }, { type: 'text', value: '训练任务', weight: 'bold' });

  if (!game.trainings.length) children.push({ type: 'text', value: '暂无训练任务。可同时建立多个任务，GPU 不足时可暂停其中一个。' });
  for (const task of game.trainings) {
    children.push({ type: 'text', value: task.name + '（' + (task.params || '--') + '）· ' + (task.paused ? '已暂停' : '训练中') + ' · 剩余 ' + Math.max(0, Math.ceil(task.daysLeft)) + ' 天 · ' + task.gpus + ' GPU' });
    children.push(button(task.paused ? '恢复该任务' : '暂停该任务', 'toggle_training:' + task.id));
  }

  children.push({ type: 'divider' }, { type: 'text', value: '待部署模型', weight: 'bold' });
  if (!game.completed.length) children.push({ type: 'text', value: '训练完成的模型会出现在这里。' });
  for (const model of game.completed) {
    children.push({ type: 'text', value: model.name + '（' + model.params + '）· 得分 ' + model.score + ' · 预计日收入 $' + model.income + 'M' });
    children.push(button('部署该模型（4 GPU）', 'deploy:' + model.id, 'primary', free < 4));
  }
  if (game.deployed.length) {
    children.push({ type: 'divider' }, { type: 'text', value: '已部署模型', weight: 'bold' });
    for (const model of game.deployed) children.push({ type: 'text', value: model.name + ' · 日收入 $' + money(model.income) + 'M · 占用 ' + model.gpus + ' GPU' });
  }
  return { type: 'vstack', gap: 'small', padding: 'medium', children };
}

function researchText(game) {
  if (!game.research) return '暂无研发项目。每次研发会自动选择尚未满级的技术。';
  return game.research.name + ' Lv.' + ((game.techLevels[game.research.key] || 0) + 1) + ' · 剩余 ' + Math.max(0, game.research.daysLeft) + ' 天';
}

function collectionText(game) {
  if (!game.dataJobs.length) return '暂无采集任务。采集费用预付，数据会在两天后自动到账。';
  return game.dataJobs.map(job => job.name + ' · ' + job.tokens + 'B · 剩余 ' + Math.max(0, job.daysLeft) + ' 天').join('；');
}
