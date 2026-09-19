const $ = (id) => document.getElementById(id);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080a10);
scene.fog = new THREE.Fog(0x080a10, 16, 42);
const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
$('world').appendChild(renderer.domElement);

const state = { hp: 180, maxHp: 180, stamina: 100, maxStamina: 100, level: 4, points: 3, inventory: [], gold: 96, xp: 0, xpNeed: 100, dead: false, lastShot: 0, projectiles: [], loot: [], enemies: [], yaw: 0, equipped: { weapon: { name: 'Rustfang', type: 'gun', damage: 8, skill: 'Rapid Volley', color: 0x293548 }, armor: null, relic: null } };
const keys = {};
const player = new THREE.Object3D();
player.position.set(0, 0, 0);
scene.add(player);
const playerHeight = 1.55;
const mat = (color, roughness = 0.7, glow = 0) => new THREE.MeshStandardMaterial({ color, roughness, emissive: color, emissiveIntensity: glow });
const mesh = (geometry, material) => { const object = new THREE.Mesh(geometry, material); object.castShadow = true; object.receiveShadow = true; return object; };

const gun = mesh(new THREE.BoxGeometry(0.16, 0.16, 0.82), mat(0x293548, 0.3));
gun.position.set(0.38, -0.3, -0.72);
camera.add(gun);
const weaponDecor = new THREE.Group();
weaponDecor.position.set(0.38, -0.3, -0.72);
camera.add(weaponDecor);
function applyWeaponVisual(weapon) {
  const color = weapon.color || 0x293548;
  weaponDecor.clear();
  gun.visible = !weapon.type || weapon.type === 'gun';
  gun.material.color.setHex(color);
  gun.material.emissive.setHex(color);
  gun.scale.set(weapon.visual === 'heavy' ? 1.45 : weapon.visual === 'compact' ? 0.78 : 1, weapon.visual === 'heavy' ? 1.2 : 1, weapon.visual === 'long' ? 1.6 : 1);
  gun.rotation.z = weapon.visual === 'compact' ? -0.12 : 0;
  const glow = mat(color, 0.18, 1);
  if (weapon.type === 'bow') {
    const arc = mesh(new THREE.TorusGeometry(0.34, 0.035, 8, 18, Math.PI), glow);
    arc.rotation.z = Math.PI / 2;
    weaponDecor.add(arc);
    const string = mesh(new THREE.BoxGeometry(0.015, 0.68, 0.015), mat(0xe9edf5, 0.4));
    weaponDecor.add(string);
  } else if (weapon.type === 'wand') {
    const rod = mesh(new THREE.CylinderGeometry(0.035, 0.06, 0.9, 8), mat(0x4b2f24, 0.5));
    rod.rotation.x = Math.PI / 2;
    rod.position.z = -0.35;
    weaponDecor.add(rod);
    const crystal = mesh(new THREE.OctahedronGeometry(0.14), glow);
    crystal.position.z = -0.82;
    weaponDecor.add(crystal);
  } else if (weapon.type === 'crossbow') {
    const rail = mesh(new THREE.BoxGeometry(0.12, 0.12, 0.85), mat(0x4b3326, 0.45));
    rail.position.z = -0.35;
    weaponDecor.add(rail);
    const limbs = mesh(new THREE.BoxGeometry(0.72, 0.06, 0.12), glow);
    limbs.position.z = -0.7;
    weaponDecor.add(limbs);
  } else {
    const muzzle = mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.22, 10), glow);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.z = -0.55;
    weaponDecor.add(muzzle);
    const scope = mesh(new THREE.BoxGeometry(0.08, 0.08, 0.34), mat(0x0b111b, 0.3));
    scope.position.set(0, 0.13, -0.32);
    weaponDecor.add(scope);
  }
}
applyWeaponVisual(state.equipped.weapon);
camera.position.set(0, playerHeight, 0);
player.add(camera);

const ground = mesh(new THREE.PlaneGeometry(60, 60), mat(0x10221d));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const grid = new THREE.GridHelper(60, 30, 0x274b3e, 0x142a25);
grid.position.y = 0.01;
scene.add(grid);
scene.add(new THREE.HemisphereLight(0x91aab5, 0x111016, 1.6));
const sun = new THREE.DirectionalLight(0xffd4a3, 2.2);
sun.position.set(-8, 16, 5);
sun.castShadow = true;
scene.add(sun);

