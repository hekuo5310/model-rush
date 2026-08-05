// Model Rush - 游戏配置常量
const CONFIG = {
  // 初始资金
  INITIAL_CASH: 500_000_000, // 5亿美金

  // 电价 ($/kWh)
  ELECTRICITY_PRICE: 0.08,

  // 供电
  INITIAL_POWER_CAPACITY_MW: 2,
  POWER_EXPAND_COST_PER_MW: 50_000_000,
  COOLING_RATIO: 0.30, // 冷却消耗额外30%电力
  INITIAL_COOLING_CAPACITY_MW: 3,
  COOLING_EXPAND_COST_PER_MW: 20_000_000,

  // 数据中心扩容
  DATACENTER_EXPAND_COST: 200_000_000, // 每次扩容费用
  DATACENTER_MAX_EXPANDS: 5, // 最多扩容5次
  GPU_MAX_PER_TYPE: 2000, // 每种GPU型号最大数量（单位：张）

  // 员工薪资（每月）
  BASE_SALARY: 5_000_000, // 基础团队月薪
  SALARY_PER_GPU: 500, // 每GPU额外月薪

  // 数据中心租金（每月）
  BASE_RENT: 2_000_000,

  // GPU 型号（游戏内统一算力基准，非精确FP16规格）
  GPUS: {
    A100:   { name: 'A100 80GB', arch: 'Ampere', tflops: 312, vram: 80, vram_type: 'HBM2e', bw: 2.0, power: 400, price: 15000, color: 0x7f8c8d },
    H100:   { name: 'H100', arch: 'Hopper', tflops: 990, vram: 80, vram_type: 'HBM3', bw: 3.35, power: 700, price: 30000, color: 0x00cc66 },
    H200:   { name: 'H200', arch: 'Hopper', tflops: 2000, vram: 141, vram_type: 'HBM3e', bw: 4.8, power: 700, price: 45000, color: 0xe6a817 },
    B200:   { name: 'B200', arch: 'Blackwell', tflops: 2250, vram: 192, vram_type: 'HBM3e', bw: 8.0, power: 1000, price: 55000, color: 0xe74c3c },
    B300:   { name: 'B300', arch: 'Blackwell Ultra', tflops: 2500, vram: 288, vram_type: 'HBM3e', bw: 8.0, power: 1400, price: 70000, color: 0xff5722 },
    GB300:  { name: 'GB300 NVL72', arch: 'Blackwell Ultra', tflops: 3750, vram: 288, vram_type: 'HBM3e', bw: 13.5, power: 1800, price: 90000, color: 0xff6d00 },
    MI300X: { name: 'MI300X', arch: 'CDNA3', tflops: 1307, vram: 192, vram_type: 'HBM3', bw: 5.3, power: 750, price: 20000, color: 0xce3b3b },
    MI325X: { name: 'MI325X', arch: 'CDNA3', tflops: 1630, vram: 256, vram_type: 'HBM3e', bw: 6.0, power: 750, price: 28000, color: 0xd32f2f },
    Rubin:  { name: 'Rubin', arch: 'Rubin', tflops: 6250, vram: 288, vram_type: 'HBM4', bw: 22.0, power: 1800, price: 100000, color: 0xffeaa7 }
  },

  // 训练效率系数
  BASE_EFFICIENCY: 0.35,
  SECONDS_PER_DAY: 86400,

  // 模型规模
  MODEL_SCALES: {
    small:  { name: '小型', params: 1e9, tokens: 200e9, label: '1B' },
    medium: { name: '中型', params: 70e9, tokens: 2e12, label: '70B' },
    large:  { name: '大型', params: 400e9, tokens: 10e12, label: '400B' },
    frontier:{ name: '前沿', params: 1e12, tokens: 20e12, label: '1T+' }
  },

  // 数据质量
  DATA_QUALITY: {
    low:    { name: '低质量', cost: 0, scoreMod: -0.30 },
    medium: { name: '中等质量', cost: 10_000_000, scoreMod: 0 },
    high:   { name: '高质量', cost: 100_000_000, scoreMod: 0.15 },
    extreme:{ name: '极高质量', cost: 500_000_000, scoreMod: 0.30 }
  },

  // 训练阶段
  TRAINING_PHASES: {
    pretraining: { name: '预训练', timeRatio: 0.80 },
    sft:         { name: '监督微调 (SFT)', timeRatio: 0.15 },
    alignment:   { name: '对齐训练', timeRatio: 0.05 }
  },

  // 对齐方法
  ALIGNMENT_METHODS: {
    rlhf: { name: 'RLHF + PPO', timeRatio: 0.04, qualityBonus: 0.05, cost: 50_000_000 },
    dpo:  { name: 'DPO', timeRatio: 0.01, qualityBonus: 0.02, cost: 10_000_000 }
  },

  // 技术（全部默认可用，无需解锁）
  TECHNIQUES: {
    flash_attention:    { name: 'Flash Attention', desc: 'IO感知精确注意力，分块计算减少显存读写', effect: '训练效率+20%', effBonus: 0.20 },
    mixed_precision:    { name: 'Mixed Precision (FP8/BF16)', desc: '混合精度训练，关键计算高精度，其余半精度', effect: '训练效率+15%', effBonus: 0.15 },
    gqa:                { name: 'Grouped Query Attention', desc: '多个Query头共享KV头，减少KV Cache占用', effect: '训练效率+10%，推理加速', effBonus: 0.10 },
    zero3:              { name: 'ZeRO-3 (DeepSpeed)', desc: '优化器状态、梯度、参数分片到所有GPU', effect: '训练效率+10%', effBonus: 0.10 },
    parallel3d:         { name: '3D Parallelism', desc: '张量并行+流水线并行+数据并行', effect: '训练效率+10%', effBonus: 0.10 },
    mtp:                { name: 'Multi-Token Prediction', desc: '一次预测多个token，提高训练信号密度', effect: '训练效率+25%，质量+2%', effBonus: 0.25, qualityMod: 0.02 },
    sparse_attention:   { name: 'Sparse Attention', desc: '仅计算关键token注意力，降低长文本计算量', effect: '训练效率+50%，质量-2%', effBonus: 0.50, qualityMod: -0.02 },
    moe:                { name: 'MoE (Mixture of Experts)', desc: '模型拆分为多个专家子网络，每次只激活部分', effect: '训练效率+30%，质量+4%', effBonus: 0.30, qualityMod: 0.04 },
    constitutional:     { name: 'Constitutional AI', desc: '用规则约束模型行为，无需大量人工标注', effect: '质量+2%，安全对齐成本极低', qualityMod: 0.02 },
    distillation:       { name: 'Knowledge Distillation', desc: '大模型（教师）指导小模型（学生）学习', effect: '质量+6%', qualityMod: 0.06 },
    qat:                { name: 'Quantization-Aware Training', desc: '训练时模拟量化误差，推理精度损失最小', effect: '质量+1%，推理成本-50%', qualityMod: 0.01 },
    speculative:        { name: 'Speculative Decoding', desc: '小模型快速生成草稿，大模型验证修正', effect: '推理速度+100%，API收入+50%', incomeBonus: 0.50 }
  },

  // 研究员（分三级）
  RESEARCHER_TIERS: {
    junior:   { name: '初级研究员', salary: 1_000_000, effBonus: 0.02, desc: '刚毕业的AI研究员，基础研究能力' },
    senior:   { name: '高级研究员', salary: 3_000_000, effBonus: 0.04, desc: '有经验的算法工程师，产出稳定' },
    principal:{ name: '首席研究员', salary: 6_000_000, effBonus: 0.06, desc: '顶尖AI科学家，可能带来算法突破' }
  },
  RESEARCHER_MAX_PER_TIER: 5,

  // 收入模型（游戏平衡调整后数值）
  API_PRICE_PER_TOKEN: { small: 1e-6, medium: 3e-6, large: 6e-6, frontier: 1e-5 },
  DAILY_ACTIVE_USERS: { small: 20_000_000, medium: 150_000_000, large: 500_000_000, frontier: 2_000_000_000 },
  AVG_DAILY_TOKENS: 5000,
  ENTERPRISE_BASE: 50_000_000,
  ENTERPRISE_RANK_MULT: { 1: 3.0, 2: 1.5, 3: 0.8, 4: 0.4, 5: 0.3, 6: 0.2, 7: 0.15, 8: 0.1, 9: 0.08, 10: 0.05 },

  // 融资
  FUNDRAISE_COOLDOWN_DAYS: 180,
  FUNDRAISE_BASE: 1_000_000_000,
  FUNDRAISE_RANK_MULT: { 1: 10, 2: 5, 3: 3, 4: 2, 5: 1.5, 6: 1, 7: 0.8, 8: 0.5, 9: 0.3, 10: 0.2 },

  // 竞争对手
  COMPETITORS: [
    { name: 'OpenAI', style: '闭源霸主，综合能力最强', openSource: false, basePower: 0.95 },
    { name: 'Anthropic', style: '安全对齐标杆，编程顶尖', openSource: false, basePower: 0.93 },
    { name: 'Kimi', style: '中国推理新锐，超长上下文', openSource: false, basePower: 0.85 },
    { name: 'GLM', style: '智谱AI，产学研标杆', openSource: true, basePower: 0.85 },
    { name: 'DeepSeek', style: '中国开源先锋，成本极低', openSource: true, basePower: 0.90 },
    { name: 'Google', style: '多模态和长上下文王者', openSource: false, basePower: 0.92 },
    { name: 'Qwen', style: '阿里通义，MoE效率之王', openSource: true, basePower: 0.83 },
    { name: 'xAI', style: '马斯克旗下，算力庞大', openSource: false, basePower: 0.86 },
    { name: 'Minimax', style: '多模态新势力', openSource: false, basePower: 0.78 }
  ],

  // 随机事件
  EVENTS: [
    { name: '硬件故障', type: 'negative', desc: '部分GPU因过热损坏', effect: 'lose_gpu', value: 0.02 },
    { name: '电网波动', type: 'negative', desc: '供电不稳定，停电持续中', effect: 'blackout', days: 2 },
    { name: '数据泄露', type: 'negative', desc: '用户数据泄露，面临罚款', effect: 'fine', value: 100_000_000 },
    { name: '人才挖角', type: 'negative', desc: '核心研究员被竞争对手挖走', effect: 'eff_penalty', value: 0.20, days: 15 },
    { name: '技术突破', type: 'positive', desc: '研究团队取得算法突破，训练加速', effect: 'training_boost', value: 0.20 },
    { name: '政策利好', type: 'positive', desc: '政府发放AI产业补贴', effect: 'subsidy', value: 500_000_000 },
    { name: '开源冲击', type: 'negative', desc: '开源模型冲击市场，API收入下滑', effect: 'income_penalty', value: 0.30, days: 30 },
    { name: '芯片禁运', type: 'negative', desc: '出口管制升级，无法购买新GPU', effect: 'buy_ban', days: 30 },
    { name: '行业盛会', type: 'positive', desc: '行业大会展示成果，公司估值上升', effect: 'valuation_boost', value: 0.15 },
    { name: '算法突破', type: 'positive', desc: '发现新的训练范式，下次训练效率大幅提升', effect: 'next_train_boost', value: 0.30 }
  ],

  // 事件触发间隔
  EVENT_MIN_DAYS: 30,
  EVENT_MAX_DAYS: 90,

  // 竞争对手发布间隔
  COMPETITOR_MIN_DAYS: 45,
  COMPETITOR_MAX_DAYS: 120
};