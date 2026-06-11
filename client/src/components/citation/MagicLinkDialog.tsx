import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { useEffect, useState } from "react";

type Stage = "idle" | "loading" | "sent" | "error";

export function MagicLinkDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const handler = () => {
      setOpen(true);
      setStage("idle");
      setEmail("");
      setErrorMsg("");
    };
    window.addEventListener("td:open-sign-in", handler);
    return () => window.removeEventListener("td:open-sign-in", handler);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStage("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/magic-link/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), origin: window.location.origin }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong. Please try again.");
        setStage("error");
        return;
      }

      setStage("sent");
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStage("error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Mail className="w-5 h-5 text-primary" />
            Sign in to Citation Desk
          </DialogTitle>
          <DialogDescription>
            Enter your email address and we'll send you a secure sign-in link.
          </DialogDescription>
        </DialogHeader>

        {stage === "sent" ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <div>
              <p className="font-semibold text-base">Check your email</p>
              <p className="text-sm text-muted-foreground mt-1">
                We sent a sign-in link to <strong>{email}</strong>.
                <br />
                The link expires in 15 minutes.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="magic-email" className="text-sm font-medium">
                Email address
              </label>
              <Input
                id="magic-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                disabled={stage === "loading"}
              />
              {stage === "error" && errorMsg && (
                <p className="text-xs text-destructive mt-1">{errorMsg}</p>
              )}
            </div>
            <Button
              type="submit"
              disabled={stage === "loading" || !email.trim()}
              className="w-full"
            >
              {stage === "loading" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending…
                </>
              ) : (
                "Send sign-in link"
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              No password required. One-click sign-in via email.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
