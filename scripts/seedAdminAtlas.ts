import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/User';

// Admin users to add to MongoDB Atlas
// ⚠️ CUSTOMIZE THIS WITH YOUR OWN DATA
interface AdminUser {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}

// 🔧 EDIT THIS ARRAY WITH YOUR OWN ADMIN DATA
const adminUsers: AdminUser[] = [
  {
    name: 'Admin User',  // 👈 Change to your name
    email: 'admin@vegetablecrm.com',  // 👈 Change to your email
    password: 'admin@123',  // 👈 Change to your password
    phone: '+91-9999999999',  // 👈 Change to your phone
    address: 'Admin Office, City',  // 👈 Change to your address
  },
  {
    name: 'Super Admin',  // 👈 Change to your name
    email: 'superadmin@vegetablecrm.com',  // 👈 Change to your email
    password: 'superadmin@123',  // 👈 Change to your password
    phone: '+91-9999999998',  // 👈 Change to your phone
    address: 'Headquarters, City',  // 👈 Change to your address
  },
  // 👇 ADD MORE ADMINS HERE:
  // {
  //   name: 'Your Name',
  //   email: 'your@email.com',
  //   password: 'YourPassword@123',
  //   phone: '+91-XXXXXXXXXX',
  //   address: 'Your Address',
  // },
];

async function seedAdminToAtlas() {
  try {
    // Use MongoDB Atlas connection string
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    if (!MONGODB_URI.includes('mongodb+srv')) {
      console.error('✗ This script requires a MongoDB Atlas connection string (mongodb+srv://...)');
      console.error('   Current MONGODB_URI:', MONGODB_URI);
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB Atlas');

    console.log('\ncréating admin users...');
    let createdCount = 0;

    for (const admin of adminUsers) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: admin.email });

        if (existingUser) {
          console.log(`✓ Admin user "${admin.email}" already exists`);
          continue;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(admin.password, 12);

        // Create admin user
        const newAdmin = await User.create({
          name: admin.name,
          email: admin.email,
          password: hashedPassword,
          role: 'admin',
          phone: admin.phone,
          address: admin.address,
          isActive: true,
        });

        console.log(`✓ Created admin user: ${admin.email}`);
        console.log(`  Password: ${admin.password}`);
        createdCount++;
      } catch (error: any) {
        console.error(`✗ Failed to create admin "${admin.email}":`, error.message);
      }
    }

    console.log(`\n✓ Admin seed completed! Created ${createdCount} new admin user(s).`);

    // Display created users
    const allAdmins = await User.find({ role: 'admin' }, 'name email phone address');
    console.log('\n📋 Admin users in MongoDB Atlas:');
    console.log('═'.repeat(60));
    allAdmins.forEach((admin, index) => {
      console.log(`\n${index + 1}. Name: ${admin.name}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Phone: ${admin.phone || 'N/A'}`);
      console.log(`   Address: ${admin.address || 'N/A'}`);
    });
    console.log('\n' + '═'.repeat(60));

  } catch (error: any) {
    console.error('✗ Seed failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB Atlas');
  }
}

// Run the seed
seedAdminToAtlas();
