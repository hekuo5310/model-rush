// Model Rush - 3D 数据中心渲染
const Datacenter = {
  gpuBlocks: [], // {mesh, type, row, col, training}
  powerRoom: null,
  coolingTower: null,
  pipeLines: [],
  powerRoomGroup: null,
  coolingGroup: null,

  RACK_SIZE: 0.3,
  RACK_HEIGHT: 0.45,
  RACK_GAP: 0.12,
  ROWS: 10,
  COLS: 20,
  POWER_POS: { x: -8, z: 8 },
  COOLING_POS: { x: -8, z: -3 },

  init() {
    this.createPowerRoom();
    this.createCoolingTower();
    this.createPipes();
  },

  getPlatformSize() {
    const w = this.COLS * (this.RACK_SIZE + this.RACK_GAP) + 1.0;
    const d = this.ROWS * (this.RACK_SIZE + this.RACK_GAP) + 1.0;
    return { w, d };
  },

  getPlatformBounds() {
    const { w, d } = this.getPlatformSize();
    return { minX: -w/2, maxX: w/2, minZ: -d/2, maxZ: d/2 };
  },

  createPlatform() {
    const { w, d } = this.getPlatformSize();

    // 数据中心高架地板
    const floorGeo = new THREE.BoxGeometry(w, 0.12, d);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.7, metalness: 0.2 });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.position.y = 0.06;
    this.floorMesh.receiveShadow = true;
    this.floorMesh.castShadow = true;
    Scene.scene.add(this.floorMesh);

    // 平台边框
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.4, metalness: 0.6 });
    const edgeThickness = 0.06;
    const edgeHeight = 0.15;
    const edges = [
      { x: 0, z: -d/2, w: w, d: edgeThickness },  // 前
      { x: 0, z: d/2, w: w, d: edgeThickness },   // 后
      { x: -w/2, z: 0, w: edgeThickness, d: d },  // 左
      { x: w/2, z: 0, w: edgeThickness, d: d }    // 右
    ];
    this.edgeMeshes = [];
    for (const e of edges) {
      const edgeGeo = new THREE.BoxGeometry(e.w, edgeHeight, e.d);
      const edge = new THREE.Mesh(edgeGeo, edgeMat);
      edge.position.set(e.x, 0.13, e.z);
      edge.castShadow = true;
      edge.receiveShadow = true;
      Scene.scene.add(edge);
      this.edgeMeshes.push(edge);
    }

    // 网格线（仅平台区域）
    this.gridHelper = new THREE.GridHelper(Math.max(w, d), Math.max(this.COLS, this.ROWS), 0x2a2a3a, 0x1a1a2e);
    this.gridHelper.position.y = 0.13;
    Scene.scene.add(this.gridHelper);
  },

  updatePlatform() {
    // 移除旧平台
    if (this.floorMesh) {
      Scene.scene.remove(this.floorMesh);
      this.floorMesh.geometry.dispose();
    }
    if (this.gridHelper) {
      Scene.scene.remove(this.gridHelper);
    }
    if (this.edgeMeshes) {
      for (const e of this.edgeMeshes) {
        Scene.scene.remove(e);
        e.geometry.dispose();
      }
    }
    this.createPlatform();
    this.updatePipes();
  },

  isPositionBlocked(col, row) {
    const x = this.getX(col);
    const z = this.getZ(row);
    const rackHalf = this.RACK_SIZE / 2;

    // 设施碰撞检测（含容差）
    const facilities = [
      { pos: this.POWER_POS, rx: 2.0, rz: 1.5 },   // 供电房包围盒
      { pos: this.COOLING_POS, rx: 2.0, rz: 1.5 }  // 冷却塔包围盒
    ];
    for (const f of facilities) {
      if (Math.abs(x - f.pos.x) < (rackHalf + f.rx) &&
          Math.abs(z - f.pos.z) < (rackHalf + f.rz)) {
        return true;
      }
    }
    return false;
  },

  createPowerRoom() {
    const group = new THREE.Group();
    this.powerRoomGroup = group;

    // 主厂房 - 钢筋混凝土质感
    const mainGeo = new THREE.BoxGeometry(3.0, 2.0, 2.0);
    const mainMat = new THREE.MeshStandardMaterial({ color: 0x5a5a6a, roughness: 0.7, metalness: 0.2 });
    const mainBody = new THREE.Mesh(mainGeo, mainMat);
    mainBody.position.y = 1.0;
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    group.add(mainBody);

    // 屋顶排风设备
    for (let i = 0; i < 4; i++) {
      const ventGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
      const ventMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.8 });
      const vent = new THREE.Mesh(ventGeo, ventMat);
      vent.position.set(-0.9 + i * 0.6, 2.15, 0);
      vent.castShadow = true;
      group.add(vent);
    }

    // 烟囱
    const chimneyGeo = new THREE.CylinderGeometry(0.12, 0.15, 1.0, 8);
    const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.3, metalness: 0.8 });
    const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
    chimney.position.set(1.2, 2.5, -0.5);
    chimney.castShadow = true;
    group.add(chimney);

    // 变压器平台 - 水泥底座
    const platformGeo = new THREE.BoxGeometry(2.0, 0.15, 0.8);
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.6, metalness: 0.3 });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.set(0, 0.08, 1.3);
    platform.receiveShadow = true;
    group.add(platform);

    // 变压器 - 三个大型变压器
    for (let i = 0; i < 3; i++) {
      const txGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.7, 12);
      const txMat = new THREE.MeshStandardMaterial({ color: 0x556666, roughness: 0.3, metalness: 0.8 });
      const tx = new THREE.Mesh(txGeo, txMat);
      tx.position.set(-0.6 + i * 0.6, 0.5, 1.3);
      tx.castShadow = true;
      group.add(tx);

      const insGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.18, 8);
      const insMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.2, metalness: 0.3 });
      const ins = new THREE.Mesh(insGeo, insMat);
      ins.position.set(-0.6 + i * 0.6, 0.92, 1.3);
      group.add(ins);
    }

    // 高压线塔 - 格构式钢塔
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.3, metalness: 0.9 });
    for (let i = 0; i < 2; i++) {
      const legGeo = new THREE.CylinderGeometry(0.05, 0.06, 2.5, 6);
      const leg = new THREE.Mesh(legGeo, towerMat);
      leg.position.set(1.5 + i * 0.2, 1.25, 0);
      leg.castShadow = true;
      group.add(leg);
    }
    for (let i = 0; i < 2; i++) {
      const legGeo = new THREE.CylinderGeometry(0.05, 0.06, 2.5, 6);
      const leg = new THREE.Mesh(legGeo, towerMat);
      leg.position.set(1.5 + i * 0.2, 1.25, 0.2);
      leg.castShadow = true;
      group.add(leg);
    }

    // 横梁
    for (let h = 0; h < 3; h++) {
      const beamGeo = new THREE.BoxGeometry(0.5, 0.04, 0.04);
      const beam = new THREE.Mesh(beamGeo, towerMat);
      beam.position.set(1.6, 0.5 + h * 1.0, 0.1);
      group.add(beam);
    }

    // 高压警示牌
    const signGeo = new THREE.BoxGeometry(1.4, 0.3, 0.05);
    const signMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0x442200, emissiveIntensity: 0.6 });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 2.1, 1.01);
    group.add(sign);

    // 围栏
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.3, metalness: 0.9 });
    const fencePosts = [];
    for (let i = 0; i < 8; i++) {
      const postGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6);
      const post = new THREE.Mesh(postGeo, fenceMat);
      post.position.set(-1.7 + i * 0.48, 0.3, 1.2);
      fencePosts.push(post);
      group.add(post);
    }
    for (let i = 0; i < 8; i++) {
      const postGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6);
      const post = new THREE.Mesh(postGeo, fenceMat);
      post.position.set(-1.7 + i * 0.48, 0.3, -1.2);
      fencePosts.push(post);
      group.add(post);
    }

    group.position.set(this.POWER_POS.x, 0, this.POWER_POS.z);
    Scene.scene.add(group);
    this.powerRoom = group;
  },

  createCoolingTower() {
    const group = new THREE.Group();
    this.coolingGroup = group;

    // 主冷却塔 - 双曲面大型混凝土塔
    const towerGeo = new THREE.CylinderGeometry(0.55, 0.85, 2.8, 20);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x6a7a6a, roughness: 0.6, metalness: 0.2 });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.y = 1.4;
    tower.castShadow = true;
    tower.receiveShadow = true;
    group.add(tower);

    // 双曲面效果 - 顶部收缩环
    const waistGeo = new THREE.TorusGeometry(0.7, 0.05, 8, 20);
    const waistMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.2, metalness: 0.9 });
    const waist = new THREE.Mesh(waistGeo, waistMat);
    waist.position.y = 2.2;
    waist.rotation.x = Math.PI / 2;
    group.add(waist);

    const topRingGeo = new THREE.TorusGeometry(0.6, 0.06, 8, 20);
    const topRing = new THREE.Mesh(topRingGeo, waistMat);
    topRing.position.y = 2.8;
    topRing.rotation.x = Math.PI / 2;
    group.add(topRing);

    // 第二座冷却塔
    const tower2Geo = new THREE.CylinderGeometry(0.4, 0.6, 2.0, 16);
    const tower2 = new THREE.Mesh(tower2Geo, towerMat);
    tower2.position.set(1.4, 1.0, 0);
    tower2.castShadow = true;
    tower2.receiveShadow = true;
    group.add(tower2);

    const topRing2Geo = new THREE.TorusGeometry(0.45, 0.05, 8, 16);
    const topRing2 = new THREE.Mesh(topRing2Geo, waistMat);
    topRing2.position.set(1.4, 2.0, 0);
    topRing2.rotation.x = Math.PI / 2;
    group.add(topRing2);

    // 水泵房
    const pumpGeo = new THREE.BoxGeometry(1.0, 0.6, 0.7);
    const pumpMat = new THREE.MeshStandardMaterial({ color: 0x5a6a5a, roughness: 0.5, metalness: 0.4 });
    const pumpHouse = new THREE.Mesh(pumpGeo, pumpMat);
    pumpHouse.position.set(0.7, 0.3, -1.1);
    pumpHouse.castShadow = true;
    pumpHouse.receiveShadow = true;
    group.add(pumpHouse);

    // 水泵房屋顶
    const pumpRoofGeo = new THREE.BoxGeometry(1.1, 0.08, 0.8);
    const pumpRoof = new THREE.Mesh(pumpRoofGeo, new THREE.MeshStandardMaterial({ color: 0x4a5a4a, roughness: 0.3, metalness: 0.5 }));
    pumpRoof.position.set(0.7, 0.64, -1.1);
    group.add(pumpRoof);

    // 管道连接
    const pipeGeo = new THREE.CylinderGeometry(0.07, 0.07, 1.2, 8);
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x778877, roughness: 0.3, metalness: 0.6 });
    const pipe = new THREE.Mesh(pipeGeo, pipeMat);
    pipe.position.set(0.7, 0.4, -0.5);
    pipe.rotation.x = Math.PI / 2;
    group.add(pipe);

    // 冷却液储罐
    const tankGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.7, 16);
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x667766, roughness: 0.3, metalness: 0.7 });
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.set(-1.0, 0.35, -0.8);
    tank.castShadow = true;
    group.add(tank);

    const tankLidGeo = new THREE.SphereGeometry(0.35, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const tankLid = new THREE.Mesh(tankLidGeo, tankMat);
    tankLid.position.set(-1.0, 0.7, -0.8);
    group.add(tankLid);

    group.position.set(this.COOLING_POS.x, 0, this.COOLING_POS.z);
    Scene.scene.add(group);
    this.coolingTower = group;
  },

  createPipes() {
    const px = this.POWER_POS.x, pz = this.POWER_POS.z;
    const cx = this.COOLING_POS.x, cz = this.COOLING_POS.z;
    const { w, d } = this.getPlatformSize();
    const halfW = w / 2, halfD = d / 2;

    // 供电管道: 供电房 -> 平台边缘 -> GPU集群中心
    const powerPoints = [
      new THREE.Vector3(px, 0.15, pz),
      new THREE.Vector3(px, 0.15, halfD),
      new THREE.Vector3(0, 0.15, halfD),
      new THREE.Vector3(0, 0.15, 0)
    ];
    const powerCurve = new THREE.CatmullRomCurve3(powerPoints);
    const powerTubeGeo = new THREE.TubeGeometry(powerCurve, 30, 0.08, 8, false);
    const powerTubeMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0x331100, emissiveIntensity: 0.4 });
    const powerTube = new THREE.Mesh(powerTubeGeo, powerTubeMat);
    Scene.scene.add(powerTube);
    this.pipeLines.push(powerTube);

    // 冷却管道: 冷却塔 -> 平台边缘 -> GPU集群中心
    const coolPoints = [
      new THREE.Vector3(cx, 0.15, cz),
      new THREE.Vector3(cx, 0.15, -halfD),
      new THREE.Vector3(0, 0.15, -halfD),
      new THREE.Vector3(0, 0.15, 0)
    ];
    const coolCurve = new THREE.CatmullRomCurve3(coolPoints);
    const coolTubeGeo = new THREE.TubeGeometry(coolCurve, 30, 0.06, 8, false);
    const coolTubeMat = new THREE.MeshStandardMaterial({ color: 0x44aa88, emissive: 0x112211, emissiveIntensity: 0.3 });
    const coolTube = new THREE.Mesh(coolTubeGeo, coolTubeMat);
    Scene.scene.add(coolTube);
    this.pipeLines.push(coolTube);

    // 地下配电/配冷枢纽（GPU集群中心下方）
    const hubGeo = new THREE.BoxGeometry(0.6, 0.08, 0.6);
    const hubMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.3, metalness: 0.8 });
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.position.set(0, 0.08, 0);
    Scene.scene.add(hub);
    this.pipeLines.push(hub);
  },

  expand() {
    this.ROWS += 2;
    this.COLS += 4;
    this.updatePlatform();
    Game.addLog('数据中心已扩容至 ' + this.ROWS + 'x' + this.COLS + ' (' + (this.ROWS * this.COLS) + ' 机架)');
  },

  updatePipes() {
    // 移除旧管道
    for (const pipe of this.pipeLines) {
      Scene.scene.remove(pipe);
      if (pipe.geometry) pipe.geometry.dispose();
      if (pipe.material) pipe.material.dispose();
    }
    this.pipeLines = [];
    this.createPipes();
  },

  addGPUs(gpuType, count) {
    const typeConfig = CONFIG.GPUS[gpuType];
    const color = typeConfig.color;
    const maxCapacity = this.ROWS * this.COLS;

    // 已占用数量
    const occupied = this.gpuBlocks.length;
    const available = maxCapacity - occupied;
    const toAdd = Math.min(count, available);

    if (toAdd < count) {
      // 超出容量，仅放下可放置的
      Game.addLog('警告: 数据中心仅能容纳 ' + maxCapacity + ' 个机架，超出部分无法放置');
    }

    let added = 0;
    for (let row = 0; row < this.ROWS && added < toAdd; row++) {
      for (let col = 0; col < this.COLS && added < toAdd; col++) {
        const occupied = this.gpuBlocks.some(b => b.row === row && b.col === col);
        if (occupied) continue;

        // 碰撞检测：不与设施重叠
        if (this.isPositionBlocked(col, row)) continue;

        const x = this.getX(col);
        const z = this.getZ(row);

        // 机架组
        const rackGroup = new THREE.Group();

        // 机架底座
        const baseGeo = new THREE.BoxGeometry(this.RACK_SIZE * 0.9, 0.05, this.RACK_SIZE * 0.9);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.7 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.025;
        base.castShadow = true;
        base.receiveShadow = true;
        rackGroup.add(base);

        // GPU 主体 - 带发光效果
        const gpuGeo = new THREE.BoxGeometry(this.RACK_SIZE * 0.7, this.RACK_HEIGHT * 0.8, this.RACK_SIZE * 0.7);
        const gpuMat = new THREE.MeshStandardMaterial({
          color: color,
          roughness: 0.3,
          metalness: 0.6,
          emissive: color,
          emissiveIntensity: 0.12
        });
        const gpuMesh = new THREE.Mesh(gpuGeo, gpuMat);
        gpuMesh.position.y = this.RACK_HEIGHT * 0.45;
        gpuMesh.castShadow = true;
        gpuMesh.receiveShadow = true;
        rackGroup.add(gpuMesh);

        // 机架顶框
        const topGeo = new THREE.BoxGeometry(this.RACK_SIZE * 0.9, 0.04, this.RACK_SIZE * 0.9);
        const topMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.4, metalness: 0.8 });
        const topFrame = new THREE.Mesh(topGeo, topMat);
        topFrame.position.y = this.RACK_HEIGHT * 0.85;
        topFrame.castShadow = true;
        rackGroup.add(topFrame);

        // 小指示灯
        const ledGeo = new THREE.SphereGeometry(0.02, 4, 4);
        const ledMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.8 });
        const led = new THREE.Mesh(ledGeo, ledMat);
        led.position.set(this.RACK_SIZE * 0.25, this.RACK_HEIGHT * 0.9, this.RACK_SIZE * 0.3);
        rackGroup.add(led);

        rackGroup.position.set(x, 0, z);
        Scene.scene.add(rackGroup);

        this.gpuBlocks.push({
          mesh: gpuMesh,
          group: rackGroup,
          type: gpuType,
          row,
          col,
          training: false
        });

        added++;
      }
    }
  },

  removeGPUs(gpuType, count) {
    let removed = 0;
    const toRemove = [];
    for (const block of this.gpuBlocks) {
      if (block.type === gpuType && removed < count) {
        toRemove.push(block);
        removed++;
      }
    }
    for (const block of toRemove) {
      Scene.scene.remove(block.group);
      block.group.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }
    this.gpuBlocks = this.gpuBlocks.filter(b => !toRemove.includes(b));
  },

  markTrainingGPUs(count) {
    let marked = 0;
    for (const block of this.gpuBlocks) {
      if (!block.training && marked < count) {
        block.training = true;
        block.mesh.material.emissiveIntensity = 0.6;
        marked++;
      }
    }
  },

  unmarkTrainingGPUs() {
    for (const block of this.gpuBlocks) {
      block.training = false;
      block.mesh.material.emissiveIntensity = 0.12;
    }
  },

  updateGPUVIsuals() {
    const t = performance.now() * 0.001;
    for (const block of this.gpuBlocks) {
      if (block.training) {
        const pulse = 0.3 + 0.3 * Math.sin(t * 3 + block.row * 0.5 + block.col * 0.3);
        block.mesh.material.emissiveIntensity = pulse;
      }
    }
  },

  updatePowerRoom() {
    // 扩容不改变建模，仅更新数据
  },

  updateCoolingTower() {
    // 扩容不改变建模，仅更新数据
  },

  getX(col) {
    return (col - this.COLS / 2 + 0.5) * (this.RACK_SIZE + this.RACK_GAP);
  },

  getZ(row) {
    return (row - this.ROWS / 2 + 0.5) * (this.RACK_SIZE + this.RACK_GAP);
  }
};