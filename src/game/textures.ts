import * as THREE from 'three';

export interface ProceduralTextureSet {
  wood: THREE.CanvasTexture;
  ice: THREE.CanvasTexture;
  stone: THREE.CanvasTexture;
  grass: THREE.CanvasTexture;
  bark: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const anisotropy = Math.min(8, Math.max(1, maxAnisotropy));

  // 1. Wood grain plank texture
  const [woodCanvas, wCtx] = makeCanvas(256, 256);
  wCtx.fillStyle = '#c4813b';
  wCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 42; i++) {
    const y = (i / 42) * 256;
    wCtx.fillStyle = i % 2 === 0 ? 'rgba(92, 48, 16, 0.16)' : 'rgba(235, 178, 108, 0.14)';
    wCtx.fillRect(0, y, 256, 3 + (i % 4));
  }
  // Wood plank border & nail rivets
  wCtx.strokeStyle = 'rgba(72, 36, 12, 0.55)';
  wCtx.lineWidth = 8;
  wCtx.strokeRect(4, 4, 248, 248);
  wCtx.fillStyle = 'rgba(54, 28, 12, 0.65)';
  for (const [nx, ny] of [[20, 20], [236, 20], [20, 236], [236, 236]]) {
    wCtx.beginPath();
    wCtx.arc(nx, ny, 5, 0, Math.PI * 2);
    wCtx.fill();
  }
  const wood = finalizeTexture(woodCanvas, anisotropy);

  // 2. Ice / Glass block texture
  const [iceCanvas, iCtx] = makeCanvas(256, 256);
  const iceGrad = iCtx.createLinearGradient(0, 0, 256, 256);
  iceGrad.addColorStop(0, '#bae6fd');
  iceGrad.addColorStop(0.5, '#7dd3fc');
  iceGrad.addColorStop(1, '#38bdf8');
  iCtx.fillStyle = iceGrad;
  iCtx.fillRect(0, 0, 256, 256);
  // Diagonal crystal highlights
  iCtx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  iCtx.beginPath();
  iCtx.moveTo(20, 0);
  iCtx.lineTo(75, 0);
  iCtx.lineTo(0, 75);
  iCtx.lineTo(0, 20);
  iCtx.closePath();
  iCtx.fill();
  iCtx.beginPath();
  iCtx.moveTo(110, 0);
  iCtx.lineTo(145, 0);
  iCtx.lineTo(0, 145);
  iCtx.lineTo(0, 110);
  iCtx.closePath();
  iCtx.fill();
  iCtx.strokeStyle = 'rgba(240, 249, 255, 0.75)';
  iCtx.lineWidth = 10;
  iCtx.strokeRect(5, 5, 246, 246);
  const ice = finalizeTexture(iceCanvas, anisotropy);

  // 3. Stone ashlar masonry texture
  const [stoneCanvas, sCtx] = makeCanvas(256, 256);
  sCtx.fillStyle = '#8b95a5';
  sCtx.fillRect(0, 0, 256, 256);
  // Subtle mineral speckles
  for (let i = 0; i < 650; i++) {
    const sx = (i * 73) % 256;
    const sy = (i * 139) % 256;
    sCtx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(30,41,59,0.16)';
    sCtx.fillRect(sx, sy, 3 + (i % 4), 3 + ((i + 1) % 3));
  }
  sCtx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
  sCtx.lineWidth = 8;
  sCtx.strokeRect(4, 4, 248, 248);
  // Bevel highlight
  sCtx.strokeStyle = 'rgba(226, 232, 240, 0.35)';
  sCtx.lineWidth = 4;
  sCtx.strokeRect(12, 12, 232, 232);
  const stone = finalizeTexture(stoneCanvas, anisotropy);

  // 4. Lush rolling meadow ground texture
  const [grassCanvas, gCtx] = makeCanvas(512, 512);
  gCtx.fillStyle = '#5ca138';
  gCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1600; i++) {
    const gx = (i * 97) % 512;
    const gy = (i * 193) % 512;
    gCtx.fillStyle =
      i % 3 === 0
        ? 'rgba(132, 204, 22, 0.22)'
        : i % 3 === 1
          ? 'rgba(63, 98, 18, 0.18)'
          : 'rgba(163, 230, 53, 0.14)';
    gCtx.fillRect(gx, gy, 8 + (i % 10), 4 + (i % 6));
  }
  const grass = finalizeTexture(grassCanvas, anisotropy, 28, 28);

  // 6. Slingshot bark texture
  const [barkCanvas, bCtx] = makeCanvas(128, 256);
  bCtx.fillStyle = '#6b3e1e';
  bCtx.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 36; i++) {
    bCtx.fillStyle = i % 2 === 0 ? 'rgba(42, 22, 8, 0.35)' : 'rgba(146, 94, 52, 0.2)';
    bCtx.fillRect((i * 17) % 128, 0, 4 + (i % 5), 256);
  }
  const bark = finalizeTexture(barkCanvas, anisotropy);

  return {
    wood,
    ice,
    stone,
    grass,
    bark,
    dispose: () => {
      wood.dispose();
      ice.dispose();
      stone.dispose();
      grass.dispose();
      bark.dispose();
    },
  };
}
