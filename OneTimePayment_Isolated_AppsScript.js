/**
 * =========================================================================
 * APEC HOMES UTILITY PORTAL - ISOLATED ONE-TIME BILL PAYMENT APPS SCRIPT (v2.0 PRODUCTION)
 * =========================================================================
 * PURPOSE:
 * 100% Isolated Google Apps Script dedicated EXCLUSIVELY to the
 * "One-Time Bill Payment" module (Sheet Tab: "One Time Bill Payments").
 * Zero contact with Bill Sub or Enrollment Sub upload scripts.
 *
 * KEY CAPABILITIES:
 * 1. Dynamic Drive Folder Assignment:
 *    - Pre-configured for Personal Google Drive Folder: 1u7lR6OCbzoYfmLXe4TGeQ2LyGJiLHDa5
 *    - Admin can also assign or change the Google Drive Folder ID anytime from the
 *      portal UI (saved persistently in ScriptProperties).
 * 2. Drive Ownership Preservation & Zero Email Spam:
 *    - Deploy this script under the Google Drive Owner's account
 *      (Execute as: "Me", Who has access: "Anyone") so all 3 uploaded files
 *      are owned by the Drive Owner's account inside folder 1u7lR6OCbzoYfmLXe4TGeQ2LyGJiLHDa5.
 *    - Uses file.setSharing(ANYONE_WITH_LINK, VIEW) ONLY — never calls file.addEditor(),
 *      preventing Google Drive from sending "File shared with you" emails on every upload.
 * 3. Standardized Unique Upload Filenames:
 *    - Automatically formats and matches:
 *      (a) <RequestID>_<Site>_<AccountNo>_<Biller>_RequestLetter.<ext>
 *      (b) <RequestID>_<Site>_<AccountNo>_<Biller>_SOA.<ext>
 *      (c) <RequestID>_<Site>_<AccountNo>_<Biller>_MgmtApprovedRLF.<ext>
 * =========================================================================
 */

var UTILITY_SPREADSHEET_ID = '1WI4CA4hy1s3oyCZLvgDVA1SeJSj9gN2BfLLeRpUmZDA';
var ONE_TIME_SHEET_NAME = 'One Time Bill Payments';
var DEFAULT_ONETIME_DRIVE_FOLDER_ID = '1u7lR6OCbzoYfmLXe4TGeQ2LyGJiLHDa5';
var DESIGNATED_DRIVE_OWNER_EMAIL = 'lasarmiento.apec@gmail.com';

