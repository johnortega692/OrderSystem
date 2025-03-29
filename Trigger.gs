// Triggers.gs - Automation triggers for the system

// Create time-based triggers
function setupTriggers() {
  // Delete existing triggers
  deleteTriggers();
  
  // Create trigger to run every 5 minutes
  ScriptApp.newTrigger('processOrders')
    .timeBased()
    .everyMinutes(5)
    .create();
    
  Logger.log('Triggers have been set up.');
}

// Delete all existing triggers
function deleteTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  
  for (let i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  
  Logger.log('All triggers have been deleted.');
}

// Process orders (runs every 5 minutes)
function processOrders() {
  try {
    // Open orders sheet
    const sheet = SpreadsheetApp.openById(MATERIAL_ORDERS_SHEET_ID).getSheetByName(ORDERS_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find column indices
    const orderNumberCol = headers.indexOf("OrderNumber");
    const statusCol = headers.indexOf("Status");
    const processedCol = headers.indexOf("ProcessedDate");
    
    // Loop through orders and process new ones
    for (let i = 1; i < data.length; i++) {
      if (data[i][statusCol] === "Submitted" && !data[i][processedCol]) {
        // Get the row number (add 1 because arrays are 0-indexed but sheets are 1-indexed)
        const rowNumber = i + 1;
        
        // Update the status to "Processing"
        sheet.getRange(rowNumber, statusCol + 1).setValue("Processing");
        
        // Record processed date
        sheet.getRange(rowNumber, processedCol + 1).setValue(new Date());
        
        // Log the processing
        console.log("Processing order: " + data[i][orderNumberCol]);
        
        // Here you would add any additional processing logic
        // For example, sending the order to an external system,
        // updating inventory, etc.
      }
    }
  } catch (error) {
    console.error("Error in processOrders: " + error.message);
    // Send error notification to admin
    sendErrorNotification("Order Processing Error", error.message);
  }
}

// Send error notification to admin
function sendErrorNotification(subject, errorMessage) {
  const adminEmails = getAdminEmails();
  
  if (adminEmails && adminEmails.length > 0) {
    const body = "An error occurred in the Order Management System:\n\n" +
                "Time: " + new Date().toString() + "\n\n" +
                "Error: " + errorMessage;
    
    GmailApp.sendEmail(
      adminEmails.join(","),
      "ERROR: " + subject,
      body,
      {
        name: "Order Management System"
      }
    );
  }
}
