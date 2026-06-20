import { useGLTF } from "@react-three/drei";

const MODEL_PATHS = [
  "/models/animal-penguin.glb",
  "/models/animal-parrot.glb",
  "/models/animal-giraffe.glb",
  "/models/animal-koala.glb",
  "/models/animal-polar.glb",
  "/models/animal-monkey.glb",
  "/models/animal-lion.glb",
  "/models/animal-fox.glb",
  "/models/animal-pig.glb",
  "/models/animal-hog.glb",
  "/models/animal-panda.glb",
  "/models/animal-tiger.glb",
  "/models/animal-crab.glb",
  "/models/animal-cow.glb",
  "/models/animal-caterpillar.glb",
  "/models/animal-bee.glb",
  "/models/animal-elephant.glb",
  "/models/animal-fish.glb",
  "/models/animal-dog.glb",
  "/models/animal-chick.glb",
  "/models/animal-beaver.glb",
  "/models/animal-deer.glb",
  "/models/animal-cat.glb",
  "/models/animal-bunny.glb",
];

function ModelLogger({ path }: { path: string }) {
  const { animations } = useGLTF(path);
  const modelName = path.replace("/models/", "").replace(".glb", "");
  console.log(`Model: ${modelName}, Animations: [${animations.map((a) => a.name).join(", ")}]`);
  return null;
}

export default function VoxelPlaceholder() {
  return MODEL_PATHS.map((path) => <ModelLogger key={path} path={path} />);
}
