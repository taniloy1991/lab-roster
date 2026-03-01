import React from "react";

export function PrintLayout(props: {
  className?: string;
  children: React.ReactNode;
  pageClassName?: string;
  footer?: React.ReactNode;
  footerClassName?: string;
}) {
  const { className, children, pageClassName, footer, footerClassName } = props;

  return (
    <div className={pageClassName ?? "print-page"}>
      <main
        className={
          "mx-auto flex min-h-screen flex-col max-w-[210mm] bg-card px-8 py-10 text-card-foreground print:min-h-[297mm] " +
          (className ?? "")
        }
      >
        <div className="flex-1">{children}</div>

        {footer ? (
          <footer className={"mt-auto pt-8 print:pt-10 " + (footerClassName ?? "")}>
            {footer}
          </footer>
        ) : null}
      </main>
    </div>
  );
}
