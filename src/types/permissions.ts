export type PermissionModule = 
  | 'sales'
  | 'purchases'
  | 'products'
  | 'customers'
  | 'suppliers'
  | 'reports'
  | 'stock'
  | 'users'
  | 'settings'
  | 'barcode_label_settings'
  | 'receipt_printer_settings'
  | 'business_overview'
  | 'sales_persons'
  | 'categories'
  | 'expenses'
  | 'services'

export type PermissionAction = 
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'export'

export interface ModulePermission {
  module: PermissionModule
  actions: PermissionAction[]
}

export interface UserPermissions {
  userId: string
  useCustomPermissions: boolean // If false, use role-based permissions
  customPermissions: ModulePermission[]
  updatedAt?: string
  updatedBy?: string
}

// Default permission modules with descriptions
export const PERMISSION_MODULES: Record<PermissionModule, {
  label: string
  description: string
  actions: PermissionAction[]
}> = {
  sales: {
    label: 'Sales',
    description: 'Manage sales transactions, invoices, and returns',
    actions: ['create', 'read', 'update', 'delete', 'export'],
  },
  purchases: {
    label: 'Purchases',
    description: 'Manage purchase orders and supplier invoices',
    actions: ['create', 'read', 'update', 'delete', 'export'],
  },
  products: {
    label: 'Products',
    description: 'Manage products, categories, and inventory',
    actions: ['create', 'read', 'update', 'delete', 'export'],
  },
  customers: {
    label: 'Customers',
    description: 'Manage customer information and records',
    actions: ['create', 'read', 'update', 'delete', 'export'],
  },
  suppliers: {
    label: 'Suppliers',
    description: 'Manage supplier information and records',
    actions: ['create', 'read', 'update', 'delete', 'export'],
  },
  reports: {
    label: 'Reports',
    description: 'View and export sales, purchase, and analytics reports',
    actions: ['read', 'export'],
  },
  stock: {
    label: 'Stock Management',
    description: 'Manage stock adjustments and view stock alerts',
    actions: ['create', 'read', 'update', 'delete'],
  },
  users: {
    label: 'User Management',
    description: 'Manage system users and permissions',
    actions: ['create', 'read', 'update', 'delete'],
  },
  settings: {
    label: 'System Settings',
    description: 'Configure system settings and preferences',
    actions: ['read', 'update'],
  },
  barcode_label_settings: {
    label: 'Barcode Label Settings',
    description: 'Configure barcode label size, printer, and fields (Custom Permissions only)',
    actions: ['read', 'update'],
  },
  receipt_printer_settings: {
    label: 'Receipt Printer Settings',
    description: 'Configure receipt printer and thermal receipt layout (Custom Permissions only)',
    actions: ['read', 'update'],
  },
  business_overview: {
    label: 'Business Overview',
    description: 'View employees, salary/expenses, sales, purchases, cost and profit & loss (Manager or Custom Permissions)',
    actions: ['read', 'export'],
  },
  sales_persons: {
    label: 'Sales Persons',
    description: 'Manage sales persons and commissions',
    actions: ['create', 'read', 'update', 'delete'],
  },
  categories: {
    label: 'Categories',
    description: 'Manage product categories and sub-categories',
    actions: ['create', 'read', 'update', 'delete'],
  },
  expenses: {
    label: 'Daily Expenses',
    description: 'Manage daily expenses, track payments, and view expense reports',
    actions: ['create', 'read', 'update', 'delete'],
  },
  services: {
    label: 'Services (Bike, Car, E-bike, E-car)',
    description: 'Manage vehicle services for bike, car, e-bike, and e-car (Premium and above)',
    actions: ['create', 'read', 'update', 'delete', 'export'],
  },
}

