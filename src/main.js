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
  const game = normalize(await api.kv.get(SAVE_KEY));
  return response(game);
}

export async function onAction(ctx, api) {
  const game = normalize(await api.kv.get(SAVE_KEY));
  const action = ctx.action_id;

  if (action === 'next_day') advanceDay(game);
  else if (action === 'collect') startCollection(game, ctx.inputs?.data_source);
  else if (action === 'buy_gpu') buyGpu(game, ctx.inputs?.gpu_type);
  else if (action === 'expand_power') expandInfrastructure(game, 'power');
  else if (action === 'expand_cooling') expandInfrastructure(game, 'cooling');
  else if (action === 'expand_datacenter') expandInfrastructure(game, 'datacenter');
  else if (action === 'hire_researcher') hireResearcher(game, ctx.inputs?.researcher_tier);
  else if (action === 'fundraise') fundraise(game);
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
    day: 1, cash: 500, valuation: 500, data: 0, gpus: 0, gpuInventory: { A100: 0, H100: 0, B200: 0 },
    powerCapacity: 5, coolingCapacity: 4, datacenterSlots: 64, researchers: { junior: 0, senior: 0, principal: 0 }, research: null, techLevels: {},
    dataJobs: [], trainings: [], completed: [], deployed: [], message, serial: 1,
  };
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
  const gpuCost = Object.entries(game.gpuInventory).reduce((sum, [key, count]) => sum + count * GPUS[key].power * 0.22, 0);
  const researcherCost = game.researchers.junior * 1 + game.researchers.senior * 3 + game.researchers.principal * 7;
  game.cash += deployedIncome - gpuCost - researcherCost;
  game.valuation = Math.max(game.cash, game.valuation * 0.995 + Math.max(0, deployedIncome - gpuCost - researcherCost) * 3);

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
      task.daysLeft -= 1 + (game.techLevels.optimizer || 0) * 0.25 + game.researchers.junior * 0.02 + game.researchers.senior * 0.04 + game.researchers.principal * 0.06;
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

function startCollection(game, sourceKey) {
  const source = DATA_SOURCES[sourceKey] || DATA_SOURCES.web_crawl;
  const cost = source.cost;
  if (game.cash < cost) return fail(game, '现金不足，无法采集数据');
  game.cash -= cost;
  const id = 'data-' + game.serial++;
  game.dataJobs.push({ id, name: source.name + '数据', tokens: source.tokens, daysLeft: source.days, quality: source.quality });
  game.message = '开始采集 ' + source.name + '数据，预计 ' + source.days + ' 天后到账';
}

function buyGpu(game, type) {
  const gpu = GPUS[type] || GPUS.H100;
  const key = GPUS[type] ? type : 'H100';
  const cost = gpu.price * 8;
  if (game.valuation < gpu.unlock) return fail(game, key + ' 需要市值 $' + gpu.unlock + 'M 才能解锁');
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
  if (game.cash < item.cost) return fail(game, '现金不足，聘请' + item.name + '需要 $' + item.cost + 'M');
  game.cash -= item.cost;
  game.researchers[key] = (game.researchers[key] || 0) + 1;
  game.message = '已聘请 1 名' + item.name;
}

function fundraise(game) {
  if (game.valuation < 600) return fail(game, '市值至少达到 $600M 才能融资');
  const amount = Math.round(game.valuation * 0.18);
  game.cash += amount;
  game.valuation += amount * 0.45;
  game.message = '融资成功，获得 $' + amount + 'M';
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
  const dailyIncome = game.deployed.reduce((sum, model) => sum + model.income, 0);
  const dailyCost = game.gpus * 0.16;
  const children = [
    { type: 'text', value: '╔══════════ MODEL RUSH / NODELOC TERMINAL ══════════╗', weight: 'bold' },
    { type: 'text', value: '║ DAY ' + pad(game.day, 3) + '  CASH $' + pad(money(game.cash), 8) + 'M  VALUE $' + pad(money(game.valuation), 7) + 'M     ║', weight: 'medium' },
    { type: 'text', value: '║ GPU ' + pad(game.gpus, 3) + ' TOTAL / ' + pad(free, 3) + ' FREE  |  RUN ' + pad(game.trainings.length, 2) + '  SERVE ' + pad(game.deployed.length, 2) + '        ║' },
    { type: 'text', value: '╚════════════════════════════════════════════════════╝', weight: 'bold' },
    { type: 'text', value: '[ SYSTEM ] ' + (game.message || '准备开始经营'), weight: 'medium' },
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

  if (!game.research) {
    panel(children, 'RESEARCH QUEUE', ['每项技术最高 Lv.3；只能同时研发一项。']);
    for (const tech of TECHS) {
      const level = game.techLevels[tech.key] || 0;
      const cost = tech.baseCost * (level + 1);
      children.push(button('[ R&D ] ' + tech.name + '  L' + (level + 1) + '  $' + cost + 'M  ·  ' + tech.description, 'start_research:' + tech.key, 'secondary', level >= 3));
    }
  }

  panel(children, 'TRAINING LAUNCHER', ['可并行训练；创建时仅占用闲置 GPU。']);
  for (const tier of TRAINING_TIERS) {
    const unavailable = game.data < tier.data || free < tier.minGpus;
    children.push(button('[ TRAIN ] ' + tier.name + ' / ' + tier.params + '  ·  DATA ' + tier.data + 'B  GPU ' + tier.minGpus + '  ETA ' + tier.days + 'D', 'start_training:' + tier.key, 'primary', unavailable));
  }
  panel(children, 'ACTIVE JOBS', []);

  if (!game.trainings.length) children.push({ type: 'text', value: '> NO ACTIVE JOBS. PAUSED JOBS RELEASE THEIR GPU ALLOCATION.' });
  for (const task of game.trainings) {
    children.push({ type: 'text', value: '> ' + task.name + ' [' + (task.params || '--') + ']  ' + (task.paused ? 'PAUSED' : 'RUNNING') + '  ETA ' + Math.max(0, Math.ceil(task.daysLeft)) + 'D  GPU ' + task.gpus });
    children.push(button(task.paused ? '[ RESUME JOB ]' : '[ PAUSE JOB ]', 'toggle_training:' + task.id));
  }

  panel(children, 'DEPLOYMENT QUEUE', []);
  if (!game.completed.length) children.push({ type: 'text', value: '> NO PENDING MODELS. COMPLETED TRAINING WILL APPEAR HERE.' });
  for (const model of game.completed) {
    children.push({ type: 'text', value: '> ' + model.name + ' [' + model.params + ']  SCORE ' + model.score + '  REV $' + model.income + 'M/D' });
    children.push(button('[ DEPLOY / 4 GPU ]', 'deploy:' + model.id, 'primary', free < 4));
  }
  if (game.deployed.length) {
    panel(children, 'LIVE SERVICES', []);
    for (const model of game.deployed) children.push({ type: 'text', value: '> ONLINE  ' + model.name + '  REV $' + money(model.income) + 'M/D  GPU ' + model.gpus });
  }
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
