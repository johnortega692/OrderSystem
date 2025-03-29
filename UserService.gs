// UserService.gs - Server-side script for user management functionality

// Get all users
function getUsers() {
  try {
    const sheet = SpreadsheetApp.openById(USER_SHEET_ID).getSheetByName(USER_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find column indices
    const usernameCol = headers.indexOf("Username");
    const passwordCol = headers.indexOf("Password");
    const emailCol = headers.indexOf("Email");
    const firstNameCol = headers.indexOf("FirstName");
    const lastNameCol = headers.indexOf("LastName");
    const roleCol = headers.indexOf("Role");
    const isActiveCol = headers.indexOf("IsActive");
    const lastLoginCol = headers.indexOf("LastLogin");
    
    // Extract user data (excluding passwords)
    const users = [];
    for (let i = 1; i < data.length; i++) {
      users.push({
        Username: data[i][usernameCol],
        Email: data[i][emailCol],
        FirstName: data[i][firstNameCol],
        LastName: data[i][lastNameCol],
        Role: data[i][roleCol],
        IsActive: data[i][isActiveCol] !== false, // Default to true if not specified
        LastLogin: data[i][lastLoginCol]
      });
    }
    
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new Error("Could not load users: " + error.message);
  }
}

// Add a new user
function addUser(userData) {
  try {
    // Validate required fields
    if (!userData.Username || !userData.Password || !userData.Email || !userData.FirstName || !userData.LastName) {
      return {
        success: false,
        message: "Missing required fields"
      };
    }
    
    // Check if username already exists
    if (userExists(userData.Username)) {
      return {
        success: false,
        message: "Username already exists"
      };
    }
    
    // Get user sheet
    const sheet = SpreadsheetApp.openById(USER_SHEET_ID).getSheetByName(USER_SHEET_NAME);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Prepare user row
    const userRow = [];
    headers.forEach(header => {
      switch (header) {
        case "Username":
          userRow.push(userData.Username);
          break;
        case "Password":
          // In a production app, you would hash the password
          // For simplicity, we'll just store it as-is
          userRow.push(userData.Password);
          break;
        case "Email":
          userRow.push(userData.Email);
          break;
        case "FirstName":
          userRow.push(userData.FirstName);
          break;
        case "LastName":
          userRow.push(userData.LastName);
          break;
        case "Role":
          userRow.push(userData.Role || "standard");
          break;
        case "IsActive":
          userRow.push(userData.IsActive !== false); // Default to true if not specified
          break;
        case "CreatedDate":
          userRow.push(new Date());
          break;
        default:
          userRow.push("");
      }
    });
    
    // Add user to sheet
    sheet.appendRow(userRow);
    
    // Log event
    logEvent(LOG_LEVEL.INFO, "User added", {
      username: userData.Username,
      addedBy: Session.getActiveUser().getEmail()
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error("Error adding user:", error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Update an existing user
function updateUser(userData) {
  try {
    // Validate required fields
    if (!userData.Username || !userData.Email || !userData.FirstName || !userData.LastName) {
      return {
        success: false,
        message: "Missing required fields"
      };
    }
    
    // Get user sheet
    const sheet = SpreadsheetApp.openById(USER_SHEET_ID).getSheetByName(USER_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find column indices
    const usernameCol = headers.indexOf("Username");
    const passwordCol = headers.indexOf("Password");
    const emailCol = headers.indexOf("Email");
    const firstNameCol = headers.indexOf("FirstName");
    const lastNameCol = headers.indexOf("LastName");
    const roleCol = headers.indexOf("Role");
    const isActiveCol = headers.indexOf("IsActive");
    const updatedDateCol = headers.indexOf("UpdatedDate");
    
    // Find user row
    let userRowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][usernameCol] === userData.Username) {
        userRowIndex = i;
        break;
      }
    }
    
    if (userRowIndex === -1) {
      return {
        success: false,
        message: "User not found"
      };
    }
    
    // Update user data
    sheet.getRange(userRowIndex + 1, emailCol + 1).setValue(userData.Email);
    sheet.getRange(userRowIndex + 1, firstNameCol + 1).setValue(userData.FirstName);
    sheet.getRange(userRowIndex + 1, lastNameCol + 1).setValue(userData.LastName);
    sheet.getRange(userRowIndex + 1, roleCol + 1).setValue(userData.Role || "standard");
    sheet.getRange(userRowIndex + 1, isActiveCol + 1).setValue(userData.IsActive !== false);
    
    // Update password if provided
    if (userData.Password) {
      sheet.getRange(userRowIndex + 1, passwordCol + 1).setValue(userData.Password);
    }
    
    // Update updated date
    if (updatedDateCol !== -1) {
      sheet.getRange(userRowIndex + 1, updatedDateCol + 1).setValue(new Date());
    }
    
    // Log event
    logEvent(LOG_LEVEL.INFO, "User updated", {
      username: userData.Username,
      updatedBy: Session.getActiveUser().getEmail()
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error("Error updating user:", error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Delete a user
function deleteUser(username) {
  try {
    // Check if current user is trying to delete themselves
    if (Session.getActiveUser().getEmail() === getUserEmail(username)) {
      return {
        success: false,
        message: "You cannot delete your own account"
      };
    }
    
    // Get user sheet
    const sheet = SpreadsheetApp.openById(USER_SHEET_ID).getSheetByName(USER_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find username column
    const usernameCol = headers.indexOf("Username");
    
    // Find user row
    let userRowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][usernameCol] === username) {
        userRowIndex = i;
        break;
      }
    }
    
    if (userRowIndex === -1) {
      return {
        success: false,
        message: "User not found"
      };
    }
    
    // Delete user row
    sheet.deleteRow(userRowIndex + 1);
    
    // Log event
    logEvent(LOG_LEVEL.INFO, "User deleted", {
      username: username,
      deletedBy: Session.getActiveUser().getEmail()
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error("Error deleting user:", error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Check if a username already exists
function userExists(username) {
  const sheet = SpreadsheetApp.openById(USER_SHEET_ID).getSheetByName(USER_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Find username column
  const usernameCol = headers.indexOf("Username");
  
  // Check if username exists
  for (let i = 1; i < data.length; i++) {
    if (data[i][usernameCol] === username) {
      return true;
    }
  }
  
  return false;
}

// Get user email by username
function getUserEmail(username) {
  const sheet = SpreadsheetApp.openById(USER_SHEET_ID).getSheetByName(USER_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Find column indices
  const usernameCol = headers.indexOf("Username");
  const emailCol = headers.indexOf("Email");
  
  // Find user row
  for (let i = 1; i < data.length; i++) {
    if (data[i][usernameCol] === username) {
      return data[i][emailCol];
    }
  }
  
  return null;
}

// Get user by username
function getUser(username) {
  const sheet = SpreadsheetApp.openById(USER_SHEET_ID).getSheetByName(USER_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Find column indices
  const usernameCol = headers.indexOf("Username");
  const emailCol = headers.indexOf("Email");
  const firstNameCol = headers.indexOf("FirstName");
  const lastNameCol = headers.indexOf("LastName");
  const roleCol = headers.indexOf("Role");
  const isActiveCol = headers.indexOf("IsActive");
  
  // Find user row
  for (let i = 1; i < data.length; i++) {
    if (data[i][usernameCol] === username) {
      return {
        Username: data[i][usernameCol],
        Email: data[i][emailCol],
        FirstName: data[i][firstNameCol],
        LastName: data[i][lastNameCol],
        Role: data[i][roleCol],
        IsActive: data[i][isActiveCol] !== false
      };
    }
  }
  
  return null;
}

// Initialize user sheet with default admin user
function initializeUserSheet() {
  try {
    const sheet = SpreadsheetApp.openById(USER_SHEET_ID).getSheetByName(USER_SHEET_NAME);
    
    // Check if sheet exists
    if (!sheet) {
      // Create sheet
      const ss = SpreadsheetApp.openById(USER_SHEET_ID);
      const newSheet = ss.insertSheet(USER_SHEET_NAME);
      
      // Add headers
      newSheet.appendRow([
        "Username",
        "Password",
        "Email",
        "FirstName",
        "LastName",
        "Role",
        "IsActive",
        "LastLogin",
        "SessionToken",
        "CreatedDate",
        "UpdatedDate"
      ]);
      
      // Format headers
      newSheet.getRange(1, 1, 1, 11).setFontWeight("bold");
      
      // Add default admin user
      newSheet.appendRow([
        "admin",
        "admin123", // In a production app, you would hash the password
        Session.getActiveUser().getEmail(),
        "System",
        "Administrator",
        "admin",
        true,
        new Date(),
        "",
        new Date(),
        ""
      ]);
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error initializing user sheet:", error);
    return false;
  }
}
