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

/**
 * STEP 1 (ONE-TIME AUTHORIZATION):
 * Select "authorizeDriveAndSheets" in the top toolbar of script.google.com and click "Run" (▶) once.
 * Click "Review Permissions" -> choose your Google account -> "Advanced" -> "Go to ... (unsafe)" -> "Allow".
 * This grants your Web App permission to create files in Drive folder 1u7lR6OCbzoYfmLXe4TGeQ2LyGJiLHDa5
 * and write rows to "One Time Bill Payments" in spreadsheet 1WI4CA4hy1s3oyCZLvgDVA1SeJSj9gN2BfLLeRpUmZDA.
 */
function authorizeDriveAndSheets() {
  var ss = SpreadsheetApp.openById(UTILITY_SPREADSHEET_ID);
  var sheet = ss.getSheetByName(ONE_TIME_SHEET_NAME) || ss.insertSheet(ONE_TIME_SHEET_NAME);
  ensureOneTimePaymentHeaders(sheet);
  var folder = DriveApp.getFolderById(DEFAULT_ONETIME_DRIVE_FOLDER_ID);
  Logger.log('SUCCESS! Authorized Spreadsheet: ' + ss.getName() + ' | Tab: ' + sheet.getName() + ' | Drive Folder: ' + folder.getName());
}

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
    scriptVersion: 'v3.6.0-ai-sin-match',
    isolatedModule: 'ONETIME_PAYMENT',
    oneTimePaymentEnabled: true,
    oneTimeSequentialUploadEnabled: true,
    sheetName: ONE_TIME_SHEET_NAME,
    assignedFolderId: getAssignedOneTimeFolderId(''),
    designatedDriveOwner: getDesignatedDriveOwnerEmail(''),
    message: 'Isolated One-Time Bill Payment Webhook (v3.6.0 Production — Strict Verification) is ACTIVE! Tab "One Time Bill Payments" and all 17 columns (A-Q) are ready.',
    oneTimeRows: oneTimeSheet.getLastRow()
  })).setMimeType(ContentService.MimeType.JSON);
}

