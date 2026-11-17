# Wagaya admin setup

## 1. Database
Run `_docs/SETUP.sql` in Supabase > SQL Editor to apply schema updates. It adds the menu category column used to separate Drinks and Pastries; existing menu items default to Drinks. It also adds the ingredient category and stock columns, the Inventory restock-history column, and refreshes Supabase's schema cache. Existing stock balances are not backfilled into history; additions are recorded from the migration onward. In Admin, edit each pastry and set its Menu section to Pastries.

## 2. Google Sheets (optional)
1. Open your Google Sheet > Extensions > Apps Script.
2. Paste everything from `_docs/GoogleSheets-AppsScript.gs`.
3. Change `SECRET` to a code only you know.
4. Deploy > New deployment > type "Web app".
   Execute as: Me. Who has access: Anyone. Press Deploy and allow access.
5. Copy the Web app URL.
6. In the app: Settings > Google Sheets. Paste the URL and the same code.
   Press Save, then Test Connection.
7. If you update the Apps Script later, deploy a new version of the existing web app deployment.
   The Sales reset requires the latest script; the app reports an outdated deployment if it does not receive a cleared-row count.

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
Until you add those lines, a customer order's stock comes off when it is marked Done instead.
Cancelling an order puts its ingredients back.
