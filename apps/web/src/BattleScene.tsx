import React, { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { HERO_ARTWORK } from "./art/heroes";
import { HeroArtwork } from "./HeroArtwork";
import {
  BattleBackdrop,
  BattleEffects,
  battleRegion,
} from "./BattleAtmosphere";
import { HEROES, type Fighter, type PublicBattle } from "@loa/shared";
function Model({
  fighter,
  x,
  enemy,
  tick,
}: {
  fighter: Fighter;
  x: number;
  enemy?: boolean;
  tick: number;
}) {
  const ref = useRef<Group>(null);
  const phase = useRef(0);
  const previous = useRef(tick);
  const color = enemy
    ? (fighter.color ?? "#9b5968")
    : (HEROES.find((h) => h.id === fighter.heroId)?.color ?? "#d9ad62");
  useFrame((state, dt) => {
    if (previous.current !== tick) {
      phase.current = 0.6;
      previous.current = tick;
    }
    phase.current = Math.max(0, phase.current - dt);
    if (ref.current) {
      ref.current.position.x =
        x + (enemy ? -1 : 1) * Math.sin((phase.current / 0.6) * Math.PI) * 0.35;
      ref.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.035;
      ref.current.rotation.z =
        fighter.hp <= 0
          ? (enemy ? 1 : -1) * 1.2
          : Math.sin(phase.current * 10) * 0.08;
    }
  });
  return (
    <group
      ref={ref}
      position={[x, 0, 0]}
      rotation={[0, enemy ? -0.35 : 0.35, 0]}
      scale={enemy && fighter.boss ? 1.15 : 1}
    >
      <group
        visible={
          !(enemy && ["beast", "plant", "spirit"].includes(fighter.model ?? ""))
        }
      >
        <mesh position={[0, 2.05, 0]}>
          <sphereGeometry args={[0.45, 10, 8]} />
          <meshToonMaterial color={enemy ? "#6b4355" : "#eed4b3"} />
        </mesh>
        <mesh position={[0, 2.31, -0.04]}>
          <sphereGeometry args={[0.46, 10, 6, 0, Math.PI * 2, 0, 1.6]} />
          <meshToonMaterial color={color} />
        </mesh>
        <mesh position={[0, 1.25, 0]}>
          <boxGeometry args={[0.75, 0.85, 0.48]} />
          <meshToonMaterial color={color} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh position={[side * 0.23, 0.42, 0]}>
              <boxGeometry args={[0.28, 0.8, 0.34]} />
              <meshToonMaterial color="#303d57" />
            </mesh>
            <mesh
              position={[side * 0.5, 1.25, 0]}
              rotation={[0, 0, side * 0.15]}
            >
              <boxGeometry args={[0.24, 0.75, 0.28]} />
              <meshToonMaterial color={color} />
            </mesh>
            <mesh position={[side * 0.15, 2.08, 0.41]}>
              <sphereGeometry args={[0.055, 6, 6]} />
              <meshBasicMaterial color={enemy ? "#ffbd69" : "#252c3d"} />
            </mesh>
          </group>
        ))}
        <mesh position={[0.68, 1.3, 0.12]} rotation={[0, 0, -0.25]}>
          <boxGeometry args={[0.12, 1.2, 0.1]} />
          <meshToonMaterial color="#ccd5df" />
        </mesh>
      </group>
      {enemy && fighter.model === "beast" && (
        <group>
          <mesh position={[0, 1, 0]}>
            <boxGeometry args={[1.05, 0.65, 0.85]} />
            <meshToonMaterial color={color} />
          </mesh>
          <mesh position={[0, 1.55, 0.25]}>
            <sphereGeometry args={[0.48, 8, 6]} />
            <meshToonMaterial color={color} />
          </mesh>
          {[-1, 1].map((side) => (
            <group key={side}>
              <mesh position={[side * 0.3, 2, 0.2]}>
                <coneGeometry args={[0.17, 0.5, 4]} />
                <meshToonMaterial color={color} />
              </mesh>
              {[-1, 1].map((z) => (
                <mesh key={z} position={[side * 0.38, 0.4, z * 0.28]}>
                  <boxGeometry args={[0.23, 0.8, 0.24]} />
                  <meshToonMaterial color="#303849" />
                </mesh>
              ))}
              <mesh position={[side * 0.17, 1.6, 0.67]}>
                <sphereGeometry args={[0.06, 6, 6]} />
                <meshBasicMaterial color="#ffca75" />
              </mesh>
            </group>
          ))}
        </group>
      )}
      {enemy && fighter.model === "plant" && (
        <group>
          <mesh position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.2, 0.4, 1.6, 6]} />
            <meshToonMaterial color="#65503d" />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh
              key={i}
              position={[
                Math.cos(i * 1.26) * 0.45,
                1.7 + Math.sin(i) * 0.18,
                Math.sin(i * 1.26) * 0.35,
              ]}
              scale={[1, 0.55, 1]}
            >
              <sphereGeometry args={[0.55, 6, 5]} />
              <meshToonMaterial color={color} />
            </mesh>
          ))}
          <mesh position={[0, 1.8, 0.5]}>
            <sphereGeometry args={[0.22, 8, 6]} />
            <meshToonMaterial color="#e1bd73" />
          </mesh>
        </group>
      )}
      {enemy && fighter.model === "spirit" && (
        <group>
          <mesh position={[0, 1.35, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.6, 1.3, 8]} />
            <meshToonMaterial color={color} transparent opacity={0.75} />
          </mesh>
          <mesh position={[0, 2, 0]}>
            <sphereGeometry args={[0.5, 10, 8]} />
            <meshToonMaterial color={color} transparent opacity={0.85} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.18, 2, 0.45]}>
              <sphereGeometry args={[0.07, 6, 6]} />
              <meshBasicMaterial color="#ffecc5" />
            </mesh>
          ))}
        </group>
      )}
      {enemy &&
        fighter.model === "demon" &&
        [-1, 1].map((side) => (
          <mesh
            key={side}
            position={[side * 0.3, 2.6, 0]}
            rotation={[0, 0, side * -0.3]}
          >
            <coneGeometry args={[0.17, 0.65, 5]} />
            <meshToonMaterial color="#d7bd91" />
          </mesh>
        ))}
      {enemy &&
        fighter.model === "guardian" &&
        [-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.56, 1.65, 0]}>
            <boxGeometry args={[0.4, 0.45, 0.65]} />
            <meshToonMaterial color="#d2b478" />
          </mesh>
        ))}
      {fighter.shield > 0 && (
        <mesh position={[0, 1.25, 0]}>
          <sphereGeometry args={[1.15, 12, 8]} />
          <meshBasicMaterial
            color="#83cafa"
            transparent
            opacity={0.12}
            wireframe
          />
        </mesh>
      )}
    </group>
  );
}
class SceneBoundary extends React.Component<
  {
    children: React.ReactNode;
    fallback: React.ReactNode;
    onFailure?: () => void;
  },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure?.();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}
