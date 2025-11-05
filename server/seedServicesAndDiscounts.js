const mongoose = require("mongoose");
const Service = require("./models/ServiceModel");
const Discount = require("./models/DiscountModel");
const ConnectDb = require("./configs/db");

const seedServicesAndDiscounts = async () => {
  try {
    // Connect to database
    await ConnectDb();
    
    console.log("🌱 Seeding services and discounts...\n");

    // Define default services
    const defaultServices = [
      {
        name: 'Wash & Fold',
        category: 'Washing',
        price: 25,
        unit: 'kg',
        description: 'Regular wash and fold service',
        isActive: true,
        isPopular: true
      },
      {
        name: 'Dry Cleaning',
        category: 'Dry Cleaning',
        price: 150,
        unit: 'item',
        description: 'Professional dry cleaning service',
        isActive: true,
        isPopular: true
      },
      {
        name: 'Ironing',
        category: 'Ironing',
        price: 15,
        unit: 'item',
        description: 'Press and iron service',
        isActive: true,
        isPopular: false
      },
      {
        name: 'Express Service',
        category: 'Special',
        price: 50,
        unit: 'flat',
        description: 'Same-day or next-day express service',
        isActive: true,
        isPopular: true
      },
      {
        name: 'Delicate Items',
        category: 'Special',
        price: 200,
        unit: 'item',
        description: 'Special handling for delicate fabrics',
        isActive: true,
        isPopular: false
      },
      {
        name: 'Curtain Cleaning',
        category: 'Special',
        price: 180,
        unit: 'item',
        description: 'Professional curtain and drapery cleaning',
        isActive: true,
        isPopular: false
      },
      {
        name: 'Blanket Cleaning',
        category: 'Special',
        price: 120,
        unit: 'item',
        description: 'Heavy blanket and comforter cleaning',
        isActive: true,
        isPopular: false
      },
      {
        name: 'Shoe Cleaning',
        category: 'Special',
        price: 80,
        unit: 'item',
        description: 'Professional shoe cleaning service',
        isActive: true,
        isPopular: false
      }
    ];

    // Seed services
    let servicesCreated = 0;
    let servicesSkipped = 0;
    
    for (const serviceData of defaultServices) {
      try {
        const existingService = await Service.findOne({ name: serviceData.name });
        if (existingService) {
          console.log(`⏭️  Service "${serviceData.name}" already exists, skipping...`);
          servicesSkipped++;
          continue;
        }

        const service = new Service(serviceData);
        await service.save();
        console.log(`✅ Service created: ${serviceData.name} (₱${serviceData.price}/${serviceData.unit})`);
        servicesCreated++;
      } catch (error) {
        if (error.code === 11000) {
          console.log(`⏭️  Service "${serviceData.name}" already exists (duplicate), skipping...`);
          servicesSkipped++;
        } else {
          console.error(`❌ Error creating service "${serviceData.name}":`, error.message);
        }
      }
    }

    console.log(`\n📊 Services Summary: ${servicesCreated} created, ${servicesSkipped} skipped\n`);

    // Define default discounts
    const now = new Date();
    const nextYear = new Date(now);
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    
    const defaultDiscounts = [
      {
        code: 'WELCOME10',
        name: 'Welcome Discount',
        type: 'percentage',
        value: 10,
        minPurchase: 0,
        validFrom: now,
        validUntil: nextYear,
        isActive: true,
        usageCount: 0,
        maxUsage: 100,
        description: '10% off for new customers'
      },
      {
        code: 'BULK50',
        name: 'Bulk Order Discount',
        type: 'fixed',
        value: 50,
        minPurchase: 500,
        validFrom: now,
        validUntil: nextYear,
        isActive: true,
        usageCount: 0,
        maxUsage: 50,
        description: '₱50 off for orders ₱500 and above'
      },
      {
        code: 'SENIOR20',
        name: 'Senior Citizen Discount',
        type: 'percentage',
        value: 20,
        minPurchase: 0,
        validFrom: now,
        validUntil: nextYear,
        isActive: true,
        usageCount: 0,
        maxUsage: 0, // Unlimited
        description: '20% off for senior citizens (valid ID required)'
      },
      {
        code: 'STUDENT15',
        name: 'Student Discount',
        type: 'percentage',
        value: 15,
        minPurchase: 100,
        validFrom: now,
        validUntil: nextYear,
        isActive: true,
        usageCount: 0,
        maxUsage: 200,
        description: '15% off for students (valid ID required)'
      },
      {
        code: 'FREESHIP',
        name: 'Free Delivery',
        type: 'fixed',
        value: 0, // Special discount for free delivery (can be handled separately)
        minPurchase: 300,
        validFrom: now,
        validUntil: nextYear,
        isActive: true,
        usageCount: 0,
        maxUsage: 0, // Unlimited
        description: 'Free delivery for orders ₱300 and above'
      },
      {
        code: 'FIRST50',
        name: 'First Time Customer',
        type: 'fixed',
        value: 50,
        minPurchase: 200,
        validFrom: now,
        validUntil: nextYear,
        isActive: true,
        usageCount: 0,
        maxUsage: 100,
        description: '₱50 off for first-time customers'
      }
    ];

    // Seed discounts
    let discountsCreated = 0;
    let discountsSkipped = 0;
    
    for (const discountData of defaultDiscounts) {
      try {
        const existingDiscount = await Discount.findOne({ code: discountData.code });
        if (existingDiscount) {
          console.log(`⏭️  Discount "${discountData.code}" already exists, skipping...`);
          discountsSkipped++;
          continue;
        }

        const discount = new Discount(discountData);
        await discount.save();
        const discountValue = discountData.type === 'percentage' 
          ? `${discountData.value}%` 
          : `₱${discountData.value}`;
        console.log(`✅ Discount created: ${discountData.code} - ${discountData.name} (${discountValue} off)`);
        discountsCreated++;
      } catch (error) {
        if (error.code === 11000) {
          console.log(`⏭️  Discount "${discountData.code}" already exists (duplicate), skipping...`);
          discountsSkipped++;
        } else {
          console.error(`❌ Error creating discount "${discountData.code}":`, error.message);
        }
      }
    }

    console.log(`\n📊 Discounts Summary: ${discountsCreated} created, ${discountsSkipped} skipped\n`);
    console.log("✅ Seeding completed successfully!");
    
  } catch (error) {
    console.error("❌ Error seeding services and discounts:", error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed.");
    process.exit(0);
  }
};

// Run the seed function
seedServicesAndDiscounts();

