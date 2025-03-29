// Utilities.gs - Helper functions for error handling, logging, and common operations

// Constants for logging
const LOG_SHEET_ID = "1Z1z0vnJMZ8-kdOrbGGQqA34WsJ7Lt2wBnMQwpf4OTFc";
const LOG_SHEET_NAME = "SystemLogs";
const ERROR_LOG_SHEET_NAME = "ErrorLogs";

// Log levels
const LOG_LEVEL = {
  DEBUG: "DEBUG",
  INFO: "INFO",
  WARNING: "WARNING",
  ERROR: "ERROR"
};

// Default minimum log level to record (can be changed in properties)
const DEFAULT_MIN_LOG_LEVEL = LOG_LEVEL.INFO;

// Log an event to the log sheet
function logEvent(level, message, data) {
  try {
    // Check if we should log this level
    if (!shouldLogLevel(level)) {
      return;
    }
    
    // Open log sheet
    const sheet = SpreadsheetApp.openById(LOG_SHEET_ID).getSheetByName(LOG_SHEET_NAME);
    
    // Prepare log entry
    const timestamp = new Date();
    const userEmail = Session.getActiveUser().getEmail();
    const dataStr = data ? JSON.stringify(data) : "";
    
    // Append log entry
    sheet.appendRow([timestamp, level, userEmail, message, dataStr]);
    
    // If this is an error, also log to error sheet
    if (level === LOG_LEVEL.ERROR) {
      logError(message, data);
    }
  } catch (error) {
    // Can't do much if logging itself fails, but at least write to console
    console.error("Failed to log event: " + error.message);
  }
}

// Log an error to the error log sheet
function logError(message, data) {
  try {
    // Open error log sheet
    const sheet = SpreadsheetApp.openById(LOG_SHEET_ID).getSheetByName(ERROR_LOG_SHEET_NAME);
    
    // Prepare log entry
    const timestamp = new Date();
    const userEmail = Session.getActiveUser().getEmail();
    const stack = new Error().stack;
    const dataStr = data ? JSON.stringify(data) : "";
    
    // Append log entry
    sheet.appendRow([timestamp, userEmail, message, stack, dataStr]);
    
    // Optional: Send error notification for critical errors
    // sendErrorNotification("System Error", message);
  } catch (error) {
    // Can't do much if error logging itself fails
    console.error("Failed to log error: " + error.message);
  }
}

// Check if we should log this level
function shouldLogLevel(level) {
  // Get minimum log level from properties
  const props = PropertiesService.getScriptProperties();
  const minLevel = props.getProperty("MIN_LOG_LEVEL") || DEFAULT_MIN_LOG_LEVEL;
  
  // Convert levels to numeric values for comparison
  const levelValues = {
    "DEBUG": 0,
    "INFO": 1,
    "WARNING": 2,
    "ERROR": 3
  };
  
  return levelValues[level] >= levelValues[minLevel];
}

// Set minimum log level
function setMinLogLevel(level) {
  if (!LOG_LEVEL[level]) {
    throw new Error("Invalid log level: " + level);
  }
  
  PropertiesService.getScriptProperties().setProperty("MIN_LOG_LEVEL", level);
}

// Get current log level
function getMinLogLevel() {
  return PropertiesService.getScriptProperties().getProperty("MIN_LOG_LEVEL") || DEFAULT_MIN_LOG_LEVEL;
}

// Clear logs older than a certain number of days
function clearOldLogs(days = 30) {
  try {
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    // Process regular logs
    clearOldLogEntries(LOG_SHEET_NAME, cutoffDate);
    
    // Process error logs
    clearOldLogEntries(ERROR_LOG_SHEET_NAME, cutoffDate);
    
    return true;
  } catch (error) {
    console.error("Error clearing old logs: " + error.message);
    return false;
  }
}

