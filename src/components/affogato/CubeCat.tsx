import { useEffect, useRef } from "react";
import { LoopOnce } from "three";
import { useGLTF, useAnimations, Float } from "@react-three/drei";

//import { useGameStore } from "@/lib/affogato/store";

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
	position?: [number, number, number],
	scale?: number,
	timer?: TimerState,
}

export default function CubeCat({ position = [0, 0, 0], scale = 1.5, timer }: CubeCatProps) {
	const { scene, animations } = useGLTF("/models/animal-cat.glb");
	const { actions } = useAnimations(animations, scene);

	/*
	 const timerMode = useGameStore(s => s.timerMode);
	 const pendingOneShot = useGameStore(s => s.pendingOneShot)
	 const clearOneShot = useGameStore(s => s.clearOneShot)
	 * */

	const currentAction = useRef<(typeof actions)[string] | null>(null);

	useEffect(() => {
		const next = actions["walk"];
		if (!next || next == currentAction.current) return

		currentAction.current?.fadeOut(0.3);
		next.reset().fadeIn(0.3).play();
		currentAction.current = next
	}, [/*timer*/, actions]);

	useEffect(() => {
		const oneShot = actions["walk"];
		if (!oneShot) return;

		const clipDuration = oneShot.getClip().duration * 1000

		currentAction.current?.fadeOut(0.2);
		oneShot.setLoop(LoopOnce, 1);
		oneShot.clampWhenFinished = true;
		oneShot.reset().fadeIn(0.2).play();

		const timeout = setTimeout(() => {
			oneShot.fadeOut(0.3);
			const back = actions["walk"];
			back?.reset().fadeIn(0.3).play();
			currentAction.current = back ?? null;
		}, clipDuration);

		return clearTimeout(timeout)
	}, [actions, /*timer*/]);

	return (
		<Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.4}>
			<primitive object={scene} position={position} scale={scale} />
		</Float>
	);
};

useGLTF.preload('/models/animal-cat.glb')
