import React from "react";

export function PrintLayout(props: {
  className?: string;
  children: React.ReactNode;
  pageClassName?: string;
}) {
  const { className, children, pageClassName } = props;

  return (
    <div className={pageClassName ?? "print-page"}>
      <main
        className={
          "mx-auto min-h-screen max-w-[210mm] bg-card px-8 py-10 text-card-foreground " +
          (className ?? "")
        }
      >
        {children}
      </main>
    </div>
  );
}
