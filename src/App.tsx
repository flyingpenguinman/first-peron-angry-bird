import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Crosshair,
  Grid2x2,
  RotateCcw,
  Star,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { GameEngine } from './game/GameEngine';
import { LEVELS } from './game/levels';
import { BIRD_CONFIGS, GameHudState } from './game/types';

const INITIAL_HUD: GameHudState = {
  levelIndex: 0,
  levelName: LEVELS[0].name,
  levelSubtitle: LEVELS[0].subtitle,
  phase: 'aiming',
  power: 0.65,
  pitchDeg: 28,
  yawDeg: 0,
  currentBird: LEVELS[0].birds[0],
  birdQueue: [...LEVELS[0].birds],
  birdsLeft: LEVELS[0].birds.length,
  totalBirds: LEVELS[0].birds.length,
  pigsLeft: LEVELS[0].pigs.length,
  totalPigs: LEVELS[0].pigs.length,
  score: 0,
  speedMps: 0,
  altitudeM: 3.5,
  distanceToTargetM: 32,
  boostAvailable: BIRD_CONFIGS[LEVELS[0].birds[0]].abilityName !== null,
  starsEarned: 0,
  unlockedLevels: 8,
  bestScores: {},
  isMuted: false,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [hud, setHud] = useState<GameHudState>(INITIAL_HUD);
  const [showLevelPicker, setShowLevelPicker] = useState(false);
  const [hudCollapsed, setHudCollapsed] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const engine = new GameEngine(
      container,
      (nextState) => setHud(nextState),
      () => setContextLost(true),
    );
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const powerPct = Math.round(hud.power * 100);
  const isAimOrCharge = hud.phase === 'aiming' || hud.phase === 'charging';
  const isInFlight = hud.phase === 'flight';
  const activeBirdCfg = BIRD_CONFIGS[hud.currentBird];

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 text-slate-50">
      {/* Dedicated isolated WebGL canvas container */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
        aria-label="3D Slingshot Arena"
      />

      {/* WebGL fallback if context is unavailable */}
      {contextLost && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center">
          <h1 className="font-display text-2xl font-bold text-white mb-2">
            3D Graphics Context Interrupted
          </h1>
          <p className="text-sm text-slate-300 max-w-md mb-5">
            Your browser paused WebGL rendering. Reload the arena to restore 3D physics and first-person flight.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-semibold text-white transition-colors"
          >
            Reload Game
          </button>
        </div>
      )}

      {/* Top HUD Bar (3 clean zones, zero pill clutter, zero backdrop-blur) */}
      <header className="pointer-events-none absolute top-0 left-0 right-0 z-20 flex items-center justify-between gap-6 px-5 py-3.5">
        {/* Zone 1: Title & Level */}
        <div className="pointer-events-auto flex items-center gap-4 bg-slate-950/85 border border-white/10 rounded-xl px-4 py-2 shadow-lg">
          <span className="font-display text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0">
            Feather Flight FPV
          </span>
          <span className="text-slate-600" aria-hidden="true">|</span>
          <div className="flex items-center gap-2 text-xs text-slate-300 whitespace-nowrap shrink-0">
            <span className="font-semibold text-amber-400 font-mono-nums">
              Level {hud.levelIndex + 1} / {LEVELS.length}
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-100 font-medium">{hud.levelName}</span>
          </div>
        </div>

        {/* Zone 2: Live Counters */}
        <div className="pointer-events-auto hidden md:flex items-center gap-6 bg-slate-950/85 border border-white/10 rounded-xl px-5 py-2 shadow-lg text-xs">
          <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
            <span className="text-slate-400">Birds</span>
            <span className="font-mono-nums text-sm font-bold text-red-400">
              {hud.birdsLeft}/{hud.totalBirds}
            </span>
          </div>
          <span className="text-slate-700" aria-hidden="true">·</span>
          <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
            <span className="text-slate-400">Pigs</span>
            <span className="font-mono-nums text-sm font-bold text-lime-400">
              {hud.pigsLeft}/{hud.totalPigs}
            </span>
          </div>
          <span className="text-slate-700" aria-hidden="true">·</span>
          <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
            <span className="text-slate-400">Score</span>
            <span className="font-mono-nums text-sm font-bold text-white">
              {hud.score.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Zone 3: Primary Controls */}
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/85 border border-white/10 rounded-xl p-1.5 shadow-lg shrink-0">
          <button
            type="button"
            onClick={() => setShowLevelPicker((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Grid2x2 className="w-3.5 h-3.5" />
            <span>Levels</span>
          </button>
          <button
            type="button"
            onClick={() => engineRef.current?.restartLevel()}
            title="Restart Level (R)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={() => engineRef.current?.toggleMute()}
            title={hud.isMuted ? 'Unmute Sound' : 'Mute Sound'}
            aria-label={hud.isMuted ? 'Unmute Sound' : 'Mute Sound'}
            className="p-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            {hud.isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Subtle Level Objective & Current Bird Strip when aiming */}
      {isAimOrCharge && !showLevelPicker && (
        <div className="pointer-events-none absolute top-18 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 text-center">
          <p className="text-xs font-medium text-slate-900 bg-white/85 px-3.5 py-1 rounded-md shadow-sm">
            {hud.levelSubtitle}
          </p>
          <div className="flex items-center gap-2.5 bg-slate-950/85 border border-white/10 rounded-lg px-3.5 py-1 text-xs shadow-md">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: activeBirdCfg.accentHex }}
            />
            <span className="font-semibold text-white">{activeBirdCfg.name}</span>
            <span className="text-slate-500" aria-hidden="true">·</span>
            <span className="text-slate-300">{activeBirdCfg.abilityHint}</span>
            {hud.birdQueue.length > 1 && (
              <>
                <span className="text-slate-500" aria-hidden="true">·</span>
                <span className="text-slate-400">
                  Next: {hud.birdQueue.slice(1).map((t) => BIRD_CONFIGS[t].name.split(' ')[0]).join(' → ')}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* First-Person Flight HUD Reticle & Telemetry */}
      {isInFlight && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
          {/* Center targeting crosshair */}
          <div className="relative flex items-center justify-center">
            <Crosshair className="w-9 h-9 text-white/80 drop-shadow" strokeWidth={1.5} />
          </div>

          {/* Bottom FPV Telemetry Strip */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-slate-950/85 border border-white/15 rounded-xl px-5 py-2.5 shadow-xl text-xs">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-slate-400">Speed</span>
              <span className="font-mono-nums font-bold text-amber-400">{hud.speedMps} m/s</span>
            </div>
            <span className="text-slate-700" aria-hidden="true">·</span>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-slate-400">Altitude</span>
              <span className="font-mono-nums font-bold text-sky-300">{hud.altitudeM} m</span>
            </div>
            <span className="text-slate-700" aria-hidden="true">·</span>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-slate-400">Target</span>
              <span className="font-mono-nums font-bold text-white">{hud.distanceToTargetM} m</span>
            </div>
            {hud.boostAvailable && activeBirdCfg.abilityName && (
              <>
                <span className="text-slate-700" aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => engineRef.current?.triggerMidAirBoost()}
                  className="pointer-events-auto flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{activeBirdCfg.abilityName} (Space)</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 3rd-Person Impact View Action Bar */}
      {hud.phase === 'impact' && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 bg-slate-950/85 border border-white/15 rounded-xl px-5 py-2.5 shadow-xl text-xs">
          <span className="text-slate-300 font-medium whitespace-nowrap">
            3rd-Person Impact View
          </span>
          <span className="text-slate-700" aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => engineRef.current?.skipImpactWait()}
            className="pointer-events-auto px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            Continue (Space)
          </button>
        </div>
      )}

      {/* Unified Bottom Control Dock (Aiming / Hold-to-Charge) */}
      {isAimOrCharge && (
        <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center w-[min(780px,94vw)]">
          <button
            type="button"
            onClick={() => setHudCollapsed((c) => !c)}
            className="pointer-events-auto mb-1.5 flex items-center gap-1 px-3 py-1 rounded-t-lg bg-slate-950/85 border border-b-0 border-white/10 text-[11px] font-medium text-slate-300 hover:text-white cursor-pointer"
          >
            {hudCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Show Launch Controls</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Hide Controls</span>
              </>
            )}
          </button>

          {!hudCollapsed && (
            <div className="pointer-events-auto w-full bg-slate-950/90 border border-white/12 rounded-2xl px-5 py-3.5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Aim Pitch & Yaw Fine Controls */}
              <div className="flex items-center gap-5 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Angle</span>
                  <div className="flex items-center bg-slate-900 border border-white/10 rounded-lg">
                    <button
                      type="button"
                      onClick={() => engineRef.current?.setAim(hud.pitchDeg - 3, hud.yawDeg)}
                      aria-label="Decrease angle"
                      className="p-1.5 text-slate-300 hover:text-white cursor-pointer"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <span className="font-mono-nums text-xs font-bold text-white w-10 text-center">
                      {hud.pitchDeg}°
                    </span>
                    <button
                      type="button"
                      onClick={() => engineRef.current?.setAim(hud.pitchDeg + 3, hud.yawDeg)}
                      aria-label="Increase angle"
                      className="p-1.5 text-slate-300 hover:text-white cursor-pointer"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Turn</span>
                  <div className="flex items-center bg-slate-900 border border-white/10 rounded-lg">
                    <button
                      type="button"
                      onClick={() => engineRef.current?.setAim(hud.pitchDeg, hud.yawDeg - 2)}
                      aria-label="Turn left"
                      className="p-1.5 text-slate-300 hover:text-white cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-mono-nums text-xs font-bold text-white w-10 text-center">
                      {hud.yawDeg > 0 ? `+${hud.yawDeg}°` : `${hud.yawDeg}°`}
                    </span>
                    <button
                      type="button"
                      onClick={() => engineRef.current?.setAim(hud.pitchDeg, hud.yawDeg + 2)}
                      aria-label="Turn right"
                      className="p-1.5 text-slate-300 hover:text-white cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Power Gauge */}
              <div className="flex-1 w-full flex flex-col gap-1.5 min-w-[180px]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">
                    {hud.phase === 'charging' ? 'Charging Slingshot...' : 'Hold SPACE to Charge'}
                  </span>
                  <span className="font-mono-nums font-bold text-amber-400">
                    {powerPct}%
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden border border-white/10">
                  <div
                    className="h-full transition-[width] duration-75 rounded-full"
                    style={{
                      width: `${powerPct}%`,
                      background:
                        powerPct > 85
                          ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                          : 'linear-gradient(90deg, #22c55e, #f59e0b)',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Arrows / WASD or drag to aim</span>
                  <span>Release to fly FPV</span>
                </div>
              </div>

              {/* Hold-to-Charge Button for Mouse/Touch */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  engineRef.current?.startCharging();
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  engineRef.current?.releaseLaunch();
                }}
                onPointerLeave={() => {
                  if (hud.phase === 'charging') {
                    engineRef.current?.releaseLaunch();
                  }
                }}
                className={`px-5 py-3 rounded-xl text-sm font-bold text-white transition-transform active:scale-95 whitespace-nowrap shrink-0 cursor-pointer ${
                  hud.phase === 'charging'
                    ? 'bg-amber-500 text-slate-950 shadow-lg'
                    : 'bg-red-600 hover:bg-red-500 shadow-md'
                }`}
              >
                {hud.phase === 'charging' ? 'Release!' : 'Hold to Launch'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Level Picker Modal */}
      {showLevelPicker && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-2xl max-h-[86vh] flex flex-col bg-slate-900 border border-white/15 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div>
                <h2 className="font-display text-xl font-bold text-white">Select Level</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {LEVELS.length} fortresses · Squad grows from 2 to 6 birds with unique abilities
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLevelPicker(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1">
              {LEVELS.map((lvl, idx) => {
                const best = hud.bestScores[lvl.id] ?? 0;
                const active = idx === hud.levelIndex;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => {
                      engineRef.current?.loadLevel(idx);
                      setShowLevelPicker(false);
                    }}
                    className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                      active
                        ? 'bg-slate-800 border-amber-400/70'
                        : 'bg-slate-950/70 border-white/10 hover:border-white/25 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono-nums text-xs font-semibold text-amber-400">
                        Level {lvl.id}
                      </span>
                      <span className="font-mono-nums text-xs text-slate-400">
                        {best > 0
                          ? `Best ${best.toLocaleString()}`
                          : `${lvl.birds.length} Birds`}
                      </span>
                    </div>
                    <div className="font-display text-base font-bold text-white">
                      {lvl.name}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {lvl.subtitle}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span>Squad:</span>
                      <span className="text-slate-200 truncate">
                        {lvl.birds.map((b) => BIRD_CONFIGS[b].name.split(' ')[0]).join(' · ')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Win / Lose Overlay */}
      {(hud.phase === 'won' || hud.phase === 'lost') && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/15 rounded-2xl p-7 text-center shadow-2xl">
            <p className="text-xs font-semibold text-amber-400 mb-1">
              Level {hud.levelIndex + 1} · {hud.levelName}
            </p>
            <h2 className="font-display text-3xl font-extrabold text-white mb-4">
              {hud.phase === 'won' ? 'Level Cleared!' : 'Out of Birds'}
            </h2>

            {hud.phase === 'won' && (
              <div className="flex items-center justify-center gap-2 mb-5">
                {[1, 2, 3].map((n) => (
                  <Star
                    key={n}
                    className={`w-9 h-9 ${
                      n <= hud.starsEarned
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-700'
                    }`}
                  />
                ))}
              </div>
            )}

            <div className="flex items-center justify-center gap-6 py-3 px-4 rounded-xl bg-slate-950/80 border border-white/10 mb-6 text-sm">
              <div>
                <div className="text-xs text-slate-400">Score</div>
                <div className="font-mono-nums text-lg font-bold text-white">
                  {hud.score.toLocaleString()}
                </div>
              </div>
              <span className="text-slate-700" aria-hidden="true">|</span>
              <div>
                <div className="text-xs text-slate-400">Best</div>
                <div className="font-mono-nums text-lg font-bold text-amber-400">
                  {(hud.bestScores[LEVELS[hud.levelIndex].id] ?? hud.score).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => engineRef.current?.restartLevel()}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-white transition-colors cursor-pointer"
              >
                Play Again
              </button>
              {hud.phase === 'won' && hud.levelIndex < LEVELS.length - 1 && (
                <button
                  type="button"
                  onClick={() => engineRef.current?.nextLevel()}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-semibold text-white transition-colors cursor-pointer"
                >
                  Next Level
                </button>
              )}
              {hud.phase === 'won' && hud.levelIndex === LEVELS.length - 1 && (
                <button
                  type="button"
                  onClick={() => engineRef.current?.loadLevel(0)}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-sm font-bold text-slate-950 transition-colors cursor-pointer"
                >
                  Replay From Level 1
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
