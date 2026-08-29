"use client";

import { useEffect, useState } from "react";
import { Check, Cloud, Copy, KeyRound, RefreshCw } from "lucide-react";

import { useHydration } from "@/components/hydration-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CLOUD_SYNC_LAST_AT_KEY,
  CLOUD_SYNC_STORAGE_KEY,
  decodeCloudSyncKey,
  encodeCloudSyncKey,
  type CloudSyncCredentials,
} from "@/lib/cloud-sync";

function readCredentials(): CloudSyncCredentials | null {
  try {
    const stored = window.localStorage.getItem(CLOUD_SYNC_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<CloudSyncCredentials>;
    if (!parsed.runId || !parsed.token) return null;
    return { runId: parsed.runId, token: parsed.token };
  } catch {
    return null;
  }
}

function formatLastSync(value: string | null) {
  if (!value) return "ยังไม่ได้ซิงก์";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "พร้อมซิงก์";
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  }).format(date);
}

export function CloudSyncCard() {
  const { state, replaceState } = useHydration();
  const [credentials, setCredentials] = useState<CloudSyncCredentials | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [restoreKey, setRestoreKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      setCredentials(readCredentials());
      setLastSync(window.localStorage.getItem(CLOUD_SYNC_LAST_AT_KEY));
    };

    refresh();
    window.addEventListener("drink-warner:cloud-sync", refresh);
    return () => window.removeEventListener("drink-warner:cloud-sync", refresh);
  }, []);

  async function startCloudBackup(snapshot = state) {
    const response = await fetch("/api/cloud-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", state: snapshot }),
    });
    const data = await response.json();
    if (!response.ok || !data.runId || !data.token) {
      throw new Error(data.error || "เปิดการสำรองข้อมูลไม่สำเร็จ");
    }

    const next = { runId: data.runId as string, token: data.token as string };
    window.localStorage.setItem(CLOUD_SYNC_STORAGE_KEY, JSON.stringify(next));
    window.localStorage.setItem(CLOUD_SYNC_LAST_AT_KEY, new Date().toISOString());
    setCredentials(next);
    setLastSync(new Date().toISOString());
    window.dispatchEvent(new Event("drink-warner:cloud-sync"));
    return next;
  }

  async function enableBackup() {
    setBusy(true);
    setMessage(null);
    try {
      await startCloudBackup();
      setMessage("สำรองข้อมูลบนคลาวด์เรียบร้อยแล้ว");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "เปิดการสำรองข้อมูลไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function copyKey() {
    if (!credentials) return;
    const key = encodeCloudSyncKey(credentials);
    await navigator.clipboard.writeText(key);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function restore() {
    const decoded = decodeCloudSyncKey(restoreKey);
    if (!decoded) {
      setMessage("คีย์กู้คืนไม่ถูกต้อง");
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/cloud-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "restore",
          runId: decoded.runId,
          token: decoded.token,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.state) {
        throw new Error(data.error || "กู้คืนข้อมูลไม่สำเร็จ");
      }

      replaceState(data.state);
      await startCloudBackup(data.state);
      setRestoreKey("");
      setMessage("กู้คืนข้อมูลสำเร็จ และสร้างคีย์สำรองใหม่แล้ว");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "กู้คืนข้อมูลไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-7 rounded-3xl border border-border/80 p-4" aria-labelledby="cloud-sync-title">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
          <Cloud className="size-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="cloud-sync-title" className="text-sm font-semibold">สำรองข้อมูลบนคลาวด์</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            เก็บเป้าหมาย ประวัติการดื่ม และการตั้งค่าไว้สำหรับกู้คืนเมื่อเปลี่ยนเครื่อง
          </p>
        </div>
      </div>

      {credentials ? (
        <div className="mt-4 rounded-2xl bg-secondary/60 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-foreground">ซิงก์อัตโนมัติเปิดอยู่</p>
              <p className="mt-1 text-[11px] text-muted-foreground">ล่าสุด {formatLastSync(lastSync)}</p>
            </div>
            <Check className="size-4 text-primary" />
          </div>

          <Button variant="outline" className="mt-3 w-full rounded-xl" onClick={copyKey}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "คัดลอกแล้ว" : "คัดลอกคีย์กู้คืน"}
          </Button>
          <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
            เก็บคีย์นี้ไว้เป็นส่วนตัว ผู้ที่มีคีย์สามารถกู้คืนข้อมูลชุดนี้ได้
          </p>
        </div>
      ) : (
        <Button className="mt-4 w-full rounded-xl" onClick={enableBackup} disabled={busy}>
          <Cloud className="size-4" />
          {busy ? "กำลังเปิด..." : "เปิดการสำรองข้อมูล"}
        </Button>
      )}

      <div className="my-4 h-px bg-border" />

      <div className="flex items-center gap-2">
        <KeyRound className="size-4 text-primary" />
        <p className="text-xs font-semibold">กู้คืนจากคีย์</p>
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={restoreKey}
          onChange={(event) => setRestoreKey(event.target.value.trim())}
          placeholder="วางคีย์กู้คืน"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <Button variant="secondary" size="icon" onClick={restore} disabled={busy || !restoreKey} aria-label="กู้คืนข้อมูล">
          <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {message ? <p className="mt-3 text-xs leading-5 text-muted-foreground" role="status">{message}</p> : null}
    </section>
  );
}
