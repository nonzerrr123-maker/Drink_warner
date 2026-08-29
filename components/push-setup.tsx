"use client";

import { useEffect, useState } from "react";
import { BellRing, Check, Download, Send, Share2 } from "lucide-react";

import { useHydration } from "@/components/hydration-provider";
import { Button } from "@/components/ui/button";
import {
  getHydrationPushContext,
  getPushConfigSignature,
  PUSH_CONFIG_STORAGE_KEY,
  PUSH_RUN_STORAGE_KEY,
  VAPID_KEYS_STORAGE_KEY,
  type PushSubscriptionPayload,
  type VapidKeys,
} from "@/lib/push";

function base64UrlToBytes(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

function bytesToBase64Url(bytes: Uint8Array) {
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

function applicationServerKey(value: string) {
  const bytes = base64UrlToBytes(value);
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function readVapidKeys() {
  try {
    const stored = window.localStorage.getItem(VAPID_KEYS_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<VapidKeys>;
    if (!parsed.publicKey || !parsed.privateKey) return null;
    return parsed as VapidKeys;
  } catch {
    return null;
  }
}

async function createVapidKeys(): Promise<VapidKeys> {
  const pair = (await window.crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;

  const [publicJwk, privateJwk] = await Promise.all([
    window.crypto.subtle.exportKey("jwk", pair.publicKey),
    window.crypto.subtle.exportKey("jwk", pair.privateKey),
  ]);

  if (!publicJwk.x || !publicJwk.y || !privateJwk.d) {
    throw new Error("สร้าง key สำหรับ Web Push ไม่สำเร็จ");
  }

  const x = base64UrlToBytes(publicJwk.x);
  const y = base64UrlToBytes(publicJwk.y);
  const publicBytes = new Uint8Array(65);
  publicBytes[0] = 4;
  publicBytes.set(x, 1);
  publicBytes.set(y, 33);

  const vapid = {
    publicKey: bytesToBase64Url(publicBytes),
    privateKey: privateJwk.d,
  };

  window.localStorage.setItem(VAPID_KEYS_STORAGE_KEY, JSON.stringify(vapid));
  return vapid;
}

function subscriptionPayload(subscription: PushSubscription): PushSubscriptionPayload {
  const json = subscription.toJSON();
  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime,
    keys: {
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
    },
  };
}

async function currentSubscription() {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export function PushSetup() {
  const { state } = useHydration();
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [hasSubscription, setHasSubscription] = useState(false);
  const [hasSchedule, setHasSchedule] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      nav.standalone === true;
    const pushSupported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window &&
      Boolean(window.crypto?.subtle);

    setIsIos(ios);
    setIsStandalone(standalone);
    setSupported(pushSupported);
    setPermission(
      "Notification" in window ? Notification.permission : "unsupported",
    );
    setHasSchedule(Boolean(window.localStorage.getItem(PUSH_RUN_STORAGE_KEY)));

    if (pushSupported) {
      currentSubscription()
        .then((subscription) => setHasSubscription(Boolean(subscription)))
        .catch(() => setHasSubscription(false));
    }
  }, []);

  async function ensureSubscription() {
    let vapid = readVapidKeys();
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (subscription && !vapid) {
      await subscription.unsubscribe();
      subscription = null;
    }

    if (!vapid) vapid = await createVapidKeys();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey(vapid.publicKey),
      });
    }

    return { vapid, subscription };
  }

  async function syncSchedule() {
    if (!supported) return;
    if (isIos && !isStandalone) {
      setMessage("บน iPhone ต้องติดตั้งลงหน้าจอโฮมก่อน จึงจะเปิด Web Push ได้");
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const result =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        setMessage("ยังไม่ได้อนุญาต Notification บนอุปกรณ์นี้");
        return;
      }

      const { vapid, subscription } = await ensureSubscription();
      setHasSubscription(true);

      const now = new Date();
      const previousRunId = window.localStorage.getItem(PUSH_RUN_STORAGE_KEY);
      const response = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "schedule",
          subscription: subscriptionPayload(subscription),
          vapid,
          reminders: state.reminders,
          hydration: getHydrationPushContext(state, now),
          timezone:
            Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Bangkok",
          previousRunId,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "ตั้งการแจ้งเตือนไม่สำเร็จ");

      window.localStorage.setItem(
        PUSH_CONFIG_STORAGE_KEY,
        getPushConfigSignature(state, now),
      );

      if (data.runId) {
        window.localStorage.setItem(PUSH_RUN_STORAGE_KEY, data.runId);
        setHasSchedule(true);
        setMessage("บันทึก Smart Reminder บนเครื่องนี้แล้ว");
      } else {
        window.localStorage.removeItem(PUSH_RUN_STORAGE_KEY);
        setHasSchedule(false);
        setMessage("ปิดตารางการเตือนบนเครื่องนี้แล้ว");
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "ตั้งการแจ้งเตือนไม่สำเร็จ",
      );
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setMessage(null);
    try {
      const vapid = readVapidKeys();
      const subscription = await currentSubscription();
      if (!subscription || !vapid) {
        throw new Error("ยังไม่ได้เปิด Web Push บนเครื่องนี้");
      }

      const response = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          subscription: subscriptionPayload(subscription),
          vapid,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "ส่งทดสอบไม่สำเร็จ");
      }
      setMessage("ส่งแจ้งเตือนทดสอบแล้ว ลองดู Notification Center ได้เลย");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ส่งทดสอบไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function disablePush() {
    setBusy(true);
    setMessage(null);
    try {
      const previousRunId = window.localStorage.getItem(PUSH_RUN_STORAGE_KEY);
      await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", previousRunId }),
      });

      const subscription = await currentSubscription();
      await subscription?.unsubscribe();

      window.localStorage.removeItem(PUSH_RUN_STORAGE_KEY);
      window.localStorage.removeItem(PUSH_CONFIG_STORAGE_KEY);
      window.localStorage.removeItem(VAPID_KEYS_STORAGE_KEY);
      setHasSubscription(false);
      setHasSchedule(false);
      setMessage("ยกเลิก Web Push บนเครื่องนี้แล้ว");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ยกเลิก Push ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return (
      <section className="rounded-2xl border border-border p-4">
        <p className="text-sm font-semibold">Web Push</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          เบราว์เซอร์หรืออุปกรณ์นี้ยังไม่รองรับ Web Push
        </p>
      </section>
    );
  }

  return (
    <section
      className="rounded-2xl border border-border p-4"
      aria-labelledby="push-title"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
          <BellRing className="size-4" />
        </div>
        <div>
          <h2 id="push-title" className="text-sm font-semibold">
            Smart Reminder
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Dewy จะดูเป้าหมายและน้ำที่บันทึกล่าสุดก่อนเตือน พร้อมเว้นรอบเมื่อคุณเพิ่งดื่มหรือครบเป้าแล้ว
          </p>
        </div>
      </div>

      {isIos && !isStandalone ? (
        <div className="mt-4 rounded-2xl bg-secondary/65 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Download className="size-4 text-primary" />
            ติดตั้งบน iPhone ก่อน
          </div>
          <ol className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
            <li>1. เปิดลิงก์นี้ใน Safari</li>
            <li className="flex items-center gap-1.5">
              2. แตะปุ่ม <Share2 className="size-3.5" /> แชร์
            </li>
            <li>3. เลือก “เพิ่มไปยังหน้าจอโฮม”</li>
            <li>4. เปิด Drink Warner จากไอคอนที่หน้าจอโฮม แล้วกลับมาหน้านี้</li>
          </ol>
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-muted px-3 py-2.5 text-xs">
            <span className="text-muted-foreground">สถานะบนเครื่องนี้</span>
            <span className="flex items-center gap-1 font-medium text-foreground">
              {hasSchedule && permission === "granted" ? (
                <>
                  <Check className="size-3.5 text-primary" /> พร้อมเตือน
                </>
              ) : hasSubscription ? (
                "Push พร้อม"
              ) : (
                "ยังไม่เปิด"
              )}
            </span>
          </div>

          <Button className="mt-3 w-full" onClick={syncSchedule} disabled={busy}>
            {hasSubscription
              ? "อัปเดต Smart Reminder"
              : "เปิด Smart Reminder บนเครื่องนี้"}
          </Button>

          {hasSubscription && permission === "granted" ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={sendTest} disabled={busy}>
                <Send className="size-4" /> ทดสอบ
              </Button>
              <Button variant="outline" onClick={disablePush} disabled={busy}>
                ยกเลิก Push
              </Button>
            </div>
          ) : null}
        </>
      )}

      {message ? (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{message}</p>
      ) : null}
    </section>
  );
}
