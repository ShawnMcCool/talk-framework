import * as THREE from 'three';

export function createContactShadow(scene, { groundY = -2.5, startY = 8 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(0,0,0,0.7)');
  gradient.addColorStop(0.5, 'rgba(0,0,0,0.3)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  const geometry = new THREE.PlaneGeometry(3, 1.2);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = groundY + 0.01;
  scene.add(mesh);

  const range = startY - groundY;

  return {
    update(textY) {
      const proximity = 1 - Math.max(0, Math.min(1, (textY - groundY) / range));
      mesh.material.opacity = proximity * 0.6;
      mesh.scale.set(1 + (1 - proximity) * 0.8, 1 + (1 - proximity) * 0.8, 1);
    },
    reset() {
      mesh.material.opacity = 0.6;
      mesh.scale.set(1, 1, 1);
    },
    dispose() {
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}

export function createShockwavePool(scene, { groundY = -2.5, color = 0x44bbff, poolSize = 4 } = {}) {
  const rings = [];
  for (let i = 0; i < poolSize; i++) {
    const geometry = new THREE.RingGeometry(0.8, 1.0, 32);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = groundY + 0.02;
    mesh.scale.set(0, 0, 0);
    scene.add(mesh);
    rings.push({ mesh, material, geometry, active: false, elapsed: 0, duration: 500, intensity: 1 });
  }

  return {
    trigger(intensity = 1) {
      const ring = rings.find(r => !r.active);
      if (!ring) return;
      ring.active = true;
      ring.elapsed = 0;
      ring.intensity = intensity;
      ring.mesh.scale.set(0.01, 0.01, 0.01);
      ring.material.opacity = 0.6 * intensity;
    },
    update(dt) {
      for (const ring of rings) {
        if (!ring.active) continue;
        ring.elapsed += dt * 1000;
        const t = Math.min(1, ring.elapsed / ring.duration);
        const scale = t * 3 * ring.intensity;
        ring.mesh.scale.set(scale, scale, scale);
        ring.material.opacity = (1 - t) * 0.6 * ring.intensity;
        if (t >= 1) {
          ring.active = false;
          ring.mesh.scale.set(0, 0, 0);
          ring.material.opacity = 0;
        }
      }
    },
    reset() {
      for (const ring of rings) {
        ring.active = false;
        ring.mesh.scale.set(0, 0, 0);
        ring.material.opacity = 0;
      }
    },
    dispose() {
      for (const ring of rings) {
        scene.remove(ring.mesh);
        ring.geometry.dispose();
        ring.material.dispose();
      }
    },
  };
}

export function createDustParticles(scene, { groundY = -2.5, color = 0xff9944, poolSize = 20 } = {}) {
  const particles = [];
  const geometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);

  for (let i = 0; i < poolSize; i++) {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    scene.add(mesh);
    particles.push({ mesh, material, vx: 0, vy: 0, vz: 0, active: false, elapsed: 0, lifetime: 600 });
  }

  return {
    trigger(count = 12, intensity = 1) {
      let spawned = 0;
      for (const p of particles) {
        if (spawned >= count) break;
        if (p.active) continue;
        p.active = true;
        p.elapsed = 0;
        p.mesh.visible = true;
        p.material.opacity = 0.8 * intensity;
        p.mesh.position.set(
          (Math.random() - 0.5) * 1.5,
          groundY + 0.1,
          (Math.random() - 0.5) * 0.5,
        );
        const angle = Math.random() * Math.PI * 2;
        const speed = (1 + Math.random() * 3) * intensity;
        p.vx = Math.cos(angle) * speed;
        p.vy = 2 + Math.random() * 3 * intensity;
        p.vz = Math.sin(angle) * speed * 0.3;
        spawned++;
      }
    },
    update(dt) {
      for (const p of particles) {
        if (!p.active) continue;
        p.elapsed += dt * 1000;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.vy -= 15 * dt;
        const t = Math.min(1, p.elapsed / p.lifetime);
        p.material.opacity = (1 - t) * 0.8;
        if (t >= 1) {
          p.active = false;
          p.mesh.visible = false;
          p.material.opacity = 0;
        }
      }
    },
    reset() {
      for (const p of particles) {
        p.active = false;
        p.mesh.visible = false;
        p.material.opacity = 0;
      }
    },
    dispose() {
      geometry.dispose();
      for (const p of particles) {
        scene.remove(p.mesh);
        p.material.dispose();
      }
    },
  };
}

export function createCameraShake(camera) {
  let shaking = false;
  let elapsed = 0;
  const duration = 120;
  const maxOffset = 0.08;
  const baseX = camera.position.x;
  const baseY = camera.position.y;

  return {
    trigger() {
      shaking = true;
      elapsed = 0;
    },
    update(dt) {
      if (!shaking) return;
      elapsed += dt * 1000;
      const t = Math.min(1, elapsed / duration);
      const decay = 1 - t;
      camera.position.x = baseX + (Math.random() - 0.5) * maxOffset * decay;
      camera.position.y = baseY + (Math.random() - 0.5) * maxOffset * decay;
      if (t >= 1) {
        shaking = false;
        camera.position.x = baseX;
        camera.position.y = baseY;
      }
    },
    reset() {
      shaking = false;
      camera.position.x = baseX;
      camera.position.y = baseY;
    },
    isActive() {
      return shaking;
    },
  };
}
