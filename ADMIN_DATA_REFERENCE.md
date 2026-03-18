# Admin Data for MongoDB Atlas

## 📊 Admin Users Collection Data

This file contains the admin user data ready to be added to MongoDB Atlas.

---

## User #1: Admin User

```json
{
  "name": "Admin User",
  "email": "admin@vegetablecrm.com",
  "password": "admin@123",
  "role": "admin",
  "phone": "+91-9999999999",
  "address": "Admin Office, City",
  "isActive": true
}
```

| Field | Value |
|-------|-------|
| **Name** | Admin User |
| **Email** | admin@vegetablecrm.com |
| **Password** | admin@123 |
| **Role** | admin |
| **Phone** | +91-9999999999 |
| **Address** | Admin Office, City |
| **Status** | Active |

---

## User #2: Super Admin

```json
{
  "name": "Super Admin",
  "email": "superadmin@vegetablecrm.com",
  "password": "superadmin@123",
  "role": "admin",
  "phone": "+91-9999999998",
  "address": "Headquarters, City",
  "isActive": true
}
```

| Field | Value |
|-------|-------|
| **Name** | Super Admin |
| **Email** | superadmin@vegetablecrm.com |
| **Password** | superadmin@123 |
| **Role** | admin |
| **Phone** | +91-9999999998 |
| **Address** | Headquarters, City |
| **Status** | Active |

---

## 🔄 How to Add to MongoDB Atlas

### Option 1: Using Automation Script (Recommended)

```bash
# Update .env.local with MongoDB Atlas URI
npm run seed:admin:atlas
```

This will:
- ✓ Connect to MongoDB Atlas
- ✓ Hash passwords securely (bcrypt)
- ✓ Create both admin users
- ✓ Display confirmation

### Option 2: Manual Import via MongoDB Atlas UI

1. Go to MongoDB Atlas → Your Cluster → Collections
2. Select `vegetable-crm` database → `users` collection
3. Click: `+ Insert Document`
4. Paste the JSON data above
5. Click: `Insert`

---

## 📋 Full Collection Schema

When documents are created in MongoDB, they'll include:

```json
{
  "_id": { "$oid": "507f1f77bcf86cd799439011" },
  "name": "Admin User",
  "email": "admin@vegetablecrm.com",
  "password": "$2a$12$KIXxPfxDc3k...", // bcrypt hashed
  "role": "admin",
  "phone": "+91-9999999999",
  "address": "Admin Office, City",
  "isActive": true,
  "createdAt": { "$date": "2026-03-17T00:00:00.000Z" },
  "updatedAt": { "$date": "2026-03-17T00:00:00.000Z" },
  "__v": 0
}
```

---

## 🧪 Testing Admin Access

### Step 1: Start Server
```bash
npm run dev
```

### Step 2: Login
- Go to: http://localhost:3000/auth/login
- Email: `admin@vegetablecrm.com`
- Password: `admin@123`

### Step 3: Access Admin Dashboard
- You'll be redirected to: http://localhost:3000/admin/dashboard
- See admin features:
  - User Management
  - Farmer Management
  - Vendor Management
  - Reports & Analytics

---

## 🔐 Password Security

- Original password in code: `admin@123`
- Stored in database: `$2a$12$KIXxPfxDc3k...` (bcrypt hashed)
- Not reversible - only verified on login
- Salt rounds: 12 (industry standard)

*The seed script automatically handles password hashing!*

---

## 📈 MongoDB Atlas Database Structure

```
vegetable-crm (Database)
├── users (Collection)
│   ├── admin@vegetablecrm.com ← Admin User
│   └── superadmin@vegetablecrm.com ← Super Admin
├── farmers (Collection)
├── customers (Collection)
├── vegetables (Collection)
├── payments (Collection)
├── salesbills (Collection)
├── supplyentries (Collection)
└── auditlogs (Collection)
```

---

## 🎯 Next Steps

1. ✅ Update `.env.local` with MongoDB Atlas URI
2. ✅ Run: `npm run seed:admin:atlas`
3. ✅ Verify users in MongoDB Atlas UI
4. ✅ Start server: `npm run dev`
5. ✅ Login with admin credentials
6. ✅ Access admin dashboard

---

## 💡 Customization

### To change admin users:
Edit `scripts/seedAdminAtlas.ts` and modify the `adminUsers` array.

### To change admin credentials:
Update the name, email, password fields before running the seed script.

### To add more admins:
Add new objects to the `adminUsers` array in the seed script.

---

**Generated:** March 17, 2026  
**Database:** MongoDB Atlas  
**Application:** Vegetable CRM v1.0.0
