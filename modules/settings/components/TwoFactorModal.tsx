"use client";

import { AeOverlay } from '@/app/components/common/AeModal';
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ShieldCheck, ShieldOff, X, KeyRound, Smartphone,
  Copy, CheckCircle2, ChevronRight, Loader2,
  Eye, EyeOff, AlertTriangle, Mail,
  RefreshCw, Send,
} from "lucide-react";
// 2FA settings are shared with AE Hub: users/{uid}/settings/security in the
// workstation (AE Hub) project, which the workstation server checks at sign-in.
import { authDb as db, auth } from "@/lib/workstation/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { sendStaffOTP, verifyStaffOTP } from "@/lib/workstation/aehub-otp";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Method    = "app" | "otp";
type OtpChannel = "email" | "sms";
type Step =
  | "method-select"
  | "qr" | "verify" | "backup"
  | "otp-send" | "otp-verify"
  | "success"
  | "disable-confirm";

interface TwoFactorModalProps {
  open: boolean;
  onClose: () => void;
  isEnabling: boolean;
  onComplete: (enabled: boolean, method?: Method) => void;
  activeMethod?: Method | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Generate a real base32 TOTP secret */
function createTotp(secret?: string) {
  return new OTPAuth.TOTP({
    issuer: "AE Hub & Workstation",
    label: auth.currentUser?.email ?? "staff",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: secret
      ? OTPAuth.Secret.fromBase32(secret)
      : new OTPAuth.Secret({ size: 20 }),
  });
}

function generateBackupCodes(): string[] {
  return Array.from({ length: 8 }, () => {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    const n = (bytes[0] << 24 | bytes[1] << 16 | bytes[2] << 8 | bytes[3]) >>> 0;
    const s = n.toString(10).padStart(8, "0");
    return `${s.slice(0, 4)}-${s.slice(4)}`;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StepDot({ active, done }: { active: boolean; done: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full transition-all duration-300 ${
      done ? "bg-[#F5BD02]"
           : active ? "bg-[#F5BD02] scale-125 shadow-sm shadow-[#F5BD02]/40"
           : "bg-gray-200 dark:bg-zinc-700"
    }`} />
  );
}

function OtpCountdown({ seconds, total }: { seconds: number; total: number }) {
  const pct = Math.max(0, (seconds / total) * 100);
  const urgent = seconds <= 60;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${urgent ? "bg-red-500" : "bg-[#F5BD02]"}`}
             style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold w-10 text-right ${urgent ? "text-red-500" : "text-gray-500 dark:text-gray-400"}`}>
        {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
      </span>
    </div>
  );
}

function CodeBubbles({ value }: { value: string }) {
  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-zinc-900 rounded-xl border border-[#E0DCC8]/60 dark:border-zinc-800 px-4 py-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className={`w-8 h-10 rounded-lg flex items-center justify-center text-xl font-extrabold border transition-all ${
            value[i]
              ? "bg-[#F5BD02]/10 border-[#F5BD02]/40 text-[#F5BD02]"
              : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-300 dark:text-zinc-600"
          }`}>
            {value[i] || "·"}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function TwoFactorModal({
  open, onClose, isEnabling, onComplete, activeMethod,
}: TwoFactorModalProps) {

  // ── State ────────────────────────────────────────────────────────────────────
  const [step, setStep]           = useState<Step>(isEnabling ? "method-select" : "disable-confirm");
  const [method, setMethod]       = useState<Method>(activeMethod ?? "app");
  const [otpChannel] = useState<OtpChannel>("email");

  // Authenticator App
  const totpRef     = useRef<OTPAuth.TOTP | null>(null);
  const [secret, setSecret]       = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [backupCodes]             = useState(generateBackupCodes);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes]   = useState(false);
  const [showSecret, setShowSecret]     = useState(false);
  const [appCode, setAppCode]           = useState("");
  const [appCodeError, setAppCodeError] = useState("");
  const [totpTimeLeft, setTotpTimeLeft] = useState(30);

  // OTP
  const [otpDestination, setOtpDestination] = useState("");
  const [emailType, setEmailType]           = useState<"official" | "personal">("official");
  const [officialEmail, setOfficialEmail]   = useState("");
  const [personalEmail, setPersonalEmail]   = useState("");
  const [phoneType, setPhoneType]           = useState<"official" | "personal">("official");
  const [officialPhone, setOfficialPhone]   = useState("");
  const [personalPhone, setPersonalPhone]   = useState("");
  const [otpSending, setOtpSending]         = useState(false);
  const [otpCode, setOtpCode]               = useState("");
  const [otpCodeError, setOtpCodeError]     = useState("");
  const [otpTimeLeft, setOtpTimeLeft]       = useState(600);
  const otpIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Shared
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving]       = useState(false);

  // ── Initialise TOTP on open ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    // Deferred one tick so the reset doesn't run synchronously inside the effect.
    const init = setTimeout(() => {

    // Reset all state
    setStep(isEnabling ? "method-select" : "disable-confirm");
    setAppCode(""); setAppCodeError("");
    setOtpCode(""); setOtpCodeError("");
    setOtpSending(false);
    setEmailType("official");
    setVerifying(false); setSaving(false);
    setShowSecret(false);
    setQrDataUrl("");
    setMethod(activeMethod ?? "app");

    // Load official & personal emails and phone numbers
    const defaultEmail = auth.currentUser?.email || "";
    setOfficialEmail(defaultEmail);
    setOtpDestination(defaultEmail);
    setPhoneType("official");

    const uid = auth.currentUser?.uid;
    if (uid) {
      getDoc(doc(db, "users", uid))
        .then((snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const offEmail = data?.email || defaultEmail;
            const persEmail = data?.personalEmail || "";
            const offPhone = data?.officialPhone || data?.phone || data?.phoneNumber || "";
            const persPhone = data?.personalPhone || data?.altPhone || "";

            setOfficialEmail(offEmail);
            setPersonalEmail(persEmail);
            setOfficialPhone(offPhone);
            setPersonalPhone(persPhone);

            if (otpChannel === "email") {
              setOtpDestination(offEmail);
            } else {
              setOtpDestination(offPhone);
            }
          }
        })
        .catch(console.error);

      // Also check stored 2FA method
      getDoc(doc(db, "users", uid, "settings", "security"))
        .then((secSnap) => {
          if (secSnap.exists()) {
            const secData = secSnap.data();
            const currentMethod = secData?.twoFactorMethod || activeMethod || "app";
            const currentDest = secData?.twoFactorOtpDestination || defaultEmail;
            setMethod(currentMethod);
            if (currentDest) setOtpDestination(currentDest);

            // Auto-send OTP when opening disable dialog if OTP method is active
            if (!isEnabling && currentMethod === "otp") {
              sendStaffOTP(currentDest || defaultEmail).catch((e) => {
                console.warn("Auto-send OTP on disable error:", e);
              });
            }
          } else if (!isEnabling && activeMethod === "otp") {
            sendStaffOTP(defaultEmail).catch((e) => {
              console.warn("Auto-send OTP on disable error:", e);
            });
          }
        })
        .catch(console.error);
    }

    // Generate a real TOTP instance
    const totp = createTotp();
    totpRef.current = totp;
    const b32 = totp.secret.base32;
    // Format secret in groups of 4 for display
    const formatted = b32.match(/.{1,4}/g)?.join(" ") ?? b32;
    setSecret(formatted);

    // Generate QR code data URL
    const uri = totp.toString(); // otpauth://totp/...
    QRCode.toDataURL(uri, { width: 200, margin: 1, color: { dark: "#000000", light: "#FFFFFF" } })
      .then(setQrDataUrl)
      .catch(console.error);
    }, 0);
    return () => clearTimeout(init);
  }, [open, isEnabling, activeMethod, otpChannel]);

  // ── TOTP 30s countdown ────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || step !== "verify") return;
    const syncTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = 30 - (now % 30);
      setTotpTimeLeft(remaining);
    };
    syncTimer();
    const id = setInterval(syncTimer, 1000);
    return () => clearInterval(id);
  }, [open, step]);

  // ── OTP 10-minute countdown ───────────────────────────────────────────────
  useEffect(() => {
    const isOtpStep = step === "otp-verify" || (step === "disable-confirm" && (activeMethod === "otp" || method === "otp"));
    if (!open || !isOtpStep) return;
    const reset = setTimeout(() => setOtpTimeLeft(600), 0);
    if (otpIntervalRef.current) clearInterval(otpIntervalRef.current);
    otpIntervalRef.current = setInterval(() => {
      setOtpTimeLeft(t => { if (t <= 1) { clearInterval(otpIntervalRef.current!); return 0; } return t - 1; });
    }, 1000);
    return () => { clearTimeout(reset); if (otpIntervalRef.current) clearInterval(otpIntervalRef.current); };
  }, [open, step, activeMethod, method]);

  // ── Clipboard helpers ─────────────────────────────────────────────────────
  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret.replace(/\s/g, ""));
    setCopiedSecret(true); setTimeout(() => setCopiedSecret(false), 2000);
  };
  const handleCopyCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopiedCodes(true); setTimeout(() => setCopiedCodes(false), 2000);
  };

  // ── OTP: Send via OTP system ───────────────────────────────────────────
  const handleSendOtp = useCallback(async (targetOverride?: string) => {
    const dest = (targetOverride || otpDestination || auth.currentUser?.email || "").trim();
    if (!dest) {
      toast.error(otpChannel === "email" ? "Please enter your email address." : "Please enter your phone number.");
      return;
    }
    setOtpSending(true);
    try {
      await sendStaffOTP(dest);
      if (step === "otp-send") setStep("otp-verify");
      toast.success(`Verification code sent to ${dest}!`, { toastId: "otp-sent" });
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Failed to send code. Please try again.";
      toast.error(msg);
    } finally {
      setOtpSending(false);
    }
  }, [otpChannel, otpDestination, step]);

  // ── Persist to Firestore ──────────────────────────────────────────────────
  const save2FAPreference = useCallback(async (enabled: boolean, meth: Method | null) => {
    setSaving(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Not authenticated");
      const docRef = doc(db, "users", uid, "settings", "security");
      const existing = await getDoc(docRef);
      const base = existing.exists() ? existing.data() : {};
      await setDoc(docRef, {
        ...base,
        twoFactorEnabled: enabled,
        twoFactorMethod: enabled ? meth : null,
        twoFactorOtpChannel: enabled && meth === "otp" ? otpChannel : null,
        twoFactorOtpDestination: enabled && meth === "otp" ? otpDestination : null,
        twoFactorUpdatedAt: new Date().toISOString(),
        ...(enabled && meth === "app"
          ? { twoFactorSecret: secret.replace(/\s/g, ""), backupCodes }
          : { twoFactorSecret: null, backupCodes: [] }),
      });
      if (enabled) {
        sessionStorage.setItem(`aehub_2fa_verified_${uid}`, "true");
      }
      onComplete(enabled, meth ?? undefined);
      toast.success(
        enabled
          ? `2FA enabled via ${meth === "app" ? "Authenticator App" : "OTP"}! ✓`
          : "Two-Factor Authentication disabled."
      );
      if (enabled) setStep("success");
      else onClose();
    } catch (err) {
      console.error("Error saving 2FA:", err);
      toast.error("Failed to update 2FA settings.");
    } finally {
      setSaving(false);
    }
  }, [otpChannel, otpDestination, secret, backupCodes, onComplete, onClose]);

  // ── OTP: Verify via OTP system ─────────────────────────────────────────
  const handleVerifyOtp = useCallback(async () => {
    if (otpCode.length !== 6) { setOtpCodeError("Please enter the 6-digit code."); return; }
    setVerifying(true); setOtpCodeError("");
    try {
      await verifyStaffOTP(otpDestination.trim() || auth.currentUser?.email || "", otpCode);
      await save2FAPreference(true, "otp");
    } catch (err: unknown) {
      setVerifying(false);
      const msg = (err as { message?: string })?.message ?? "Invalid verification code. Please check and try again.";
      setOtpCodeError(msg);
    }
  }, [otpCode, otpDestination, save2FAPreference]);

  // ── App: Verify TOTP locally ──────────────────────────────────────────────
  const handleVerifyApp = useCallback(async () => {
    if (appCode.length !== 6) { setAppCodeError("Please enter a 6-digit code."); return; }
    setVerifying(true); setAppCodeError("");

    const totp = totpRef.current;
    if (!totp) { setVerifying(false); setAppCodeError("TOTP not initialised. Please close and retry."); return; }

    // Validate with ±1 window (accounts for clock drift)
    const delta = totp.validate({ token: appCode, window: 1 });
    await new Promise(r => setTimeout(r, 400)); // brief UX pause

    if (delta !== null) {
      setVerifying(false);
      setStep("backup");
    } else {
      setVerifying(false);
      setAppCodeError("Invalid code. Check your authenticator app and try again.");
    }
  }, [appCode]);

  // ── Disable: verify using whichever method was active ────────────────────
  const handleVerifyDisable = useCallback(async () => {
    const codeVal = appCode.trim();
    if (codeVal.length !== 6) { setAppCodeError("Please enter a 6-digit code."); return; }
    setVerifying(true); setAppCodeError("");

    const resolvedMethod = activeMethod || method || "app";

    if (resolvedMethod === "app") {
      const uid = auth.currentUser?.uid;
      let storedSecret = "";
      if (uid) {
        try {
          const secSnap = await getDoc(doc(db, "users", uid, "settings", "security"));
          if (secSnap.exists()) {
            storedSecret = secSnap.data()?.twoFactorSecret || "";
          }
        } catch (e) {
          console.warn("Could not fetch stored 2FA secret:", e);
        }
      }

      const totp = storedSecret ? createTotp(storedSecret) : totpRef.current;
      const delta = totp ? totp.validate({ token: codeVal, window: 1 }) : null;

      if (delta !== null || (!storedSecret && codeVal.length === 6)) {
        setVerifying(false);
        await save2FAPreference(false, null);
      } else {
        setVerifying(false);
        setAppCodeError("Invalid authenticator code. Check your authenticator app and try again.");
      }
    } else {
      // OTP method — verify against stored Firestore code
      try {
        const dest = otpDestination.trim() || auth.currentUser?.email || "";
        await verifyStaffOTP(dest, codeVal);
        setVerifying(false);
        await save2FAPreference(false, null);
      } catch (err: unknown) {
        setVerifying(false);
        const msg = (err as { message?: string })?.message ?? "Invalid verification code. Please check and try again.";
        setAppCodeError(msg);
      }
    }
  }, [appCode, activeMethod, method, otpDestination, save2FAPreference]);

  // ── Progress dots ─────────────────────────────────────────────────────────
  const appSteps: Step[] = ["method-select", "qr", "verify", "backup", "success"];
  const otpSteps: Step[] = ["method-select", "otp-send", "otp-verify", "success"];
  const activeSteps = method === "app" ? appSteps : otpSteps;
  const stepIndex   = activeSteps.indexOf(step);

  if (!open) return null;

  const isOtpDisable = !isEnabling && (activeMethod === "otp" || method === "otp");

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Dialog */}
      <AeOverlay onClose={onClose} label="Two-Factor Authentication" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div
          className="relative w-full max-w-md bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-2xl border border-[#E0DCC8]/60 dark:border-zinc-800"
          style={{ animation: "tfa-in 0.2s ease-out" }}
          onClick={e => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#E0DCC8]/30 dark:border-zinc-800/80">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isEnabling ? "bg-amber-50 dark:bg-amber-950/20" : "bg-red-50 dark:bg-red-950/20"
              }`}>
                <KeyRound size={16} className={isEnabling ? "text-[#F5BD02]" : "text-red-500"} />
              </div>
              <div>
                <p className="text-sm font-extrabold text-gray-900 dark:text-white leading-tight">
                  {isEnabling ? "Set Up 2FA" : "Disable 2FA"}
                </p>
                {isEnabling && step !== "success" && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    Step {Math.min(stepIndex + 1, activeSteps.length)} of {activeSteps.length}
                  </p>
                )}
              </div>
            </div>

            {/* Dots */}
            {isEnabling && step !== "success" && (
              <div className="flex items-center gap-1.5">
                {activeSteps.slice(0, -1).map((s, i) => (
                  <StepDot key={s} active={s === step} done={i < stepIndex} />
                ))}
              </div>
            )}

            <button onClick={onClose} aria-label="Close modal"
              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* ── Body ── */}
          <div className="p-6">

            {/* ════════════════════════════════════════
                STEP 1: METHOD SELECTION
            ════════════════════════════════════════ */}
            {step === "method-select" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white mb-1">Choose Verification Method</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Select how you want to receive your second-factor security codes.</p>
                </div>

                <div className="space-y-2.5">
                  {/* Option 1: Authenticator App */}
                  <button type="button" onClick={() => setMethod("app")}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 cursor-pointer ${
                      method === "app"
                        ? "border-[#F5BD02] bg-[#F5BD02]/5 dark:bg-[#F5BD02]/10 ring-1 ring-[#F5BD02]"
                        : "border-[#E0DCC8]/60 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900"
                    }`}>
                    <div className={`p-2.5 rounded-xl shrink-0 ${method === "app" ? "bg-[#F5BD02] text-gray-900" : "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400"}`}>
                      <Smartphone size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold text-gray-900 dark:text-white">Authenticator App</span>
                        <span className="text-[10px] font-bold text-[#b08800] bg-[#F5BD02]/15 px-2 py-0.5 rounded-full">Recommended</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Use Google Authenticator, Authy, Microsoft Authenticator, or 1Password.</p>
                    </div>
                  </button>

                  {/* Option 2: OTP (Email / SMS) */}
                  <button type="button" onClick={() => setMethod("otp")}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 cursor-pointer ${
                      method === "otp"
                        ? "border-[#F5BD02] bg-[#F5BD02]/5 dark:bg-[#F5BD02]/10 ring-1 ring-[#F5BD02]"
                        : "border-[#E0DCC8]/60 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900"
                    }`}>
                    <div className={`p-2.5 rounded-xl shrink-0 ${method === "otp" ? "bg-[#F5BD02] text-gray-900" : "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400"}`}>
                      <Mail size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold text-gray-900 dark:text-white">Email / Phone OTP</span>
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">Direct Delivery</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Receive a unique one-time password code on your official/personal email or phone.</p>
                    </div>
                  </button>
                </div>

                <button onClick={() => setStep(method === "app" ? "qr" : "otp-send")}
                  className="w-full mt-2 bg-[#F5BD02] hover:bg-[#d8a310] text-gray-900 font-extrabold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm shadow-[#F5BD02]/20 cursor-pointer">
                  Continue <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* ════════════════════════════════════════
                APP FLOW — STEP 2: QR CODE
            ════════════════════════════════════════ */}
            {step === "qr" && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white mb-1">Scan with Authenticator App</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Open Google Authenticator, 1Password, or Authy and scan the QR code below.</p>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 bg-white rounded-2xl border border-gray-200 shadow-inner flex items-center justify-center">
                    {qrDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qrDataUrl} alt="2FA QR Code" width={180} height={180} className="rounded-lg" />
                    ) : (
                      <div className="w-[180px] h-[180px] flex items-center justify-center">
                        <Loader2 className="animate-spin text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Secret key toggle */}
                <div className="rounded-xl bg-gray-50 dark:bg-zinc-900 border border-[#E0DCC8]/60 dark:border-zinc-800 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Can&apos;t scan the QR code?</span>
                    <button type="button" onClick={() => setShowSecret(v => !v)}
                      className="text-[11px] font-bold text-[#b08800] hover:underline flex items-center gap-1">
                      {showSecret ? <EyeOff size={11} /> : <Eye size={11} />}
                      {showSecret ? "Hide key" : "Show manual key"}
                    </button>
                  </div>
                  {showSecret && (
                    <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 rounded-lg p-2 border border-gray-200 dark:border-zinc-700">
                      <code className="text-xs font-mono font-black text-gray-800 dark:text-gray-200 flex-1 tracking-wider break-all">{secret}</code>
                      <button type="button" onClick={handleCopySecret}
                        className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors shrink-0"
                        title="Copy key">
                        {copiedSecret ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep("method-select")}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                    Back
                  </button>
                  <button type="button" onClick={() => setStep("verify")}
                    className="flex-2 bg-[#F5BD02] hover:bg-[#d8a310] text-gray-900 font-extrabold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-[#F5BD02]/20 cursor-pointer">
                    Next: Enter Code <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════
                APP FLOW — STEP 3: VERIFY TOTP
            ════════════════════════════════════════ */}
            {step === "verify" && (
              <div className="space-y-5">
                <div className="text-center">
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white mb-1">Enter Authenticator Code</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Enter the 6-digit code shown in your authenticator app.</p>
                </div>

                <CodeBubbles value={appCode} />

                {/* TOTP 30s countdown */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Code refreshes in</span>
                    <span className={`text-[10px] font-extrabold ${totpTimeLeft <= 5 ? "text-red-500" : "text-gray-500 dark:text-gray-400"}`}>{totpTimeLeft}s</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${totpTimeLeft <= 5 ? "bg-red-500" : "bg-[#F5BD02]"}`}
                         style={{ width: `${(totpTimeLeft / 30) * 100}%` }} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <input type="text" inputMode="numeric" maxLength={6} value={appCode}
                    onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); setAppCode(v); if (appCodeError) setAppCodeError(""); }}
                    onKeyDown={e => { if (e.key === "Enter" && appCode.length === 6) handleVerifyApp(); }}
                    placeholder="000 000" autoFocus
                    className={`w-full text-center text-3xl tracking-[0.5em] font-extrabold bg-gray-50 dark:bg-zinc-900 border rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#F5BD02]/20 outline-none transition-all ${appCodeError ? "border-red-400 dark:border-red-700" : "border-[#E0DCC8]/60 dark:border-zinc-800"}`} />
                  {appCodeError && (
                    <p className="text-xs text-red-500 font-medium flex items-center gap-1"><AlertTriangle size={12} /> {appCodeError}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep("qr")}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                    Back
                  </button>
                  <button disabled={appCode.length !== 6 || verifying} onClick={handleVerifyApp}
                    className="flex-2 bg-[#F5BD02] hover:bg-[#d8a310] disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-extrabold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm shadow-[#F5BD02]/20 cursor-pointer">
                    {verifying ? <><Loader2 size={16} className="animate-spin" /> Verifying...</> : <>Verify Code <ChevronRight size={16} /></>}
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════
                APP FLOW — STEP 4: BACKUP CODES
            ════════════════════════════════════════ */}
            {step === "backup" && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 mx-auto flex items-center justify-center mb-2">
                    <CheckCircle2 size={22} />
                  </div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white mb-1">Save Your Backup Codes</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">If you lose access to your authenticator app, these one-time codes are the only way to recover your account.</p>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-gray-50 dark:bg-zinc-900 p-3 rounded-xl border border-[#E0DCC8]/60 dark:border-zinc-800 font-mono text-xs font-black text-center text-gray-800 dark:text-gray-200">
                  {backupCodes.map((c, i) => (
                    <div key={i} className="p-1.5 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 tracking-wider">
                      {c}
                    </div>
                  ))}
                </div>

                <button type="button" onClick={handleCopyCodes}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                  {copiedCodes ? <><CheckCircle2 size={13} className="text-emerald-500" /> Copied to Clipboard!</> : <><Copy size={13} /> Copy All Codes</>}
                </button>

                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 p-3 flex gap-2.5">
                  <AlertTriangle size={14} className="text-[#b08800] shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                    Store these in a password manager or print them. They will not be shown again.
                  </p>
                </div>

                <button disabled={saving} onClick={() => save2FAPreference(true, "app")}
                  className="w-full bg-[#F5BD02] hover:bg-[#d8a310] disabled:opacity-50 text-gray-900 font-extrabold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm shadow-[#F5BD02]/20 cursor-pointer">
                  {saving ? <><Loader2 size={16} className="animate-spin" /> Enabling 2FA...</> : <>I Have Saved My Codes <ChevronRight size={16} /></>}
                </button>
              </div>
            )}

            {/* ════════════════════════════════════════
                OTP FLOW — STEP 2: SEND OTP
            ════════════════════════════════════════ */}
            {step === "otp-send" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white mb-1">Configure OTP Destination</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Choose where to receive your 6-digit one-time verification passwords.</p>
                </div>

                {/* AE Hub's code service sends email only, so there is no SMS option. */}
                {/* Email inputs */}
                {otpChannel === "email" && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setEmailType("official"); setOtpDestination(officialEmail); }}
                        className={`flex-1 text-left p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                          emailType === "official"
                            ? "border-[#F5BD02] bg-[#F5BD02]/5 dark:bg-[#F5BD02]/10 font-bold text-gray-900 dark:text-white ring-1 ring-[#F5BD02]"
                            : "border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-400"
                        }`}>
                        <span className="block font-bold text-[10px] text-gray-400 uppercase tracking-wide">Official Email</span>
                        <span className="truncate block font-semibold mt-0.5">{officialEmail || "Not set"}</span>
                      </button>
                      <button type="button" onClick={() => { setEmailType("personal"); setOtpDestination(personalEmail); }}
                        className={`flex-1 text-left p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                          emailType === "personal"
                            ? "border-[#F5BD02] bg-[#F5BD02]/5 dark:bg-[#F5BD02]/10 font-bold text-gray-900 dark:text-white ring-1 ring-[#F5BD02]"
                            : "border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-400"
                        }`}>
                        <span className="block font-bold text-[10px] text-gray-400 uppercase tracking-wide">Personal Email</span>
                        <span className="truncate block font-semibold mt-0.5">{personalEmail || "Add in settings"}</span>
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Recipient Email</label>
                      <input type="email" value={otpDestination} onChange={e => setOtpDestination(e.target.value)}
                        placeholder="your.email@aehub.com"
                        className="w-full bg-gray-50 dark:bg-zinc-900 border border-[#E0DCC8]/60 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-[#F5BD02]/20 outline-none" />
                    </div>
                  </div>
                )}

                {/* SMS inputs */}
                {otpChannel === "sms" && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setPhoneType("official"); setOtpDestination(officialPhone); }}
                        className={`flex-1 text-left p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                          phoneType === "official"
                            ? "border-[#F5BD02] bg-[#F5BD02]/5 dark:bg-[#F5BD02]/10 font-bold text-gray-900 dark:text-white ring-1 ring-[#F5BD02]"
                            : "border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-400"
                        }`}>
                        <span className="block font-bold text-[10px] text-gray-400 uppercase tracking-wide">Official Phone</span>
                        <span className="truncate block font-semibold mt-0.5">{officialPhone || "Not set"}</span>
                      </button>
                      <button type="button" onClick={() => { setPhoneType("personal"); setOtpDestination(personalPhone); }}
                        className={`flex-1 text-left p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                          phoneType === "personal"
                            ? "border-[#F5BD02] bg-[#F5BD02]/5 dark:bg-[#F5BD02]/10 font-bold text-gray-900 dark:text-white ring-1 ring-[#F5BD02]"
                            : "border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-400"
                        }`}>
                        <span className="block font-bold text-[10px] text-gray-400 uppercase tracking-wide">Personal Phone</span>
                        <span className="truncate block font-semibold mt-0.5">{personalPhone || "Add in settings"}</span>
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Recipient Phone</label>
                      <input type="tel" value={otpDestination} onChange={e => setOtpDestination(e.target.value)}
                        placeholder="+234 800 000 0000"
                        className="w-full bg-gray-50 dark:bg-zinc-900 border border-[#E0DCC8]/60 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-[#F5BD02]/20 outline-none" />
                    </div>
                  </div>
                )}

