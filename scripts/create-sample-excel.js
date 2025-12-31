/**
 * Script to create sample Excel files for data import
 * Run with: node scripts/create-sample-excel.js
 */

const XLSX = require('xlsx');

// Create sample purchase data
function createPurchaseSample() {
  const data = [
    // Headers
    ['SrNo', 'Customer Name', 'GST Number', 'Bill No', 'Bill Date', 'HSN', 'Desc', 'GST%', 'Qty', 'UNIT', 'Taxable Amt', 'SGST', 'CGST', 'IGST', 'Oth Amt', 'Bill Amt'],
    // Sample rows
    ['1', 'V P TRADERS', '09ABPPA6876Q1ZN', 'VPT/25-26/11', '07-Apr-2025', '6107', '61079110', '5.00', '60.00', 'PCS', '15736.17', '393.41', '393.41', '0.00', '0.01', '16523.00'],
    ['2', 'Pragati Traders', '09ABDFP5746L1ZO', '2025-26/017', '08/Apr/2025', '6107', '61079110', '5.00', '50.00', 'PCS', '4357.13', '108.93', '108.93', '0.00', '0.01', '4575.00'],
    ['3', 'ABC Suppliers', '27AAAAA0000A1Z5', 'ABC/2025/001', '10-Apr-2025', '8517', 'Mobile Phone', '18.00', '10.00', 'PCS', '50000.00', '4500.00', '4500.00', '0.00', '0.00', '59000.00'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Purchases');
  
  XLSX.writeFile(wb, 'sample-purchases.xlsx');
  console.log('✅ Created sample-purchases.xlsx');
}

// Create sample product data
function createProductSample() {
  const data = [
    // Headers
    ['Name', 'SKU', 'Barcode', 'Category', 'Description', 'Unit', 'Purchase Price', 'Selling Price', 'Stock Quantity', 'Min Stock Level', 'HSN Code', 'GST Rate', 'Tax Type'],
    // Sample rows
    ['Samsung Galaxy S21', 'SAM-GAL-S21', '1234567890123', 'Electronics', 'Latest Samsung smartphone', 'pcs', '50000', '55000', '10', '5', '8517', '18', 'exclusive'],
    ['iPhone 13', 'APP-IPH-13', '9876543210987', 'Electronics', 'Apple iPhone 13', 'pcs', '60000', '65000', '5', '3', '8517', '18', 'exclusive'],
    ['Laptop Bag', 'BAG-LAP-001', '', 'Accessories', 'Premium laptop bag', 'pcs', '1000', '1200', '50', '10', '4202', '18', 'exclusive'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Products');
  
  XLSX.writeFile(wb, 'sample-products.xlsx');
  console.log('✅ Created sample-products.xlsx');
}

// Create sample customer data
function createCustomerSample() {
  const data = [
    // Headers
    ['Name', 'Email', 'Phone', 'GSTIN', 'Address', 'City', 'State', 'Pincode', 'Contact Person', 'Credit Limit'],
    // Sample rows
    ['ABC Traders', 'contact@abctraders.com', '+91-9876543210', '27AAAAA0000A1Z5', '456 Business Street', 'Delhi', 'Delhi', '110001', 'Mr. XYZ', '100000'],
    ['XYZ Enterprises', 'info@xyzent.com', '+91-9876543211', '09ABXYZ0000A1Z6', '789 Trade Avenue', 'Mumbai', 'Maharashtra', '400001', 'Mr. ABC', '50000'],
    ['Walk-in Customer', '', '', '', '', '', '', '', '', '0'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Customers');
  
  XLSX.writeFile(wb, 'sample-customers.xlsx');
  console.log('✅ Created sample-customers.xlsx');
}

// Create sample supplier data
function createSupplierSample() {
  const data = [
    // Headers
    ['Name', 'Email', 'Phone', 'GSTIN', 'Address', 'City', 'State', 'Pincode', 'Contact Person', 'Is Registered'],
    // Sample rows
    ['V P TRADERS', 'contact@vptraders.com', '+91-9876543200', '09ABPPA6876Q1ZN', '123 Supplier Street', 'Mumbai', 'Maharashtra', '400001', 'Mr. VP', 'Yes'],
    ['Pragati Traders', 'info@pragati.com', '+91-9876543201', '09ABDFP5746L1ZO', '456 Vendor Road', 'Delhi', 'Delhi', '110001', 'Mr. Pragati', 'Yes'],
    ['ABC Suppliers', 'sales@abcsuppliers.com', '+91-9876543202', '27AAAAA0000A1Z5', '789 Supply Lane', 'Bangalore', 'Karnataka', '560001', 'Mr. ABC', 'Yes'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Suppliers');
  
  XLSX.writeFile(wb, 'sample-suppliers.xlsx');
  console.log('✅ Created sample-suppliers.xlsx');
}

// Create sample category data
function createCategorySample() {
  const data = [
    // Headers
    ['Name', 'Description', 'Parent Category', 'Is Subcategory'],
    // Sample rows
    ['Electronics', 'Electronic products', '', 'No'],
    ['Mobile Phones', 'Mobile phones and accessories', 'Electronics', 'Yes'],
    ['Accessories', 'Phone and device accessories', 'Electronics', 'Yes'],
    ['Clothing', 'Clothing and apparel', '', 'No'],
    ['Men\'s Wear', 'Men\'s clothing', 'Clothing', 'Yes'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Categories');
  
  XLSX.writeFile(wb, 'sample-categories.xlsx');
  console.log('✅ Created sample-categories.xlsx');
}

// Create universal template with all data types
function createUniversalTemplate() {
  const wb = XLSX.utils.book_new();

  // Purchases Sheet
  const purchasesData = [
    ['SrNo', 'Customer Name', 'GST Number', 'Bill No', 'Bill Date', 'HSN', 'Desc', 'GST%', 'Qty', 'UNIT', 'Taxable Amt', 'SGST', 'CGST', 'IGST', 'Oth Amt', 'Bill Amt'],
    ['1', 'V P TRADERS', '09ABPPA6876Q1ZN', 'VPT/25-26/11', '07-Apr-2025', '6107', '61079110', '5.00', '60.00', 'PCS', '15736.17', '393.41', '393.41', '0.00', '0.01', '16523.00'],
  ];
  const purchasesWS = XLSX.utils.aoa_to_sheet(purchasesData);
  XLSX.utils.book_append_sheet(wb, purchasesWS, 'Purchases');

  // Products Sheet
  const productsData = [
    ['Name', 'SKU', 'Barcode', 'Category', 'Description', 'Unit', 'Purchase Price', 'Selling Price', 'Stock Quantity', 'Min Stock Level', 'HSN Code', 'GST Rate', 'Tax Type'],
    ['Samsung Galaxy S21', 'SAM-GAL-S21', '1234567890123', 'Electronics', 'Latest Samsung smartphone', 'pcs', '50000', '55000', '10', '5', '8517', '18', 'exclusive'],
  ];
  const productsWS = XLSX.utils.aoa_to_sheet(productsData);
  XLSX.utils.book_append_sheet(wb, productsWS, 'Products');

  // Customers Sheet
  const customersData = [
    ['Name', 'Email', 'Phone', 'GSTIN', 'Address', 'City', 'State', 'Pincode', 'Contact Person', 'Credit Limit'],
    ['ABC Traders', 'contact@abctraders.com', '+91-9876543210', '27AAAAA0000A1Z5', '456 Business Street', 'Delhi', 'Delhi', '110001', 'Mr. XYZ', '100000'],
  ];
  const customersWS = XLSX.utils.aoa_to_sheet(customersData);
  XLSX.utils.book_append_sheet(wb, customersWS, 'Customers');

  // Suppliers Sheet
  const suppliersData = [
    ['Name', 'Email', 'Phone', 'GSTIN', 'Address', 'City', 'State', 'Pincode', 'Contact Person', 'Is Registered'],
    ['V P TRADERS', 'contact@vptraders.com', '+91-9876543200', '09ABPPA6876Q1ZN', '123 Supplier Street', 'Mumbai', 'Maharashtra', '400001', 'Mr. VP', 'Yes'],
  ];
  const suppliersWS = XLSX.utils.aoa_to_sheet(suppliersData);
  XLSX.utils.book_append_sheet(wb, suppliersWS, 'Suppliers');

  // Categories Sheet
  const categoriesData = [
    ['Name', 'Description', 'Parent Category', 'Is Subcategory'],
    ['Electronics', 'Electronic products', '', 'No'],
    ['Mobile Phones', 'Mobile phones and accessories', 'Electronics', 'Yes'],
  ];
  const categoriesWS = XLSX.utils.aoa_to_sheet(categoriesData);
  XLSX.utils.book_append_sheet(wb, categoriesWS, 'Categories');

  XLSX.writeFile(wb, 'sample-universal-template.xlsx');
  console.log('✅ Created sample-universal-template.xlsx');
}

// Run all
console.log('Creating sample Excel files...\n');
createPurchaseSample();
createProductSample();
createCustomerSample();
createSupplierSample();
createCategorySample();
createUniversalTemplate();
console.log('\n✅ All sample files created successfully!');



