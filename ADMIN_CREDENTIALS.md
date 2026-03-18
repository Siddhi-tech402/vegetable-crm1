# Admin User Credentials - Quick Reference

## 🔐 Default Admin Users for MongoDB Atlas

### Admin User #1
```
Name:     Admin User
Email:    admin@vegetablecrm.com
Password: admin@123
Role:     admin
Phone:    +91-9999999999
Address:  Admin Office, City
```

**Login URL:** http://localhost:3000/auth/login

---

### Admin User #2
```
Name:     Super Admin
Email:    superadmin@vegetablecrm.com
Password: superadmin@123
Role:     admin
Phone:    +91-9999999998
Address:  Headquarters, City
```

**Login URL:** http://localhost:3000/auth/login

---

## 📊 Database Collection Schema

**Collection:** `users`

```json
{
  "_id": ObjectId,
  "name": "string",
  "email": "string (unique)",
  "password": "string (bcrypt hashed)",
  "role": "admin",
  "phone": "string",
  "address": "string",
  "isActive": true,
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

---

## 🚀 Quick Commands

### Add Admin Users to MongoDB Atlas
```bash
# Make sure MONGODB_URI points to MongoDB Atlas
npm run seed:admin:atlas
```

### Add Admin Users to Local MongoDB
```bash
# Make sure MONGODB_URI points to local MongoDB
npm run seed:admin
```

### Start Development Server
```bash
npm run dev
```

### View in MongoDB Atlas UI
1. Go to https://cloud.mongodb.com
2. Select your cluster
3. Click "Collections"
4. Select `vegetable-crm` → `users`
5. Filter by: `role: "admin"`

---

## 📝 Admin Dashboard Features

After logging in as admin at http://localhost:3000/admin/dashboard:

- 👥 **Users Management** - Create, edit, view all users
- 🌾 **Farmers** - Manage farmer profiles
- 🏪 **Customers** - Manage customer information
- 🥕 **Vegetables** - Manage vegetable inventory
- 💰 **Payments** - Track payment transactions
- 📊 **Reports** - View sales reports
- ⚙️ **Settings** - Configure system settings

---

## 🔗 Environment Variables

### For Local MongoDB
```env
MONGODB_URI=mongodb://localhost:27017/vegetable-crm
```

### For MongoDB Atlas
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/vegetable-crm?appName=veg
```

Replace:
- `username` - Your MongoDB Atlas database user
- `password` - Your database user password
- `cluster` - Your cluster name

---

## ✅ Verification Checklist

- [ ] MongoDB Atlas cluster created
- [ ] Database user created with username and password
- [ ] Connection string copied to `.env.local`
- [ ] `npm install` completed
- [ ] Admin users added: `npm run seed:admin:atlas`
- [ ] `npm run dev` server running
- [ ] Login successful at http://localhost:3000/auth/login
- [ ] Admin dashboard accessible

---

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| Connection timeout | Whitelist your IP in MongoDB Atlas |
| User already exists | Use different email or clear collection |
| Wrong password hash | Use the seed script (handles hashing) |
| Can't connect to local MongoDB | Make sure `mongod` is running |

---

**Last Updated:** March 17, 2026