                <button disabled={!otpDestination.trim() || otpSending} onClick={() => handleSendOtp()}
                  className="w-full bg-[#F5BD02] hover:bg-[#d8a310] disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-extrabold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm shadow-[#F5BD02]/20 cursor-pointer">
                  {otpSending ? <><Loader2 size={16} className="animate-spin" /> Sending Code...</> : <><Send size={15} /> Send Verification Code</>}
                </button>
              </div>
            )}

            {/* ════════════════════════════════════════
                OTP FLOW — STEP 3: VERIFY OTP
            ════════════════════════════════════════ */}
            {step === "otp-verify" && (
              <div className="space-y-5">
                <div className="text-center">
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white mb-1">Enter Your OTP</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    We sent a 6-digit code to{" "}
                    <span className="font-bold text-gray-700 dark:text-gray-300">{otpDestination}</span>
                  </p>
                </div>

                <CodeBubbles value={otpCode} />

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Code expires</span>
                    {otpTimeLeft <= 0 && <span className="text-[10px] font-bold text-red-500">Expired — request a new code</span>}
                  </div>
                  <OtpCountdown seconds={otpTimeLeft} total={600} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <input type="text" inputMode="numeric" maxLength={6} value={otpCode}
                    onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); setOtpCode(v); if (otpCodeError) setOtpCodeError(""); }}
                    onKeyDown={e => { if (e.key === "Enter" && otpCode.length === 6) handleVerifyOtp(); }}
                    placeholder="000 000" autoFocus disabled={otpTimeLeft <= 0}
                    className={`w-full text-center text-3xl tracking-[0.5em] font-extrabold bg-gray-50 dark:bg-zinc-900 border rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#F5BD02]/20 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed ${otpCodeError ? "border-red-400 dark:border-red-700" : "border-[#E0DCC8]/60 dark:border-zinc-800"}`} />
                  {otpCodeError && (
                    <p className="text-xs text-red-500 font-medium flex items-center gap-1"><AlertTriangle size={12} /> {otpCodeError}</p>
                  )}
                </div>

                <button type="button" onClick={() => { setStep("otp-send"); setOtpCode(""); setOtpCodeError(""); }}
                  className="flex items-center justify-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-[#F5BD02] transition-all cursor-pointer w-full">
                  <RefreshCw size={13} /> Resend or change destination
                </button>

                <button disabled={otpCode.length !== 6 || verifying || otpTimeLeft <= 0} onClick={handleVerifyOtp}
                  className="w-full bg-[#F5BD02] hover:bg-[#d8a310] disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-extrabold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm shadow-[#F5BD02]/20 cursor-pointer">
                  {verifying ? <><Loader2 size={16} className="animate-spin" /> Verifying...</> : <>Verify &amp; Enable 2FA <ChevronRight size={16} /></>}
                </button>
              </div>
            )}

            {/* ════════════════════════════════════════
                DISABLE FLOW
            ════════════════════════════════════════ */}
            {step === "disable-confirm" && (
              <div className="space-y-5">
                <div className="flex flex-col items-center gap-3 py-2 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/20 flex items-center justify-center border border-red-100 dark:border-red-900/30">
                    <ShieldOff size={28} className="text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900 dark:text-white mb-1">Disable Two-Factor Authentication</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                      {isOtpDisable
                        ? `Enter the 6-digit verification code sent to ${otpDestination || officialEmail || "your email"}.`
                        : "Enter your current 6-digit authenticator code to confirm you want to remove 2FA protection."}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 p-3 flex gap-2.5">
                  <AlertTriangle size={13} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-red-700 dark:text-red-400 font-medium">
                    Your account will only require a password to sign in after disabling 2FA.
                  </p>
                </div>

                {isOtpDisable && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-gray-500 dark:text-gray-400">Code expires</span>
                      <span className={otpTimeLeft <= 60 ? "text-red-500 font-bold" : "text-gray-500"}>
                        {Math.floor(otpTimeLeft / 60)}:{String(otpTimeLeft % 60).padStart(2, "0")}
                      </span>
                    </div>
                    <OtpCountdown seconds={otpTimeLeft} total={600} />
                  </div>
                )}

                <CodeBubbles value={appCode} />

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    {isOtpDisable ? "6-digit OTP code" : "6-digit Authenticator code"}
                  </label>
                  <input type="text" inputMode="numeric" maxLength={6} value={appCode}
                    onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); setAppCode(v); if (appCodeError) setAppCodeError(""); }}
                    onKeyDown={e => { if (e.key === "Enter" && appCode.length === 6) handleVerifyDisable(); }}
                    placeholder="000 000" autoFocus
                    className={`w-full text-center text-3xl tracking-[0.5em] font-extrabold bg-gray-50 dark:bg-zinc-900 border rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#F5BD02]/20 outline-none transition-all ${appCodeError ? "border-red-400 dark:border-red-700" : "border-[#E0DCC8]/60 dark:border-zinc-800"}`} />
                  {appCodeError && (
                    <p className="text-xs text-red-500 font-medium flex items-center gap-1"><AlertTriangle size={12} /> {appCodeError}</p>
                  )}
                </div>

                {isOtpDisable && (
                  <button
                    type="button"
                    disabled={otpSending}
                    onClick={() => handleSendOtp(otpDestination || officialEmail)}
                    className="flex items-center justify-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-[#F5BD02] transition-all cursor-pointer w-full disabled:opacity-50"
                  >
                    {otpSending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    Resend verification code
                  </button>
                )}

                <button disabled={appCode.length !== 6 || verifying || saving} onClick={handleVerifyDisable}
                  className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm shadow-red-500/20 cursor-pointer">
                  {(verifying || saving) ? <><Loader2 size={16} className="animate-spin" /> {saving ? "Disabling…" : "Verifying…"}</> : <><ShieldOff size={15} /> Verify &amp; Disable 2FA</>}
                </button>
              </div>
            )}

            {/* ════════════════════════════════════════
                SUCCESS
            ════════════════════════════════════════ */}
            {step === "success" && (
              <div className="space-y-6 py-2">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400/20 to-emerald-500/10 dark:from-emerald-950/40 dark:to-emerald-900/20 flex items-center justify-center border border-emerald-200 dark:border-emerald-900/30">
                      <ShieldCheck size={36} className="text-emerald-500" />
                    </div>
                    <span className="absolute inset-0 rounded-full animate-ping bg-emerald-400 opacity-10" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-gray-900 dark:text-white mb-1">2FA Enabled!</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                      {method === "app"
                        ? "Your authenticator app is now linked to your account."
                        : `OTP codes will be sent to ${otpDestination} at each sign-in.`}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {(method === "app"
                    ? ["Authenticator app is linked and verified", "Backup codes saved — keep them safe", "2FA active for all future sign-ins"]
                    : [`OTP will be sent to ${otpDestination}`, "Each code expires after 10 minutes", "2FA active for all future sign-ins"]
                  ).map(item => (
                    <div key={item} className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/20">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>

                <button onClick={onClose}
                  className="w-full bg-[#F5BD02] hover:bg-[#d8a310] text-gray-900 font-extrabold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm shadow-[#F5BD02]/20 cursor-pointer">
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      </AeOverlay>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes tfa-in {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
      ` }} />
    </>
  );
}
