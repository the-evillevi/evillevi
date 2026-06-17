import { Suspense, memo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { cn } from "@/lib/utils";

import CubeCat from "@/components/affogato/CubeCat";

import type { TimerState } from "@/lib/affogato/types";

function LoadingFallback() {
	return (
		<div
			className="grid h-full w-full place-items-center"
			aria-label="Loading 3D scene"
		>
			<div className="grid grid-cols-3 gap-1">
				{Array.from({ length: 5 }, (_, i) => (
					<div key={i} className="block size-2 border bg-primary" />
				))}
			</div>
		</div>
	);
}

function VoxelFallback({ compact = false }: { compact?: boolean }) {
	return (
		<div
			className={cn(
				"bg-card grid place-items-center overflow-hidden border",
				compact ? "h-full w-full border-0 bg-transparent" : "voxel-shadow h-48 w-full rounded-lg",
			)}
			aria-label="Loading voxel placeholder"
		>
			<div className="grid grid-cols-3 gap-1">
				{Array.from({ length: compact ? 5 : 9 }, (_, index) => (
					<span
						key={index}
						className={cn(
							"bg-primary block border",
							compact ? "size-2" : "size-4",
							index % 3 === 0 && "bg-accent",
						)}
					/>
				))}
			</div>
		</div>
	);
}

const TimerScene = memo(function TimerScene({ timer }: { timer: TimerState }) {
	return (
		<Suspense fallback={<LoadingFallback />}>
			<Canvas camera={{ position: [0, 2, 5], fov: 50 }} dpr={[1, 1.5]} shadows>
				<ambientLight intensity={1.2} />
				<directionalLight position={[2, 4, 3]} intensity={2.5} castShadow />
				<OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2} />
				<CubeCat timer={timer} />
			</Canvas>
		</Suspense>

	);
});

export default TimerScene;
