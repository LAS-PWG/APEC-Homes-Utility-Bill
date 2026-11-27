/**
 * =========================================================================
 * APEC HOMES UTILITY PORTAL - GOOGLE APPS SCRIPT AUTOMATION SCRIPT (v5)
 * Utility Operations Sheet ID: 1WI4CA4hy1s3oyCZLvgDVA1SeJSj9gN2BfLLeRpUmZDA
 * UserData & Announcements Sheet ID: 1YvMBpPb3s1BVri5WvSSnbbjb0i3zIRk026eJVfciBKY
 * Enrollment Drive Folder ID: 1K9UZYO99WwleEltWmdiX9rouL4rHa3jd
 * Payment Drive Folder ID: 1OwToQbKB_u4aMCjurtOqsfNMv5bn1Z13
 * =========================================================================
 *
 * FEATURES:
 * 1. Automatic unique file renaming (zero duplicate files in Drive)
 * 2. Guaranteed file upload to Google Drive with automatic folder fallback
 * 3. Posts ACTUAL DIRECT FILE LINKS (https://drive.google.com/file/d/.../view) in Google Sheets
 * 4. Automatic Sheet Header creation & auto-repair if row 1 is missing headers
 * 5. Force Password Update & User Management write-back to UserData tab (1YvMBpPb3s1BVri5WvSSnbbjb0i3zIRk026eJVfciBKY)
 * 6. Admin Announcements Force Update & Sync to Announcements tab (1YvMBpPb3s1BVri5WvSSnbbjb0i3zIRk026eJVfciBKY)
 * 7. To change which Google account owns uploaded Drive files (storage quota),
 *    simply deploy this Web App while signed into the Google account with larger storage
 *    (Execute as: "Me", Who has access: "Anyone").
 * =========================================================================
 */

var USER_DATA_SPREADSHEET_ID = '1YvMBpPb3s1BVri5WvSSnbbjb0i3zIRk026eJVfciBKY';
var UTILITY_SPREADSHEET_ID = '1WI4CA4hy1s3oyCZLvgDVA1SeJSj9gN2BfLLeRpUmZDA';
var ENROLLMENT_DRIVE_FOLDER_ID = '1K9UZYO99WwleEltWmdiX9rouL4rHa3jd';
var PAYMENT_DRIVE_FOLDER_ID = '1OwToQbKB_u4aMCjurtOqsfNMv5bn1Z13';
var DEFAULT_ONETIME_DRIVE_FOLDER_ID = '1u7lR6OCbzoYfmLXe4TGeQ2LyGJiLHDa5';
var DESIGNATED_DRIVE_OWNER_EMAIL = 'lasarmiento.apec@gmail.com';

