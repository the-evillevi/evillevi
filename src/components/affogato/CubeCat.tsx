import { useEffect, useRef } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";

import type { TimerState } from "@/lib/affogato/types";

enum Animation {
	Static = "static",
	Idle = "idle",
	Walk = "walk",
	Run = "run",
	Eat = "eat",
	Dance = "dance",
	GesturePositive = "gesture-positive",
	GestureNegative = "gesture-negative",
}

interface CubeCatProps {
	position?: [number, number, number];
	scale?: number;
	timer: TimerState;
}

export default function CubeCat({ position = [0, 0, 0], scale = 1.5, timer }: CubeCatProps) {
	const { scene, animations } = useGLTF("/models/animal-cat.glb");
	const { actions } = useAnimations(animations, scene);

	const currentAction = useRef<(typeof actions)[string] | null>(null);

	useEffect(() => {
		useGLTF.preload("/models/animal-cat.glb");
	}, []);

	useEffect(() => {
		const key = timer.status === "running"
			? timer.mode === "pomodoro" ? Animation.Run : Animation.Dance
			: Animation.Idle;
		const next = actions[key];
		if (!next || next === currentAction.current) return;

		currentAction.current?.fadeOut(0.3);
		next.reset().fadeIn(0.3).play();
		currentAction.current = next;
	}, [timer.status, actions]);

	return <primitive object={scene} position={position} scale={scale} />;
}
