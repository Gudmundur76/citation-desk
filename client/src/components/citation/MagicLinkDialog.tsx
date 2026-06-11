import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail, CheckCircle2 } from "lucide-react";

interface MagicLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "email" | "sent";

export function MagicLinkDialog({ open, onOpenChange }: MagicLinkDialogProps) {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Clean up pending reset timer on unmount
  useEffect(() => {
    return () => {
      clearTimeout(resetTimerRef.current);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/magic-link/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Request failed");
      }
      setStep("sent");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleClose(open: boolean) {
    if (!open) {
      resetTimerRef.current = setTimeout(() => {
        setEmail("");
        setStep("email");
        setLoading(false);
      }, 300);
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[420px] rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        {step === "email" ? (
          <>
            <DialogHeader className="mb-5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <DialogTitle
                className="text-xl font-bold text-slate-900"
                style={{ fontFamily: "Syne, sans-serif", letterSpacing: "-0.02em" }}
              >
                Sign in to citation.is
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm text-slate-500">
                Enter your email and we'll send you a secure sign-in link. No password required.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <Input
                type="email"
                placeholder="you@institution.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                disabled={loading}
                className="h-11 rounded-lg border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
              />
              <Button
                type="submit"
                disabled={loading || !email.trim()}
                className="h-11 rounded-lg bg-slate-900 text-sm font-semibold text-white hover:bg-slate-800 active:scale-[0.97] transition-transform"
              >
                {loading ? "Sending…" : "Send sign-in link →"}
              </Button>
            </form>
            <p className="mt-4 text-center text-xs text-slate-400">
              Link expires in 15 minutes · Single use · No password stored
            </p>
          </>
        ) : (
          <>
            <DialogHeader className="mb-5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <DialogTitle
                className="text-xl font-bold text-slate-900"
                style={{ fontFamily: "Syne, sans-serif", letterSpacing: "-0.02em" }}
              >
                Check your email
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm text-slate-500">
                We sent a sign-in link to{" "}
                <strong className="font-medium text-slate-700">{email}</strong>. Click the link to
                sign in — it expires in 15 minutes.
              </DialogDescription>
            </DialogHeader>
            <Button
              variant="outline"
              onClick={() => setStep("email")}
              className="h-10 rounded-lg border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
            >
              Use a different email
            </Button>
            <p className="mt-3 text-center text-xs text-slate-400">
              Didn't receive it? Check your spam folder or try again in a few minutes.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Dispatch the global sign-in dialog open event */
export function openSignInDialog() {
  window.dispatchEvent(new CustomEvent("td:open-sign-in"));
}