const treeMaterials = [mat(0x1c4a37), mat(0x12372d), mat(0x3d2a20)];
for (let index = 0; index < 40; index += 1) {
  const tree = new THREE.Group();
  const angle = Math.random() * Math.PI * 2;
  const distance = 7 + Math.random() * 17;
  tree.position.set(Math.cos(angle) * distance, 0, Math.sin(angle) * distance);
  const trunk = mesh(new THREE.CylinderGeometry(0.16, 0.25, 2.2, 7), treeMaterials[2]);
  trunk.position.y = 1.1;
  tree.add(trunk);
  for (let tier = 0; tier < 3; tier += 1) {
    const crown = mesh(new THREE.ConeGeometry(1.2 - tier * 0.18, 1.65, 8), treeMaterials[tier % 2]);
    crown.position.y = 2 + tier * 0.7;
    tree.add(crown);
  }
  scene.add(tree);
}

function addLog(message) { const log = $('log'); if (log) log.innerHTML = `<p>${message}</p>` + log.innerHTML; }
function stats() { return { damage: 24 + (state.equipped.weapon?.damage || 0), speed: 4.2 + state.level * 0.08 }; }
function updateUI() {
  $('hpText').textContent = `${Math.ceil(state.hp)} / ${state.maxHp}`;
  $('hpBar').style.width = `${Math.max(0, state.hp / state.maxHp * 100)}%`;
  $('staminaText').textContent = `${Math.ceil(state.stamina)} / ${state.maxStamina} Stamina`;
  $('staminaBar').style.width = `${state.stamina / state.maxStamina * 100}%`;
  $('level').textContent = state.level;
  $('points').textContent = state.points;
  if ($('goldText')) $('goldText').textContent = state.gold.toLocaleString();
  $('itemCount').textContent = `${state.inventory.length} / 12`;
  Object.keys(state.stats || {}).forEach((key) => { if ($(key)) $(key).textContent = state.stats[key]; });
}
function renderInventory() {
  const inventory = $('inventory');
  inventory.innerHTML = state.inventory.length ? '' : '<p class="rounded-lg border border-dashed border-white/10 p-5 text-center text-xs text-fog/50">F 키로 아이템을 주우세요</p>';
  state.inventory.forEach((item, index) => {
    const card = document.createElement('button');
    card.className = 'item flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-left';
    card.innerHTML = `<span class="grid h-11 w-11 place-items-center rounded-lg bg-white/5 text-2xl">${item.icon}</span><span><b class="block text-xs">${item.name}</b><small class="text-[10px] text-gold">${item.grade} · ${item.effect}</small><small class="mt-1 block text-[10px] text-ember">${item.skill || item.slot}</small></span>`;
    card.onclick = () => { const oldItem = state.equipped[item.slot]; state.equipped[item.slot] = item; state.inventory.splice(index, 1); if (oldItem) state.inventory.push(oldItem); const target = item.slot === 'armor' ? 'equippedArmor' : item.slot === 'relic' ? 'equippedRelic' : 'equippedWeapon'; $(target).textContent = item.name; if (item.slot === 'weapon') applyWeaponVisual(item); renderInventory(); updateUI(); showToast(`${item.name} 장착 완료`); };
    inventory.appendChild(card);
  });
}
function showToast(message) { const toast = $('toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 1600); }
function createEnemy(name, position, ranged = false, boss = false) {
  const enemy = new THREE.Group();
  enemy.position.copy(position);
  const body = mesh(new THREE.SphereGeometry(boss ? 1.05 : 0.72, 14, 12), mat(boss ? 0x8e304c : ranged ? 0x8b5a38 : 0xb84e52, 0.65, 0.15));
  body.scale.y = 1.3;
  enemy.add(body);
  const eye = mesh(new THREE.SphereGeometry(0.1, 8, 8), mat(0xffd168, 0.2, 1));
  eye.position.set(0, 0.28, -0.58);
  enemy.add(eye);
  enemy.scale.setScalar(boss ? 1.35 : 1.25);
  enemy.userData = { name, ranged, boss, hp: boss ? 520 : 90, maxHp: boss ? 520 : 90, speed: boss ? 1 : 1.4, cooldown: Math.random() * 1.5, alive: true };
  scene.add(enemy);
  state.enemies.push(enemy);
  return enemy;
}
createEnemy('Mire Stalker', new THREE.Vector3(-5, 0, -4));
createEnemy('Ash Caster', new THREE.Vector3(5, 0, -4), true);
createEnemy('Bog Hound', new THREE.Vector3(5, 0, 4));
createEnemy('Thorn Witch', new THREE.Vector3(-5, 0, 4), true);

function dropLoot(position) {
  const items = [
    { name: 'Bog Repeater', icon: '🔫', grade: 'COMMON', effect: '+10 damage', slot: 'weapon', type: 'gun', damage: 10, skill: 'Split Bloom', color: 0x52708a, visual: 'compact' },
    { name: 'Sunflare Rifle', icon: '🌞', grade: 'RARE', effect: '+18 damage', slot: 'weapon', type: 'gun', damage: 18, skill: 'Solar Lance', color: 0xe47b35, visual: 'long' },
    { name: 'Grave Howler', icon: '💀', grade: 'EPIC', effect: '+28 damage', slot: 'weapon', type: 'gun', damage: 28, skill: 'Void Burst', color: 0x8f4bd1, visual: 'heavy' },
    { name: 'Verdant Longbow', icon: '🏹', grade: 'RARE', effect: '+16 damage', slot: 'weapon', type: 'bow', damage: 16, skill: 'Rain of Arrows', color: 0x59bd78 },
    { name: 'Frost Hexstaff', icon: '🪄', grade: 'EPIC', effect: '+24 damage', slot: 'weapon', type: 'wand', damage: 24, skill: 'Blizzard Ring', color: 0x72d9ff },
    { name: 'Dawn Crossbow', icon: '⚙️', grade: 'RARE', effect: '+20 damage', slot: 'weapon', type: 'crossbow', damage: 20, skill: 'Bolt Mine', color: 0xd9a24f },
    { name: 'Hunter Vest', icon: '🛡️', grade: 'RARE', effect: '+24 vitality', slot: 'armor' },
    { name: 'Ember Charm', icon: '💠', grade: 'EPIC', effect: '+20 stamina', slot: 'relic' }
  ];
  const ownedNames = new Set([state.equipped.weapon?.name, state.equipped.armor?.name, state.equipped.relic?.name, ...state.inventory.map((ownedItem) => ownedItem.name)]);
  const available = items.filter((candidate) => !ownedNames.has(candidate.name));
  if (!available.length) return;
  const item = { ...available[Math.floor(Math.random() * available.length)] };
  const pickup = mesh(new THREE.OctahedronGeometry(0.38), mat(item.grade === 'EPIC' ? 0xc46cff : item.grade === 'RARE' ? 0xedc76b : 0x91b6d6, 0.2, 1));
  pickup.position.copy(position);
  pickup.position.y = 0.55;
  pickup.userData.item = item;
  pickup.userData.phase = Math.random() * 10;
  scene.add(pickup);
  state.loot.push(pickup);
}
function defeat(enemy) {
  enemy.userData.alive = false;
  enemy.visible = false;
  state.gold += enemy.userData.boss ? 180 : 15;
  state.xp += enemy.userData.boss ? 100 : 25;
  dropLoot(enemy.position);
  showToast(`${enemy.userData.name} 처치 · F로 아이템 획득`);
  addLog(`${enemy.userData.name} defeated`);
  if (state.xp >= state.xpNeed) { state.xp -= state.xpNeed; state.level += 1; state.xpNeed = Math.floor(state.xpNeed * 1.3); showToast(`LEVEL UP · ${state.level}`); }
  setTimeout(() => { enemy.position.set((Math.random() - 0.5) * 18, 0, (Math.random() - 0.5) * 16); enemy.userData.hp = enemy.userData.maxHp; enemy.userData.alive = true; enemy.visible = true; }, 4500);
}
function spawnProjectile(direction, damage, color = 0xffc966, scale = 1, speed = 18, life = 2) {
  const origin = new THREE.Vector3();
  camera.getWorldPosition(origin);
  const bullet = mesh(new THREE.SphereGeometry(0.1 * scale, 8, 8), mat(color, 0.2, 1));
  bullet.position.copy(origin).addScaledVector(direction, 0.7);
  bullet.userData = { velocity: direction.clone().multiplyScalar(speed), life, damage };
  scene.add(bullet);
  state.projectiles.push(bullet);
}
function shoot() {
  const now = performance.now();
  if (now - state.lastShot < 220 || state.stamina < 8 || state.dead) return;
  state.lastShot = now;
  state.stamina -= 8;
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  spawnProjectile(direction, stats().damage, state.equipped.weapon.color || 0xffc966, 1, 18, 2);
}
function useSkill() {
  const weapon = state.equipped.weapon;
  if (state.stamina < 30 || state.dead) { showToast('스킬을 사용할 스태미나가 부족합니다'); return; }
  state.stamina -= 30;
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  if (weapon.skill === 'Split Bloom' || weapon.skill === 'Thorn Fan') {
    for (let index = -2; index <= 2; index += 1) { spawnProjectile(direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), index * 0.13), stats().damage * 1.4, weapon.color || 0x75d68b, 1.35, 15, 2.2); }
    showToast(`${weapon.skill} · 5발 확산`);
  } else if (weapon.skill === 'Solar Lance') {
    spawnProjectile(direction, stats().damage * 3.4, 0xff9b42, 2.8, 25, 1.4);
    showToast('Solar Lance · 관통 광탄');
  } else if (weapon.skill === 'Void Burst') {
    spawnProjectile(direction, stats().damage * 2.2, 0xb76cff, 2.2, 12, 2.5);
    showToast('Void Burst · 폭발 탄환');
  } else if (weapon.skill === 'Rain of Arrows') {
    for (let index = 0; index < 7; index += 1) { const arrowDirection = direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), (index - 3) * 0.08); spawnProjectile(arrowDirection, stats().damage * 1.1, 0x7be394, 0.7, 20, 2.8); }
    showToast('Rain of Arrows · 7발 연속 낙하');
  } else if (weapon.skill === 'Blizzard Ring') {
    for (let index = 0; index < 10; index += 1) { const frostDirection = direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), index * Math.PI / 5); spawnProjectile(frostDirection, stats().damage * 0.9, 0x8fe7ff, 0.9, 9, 2.4); }
    showToast('Blizzard Ring · 냉기 고리');
  } else if (weapon.skill === 'Bolt Mine') {
    const mineDirection = direction.clone();
    spawnProjectile(mineDirection, stats().damage * 1.8, 0xffd56d, 1.8, 7, 3.5);
    showToast('Bolt Mine · 지연 폭발 탄환');
  } else {
    for (let index = 0; index < 3; index += 1) setTimeout(shoot, index * 70);
    showToast('Rapid Volley · 3연사');
  }
}
function collectLoot() {
  const nearby = state.loot.filter((item) => item.position.distanceTo(player.position) < 2.5);
  nearby.forEach((item) => { state.inventory.push(item.userData.item); scene.remove(item); state.loot.splice(state.loot.indexOf(item), 1); });
  if (nearby.length) { renderInventory(); updateUI(); showToast(`${nearby.length}개 아이템 획득`); }
}
function gameOver() { state.dead = true; document.exitPointerLock?.(); $('gameOver').classList.add('game-over-open'); }
function spawnEnemy() {
  if (state.dead || state.enemies.filter((enemy) => enemy.userData.alive).length >= 6) return;
  const angle = Math.random() * Math.PI * 2;
  const distance = 8 + Math.random() * 4;
  createEnemy(Math.random() > 0.5 ? 'Forest Stalker' : 'Thorn Witch', new THREE.Vector3(player.position.x + Math.cos(angle) * distance, 0, player.position.z + Math.sin(angle) * distance), Math.random() > 0.5);
  showToast('숲에서 적이 나타났습니다');
}

