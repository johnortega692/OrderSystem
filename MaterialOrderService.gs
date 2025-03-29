// MaterialOrderService.gs - Server-side script for handling material orders

// Spreadsheet IDs
const MATERIAL_ORDERS_SHEET_ID = "17byhABfMPn_OUnE88mQtAnAuGqcIFM8FW5qsFb7BLmg";
const JOBS_SHEET_ID = "1nJcg4lgoySD4zMKGQ3P4hwx3-HtHpAypKQOm8dhgTqc";
const VENDORS_SHEET_ID = "1nJcg4lgoySD4zMKGQ3P4hwx3-HtHpAypKQOm8dhgTqc";
const PRODUCTS_SHEET_ID = "1nJcg4lgoySD4zMKGQ3P4hwx3-HtHpAypKQOm8dhgTqc";

// Sheet names
const ORDERS_SHEET_NAME = "Orders";
const ORDERS_ITEMS_SHEET_NAME = "OrderItems";
const JOBS_SHEET_NAME = "Jobs";
const VENDORS_SHEET_NAME = "Vendors";
const PRODUCTS_SHEET_NAME = "Products";

// Template document ID for PDF generation
const TEMPLATE_DOC_ID = "REPLACE_WITH_YOUR_DOC_ID";

// Temporary implementation to return mock job numbers
function getJobNumbers() {
  return [
    {number: "J001", name: "Sample Job 1"},
    {number: "J002", name: "Sample Job 2"}
  ];
}

// Temporary implementation to return mock vendors
function getVendors() {
  return [
    {id: "V001", name: "Vendor 1"},
    {id: "V002", name: "Vendor 2"}
  ];
}

// Temporary implementation to return mock products
function getProducts(vendorId, category) {
  return [
    {id: "P001", name: "Product 1"},
    {id: "P002", name: "Product 2"}
  ];
}

// Temporary implementation for order submission
function submitMaterialOrder(orderData) {
  // Log the order data
  console.log(orderData);
  
  // Generate a fake order number
  const orderNumber = "ORD-" + new Date().getTime().toString().substr(-6);
  
  return {
    success: true,
    orderNumber: orderNumber
  };
}

// Get all vendors
function getVendors() {
  try {
    const sheet = SpreadsheetApp.openById(VENDORS_SHEET_ID).getSheetByName(VENDORS_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find column indices
    const idCol = headers.indexOf("ID");
    const nameCol = headers.indexOf("Name");
    
    // Extract vendor data
    const vendors = [];
    for (let i = 1; i < data.length; i++) {
      vendors.push({
        id: data[i][idCol],
        name: data[i][nameCol]
      });
    }
    
    return vendors;
  } catch (error) {
    console.error("Error fetching vendors:", error);
    throw new Error("Could not load vendors: " + error.message);
  }
}

// Get products based on vendor and category
function getProducts(vendorId, category) {
  try {
    const sheet = SpreadsheetApp.openById(PRODUCTS_SHEET_ID).getSheetByName(PRODUCTS_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find column indices
    const idCol = headers.indexOf("ID");
    const nameCol = headers.indexOf("Name");
    const vendorCol = headers.indexOf("VendorID");
    const categoryCol = headers.indexOf("Category");
    
    // Extract filtered products
    const products = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][vendorCol] === vendorId && data[i][categoryCol] === category) {
        products.push({
          id: data[i][idCol],
          name: data[i][nameCol]
        });
      }
    }
    
    return products;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw new Error("Could not load products: " + error.message);
  }
}

// Submit material order
function submitMaterialOrder(orderData) {
  try {
    // Validate delivery type
    if (orderData.deliveryType === "delivery") {
      if (!orderData.deliveryAddress) {
        return { success: false, message: "Delivery address is required" };
      }
      if (!orderData.deliveryDate) {
        return { success: false, message: "Delivery date is required" };
      }
    }
    
    // Generate order number
    const orderNumber = generateOrderNumber();
    
    // Save order to sheet
    saveOrderToSheet(orderNumber, orderData);
    
    // Generate PDF
    const pdfFile = generateOrderPDF(orderNumber, orderData);
    
    // Send email notification
    sendOrderEmail(orderNumber, orderData, pdfFile);
    
    return { 
      success: true, 
      message: "Order submitted successfully", 
      orderNumber: orderNumber 
    };
  } catch (error) {
    console.error("Error submitting order:", error);
    return { 
      success: false, 
      message: "Error: " + error.message 
    };
  }
}

