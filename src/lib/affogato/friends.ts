export type Friend = {
  id: string;
  name: string;
  modelPath: string;
  /** Bean cost to unlock. Tuned to the 1-bean/minute economy: a 25-minute
   *  focus session earns ~25 beans. */
  cost: number;
};

const friend = (id: string, name: string, cost: number): Friend => ({
  id,
  name,
  cost,
  modelPath: `/models/animal-${id}.glb`,
});

export const STARTER_FRIEND_ID = "cat";

export const FRIENDS: Friend[] = [
  // Starter
  friend("cat", "Cat", 0),
  // Common — a solid afternoon of focus
  friend("bunny", "Bunny", 50),
  friend("chick", "Chick", 50),
  friend("dog", "Dog", 50),
  friend("pig", "Pig", 50),
  friend("fish", "Fish", 50),
  friend("cow", "Cow", 50),
  friend("caterpillar", "Caterpillar", 50),
  // Uncommon — a couple of days of sessions
  friend("fox", "Fox", 120),
  friend("koala", "Koala", 120),
  friend("penguin", "Penguin", 120),
  friend("crab", "Crab", 120),
  friend("bee", "Bee", 120),
  friend("beaver", "Beaver", 120),
  friend("deer", "Deer", 120),
  friend("hog", "Hog", 120),
  friend("parrot", "Parrot", 120),
  // Rare — a week of steady focus
  friend("lion", "Lion", 250),
  friend("tiger", "Tiger", 250),
  friend("elephant", "Elephant", 250),
  friend("panda", "Panda", 250),
  friend("polar", "Polar Bear", 250),
  friend("monkey", "Monkey", 250),
  friend("giraffe", "Giraffe", 250),
];

const byId = new Map(FRIENDS.map((entry) => [entry.id, entry]));

export function isFriendId(value: unknown): value is string {
  return typeof value === "string" && byId.has(value);
}

/** Unknown ids resolve to the starter so a bad selection can never break the scene. */
export function getFriend(id: string): Friend {
  return byId.get(id) ?? byId.get(STARTER_FRIEND_ID)!;
}
