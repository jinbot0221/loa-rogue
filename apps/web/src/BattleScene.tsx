import React, { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group } from "three";
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
    ? "#9b5968"
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
          <mesh position={[side * 0.5, 1.25, 0]} rotation={[0, 0, side * 0.15]}>
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
  { children: React.ReactNode; fallback: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
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
export default function BattleScene({ battle }: { battle: PublicBattle }) {
  const [mode, setMode] = useState(
    () => localStorage.getItem("loa-graphics") ?? "3d",
  );
  const [supported] = useState(hasWebGL);
  const hero = battle.party[battle.activeHero],
    enemy = battle.enemies[battle.activeEnemy];
  const fallback = (
    <div className="battle-fallback">
      <div>
        <span>⚔</span>
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
      <button
        className="scene-quality"
        onClick={() => {
          const next = mode === "3d" ? "2d" : "3d";
          setMode(next);
          localStorage.setItem("loa-graphics", next);
        }}
      >
        {mode === "3d" && supported ? "3D · 저사양 모드로" : "2D · 3D 모드로"}
      </button>
      {mode === "3d" && supported ? (
        <SceneBoundary fallback={fallback}>
          <Canvas
            dpr={[1, 1.25]}
            camera={{ position: [0, 3.1, 6.6], fov: 43 }}
            onCreated={({ camera }) => camera.lookAt(0, 1, 0)}
          >
            <color attach="background" args={["#111a2a"]} />
            <ambientLight intensity={1.7} />
            <directionalLight position={[3, 6, 4]} intensity={2.5} />
            <pointLight position={[-3, 3, -2]} color="#6e9dff" intensity={20} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
              <circleGeometry args={[3.2, 32]} />
              <meshToonMaterial color="#293750" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
              <ringGeometry args={[2.7, 2.74, 32]} />
              <meshBasicMaterial color="#b79760" />
            </mesh>
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
      {!supported && (
        <small className="scene-caption">
          이 기기에서는 2D 전투 표시를 사용합니다.
        </small>
      )}
    </div>
  );
}
