// Model Rush - 游戏配置常量
const CONFIG = {
  // 初始资金（大幅降低，从零开始）
  INITIAL_CASH: 150_000_000, // 1.5亿美金

  // 电价 ($/kWh)
  ELECTRICITY_PRICE: 0.08,

  // 供电
  INITIAL_POWER_CAPACITY_MW: 1,
  POWER_EXPAND_COST_PER_MW: 50_000_000,
  COOLING_RATIO: 0.30,
  INITIAL_COOLING_CAPACITY_MW: 1.5,
  COOLING_EXPAND_COST_PER_MW: 20_000_000,

  // 数据中心扩容（无上限，费用指数增长，极烧钱）
  DATACENTER_EXPAND_BASE_COST: 500_000_000,
  DATACENTER_EXPAND_EXPONENT: 1.8,
  GPU_MAX_PER_TYPE: 2000,

  // 员工薪资（每月）
  BASE_SALARY: 5_000_000,
  SALARY_PER_GPU: 500,
  BASE_RENT: 2_000_000,

  // GPU 型号
  GPUS: {
    A100:   { name: 'A100 80GB', arch: 'Ampere', tflops: 312, vram: 80, vram_type: 'HBM2e', bw: 2.0, power: 400, price: 15000, color: 0x7f8c8d, unlockValuation: 0 },
    H100:   { name: 'H100', arch: 'Hopper', tflops: 990, vram: 80, vram_type: 'HBM3', bw: 3.35, power: 700, price: 30000, color: 0x00cc66, unlockValuation: 200_000_000 },
    H200:   { name: 'H200', arch: 'Hopper', tflops: 2000, vram: 141, vram_type: 'HBM3e', bw: 4.8, power: 700, price: 45000, color: 0xe6a817, unlockValuation: 500_000_000 },
    B200:   { name: 'B200', arch: 'Blackwell', tflops: 2250, vram: 192, vram_type: 'HBM3e', bw: 8.0, power: 1000, price: 55000, color: 0xe74c3c, unlockValuation: 1_000_000_000 },
    B300:   { name: 'B300', arch: 'Blackwell Ultra', tflops: 2500, vram: 288, vram_type: 'HBM3e', bw: 8.0, power: 1400, price: 70000, color: 0xff5722, unlockValuation: 2_000_000_000 },
    GB300:  { name: 'GB300 NVL72', arch: 'Blackwell Ultra', tflops: 3750, vram: 288, vram_type: 'HBM3e', bw: 13.5, power: 1800, price: 90000, color: 0xff6d00, unlockValuation: 5_000_000_000 },
    MI300X: { name: 'MI300X', arch: 'CDNA3', tflops: 1307, vram: 192, vram_type: 'HBM3', bw: 5.3, power: 750, price: 20000, color: 0xce3b3b, unlockValuation: 300_000_000 },
    MI325X: { name: 'MI325X', arch: 'CDNA3', tflops: 1630, vram: 256, vram_type: 'HBM3e', bw: 6.0, power: 750, price: 28000, color: 0xd32f2f, unlockValuation: 800_000_000 },
    Rubin:  { name: 'Rubin', arch: 'Rubin', tflops: 6250, vram: 288, vram_type: 'HBM4', bw: 22.0, power: 1800, price: 100000, color: 0xffeaa7, unlockValuation: 10_000_000_000 }
  },

  BASE_EFFICIENCY: 0.35,
  SECONDS_PER_DAY: 86400,

  // 模型规模
  MODEL_SCALES: {
    small:  { name: '小型', params: 1e9, tokens: 200e9, label: '1B', inferenceGPUs: 2 },
    medium: { name: '中型', params: 70e9, tokens: 2e12, label: '70B', inferenceGPUs: 16 },
    large:  { name: '大型', params: 400e9, tokens: 10e12, label: '400B', inferenceGPUs: 64 },
    frontier:{ name: '前沿', params: 1e12, tokens: 20e12, label: '1T+', inferenceGPUs: 160 }
  },

  // 推理GPU功耗系数（相对额定功耗）
  INFERENCE_POWER_RATIO: 0.60,

  // 参数范围（自由滑动条）
  PARAMS_MIN_B: 1,     // 最小 1B
  PARAMS_MAX_B: 2000,  // 最大 2000B (2T)
  CHINCHILLA_RATIO: 20, // 训练tokens = params * 20

  // 数据质量
  DATA_QUALITY: {
    low:    { name: '低质量', cost: 0, scoreMod: -0.20 },
    medium: { name: '中等质量', cost: 10_000_000, scoreMod: 0 },
    high:   { name: '高质量', cost: 100_000_000, scoreMod: 0.08 },
    extreme:{ name: '极高质量', cost: 500_000_000, scoreMod: 0.15 }
  },

  // 训练阶段（含子阶段）
  TRAINING_PHASES: {
    pretraining: { name: '预训练', timeRatio: 0.72, subPhases: [
      { name: '数据准备', pct: 0.05 },
      { name: '小规模验证', pct: 0.08 },
      { name: '全量训练', pct: 0.82 },
      { name: '收敛判断', pct: 0.05 }
    ]},
    sft: { name: '监督微调 SFT', timeRatio: 0.20, subPhases: [
      { name: '指令数据筛选', pct: 0.25 },
      { name: '多轮训练', pct: 0.75 }
    ]},
    alignment: { name: '对齐训练', timeRatio: 0.08, subPhases: [
      { name: '偏好对齐', pct: 0.70 },
      { name: '安全评估', pct: 0.30 }
    ]}
  },

  // 对齐方法
  ALIGNMENT_METHODS: {
    rlhf: { name: 'RLHF + PPO', timeRatio: 0.04, qualityBonus: 0.03, cost: 50_000_000 },
    dpo:  { name: 'DPO', timeRatio: 0.01, qualityBonus: 0.01, cost: 10_000_000 }
  },

  // 训练超参数（默认值 + 范围）
  HYPERPARAMS: {
    learningRate: { label: '学习率', default: 2e-4, min: 1e-6, max: 1e-2, step: 1e-5 },
    batchSize:    { label: 'Batch Size', default: 512, min: 32, max: 4096, step: 32 },
    seqLength:    { label: '序列长度', default: 4096, min: 2048, max: 131072, step: 2048 },
    warmupSteps:  { label: 'Warmup步数', default: 1000, min: 100, max: 10000, step: 100 }
  },

  // 技术研发树（按依赖关系分层，覆盖训练全流程）
  TECH_RESEARCH: {
    // Tier 1 - 基础技术（无需前置，新手友好）
    flash_attention: { name: 'Flash Attention', desc: '让GPU算得更快，每次只算一小块注意力，省显存', tier: 1, deps: [], days: 30, cost: 5_000_000, effect: '训练效率+20%', effBonus: 0.20 },
    mixed_precision: { name: 'Mixed Precision', desc: '关键计算用高精度，其余用半精度，速度翻倍', tier: 1, deps: [], days: 30, cost: 5_000_000, effect: '训练效率+15%', effBonus: 0.15 },
    rope:            { name: 'RoPE 位置编码', desc: '让模型理解词语位置关系，支持更长的输入', tier: 1, deps: [], days: 25, cost: 3_000_000, effect: '训练效率+5%，长上下文+10%', effBonus: 0.05 },
    data_dedup:      { name: '数据去重与清洗', desc: '自动删除重复和低质量数据，训练效果更好', tier: 1, deps: [], days: 20, cost: 2_000_000, effect: '数据质量+8%', qualityMod: 0.03 },
    curriculum:      { name: '课程学习', desc: '先学简单内容再学难的，像上课一样循序渐进', tier: 1, deps: [], days: 35, cost: 4_000_000, effect: '训练效率+10%，质量+1%', effBonus: 0.10, qualityMod: 0.01 },
    seq_packing:     { name: '序列打包', desc: '把多个短文拼成一段，不浪费GPU算力', tier: 1, deps: [], days: 15, cost: 2_000_000, effect: '训练效率+15%', effBonus: 0.15 },
    swiglu:          { name: 'SwiGLU 激活函数', desc: '比传统激活函数更平滑，LLaMA/Qwen同款，模型质量更好', tier: 1, deps: [], days: 20, cost: 3_000_000, effect: '质量+2%', qualityMod: 0.02 },
    rmsnorm:         { name: 'RMSNorm', desc: '简化版归一化层，比LayerNorm快15%，现代大模型标配', tier: 1, deps: [], days: 20, cost: 3_000_000, effect: '训练效率+8%', effBonus: 0.08 },
    // Tier 2 - 进阶技术
    gqa:             { name: 'GQA 分组查询', desc: '让多个注意力头共享内存，推理时省显存', tier: 2, deps: ['flash_attention'], days: 45, cost: 8_000_000, effect: '训练效率+10%，推理加速', effBonus: 0.10 },
    zero3:           { name: 'ZeRO-3 分布式训练', desc: '把训练数据分散存到所有GPU上，每张GPU只存一部分，省显存', tier: 2, deps: ['mixed_precision'], days: 45, cost: 10_000_000, effect: '训练效率+10%', effBonus: 0.10 },
    ring_attention:  { name: 'Ring Attention', desc: 'GPU围成一圈轮流计算注意力，能处理超长文本', tier: 2, deps: ['flash_attention'], days: 50, cost: 10_000_000, effect: '长上下文训练+40%', effBonus: 0.08 },
    sparse_attention:{ name: 'Sparse Attention', desc: '只算重要的token，跳过大段无关内容', tier: 2, deps: ['flash_attention'], days: 40, cost: 8_000_000, effect: '训练效率+50%，质量-1%', effBonus: 0.50, qualityMod: -0.01 },
    lora:            { name: 'LoRA 微调', desc: '只训练模型的一小部分参数，大幅节省资源', tier: 2, deps: [], days: 30, cost: 5_000_000, effect: '微调效率+80%，显存节省90%', effBonus: 0.15 },
    distillation:    { name: '知识蒸馏', desc: '让大模型把自己的知识"教"给小模型', tier: 2, deps: [], days: 50, cost: 12_000_000, effect: '质量+3%', qualityMod: 0.03 },
    rlaif:           { name: 'RLAIF 自动反馈', desc: '用AI自动打分代替人工标注，省人力成本', tier: 2, deps: ['distillation'], days: 40, cost: 8_000_000, effect: '对齐质量+3%', qualityMod: 0.02 },
    grad_checkpoint: { name: '梯度检查点', desc: '训练时不存所有中间结果，用到时重新算，省显存换时间', tier: 2, deps: ['mixed_precision'], days: 25, cost: 4_000_000, effect: '显存节省60%，速度降低20%', effBonus: 0.05 },
    kv_cache:        { name: 'KV Cache 优化', desc: '缓存已计算的键值对，推理时不用重复算，速度翻倍', tier: 2, deps: ['gqa'], days: 30, cost: 6_000_000, effect: '推理速度+80%', incomeBonus: 0.20 },
    // Tier 3 - 高级技术
    moe:             { name: 'MoE 混合专家', desc: '把模型拆成多个"专家"，每次只激活需要的部分', tier: 3, deps: ['parallel3d'], days: 90, cost: 50_000_000, effect: '训练效率+30%，质量+2%', effBonus: 0.30, qualityMod: 0.02 },
    mtp:             { name: '多Token预测', desc: '一次预测多个词，让模型学得更快更准', tier: 3, deps: ['gqa'], days: 60, cost: 20_000_000, effect: '训练效率+25%，质量+1%', effBonus: 0.25, qualityMod: 0.01 },
    parallel3d:      { name: '3D 并行训练', desc: '同时用三种并行策略，支持超大规模训练', tier: 3, deps: ['zero3'], days: 60, cost: 15_000_000, effect: '训练效率+10%', effBonus: 0.10 },
    grpo:            { name: 'GRPO 强化学习', desc: 'DeepSeek R1同款算法，让模型学会推理', tier: 3, deps: ['rlaif'], days: 70, cost: 30_000_000, effect: '推理能力+15%，质量+3%', effBonus: 0.10, qualityMod: 0.03 },
    constitutional:  { name: 'Constitutional AI', desc: '用规则约束模型行为，让它更安全', tier: 3, deps: ['distillation'], days: 40, cost: 8_000_000, effect: '安全性+10%', qualityMod: 0.01 },
    qat:             { name: '量化感知训练', desc: '训练时模拟低精度，推理时速度更快', tier: 3, deps: ['mixed_precision'], days: 50, cost: 10_000_000, effect: '推理效率+50%，质量+1%', qualityMod: 0.01 },
    speculative:     { name: '推测解码', desc: '小模型快速生成草稿，大模型验证，API收入翻倍', tier: 3, deps: ['distillation'], days: 60, cost: 15_000_000, effect: '推理速度+100%，API收入+50%', incomeBonus: 0.50 }
  },

  // 研究员
  RESEARCHER_TIERS: {
    junior:   { name: '初级研究员', salary: 3_000_000, effBonus: 0.02, desc: '刚毕业的AI研究员，基础研究能力', unlockValuation: 0 },
    senior:   { name: '高级研究员', salary: 8_000_000, effBonus: 0.04, desc: '有经验的算法工程师，产出稳定', unlockValuation: 500_000_000 },
    principal:{ name: '首席研究员', salary: 15_000_000, effBonus: 0.06, desc: '顶尖AI科学家，可能带来算法突破', unlockValuation: 2_000_000_000 }
  },
  RESEARCHER_MAX_PER_TIER: 5,
  RESEARCHER_HIRE_COOLDOWN: 30, // 每次聘请后冷却30天

  // 基准测试评估（6大类）
  BENCHMARKS: {
    reasoning:    { name: '推理能力', weight: 0.25, desc: '数学、逻辑推理、常识问答' },
    coding:       { name: '编程能力', weight: 0.20, desc: '代码生成、调试、算法设计' },
    comprehension:{ name: '文本理解', weight: 0.20, desc: '阅读理解、摘要、信息提取' },
    multilingual: { name: '多语言', weight: 0.15, desc: '中英互译、跨语言任务' },
    safety:       { name: '安全性', weight: 0.10, desc: '红队攻击、有害内容拒答率' },
    long_context: { name: '长上下文', weight: 0.10, desc: '大海捞针、长文档检索' }
  },

  // 收入模型
  API_PRICE_PER_TOKEN: { small: 1e-6, medium: 3e-6, large: 6e-6, frontier: 1e-5 },
  DAILY_ACTIVE_USERS: { small: 20_000_000, medium: 150_000_000, large: 500_000_000, frontier: 2_000_000_000 },
  AVG_DAILY_TOKENS: 5000,

  // 融资
  FUNDRAISE_COOLDOWN_DAYS: 180,
  FUNDRAISE_BASE: 1_000_000_000,
  FUNDRAISE_SCORE_MULT: 8, // 融资金额 = 基准 x (模型得分 / 100) x 倍数

  // 企业授权收入（每月）
  ENTERPRISE_BASE: 50_000_000, // 模型得分50时基础月收入

  // 随机事件（训练经营相关）
  EVENTS: [
    { name: '硬件故障', type: 'negative', desc: '部分GPU因过热损坏', effect: 'lose_gpu', value: 0.02 },
    { name: '电网波动', type: 'negative', desc: '供电不稳定', effect: 'blackout', days: 2 },
    { name: '数据泄露', type: 'negative', desc: '用户数据泄露，面临罚款', effect: 'fine', value: 100_000_000 },
    { name: '人才挖角', type: 'negative', desc: '核心研究员被挖走', effect: 'eff_penalty', value: 0.20, days: 15 },
    { name: '技术突破', type: 'positive', desc: '研究团队取得算法突破', effect: 'training_boost', value: 0.20 },
    { name: '政策利好', type: 'positive', desc: '政府发放AI产业补贴', effect: 'subsidy', value: 500_000_000 },
    { name: '芯片禁运', type: 'negative', desc: '出口管制升级，无法购买新GPU', effect: 'buy_ban', days: 30 },
    { name: '行业盛会', type: 'positive', desc: '行业大会展示成果，公司估值上升', effect: 'valuation_boost', value: 0.15 },
    { name: '算法突破', type: 'positive', desc: '发现新的训练范式', effect: 'next_train_boost', value: 0.30 },
    { name: '电力故障', type: 'negative', desc: '供电设施故障，容量临时下降', effect: 'power_fault', value: 0.30, days: 10 }
  ],

  // 训练中突发事件
  TRAINING_EVENTS: [
    { name: 'Loss Spike', desc: '损失函数突然飙升，需要调整学习率', effect: 'loss_spike', penalty: 0.03 },
    { name: 'GPU离线', desc: '某张GPU出现硬件故障，训练效率下降', effect: 'gpu_offline', penalty: 0.08 },
    { name: '数据瓶颈', desc: '存储带宽不足，数据加载变慢', effect: 'io_bottleneck', penalty: 0.05 },
    { name: '梯度消失', desc: '模型深度导致梯度消失，需要调整架构', effect: 'gradient_vanishing', penalty: 0.04 }
  ],

  // 数据采集（从零开始的完整训练流程）
  DATA_SOURCES: {
    web_crawl:   { name: '网页爬取', desc: '互联网公开文本，量大但质量参差不齐', cost: 5_000_000, qualityBase: 0.55, tokens: 500e9, category: '通用' },
    books:       { name: '书籍语料', desc: '高质量出版书籍，文学与知识类', cost: 15_000_000, qualityBase: 0.85, tokens: 100e9, category: '知识' },
    code_repos:  { name: '代码仓库', desc: 'GitHub开源代码，提升编程能力', cost: 20_000_000, qualityBase: 0.80, tokens: 150e9, category: '编程' },
    academic:    { name: '学术论文', desc: 'arXiv等学术论文，提升推理能力', cost: 25_000_000, qualityBase: 0.90, tokens: 30e9, category: '推理' },
    synthetic:   { name: '合成数据', desc: '用现有模型生成高质量训练数据', cost: 30_000_000, qualityBase: 0.75, tokens: 200e9, category: '通用' },
    multilingual:{ name: '多语言语料', desc: '中英日韩等多语言文本', cost: 10_000_000, qualityBase: 0.65, tokens: 300e9, category: '多语言' }
  },

  // 事件触发间隔
  EVENT_MIN_DAYS: 30,
  EVENT_MAX_DAYS: 90,
  TRAINING_EVENT_CHANCE: 0.08 // 训练中每天8%概率触发事件

};

