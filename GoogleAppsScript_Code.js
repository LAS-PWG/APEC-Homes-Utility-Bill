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
    message: 'APEC Homes Master Automation Webhook (v5.2 - Ready for Drive Owner) is ACTIVE! All 3 Uploads (Bill Req, Enrollment, One-Time Payment) & Sheets ready.',
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
    // 3. [ISOLATED EXPERIMENTAL MODULE] SUBMISSION: One-Time Bill Payment (OTP-...)
    // ----------------------------------------------------
    if (data.requestId && String(data.requestId).indexOf('OTP-') === 0) {
      var otpSubSheet = ss.getSheetByName('One Time Bill Payments') || ss.insertSheet('One Time Bill Payments');
      ensureOneTimePaymentHeaders(otpSubSheet);

      // Idempotency guard
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
      var cleanOtpSite = String(data.site || 'SITE').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'SITE';
      var cleanOtpAcc = String(data.accountNumber || 'ACC').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'ACC';
      var cleanOtpBiller = String(data.biller || 'BILLER').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 16) || 'BILLER';
      var baseOtpPrefix = data.requestId + '_' + cleanOtpSite + '_' + cleanOtpAcc + '_' + cleanOtpBiller;

      var otpLetterName = data.requestLetterFileName || (baseOtpPrefix + '_RequestLetter.pdf');
      var otpSoaName = data.soaFileName || (baseOtpPrefix + '_SOA.pdf');
      var otpRlfName = data.rlfFileName || (baseOtpPrefix + '_MgmtApprovedRLF.pdf');

      var otpLetterB64 = (data.letterFile && data.letterFile.base64) || data.letterFileBase64 || '';
      var otpLetterType = (data.letterFile && data.letterFile.type) || 'application/pdf';
      var otpLetterUrl = uploadToDriveSafely(OTP_FOLDER_ID, 'APEC One Time Bill Payments', otpLetterB64, otpLetterType, otpLetterName);

      var otpSoaB64 = (data.soaFile && data.soaFile.base64) || data.soaFileBase64 || '';
      var otpSoaType = (data.soaFile && data.soaFile.type) || 'application/pdf';
      var otpSoaUrl = uploadToDriveSafely(OTP_FOLDER_ID, 'APEC One Time Bill Payments', otpSoaB64, otpSoaType, otpSoaName);

      var otpRlfB64 = (data.rlfFile && data.rlfFile.base64) || data.rlfFileBase64 || '';
      var otpRlfType = (data.rlfFile && data.rlfFile.type) || 'application/pdf';
      var otpRlfUrl = uploadToDriveSafely(OTP_FOLDER_ID, 'APEC One Time Bill Payments', otpRlfB64, otpRlfType, otpRlfName);

      var otpLetterCell = otpLetterUrl ? ('=HYPERLINK("' + otpLetterUrl + '", "' + otpLetterUrl + '")') : otpLetterName;
      var otpSoaCell = otpSoaUrl ? ('=HYPERLINK("' + otpSoaUrl + '", "' + otpSoaUrl + '")') : otpSoaName;
      var otpRlfCell = otpRlfUrl ? ('=HYPERLINK("' + otpRlfUrl + '", "' + otpRlfUrl + '")') : otpRlfName;

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
        data.acknowledgementText || 'YES - ONE-TIME PAYMENT ONLY (NO SUCCEEDING PAYMENTS)',
        data.status || 'PENDING',
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
        rlfUrl: otpRlfUrl
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Robust Google Drive upload helper:
 * 1. Tries targetFolderId
 * 2. Falls back to named folder in user's Drive if targetFolderId permissions fail
 * 3. Sets sharing to ANYONE_WITH_LINK, VIEW
 * 4. Returns actual direct file URL: https://drive.google.com/file/d/[id]/view
 */
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

    // 1. Try Target Folder ID
    if (targetFolderId) {
      try {
        var folder = DriveApp.getFolderById(targetFolderId);
        if (folder) {
          file = folder.createFile(blob);
        }
      } catch (errFolder) {
        Logger.log('Target folder ID write failed: ' + errFolder.toString());
      }
    }

    // 2. Try Named Folder in User's Drive
    if (!file) {
      try {
        var iter = DriveApp.getFoldersByName(fallbackFolderName);
        var f2 = iter.hasNext() ? iter.next() : DriveApp.createFolder(fallbackFolderName);
        file = f2.createFile(blob);
      } catch (errNamed) {
        Logger.log('Named folder write failed: ' + errNamed.toString());
      }
    }

    // 3. Try Root Drive
    if (!file) {
      try {
        file = DriveApp.createFile(blob);
      } catch (errRoot) {
        Logger.log('Root Drive createFile failed: ' + errRoot.toString());
      }
    }

    if (file) {
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (errShare) {}
      var fileId = file.getId();
      return 'https://drive.google.com/file/d/' + fileId + '/view';
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