// Generate unique order number
function generateOrderNumber() {
  const now = new Date();
  const year = now.getFullYear().toString().substr(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  
  // Get current count for today
  const sheet = SpreadsheetApp.openById(MATERIAL_ORDERS_SHEET_ID).getSheetByName(ORDERS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const orderNumberCol = headers.indexOf("OrderNumber");
  const dateCol = headers.indexOf("OrderDate");
  
  // Count today's orders
  let todayCount = 0;
  const today = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd");
  
  for (let i = 1; i < data.length; i++) {
    const rowDate = data[i][dateCol];
    if (rowDate) {
      const formattedRowDate = Utilities.formatDate(rowDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
      if (formattedRowDate === today) {
        todayCount++;
      }
    }
  }
  
  // Format: 25-03-28-001 (YY-MM-DD-Sequential)
  return year + "-" + month + "-" + day + "-" + (todayCount + 1).toString().padStart(3, '0');
}

// Save order to spreadsheet
function saveOrderToSheet(orderNumber, orderData) {
  // Open orders sheet
  const ordersSheet = SpreadsheetApp.openById(MATERIAL_ORDERS_SHEET_ID).getSheetByName(ORDERS_SHEET_NAME);
  const orderItemsSheet = SpreadsheetApp.openById(MATERIAL_ORDERS_SHEET_ID).getSheetByName(ORDERS_ITEMS_SHEET_NAME);
  
  // Get headers
  const ordersHeaders = ordersSheet.getRange(1, 1, 1, ordersSheet.getLastColumn()).getValues()[0];
  const orderItemsHeaders = orderItemsSheet.getRange(1, 1, 1, orderItemsSheet.getLastColumn()).getValues()[0];
  
  // Prepare order row data
  const orderRow = [];
  
  // Fill order row based on headers
  for (let i = 0; i < ordersHeaders.length; i++) {
    const header = ordersHeaders[i];
    
    switch(header) {
      case "OrderNumber":
        orderRow.push(orderNumber);
        break;
      case "JobNumber":
        orderRow.push(orderData.jobNumber);
        break;
      case "JobName":
        orderRow.push(orderData.jobName);
        break;
      case "VendorID":
        orderRow.push(orderData.vendor.id);
        break;
      case "VendorName":
        orderRow.push(orderData.vendor.name);
        break;
      case "DeliveryType":
        orderRow.push(orderData.deliveryType);
        break;
      case "DeliveryAddress":
        orderRow.push(orderData.deliveryAddress || "");
        break;
      case "DeliveryDate":
        orderRow.push(orderData.deliveryDate ? new Date(orderData.deliveryDate) : "");
        break;
      case "ContactPhone":
        orderRow.push(orderData.contactPhone || "");
        break;
      case "Notes":
        orderRow.push(orderData.notes || "");
        break;
      case "Status":
        orderRow.push("Submitted");
        break;
      case "OrderDate":
        orderRow.push(new Date());
        break;
      case "UserName":
        orderRow.push(orderData.user.name);
        break;
      case "UserEmail":
        orderRow.push(orderData.user.email);
        break;
      default:
        orderRow.push("");
    }
  }
  
  // Append order to sheet
  ordersSheet.appendRow(orderRow);
  
  // Add order items
  for (let i = 0; i < orderData.items.length; i++) {
    const item = orderData.items[i];
    const itemDetailsStr = JSON.stringify(item.details);
    
    // Prepare item row
    const itemRow = [];
    
    // Fill item row based on headers
    for (let j = 0; j < orderItemsHeaders.length; j++) {
      const header = orderItemsHeaders[j];
      
      switch(header) {
        case "OrderNumber":
          itemRow.push(orderNumber);
          break;
        case "ProductID":
          itemRow.push(item.productId);
          break;
        case "Category":
          itemRow.push(item.category);
          break;
        case "Quantity":
          itemRow.push(item.quantity);
          break;
        case "Details":
          itemRow.push(itemDetailsStr);
          break;
        case "DateAdded":
          itemRow.push(new Date());
          break;
        default:
          itemRow.push("");
      }
    }
    
    // Append item to sheet
    orderItemsSheet.appendRow(itemRow);
  }
  
  return orderNumber;
}

// Generate PDF for order
function generateOrderPDF(orderNumber, orderData) {
  // Open template document
  const templateDoc = DocumentApp.openById(TEMPLATE_DOC_ID);
  const body = templateDoc.getBody();
  
  // Create a copy for this order
  const orderDocName = "Order " + orderNumber + " - " + orderData.jobName;
  const orderDoc = DocumentApp.create(orderDocName);
  orderDoc.getBody().appendParagraph(body.getText());
  
  // Replace placeholders in document
  const docBody = orderDoc.getBody();
  
  // Basic order information
  docBody.replaceText("{{ORDER_NUMBER}}", orderNumber);
  docBody.replaceText("{{ORDER_DATE}}", Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"));
  docBody.replaceText("{{JOB_NUMBER}}", orderData.jobNumber);
  docBody.replaceText("{{JOB_NAME}}", orderData.jobName);
  docBody.replaceText("{{VENDOR_NAME}}", orderData.vendor.name);
  docBody.replaceText("{{DELIVERY_TYPE}}", orderData.deliveryType === "delivery" ? "Delivery" : "Will Call");
  
  // Delivery details
  if (orderData.deliveryType === "delivery") {
    docBody.replaceText("{{DELIVERY_ADDRESS}}", orderData.deliveryAddress);
    docBody.replaceText("{{DELIVERY_DATE}}", orderData.deliveryDate);
    docBody.replaceText("{{CONTACT_PHONE}}", orderData.contactPhone);
  } else {
    docBody.replaceText("{{DELIVERY_ADDRESS}}", "N/A");
    docBody.replaceText("{{DELIVERY_DATE}}", "N/A");
    docBody.replaceText("{{CONTACT_PHONE}}", "N/A");
  }
  
  // Order notes
  docBody.replaceText("{{ORDER_NOTES}}", orderData.notes || "None");
  
  // User information
  docBody.replaceText("{{USER_NAME}}", orderData.user.name);
  docBody.replaceText("{{USER_EMAIL}}", orderData.user.email);
  
  // Build order items table
  let itemsTable = "";
  for (let i = 0; i < orderData.items.length; i++) {
    const item = orderData.items[i];
    itemsTable += (i + 1) + ". ";
    
    // Format based on category
    switch(item.category) {
      case "paint":
        itemsTable += item.quantity + " x Paint: ";
        if (item.details.color) itemsTable += "Color: " + item.details.color + ", ";
        if (item.details.finish) itemsTable += "Finish: " + item.details.finish + ", ";
        if (item.details.size) itemsTable += "Size: " + item.details.size;
        break;
      case "sundries":
        itemsTable += item.quantity + " x Sundries: ";
        if (item.details.size) itemsTable += "Size: " + item.details.size + ", ";
        if (item.details.unit) itemsTable += "Unit: " + item.details.unit;
        break;
      case "package":
        itemsTable += item.quantity + " x Package";
        if (item.details.notes) itemsTable += " - Notes: " + item.details.notes;
        break;
    }
    
    // Add line break if not last item
    if (i < orderData.items.length - 1) {
      itemsTable += "\n";
    }
  }
  
  docBody.replaceText("{{ORDER_ITEMS}}", itemsTable);
  
  // Save document
  orderDoc.saveAndClose();
  
  // Convert to PDF and get file
  const pdfBlob = DriveApp.getFileById(orderDoc.getId()).getAs("application/pdf");
  const pdfFile = DriveApp.createFile(pdfBlob);
  
  // Return file for email attachment
  return pdfFile;
}

// Send email notification with order details
function sendOrderEmail(orderNumber, orderData, pdfFile) {
  // Prepare email recipients
  const recipients = [orderData.user.email];
  
  // Add admin recipients if configured
  const adminEmails = getAdminEmails();
  if (adminEmails && adminEmails.length > 0) {
    recipients.push(...adminEmails);
  }
  
  // Prepare email subject
  const subject = "Material Order " + orderNumber + " - " + orderData.jobName;
  
  // Prepare email body (HTML)
  let body = "<h2>Material Order " + orderNumber + "</h2>";
  body += "<p><strong>Job:</strong> " + orderData.jobNumber + " - " + orderData.jobName + "</p>";
  body += "<p><strong>Vendor:</strong> " + orderData.vendor.name + "</p>";
  body += "<p><strong>Delivery Type:</strong> " + (orderData.deliveryType === "delivery" ? "Delivery" : "Will Call") + "</p>";
  
  if (orderData.deliveryType === "delivery") {
    body += "<p><strong>Delivery Address:</strong> " + orderData.deliveryAddress + "</p>";
    body += "<p><strong>Delivery Date:</strong> " + orderData.deliveryDate + "</p>";
    body += "<p><strong>Contact Phone:</strong> " + orderData.contactPhone + "</p>";
  }
  
  body += "<p><strong>Order Date:</strong> " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd") + "</p>";
  body += "<p><strong>Ordered By:</strong> " + orderData.user.name + "</p>";
  
  if (orderData.notes) {
    body += "<p><strong>Notes:</strong> " + orderData.notes + "</p>";
  }
  
  body += "<h3>Order Items:</h3>";
  body += "<ol>";
  
  for (let i = 0; i < orderData.items.length; i++) {
    const item = orderData.items[i];
    body += "<li><strong>Quantity:</strong> " + item.quantity + " - ";
    
    // Format based on category
    switch(item.category) {
      case "paint":
        body += "<strong>Paint</strong> - ";
        if (item.details.color) body += "Color: " + item.details.color + ", ";
        if (item.details.finish) body += "Finish: " + item.details.finish + ", ";
        if (item.details.size) body += "Size: " + item.details.size;
        break;
      case "sundries":
        body += "<strong>Sundries</strong> - ";
        if (item.details.size) body += "Size: " + item.details.size + ", ";
        if (item.details.unit) body += "Unit: " + item.details.unit;
        break;
      case "package":
        body += "<strong>Package</strong>";
        if (item.details.notes) body += " - Notes: " + item.details.notes;
        break;
    }
    
    body += "</li>";
  }
  
  body += "</ol>";
  body += "<p>Please see the attached PDF for a printable version of this order.</p>";
  body += "<p>This is an automated notification. Please do not reply to this email.</p>";
  
  // Send email with PDF attachment
  GmailApp.sendEmail(
    recipients.join(","),
    subject,
    "This is an HTML email. Please enable HTML to view it properly.",
    {
      htmlBody: body,
      attachments: [pdfFile],
      name: "Material Order System"
    }
  );
}

// Get admin email addresses
function getAdminEmails() {
  // This could be stored in user sheet or properties service
  // For now, return an empty array
  return [];
}

// Get order history for a job
function getOrderHistoryByJob(jobNumber) {
  try {
    const sheet = SpreadsheetApp.openById(MATERIAL_ORDERS_SHEET_ID).getSheetByName(ORDERS_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find column indices
    const orderNumberCol = headers.indexOf("OrderNumber");
    const jobNumberCol = headers.indexOf("JobNumber");
    const orderDateCol = headers.indexOf("OrderDate");
    const vendorNameCol = headers.indexOf("VendorName");
    const statusCol = headers.indexOf("Status");
    
    // Filter orders for the job
    const orders = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][jobNumberCol] === jobNumber) {
        orders.push({
          orderNumber: data[i][orderNumberCol],
          orderDate: Utilities.formatDate(new Date(data[i][orderDateCol]), Session.getScriptTimeZone(), "yyyy-MM-dd"),
          vendorName: data[i][vendorNameCol],
          status: data[i][statusCol]
        });
      }
    }
    
    return orders;
  } catch (error) {
    console.error("Error fetching order history:", error);
    throw new Error("Could not load order history: " + error.message);
  }
}

// Get order history for a user
function getOrderHistoryByUser(userEmail) {
  try {
    const sheet = SpreadsheetApp.openById(MATERIAL_ORDERS_SHEET_ID).getSheetByName(ORDERS_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find column indices
    const orderNumberCol = headers.indexOf("OrderNumber");
    const jobNumberCol = headers.indexOf("JobNumber");
    const jobNameCol = headers.indexOf("JobName");
    const orderDateCol = headers.indexOf("OrderDate");
    const vendorNameCol = headers.indexOf("VendorName");
    const statusCol = headers.indexOf("Status");
    const userEmailCol = headers.indexOf("UserEmail");
    
    // Filter orders for the user
    const orders = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][userEmailCol] === userEmail) {
        orders.push({
          orderNumber: data[i][orderNumberCol],
          jobNumber: data[i][jobNumberCol],
          jobName: data[i][jobNameCol],
          orderDate: Utilities.formatDate(new Date(data[i][orderDateCol]), Session.getScriptTimeZone(), "yyyy-MM-dd"),
          vendorName: data[i][vendorNameCol],
          status: data[i][statusCol]
        });
      }
    }
    
    return orders;
  } catch (error) {
    console.error("Error fetching user order history:", error);
    throw new Error("Could not load user order history: " + error.message);
  }
}