function getUtilitySpreadsheet() {
  try {
    return SpreadsheetApp.openById(UTILITY_SPREADSHEET_ID);
  } catch (e) {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

function getAssignedOneTimeFolderId(payloadFolderId) {
  if (payloadFolderId && String(payloadFolderId).trim().length >= 15) {
    try {
      PropertiesService.getScriptProperties().setProperty('ONETIME_DRIVE_FOLDER_ID', String(payloadFolderId).trim());
    } catch (e) {}
    return String(payloadFolderId).trim();
  }
  try {
    var saved = PropertiesService.getScriptProperties().getProperty('ONETIME_DRIVE_FOLDER_ID');
    if (saved && saved.trim().length >= 15) return saved.trim();
  } catch (e2) {}
  return DEFAULT_ONETIME_DRIVE_FOLDER_ID;
}

function getDesignatedDriveOwnerEmail(payloadOwnerEmail) {
  if (payloadOwnerEmail && String(payloadOwnerEmail).indexOf('@') > -1) {
    try {
      PropertiesService.getScriptProperties().setProperty('DESIGNATED_DRIVE_OWNER_EMAIL', String(payloadOwnerEmail).trim());
    } catch (e) {}
    return String(payloadOwnerEmail).trim();
  }
  try {
    var saved = PropertiesService.getScriptProperties().getProperty('DESIGNATED_DRIVE_OWNER_EMAIL');
    if (saved && saved.indexOf('@') > -1) return saved.trim();
  } catch (e2) {}
  return DESIGNATED_DRIVE_OWNER_EMAIL;
}

function buildStandardOneTimeFileNames(data) {
  var reqId = String(data.requestId || 'OTP-REQ').trim();
  var cleanSite = String(data.site || 'SITE').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'SITE';
  var cleanAcc = String(data.accountNumber || 'ACC').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'ACC';
  var cleanBiller = String(data.biller || 'BILLER').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 16) || 'BILLER';
  var basePrefix = reqId + '_' + cleanSite + '_' + cleanAcc + '_' + cleanBiller;

  return {
    letterName: data.requestLetterFileName || (basePrefix + '_RequestLetter.pdf'),
    soaName: data.soaFileName || (basePrefix + '_SOA.pdf'),
    rlfName: data.rlfFileName || (basePrefix + '_MgmtApprovedRLF.pdf')
  };
}

/**
 * Visiting the Web App URL in a browser (or calling GET) automatically creates
 * the "One Time Bill Payments" tab and all 17 columns (A–Q) in
 * Bill Sub WebApp Requests (1WI4CA4hy1s3oyCZLvgDVA1SeJSj9gN2BfLLeRpUmZDA).
 */
function doGet(e) {
  var ss = getUtilitySpreadsheet();
  var oneTimeSheet = ss.getSheetByName(ONE_TIME_SHEET_NAME) || ss.insertSheet(ONE_TIME_SHEET_NAME);
  ensureOneTimePaymentHeaders(oneTimeSheet);

  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    isolatedModule: 'ONETIME_PAYMENT',
    sheetName: ONE_TIME_SHEET_NAME,
    assignedFolderId: getAssignedOneTimeFolderId(''),
    designatedDriveOwner: getDesignatedDriveOwnerEmail(''),
    message: 'Isolated One-Time Bill Payment Webhook (v2.0 Production) is ACTIVE! Tab "One Time Bill Payments" and all 17 columns (A-Q) are ready.',
    oneTimeRows: oneTimeSheet.getLastRow()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    var raw = e.postData.contents;
    var data = JSON.parse(raw);
    var ss = getUtilitySpreadsheet();

    // 0. ACTION: Assign / Save Drive Folder ID & Designated Drive Owner Email
    if (data.action === 'setOneTimeDriveFolder') {
      var savedFolderId = getAssignedOneTimeFolderId(data.targetFolderId);
      var savedOwner = getDesignatedDriveOwnerEmail(data.driveOwnerEmail);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        targetFolderId: savedFolderId,
        driveOwnerEmail: savedOwner,
        message: 'Assigned One-Time Drive Folder ID (' + savedFolderId + ') saved in Apps Script properties.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 1. ACTION: Initialize / Verify "One Time Bill Payments" Tab & 17 Columns
    if (data.action === 'init_onetime_sheet' || data.action === 'init_sheet' || data.action === 'checkHeaders') {
      var oneTimeSheet = ss.getSheetByName(ONE_TIME_SHEET_NAME) || ss.insertSheet(ONE_TIME_SHEET_NAME);
      ensureOneTimePaymentHeaders(oneTimeSheet);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        sheetName: ONE_TIME_SHEET_NAME,
        message: 'Tab "One Time Bill Payments" and all 17 columns (A-Q) verified in Bill Sub WebApp Requests.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. ACTION: Update Status (PENDING, CANCEL, REJECTED, WITH RFP, FOR PAYMENT, PAID) in Col L (Col 12)
    if (data.action === 'updateStatus' && data.requestId) {
      var reqIdStr = String(data.requestId).trim();
      var targetSheet = ss.getSheetByName(ONE_TIME_SHEET_NAME) || ss.insertSheet(ONE_TIME_SHEET_NAME);
      ensureOneTimePaymentHeaders(targetSheet);
      var vals = targetSheet.getDataRange().getValues();
      var updatedRow = -1;
      for (var i = 1; i < vals.length; i++) {
        if (String(vals[i][0]).trim() === reqIdStr) {
          targetSheet.getRange(i + 1, 12).setValue(String(data.status || 'PENDING').trim().toUpperCase());
          updatedRow = i + 1;
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        updatedRow: updatedRow
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. ACTION: Update One-Time Payment Details & Accounting Columns (RFP Number, RFP Date, Amount, Date Paid, File Links)
    if (data.action === 'updateOneTimePaymentDetails' && data.requestId) {
      var otpSheet = ss.getSheetByName(ONE_TIME_SHEET_NAME) || ss.insertSheet(ONE_TIME_SHEET_NAME);
      ensureOneTimePaymentHeaders(otpSheet);
      var otpVals = otpSheet.getDataRange().getValues();
      var targetOtpId = String(data.requestId).trim();
      var updatedOtpRow = -1;
      for (var oIdx = 1; oIdx < otpVals.length; oIdx++) {
        if (String(otpVals[oIdx][0]).trim() === targetOtpId) {
          var rowNum = oIdx + 1;
          if (data.email !== undefined) otpSheet.getRange(rowNum, 3).setValue(data.email);
          if (data.viberNumber !== undefined) otpSheet.getRange(rowNum, 4).setValue(data.viberNumber);
          if (data.accountNumber !== undefined) otpSheet.getRange(rowNum, 5).setValue(data.accountNumber);
          if (data.site !== undefined) otpSheet.getRange(rowNum, 6).setValue(data.site);
          if (data.biller !== undefined) otpSheet.getRange(rowNum, 7).setValue(data.biller);
          if (data.driveLetterFolderUrl && String(data.driveLetterFolderUrl).indexOf('http') === 0) {
            otpSheet.getRange(rowNum, 8).setValue('=HYPERLINK("' + data.driveLetterFolderUrl + '", "' + data.driveLetterFolderUrl + '")');
          }
          if (data.driveSoaFolderUrl && String(data.driveSoaFolderUrl).indexOf('http') === 0) {
            otpSheet.getRange(rowNum, 9).setValue('=HYPERLINK("' + data.driveSoaFolderUrl + '", "' + data.driveSoaFolderUrl + '")');
          }
          if (data.driveRlfFolderUrl && String(data.driveRlfFolderUrl).indexOf('http') === 0) {
            otpSheet.getRange(rowNum, 10).setValue('=HYPERLINK("' + data.driveRlfFolderUrl + '", "' + data.driveRlfFolderUrl + '")');
          }
          if (data.rfpNumber !== undefined) otpSheet.getRange(rowNum, 13).setValue(data.rfpNumber);
          if (data.rfpDate !== undefined) otpSheet.getRange(rowNum, 14).setValue(data.rfpDate);
          if (data.amount !== undefined) otpSheet.getRange(rowNum, 15).setValue(data.amount);
          if (data.datePaid !== undefined) otpSheet.getRange(rowNum, 16).setValue(data.datePaid);

          var curStatus = String(data.status !== undefined ? data.status : otpSheet.getRange(rowNum, 12).getValue() || 'PENDING').trim().toUpperCase();
          var curRfp = String(data.rfpNumber !== undefined ? data.rfpNumber : otpSheet.getRange(rowNum, 13).getValue() || '').trim();
          var curPaid = String(data.datePaid !== undefined ? data.datePaid : otpSheet.getRange(rowNum, 16).getValue() || '').trim();
          var nextStatus = curStatus;
          if (curStatus !== 'CANCEL' && curStatus !== 'REJECTED') {
            if (curPaid.length > 0) nextStatus = 'PAID';
            else if (curRfp.length > 0 && curStatus !== 'FOR PAYMENT') nextStatus = 'WITH RFP';
            else if (!curRfp && !curPaid && curStatus !== 'FOR PAYMENT') nextStatus = 'PENDING';
          }
          otpSheet.getRange(rowNum, 12).setValue(nextStatus);
          updatedOtpRow = rowNum;
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: updatedOtpRow > 0 ? 'success' : 'not_found',
        updatedRow: updatedOtpRow
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 4. ACTION: Admin Trigger to Auto-Link / Sync Uploaded Files in Google Drive by Unique Filename
    if (data.action === 'linkOneTimeUploads') {
      var linkSheet = ss.getSheetByName(ONE_TIME_SHEET_NAME) || ss.insertSheet(ONE_TIME_SHEET_NAME);
      ensureOneTimePaymentHeaders(linkSheet);
      var lVals = linkSheet.getDataRange().getValues();
      var folderId = getAssignedOneTimeFolderId(data.targetFolderId);
      var filterReqId = data.requestId ? String(data.requestId).trim() : '';
      var linkedCount = 0;

      var fileEntries = [];
      try {
        var mainFolder = DriveApp.getFolderById(folderId);
        var fIter = mainFolder.getFiles();
        while (fIter.hasNext()) {
          var f = fIter.next();
          fileEntries.push({ name: f.getName(), url: 'https://drive.google.com/file/d/' + f.getId() + '/view' });
        }
      } catch (eFolder) {}

      try {
        var fbIter = DriveApp.getFoldersByName('APEC One Time Bill Payments');
        if (fbIter.hasNext()) {
          var fbFiles = fbIter.next().getFiles();
          while (fbFiles.hasNext()) {
            var f2 = fbFiles.next();
            fileEntries.push({ name: f2.getName(), url: 'https://drive.google.com/file/d/' + f2.getId() + '/view' });
          }
        }
      } catch (eFb) {}

      for (var rIdx = 1; rIdx < lVals.length; rIdx++) {
        var rowId = String(lVals[rIdx][0] || '').trim();
        if (!rowId || (filterReqId && rowId !== filterReqId)) continue;
        var rowAcc = String(lVals[rIdx][4] || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        var rowUpdated = false;

        for (var k = 0; k < fileEntries.length; k++) {
          var fname = fileEntries[k].name;
          var fnameLower = fname.toLowerCase();
          var furl = fileEntries[k].url;
          if (fname.indexOf(rowId) > -1 || (rowAcc && fnameLower.indexOf(rowAcc) > -1)) {
            if (fnameLower.indexOf('requestletter') > -1 || fnameLower.indexOf('letter') > -1) {
              linkSheet.getRange(rIdx + 1, 8).setValue('=HYPERLINK("' + furl + '", "' + furl + '")');
              rowUpdated = true;
            } else if (fnameLower.indexOf('soa') > -1 || fnameLower.indexOf('billing') > -1) {
              linkSheet.getRange(rIdx + 1, 9).setValue('=HYPERLINK("' + furl + '", "' + furl + '")');
              rowUpdated = true;
            } else if (fnameLower.indexOf('rlf') > -1 || fnameLower.indexOf('mgmt') > -1) {
              linkSheet.getRange(rIdx + 1, 10).setValue('=HYPERLINK("' + furl + '", "' + furl + '")');
              rowUpdated = true;
            }
          }
        }
        if (rowUpdated) linkedCount++;
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        linkedCount: linkedCount,
        targetFolderId: folderId,
        message: 'Linked Drive uploads for ' + linkedCount + ' One-Time Payment record(s) from folder ' + folderId
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 5. SUBMISSION: One-Time Bill Payment (OTP-...)
    if (data.requestId && String(data.requestId).indexOf('OTP-') === 0) {
      var otpSubSheet = ss.getSheetByName(ONE_TIME_SHEET_NAME) || ss.insertSheet(ONE_TIME_SHEET_NAME);
      ensureOneTimePaymentHeaders(otpSubSheet);

      // Idempotency guard: prevent duplicate rows if the same requestId is received twice
      var otpExisting = otpSubSheet.getDataRange().getValues();
      for (var otIdx = 1; otIdx < otpExisting.length; otIdx++) {
        if (String(otpExisting[otIdx][0] || '').trim() === String(data.requestId).trim()) {
          return ContentService.createTextOutput(JSON.stringify({
            status: 'success',
            deduplicated: true,
            requestId: data.requestId
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }

      var OTP_FOLDER_ID = getAssignedOneTimeFolderId(data.targetFolderId);
      var uniqueNames = buildStandardOneTimeFileNames(data);

      var otpLetterB64 = (data.letterFile && (data.letterFile.base64 || data.letterFile.data)) || data.letterFileBase64 || '';
      var otpLetterType = (data.letterFile && (data.letterFile.type || data.letterFile.mimeType)) || 'application/pdf';
      var otpLetterUrl = uploadToDriveSafely(OTP_FOLDER_ID, 'APEC One Time Bill Payments', otpLetterB64, otpLetterType, uniqueNames.letterName);

      var otpSoaB64 = (data.soaFile && (data.soaFile.base64 || data.soaFile.data)) || data.soaFileBase64 || '';
      var otpSoaType = (data.soaFile && (data.soaFile.type || data.soaFile.mimeType)) || 'application/pdf';
      var otpSoaUrl = uploadToDriveSafely(OTP_FOLDER_ID, 'APEC One Time Bill Payments', otpSoaB64, otpSoaType, uniqueNames.soaName);

      var otpRlfB64 = (data.rlfFile && (data.rlfFile.base64 || data.rlfFile.data)) || data.rlfFileBase64 || '';
      var otpRlfType = (data.rlfFile && (data.rlfFile.type || data.rlfFile.mimeType)) || 'application/pdf';
      var otpRlfUrl = uploadToDriveSafely(OTP_FOLDER_ID, 'APEC One Time Bill Payments', otpRlfB64, otpRlfType, uniqueNames.rlfName);

      var otpLetterCell = otpLetterUrl
        ? ('=HYPERLINK("' + otpLetterUrl + '", "' + otpLetterUrl + '")')
        : uniqueNames.letterName;
      var otpSoaCell = otpSoaUrl
        ? ('=HYPERLINK("' + otpSoaUrl + '", "' + otpSoaUrl + '")')
        : uniqueNames.soaName;
      var otpRlfCell = otpRlfUrl
        ? ('=HYPERLINK("' + otpRlfUrl + '", "' + otpRlfUrl + '")')
        : uniqueNames.rlfName;

      otpSubSheet.appendRow([
        data.requestId,
        data.userId || '',
        data.email || '',
        data.viberNumber || '',
        data.accountNumber || '',
        data.site || '',
        data.biller || '',
        otpLetterCell,
        otpSoaCell,
        otpRlfCell,
        data.acknowledgementText || data.oneTimeAcknowledgementText || 'YES - ONE-TIME PAYMENT ONLY (NO SUCCEEDING PAYMENTS)',
        String(data.status || 'PENDING').trim().toUpperCase(),
        data.rfpNumber || '',
        data.rfpDate || '',
        data.amount || '',
        data.datePaid || '',
        data.submittedAt || new Date().toLocaleString()
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        requestId: data.requestId,
        letterUrl: otpLetterUrl,
        soaUrl: otpSoaUrl,
        rlfUrl: otpRlfUrl,
        preparedUniqueNames: uniqueNames
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function uploadToDriveSafely(targetFolderId, fallbackFolderName, rawBase64, mimeType, fileName) {
  if (!rawBase64) return '';
  try {
    var b64 = String(rawBase64);
    if (b64.indexOf(',') > -1) {
      b64 = b64.substring(b64.indexOf(',') + 1);
    }
    b64 = b64.replace(/\s+/g, '');
    if (!b64) return '';

    var bytes = Utilities.base64Decode(b64);
    var mime = mimeType || 'application/pdf';
    var blob = Utilities.newBlob(bytes, mime, fileName);
    var file = null;

    if (targetFolderId) {
      try {
        var folder = DriveApp.getFolderById(targetFolderId);
        if (folder) file = folder.createFile(blob);
      } catch (errFolder) {}
    }

    if (!file) {
      try {
        var iter = DriveApp.getFoldersByName(fallbackFolderName);
        var f2 = iter.hasNext() ? iter.next() : DriveApp.createFolder(fallbackFolderName);
        file = f2.createFile(blob);
      } catch (errNamed) {}
    }

    if (!file) {
      try {
        file = DriveApp.createFile(blob);
      } catch (errRoot) {}
    }

    if (file) {
      try {
        // Sets link viewing silently without sending any "File shared with you" email notification
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (errShare) {}
      return 'https://drive.google.com/file/d/' + file.getId() + '/view';
    }
  } catch (errMain) {}
  return '';
}

function ensureOneTimePaymentHeaders(sheet) {
  var headers = [
    'Request ID',
    'User ID',
    'Requestor',
    'Viber Number',
    'Account No',
    'Site',
    'Biller',
    'Approved Request Letter',
    'Current Billing / SOA',
    'Management Approved RLF',
    'One-Time Acknowledgement',
    'Status',
    'RFP Number',
    'RFP Date',
    'Amount',
    'Date Paid',
    'Date Submitted'
  ];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e2e8f0');
    sheet.setFrozenRows(1);
    return;
  }
  var firstCell = String(sheet.getRange(1, 1).getValue()).trim();
  if (firstCell !== headers[0]) {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e2e8f0');
    sheet.setFrozenRows(1);
  }
}
