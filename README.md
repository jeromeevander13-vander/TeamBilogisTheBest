<<<<<<< HEAD
# TindaTrack

TindaTrack is a mobile order management app designed for sari-sari store sellers. It helps users organize products by category, add stock details, create customer orders, and keep a record of completed transactions.

## Project Overview

This application allows store owners to:
- manage product categories and products,
- upload product images,
- set wholesale pricing,
- add items to a cart with quantity and unit selection,
- record customer and store information,
- save checkout orders in local storage,
- mark orders as delivered or pending.

## Features

- Category-based product organization
- Product image upload support
- Wholesale price tracking
- Cart and order creation
- Quantity and unit selection for each product
- Customer and store information capture
- Checked-out orders history
- Pagination for products and orders
- Local data persistence using AsyncStorage

## Tech Stack

- React Native
- Expo
- Expo Router
- TypeScript
- AsyncStorage
- Expo Image Picker

## Project Structure

- app/ — screen routes and navigation
- components/ — reusable UI components
- types/ — TypeScript data models


## Getting Started

### Requirements

- Node.js 22+
- npm
- Expo Go, Android emulator, iOS simulator, or web browser

### Installation

```bash
npm install
```

### Run the app

```bash
cd teambilog
npx expo start
```

Then use the Expo terminal options to open it on Android, iOS, or the web.

## Putting the app in GitHub

- cd teambilog
- git add .
- git commit -m "comment"
- git push


  ## Purpose and use of the file

  App.tsx: the app’s startup/root screen. It shows the basic welcome UI and wraps the app in safe-area settings.
  app/_layout.tsx: shared layout for the app screens; sets the app’s navigation stack and header style.
  app/index.tsx: home screen for managing product categories.
  app/order.tsx: screen for choosing products, adding to cart, and creating an order.
  app/checked-out.tsx: screen for viewing finished/checked-out orders.
  components/ProductCard.tsx: reusable card UI for each product.
  types/sales.ts: defines the data structure for products and orders.

## Team

Team Bilog
Leader:Jerome Evander Mantilla
Members:
Josiephos Pradilla
Clint Jason Legaspi
Edsel Procurato
Kyrene Chloe Juezan

>>>>>>> 75e8fd5c6b21382437169d9efdcadcb9c7ae1495
