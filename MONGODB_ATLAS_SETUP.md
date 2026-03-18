# MongoDB Atlas Admin Data Setup Guide

This guide explains how to add admin users to MongoDB Atlas for the Vegetable CRM application.

## 📋 Admin User Data

### Default Admin Users

| Email | Password | Role | Phone | Address |
|-------|----------|------|-------|---------|
| admin@vegetablecrm.com | admin@123 | admin | +91-9999999999 | Admin Office, City |
| superadmin@vegetablecrm.com | superadmin@123 | admin | +91-9999999998 | Headquarters, City |

## 🚀 Method 1: Using Automated Script (Recommended)

### Prerequisites
- Node.js and npm installed
- MongoDB Atlas cluster created
- MONGODB_URI set to MongoDB Atlas connection string

### Steps

1. **Update your `.env.local` to use MongoDB Atlas:**
   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/vegetable-crm?appName=veg
   ```

2. **Run the admin seed script:**
   ```bash
   npm run seed:admin:atlas
   ```

   Output will show:
   ```
   ✓ Connected to MongoDB Atlas
   ✓ Created admin user: admin@vegetablecrm.com
   ✓ Created admin user: superadmin@vegetablecrm.com
   ✓ Admin seed completed! Created 2 new admin user(s).
   ```

## 🔧 Method 2: Using MongoDB Atlas Web Interface

### Step 1: Access Collections
1. Go to [MongoDB Atlas](https://account.mongodb.com/account/login)
2. Click on your cluster
3. Click "Collections" tab
4. Select your database: `vegetable-crm`
5. Click on `users` collection

### Step 2: Insert Admin Document
Click the green "+ Insert Document" button and paste:

```json
{
  "name": "Admin User",
  "email": "admin@vegetablecrm.com",
  "password": "$2a$12$abcdefghijklmnopqrstuvwxyzHashedPasswordHere",
  "role": "admin",
  "phone": "+91-9999999999",
  "address": "Admin Office, City",
  "isActive": true,
  "createdAt": "2026-03-17T00:00:00.000Z",
  "updatedAt": "2026-03-17T00:00:00.000Z"
}
```

⚠️ **Note:** The password field should contain the bcrypt hashed password. It's recommended to use Method 1 instead, as it handles password hashing automatically.

## 📊 Method 3: Import JSON Data

1. Download the admin data file: `scripts/admin-data.json`
2. Go to MongoDB Atlas → Collections
3. Click "INSERT DOCUMENT" → "Edit as JSON"
4. Paste the JSON from the file
5. Click "Insert"

## ✅ Verify Admin Users

### Via MongoDB Atlas UI
1. Go to your cluster's Collections
2. Select `vegetable-crm` → `users`
3. Filter by role = "admin" to see created users

### Via Command Line
```bash
npm run seed:admin:atlas
```
This will display all admin users in your Atlas cluster.

## 🔐 Testing Login

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Go to http://localhost:3000/auth/login

3. Login with:
   - **Email:** admin@vegetablecrm.com
   - **Password:** admin@123

4. You should be redirected to `/admin/dashboard`

## 📝 Modifying Admin Users

### Add New Admin User

Edit `scripts/seedAdminAtlas.ts` and add to `adminUsers` array:

```typescript
{
  name: 'Your Name',
  email: 'email@example.com',
  password: 'password@123',
  phone: '+91-XXXXXXXXXX',
  address: 'Your Address',
}
```

Then run:
```bash
npm run seed:admin:atlas
```

### Delete Admin User

In MongoDB Atlas UI:
1. Go to Collections → `users`
2. Find the admin user
3. Click the trash icon to delete

Or via command line (in MongoDB shell):
```javascript
db.users.deleteOne({ email: 'admin@vegetablecrm.com', role: 'admin' })
```

## 🔑 Reset Admin Password

If you forget the password, edit `scripts/seedAdminAtlas.ts` to change the password, then re-run the script. Existing users will be skipped, but you can uncomment this line to force update:

```typescript
// Note: Uncomment to reset passwords for existing admins
// await User.updateOne(
//   { email: admin.email },
//   { password: hashedPassword }
// );
```

## 🌍 MongoDB Atlas Connection String Format

Your MONGODB_URI should look like:
```
mongodb+srv://username:password@cluster-name.mongodb.net/database-name?appName=veg
```

Get it from MongoDB Atlas:
1. Click "Connect" button on your cluster
2. Select "Drivers"
3. Choose Node.js
4. Copy the connection string
5. Replace `<username>` and `<password>` with your database user credentials

## 📞 Troubleshooting

### "MONGODB_URI environment variable is not defined"
- Check `.env.local` file exists
- Verify MONGODB_URI is set correctly

### "This script requires a MongoDB Atlas connection string"
- Current MONGODB_URI is local (mongodb://localhost:27017)
- Update `.env.local` with MongoDB Atlas URI

### Connection times out
- Check your IP is whitelisted in MongoDB Atlas
- Verify internet connection
- Check cluster status in Atlas dashboard

### Admin user not created
- Check if user already exists with same email
- Verify password hashing is working
- Check MongoDB Atlas cluster status

## 🎯 Next Steps

1. ✅ Create admin users in MongoDB Atlas
2. 📝 Customize admin user data as needed
3. 🔐 Test login with admin credentials
4. 👥 Create vendor and farmer users
5. 📊 Access admin dashboard at `/admin/dashboard`