// Get order details
function getOrderDetails(orderNumber) {
  try {
    // Get order header information
    const ordersSheet = SpreadsheetApp.openById(MATERIAL_ORDERS_SHEET_ID).getSheetByName(ORDERS_SHEET_NAME);
    const ordersData = ordersSheet.getDataRange().getValues();
    const ordersHeaders = ordersData[0];
    
    // Find order header row
    let orderHeaderRow = null;
    const orderNumberCol = ordersHeaders.indexOf("OrderNumber");
    
    for (let i = 1; i < ordersData.length; i++) {
      if (ordersData[i][orderNumberCol] === orderNumber) {
        orderHeaderRow = ordersData[i];
        break;
      }
    }
    
    if (!orderHeaderRow) {
      throw new Error("Order not found");
    }
    
    // Build order header object
    const orderHeader = {};
    for (let i = 0; i < ordersHeaders.length; i++) {
      let value = orderHeaderRow[i];
      
      // Format dates
      if (value instanceof Date) {
        value = Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      
      orderHeader[ordersHeaders[i]] = value;
    }
    
    // Get order items
    const orderItemsSheet = SpreadsheetApp.openById(MATERIAL_ORDERS_SHEET_ID).getSheetByName(ORDERS_ITEMS_SHEET_NAME);
    const itemsData = orderItemsSheet.getDataRange().getValues();
    const itemsHeaders = itemsData[0];
    
    // Find relevant columns
    const itemOrderNumCol = itemsHeaders.indexOf("OrderNumber");
    const productIdCol = itemsHeaders.indexOf("ProductID");
    const categoryCol = itemsHeaders.indexOf("Category");
    const quantityCol = itemsHeaders.indexOf("Quantity");
    const detailsCol = itemsHeaders.indexOf("Details");
    
    // Get all items for this order
    const items = [];
    for (let i = 1; i < itemsData.length; i++) {
      if (itemsData[i][itemOrderNumCol] === orderNumber) {
        const item = {
          productId: itemsData[i][productIdCol],
          category: itemsData[i][categoryCol],
          quantity: itemsData[i][quantityCol],
          details: JSON.parse(itemsData[i][detailsCol] || "{}")
        };
        
        // Get product name
        item.productName = getProductName(item.productId);
        
        items.push(item);
      }
    }
    
    return {
      header: orderHeader,
      items: items
    };
  } catch (error) {
    console.error("Error fetching order details:", error);
    throw new Error("Could not load order details: " + error.message);
  }
}

// Get product name by ID
function getProductName(productId) {
  try {
    const sheet = SpreadsheetApp.openById(PRODUCTS_SHEET_ID).getSheetByName(PRODUCTS_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find column indices
    const idCol = headers.indexOf("ID");
    const nameCol = headers.indexOf("Name");
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][idCol] === productId) {
        return data[i][nameCol];
      }
    }
    
    return "Unknown Product";
  } catch (error) {
    console.error("Error fetching product name:", error);
    return "Unknown Product";
  }
}