// === 工具函数 ===
// 格式化参数数量为可读字符串
function formatParams(params) {
  if (params >= 1e12) return (params / 1e12).toFixed(1).replace(/\.0$/, '') + 'T';
  if (params >= 1e9) return Math.round(params / 1e9) + 'B';
  return Math.round(params / 1e6) + 'M';
}

// 根据参数数量映射到规模类别（用于收入计算）
function paramsToScaleKey(params) {
  if (params < 5e9) return 'small';
  if (params < 150e9) return 'medium';
  if (params < 700e9) return 'large';
  return 'frontier';
}

// 根据参数数量计算最少推理GPU数（以H100为基准）
function recommendedInferenceGPUs(params) {
  return Math.max(1, Math.ceil(params / 5e9));
}

// 按型号折算最少推理GPU数（不同型号算力/显存不同，消耗数量不同；以H100为基准）
function recommendedInferenceGPUsForType(params, gpuKey) {
  const gpu = CONFIG.GPUS[gpuKey];
  if (!gpu) return recommendedInferenceGPUs(params);
  const base = recommendedInferenceGPUs(params);
  const baseGPU = CONFIG.GPUS.H100;
  // 按算力折算：低算力型号需要更多张
  const byFlops = Math.max(1, Math.ceil(base * baseGPU.tflops / gpu.tflops));
  // 显存下限：fp16权重需能装入显存
  const weightGB = (params * 2) / 1e9;
  const byVram = Math.max(1, Math.ceil(weightGB / gpu.vram));
  return Math.max(byFlops, byVram);
}

// 将实际部署的GPU（按型号混合）折算为等效H100数量
function effectiveInferenceGPUs(deploymentGPUs) {
  let total = 0;
  const baseTflops = CONFIG.GPUS.H100.tflops;
  for (const [type, count] of Object.entries(deploymentGPUs || {})) {
    // 跳过非型号键（如旧存档迁移的 _legacy 占位）
    const g = CONFIG.GPUS[type];
    if (!g) continue;
    total += count * g.tflops / baseTflops;
  }
  return total;
}