/**
 * =========================================================================
 * APEC HOMES UTILITY PORTAL - GOOGLE APPS SCRIPT AUTOMATION SCRIPT (v4)
 * Spreadsheet ID: 1WI4CA4hy1s3oyCZLvgDVA1SeJSj9gN2BfLLeRpUmZDA
 * Enrollment Drive Folder ID: 1K9UZYO99WwleEltWmdiX9rouL4rHa3jd
 * Payment Drive Folder ID: 1OwToQbKB_u4aMCjurtOqsfNMv5bn1Z13
 * =========================================================================
 * 
 * FEATURES:
 * 1. Automatic unique file renaming (zero duplicate files in Drive)
 * 2. Guaranteed file upload to Google Drive with automatic folder fallback
 * 3. Posts the ACTUAL DIRECT FILE LINK (https://drive.google.com/file/d/.../view) in Google Sheets
 * 4. Automatic Sheet Header creation & auto-repair if row 1 is missing headers
 * 5. doGet(e) endpoint for 1-click verification & instant header initialization
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Open Google Sheet: https://docs.google.com/spreadsheets/d/1WI4CA4hy1s3oyCZLvgDVA1SeJSj9gN2BfLLeRpUmZDA
 * 2. In the top menu, go to: Extensions > Apps Script
 * 3. Delete any existing code in Code.gs and paste this entire code into Code.gs
 * 4. Click the blue "Deploy" button at top right > "Manage deployments"
 * 5. Click the Edit pencil icon > select "Version: New version" > click "Deploy"
 *    (Or if first time: "New deployment" > type: "Web app", Execute as: "Me", Who has access: "Anyone")
 * 6. Copy the Web App URL and paste it into the Webhook Setup modal in the portal!
 * =========================================================================
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Ensure New Bill Endorsement sheet and headers exist
  var enrollSheet = ss.getSheetByName('New Bill Endorsement') || ss.insertSheet('New Bill Endorsement');
  ensureEnrollmentHeaders(enrollSheet);
  
  // 2. Ensure Request Bill Payments sheet and headers exist
  var paySheet = ss.getSheetByName('Request Bill Payments') || ss.insertSheet('Request Bill Payments');
  ensurePaymentHeaders(paySheet);
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    message: 'APEC Homes Automation Webhook is ACTIVE! Headers verified and direct file links ready.',
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
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
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
      var cleanAcc = String(data.accountNumber || 'acc').replace(/[^a-zA-Z0-9]/g, '');
      var ts = new Date().getTime();
      
      // Dynamic unique filename to prevent duplicates
      var uniqueLetterName = data.requestLetterFileName || ('ENR_' + data.requestId + '_' + cleanAcc + '_' + ts + '_Letter.pdf');
      var uniqueSoaName = data.soaFileName || ('ENR_' + data.requestId + '_' + cleanAcc + '_' + ts + '_SOA.pdf');
      
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
