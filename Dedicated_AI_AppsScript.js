// ============================================================================
// Unified Code.gs for "Bill Sub WebApp" (1YvMBpPb3s1BVri5WvSSnbbjb0i3zIRk026eJVfciBKY)
// ZERO Drive File Uploads — Does NOT use any Google Drive file storage quota!
// Handles:
//   1. UserData (Encrypted Passwords, Lifecycle Status, Module RBAC | MODS:...)
//   2. Announcements
//   3. Text-Only Cell Edits in "Bill Sub WebApp Requests" (Billing & Enrollment Details)
//   4. Dedicated Free AI Statement Extractions ("AI_SOA_Extractions") Keyed by Request ID (Col A)
// ============================================================================
var USER_DATA_SPREADSHEET_ID = '1YvMBpPb3s1BVri5WvSSnbbjb0i3zIRk026eJVfciBKY';
var UTILITY_SPREADSHEET_ID = '1WI4CA4hy1s3oyCZLvgDVA1SeJSj9gN2BfLLeRpUmZDA';
var AI_EXTRACTION_SPREADSHEET_ID = '1YvMBpPb3s1BVri5WvSSnbbjb0i3zIRk026eJVfciBKY';
var AI_EXTRACTION_SHEET_NAME = 'AI_SOA_Extractions';

