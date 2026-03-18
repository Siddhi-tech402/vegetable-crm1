/**
 * CUSTOM ADMIN DATA TEMPLATE
 * Update this file with YOUR OWN admin credentials
 * Then use it to add to MongoDB Atlas
 */

// ===== CUSTOMIZE THIS DATA WITH YOUR OWN VALUES =====

const customAdminUsers = [
  {
    name: "YOUR_ADMIN_NAME",  // Change this to your preferred name
    email: "your_email@company.com",  // Change this to your email
    password: "YourPassword@123",  // Change this to your password
    role: "admin",
    phone: "+91-XXXXXXXXXX",  // Your phone number
    address: "Your Office Address, City",  // Your office address
    isActive: true
  },
  // Add more admins below if needed
  // {
  //   name: "Second Admin",
  //   email: "second@company.com",
  //   password: "SecondPass@123",
  //   role: "admin",
  //   phone: "+91-YYYYYYYYYY",
  //   address: "Another Office",
  //   isActive: true
  // }
];

export default customAdminUsers;

/**
 * HOW TO USE:
 * 
 * 1. Update the values above with YOUR OWN data
 * 2. Save this file
 * 3. Run: npm run seed:admin:atlas
 * 
 * Example:
 * {
 *   name: "Harsh Admin",
 *   email: "harsh@vegetablecrm.com",
 *   password: "MySecurePass@2024",
 *   role: "admin",
 *   phone: "+91-9999888877",
 *   address: "Headquarters, Mumbai",
 *   isActive: true
 * }
 */
