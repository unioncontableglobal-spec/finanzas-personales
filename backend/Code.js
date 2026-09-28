const SHEET_ID = '1VSmpQ9oZl-R35rzfZ8-MvD9upx4U-RDUlRqiGAGrgDk';

function getDBSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName("DB");
  if (!sheet) {
    sheet = ss.insertSheet("DB");
    sheet.getRange("A1").setValue("transactions");
    sheet.getRange("A2").setValue("budgets");
    sheet.getRange("A3").setValue("payables"); // Keep text but we won't use it much
    sheet.getRange("A4").setValue("savings");
    sheet.getRange("A5").setValue("contributors");
    sheet.getRange("A6").setValue("groceries");
    sheet.getRange("A7").setValue("projects");
    sheet.getRange("A8").setValue("categories");
    sheet.getRange("A9").setValue("groceriesCategories");
    sheet.getRange("A10").setValue("appSettings");
    sheet.getRange("A11").setValue("cajas");
  } else {
    if (sheet.getRange("A10").getValue() !== "appSettings") {
      sheet.getRange("A10").setValue("appSettings");
    }
    if (sheet.getRange("A11").getValue() !== "cajas") {
      sheet.getRange("A11").setValue("cajas");
    }
  }
  return sheet;
}

function doGet(e) {
  const sheet = getDBSheet();
  const data = {
    transactions: JSON.parse(sheet.getRange("B1").getValue() || "[]"),
    budgets: JSON.parse(sheet.getRange("B2").getValue() || "{}"),
    payables: JSON.parse(sheet.getRange("B3").getValue() || "[]"),
    savings: JSON.parse(sheet.getRange("B4").getValue() || "{}"),
    contributors: JSON.parse(sheet.getRange("B5").getValue() || "[]"),
    groceries: JSON.parse(sheet.getRange("B6").getValue() || "[]"),
    projects: JSON.parse(sheet.getRange("B7").getValue() || "[]"),
    categories: JSON.parse(sheet.getRange("B8").getValue() || "[]"),
    groceriesCategories: JSON.parse(sheet.getRange("B9").getValue() || "[]"),
    appSettings: JSON.parse(sheet.getRange("B10").getValue() || "{\"exchangeRate\": 43.0, \"displayCurrency\": \"USD\"}"),
    cajas: JSON.parse(sheet.getRange("B11").getValue() || "{}")
  };
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const sheet = getDBSheet();
  try {
    const payload = JSON.parse(e.postData.contents);
    if (payload.type === 'update_transactions') {
      sheet.getRange("B1").setValue(JSON.stringify(payload.data));
    } else if (payload.type === 'update_budgets') {
      sheet.getRange("B2").setValue(JSON.stringify(payload.data));
    } else if (payload.type === 'update_payables') {
      sheet.getRange("B3").setValue(JSON.stringify(payload.data));
    } else if (payload.type === 'update_savings') {
      sheet.getRange("B4").setValue(JSON.stringify(payload.data));
    } else if (payload.type === 'update_contributors') {
      sheet.getRange("B5").setValue(JSON.stringify(payload.data));
    } else if (payload.type === 'update_groceries') {
      sheet.getRange("B6").setValue(JSON.stringify(payload.data));
    } else if (payload.type === 'update_projects') {
      sheet.getRange("B7").setValue(JSON.stringify(payload.data));
    } else if (payload.type === 'update_categories') {
      sheet.getRange("B8").setValue(JSON.stringify(payload.data));
    } else if (payload.type === 'update_groceriesCategories') {
      sheet.getRange("B9").setValue(JSON.stringify(payload.data));
    } else if (payload.type === 'update_appSettings') {
      sheet.getRange("B10").setValue(JSON.stringify(payload.data));
    } else if (payload.type === 'update_cajas') {
      sheet.getRange("B11").setValue(JSON.stringify(payload.data));
    } else if (payload.type === 'update_all') {
      if (payload.data.transactions) sheet.getRange("B1").setValue(JSON.stringify(payload.data.transactions));
      if (payload.data.budgets) sheet.getRange("B2").setValue(JSON.stringify(payload.data.budgets));
      if (payload.data.payables) sheet.getRange("B3").setValue(JSON.stringify(payload.data.payables));
      if (payload.data.savings) sheet.getRange("B4").setValue(JSON.stringify(payload.data.savings));
      if (payload.data.contributors) sheet.getRange("B5").setValue(JSON.stringify(payload.data.contributors));
      if (payload.data.groceries) sheet.getRange("B6").setValue(JSON.stringify(payload.data.groceries));
      if (payload.data.projects) sheet.getRange("B7").setValue(JSON.stringify(payload.data.projects));
      if (payload.data.categories) sheet.getRange("B8").setValue(JSON.stringify(payload.data.categories));
      if (payload.data.groceriesCategories) sheet.getRange("B9").setValue(JSON.stringify(payload.data.groceriesCategories));
      if (payload.data.appSettings) sheet.getRange("B10").setValue(JSON.stringify(payload.data.appSettings));
      if (payload.data.cajas) sheet.getRange("B11").setValue(JSON.stringify(payload.data.cajas));
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}