function isDirectDriveFileUrl(u) {
  if (!u) return false;
  var s = String(u).trim();
  return /^https?:\/\/drive\.google\.com\/(file\/d\/[a-zA-Z0-9_-]+|open\?id=[a-zA-Z0-9_-]+)/i.test(s);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Empty POST body received by One-Time Payment Apps Script.'
      })).setMimeType(ContentService.MimeType.JSON);
    }
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
      SpreadsheetApp.flush();
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        sheetName: ONE_TIME_SHEET_NAME,
        rows: oneTimeSheet.getLastRow(),
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
      SpreadsheetApp.flush();
      return ContentService.createTextOutput(JSON.stringify({
        status: updatedRow > 0 ? 'success' : 'error',
        updatedRow: updatedRow,
        message: updatedRow > 0 ? 'Status updated.' : 'Request ID not found: ' + reqIdStr
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
          if (isDirectDriveFileUrl(data.driveLetterFolderUrl)) {
            otpSheet.getRange(rowNum, 8).setValue('=HYPERLINK("' + data.driveLetterFolderUrl + '", "' + data.driveLetterFolderUrl + '")');
          }
          if (isDirectDriveFileUrl(data.driveSoaFolderUrl)) {
            otpSheet.getRange(rowNum, 9).setValue('=HYPERLINK("' + data.driveSoaFolderUrl + '", "' + data.driveSoaFolderUrl + '")');
          }
          if (isDirectDriveFileUrl(data.driveRlfFolderUrl)) {
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
      SpreadsheetApp.flush();
      return ContentService.createTextOutput(JSON.stringify({
        status: updatedOtpRow > 0 ? 'success' : 'error',
        updatedRow: updatedOtpRow,
        message: updatedOtpRow > 0 ? 'Details updated.' : 'Request ID not found: ' + targetOtpId
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
      var mainFolder = DriveApp.getFolderById(folderId);
      var fIter = mainFolder.getFiles();
      while (fIter.hasNext()) {
        var f = fIter.next();
        fileEntries.push({ name: f.getName(), url: 'https://drive.google.com/file/d/' + f.getId() + '/view' });
      }

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
      SpreadsheetApp.flush();

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        linkedCount: linkedCount,
        targetFolderId: folderId,
        message: 'Linked Drive uploads for ' + linkedCount + ' One-Time Payment record(s) from folder ' + folderId
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 5a. ACTION: Upload a Single One-Time Attachment Sequentially (Prevents 3-File Payload/Timeout Failures)
    if (data.action === 'uploadOneTimeFile') {
      var upFolderId = getAssignedOneTimeFolderId(data.targetFolderId);
      var fObj = data.file || {};
      var b64 = fObj.base64 || data.fileBase64 || data.base64 || '';
      var fName = fObj.name || data.fileName || ('OTP_' + new Date().getTime() + '.pdf');
      var fMime = fObj.type || fObj.mimeType || data.mimeType || 'application/pdf';
      var cachedUpFolder = resolveAndShareTargetFolderOnce(upFolderId);
      var uploaded = saveOtpBase64ToFolder(b64, fName, fMime, cachedUpFolder, upFolderId);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        requestId: String(data.requestId || ''),
        docType: String(data.docType || ''),
        fileId: uploaded.fileId,
        fileName: fName,
        fileUrl: uploaded.fileUrl,
        folderId: upFolderId
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 5b. ACTION: Finalize / Submit One-Time Bill Payment Row ("submitOneTimePayment")
    if (data.action === 'submitOneTimePayment' || (!data.action && data.requestId && String(data.requestId).indexOf('OTP-') === 0)) {
      var otpSubSheet = ss.getSheetByName(ONE_TIME_SHEET_NAME) || ss.insertSheet(ONE_TIME_SHEET_NAME);
      ensureOneTimePaymentHeaders(otpSubSheet);

      var otpReqId = String(data.requestId || ('OTP-' + Utilities.formatDate(new Date(), 'GMT+8', 'yyyyMMdd') + '-' + Math.floor(1000 + Math.random() * 9000))).trim();
      var OTP_FOLDER_ID = getAssignedOneTimeFolderId(data.targetFolderId);
      var uniqueNames = buildStandardOneTimeFileNames(data);

      // Accept pre-uploaded direct Drive file URLs OR upload inline base64 strictly (throwing exact Drive errors)
      var lObj = data.letterFile || {};
      var sObj = data.soaFile || {};
      var rObj = data.rlfFile || {};
      var otpLetterB64 = lObj.base64 || lObj.data || data.letterFileBase64 || '';
      var otpSoaB64 = sObj.base64 || sObj.data || data.soaFileBase64 || '';
      var otpRlfB64 = rObj.base64 || rObj.data || data.rlfFileBase64 || '';

      var cachedOtpFolder = (otpLetterB64 || otpSoaB64 || otpRlfB64) ? resolveAndShareTargetFolderOnce(OTP_FOLDER_ID) : null;

      var otpLetterUrl = isDirectDriveFileUrl(data.letterUrl)
        ? String(data.letterUrl).trim()
        : (isDirectDriveFileUrl(data.driveLetterFolderUrl)
            ? String(data.driveLetterFolderUrl).trim()
            : (otpLetterB64 ? saveOtpBase64ToFolder(otpLetterB64, lObj.name || uniqueNames.letterName, lObj.type || lObj.mimeType || data.letterMimeType, cachedOtpFolder, OTP_FOLDER_ID).fileUrl : ''));

      var otpSoaUrl = isDirectDriveFileUrl(data.soaUrl)
        ? String(data.soaUrl).trim()
        : (isDirectDriveFileUrl(data.driveSoaFolderUrl)
            ? String(data.driveSoaFolderUrl).trim()
            : (otpSoaB64 ? saveOtpBase64ToFolder(otpSoaB64, sObj.name || uniqueNames.soaName, sObj.type || sObj.mimeType || data.soaMimeType, cachedOtpFolder, OTP_FOLDER_ID).fileUrl : ''));

      var otpRlfUrl = isDirectDriveFileUrl(data.rlfUrl)
        ? String(data.rlfUrl).trim()
        : (isDirectDriveFileUrl(data.driveRlfFolderUrl)
            ? String(data.driveRlfFolderUrl).trim()
            : (otpRlfB64 ? saveOtpBase64ToFolder(otpRlfB64, rObj.name || uniqueNames.rlfName, rObj.type || rObj.mimeType || data.rlfMimeType, cachedOtpFolder, OTP_FOLDER_ID).fileUrl : ''));

      var otpLetterCell = isDirectDriveFileUrl(otpLetterUrl)
        ? ('=HYPERLINK("' + otpLetterUrl + '", "' + otpLetterUrl + '")')
        : uniqueNames.letterName;
      var otpSoaCell = isDirectDriveFileUrl(otpSoaUrl)
        ? ('=HYPERLINK("' + otpSoaUrl + '", "' + otpSoaUrl + '")')
        : uniqueNames.soaName;
      var otpRlfCell = isDirectDriveFileUrl(otpRlfUrl)
        ? ('=HYPERLINK("' + otpRlfUrl + '", "' + otpRlfUrl + '")')
        : uniqueNames.rlfName;

      var otpRow = [
        otpReqId,
        String(data.userId || ''),
        String(data.email || ''),
        String(data.viberNumber || ''),
        String(data.accountNumber || ''),
        String(data.site || ''),
        String(data.biller || ''),
        otpLetterCell,
        otpSoaCell,
        otpRlfCell,
        String(data.acknowledgementText || data.oneTimeAcknowledgementText || 'YES - ONE-TIME PAYMENT ONLY (NO SUCCEEDING PAYMENTS)'),
        String(data.status || 'PENDING').trim().toUpperCase(),
        String(data.rfpNumber || ''),
        String(data.rfpDate || ''),
        String(data.amount || ''),
        String(data.datePaid || ''),
        String(data.submittedAt || new Date().toLocaleString())
      ];

      // Upsert by Request ID (prevent duplicate rows)
      var otpExisting = otpSubSheet.getDataRange().getValues();
      var writtenRow = -1;
      for (var otIdx = 1; otIdx < otpExisting.length; otIdx++) {
        if (String(otpExisting[otIdx][0] || '').trim() === otpReqId) {
          writtenRow = otIdx + 1;
          break;
        }
      }
      if (writtenRow > 0) {
        otpSubSheet.getRange(writtenRow, 1, 1, otpRow.length).setValues([otpRow]);
      } else {
        otpSubSheet.appendRow(otpRow);
        writtenRow = otpSubSheet.getLastRow();
      }
      SpreadsheetApp.flush();

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        requestId: otpReqId,
        row: writtenRow,
        sheetName: ONE_TIME_SHEET_NAME,
        letterUrl: otpLetterUrl,
        soaUrl: otpSoaUrl,
        rlfUrl: otpRlfUrl,
        uploads: {
          letter: { uploaded: isDirectDriveFileUrl(otpLetterUrl), url: otpLetterUrl },
          soa: { uploaded: isDirectDriveFileUrl(otpSoaUrl), url: otpSoaUrl },
          rlf: { uploaded: isDirectDriveFileUrl(otpRlfUrl), url: otpRlfUrl }
        },
        preparedUniqueNames: uniqueNames
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Unknown action: ' + String(data.action || '(none)')
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err && err.message ? err.message : String(err)
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function resolveAndShareTargetFolderOnce(targetFolderId) {
  var resolvedId = String(targetFolderId || DEFAULT_ONETIME_DRIVE_FOLDER_ID).trim();
  if (!resolvedId) {
    throw new Error('Missing Google Drive targetFolderId for One-Time Payment upload.');
  }
  var folder;
  try {
    folder = DriveApp.getFolderById(resolvedId);
  } catch (e) {
    throw new Error('Cannot access Google Drive folder "' + resolvedId + '": ' + (e && e.message ? e.message : String(e)) + '. Run authorizeDriveAndSheets() in script.google.com and confirm this Google account has edit permission on the folder.');
  }
  try {
    var propKey = 'FOLDER_SHARED_' + folder.getId();
    if (PropertiesService.getScriptProperties().getProperty(propKey) !== '1') {
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      PropertiesService.getScriptProperties().setProperty(propKey, '1');
    }
  } catch (eShare) {
    Logger.log('Folder sharing notice (non-fatal): ' + eShare.toString());
  }
  return folder;
}

function saveOtpBase64ToFolder(rawBase64, fileName, mimeType, preResolvedFolder, targetFolderId) {
  var safeName = String(fileName || 'OneTime_Doc.pdf').trim();
  if (!rawBase64) {
    throw new Error('Empty file payload received for "' + safeName + '".');
  }
  var b64 = String(rawBase64);
  var commaIdx = b64.indexOf(',');
  if (commaIdx > -1) {
    b64 = b64.substring(commaIdx + 1);
  }
  b64 = b64.replace(/\s+/g, '');
  if (!b64) {
    throw new Error('Base64 content is empty after stripping data URI prefix for "' + safeName + '".');
  }
  var bytes;
  try {
    bytes = Utilities.base64Decode(b64);
  } catch (decErr) {
    throw new Error('Base64 decode failed for "' + safeName + '": ' + (decErr && decErr.message ? decErr.message : String(decErr)));
  }
  var mime = mimeType || 'application/pdf';
  var blob = Utilities.newBlob(bytes, mime, safeName);
  var folder = preResolvedFolder || resolveAndShareTargetFolderOnce(targetFolderId);
  var file;
  try {
    file = folder.createFile(blob);
  } catch (createErr) {
    throw new Error('Drive createFile failed for "' + safeName + '" in folder "' + folder.getId() + '": ' + (createErr && createErr.message ? createErr.message : String(createErr)));
  }
  var fileId = file.getId();
  return {
    fileId: fileId,
    fileUrl: 'https://drive.google.com/file/d/' + fileId + '/view'
  };
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
