# HisabKitab Pro - Inventory Management System

A comprehensive inventory management system for purchase and sales that works as a web application. Built with React, TypeScript, and IndexedDB for offline-first functionality.

🌐 **Live Site:** [hisabkitabpro.com](https://hisabkitabpro.com)

## Features

### Dashboard
- **Sales Options Section**: Quick access to sales operations
  - New Sale
  - Quick Sale
  - Sales History
  - Sales Returns

- **Reports Summary Section**: Business metrics overview
  - Total Sales
  - Total Purchases
  - Total Profit
  - Low Stock Items
  - Pending Orders
  - Active Customers

## Tech Stack

- **Frontend**: React + TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Routing**: React Router

## Getting Started

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

Build for production:

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
inventory-system/
├── src/
│   ├── pages/
│   │   └── Dashboard.tsx    # Main dashboard page
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── index.html
└── package.json
```

## Future Development

- Product Management
- Purchase Management
- Sales Management
- Inventory Tracking
- Advanced Reports
- Desktop App Support (Electron)

