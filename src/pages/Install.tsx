import React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function Install() {
  const [canInstall, setCanInstall] = React.useState(false);
  const deferredPromptRef = React.useRef<BeforeInstallPromptEvent | null>(null);

  React.useEffect(() => {
    const handler = (e: Event) => {
      // Chrome/Edge fires this before showing the mini-infobar
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Install app</CardTitle>
          <CardDescription>
            মোবাইলে “Add to Home Screen” বা ডেস্কটপে “Install app” দিয়ে এই ওয়েব অ্যাপটা আপনার ডিভাইসে ইন্সটল করতে পারবেন।
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full"
            disabled={!canInstall}
            onClick={async () => {
              const dp = deferredPromptRef.current;
              if (!dp) return;
              await dp.prompt();
              await dp.userChoice;
              deferredPromptRef.current = null;
              setCanInstall(false);
            }}
          >
            {canInstall ? "Install now" : "Install option not available"}
          </Button>

          <div className="rounded-md border bg-card p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">iPhone (Safari)</p>
            <p>Share → Add to Home Screen</p>
            <p className="mt-2 font-medium text-foreground">Android (Chrome)</p>
            <p>Menu (⋮) → Add to Home screen / Install app</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
