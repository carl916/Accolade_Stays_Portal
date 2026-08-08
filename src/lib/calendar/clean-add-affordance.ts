export type CleanAddAffordanceVariant = "full" | "compact";

export function getCleanAddAffordanceVariant(args: {
  dayCleanCount: number;
  weekMaxCleanCount: number;
}): CleanAddAffordanceVariant {
  const visibleCleanCapacity = Math.max(1, args.weekMaxCleanCount);

  return args.dayCleanCount < visibleCleanCapacity ? "full" : "compact";
}
