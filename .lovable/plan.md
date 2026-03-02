
Goal (confirmed):
- Monthly Report-এ table row থেকে `CL Print` এবং `OFF Print` button পুরোপুরি remove করা হবে।
- Staff name-এ click করলে নিচে যে Year Details card open হয়, সেখানে শুধু ১টা print button থাকবে।
- ওই button click করলে selected year অনুযায়ী CL + General OFF (earned/used + balance summary) একসাথে একটি single print page-এ, একটার নিচে আরেকটা show হবে।

What I will build:

1) Monthly Report UI cleanup
- `src/pages/app/ReportsMonthly.tsx`
  - Table row-এর দুইটা print button remove।
  - Header helper text update (CL/OFF direct print কথাটা বাদ)।
  - Expanded details card-এর top-right এ existing `Print CL` + `Print OFF` remove করে ১টা button add:
    - label: `Print Details`
    - action: open নতুন combined print route with `staffId` + `year`.

2) New combined print page (single page flow)
- নতুন print page component create (e.g. `src/pages/print/PrintStaffYearDetails.tsx`)
- Query params:
  - `staffId` (required)
  - `year` (required; selected year from Monthly Report)
- Data loading (institution-scoped, same source pattern as Monthly details):
  - staff name from `staff`
  - CL remaining from `cl_balance_dynamic` (by year)
  - CL transactions from `cl_transactions` (by year)
  - OFF totals from `general_off_balance_dynamic`
  - OFF earned rows from `general_off_earn`
  - OFF used rows from `general_off_deduct`
- Render structure:
  - Top: institution header/logo
  - Single `Print / Save as PDF` button (screen only)
  - Section A: Casual Leave (remaining + tx table)
  - Section B: General OFF (earned/used/balance + earned table + used table)
  - Bottom: shared signature block via existing `BirdemMicrobiologySignatures`
  - Uses shared `PrintLayout` and `print:break-inside-avoid` footer policy

3) Route wiring
- `src/App.tsx`
  - Add new standalone protected print route (same auth pattern as other `/print/*` pages), e.g.:
    - `/print/staff-year-details`
  - Import new print component and register route.

4) Keep existing behavior intact
- Monthly Report realtime update logic থাকবে unchanged।
- Existing `/print/cl-overview` and `/print/off-overview` routes remove করব না (backward compatibility), শুধু Monthly Report থেকে আর call করা হবে না।

Technical details (implementation-focused):
- No database schema/RLS change needed.
- No migration required.
- Query filters:
  - CL strictly `year = selectedYear`
  - OFF: current dynamic balance + ledger tables (same as existing details behavior)
- Error/empty states:
  - Missing `staffId/year` → user-friendly message in print page
  - Empty sections → “No ... entries” rows keep করা হবে
- Print consistency:
  - single action button (`Print / Save as PDF`)
  - logo/header and signature format unchanged from shared components

Acceptance checklist:
- Monthly Report table row-এ আর `CL Print` / `OFF Print` নেই।
- Name click না করলে print button show করবে না।
- Name click করলে details card-এ only one `Print Details` button show করবে।
- Button click করলে এক route-এ CL + OFF full details একসাথে print preview হবে।
- Print preview-এ footer/signature same page flow policy follow করবে।