// Helper function to clear old log entries from a sheet
function clearOldLogEntries(sheetName, cutoffDate) {
  const sheet = SpreadsheetApp.openById(LOG_SHEET_ID).getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  
  // Find rows to delete
  const rowsToDelete = [];
  
  for (let i = 1; i < data.length; i++) {
    const logDate = new Date(data[i][0]);
    
    if (logDate < cutoffDate) {
      // +1 for header row, +1 because rows are 1-indexed
      rowsToDelete.push(i + 1);
    }
  }
  
  // Delete rows in reverse order (to avoid shifting issues)
  for (let i = rowsToDelete.length - 1; i >= 0; i--) {
    sheet.deleteRow(rowsToDelete[i]);
  }
}

// Get system configuration from Properties
function getSystemConfig() {
  const props = PropertiesService.getScriptProperties().getProperties();
  
  // Add default values for missing properties
  const config = {
    minLogLevel: props.MIN_LOG_LEVEL || DEFAULT_MIN_LOG_LEVEL,
    adminEmails: props.ADMIN_EMAILS ? props.ADMIN_EMAILS.split(",") : [],
    emailNotifications: props.EMAIL_NOTIFICATIONS === "true",
    sessionDurationHours: parseInt(props.SESSION_DURATION_HOURS || "4"),
    orderProcessingEnabled: props.ORDER_PROCESSING_ENABLED === "true"
  };
  
  return config;
}

// Update system configuration
function updateSystemConfig(config) {
  const props = PropertiesService.getScriptProperties();
  
  // Update properties
  if (config.minLogLevel) props.setProperty("MIN_LOG_LEVEL", config.minLogLevel);
  if (config.adminEmails) props.setProperty("ADMIN_EMAILS", config.adminEmails.join(","));
  if (config.emailNotifications !== undefined) props.setProperty("EMAIL_NOTIFICATIONS", config.emailNotifications.toString());
  if (config.sessionDurationHours) props.setProperty("SESSION_DURATION_HOURS", config.sessionDurationHours.toString());
  if (config.orderProcessingEnabled !== undefined) props.setProperty("ORDER_PROCESSING_ENABLED", config.orderProcessingEnabled.toString());
  
  return true;
}

// Get admin emails from properties
function getAdminEmails() {
  const config = getSystemConfig();
  return config.adminEmails;
}

// Validate email address format
function isValidEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

// Format date for display
function formatDate(date, format = "yyyy-MM-dd") {
  if (!date) return "";
  return Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), format);
}

// Format currency
function formatCurrency(amount) {
  return "$" + parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Generate a unique ID
function generateUniqueId() {
  return Utilities.getUuid();
}

// Sanitize HTML input to prevent XSS
function sanitizeHtml(html) {
  if (!html) return "";
  
  return html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Get data from sheet as JSON object array
function getSheetDataAsJson(sheetId, sheetName) {
  const sheet = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const result = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const obj = {};
    
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    
    result.push(obj);
  }
  
  return result;
}

// Add row to sheet from JSON object
function addJsonRowToSheet(sheetId, sheetName, jsonData) {
  const sheet = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const rowData = [];
  
  // Fill row data based on headers
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    rowData.push(jsonData[header] !== undefined ? jsonData[header] : "");
  }
  
  // Append row to sheet
  sheet.appendRow(rowData);
  
  return true;
}

// Update row in sheet based on key column and value
function updateSheetRowByKey(sheetId, sheetName, keyColumn, keyValue, jsonData) {
  const sheet = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Find key column index
  const keyColumnIndex = headers.indexOf(keyColumn);
  if (keyColumnIndex === -1) {
    throw new Error("Key column not found: " + keyColumn);
  }
  
  // Find row with matching key value
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][keyColumnIndex] === keyValue) {
      rowIndex = i;
      break;
    }
  }
  
  if (rowIndex === -1) {
    throw new Error("No row found with key value: " + keyValue);
  }
  
  // Update row data
  for (const key in jsonData) {
    const columnIndex = headers.indexOf(key);
    if (columnIndex !== -1) {
      sheet.getRange(rowIndex + 1, columnIndex + 1).setValue(jsonData[key]);
    }
  }
  
  return true;
}

