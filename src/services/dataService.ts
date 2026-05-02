import type { StabilityModule } from "../types";

import modulesData from "../data/modules.json";

/**
 * Returns all stability modules defined in `src/data/modules.json`.
 */
export function getStabilityModules(): StabilityModule[] {
  return modulesData as StabilityModule[];
}
