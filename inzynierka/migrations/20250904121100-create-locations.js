'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('locations', {
      id:         { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      name:       { type: Sequelize.STRING(100), allowNull: false },
      description:{ type: Sequelize.STRING(255) },
      createdAt:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('locations', ['name'], {
      name: 'locations_name_unique',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('locations', 'locations_name_unique').catch(() => {});
    await queryInterface.dropTable('locations');
  }
};