export default function BattleScene({
  battle,
  floor,
}: {
  battle: PublicBattle;
  floor: number;
}) {
  const [mode, setMode] = useState(
    () => localStorage.getItem("loa-graphics") ?? "3d",
  );
  const [supported] = useState(hasWebGL);
  const [sceneFailed, setSceneFailed] = useState(false);
  const can3D = supported && !sceneFailed;
  const hero = battle.party[battle.activeHero],
    enemy = battle.enemies[battle.activeEnemy];
  const [artFailures, setArtFailures] = useState<Record<string, boolean>>({});
  const hasHeroArt =
    !!HERO_ARTWORK[hero.heroId as keyof typeof HERO_ARTWORK] &&
    !artFailures[hero.id];
  const attack = battle.logs
    .filter((l) => l.actor === hero.id && l.kind === "attack")
    .at(-1);
  const damage = battle.logs
    .filter(
      (l) =>
        l.target === hero.id &&
        (l.amount ?? 0) > 0 &&
        (l.kind === "attack" || l.kind === "status"),
    )
    .at(-1);
  const sprite = hasHeroArt ? (
    <div
      className={`sd-actor ${attack?.turn === battle.turn ? "attacking" : ""}`}
      key={`${hero.id}:${attack?.id ?? 0}`}
    >
      <div
        className={`sd-damage ${damage?.turn === battle.turn ? "hit" : ""}`}
        key={damage?.id ?? 0}
      >
        <HeroArtwork
          key={hero.id}
          heroId={hero.heroId as import("@loa/shared").HeroId}
          fallback={<span>⚔</span>}
          onUnavailable={() =>
            setArtFailures((prev) => ({ ...prev, [hero.id]: true }))
          }
        />
      </div>
    </div>
  ) : (
    <span>⚔</span>
  );
  const fallback = (
    <div className="battle-fallback">
      <div>
        {sprite}
        <strong>{hero.name}</strong>
      </div>
      <b>VS</b>
      <div>
        <span>♜</span>
        <strong>{enemy.name}</strong>
      </div>
    </div>
  );
  return (
    <div className="scene-wrapper">
      <BattleBackdrop floor={floor} boss={!!enemy.boss} />
      <button
        className="scene-quality"
        onClick={() => {
          const next = mode === "3d" ? "2d" : "3d";
          setMode(next);
          if (next === "3d") setSceneFailed(false);
          localStorage.setItem("loa-graphics", next);
        }}
      >
        {mode === "3d" && can3D ? "3D · 저사양 모드로" : "2D · 3D 모드로"}
      </button>
      {mode === "3d" && can3D ? (
        <SceneBoundary
          fallback={fallback}
          onFailure={() => setSceneFailed(true)}
        >
          <Canvas
            dpr={[1, 1.25]}
            camera={{ position: [0, 3.1, 6.6], fov: 43 }}
            onCreated={({ camera }) => camera.lookAt(0, 1, 0)}
          >
            <ambientLight intensity={1.7} />
            <directionalLight position={[3, 6, 4]} intensity={2.5} />
            <pointLight position={[-3, 3, -2]} color="#6e9dff" intensity={20} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
              <circleGeometry args={[3.2, 32]} />
              <meshToonMaterial color={battleRegion(floor).floor} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
              <ringGeometry args={[2.7, 2.74, 32]} />
              <meshBasicMaterial color="#b79760" />
            </mesh>
            {!hasHeroArt && (
              <Model
                key={hero.id}
                fighter={hero}
                x={-1.4}
                tick={
                  battle.logs
                    .filter((l) => l.actor === hero.id && l.kind === "attack")
                    .at(-1)?.id ?? 0
                }
              />
            )}
            <Model
              key={enemy.id}
              fighter={enemy}
              x={1.4}
              enemy
              tick={
                battle.logs
                  .filter((l) => l.actor === enemy.id && l.kind === "attack")
                  .at(-1)?.id ?? 0
              }
            />
          </Canvas>
        </SceneBoundary>
      ) : (
        fallback
      )}
      {hasHeroArt && mode === "3d" && can3D && (
        <div className="sd-battle-overlay" data-hero={hero.id}>
          {sprite}
        </div>
      )}
      <BattleEffects battle={battle} />
      {!can3D && (
        <small className="scene-caption">
          이 기기에서는 2D 전투 표시를 사용합니다.
        </small>
      )}
    </div>
  );
}
