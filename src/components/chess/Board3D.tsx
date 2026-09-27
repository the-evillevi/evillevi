import { Component, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { Shape, Vector2, type PerspectiveCamera } from "three";
import { coordinate, type Color, type Piece, type State } from "@/lib/chess/engine";

class BoardBoundary extends Component<
  { children: ReactNode; onFailure?: () => void },
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
    return this.state.failed ? (
      <div className="chess-canvas-fallback">
        3D view unavailable. You can play every move using the board controls below.
      </div>
    ) : (
      this.props.children
    );
  }
}
const heights = { pawn: 0.53, rook: 0.64, knight: 0.75, bishop: 0.8, queen: 0.87, king: 0.98 };
function ChessPiece({
  piece,
  selected,
  onSelect,
}: {
  piece: Piece;
  selected: boolean;
  onSelect: (square: string) => void;
}) {
  const [f, r, l] = coordinate(piece.square),
    height = heights[piece.type];
  const color = piece.color === "white" ? "#eee6d6" : "#34332f";
  const outline = piece.color === "white" ? "#b9ae98" : "#171816";
  const profile = useMemo(
    () => [
      new Vector2(0, 0),
      new Vector2(0.28, 0),
      new Vector2(0.3, 0.065),
      new Vector2(0.28, 0.13),
      new Vector2(0.19, 0.16),
      new Vector2(0.12, height * 0.35),
      new Vector2(0.1, height * 0.65),
      new Vector2(0.2, height * 0.72),
      new Vector2(0.18, height * 0.79),
      new Vector2(0, height * 0.79),
    ],
    [height],
  );
  const knight = useMemo(() => {
    const s = new Shape();
    s.moveTo(-0.17, 0);
    s.lineTo(0.18, 0);
    s.lineTo(0.19, 0.19);
    s.lineTo(0.04, 0.33);
    s.lineTo(0.18, 0.38);
    s.lineTo(0.2, 0.54);
    s.lineTo(0.03, 0.62);
    s.lineTo(-0.1, 0.76);
    s.lineTo(-0.13, 0.53);
    s.lineTo(-0.22, 0.27);
    s.closePath();
    return s;
  }, []);
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta < 5) onSelect(piece.square);
  };
  return (
    <group
      position={[f - 3.5, l * 3.65 + 0.08, 3.5 - r]}
      onClick={click}
      rotation={[0, piece.color === "white" ? 0 : Math.PI, 0]}
    >
      <mesh castShadow receiveShadow>
        <latheGeometry args={[profile, 24]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.12} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <torusGeometry args={[0.265, 0.018, 6, 32]} />
        <meshStandardMaterial color={outline} />
      </mesh>
      {piece.type === "pawn" && (
        <mesh position={[0, height, 0]} castShadow>
          <sphereGeometry args={[0.16, 20, 16]} />
          <meshStandardMaterial color={color} roughness={0.35} />
        </mesh>
      )}
      {piece.type === "knight" && (
        <mesh position={[0, 0.25, -0.095]} castShadow>
          <extrudeGeometry
            args={[
              knight,
              {
                depth: 0.19,
                bevelEnabled: true,
                bevelSegments: 2,
                steps: 1,
                bevelSize: 0.025,
                bevelThickness: 0.025,
              },
            ]}
          />
          <meshStandardMaterial color={color} roughness={0.35} />
        </mesh>
      )}
      {piece.type === "bishop" && (
        <group position={[0, height, 0]}>
          <mesh castShadow scale={[0.7, 1.2, 0.7]}>
            <sphereGeometry args={[0.19, 20, 16]} />
            <meshStandardMaterial color={color} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.03, 0.125]} rotation={[0, 0, -0.45]}>
            <boxGeometry args={[0.022, 0.19, 0.045]} />
            <meshStandardMaterial color={outline} />
          </mesh>
        </group>
      )}
      {piece.type === "rook" && (
        <group position={[0, height, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.23, 0.19, 0.2, 20]} />
            <meshStandardMaterial color={color} roughness={0.35} />
          </mesh>
          {Array.from({ length: 6 }, (_, i) => (
            <mesh
              key={i}
              position={[
                Math.cos((i * Math.PI) / 3) * 0.18,
                0.14,
                Math.sin((i * Math.PI) / 3) * 0.18,
              ]}
            >
              <boxGeometry args={[0.12, 0.12, 0.12]} />
              <meshStandardMaterial color={color} />
            </mesh>
          ))}
        </group>
      )}
      {piece.type === "queen" && (
        <group position={[0, height, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.22, 0.12, 0.18, 20]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {Array.from({ length: 7 }, (_, i) => (
            <mesh
              key={i}
              position={[
                Math.cos((i * Math.PI * 2) / 7) * 0.17,
                0.15,
                Math.sin((i * Math.PI * 2) / 7) * 0.17,
              ]}
            >
              <sphereGeometry args={[0.048, 8, 8]} />
              <meshStandardMaterial color={color} />
            </mesh>
          ))}
        </group>
      )}
      {piece.type === "king" && (
        <group position={[0, height + 0.08, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.09, 0.35, 0.09]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0, 0.06, 0]} castShadow>
            <boxGeometry args={[0.28, 0.08, 0.09]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      )}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
          <ringGeometry args={[0.33, 0.42, 32]} />
          <meshBasicMaterial color="#b5cc83" />
        </mesh>
      )}
    </group>
  );
}
export interface BoardProps {
  state: State;
  selected: string;
  targets: string[];
  onSelect: (square: string) => void;
  orientation: Color;
  level: number | null;
  lastMove?: { from: string; to: string };
  cameraKey: number;
  pending?: string;
  checked?: string;
  onCancel?: () => void;
  onFailure?: () => void;
}
function ResponsiveCamera({
  level,
  orientation,
  cameraKey,
}: Pick<BoardProps, "level" | "orientation" | "cameraKey">) {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    const perspective = camera as PerspectiveCamera;
    // Preserve horizontal space for all three boards on portrait screens.
    perspective.fov =
      (2 *
        Math.atan(Math.tan((39 * Math.PI) / 360) * Math.max(1, 0.94 / (size.width / size.height))) *
        180) /
      Math.PI;
    const side = orientation === "white" ? 1 : -1;
    perspective.position.set(
      side * (level === null ? 12 : 8),
      level === null ? 14 : level * 3.65 + 10,
      side * (level === null ? 18 : 12),
    );
    perspective.lookAt(0, level === null ? 3.4 : level * 3.65, 0);
    perspective.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, invalidate, level, orientation, cameraKey]);
  return null;
}
function ContextLossHandler({ onFailure }: { onFailure?: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      onFailure?.();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    // Three intentionally loses the context on unmount; that is not a graphics failure.
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, onFailure]);
  return null;
}
export function Board3D(props: BoardProps) {
  const [keyboardSquare, setKeyboardSquare] = useState("1a1"),
    [keyboardFocus, setKeyboardFocus] = useState(false);
  useEffect(() => {
    if (props.level !== null) setKeyboardSquare((s) => `${props.level! + 1}${s.slice(1)}`);
  }, [props.level]);
  const [supported, setSupported] = useState<boolean | null>(null);
  useEffect(() => {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    setSupported(Boolean(gl));
    if (!gl) props.onFailure?.();
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  }, []);
  if (supported === null) return <div className="chess-canvas-fallback">Preparing the board…</div>;
  if (!supported)
    return (
      <div className="chess-canvas-fallback" role="status">
        3D graphics are unavailable in this browser. Use the move controls and accessible 2D board
        below to play.
      </div>
    );
  return (
    <div
      className="chess-three-viewport"
      tabIndex={0}
      role="group"
      aria-label={`3D board keyboard navigation: ${keyboardSquare}. Arrow keys move, Enter or Space selects, Escape cancels. Page Up and Page Down change level in All levels view.`}
      onFocus={() => setKeyboardFocus(true)}
      onBlur={() => setKeyboardFocus(false)}
      onKeyDown={(e) => {
        const [f, r, l] = coordinate(keyboardSquare),
          direction = props.orientation === "white" ? 1 : -1;
        const delta = {
          ArrowLeft: [-direction, 0, 0],
          ArrowRight: [direction, 0, 0],
          ArrowUp: [0, direction, 0],
          ArrowDown: [0, -direction, 0],
          PageUp: [0, 0, 1],
          PageDown: [0, 0, -1],
        }[e.key];
        if (delta) {
          e.preventDefault();
          const nextLevel = props.level ?? Math.max(0, Math.min(2, l + delta[2]));
          setKeyboardSquare(
            `${nextLevel + 1}${String.fromCharCode(97 + Math.max(0, Math.min(7, f + delta[0])))}${Math.max(0, Math.min(7, r + delta[1])) + 1}`,
          );
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          props.onSelect(keyboardSquare);
        } else if (e.key === "Escape") {
          e.preventDefault();
          props.onCancel?.();
        }
      }}
    >
      {keyboardFocus && (
        <span className="chess-keyboard-hint">
          {keyboardSquare} · Arrows to navigate · Enter to select · Esc to cancel
        </span>
      )}
      <BoardBoundary onFailure={props.onFailure}>
        <Suspense fallback={<div className="chess-canvas-fallback">Preparing the board…</div>}>
          <Canvas
            key={props.cameraKey}
            shadows
            frameloop="demand"
            dpr={[1, 1.6]}
            camera={{
              position: props.orientation === "white" ? [12, 14, 18] : [-12, 14, -18],
              fov: 39,
              near: 0.1,
              far: 100,
            }}
            aria-label="Interactive three-level chess board. Equivalent move controls follow below."
            fallback={
              <div className="chess-canvas-fallback">
                Use the move controls below to play without WebGL.
              </div>
            }
          >
            <ContextLossHandler onFailure={props.onFailure} />
            <ResponsiveCamera
              level={props.level}
              orientation={props.orientation}
              cameraKey={props.cameraKey}
            />
            <ambientLight intensity={1.25} />
            <hemisphereLight args={["#fff4dd", "#697466", 1.2]} />
            <directionalLight
              position={[5, 16, 9]}
              intensity={2.5}
              castShadow
              shadow-mapSize={[1024, 1024]}
              shadow-camera-left={-10}
              shadow-camera-right={10}
              shadow-camera-top={14}
              shadow-camera-bottom={-10}
              shadow-normalBias={0.04}
            />
            {[0, 1, 2]
              .filter((l) => props.level === null || l === props.level)
              .map((l) => (
                <group key={l}>
                  <mesh position={[0, l * 3.65 - 0.07, 0]} receiveShadow>
                    <boxGeometry args={[8.28, 0.18, 8.28]} />
                    <meshStandardMaterial color="#44483e" roughness={0.65} />
                  </mesh>
                  {Array.from({ length: 64 }, (_, i) => {
                    const f = i % 8,
                      r = Math.floor(i / 8),
                      cell = `${l + 1}${String.fromCharCode(97 + f)}${r + 1}`,
                      target = props.targets.includes(cell),
                      last = props.lastMove?.from === cell || props.lastMove?.to === cell;
                    return (
                      <group key={cell} position={[f - 3.5, l * 3.65 + 0.03, 3.5 - r]}>
                        <mesh
                          receiveShadow
                          onClick={(e) => {
                            e.stopPropagation();
                            if (e.delta < 5) props.onSelect(cell);
                          }}
                        >
                          <boxGeometry args={[0.985, 0.055, 0.985]} />
                          <meshStandardMaterial
                            color={
                              props.selected === cell
                                ? "#d3bc69"
                                : last
                                  ? "#b5bb76"
                                  : (f + r) % 2 === 0
                                    ? "#77916c"
                                    : "#e4dfcf"
                            }
                            roughness={0.8}
                          />
                        </mesh>
                        {((keyboardFocus && keyboardSquare === cell) ||
                          props.pending === cell ||
                          props.checked === cell ||
                          props.selected === cell ||
                          last) && (
                          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.065, 0]}>
                            <ringGeometry
                              args={[
                                props.selected === cell ? 0.36 : 0.43,
                                props.selected === cell ? 0.41 : 0.48,
                                4,
                                1,
                                Math.PI / 4,
                              ]}
                            />
                            <meshBasicMaterial
                              color={
                                keyboardFocus && keyboardSquare === cell
                                  ? "#245cc6"
                                  : props.checked === cell
                                    ? "#b3202c"
                                    : props.pending === cell
                                      ? "#255eb3"
                                      : props.selected === cell
                                        ? "#614912"
                                        : "#607132"
                              }
                            />
                          </mesh>
                        )}
                        {target && (
                          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
                            {props.state.pieces.some((p) => p.square === cell) ||
                            (props.state.enPassant?.target === cell &&
                              props.state.pieces.some(
                                (p) => p.square === props.selected && p.type === "pawn",
                              )) ? (
                              <ringGeometry args={[0.34, 0.43, 32]} />
                            ) : (
                              <circleGeometry args={[0.135, 24]} />
                            )}
                            <meshBasicMaterial color="#263d22" transparent opacity={0.8} />
                          </mesh>
                        )}
                      </group>
                    );
                  })}
                  <Html position={[-4.6, l * 3.65, 4.3]} center style={{ pointerEvents: "none" }}>
                    <span className="chess-level-label">{l + 1}</span>
                  </Html>
                  {Array.from({ length: 8 }, (_, i) => (
                    <Html
                      key={`rank-${i}`}
                      position={[-4.35, l * 3.65, 3.5 - i]}
                      center
                      style={{ pointerEvents: "none" }}
                    >
                      <span className="chess-coordinate">{i + 1}</span>
                    </Html>
                  ))}
                  {Array.from({ length: 8 }, (_, i) => (
                    <Html
                      key={i}
                      position={[i - 3.5, l * 3.65, 4.35]}
                      center
                      style={{ pointerEvents: "none" }}
                    >
                      <span className="chess-coordinate">{String.fromCharCode(97 + i)}</span>
                    </Html>
                  ))}
                </group>
              ))}
            {props.state.pieces
              .filter((p) => props.level === null || coordinate(p.square)[2] === props.level)
              .map((p) => (
                <ChessPiece
                  key={p.id}
                  piece={p}
                  selected={props.selected === p.square}
                  onSelect={props.onSelect}
                />
              ))}
            <OrbitControls
              key={`${props.orientation}-${props.cameraKey}`}
              makeDefault
              target={[0, props.level === null ? 3.4 : props.level * 3.65, 0]}
              minDistance={props.level === null ? 11 : 8}
              maxDistance={40}
              minPolarAngle={0.22}
              maxPolarAngle={Math.PI / 2.05}
              enableDamping={false}
            />
          </Canvas>
        </Suspense>
      </BoardBoundary>
    </div>
  );
}
