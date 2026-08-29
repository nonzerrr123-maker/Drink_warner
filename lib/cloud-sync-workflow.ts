import { createHook } from "workflow";

import type { HydrationState } from "@/lib/hydration";

export type HydrationSyncEvent =
  | { type: "update"; state: HydrationState }
  | { type: "restore" };

export async function hydrationCloudSyncWorkflow(
  initialState: HydrationState,
  token: string,
) {
  "use workflow";

  let state = initialState;
  const updates = createHook<HydrationSyncEvent>({
    token: `hydration-sync:${token}`,
  });

  for await (const event of updates) {
    if (event.type === "update") {
      state = event.state;
      continue;
    }

    if (event.type === "restore") {
      return state;
    }
  }

  return state;
}
