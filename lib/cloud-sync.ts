export type CloudSyncCredentials = {
  runId: string;
  token: string;
};

export const CLOUD_SYNC_STORAGE_KEY = "drink-warner:cloud-sync:v1";
export const CLOUD_SYNC_LAST_AT_KEY = "drink-warner:cloud-sync:last-at:v1";

export function encodeCloudSyncKey(credentials: CloudSyncCredentials) {
  const json = JSON.stringify(credentials);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window
    .btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function decodeCloudSyncKey(value: string): CloudSyncCredentials | null {
  try {
    const normalized = value.trim().replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
    const binary = window.atob(normalized + padding);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Partial<CloudSyncCredentials>;
    if (!parsed.runId || !parsed.token) return null;
    return { runId: parsed.runId, token: parsed.token };
  } catch {
    return null;
  }
}
