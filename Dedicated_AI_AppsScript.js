// ============================================================================
// DEDICATED AI EXTRACTION APPS SCRIPT (Dedicated AI Code.gs)
// Target Spreadsheet: 1YvMBpPb3s1BVri5WvSSnbbjb0i3zIRk026eJVfciBKY
// Target Sheet Tab:   AI_SOA_Extractions (Keyed by Request ID in Column A)
// 100% Independent of Drive Owner Upload Script — Zero Drive Storage Quota Used
// ============================================================================
var AI_EXTRACTION_SPREADSHEET_ID = "1YvMBpPb3s1BVri5WvSSnbbjb0i3zIRk026eJVfciBKY";
var AI_EXTRACTION_SHEET_NAME = "AI_SOA_Extractions";

var AI_EXTRACTION_HEADERS = [
  "Request ID", "Account Number", "Site", "Biller",
  "Cycle From", "Cycle To", "AI Due Date", "Grace Period",
  "Consumption", "Arrears", "Current Amount", "Total Amount",
  "Amount Before Due", "Detected Format", "Legibility",
  "Pages Scanned", "Scanned At"
];

function getOrCreateAiExtractionSheet(ss, customTabName) {
  var tabName = String(customTabName || AI_EXTRACTION_SHEET_NAME).trim() || AI_EXTRACTION_SHEET_NAME;
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(AI_EXTRACTION_HEADERS);
    sheet.getRange(1, 1, 1, AI_EXTRACTION_HEADERS.length).setFontWeight("bold").setBackground("#d1fae5");
    sheet.setFrozenRows(1);
  } else {
    var firstCell = String(sheet.getRange(1, 1).getValue() || "").trim();
    if (firstCell !== "Request ID") {
      sheet.insertRowBefore(1);
      sheet.getRange(1, 1, 1, AI_EXTRACTION_HEADERS.length).setValues([AI_EXTRACTION_HEADERS]).setFontWeight("bold").setBackground("#d1fae5");
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}