// Get dashboard data
function getDashboardData(userEmail, isAdmin) {
  try {
    const data = {
      recentOrders: [],
      orderStats: {
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0
      },
      topJobs: []
    };
    
    // Get orders sheet
    const ordersSheet = SpreadsheetApp.openById(MATERIAL_ORDERS_SHEET_ID).getSheetByName(ORDERS_SHEET_NAME);
    const ordersData = ordersSheet.getDataRange().getValues();
    const ordersHeaders = ordersData[0];
    
    // Find column indices
    const orderNumberCol = ordersHeaders.indexOf("OrderNumber");
    const jobNumberCol = ordersHeaders.indexOf("JobNumber");
    const jobNameCol = ordersHeaders.indexOf("JobName");
    const orderDateCol = ordersHeaders.indexOf("OrderDate");
    const vendorNameCol = ordersHeaders.indexOf("VendorName");
    const statusCol = ordersHeaders.indexOf("Status");
    const userEmailCol = ordersHeaders.indexOf("UserEmail");
    
    // Process orders
    const allOrders = [];
    const jobCounts = {};
    
    for (let i = 1; i < ordersData.length; i++) {
      const orderRow = ordersData[i];
      const orderDate = new Date(orderRow[orderDateCol]);
      const status = orderRow[statusCol];
      const rowEmail = orderRow[userEmailCol];
      
      // Only include user's orders if not admin
      if (!isAdmin && rowEmail !== userEmail) {
        continue;
      }
      
      // Count orders
      data.orderStats.totalOrders++;
      
      if (status === "Completed") {
        data.orderStats.completedOrders++;
      } else if (status === "Submitted" || status === "Processing") {
        data.orderStats.pendingOrders++;
      }
      
      // Track job counts
      const jobNumber = orderRow[jobNumberCol];
      const jobName = orderRow[jobNameCol];
      
      if (!jobCounts[jobNumber]) {
        jobCounts[jobNumber] = {
          jobNumber: jobNumber,
          jobName: jobName,
          count: 0
        };
      }
      
      jobCounts[jobNumber].count++;
      
      // Add to all orders array for sorting
      allOrders.push({
        orderNumber: orderRow[orderNumberCol],
        jobNumber: jobNumber,
        jobName: jobName,
        orderDate: orderDate,
        vendorName: orderRow[vendorNameCol],
        status: status,
        userEmail: rowEmail
      });
    }
    
    // Sort orders by date (newest first) and get recent ones
    allOrders.sort((a, b) => b.orderDate - a.orderDate);
    data.recentOrders = allOrders.slice(0, 5);
    
    // Format dates for recent orders
    data.recentOrders.forEach(order => {
      order.orderDate = Utilities.formatDate(order.orderDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
    });
    
    // Get top jobs by order count
    const jobsArray = Object.values(jobCounts);
    jobsArray.sort((a, b) => b.count - a.count);
    data.topJobs = jobsArray.slice(0, 5);
    
    return data;
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    throw new Error("Could not load dashboard data: " + error.message);
  }
}


// Placeholder dashboard data function
function getDashboardData(userEmail, isAdmin) {
  // Return empty data structure for now
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

// Placeholder order details function
function getOrderDetails(orderNumber) {
  // Return dummy data
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

// Placeholder PDF generation function
function getOrderPdf(orderNumber) {
  return null;
}
