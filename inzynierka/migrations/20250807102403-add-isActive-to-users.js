'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Dodajemy kolumnę isActive do tabeli users
    await queryInterface.addColumn('users', 'isActive', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
  },

  async down(queryInterface, Sequelize) {
    // Usuwamy kolumnę isActive przy rollbacku
    await queryInterface.removeColumn('users', 'isActive');
  }
};

