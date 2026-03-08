import React from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function PrintLayout(props: {
  className?: string;
  children: React.ReactNode;
  pageClassName?: string;
  footer?: React.ReactNode;
  footerClassName?: string;
  compact?: boolean;
}) {
  const { className, children, pageClassName, footer, footerClassName, compact = false } = props;

  return (
    <div className={pageClassName ?? "print-page"}>
      <main
        className={
          "mx-auto flex flex-col max-w-[210mm] bg-card px-8 py-10 text-card-foreground " +
          (compact ? "min-h-0 print:min-h-0" : "min-h-screen print:min-h-[297mm]") +
          " " +
          (className ?? "")
        }
      >
        <div className="mb-4 print:hidden">
          <Button asChild type="button" variant="outline" size="sm" className="gap-1">
            <Link to="/app">
              <ArrowLeft className="h-4 w-4" />
              Back to Overview
            </Link>
          </Button>
        </div>

        <div className={compact ? "" : "flex-1"}>{children}</div>

        {footer ? (
          <footer className={(compact ? "mt-6 print:mt-8 pt-6" : "mt-auto pt-8 print:pt-10") + " " + (footerClassName ?? "")}>
            {footer}
          </footer>
        ) : null}
      </main>
    </div>
  );
}
