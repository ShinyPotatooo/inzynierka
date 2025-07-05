'use strict';
const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    return queryInterface.bulkInsert('users', [
      {
        username: 'admin',
        email: 'admin@wms.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        username: 'manager1',
        email: 'manager1@wms.com',
        password: hashedPassword,
        firstName: 'Jan',
        lastName: 'Kowalski',
        role: 'manager',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        username: 'worker1',
        email: 'worker1@wms.com',
        password: hashedPassword,
        firstName: 'Anna',
        lastName: 'Nowak',
        role: 'worker',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        username: 'worker2',
        email: 'worker2@wms.com',
        password: hashedPassword,
        firstName: 'Piotr',
        lastName: 'Wiśniewski',
        role: 'worker',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('users', null, {});
  }
}; 