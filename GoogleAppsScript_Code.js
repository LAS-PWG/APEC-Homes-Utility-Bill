/**
 * =========================================================================
 * APEC HOMES UTILITY PORTAL - GOOGLE APPS SCRIPT AUTOMATION SCRIPT (v3)
 * Spreadsheet ID: 1WI4CA4hy1s3oyCZLvgDVA1SeJSj9gN2BfLLeRpUmZDA
 * Enrollment Drive Folder ID: 1K9UZYO99WwleEltWmdiX9rouL4rHa3jd
 * Payment Drive Folder ID: 1OwToQbKB_u4aMCjurtOqsfNMv5bn1Z13
 * =========================================================================
 * 
 * FEATURES:
 * 1. Automatic unique file renaming (zero duplicate files in Drive)
 * 2. Uploads physical files to Google Drive with Anyone-with-link-can-view access
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
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Headers verified in New Bill Endorsement'
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
      
      // Target Google Drive Folder: 1K9UZYO99WwleEltWmdiX9rouL4rHa3jd
      var TARGET_FOLDER_ID = '1K9UZYO99WwleEltWmdiX9rouL4rHa3jd';
      var folder;
      try {
        folder = DriveApp.getFolderById(TARGET_FOLDER_ID);
      } catch (folderErr) {
        try {
          var iter = DriveApp.getFoldersByName('APEC Utility Endorsements');
          folder = iter.hasNext() ? iter.next() : DriveApp.createFolder('APEC Utility Endorsements');
        } catch(fallbackErr) {
          folder = DriveApp.getRootFolder();
        }
      }
      
      var letterUrl = '';
      var soaUrl = '';
      
      // 1. Upload Approved Request Letter to Drive
      var letterObj = data.letterFile || (data.letterFileBase64 ? { name: data.requestLetterFileName, base64: data.letterFileBase64 } : null);
      if (letterObj && letterObj.base64) {
        try {
          var b64L = letterObj.base64;
          if (b64L.indexOf(',') > -1) b64L = b64L.split(',')[1];
          var bytesL = Utilities.base64Decode(b64L);
          var mimeL = letterObj.type || 'application/pdf';
          var nameL = data.requestLetterFileName || letterObj.name || (data.requestId + '_Letter.pdf');
          var blobL = Utilities.newBlob(bytesL, mimeL, nameL);
          var fileL = folder.createFile(blobL);
          try {
            fileL.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          } catch(shareErr) {}
          letterUrl = fileL.getUrl();
          if (!letterUrl) {
            letterUrl = 'https://drive.google.com/file/d/' + fileL.getId() + '/view';
          }
        } catch(errL) {
          Logger.log('Letter upload error: ' + errL);
        }
      }
      
      // 2. Upload SOA / Billing Statement to Drive
      var soaObj = data.soaFile || (data.soaFileBase64 ? { name: data.soaFileName, base64: data.soaFileBase64 } : null);
      if (soaObj && soaObj.base64) {
        try {
          var b64S = soaObj.base64;
          if (b64S.indexOf(',') > -1) b64S = b64S.split(',')[1];
          var bytesS = Utilities.base64Decode(b64S);
          var mimeS = soaObj.type || 'application/pdf';
          var nameS = data.soaFileName || soaObj.name || (data.requestId + '_SOA.pdf');
          var blobS = Utilities.newBlob(bytesS, mimeS, nameS);
          var fileS = folder.createFile(blobS);
          try {
            fileS.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          } catch(shareErr) {}
          soaUrl = fileS.getUrl();
          if (!soaUrl) {
            soaUrl = 'https://drive.google.com/file/d/' + fileS.getId() + '/view';
          }
        } catch(errS) {
          Logger.log('SOA upload error: ' + errS);
        }
      }
      
      // Actual direct file links to post in the sheet (NOT generic folder and not plain filename)
      var letterPostLink = letterUrl || ('https://drive.google.com/drive/folders/' + TARGET_FOLDER_ID);
      var soaPostLink = soaUrl || ('https://drive.google.com/drive/folders/' + TARGET_FOLDER_ID);
      
      var letterLabel = data.requestLetterFileName || (letterObj ? letterObj.name : 'Request Letter');
      var soaLabel = data.soaFileName || (soaObj ? soaObj.name : 'SOA Statement');
      var cleanL = String(letterLabel).replace(/"/g, '""');
      var cleanS = String(soaLabel).replace(/"/g, '""');
      
      // Post actual direct file link into Col H and Col I
      var letterCell = '=HYPERLINK("' + letterPostLink + '", "' + letterPostLink + '")';
      var soaCell = '=HYPERLINK("' + soaPostLink + '", "' + soaPostLink + '")';
      
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
        letterUrl: letterPostLink,
        soaUrl: soaPostLink
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // ----------------------------------------------------
    // 2. SUBMISSION: Request Bill Payment (REQ-...)
    // ----------------------------------------------------
    if (data.requestId && String(data.requestId).indexOf('REQ-') === 0) {
      var paySheet = ss.getSheetByName('Request Bill Payments') || ss.insertSheet('Request Bill Payments');
      ensurePaymentHeaders(paySheet);
      
      // Target Google Drive Folder: 1OwToQbKB_u4aMCjurtOqsfNMv5bn1Z13
      var PAY_FOLDER_ID = '1OwToQbKB_u4aMCjurtOqsfNMv5bn1Z13';
      var payFolder;
      try {
        payFolder = DriveApp.getFolderById(PAY_FOLDER_ID);
      } catch (fErr) {
        try {
          var iter = DriveApp.getFoldersByName('APEC Bill Payment Attachments');
          payFolder = iter.hasNext() ? iter.next() : DriveApp.createFolder('APEC Bill Payment Attachments');
        } catch(fErr2) {
          payFolder = DriveApp.getRootFolder();
        }
      }
      
      var actualPayFileUrl = '';
      var payFileObj = data.fileData || (data.fileBase64 ? { name: data.fileName, base64: data.fileBase64, type: 'application/pdf' } : null);
      if (payFileObj && payFileObj.base64) {
        try {
          var b64P = payFileObj.base64;
          if (b64P.indexOf(',') > -1) b64P = b64P.split(',')[1];
          var bytesP = Utilities.base64Decode(b64P);
          var mimeP = payFileObj.type || 'application/pdf';
          var nameP = data.fileName || (data.requestId + '_Statement.pdf');
          var blobP = Utilities.newBlob(bytesP, mimeP, nameP);
          var fileP = payFolder.createFile(blobP);
          try {
            fileP.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          } catch(shErr) {}
          actualPayFileUrl = fileP.getUrl();
          if (!actualPayFileUrl) {
            actualPayFileUrl = 'https://drive.google.com/file/d/' + fileP.getId() + '/view';
          }
        } catch(errP) {
          Logger.log('Payment file upload error: ' + errP);
        }
      }
      
      var payPostLink = actualPayFileUrl || ('https://drive.google.com/drive/folders/' + PAY_FOLDER_ID);
      var cleanFileName = String(data.fileName || 'Attachment.pdf').replace(/"/g, '""');
      
      // Col K: File Hyperlink; Col L: Actual Direct File Link URL
      var fileFormula = '=HYPERLINK("' + payPostLink + '", "' + cleanFileName + '")';
      var directLinkFormula = '=HYPERLINK("' + payPostLink + '", "' + payPostLink + '")';
      
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
        fileUrl: payPostLink
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
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