// Delete row from sheet based on key column and value
function deleteSheetRowByKey(sheetId, sheetName, keyColumn, keyValue) {
  const sheet = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Find key column index
  const keyColumnIndex = headers.indexOf(keyColumn);
  if (keyColumnIndex === -1) {
    throw new Error("Key column not found: " + keyColumn);
  }
  
  // Find row with matching key value
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][keyColumnIndex] === keyValue) {
      rowIndex = i;
      break;
    }
  }
  
  if (rowIndex === -1) {
    throw new Error("No row found with key value: " + keyValue);
  }
  
  // Delete row (+1 because arrays are 0-indexed but sheets are 1-indexed)
  sheet.deleteRow(rowIndex + 1);
  
  return true;
}

// Create a simple hash of a string (not secure, just for basic obfuscation)
function simpleHash(text) {
  let hash = 0;
  if (text.length === 0) return hash;
  
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(16);
}

// Error handler wrapper for functions
function errorHandler(func) {
  return function() {
    try {
      return func.apply(this, arguments);
    } catch (error) {
      // Log the error
      logError(error.message, {
        functionName: func.name,
        arguments: JSON.stringify(arguments),
        stack: error.stack
      });
      
      // Throw a user-friendly error
      throw new Error("An error occurred: " + error.message);
    }
  };
}

// Create backup of a sheet
function createSheetBackup(sourceSheetId, sourceSheetName) {
  try {
    // Get source sheet
    const sourceSheet = SpreadsheetApp.openById(sourceSheetId).getSheetByName(sourceSheetName);
    
    // Create backup sheet name with timestamp
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss");
    const backupSheetName = sourceSheetName + "_Backup_" + timestamp;
    
    // Create backup in the same spreadsheet
    const spreadsheet = SpreadsheetApp.openById(sourceSheetId);
    const backupSheet = spreadsheet.insertSheet(backupSheetName);
    
    // Copy data from source to backup
    const sourceRange = sourceSheet.getDataRange();
    const sourceValues = sourceRange.getValues();
    const sourceFormulas = sourceRange.getFormulas();
    
    // Combine values and formulas
    const combined = [];
    for (let i = 0; i < sourceValues.length; i++) {
      const row = [];
      for (let j = 0; j < sourceValues[i].length; j++) {
        row.push(sourceFormulas[i][j] || sourceValues[i][j]);
      }
      combined.push(row);
    }
    
    // Write to backup sheet
    backupSheet.getRange(1, 1, combined.length, combined[0].length).setValues(combined);
    
    // Copy formatting
    sourceRange.copyFormatToRange(backupSheet, 1, sourceRange.getLastColumn(), 1, sourceRange.getLastRow());
    
    return {
      success: true,
      backupSheetName: backupSheetName
    };
  } catch (error) {
    console.error("Error creating backup: " + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Create a PDF from HTML content
function createPdfFromHtml(html, filename) {
  // Create a temporary HTML file
  const htmlFile = HtmlService.createHtmlOutput(html);
  
  // Convert to PDF
  const blob = htmlFile.getAs('application/pdf').setName(filename + '.pdf');
  
  // Save to Drive
  const file = DriveApp.createFile(blob);
  
  return file;
}

// Send system notification
function sendSystemNotification(title, message, level = "info") {
  // Log the notification
  logEvent(level.toUpperCase() === "ERROR" ? LOG_LEVEL.ERROR : LOG_LEVEL.INFO, title, { message: message });
  
  // Check if email notifications are enabled
  const config = getSystemConfig();
  if (config.emailNotifications && config.adminEmails.length > 0) {
    // Send email notification to admins
    GmailApp.sendEmail(
      config.adminEmails.join(","),
      "System Notification: " + title,
      message,
      {
        name: "Order Management System"
      }
    );
  }
}
