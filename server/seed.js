const mongoose = require("mongoose");
const User = require("./models/UserModel");
const Station = require("./models/StationModel");
const ConnectDb = require("./configs/db");

const seedUsers = async () => {
  try {
    // Connect to database
    await ConnectDb();
    
    // Check if admin user(s) already exist
    const existingAdmins = await User.find({ role: "admin" });
    const hasTestAdmin = existingAdmins.some(u => u.email === "admin@sparklean.com");
    const hasDefaultAdmin = existingAdmins.some(u => u.email === "admin@labubbles.com");
    
    if (!hasDefaultAdmin) {
      // Create default admin user (only if no labubbles admin)
      const adminUser = new User({
        email: "admin@labubbles.com",
        username: "admin_labubbles",
        password: "admin123",
        role: "admin",
        isActive: true
      });

      await adminUser.save();
      
      console.log("✅ Default admin user created successfully!");
      console.log("📧 Email: admin@labubbles.com");
      console.log("👤 Username: admin_labubbles");
      console.log("🔑 Password: admin123");
      console.log("⚠️  Please change the password after first login!");
    } else {
      console.log("Default admin user already exists:", existingAdmins.find(u => u.email === "admin@labubbles.com")?.email);
    }
    
    // Create sample staff user if none exists
    const existingStaff = await User.findOne({ email: "staff@labubbles.com" });
    if (!existingStaff) {
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
    }

    // Test case admin account (for test cases / documentation)
    const existingTestAdmin = await User.findOne({ email: "admin@sparklean.com" });
    if (!existingTestAdmin) {
      const testAdminUser = new User({
        email: "admin@sparklean.com",
        username: "admin",
        password: "ValidPassword123",
        role: "admin",
        isActive: true
      });
      await testAdminUser.save();
      console.log("\n✅ Test case admin user created successfully!");
      console.log("📧 Email: admin@sparklean.com");
      console.log("👤 Username: admin");
      console.log("🔑 Password: ValidPassword123");
      console.log("   (Use for test cases / documentation)");
    } else {
      console.log("\n📋 Test case admin already exists: admin@sparklean.com");
    }
  } catch (error) {
    console.error("❌ Error seeding users:", error);
  }
  
  // Always seed stations (regardless of user seeding result)
  try {
    await seedStations();
  } catch (error) {
    console.error("❌ Error seeding stations:", error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed.");
    process.exit(0);
  }
};

const seedStations = async () => {
  try {
    // Check if stations already exist
    const existingStations = await Station.countDocuments();
    
    if (existingStations > 0) {
      console.log(`\n📍 ${existingStations} station(s) already exist. Skipping station seeding.`);
      return;
    }

    // 10 default branches
    const defaultStations = [
      { stationId: 'BRANCH-001', name: 'Main Branch', address: '123 Main Street, City Center', phone: '+63 2 1234 5678' },
      { stationId: 'BRANCH-002', name: 'North Branch', address: '456 North Avenue, North District', phone: '+63 2 1234 5679' },
      { stationId: 'BRANCH-003', name: 'South Branch', address: '789 South Boulevard, South District', phone: '+63 2 1234 5680' },
      { stationId: 'BRANCH-004', name: 'East Branch', address: '321 East Road, East District', phone: '+63 2 1234 5681' },
      { stationId: 'BRANCH-005', name: 'West Branch', address: '654 West Street, West District', phone: '+63 2 1234 5682' },
      { stationId: 'BRANCH-006', name: 'Downtown Branch', address: '987 Downtown Plaza, Business District', phone: '+63 2 1234 5683' },
      { stationId: 'BRANCH-007', name: 'Mall Branch', address: '555 Shopping Mall, Mall Complex', phone: '+63 2 1234 5684' },
      { stationId: 'BRANCH-008', name: 'Airport Branch', address: '888 Airport Terminal, Airport Zone', phone: '+63 2 1234 5685' },
      { stationId: 'BRANCH-009', name: 'University Branch', address: '777 University Avenue, Campus Area', phone: '+63 2 1234 5686' },
      { stationId: 'BRANCH-010', name: 'Residential Branch', address: '999 Residential Complex, Suburb Area', phone: '+63 2 1234 5687' }
    ];

    await Station.insertMany(defaultStations);
    
    console.log("\n✅ 10 default branches created successfully!");
    console.log("📍 Stations:");
    defaultStations.forEach((station, index) => {
      console.log(`   ${index + 1}. ${station.stationId} - ${station.name}`);
    });
    
  } catch (error) {
    console.error("❌ Error seeding stations:", error);
  }
};

// Run the seed function
seedUsers();