function getUserSpreadsheet(customId) {
  try {
    return SpreadsheetApp.openById(customId || USER_DATA_SPREADSHEET_ID);
  } catch (e) {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

function getUtilitySpreadsheet() {
  return SpreadsheetApp.openById(UTILITY_SPREADSHEET_ID);
}

function getAiSpreadsheet(customId) {
  try {
    return SpreadsheetApp.openById(customId || AI_EXTRACTION_SPREADSHEET_ID);
  } catch (e) {
    return getUserSpreadsheet(customId);
  }
}

function ensureAiExtractionHeaders(sheet) {
  var headers = [
    'Request ID',         // Col A (1) - Foreign Key referencing Request Bill Payments
    'Account Number',     // Col B (2)
    'Site',               // Col C (3)
    'Biller',             // Col D (4)
    'Cycle From',         // Col E (5)
    'Cycle To',           // Col F (6)
    'AI Due Date',        // Col G (7)
    'Grace Period',       // Col H (8) - Explicit "Grace Period" ONLY (never Due-to-Discon)
    'Consumption',        // Col I (9)
    'Arrears',            // Col J (10)
    'Current Amount',     // Col K (11)
    'Total Amount',       // Col L (12)
    'Amount Before Due',  // Col M (13)
    'Detected Format',    // Col N (14)
    'Legibility',         // Col O (15)
    'Pages Scanned',      // Col P (16)
    'Scanned At'          // Col Q (17)
  ];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#d1fae5');
    sheet.setFrozenRows(1);
    return;
  }
  var firstCell = String(sheet.getRange(1, 1).getValue() || '').trim();
  if (firstCell !== 'Request ID') {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#d1fae5');
    sheet.setFrozenRows(1);
  }
}

// 1-click manual authorization function — select this in the Apps Script toolbar and click (▶ Run) once to authorize Drive & Sheets
function authorizeDriveAndSheets() {
  var aiSs = getAiSpreadsheet();
  var aiSheet = aiSs.getSheetByName(AI_EXTRACTION_SHEET_NAME) || aiSs.insertSheet(AI_EXTRACTION_SHEET_NAME);
  ensureAiExtractionHeaders(aiSheet);
  var utilSs = getUtilitySpreadsheet();
  var otpSheet = utilSs.getSheetByName('One Time Bill Payments') || utilSs.insertSheet('One Time Bill Payments');
  var folder = DriveApp.getFolderById('1u7lR6OCbzoYfmLXe4TGeQ2LyGJiLHDa5');
  Logger.log('Authorized Sheets & Drive Folder: ' + folder.getName() + ' | One-Time Tab: ' + otpSheet.getName());
  return aiSheet.getName();
}

function setupAiExtractionSheetNow() {
  return authorizeDriveAndSheets();
}

function doGet(e) {
  var ss = getUserSpreadsheet();
  var userSheet = ss.getSheetByName('UserData') || ss.getSheets()[0];
  var annSheet = ss.getSheetByName('Announcements') || ss.insertSheet('Announcements');
  var aiSs = getAiSpreadsheet();
  var aiSheet = aiSs.getSheetByName(AI_EXTRACTION_SHEET_NAME) || aiSs.insertSheet(AI_EXTRACTION_SHEET_NAME);
  ensureAiExtractionHeaders(aiSheet);
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    spreadsheet: 'Bill Sub WebApp (UserData, Announcements, Cell Edits, Dedicated AI_SOA_Extractions & One-Time Bill Payment)',
    oneTimePaymentEnabled: true,
    userRows: userSheet ? userSheet.getLastRow() : 0,
    announcementRows: annSheet ? annSheet.getLastRow() : 0,
    aiExtractionRows: aiSheet ? aiSheet.getLastRow() : 0
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);
  try {
    var raw = e.postData.contents;
    var data = JSON.parse(raw);
    var userSs = getUserSpreadsheet(data.spreadsheetId);

    // 1. Update Password (ENC$ SHA-256) in UserData Col C
    if (data.action === 'updatePassword' && (data.username || data.userId)) {
      var userSheet = userSs.getSheetByName('UserData') || userSs.getSheets()[0];
      var updatedRow = -1;
      if (userSheet) {
        var uVals = userSheet.getDataRange().getValues();
        var targetUname = String(data.username || '').trim().toLowerCase();
        var targetUid = String(data.userId || '').trim().toLowerCase();
        for (var uIdx = 1; uIdx < uVals.length; uIdx++) {
          var rowUid = String(uVals[uIdx][0] || '').trim().toLowerCase();
          var rowUname = String(uVals[uIdx][1] || '').trim().toLowerCase();
          if ((targetUname && rowUname === targetUname) || (!targetUname && targetUid && rowUid === targetUid)) {
            userSheet.getRange(uIdx + 1, 3).setValue(String(data.newPassword || '').trim());
            if (data.clearDefaultPassword) {
              userSheet.getRange(uIdx + 1, 4).setValue('');
            }
            updatedRow = uIdx + 1;
            break;
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: updatedRow > 0 ? 'success' : 'not_found',
        updatedRow: updatedRow
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Save / Edit User Record, Lifecycle Status & Module Permissions (MODS) in UserData
    if (data.action === 'saveUser' && data.user) {
      var saveSheet = userSs.getSheetByName('UserData') || userSs.getSheets()[0];
      if (saveSheet) {
        var sVals = saveSheet.getDataRange().getValues();
        var uObj = data.user;
        var sUname = String(uObj.username || '').trim().toLowerCase();
        var sUid = String(uObj.userId || '').trim().toLowerCase();
        var stNorm = String(uObj.status || 'ACTIVE').trim().toUpperCase();
        var rawAcc = String(uObj.accessLevel || 'Level 1').trim();
        var modsPart = '';
        var modsM = rawAcc.match(/\|\s*MODS:[A-Z0-9_,]+/i);
        if (modsM) {
          modsPart = ' ' + modsM[0].trim();
          rawAcc = rawAcc.replace(/\s*\|\s*MODS:[A-Z0-9_,]+/i, '').trim();
        }
        var baseAccess = rawAcc.replace(/\s*\[(ACTIVE|SUSPENDED|BANNED|RETIRED)\]\s*$/i, '').trim() || 'Level 1';
        var statusTag = (stNorm === 'SUSPENDED' || stNorm === 'BANNED' || stNorm === 'RETIRED') ? (' [' + stNorm + ']') : '';
        var encodedAccess = baseAccess + statusTag + modsPart;
        var rowData = [
          uObj.userId || '',
          uObj.username || '',
          uObj.currentPassword || '',
          uObj.defaultPassword || '',
          uObj.firstName || '',
          uObj.lastName || '',
          encodedAccess
        ];
        var foundIdx = -1;
        for (var sIdx = 1; sIdx < sVals.length; sIdx++) {
          var exUid = String(sVals[sIdx][0] || '').trim().toLowerCase();
          var exUname = String(sVals[sIdx][1] || '').trim().toLowerCase();
          if ((sUname && exUname === sUname) || (sUid && exUid === sUid)) {
            foundIdx = sIdx + 1;
            break;
          }
        }
        if (foundIdx > 0) {
          saveSheet.getRange(foundIdx, 1, 1, 7).setValues([rowData]);
        } else {
          saveSheet.appendRow(rowData);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Reset User Password to Default PW (Col D) & Clear Col C
    if (data.action === 'resetPassword' && (data.username || data.userId)) {
      var resetSheet = userSs.getSheetByName('UserData') || userSs.getSheets()[0];
      if (resetSheet) {
        var rVals = resetSheet.getDataRange().getValues();
        var rUname = String(data.username || '').trim().toLowerCase();
        var rUid = String(data.userId || '').trim().toLowerCase();
        for (var rIdx = 1; rIdx < rVals.length; rIdx++) {
          var cUid = String(rVals[rIdx][0] || '').trim().toLowerCase();
          var cUname = String(rVals[rIdx][1] || '').trim().toLowerCase();
          if ((rUname && cUname === rUname) || (!rUname && rUid && cUid === rUid)) {
            resetSheet.getRange(rIdx + 1, 3).setValue('');
            resetSheet.getRange(rIdx + 1, 4).setValue(String(data.defaultPassword || '123456').trim());
            break;
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    // 4. Update Announcement in Announcements Tab
    if (data.action === 'updateAnnouncement') {
      var annSheet = userSs.getSheetByName('Announcements') || userSs.insertSheet('Announcements');
      if (annSheet.getLastRow() === 0) {
        annSheet.appendRow(['Date / ID', 'Title', 'Content', 'Action Link', 'Priority', 'Posted By']);
      }
      var rowArr = [
        data.dateOrTime || new Date().toLocaleString(),
        data.title || 'Welcome to APECHOMES Utility Portal',
        data.content || '',
        data.actionLink || 'Request Bill Payment',
        data.priority || 'Normal',
        data.postedBy || 'Administrator'
      ];
      if (annSheet.getLastRow() >= 2) {
        annSheet.getRange(2, 1, 1, 6).setValues([rowArr]);
      } else {
        annSheet.appendRow(rowArr);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    // 5a. Initialize Dedicated AI Sheet Tab & Row 1 Headers (Cols A–Q) on Demand
    if (data.action === 'initAiExtractionSheet') {
      var initAiSs = getAiSpreadsheet(data.spreadsheetId);
      var initTabName = String(data.targetSheetName || AI_EXTRACTION_SHEET_NAME).trim();
      var initAiSheet = initAiSs.getSheetByName(initTabName) || initAiSs.insertSheet(initTabName);
      ensureAiExtractionHeaders(initAiSheet);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        sheetName: initTabName,
        rows: initAiSheet.getLastRow()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 5b. Save Free AI Extracted Statement Fields to Dedicated Sheet ("AI_SOA_Extractions") Keyed by Request ID (Col A)
    if ((data.action === 'saveAiExtractedData' || data.subAction === 'saveAiExtractedData') && data.requestId) {
      var aiSs = getAiSpreadsheet(data.spreadsheetId);
      var aiTabName = String(data.targetSheetName || AI_EXTRACTION_SHEET_NAME).trim();
      var aiSheet = aiSs.getSheetByName(aiTabName) || aiSs.insertSheet(aiTabName);
      ensureAiExtractionHeaders(aiSheet);

      var targetReqId = String(data.requestId).trim();
      var aiRowValues = [
        targetReqId,
        String(data.accountNumber || ''),
        String(data.site || ''),
        String(data.biller || ''),
        String(data.cycleFrom || 'UNREADABLE'),
        String(data.cycleTo || 'UNREADABLE'),
        String(data.aiDueDate || data.dueDate || 'UNREADABLE'),
        String(data.gracePeriod || 'NOT ON BILL'),
        String(data.consumption || 'UNREADABLE'),
        String(data.arrears || 'NOT ON BILL'),
        String(data.currentAmount || 'UNREADABLE'),
        String(data.totalAmount || 'UNREADABLE'),
        String(data.amountBeforeDue || 'NOT ON BILL'),
        String(data.detectedFormat || 'Utility Statement'),
        String(data.readabilityStatus || data.legibilityStatus || 'READABLE'),
        String(data.pagesAnalyzed || data.pageCountDetected || 1),
        String(data.extractedAt || data.scannedAt || new Date().toISOString())
      ];

      // Upsert by Request ID (Column A): update existing row if found, otherwise append new row
      var aiVals = aiSheet.getDataRange().getValues();
      var foundAiRow = -1;
      for (var aIdx = 1; aIdx < aiVals.length; aIdx++) {
        if (String(aiVals[aIdx][0] || '').trim() === targetReqId) {
          foundAiRow = aIdx + 1;
          break;
        }
      }
      if (foundAiRow > 0) {
        if (!aiRowValues[1] && aiVals[foundAiRow - 1][1]) aiRowValues[1] = String(aiVals[foundAiRow - 1][1]);
        if (!aiRowValues[2] && aiVals[foundAiRow - 1][2]) aiRowValues[2] = String(aiVals[foundAiRow - 1][2]);
        if (!aiRowValues[3] && aiVals[foundAiRow - 1][3]) aiRowValues[3] = String(aiVals[foundAiRow - 1][3]);
        aiSheet.getRange(foundAiRow, 1, 1, aiRowValues.length).setValues([aiRowValues]);
      } else {
        aiSheet.appendRow(aiRowValues);
        foundAiRow = aiSheet.getLastRow();
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        requestId: targetReqId,
        sheetName: aiTabName,
        row: foundAiRow
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 6. Edit Billing Details in "Bill Sub WebApp Requests" -> Request Bill Payments (Text Cells Only)
    if (data.action === 'updateBillingDetails' && data.requestId) {
      var utilSs = getUtilitySpreadsheet();
      var payEditSheet = utilSs.getSheetByName('Request Bill Payments');
      if (payEditSheet) {
        var pVals = payEditSheet.getDataRange().getValues();
        for (var pIdx = 1; pIdx < pVals.length; pIdx++) {
          if (String(pVals[pIdx][0]).trim() === String(data.requestId).trim()) {
            var rNum = pIdx + 1;
            if (data.requestorName !== undefined) payEditSheet.getRange(rNum, 3).setValue(data.requestorName);
            if (data.viberNumber !== undefined) payEditSheet.getRange(rNum, 4).setValue(data.viberNumber);
            if (data.billMonth !== undefined) payEditSheet.getRange(rNum, 5).setValue(data.billMonth);
            if (data.billType !== undefined) payEditSheet.getRange(rNum, 6).setValue(data.billType);
            if (data.dueDate !== undefined) payEditSheet.getRange(rNum, 7).setValue(data.dueDate);
            if (data.site !== undefined) payEditSheet.getRange(rNum, 8).setValue(data.site);
            if (data.biller !== undefined) payEditSheet.getRange(rNum, 9).setValue(data.biller);
            if (data.accountNumber !== undefined) payEditSheet.getRange(rNum, 10).setValue(data.accountNumber);
            break;
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    // 7. Edit Enrollment Details in "Bill Sub WebApp Requests" -> New Bill Endorsement (Text Cells Only)
    if (data.action === 'updateEnrollmentDetails' && data.requestId) {
      var utilSs2 = getUtilitySpreadsheet();
      var enrEditSheet = utilSs2.getSheetByName('New Bill Endorsement');
      if (enrEditSheet) {
        var eVals = enrEditSheet.getDataRange().getValues();
        for (var eIdx = 1; eIdx < eVals.length; eIdx++) {
          if (String(eVals[eIdx][0]).trim() === String(data.requestId).trim()) {
            var erNum = eIdx + 1;
            if (data.email !== undefined) enrEditSheet.getRange(erNum, 3).setValue(data.email);
            if (data.viberNumber !== undefined) enrEditSheet.getRange(erNum, 4).setValue(data.viberNumber);
            if (data.accountNumber !== undefined) enrEditSheet.getRange(erNum, 5).setValue(data.accountNumber);
            if (data.site !== undefined) enrEditSheet.getRange(erNum, 6).setValue(data.site);
            if (data.biller !== undefined) enrEditSheet.getRange(erNum, 7).setValue(data.biller);
            break;
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    // 8. One-Time Bill Payment (Tab: "One Time Bill Payments" in 1WI4CA4hy1s3oyCZLvgDVA1SeJSj9gN2BfLLeRpUmZDA + Personal Drive Folder 1u7lR6OCbzoYfmLXe4TGeQ2LyGJiLHDa5)
    var ONE_TIME_SHEET_NAME = 'One Time Bill Payments';
    var DEFAULT_OTP_FOLDER_ID = '1u7lR6OCbzoYfmLXe4TGeQ2LyGJiLHDa5';
    var ONE_TIME_HEADERS = [
      'Request ID', 'User ID', 'Requestor', 'Viber Number', 'Account No', 'Site', 'Biller',
      'Approved Request Letter', 'Current Billing / SOA', 'Management Approved RLF',
      'One-Time Acknowledgement', 'Status', 'RFP Number', 'RFP Date', 'Amount', 'Date Paid', 'Date Submitted'
    ];
    function ensureOtpSheet() {
      var uSs = getUtilitySpreadsheet();
      var otpS = uSs.getSheetByName(ONE_TIME_SHEET_NAME) || uSs.insertSheet(ONE_TIME_SHEET_NAME);
      if (otpS.getLastRow() === 0) {
        otpS.appendRow(ONE_TIME_HEADERS);
        otpS.getRange(1, 1, 1, ONE_TIME_HEADERS.length).setFontWeight('bold');
        otpS.setFrozenRows(1);
      }
      return otpS;
    }
    function saveOtpBase64ToFolder(b64, fName, mime, folderId) {
      if (!b64) return '';
      try {
        var clean = String(b64).indexOf(',') !== -1 ? String(b64).split(',')[1] : String(b64);
        var blob = Utilities.newBlob(Utilities.base64Decode(clean), mime || 'application/pdf', fName || 'OneTime_Doc.pdf');
        var folder = DriveApp.getFolderById(folderId || DEFAULT_OTP_FOLDER_ID);
        var file = folder.createFile(blob);
        try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (sErr) {}
        return 'https://drive.google.com/file/d/' + file.getId() + '/view';
      } catch (fErr) {
        return '';
      }
    }

    if (data.action === 'init_onetime_sheet') {
      var otpInitSheet = ensureOtpSheet();
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        sheetName: ONE_TIME_SHEET_NAME,
        rows: otpInitSheet.getLastRow()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'submitOneTimePayment') {
      var otpSheet = ensureOtpSheet();
      var otpReqId = String(data.requestId || ('OTP-' + Utilities.formatDate(new Date(), 'GMT+8', 'yyyyMMdd') + '-' + Math.floor(1000 + Math.random() * 9000))).trim();
      var otpFolderId = String(data.targetFolderId || DEFAULT_OTP_FOLDER_ID).trim();
      var otpFolderUrl = 'https://drive.google.com/drive/folders/' + otpFolderId;

      var lObj = data.letterFile || {};
      var sObj = data.soaFile || {};
      var rObj = data.rlfFile || {};
      var lUrl = saveOtpBase64ToFolder(lObj.base64 || data.letterFileBase64, lObj.name || data.requestLetterFileName, lObj.type || data.letterMimeType, otpFolderId) || data.driveLetterFolderUrl || otpFolderUrl;
      var sUrl = saveOtpBase64ToFolder(sObj.base64 || data.soaFileBase64, sObj.name || data.soaFileName, sObj.type || data.soaMimeType, otpFolderId) || data.driveSoaFolderUrl || otpFolderUrl;
      var rUrl = saveOtpBase64ToFolder(rObj.base64 || data.rlfFileBase64, rObj.name || data.rlfFileName, rObj.type || data.rlfMimeType, otpFolderId) || data.driveRlfFolderUrl || otpFolderUrl;

      var colH = lUrl.indexOf('/file/d/') !== -1 ? ('=HYPERLINK("' + lUrl + '", "' + lUrl + '")') : String(data.requestLetterFileName || lUrl);
      var colI = sUrl.indexOf('/file/d/') !== -1 ? ('=HYPERLINK("' + sUrl + '", "' + sUrl + '")') : String(data.soaFileName || sUrl);
      var colJ = rUrl.indexOf('/file/d/') !== -1 ? ('=HYPERLINK("' + rUrl + '", "' + rUrl + '")') : String(data.rlfFileName || rUrl);

      var otpRow = [
        otpReqId,
        String(data.userId || ''),
        String(data.email || ''),
        String(data.viberNumber || ''),
        String(data.accountNumber || ''),
        String(data.site || ''),
        String(data.biller || ''),
        colH,
        colI,
        colJ,
        String(data.acknowledgementText || 'YES - ONE-TIME PAYMENT ONLY (NO SUCCEEDING PAYMENTS)'),
        String(data.status || 'PENDING').toUpperCase(),
        String(data.rfpNumber || ''),
        String(data.rfpDate || ''),
        String(data.amount || ''),
        String(data.datePaid || ''),
        String(data.submittedAt || new Date().toLocaleString())
      ];

      var existingOtpVals = otpSheet.getDataRange().getValues();
      var foundOtpRow = -1;
      for (var oIdx = 1; oIdx < existingOtpVals.length; oIdx++) {
        if (String(existingOtpVals[oIdx][0] || '').trim() === otpReqId) {
          foundOtpRow = oIdx + 1;
          break;
        }
      }
      if (foundOtpRow > 0) {
        otpSheet.getRange(foundOtpRow, 1, 1, otpRow.length).setValues([otpRow]);
      } else {
        otpSheet.appendRow(otpRow);
        foundOtpRow = otpSheet.getLastRow();
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        requestId: otpReqId,
        row: foundOtpRow,
        letterUrl: lUrl,
        soaUrl: sUrl,
        rlfUrl: rUrl
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if ((data.action === 'updateOneTimePaymentDetails' || data.action === 'updateStatus') && data.requestId) {
      var otpUpdSheet = ensureOtpSheet();
      var otpUpdVals = otpUpdSheet.getDataRange().getValues();
      for (var uRowIdx = 1; uRowIdx < otpUpdVals.length; uRowIdx++) {
        if (String(otpUpdVals[uRowIdx][0] || '').trim() === String(data.requestId).trim()) {
          var rowN = uRowIdx + 1;
          if (data.email !== undefined) otpUpdSheet.getRange(rowN, 3).setValue(data.email);
          if (data.viberNumber !== undefined) otpUpdSheet.getRange(rowN, 4).setValue(data.viberNumber);
          if (data.accountNumber !== undefined) otpUpdSheet.getRange(rowN, 5).setValue(data.accountNumber);
          if (data.site !== undefined) otpUpdSheet.getRange(rowN, 6).setValue(data.site);
          if (data.biller !== undefined) otpUpdSheet.getRange(rowN, 7).setValue(data.biller);
          if (data.status !== undefined) otpUpdSheet.getRange(rowN, 12).setValue(String(data.status).toUpperCase());
          if (data.rfpNumber !== undefined) otpUpdSheet.getRange(rowN, 13).setValue(data.rfpNumber);
          if (data.rfpDate !== undefined) otpUpdSheet.getRange(rowN, 14).setValue(data.rfpDate);
          if (data.amount !== undefined) otpUpdSheet.getRange(rowN, 15).setValue(data.amount);
          if (data.datePaid !== undefined) otpUpdSheet.getRange(rowN, 16).setValue(data.datePaid);
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', requestId: data.requestId })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}