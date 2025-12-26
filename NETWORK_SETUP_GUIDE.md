# Network Setup Guide - Multiple Businesses on Same Network

## How It Works When 3 Businesses Use the App on Same Network

### ✅ Perfect Scenario: Each Business Has Separate Data

```
Same Local Network (192.168.1.x)

📍 Server Computer (or any computer on network)
   └── Runs: npm run dev
   └── App accessible at: http://192.168.1.100:5173

🖥️ Business A Computer
   └── Browser accesses: http://192.168.1.100:5173
   └── IndexedDB stores: Business A's data (local to this browser)
   ✅ Completely separate data

🖥️ Business B Computer
   └── Browser accesses: http://192.168.1.100:5173
   └── IndexedDB stores: Business B's data (local to this browser)
   ✅ Completely separate data

🖥️ Business C Computer
   └── Browser accesses: http://192.168.1.100:5173
   └── IndexedDB stores: Business C's data (local to this browser)
   ✅ Completely separate data
```

## Setup Instructions

### Step 1: Start Server with Network Access

On the server computer (any computer on the network):

```bash
cd /Users/shivamgarima/inventory-system
npm run dev
```

The server will show:
```
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.1.100:5173/  ← Use this IP for other computers
```

### Step 2: Find Your Server's IP Address

**On Mac/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**On Windows:**
```bash
ipconfig
```
Look for IPv4 Address (usually starts with 192.168.x.x or 10.x.x.x)

### Step 3: Access from Other Computers

On Business A, B, and C computers:

1. Open any web browser
2. Go to: `http://[SERVER_IP]:5173`
   - Example: `http://192.168.1.100:5173`
3. Each business uses the app independently

## How Data Isolation Works

### ✅ Each Business Has Separate Data Because:

1. **IndexedDB is Browser-Specific**
   - Data stored in each browser's local storage
   - Business A's browser stores Business A's data
   - Business B's browser stores Business B's data
   - Business C's browser stores Business C's data

2. **No Data Sharing Between Browsers**
   - Even though they access the same server
   - Each browser has its own IndexedDB database
   - Zero risk of data mixing

3. **Perfect for Multi-Business Setup**
   - One server installation
   - Multiple independent businesses
   - Complete data isolation

## Example Scenario

### Business A (Computer 1):
- Opens Chrome
- Goes to `http://192.168.1.100:5173`
- Creates 100 products
- Data saved in Computer 1's Chrome IndexedDB
- Only Business A sees this data ✅

### Business B (Computer 2):
- Opens Firefox
- Goes to `http://192.168.1.100:5173`
- Creates 50 products
- Data saved in Computer 2's Firefox IndexedDB
- Only Business B sees this data ✅

### Business C (Computer 3):
- Opens Chrome
- Goes to `http://192.168.1.100:5173`
- Creates 200 products
- Data saved in Computer 3's Chrome IndexedDB
- Only Business C sees this data ✅

**They all access the same app, but have completely separate data!**

## Advantages of This Setup

✅ **Cost Effective**
- One server installation
- Multiple businesses share the app code
- No per-business licensing needed

✅ **Simple Setup**
- Just run `npm run dev` on one computer
- All businesses access same URL

✅ **Data Security**
- Complete isolation between businesses
- No risk of data leaks
- Each business's data stays on their computer

✅ **No Internet Required**
- Works on local network
- Offline capable
- Fast local access

## Limitations

⚠️ **Data Stays Local**
- Each business's data is only on their computer
- If computer crashes, data is lost (unless backed up)
- No automatic backup between businesses

⚠️ **No Cross-Business Sharing**
- Businesses cannot see each other's data
- Cannot share inventory between businesses
- Each business is completely independent

## Production Deployment

For a permanent setup, you can:

1. **Use a Dedicated Server**
   - Run the built app on a local server
   - Use `npm run build` to create production build
   - Serve the `dist` folder with a web server (nginx, Apache, etc.)

2. **Or Use Docker**
   - Containerize the app
   - Easy to deploy and manage
   - Can run 24/7

## Need Help?

If you need:
- ✅ Shared data between businesses → Need backend server + database
- ✅ Data backup/sync → Need cloud sync or shared database
- ✅ Real-time collaboration → Need WebSocket server

But for independent businesses on same network, **current setup is perfect!**