// Select "authorizeDriveAndSheets" in the top toolbar of script.google.com and click Run (▶) once to authorize Drive & Sheets
function authorizeDriveAndSheets() {
  var ss = SpreadsheetApp.openById(UTILITY_SPREADSHEET_ID);
  var otpSheet = ss.getSheetByName('One Time Bill Payments') || ss.insertSheet('One Time Bill Payments');
  ensureOneTimePaymentHeaders(otpSheet);
  var folder = DriveApp.getFolderById(DEFAULT_ONETIME_DRIVE_FOLDER_ID);
  Logger.log('SUCCESS! Authorized Spreadsheet: ' + ss.getName() + ' | Drive Folder: ' + folder.getName());
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

function getUtilitySpreadsheet() {
  try {
    return SpreadsheetApp.openById(UTILITY_SPREADSHEET_ID);
  } catch (e) {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

function getUserSpreadsheet(customId) {
  var targetId = customId || USER_DATA_SPREADSHEET_ID;
  try {
    return SpreadsheetApp.openById(targetId);
  } catch (e) {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

function doGet(e) {
  var ss = getUtilitySpreadsheet();

  // 1. Ensure New Bill Endorsement sheet and headers exist
  var enrollSheet = ss.getSheetByName('New Bill Endorsement') || ss.insertSheet('New Bill Endorsement');
  ensureEnrollmentHeaders(enrollSheet);

  // 2. Ensure Request Bill Payments sheet and headers exist
  var paySheet = ss.getSheetByName('Request Bill Payments') || ss.insertSheet('Request Bill Payments');
  ensurePaymentHeaders(paySheet);

  // 3. [ISOLATED EXPERIMENTAL MODULE] Ensure One Time Bill Payments sheet and headers exist
  var oneTimeSheet = ss.getSheetByName('One Time Bill Payments') || ss.insertSheet('One Time Bill Payments');
  ensureOneTimePaymentHeaders(oneTimeSheet);

  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    scriptVersion: 'v3.6.0-ai-sin-match',
    message: 'APEC Homes Master Automation Webhook (v3.6.0-ai-sin-match - Ready for Drive Owner) is ACTIVE! All 3 Uploads (Bill Req, Enrollment, One-Time Payment), AI SIN Match & Sheets ready.',
    enrollmentRows: enrollSheet.getLastRow(),
    paymentRows: paySheet.getLastRow(),
    oneTimeRows: oneTimeSheet.getLastRow(),
    assignedOneTimeFolderId: getAssignedOneTimeFolderId(''),
    designatedDriveOwner: getDesignatedDriveOwnerEmail('')
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    var raw = e.postData.contents;
    var data = JSON.parse(raw);
    var ss = getUtilitySpreadsheet();

    // ACTION: Assign / Save One-Time Drive Folder ID & Designated Drive Owner Email
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

    // ACTION: Initialize / Check Headers
    if (data.action === 'init_sheet' || data.action === 'init_onetime_sheet') {
      var enrollSheet = ss.getSheetByName('New Bill Endorsement') || ss.insertSheet('New Bill Endorsement');
      ensureEnrollmentHeaders(enrollSheet);
      var paySheet = ss.getSheetByName('Request Bill Payments') || ss.insertSheet('Request Bill Payments');
      ensurePaymentHeaders(paySheet);
      var oneTimeSheet = ss.getSheetByName('One Time Bill Payments') || ss.insertSheet('One Time Bill Payments');
      ensureOneTimePaymentHeaders(oneTimeSheet);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Headers verified in New Bill Endorsement, Request Bill Payments, and One Time Bill Payments'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ACTION: Force Password Update -> Write New Current Password to UserData Sheet
    if (data.action === 'updatePassword' && (data.username || data.userId)) {
      var userSs = getUserSpreadsheet(data.spreadsheetId);
      var userSheet = userSs.getSheetByName('UserData') || userSs.getSheets()[0];
      var updatedRow = -1;

      if (userSheet) {
        var uVals = userSheet.getDataRange().getValues();
        var targetUname = String(data.username || '').trim().toLowerCase();
        var targetUid = String(data.userId || '').trim().toLowerCase();

        for (var uIdx = 1; uIdx < uVals.length; uIdx++) {
          var rowUid = String(uVals[uIdx][0] || '').trim().toLowerCase();
          var rowUname = String(uVals[uIdx][1] || '').trim().toLowerCase();

          // Match by username first (unique per person), or fallback to userId
          if ((targetUname && rowUname === targetUname) || (!targetUname && targetUid && rowUid === targetUid)) {
            // Col C (column 3) = Current Password
            userSheet.getRange(uIdx + 1, 3).setValue(String(data.newPassword || '').trim());
            updatedRow = uIdx + 1;
            break;
          }
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: updatedRow > 0 ? 'success' : 'not_found',
        updatedRow: updatedRow,
        message: updatedRow > 0
          ? 'Password updated in UserData Google Sheet (Row ' + updatedRow + ')'
          : 'User not found in UserData sheet'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ACTION: Admin Reset User Password to Temporary Default Password
    if (data.action === 'resetPassword' && (data.username || data.userId)) {
      var resetSs = getUserSpreadsheet(data.spreadsheetId);
      var resetSheet = resetSs.getSheetByName('UserData') || resetSs.getSheets()[0];
      var resetRow = -1;

      if (resetSheet) {
        var rVals = resetSheet.getDataRange().getValues();
        var rUname = String(data.username || '').trim().toLowerCase();
        var rUid = String(data.userId || '').trim().toLowerCase();

        for (var rIdx = 1; rIdx < rVals.length; rIdx++) {
          var cUid = String(rVals[rIdx][0] || '').trim().toLowerCase();
          var cUname = String(rVals[rIdx][1] || '').trim().toLowerCase();

          if ((rUname && cUname === rUname) || (!rUname && rUid && cUid === rUid)) {
            // Clear Col C (Current Password) and set Col D (Default Password)
            resetSheet.getRange(rIdx + 1, 3).setValue('');
            resetSheet.getRange(rIdx + 1, 4).setValue(String(data.defaultPassword || '123456').trim());
            resetRow = rIdx + 1;
            break;
          }
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: resetRow > 0 ? 'success' : 'not_found',
        updatedRow: resetRow
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ACTION: Admin Add or Edit User in UserData Sheet
    if (data.action === 'saveUser' && data.user) {
      var saveSs = getUserSpreadsheet(data.spreadsheetId);
      var saveSheet = saveSs.getSheetByName('UserData') || saveSs.insertSheet('UserData');
      var uObj = data.user;
      var sVals = saveSheet.getDataRange().getValues();
      var sUname = String(uObj.username || '').trim().toLowerCase();
      var sUid = String(uObj.userId || '').trim().toLowerCase();
      var foundIdx = -1;

      for (var sIdx = 1; sIdx < sVals.length; sIdx++) {
        var existingUid = String(sVals[sIdx][0] || '').trim().toLowerCase();
        var existingUname = String(sVals[sIdx][1] || '').trim().toLowerCase();
        if ((sUname && existingUname === sUname) || (sUid && existingUid === sUid && !sUname)) {
          foundIdx = sIdx + 1;
          break;
        }
      }

      var rowValues = [
        uObj.userId || '',
        uObj.username || '',
        uObj.currentPassword || '',
        uObj.defaultPassword || '',
        uObj.firstName || '',
        uObj.lastName || '',
        uObj.accessLevel || 'Level 2'
      ];

      if (foundIdx > 0) {
        saveSheet.getRange(foundIdx, 1, 1, 7).setValues([rowValues]);
      } else {
        saveSheet.appendRow(rowValues);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'User saved to UserData sheet'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ACTION: Admin Update / Force Post Announcement to Announcements Sheet
    if (data.action === 'updateAnnouncement') {
      var annSs = getUserSpreadsheet(data.spreadsheetId);
      var annSheet = annSs.getSheetByName('Announcements') || annSs.insertSheet('Announcements');

      if (annSheet.getLastRow() === 0) {
        annSheet.appendRow(['Date / ID', 'Title', 'Content', 'Action Link', 'Priority', 'Posted By']);
        annSheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#e8f0fe');
        annSheet.setFrozenRows(1);
      }

      var nowStr = data.dateOrTime || new Date().toLocaleString();
      var titleStr = data.title || 'Welcome to APECHOMES Utility Portal';
      var contentStr = data.content || '';
      var linkStr = data.actionLink || 'Request Bill Payment';
      var prioStr = data.priority || 'Normal';
      var postedByStr = data.postedBy || 'Administrator';

      if (annSheet.getLastRow() >= 2) {
        annSheet.getRange(2, 1, 1, 6).setValues([[nowStr, titleStr, contentStr, linkStr, prioStr, postedByStr]]);
      } else {
        annSheet.appendRow([nowStr, titleStr, contentStr, linkStr, prioStr, postedByStr]);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Announcement updated in Announcements sheet'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ACTION: Update Status in New Bill Endorsement, Request Bill Payments, or One Time Bill Payments
    if (data.action === 'updateStatus' && data.requestId) {
      var reqIdStr = String(data.requestId).trim();
      var isEnroll = reqIdStr.indexOf('ENR-') === 0;
      var isOneTime = reqIdStr.indexOf('OTP-') === 0;
      var targetSheetName = isOneTime ? 'One Time Bill Payments' : (isEnroll ? 'New Bill Endorsement' : 'Request Bill Payments');
      var targetSheet = ss.getSheetByName(targetSheetName);
      if (targetSheet) {
        var vals = targetSheet.getDataRange().getValues();
        var statusCol = isOneTime ? 12 : (isEnroll ? 10 : 13);
        for (var i = 1; i < vals.length; i++) {
          if (String(vals[i][0]).trim() === reqIdStr) {
            targetSheet.getRange(i + 1, statusCol).setValue(data.status);
            break;
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    // === [ISOLATED EXPERIMENTAL MODULE: ONE-TIME BILL PAYMENT] ===
    // ACTION: Update One-Time Payment Details & Accounting Columns (RFP Number, RFP Date, Amount, Date Paid, File Links)
    if (data.action === 'updateOneTimePaymentDetails' && data.requestId) {
      var otpSheet = ss.getSheetByName('One Time Bill Payments') || ss.insertSheet('One Time Bill Payments');
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

          // Automated Status rule: CANCEL and REJECTED take priority; otherwise Date Paid -> PAID, RFP Number -> WITH RFP
          var curStatus = String(data.status !== undefined ? data.status : (otpVals[oIdx][11] || 'PENDING')).trim().toUpperCase();
          var curRfp = String(data.rfpNumber !== undefined ? data.rfpNumber : (otpVals[oIdx][12] || '')).trim();
          var curDatePaid = String(data.datePaid !== undefined ? data.datePaid : (otpVals[oIdx][15] || '')).trim();
          var autoStatus = curStatus;
          if (curStatus === 'CANCEL' || curStatus === 'CANCELLED') {
            autoStatus = 'CANCEL';
          } else if (curStatus === 'REJECTED' || curStatus === 'REJECT') {
            autoStatus = 'REJECTED';
          } else if (curDatePaid) {
            autoStatus = 'PAID';
          } else if (curRfp) {
            autoStatus = 'WITH RFP';
          } else if (curStatus === 'FOR PAYMENT') {
            autoStatus = 'FOR PAYMENT';
          } else {
            autoStatus = 'PENDING';
          }
          otpSheet.getRange(rowNum, 12).setValue(autoStatus);
          updatedOtpRow = rowNum;
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: updatedOtpRow > 0 ? 'success' : 'not_found',
        updatedRow: updatedOtpRow
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ACTION: Admin Trigger to Auto-Link / Repair Uploaded Files in Google Drive for One-Time Bill Payments
    if (data.action === 'linkOneTimeUploads') {
      var linkSheet = ss.getSheetByName('One Time Bill Payments') || ss.insertSheet('One Time Bill Payments');
      ensureOneTimePaymentHeaders(linkSheet);
      var lVals = linkSheet.getDataRange().getValues();
      var folderId = getAssignedOneTimeFolderId(data.targetFolderId);
      var filterReqId = data.requestId ? String(data.requestId).trim() : '';
      var linkedCount = 0;

      // Gather candidate files from target folder and fallback folder
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
        message: 'Linked Drive uploads for ' + linkedCount + ' One-Time Payment record(s)'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ----------------------------------------------------
    // 1. SUBMISSION: Enroll New Utility Bill (ENR-...)
    // ----------------------------------------------------
    if (data.requestId && String(data.requestId).indexOf('ENR-') === 0) {
      var sheet = ss.getSheetByName('New Bill Endorsement') || ss.insertSheet('New Bill Endorsement');
      ensureEnrollmentHeaders(sheet);

      // Idempotency guard: prevent duplicate rows if the same requestId is received twice
      var enrExisting = sheet.getDataRange().getValues();
      for (var eIdx = 1; eIdx < enrExisting.length; eIdx++) {
        if (String(enrExisting[eIdx][0] || '').trim() === String(data.requestId).trim()) {
          return ContentService.createTextOutput(JSON.stringify({
            status: 'success',
            deduplicated: true,
            requestId: data.requestId
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }

      var TARGET_FOLDER_ID = '1K9UZYO99WwleEltWmdiX9rouL4rHa3jd';
      var cleanSite = String(data.site || 'site').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      var cleanAcc = String(data.accountNumber || 'acc').replace(/[^a-zA-Z0-9]/g, '');
      var ts = new Date().getTime();

      // Dynamic unique filename to prevent duplicates
      var uniqueLetterName = data.requestLetterFileName || (data.requestId + '_' + cleanSite + '_' + cleanAcc + '_' + ts + '_RequestLetter.pdf');
      var uniqueSoaName = data.soaFileName || (data.requestId + '_' + cleanSite + '_' + cleanAcc + '_' + ts + '_SOA.pdf');

      var rawLetterB64 = (data.letterFile && data.letterFile.base64) || data.letterFileBase64 || '';
      var rawLetterType = (data.letterFile && data.letterFile.type) || 'application/pdf';
      var letterUrl = uploadToDriveSafely(TARGET_FOLDER_ID, 'APEC Utility Endorsements', rawLetterB64, rawLetterType, uniqueLetterName);

      var rawSoaB64 = (data.soaFile && data.soaFile.base64) || data.soaFileBase64 || '';
      var rawSoaType = (data.soaFile && data.soaFile.type) || 'application/pdf';
      var soaUrl = uploadToDriveSafely(TARGET_FOLDER_ID, 'APEC Utility Endorsements', rawSoaB64, rawSoaType, uniqueSoaName);

      // Post ACTUAL direct file links into Col H and Col I
      var letterCell = letterUrl ? ('=HYPERLINK("' + letterUrl + '", "' + letterUrl + '")') : 'No File Attached';
      var soaCell = soaUrl ? ('=HYPERLINK("' + soaUrl + '", "' + soaUrl + '")') : 'No File Attached';

      sheet.appendRow([
        data.requestId,
        data.userId || '',
        data.email || '',
        data.viberNumber || '',
        data.accountNumber || '',
        data.site || '',
        data.biller || '',
        letterCell,
        soaCell,
        data.status || 'Pending',
        data.submittedAt || new Date().toLocaleString()
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        requestId: data.requestId,
        letterUrl: letterUrl,
        soaUrl: soaUrl
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ----------------------------------------------------
    // 2. SUBMISSION: Request Bill Payment (REQ-...)
    // ----------------------------------------------------
    if (data.requestId && String(data.requestId).indexOf('REQ-') === 0) {
      var paySheet = ss.getSheetByName('Request Bill Payments') || ss.insertSheet('Request Bill Payments');
      ensurePaymentHeaders(paySheet);

      // Idempotency guard: prevent duplicate rows if the same requestId is received twice
      var payExisting = paySheet.getDataRange().getValues();
      for (var pIdx = 1; pIdx < payExisting.length; pIdx++) {
        if (String(payExisting[pIdx][0] || '').trim() === String(data.requestId).trim()) {
          return ContentService.createTextOutput(JSON.stringify({
            status: 'success',
            deduplicated: true,
            requestId: data.requestId
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }

      var PAY_FOLDER_ID = '1OwToQbKB_u4aMCjurtOqsfNMv5bn1Z13';
      var tsPay = new Date().getTime();
      var uniquePayName = data.fileName || ('PAY_' + data.requestId + '_' + tsPay + '_Statement.pdf');

      var rawPayB64 = (data.fileData && data.fileData.base64) || data.fileBase64 || '';
      var rawPayType = (data.fileData && data.fileData.type) || 'application/pdf';
      var payUrl = uploadToDriveSafely(PAY_FOLDER_ID, 'APEC Bill Payment Attachments', rawPayB64, rawPayType, uniquePayName);

      // Col K: Clickable Direct File Link; Col L: Actual Direct File Link URL
      var fileFormula = payUrl ? ('=HYPERLINK("' + payUrl + '", "' + payUrl + '")') : 'No File Attached';
      var directLinkFormula = payUrl ? ('=HYPERLINK("' + payUrl + '", "' + payUrl + '")') : 'No File Attached';

      paySheet.appendRow([
        data.requestId,
        data.userId || '',
        data.requestorName || '',
        data.viberNumber || '',
        data.billMonth || '',
        data.billType || 'Power',
        data.dueDate || '',
        data.site || '',
        data.biller || '',
        data.accountNumber || '',
        fileFormula,
        directLinkFormula,
        data.status || 'Pending',
        data.submittedAt || new Date().toLocaleString()
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        requestId: data.requestId,
        fileUrl: payUrl
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ----------------------------------------------------
    // 3. [ISOLATED MODULE] ONE-TIME BILL PAYMENT — SEQUENTIAL FILE UPLOAD & FINALIZE (OTP-...)
    // ----------------------------------------------------
    if (data.action === 'uploadOneTimeFile') {
      var upFolderId = getAssignedOneTimeFolderId(data.targetFolderId);
      var fObj = data.file || {};
      var b64 = fObj.base64 || data.fileBase64 || data.base64 || '';
      var fName = fObj.name || data.fileName || ('OTP_' + new Date().getTime() + '.pdf');
      var fMime = fObj.type || fObj.mimeType || data.mimeType || 'application/pdf';
      var uploaded = saveOtpBase64Strict(upFolderId, b64, fMime, fName);
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

    if (data.action === 'submitOneTimePayment' || (!data.action && data.requestId && String(data.requestId).indexOf('OTP-') === 0)) {
      var otpSubSheet = ss.getSheetByName('One Time Bill Payments') || ss.insertSheet('One Time Bill Payments');
      ensureOneTimePaymentHeaders(otpSubSheet);

      var otpReqId = String(data.requestId || ('OTP-' + Utilities.formatDate(new Date(), 'GMT+8', 'yyyyMMdd') + '-' + Math.floor(1000 + Math.random() * 9000))).trim();
      var OTP_FOLDER_ID = getAssignedOneTimeFolderId(data.targetFolderId);
      var cleanOtpSite = String(data.site || 'SITE').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'SITE';
      var cleanOtpAcc = String(data.accountNumber || 'ACC').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'ACC';
      var cleanOtpBiller = String(data.biller || 'BILLER').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 16) || 'BILLER';
      var baseOtpPrefix = otpReqId + '_' + cleanOtpSite + '_' + cleanOtpAcc + '_' + cleanOtpBiller;

      var otpLetterName = data.requestLetterFileName || (baseOtpPrefix + '_RequestLetter.pdf');
      var otpSoaName = data.soaFileName || (baseOtpPrefix + '_SOA.pdf');
      var otpRlfName = data.rlfFileName || (baseOtpPrefix + '_MgmtApprovedRLF.pdf');

      var otpLetterB64 = (data.letterFile && (data.letterFile.base64 || data.letterFile.data)) || data.letterFileBase64 || '';
      var otpLetterType = (data.letterFile && (data.letterFile.type || data.letterFile.mimeType)) || data.letterMimeType || 'application/pdf';
      var otpSoaB64 = (data.soaFile && (data.soaFile.base64 || data.soaFile.data)) || data.soaFileBase64 || '';
      var otpSoaType = (data.soaFile && (data.soaFile.type || data.soaFile.mimeType)) || data.soaMimeType || 'application/pdf';
      var otpRlfB64 = (data.rlfFile && (data.rlfFile.base64 || data.rlfFile.data)) || data.rlfFileBase64 || '';
      var otpRlfType = (data.rlfFile && (data.rlfFile.type || data.rlfFile.mimeType)) || data.rlfMimeType || 'application/pdf';

      var isDirectFile = function (u) {
        return Boolean(u && /^https?:\/\/drive\.google\.com\/(file\/d\/[a-zA-Z0-9_-]+|open\?id=[a-zA-Z0-9_-]+)/i.test(String(u).trim()));
      };

      var otpLetterUrl = isDirectFile(data.letterUrl)
        ? String(data.letterUrl).trim()
        : (isDirectFile(data.driveLetterFolderUrl)
            ? String(data.driveLetterFolderUrl).trim()
            : (otpLetterB64 ? saveOtpBase64Strict(OTP_FOLDER_ID, otpLetterB64, otpLetterType, otpLetterName).fileUrl : ''));

      var otpSoaUrl = isDirectFile(data.soaUrl)
        ? String(data.soaUrl).trim()
        : (isDirectFile(data.driveSoaFolderUrl)
            ? String(data.driveSoaFolderUrl).trim()
            : (otpSoaB64 ? saveOtpBase64Strict(OTP_FOLDER_ID, otpSoaB64, otpSoaType, otpSoaName).fileUrl : ''));

      var otpRlfUrl = isDirectFile(data.rlfUrl)
        ? String(data.rlfUrl).trim()
        : (isDirectFile(data.driveRlfFolderUrl)
            ? String(data.driveRlfFolderUrl).trim()
            : (otpRlfB64 ? saveOtpBase64Strict(OTP_FOLDER_ID, otpRlfB64, otpRlfType, otpRlfName).fileUrl : ''));

      var otpLetterCell = isDirectFile(otpLetterUrl) ? ('=HYPERLINK("' + otpLetterUrl + '", "' + otpLetterUrl + '")') : otpLetterName;
      var otpSoaCell = isDirectFile(otpSoaUrl) ? ('=HYPERLINK("' + otpSoaUrl + '", "' + otpSoaUrl + '")') : otpSoaName;
      var otpRlfCell = isDirectFile(otpRlfUrl) ? ('=HYPERLINK("' + otpRlfUrl + '", "' + otpRlfUrl + '")') : otpRlfName;

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
        String(data.acknowledgementText || 'YES - ONE-TIME PAYMENT ONLY (NO SUCCEEDING PAYMENTS)'),
        String(data.status || 'PENDING').toUpperCase(),
        String(data.rfpNumber || ''),
        String(data.rfpDate || ''),
        String(data.amount || ''),
        String(data.datePaid || ''),
        String(data.submittedAt || new Date().toLocaleString())
      ];

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
        sheetName: 'One Time Bill Payments',
        letterUrl: otpLetterUrl,
        soaUrl: otpSoaUrl,
        rlfUrl: otpRlfUrl,
        uploads: {
          letter: { uploaded: isDirectFile(otpLetterUrl), url: otpLetterUrl },
          soa: { uploaded: isDirectFile(otpSoaUrl), url: otpSoaUrl },
          rlf: { uploaded: isDirectFile(otpRlfUrl), url: otpRlfUrl }
        }
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 9a. Initialize Dedicated AI Sheet Tab ("AI_SOA_Extractions") & Row 1 Headers (Cols A–V)
    if (data.action === 'initAiExtractionSheet') {
      var initAiSs = getUserSpreadsheet(data.spreadsheetId);
      var initTabName = String(data.targetSheetName || 'AI_SOA_Extractions').trim();
      var initAiSheet = initAiSs.getSheetByName(initTabName) || initAiSs.insertSheet(initTabName);
      ensureAiExtractionHeaders(initAiSheet);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        sheetName: initTabName,
        rows: initAiSheet.getLastRow()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 9b. Save Free AI Extracted Statement Fields to Dedicated Sheet ("AI_SOA_Extractions") Keyed by Request ID (Col A)
    if ((data.action === 'saveAiExtractedData' || data.subAction === 'saveAiExtractedData') && data.requestId) {
      var aiSs = getUserSpreadsheet(data.spreadsheetId);
      var aiTabName = String(data.targetSheetName || 'AI_SOA_Extractions').trim();
      var aiSheet = aiSs.getSheetByName(aiTabName) || aiSs.insertSheet(aiTabName);
      ensureAiExtractionHeaders(aiSheet);
      var targetReqId = String(data.requestId).trim();
      var extractedAccPrimary = String(data.extractedAccountNumber || data.primaryAccountNumber || data.meralcoSin || '').trim();
      var allRefsStr = Array.isArray(data.extractedAccountReferences)
        ? data.extractedAccountReferences.join(', ')
        : String(data.extractedAccountReferences || '').trim();
      var accMatchStatus = String(data.accountMatchStatus || '').trim().toUpperCase();
      var isWrongAtt = data.wrongAttachmentTag === true || accMatchStatus === 'WRONG_ATTACHMENT';
      var wrongTagStr = isWrongAtt ? 'WRONG ATTACHMENT' : (accMatchStatus === 'MATCHED' ? 'OK' : '');
      var matchExplStr = String(data.matchExplanation || '').trim();
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
        String(data.extractedAt || data.scannedAt || new Date().toISOString()),
        extractedAccPrimary,
        allRefsStr,
        accMatchStatus,
        wrongTagStr,
        matchExplStr
      ];
      var aiVals = aiSheet.getDataRange().getValues();
      var foundAiRow = -1;
      for (var aIdx = 1; aIdx < aiVals.length; aIdx++) {
        if (String(aiVals[aIdx][0] || '').trim() === targetReqId) {
          foundAiRow = aIdx + 1;
          break;
        }
      }
      if (foundAiRow > 0) {
        var prevRow = aiVals[foundAiRow - 1] || [];
        if (!aiRowValues[1] && prevRow[1]) aiRowValues[1] = String(prevRow[1]);
        if (!aiRowValues[2] && prevRow[2]) aiRowValues[2] = String(prevRow[2]);
        if (!aiRowValues[3] && prevRow[3]) aiRowValues[3] = String(prevRow[3]);
        if (!accMatchStatus && prevRow.length >= 22) {
          if (!aiRowValues[17] && prevRow[17]) aiRowValues[17] = String(prevRow[17]);
          if (!aiRowValues[18] && prevRow[18]) aiRowValues[18] = String(prevRow[18]);
          if (!aiRowValues[19] && prevRow[19]) aiRowValues[19] = String(prevRow[19]);
          if (!aiRowValues[20] && prevRow[20]) aiRowValues[20] = String(prevRow[20]);
          if (!aiRowValues[21] && prevRow[21]) aiRowValues[21] = String(prevRow[21]);
        }
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

    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Unknown action: ' + String(data.action || '(none)')
    })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err && err.message ? err.message : String(err)
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function saveOtpBase64Strict(targetFolderId, rawBase64, mimeType, fileName) {
  var safeName = String(fileName || 'OneTime_Doc.pdf').trim();
  if (!rawBase64) throw new Error('Empty file payload received for "' + safeName + '".');
  var b64 = String(rawBase64);
  var commaIdx = b64.indexOf(',');
  if (commaIdx > -1) b64 = b64.substring(commaIdx + 1);
  b64 = b64.replace(/\s+/g, '');
  if (!b64) throw new Error('Base64 content is empty for "' + safeName + '".');
  var bytes;
  try {
    bytes = Utilities.base64Decode(b64);
  } catch (decErr) {
    throw new Error('Base64 decode failed for "' + safeName + '": ' + (decErr && decErr.message ? decErr.message : String(decErr)));
  }
  var blob = Utilities.newBlob(bytes, mimeType || 'application/pdf', safeName);
  var resolvedId = String(targetFolderId || DEFAULT_ONETIME_DRIVE_FOLDER_ID).trim();
  var folder;
  try {
    folder = DriveApp.getFolderById(resolvedId);
  } catch (fErr) {
    throw new Error('Cannot access Google Drive folder "' + resolvedId + '": ' + (fErr && fErr.message ? fErr.message : String(fErr)));
  }
  try {
    var propKey = 'FOLDER_SHARED_' + folder.getId();
    if (PropertiesService.getScriptProperties().getProperty(propKey) !== '1') {
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      PropertiesService.getScriptProperties().setProperty(propKey, '1');
    }
  } catch (sErr) {}
  var file;
  try {
    file = folder.createFile(blob);
  } catch (cErr) {
    throw new Error('Drive createFile failed for "' + safeName + '": ' + (cErr && cErr.message ? cErr.message : String(cErr)));
  }
  return { fileId: file.getId(), fileUrl: 'https://drive.google.com/file/d/' + file.getId() + '/view' };
}

function ensureAiExtractionHeaders(sheet) {
  var headers = [
    'Request ID', 'Account Number', 'Site', 'Biller',
    'Cycle From', 'Cycle To', 'AI Due Date', 'Grace Period',
    'Consumption', 'Arrears', 'Current Amount', 'Total Amount', 'Amount Before Due',
    'Detected Format', 'Legibility', 'Pages Scanned', 'Scanned At',
    'Extracted Account / SIN', 'All Extracted Refs', 'Account Match Status', 'Wrong Attachment Tag', 'Match Explanation'
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
  } else if (!String(sheet.getRange(1, 18).getValue() || '').trim()) {
    sheet.getRange(1, 18, 1, 5).setValues([headers.slice(17)]).setFontWeight('bold').setBackground('#d1fae5');
  }
}

function resolveAndShareTargetFolderOnce(targetFolderId, fallbackFolderName) {
  var folder = null;
  if (targetFolderId) {
    try {
      folder = DriveApp.getFolderById(targetFolderId);
    } catch (e) {}
  }
  if (!folder && fallbackFolderName) {
    try {
      var iter = DriveApp.getFoldersByName(fallbackFolderName);
      folder = iter.hasNext() ? iter.next() : DriveApp.createFolder(fallbackFolderName);
    } catch (e2) {}
  }
  if (folder) {
    try {
      var propKey = 'FOLDER_SHARED_' + folder.getId();
      if (PropertiesService.getScriptProperties().getProperty(propKey) !== '1') {
        folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        PropertiesService.getScriptProperties().setProperty(propKey, '1');
      }
    } catch (eShare) {}
  }
  return folder;
}

/**
 * Fast Google Drive upload helper:
 * Reuses pre-resolved folder and folder-level link sharing to avoid 3x per-file setSharing latency.
 */
function uploadToDriveSafely(targetFolderId, fallbackFolderName, rawBase64, mimeType, fileName, preResolvedFolder) {
  if (!rawBase64) return '';
  try {
    var b64 = String(rawBase64);
    var commaIdx = b64.indexOf(',');
    if (commaIdx > -1) {
      b64 = b64.substring(commaIdx + 1);
    }
    if (!b64) return '';

    var bytes = Utilities.base64Decode(b64);
    var mime = mimeType || 'application/pdf';
    var blob = Utilities.newBlob(bytes, mime, fileName);
    var folder = preResolvedFolder || resolveAndShareTargetFolderOnce(targetFolderId, fallbackFolderName);
    var file = null;

    if (folder) {
      try {
        file = folder.createFile(blob);
      } catch (errFolder) {
        Logger.log('Target folder write failed: ' + errFolder.toString());
      }
    }

    if (!file) {
      try {
        file = DriveApp.createFile(blob);
        try {
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (errShare) {}
      } catch (errRoot) {
        Logger.log('Root Drive createFile failed: ' + errRoot.toString());
      }
    }

    if (file) {
      return 'https://drive.google.com/file/d/' + file.getId() + '/view';
    }
  } catch (errMain) {
    Logger.log('uploadToDriveSafely failed: ' + errMain.toString());
  }
  return '';
}

function ensureEnrollmentHeaders(sheet) {
  var headers = [
    'Request ID', 'User ID', 'Email', 'Viber', 'Account No',
    'Site', 'Biller', 'Letter File Link', 'SOA File Link', 'Status', 'Date Submitted'
  ];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e8f0fe');
    sheet.setFrozenRows(1);
    return;
  }
  var firstCell = String(sheet.getRange(1, 1).getValue()).trim();
  if (firstCell !== headers[0]) {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e8f0fe');
    sheet.setFrozenRows(1);
  }
}

function ensurePaymentHeaders(sheet) {
  var headers = [
    'Request ID', 'User ID', 'Requestor Name', 'Viber Number',
    'Bill Month', 'Bill Type', 'Due Date', 'Site', 'Biller',
    'Account Number', 'Attachment / File', 'Drive File Link', 'Status', 'Submitted At'
  ];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e8f0fe');
    sheet.setFrozenRows(1);
    return;
  }
  var firstCell = String(sheet.getRange(1, 1).getValue()).trim();
  if (firstCell !== headers[0]) {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e8f0fe');
    sheet.setFrozenRows(1);
  }
}

function ensureOneTimePaymentHeaders(sheet) {
  var headers = [
    'Request ID', 'User ID', 'Requestor', 'Viber Number', 'Account No',
    'Site', 'Biller', 'Approved Request Letter', 'Current Billing / SOA',
    'Management Approved RLF', 'One-Time Acknowledgement', 'Status',
    'RFP Number', 'RFP Date', 'Amount', 'Date Paid', 'Date Submitted'
  ];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#fef3c7');
    sheet.setFrozenRows(1);
    return;
  }
  var firstCell = String(sheet.getRange(1, 1).getValue()).trim();
  if (firstCell !== headers[0]) {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#fef3c7');
    sheet.setFrozenRows(1);
  } else {
    sheet.getRange(1, 3).setValue('Requestor');
  }
}

