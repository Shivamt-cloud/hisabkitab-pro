# HisabKitab-Pro - Inventory Management System

A comprehensive offline-first inventory management system for sales, purchases, and stock tracking. Built with React, TypeScript, and IndexedDB for reliable offline functionality.

🌐 **Live Site:** [hisabkitabpro.com](https://hisabkitabpro.com)

## Overview

HisabKitab-Pro is a modern inventory management system designed for small to medium businesses. The application provides comprehensive features for managing products, sales, purchases, customers, suppliers, and inventory with real-time stock tracking, detailed analytics, and robust reporting capabilities.

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

### After deployment – users not seeing changes?

The app is a PWA and caches JS/CSS. After you deploy:

1. **Deploy the latest build** – Run `npm run build` after `git pull`, then deploy the new `dist/` folder (not an old one).
2. **Users should refresh once** – Ask users to do a **hard refresh**: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac). Or they can wait for the blue **"New version available!"** banner at the top and click **Update now**.
3. **If still old** – Clear site data for the app URL (browser settings → Site data → clear), then reload.

Update checks run on load, when the tab becomes visible again, and every 30 minutes, so the banner usually appears after a refresh or when returning to the tab.

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

