  // Paste this into Extensions > Apps Script inside your Google Sheet.
const SECRET = "wya"; // must match the code you type in Settings > Google Sheets
const SHEET_NAME = "Sales";
const INGREDIENTS_SHEET_NAME = "Ingredient Stocks";

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (String(body.code) !== SECRET) return out({ ok: false, error: "Wrong code." });
    if (body.test) return out({ ok: true });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (body.ingredients) {
      const sheet = ss.getSheetByName(INGREDIENTS_SHEET_NAME) || ss.insertSheet(INGREDIENTS_SHEET_NAME);
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["ID", "Ingredient", "Category", "Stock", "Unit", "Low Alert", "Cost"]);
      }
      const values = sheet.getDataRange().getValues();
      const rowsById = new Map(values.slice(1).map((row, index) => [String(row[0]), index + 2]));
      (body.ingredientRemoveIds || []).forEach((id) => {
        const row = rowsById.get(String(id));
        if (row) sheet.deleteRow(row);
      });
      const refreshedValues = sheet.getDataRange().getValues();
      const refreshedRowsById = new Map(refreshedValues.slice(1).map((row, index) => [String(row[0]), index + 2]));
      body.ingredients.forEach((ingredient) => {
        const row = refreshedRowsById.get(String(ingredient[0]));
        if (row) {
          sheet.getRange(row, 1, 1, ingredient.length).setValues([ingredient]);
        } else {
          sheet.appendRow(ingredient);
        }
      });
      return out({ ok: true, updated: body.ingredients.length });
    }
    if (body.ingredientRemoveIds) {
      const sheet = ss.getSheetByName(INGREDIENTS_SHEET_NAME);
      if (sheet) {
        const values = sheet.getDataRange().getValues();
        body.ingredientRemoveIds.forEach((id) => {
          for (let i = values.length - 1; i >= 1; i--) {
            if (String(values[i][0]) === String(id)) sheet.deleteRow(i + 1);
          }
        });
      }
      return out({ ok: true });
    }
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["ID", "Date", "Time", "Payment", "Product", "Add-ons", "Price", "Cost", "Profit", "Customer"]);
    } else {
      let header = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
      if (!header.includes("Payment")) {
        sheet.insertColumnBefore(4);
        sheet.getRange(1, 4).setValue("Payment");
        header = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
      }
      if (!header.includes("Customer")) {
        sheet.getRange(1, header.length + 1).setValue("Customer");
      }
    }
    if (body.resetSales) {
      const lastRow = sheet.getLastRow();
      const lastColumn = sheet.getLastColumn();
      if (lastRow > 1 && lastColumn > 0) {
        sheet.getRange(2, 1, lastRow - 1, lastColumn).clearContent();
      }
      return out({ ok: true, cleared: Math.max(lastRow - 1, 0) });
    }
    const rows = body.rows || [];
    if (rows.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }
    return out({ ok: true, added: rows.length });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
