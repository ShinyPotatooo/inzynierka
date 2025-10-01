'use strict';
const bcrypt = require('bcrypt');

module.exports = {
  up: async (qi /*, Sequelize */) => {
    const now = new Date();
    const password = await bcrypt.hash('password123', 10);

    await qi.sequelize.query(
      `
      INSERT INTO "users"
        ("username","email","password","firstName","lastName","role","isActive","createdAt","updatedAt")
      SELECT
        :username, :email, :password, :firstName, :lastName, 'admin', TRUE, :now, :now
      WHERE NOT EXISTS (
        SELECT 1 FROM "users" WHERE "email" = :email OR "username" = :username
      )
      `,
      {
        replacements: {
          username: 'czujnywilczek',
          email: 'czujnywilczek@gmail.com',
          password,
          firstName: 'Czujny',
          lastName: 'Wilczek',
          now,
        },
      }
    );
  },

  down: async (qi, Sequelize) => {
    const { Op } = Sequelize;
    await qi.bulkDelete(
      'users',
      { [Op.or]: [{ email: 'czujnywilczek@gmail.com' }, { username: 'czujnywilczek' }] },
      {}
    );
  },
};
