#!/usr/bin/env node

require('dotenv').config({ path: './config.env' });
const { sequelize } = require('../models');

async function testDatabaseConnection() {
  console.log('Testing database connection...');
  console.log('Database config:', {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    username: process.env.DB_USER
  });

  try {
    // Test connection
    await sequelize.authenticate();
    console.log('Database connection successful!');

    // Test query
    const result = await sequelize.query('SELECT NOW() as current_time');
    console.log('⏰ Current database time:', result[0][0].current_time);

    // Test if tables exist
    const tables = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('Available tables:');
    tables[0].forEach(table => {
      console.log(`  - ${table.table_name}`);
    });

    console.log('\n🎉 Database test completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Troubleshooting tips:');
      console.log('1. Make sure PostgreSQL is running');
      console.log('2. Check if the database exists');
      console.log('3. Verify connection credentials');
      console.log('4. Run: sudo systemctl status postgresql');
    }
    
    if (error.code === '28P01') {
      console.log('\n💡 Authentication failed. Check:');
      console.log('1. Database username and password');
      console.log('2. User permissions');
      console.log('3. Run: ./scripts/setup-database.sh');
    }
    
    if (error.code === '3D000') {
      console.log('\n💡 Database does not exist. Run:');
      console.log('./scripts/setup-database.sh');
    }
    
    process.exit(1);
  }
}

testDatabaseConnection(); 