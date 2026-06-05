import { Float, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { cn } from "@/lib/utils";

function VoxelBeanStack() {
  const beans = [
    [-0.8, -0.3, 0],
    [-0.25, -0.15, 0.2],
    [0.35, -0.25, -0.1],
    [0.9, -0.05, 0.1],
    [-0.05, 0.32, -0.18],
  ] as const;

  return (
    <Float speed={1.4} rotationIntensity={0.28} floatIntensity={0.45}>
      <group rotation={[0.2, -0.45, 0.08]}>
        {beans.map(([x, y, z], index) => (
          <mesh key={`${x}-${y}-${z}`} position={[x, y, z]} scale={[0.45, 0.28, 0.32]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color={index % 2 === 0 ? "#8f4d25" : "#c17838"}
              roughness={0.72}
            />
          </mesh>
        ))}
        <mesh position={[0, -0.7, -0.05]} scale={[1.8, 0.16, 1]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#f1c36c" roughness={0.7} />
        </mesh>
      </group>
    </Float>
  );
}

export function VoxelPlaceholder({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden",
        compact
          ? "h-full w-full bg-transparent"
          : "bg-card voxel-shadow h-48 w-full rounded-lg border",
        className,
      )}
      aria-label="Voxel art placeholder"
    >
      <Canvas camera={{ position: [0, 1.1, 4.2], fov: 42 }}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 5, 4]} intensity={1.7} />
        <VoxelBeanStack />
        <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.8} />
      </Canvas>
    </div>
  );
}
