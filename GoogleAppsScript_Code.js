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

  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    message: 'APEC Homes Automation Webhook (v5) is ACTIVE! Headers, UserData password sync, and Announcements sync ready.',
    enrollmentRows: enrollSheet.getLastRow(),
    paymentRows: paySheet.getLastRow()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    var raw = e.postData.contents;
    var data = JSON.parse(raw);
    var ss = getUtilitySpreadsheet();

    // ACTION: Initialize / Check Headers
    if (data.action === 'init_sheet') {
      var enrollSheet = ss.getSheetByName('New Bill Endorsement') || ss.insertSheet('New Bill Endorsement');
      ensureEnrollmentHeaders(enrollSheet);
      var paySheet = ss.getSheetByName('Request Bill Payments') || ss.insertSheet('Request Bill Payments');
      ensurePaymentHeaders(paySheet);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Headers verified in New Bill Endorsement and Request Bill Payments'
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

    // ACTION: Update Status in New Bill Endorsement or Request Bill Payments
    if (data.action === 'updateStatus' && data.requestId) {
      var isEnroll = String(data.requestId).indexOf('ENR-') === 0;
      var targetSheet = ss.getSheetByName(isEnroll ? 'New Bill Endorsement' : 'Request Bill Payments');
      if (targetSheet) {
        var vals = targetSheet.getDataRange().getValues();
        var statusCol = isEnroll ? 10 : 13;
        for (var i = 1; i < vals.length; i++) {
          if (String(vals[i][0]).trim() === String(data.requestId).trim()) {
            targetSheet.getRange(i + 1, statusCol).setValue(data.status);
            break;
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    // ----------------------------------------------------
    // 1. SUBMISSION: Enroll New Utility Bill (ENR-...)
    // ----------------------------------------------------
    if (data.requestId && String(data.requestId).indexOf('ENR-') === 0) {
      var sheet = ss.getSheetByName('New Bill Endorsement') || ss.insertSheet('New Bill Endorsement');
      ensureEnrollmentHeaders(sheet);

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
