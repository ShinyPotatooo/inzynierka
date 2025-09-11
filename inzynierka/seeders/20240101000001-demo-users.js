'use strict';
const bcrypt = require('bcrypt');

const USERS = [
  {
    username: 'admin',
    email: 'admin@wms.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    isActive: true,
  },
  {
    username: 'manager1',
    email: 'manager1@wms.com',
    firstName: 'Jan',
    lastName: 'Kowalski',
    role: 'manager',
    isActive: true,
  },
  {
    username: 'worker1',
    email: 'worker1@wms.com',
    firstName: 'Anna',
    lastName: 'Nowak',
    role: 'worker',
    isActive: true,
  },
  {
    username: 'worker2',
    email: 'worker2@wms.com',
    firstName: 'Piotr',
    lastName: 'Wiśniewski',
    role: 'worker',
    isActive: true,
  },
];

module.exports = {
  up: async (queryInterface /*, Sequelize */) => {
    const now = new Date();
    const password = await bcrypt.hash('password123', 10);

    for (const u of USERS) {
      // insert tylko jeśli nie istnieje (po username LUB email)
      await queryInterface.sequelize.query(
        `
        INSERT INTO "users"
          ("username","email","password","firstName","lastName","role","isActive","createdAt","updatedAt")
        SELECT
          :username, :email, :password, :firstName, :lastName, :role, :isActive, :now, :now
        WHERE NOT EXISTS (
          SELECT 1 FROM "users"
          WHERE "username" = :username OR "email" = :email
        )
        `,
        {
          replacements: {
            username: u.username,
            email: u.email,
            password,
            firstName: u.firstName,
            lastName: u.lastName,
            role: u.role,
            isActive: u.isActive,
            now,
          },
        }
      );
    }
  },

  down: async (queryInterface, Sequelize) => {
    const { Op } = Sequelize;
    await queryInterface.bulkDelete(
      'users',
      { username: { [Op.in]: USERS.map((u) => u.username) } },
      {}
    );
  },
};
