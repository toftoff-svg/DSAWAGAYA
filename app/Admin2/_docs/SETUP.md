# Wagaya admin setup

## 1. Database
Run `_docs/SETUP.sql` once in Supabase > SQL Editor. Your existing `settings` table (id + value) is reused.

## 2. Google Sheets (optional)
1. Open your Google Sheet > Extensions > Apps Script.
2. Paste everything from `_docs/GoogleSheets-AppsScript.gs`.
3. Change `SECRET` to a code only you know.
4. Deploy > New deployment > type "Web app".
   Execute as: Me. Who has access: Anyone. Press Deploy and allow access.
5. Copy the Web app URL.
6. In the app: Settings > Google Sheets. Paste the URL and the same code.
   Press Save, then Test Connection.

## 3. Stock deduction for customer orders (2 lines)
Stock comes off the moment an order is placed. Orders from the admin pages already do this.
For orders placed on the customer screen, open the customer `actions.ts` and:

1. Add this import at the top:
   `import { deductOrderStock } from '@/app/Admin/_lib/actions'`
2. Right after the `if (error) { ... }` block that follows the insert, and before
   `return { ok: true, orderNumber: num }`, add:
   `await deductOrderStock(id)`

Until you add those lines, a customer order's stock comes off when it is marked Done instead.
Cancelling an order puts its ingredients back.
