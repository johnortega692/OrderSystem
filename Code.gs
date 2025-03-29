// Code.gs - Main server-side script

// Global variables for sheets and properties
const USER_SHEET_ID = "16OcYrzU_dGadybhZXaxFul6JO-h7v8lFW2XkqdweQpE";
const USER_SHEET_NAME = "Users";
const SESSION_DURATION_HOURS = 4;

// Function to serve the login page
function doGet(e) {
  // Check if user has active session
  const sessionToken = getSessionToken(e);
  if (sessionToken) {
    const user = validateSession(sessionToken);
    if (user) {
      return loadMainApp(user);
    }
  }
  
  // No valid session, serve login page
  return HtmlService.createTemplateFromFile('Login')
    .evaluate()
    .setTitle('Order Management System - Login')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
// Process login attempt
function processLogin(username, password) {
  try {
    console.log("Login attempt: " + username);
    
    const user = validateCredentials(username, password);
    console.log("Credential validation completed");
    
    if (user) {
      console.log("Login successful for: " + username);
      return { 
        success: true, 
        user: user 
      };
    } else {
      console.log("Invalid credentials for: " + username);
      return { 
        success: false, 
        message: "Invalid username or password" 
      };
    }
  } catch (error) {
    console.error("Login error: " + error.message);
    return { 
      success: false, 
      message: "System error: " + error.message 
    };
  }
}
// Generate a random session token
function generateSessionToken() {
  return Utilities.getUuid();
}

// Get session token from URL parameters or cookies
function getSessionToken(e) {
  if (e && e.parameter && e.parameter.token) {
    return e.parameter.token;
  }
  // In a real app, you'd implement cookie handling here
  return null;
}

// Validate user credentials
function validateCredentials(username, password) {
  console.log("Validating credentials for: " + username);
  
  // Emergency admin login for troubleshooting
  if (username === "admin" && password === "123456") {
    console.log("Using emergency credentials");
    return {
      username: "admin",
      email: "admin@example.com",
      firstName: "System",
      lastName: "Administrator",
      role: "admin",
      sessionToken: generateSessionToken()
    };
  }
  
  const sheet = SpreadsheetApp.openById(USER_SHEET_ID).getSheetByName(USER_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headerRow = data[0];
  
  // Find column indices
  const usernameCol = headerRow.indexOf('Username');
  const passwordCol = headerRow.indexOf('Password');
  const emailCol = headerRow.indexOf('Email');
  const firstNameCol = headerRow.indexOf('FirstName');
  const lastNameCol = headerRow.indexOf('LastName');
  const roleCol = headerRow.indexOf('Role');
  const sessionTokenCol = headerRow.indexOf('SessionToken');
  const lastLoginCol = headerRow.indexOf('LastLogin');
  
  console.log("Username column index: " + usernameCol);
  console.log("Password column index: " + passwordCol);
  
  // Check if columns exist
  if (usernameCol === -1 || passwordCol === -1) {
    throw new Error('User sheet is missing required columns');
  }
  
  // Check for username matches
  for (let i = 1; i < data.length; i++) {
    console.log("Checking row " + i + ": " + data[i][usernameCol] + " / " + data[i][passwordCol]);
    
    if (data[i][usernameCol] === username) {
      console.log("Username match found!");
      console.log("Stored password: '" + data[i][passwordCol] + "'");
      console.log("Entered password: '" + password + "'");
      
      if (data[i][passwordCol] == password) {  // Use == instead of === for type coercion
        console.log("Password match!");
        
        // Generate session token
        const sessionToken = generateSessionToken();
        
        // Update session token and last login time in sheet
        const row = i + 1;
        sheet.getRange(row, sessionTokenCol + 1).setValue(sessionToken);
        sheet.getRange(row, lastLoginCol + 1).setValue(new Date());
        
        // Return user object
        return {
          username: data[i][usernameCol],
          email: data[i][emailCol],
          firstName: data[i][firstNameCol],
          lastName: data[i][lastNameCol],
          role: data[i][roleCol],
          sessionToken: sessionToken
        };
      } else {
        console.log("Password does not match");
      }
    }
  }
  
  // No matching user found
  console.log("No matching user found");
  return null;
}

// Validate session token
function validateSession(token) {
  const sheet = SpreadsheetApp.openById(USER_SHEET_ID).getSheetByName(USER_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headerRow = data[0];
  
  // Find column indices
  const usernameCol = headerRow.indexOf('Username');
  const emailCol = headerRow.indexOf('Email');
  const firstNameCol = headerRow.indexOf('FirstName');
  const lastNameCol = headerRow.indexOf('LastName');
  const roleCol = headerRow.indexOf('Role');
  const sessionTokenCol = headerRow.indexOf('SessionToken');
  const lastLoginCol = headerRow.indexOf('LastLogin');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][sessionTokenCol] === token) {
      // Check if session is still valid (within SESSION_DURATION_HOURS)
      const lastLogin = data[i][lastLoginCol];
      const now = new Date();
      const hoursSinceLogin = (now - lastLogin) / (1000 * 60 * 60);
      
      if (hoursSinceLogin < SESSION_DURATION_HOURS) {
        // Return user object
        return {
          username: data[i][usernameCol],
          email: data[i][emailCol],
          firstName: data[i][firstNameCol],
          lastName: data[i][lastNameCol],
          role: data[i][roleCol],
          sessionToken: token
        };
      }
    }
  }
  
  // No valid session found
  return null;
}

function loadMainApp(user) {
  return HtmlService.createHtmlOutput(
    "<html><body><h1>Dashboard</h1><p>Welcome, " + user.firstName + "!</p><p>Your role is: " + user.role + "</p></body></html>"
  )
  .setTitle('Order Management System');
}
// Check if user has admin role
function isAdmin(user) {
  return user && user.role === 'admin';
}

// Include HTML templates
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Logout function to clear session
function logout(sessionToken) {
  if (!sessionToken) return { success: true };
  
  try {
    const sheet = SpreadsheetApp.openById(USER_SHEET_ID).getSheetByName(USER_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headerRow = data[0];
    const sessionTokenCol = headerRow.indexOf('SessionToken');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][sessionTokenCol] === sessionToken) {
        // Clear session token
        sheet.getRange(i + 1, sessionTokenCol + 1).setValue("");
        break;
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error(error);
    return { 
      success: false, 
      message: "Error during logout: " + error.message 
    };
  }
}


function getDashboardData(userEmail, isAdmin) {
  return {
    orderStats: {
      totalOrders: 0,
      pendingOrders: 0,
      completedOrders: 0
    },
    recentOrders: [],
    topJobs: [],
    monthlyActivity: []
  };
}

function getOrderDetails(orderNumber) {
  return {
    header: {
      OrderNumber: "TEST-001",
      OrderDate: new Date().toLocaleDateString(),
      Status: "Submitted",
      JobNumber: "J001",
      JobName: "Test Job",
      VendorName: "Test Vendor",
      UserName: "Test User",
      DeliveryType: "Will Call",
      Notes: "Test order"
    },
    items: []
  };
}

function getOrderPdf(orderNumber) {
  return null;
}
