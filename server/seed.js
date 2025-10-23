const mongoose = require("mongoose");
const User = require("./models/UserModel");
const ConnectDb = require("./configs/db");

const seedUsers = async () => {
  try {
    // Connect to database
    await ConnectDb();
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ role: "admin" });
    
    if (existingAdmin) {
      console.log("Admin user already exists:", existingAdmin.email);
      return;
    }

    // Create default admin user
    const adminUser = new User({
      email: "admin@labubbles.com",
      username: "admin",
      password: "admin123", // This will be hashed automatically
      role: "admin",
      isActive: true
    });

    await adminUser.save();
    
    console.log("✅ Default admin user created successfully!");
    console.log("📧 Email: admin@labubbles.com");
    console.log("👤 Username: admin");
    console.log("🔑 Password: admin123");
    console.log("⚠️  Please change the password after first login!");
    
    // Create a sample staff user
    const staffUser = new User({
      email: "staff@labubbles.com",
      username: "staff",
      password: "staff123",
      role: "staff",
      isActive: true
    });

    await staffUser.save();
    
    console.log("\n✅ Sample staff user created successfully!");
    console.log("📧 Email: staff@labubbles.com");
    console.log("👤 Username: staff");
    console.log("🔑 Password: staff123");
    console.log("⚠️  Please change the password after first login!");
    
  } catch (error) {
    console.error("❌ Error seeding users:", error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed.");
    process.exit(0);
  }
};

// Run the seed function
seedUsers();
