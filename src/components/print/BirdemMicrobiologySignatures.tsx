import React from "react";

type Props = {
  className?: string;
};

export function BirdemMicrobiologySignatures({ className }: Props) {
  return (
    <section className={"mt-10 grid grid-cols-1 gap-8 text-sm sm:grid-cols-2 " + (className ?? "")}
    >
      <div>
        <div className="text-muted-foreground whitespace-pre-line">
          Prepared by: <span className="text-foreground">Md. Asif Hossain</span>,
          {"\n"}Research Assistant
          {"\n"}Dept. of Microbiology
          {"\n"}BIRDEM General Hospital
        </div>
      </div>
      <div>
        <div className="text-muted-foreground whitespace-pre-line">
          Approved By: <span className="text-foreground">Prof. Dr. Lovely Barai</span>
          {"\n"}Professor & Head
          {"\n"}Dept. Of Microbiology
          {"\n"}BIRDEM General Hospital
        </div>
        <div className="mt-3 border-b border-border" />
      </div>
    </section>
  );
}
