# ✨ Add Custom Admin Data to MongoDB Atlas

## 📝 Step 1: Choose Your Admin Data

### Example 1: Personal Admin
```json
{
  "name": "Harsh Jani",
  "email": "harsh.jani@company.com",
  "password": "MySecurePass@2024",
  "role": "admin",
  "phone": "+91-9876543210",
  "address": "Mumbai, India"
}
```

### Example 2: Company Admin
```json
{
  "name": "Company Administrator",
  "email": "admin@mycompany.com",
  "password": "CompanyAdmin@123",
  "role": "admin",
  "phone": "+91-9999888877",
  "address": "Corporate Office, Bangalore"
}
```

### Example 3: Multiple Admins
```json
[
  {
    "name": "Senior Admin",
    "email": "senior@company.com",
    "password": "SeniorPass@123",
    "role": "admin",
    "phone": "+91-9111222333",
    "address": "HQ, Delhi"
  },
  {
    "name": "Junior Admin",
    "email": "junior@company.com",
    "password": "JuniorPass@123",
    "role": "admin",
    "phone": "+91-9444555666",
    "address": "Branch, Pune"
  }
]
```

---

## 🔧 Step 2: Edit the Seed Script

Edit: `scripts/seedAdminAtlas.ts`

Find this section:
```typescript
const adminUsers: AdminUser[] = [
  {
    name: 'Admin User',
    email: 'admin@vegetablecrm.com',
    password: 'admin@123',
    phone: '+91-9999999999',
    address: 'Admin Office, City',
  },
  // ... more users
];
```

Replace with YOUR data:
```typescript
const adminUsers: AdminUser[] = [
  {
    name: 'Your Name Here',
    email: 'your_email@company.com',
    password: 'YourPassword@123',
    phone: '+91-XXXXXXXXXX',
    address: 'Your Address, City',
  },
  {
    name: 'Second Admin Name',
    email: 'second_admin@company.com',
    password: 'SecondPassword@123',
    phone: '+91-YYYYYYYYYY',
    address: 'Second Address, City',
  },
];
```

---

## 🚀 Step 3: Add to MongoDB Atlas

### Option A: Using Script (Recommended)
```bash
npm run seed:admin:atlas
```

This will:
- ✓ Connect to MongoDB Atlas
- ✓ Hash your passwords securely
- ✓ Create each admin user
- ✓ Show confirmation with all details

### Option B: Manual Insert in Atlas UI

1. Open MongoDB Atlas → your cluster → Collections
2. Click `users` collection
3. Click **+ Insert Document**
4. Paste your JSON:
```json
{
  "name": "Your Name",
  "email": "your@email.com",
  "password": "$2a$12$hashedPasswordHere",
  "role": "admin",
  "phone": "+91-XXXXXXXXXX",
  "address": "Your Address",
  "isActive": true
}
```
5. Click **Insert**

---

## 📊 View in MongoDB Atlas

After adding, you'll see:

**Collection: users**
```
Documents: X
├─ Admin 1: your@email.com (role: admin)
├─ Admin 2: second@email.com (role: admin)
└─ Other users...
```

---

## ✅ Complete Custom Example

### My Custom Admin Data:

**Admin 1:**
- Name: `Harsh Admin`
- Email: `harsh@myvegetablecrm.com`
- Password: `MyAdmin@2024`
- Phone: `+91-9876543210`
- Address: `Main Office, Mumbai`

**Admin 2:**
- Name: `Vegetables Manager`
- Email: `manager@myvegetablecrm.com`
- Password: `Manager@2024`
- Phone: `+91-9111222333`
- Address: `Branch Office, Pune`

### In `scripts/seedAdminAtlas.ts`:
```typescript
const adminUsers: AdminUser[] = [
  {
    name: 'Harsh Admin',
    email: 'harsh@myvegetablecrm.com',
    password: 'MyAdmin@2024',
    phone: '+91-9876543210',
    address: 'Main Office, Mumbai',
  },
  {
    name: 'Vegetables Manager',
    email: 'manager@myvegetablecrm.com',
    password: 'Manager@2024',
    phone: '+91-9111222333',
    address: 'Branch Office, Pune',
  },
];
```

### Command:
```bash
npm run seed:admin:atlas
```

### Result in MongoDB Atlas:
```
✓ Created admin user: harsh@myvegetablecrm.com
✓ Created admin user: manager@myvegetablecrm.com

📋 Admin users in MongoDB Atlas:
1. Name: Harsh Admin
   Email: harsh@myvegetablecrm.com
   Phone: +91-9876543210

2. Name: Vegetables Manager
   Email: manager@myvegetablecrm.com
   Phone: +91-9111222333
```

---

## 🔐 Login with Your Custom Admin

1. Start the app: `npm run dev`
2. Go to: http://localhost:3000/auth/login
3. Use your custom credentials:
   - Email: `harsh@myvegetablecrm.com`
   - Password: `MyAdmin@2024`
4. Access admin dashboard: http://localhost:3000/admin/dashboard

---

## 💡 Tips

✅ **Password Requirements:**
- Minimum 6 characters
- Can include numbers, symbols, uppercase/lowercase

✅ **Email Requirements:**
- Must be unique (no duplicate emails)
- Must be valid email format

✅ **Phone Format:**
- Any format you prefer
- Can use +91, 0091, or just numbers

✅ **Add More Later:**
- Just edit `scripts/seedAdminAtlas.ts` again
- Add more objects to the array
- Run the script again

---

## 🎯 Quick Start

1. Edit `scripts/seedAdminAtlas.ts`
2. Replace example data with YOUR data
3. Run: `npm run seed:admin:atlas`
4. Check MongoDB Atlas to verify
5. Login with your custom credentials

**That's it! Your custom admin data is now in MongoDB Atlas! 🎉**