function update(dt) {
  if (state.dead) return;
  let moveX = 0, moveZ = 0;
  if (keys.w || keys.ArrowUp) moveZ -= 1;
  if (keys.s || keys.ArrowDown) moveZ += 1;
  if (keys.a || keys.ArrowLeft) moveX -= 1;
  if (keys.d || keys.ArrowRight) moveX += 1;
  if (moveX || moveZ) {
    const length = Math.hypot(moveX, moveZ);
    const speed = stats().speed * dt;
    moveX /= length; moveZ /= length;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    player.position.addScaledVector(right, moveX * speed);
    player.position.addScaledVector(forward, -moveZ * speed);
  }
  player.position.x = Math.max(-12, Math.min(12, player.position.x));
  player.position.z = Math.max(-10, Math.min(10, player.position.z));
  state.stamina = Math.min(state.maxStamina, state.stamina + dt * 18);
  state.enemies.forEach((enemy) => {
    const data = enemy.userData;
    if (!data.alive) return;
    const distance = enemy.position.distanceTo(player.position);
    if (data.ranged) {
      enemy.lookAt(player.position.x, 0, player.position.z);
      data.cooldown -= dt;
      if (data.cooldown <= 0 && distance < 14) { data.cooldown = data.boss ? 1.4 : 2.4; const direction = player.position.clone().sub(enemy.position).normalize(); const shot = mesh(new THREE.SphereGeometry(0.16, 8, 8), mat(0xd84a66, 0.2, 1)); shot.position.copy(enemy.position); shot.position.y = 0.8; shot.userData = { velocity: direction.multiplyScalar(6), life: 4, damage: data.boss ? 20 : 10, hostile: true }; scene.add(shot); state.projectiles.push(shot); }
    } else if (distance > 1.7) { enemy.lookAt(player.position.x, 0, player.position.z); enemy.translateZ(data.speed * dt); }
    else { state.hp -= dt * (data.boss ? 12 : 6); }
  });
  state.projectiles = state.projectiles.filter((projectile) => { const data = projectile.userData; projectile.position.addScaledVector(data.velocity, dt); data.life -= dt; let keep = data.life > 0; if (data.hostile && projectile.position.distanceTo(camera.getWorldPosition(new THREE.Vector3())) < 0.7) { state.hp -= data.damage; keep = false; } state.enemies.forEach((enemy) => { const torso = enemy.position.clone(); torso.y = 0.9; if (!data.hostile && enemy.userData.alive && projectile.position.distanceTo(torso) < 1.2) { enemy.userData.hp -= data.damage; keep = false; if (enemy.userData.hp <= 0) defeat(enemy); } }); if (!keep) scene.remove(projectile); return keep; });
  state.loot.forEach((item) => { item.rotation.y += dt * 1.8; item.position.y = 0.55 + Math.sin(performance.now() * 0.003 + item.userData.phase) * 0.12; });
  if (state.hp <= 0) { state.hp = 0; gameOver(); }
  updateUI();
}
let previous = performance.now();
function loop(now) { const dt = Math.min(0.05, (now - previous) / 1000); previous = now; update(dt); renderer.render(scene, camera); requestAnimationFrame(loop); }
requestAnimationFrame(loop);

renderer.domElement.addEventListener('click', () => renderer.domElement.requestPointerLock?.());
renderer.domElement.addEventListener('mousedown', shoot);
document.addEventListener('mousemove', (event) => { if (document.pointerLockElement !== renderer.domElement) return; state.yaw -= event.movementX * 0.0025; player.rotation.y = state.yaw; });
document.addEventListener('keydown', (event) => { keys[event.key] = true; if (event.key.toLowerCase() === 'm') { $('drawer').classList.toggle('open'); document.exitPointerLock?.(); } if (event.key.toLowerCase() === 'f') collectLoot(); if (event.key.toLowerCase() === 'q') useSkill(); });
document.addEventListener('keyup', (event) => { keys[event.key] = false; });
$('bagBtn').onclick = () => { $('drawer').classList.add('open'); document.exitPointerLock?.(); };
$('closeBtn').onclick = () => $('drawer').classList.remove('open');
$('skillBtn').onclick = useSkill;
$('restartBtn').onclick = () => location.reload();
setInterval(spawnEnemy, 12000);
state.stats = { power: 24, agility: 10, vitality: 18 };
updateUI();
renderInventory();
addLog('Kael entered the Mirewood Basin');
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
