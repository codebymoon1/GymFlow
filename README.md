# GymFlow

GymFlow is a browser-based gym management application built with React 19 and Vite. It currently stores its records in the browser's `localStorage`; there is no server, login, or shared database yet.

## Requirements

- Node.js compatible with the installed Vite 8 toolchain
- npm

## Install and run

```bash
npm install
npm run dev
```

Vite prints the local development URL after startup. Other available commands:

```bash
npm run lint
npm run build
npm run preview
```

## Modules

- **Dashboard:** member totals, active memberships, income, expenses, outstanding dues, today's attendance, and recent revenue chart.
- **Members:** create, search, and remove member records; active membership plans are read from Settings.
- **Attendance:** check members in by roll number, mark attendance manually when enabled, browse and export records, and associate each record with a configured shift.
- **Billing & Payments:** record membership payments, update member balances and wallets, print receipts, and export payment data.
- **Wallets:** manage wallets and transactions, review balances, run cash drawer sessions, and record handovers.
- **Expenses:** record, edit, cancel, filter, and export expenses.
- **Reports:** review member, attendance, wallet, and transaction summaries.
- **Settings:** configure the gym profile, plans, shifts, payment options, and preferences.

## Project structure

```text
src/
  components/layout/  Shared navigation and header
  context/            Shared member and financial state
  pages/              Route-level application modules
  assets/             Static image and template assets
  App.jsx              Routes and shared providers
  main.jsx             React application entry point
```

The app uses React Router for navigation, Tailwind CSS 4 for styling, Lucide React for icons, and Recharts for the dashboard chart. Member and financial data are shared through React context providers; feature screens persist their data in the browser.

## Browser storage

| Key | Contents |
| --- | --- |
| `gymflow_members` | Member profiles and their payment history |
| `gymflow_wallets` | Wallet names, balances, types, and active state |
| `gymflow_transactions` | Income, expense, transfer, and reversal records |
| `gymflow_attendance` | Attendance records, including the shift captured at check-in |
| `gymflow_settings` | Gym profile, plans, shifts, payment methods, and preferences |
| `gymflow_cash_sessions` | Cash drawer sessions and handover history |

These records are scoped to the current browser profile and origin. Clearing browser storage or using another browser/device will not preserve or share them. Settings are applied when saved; older member and transaction records are retained when preferences change.

## Current limitations

- A separate Express + Prisma backend foundation now exists in `backend/`, but the frontend is not yet connected to it.
- There is no authentication, staff permission system, or multi-device synchronization in the frontend.
- Data lives only in browser storage; regular exported backups are advisable for important records.
- Some settings are preferences for the current frontend only. There is no server-side enforcement.
- The project has no automated test suite configured yet.

Backend setup and verification instructions are in [backend/README.md](backend/README.md). The frontend continues to use browser storage until the later API-integration phase.
