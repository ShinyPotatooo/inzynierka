'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('notification_states', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      notificationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'notifications', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      isRead: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      readAt: { type: Sequelize.DATE, allowNull: true },
      dismissedAt: { type: Sequelize.DATE, allowNull: true },

      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addConstraint('notification_states', {
      type: 'unique',
      fields: ['notificationId', 'userId'],
      name: 'notification_states_notificationId_userId_uniq'
    });

    await queryInterface.addIndex('notification_states', ['userId']);
    await queryInterface.addIndex('notification_states', ['isRead']);
    await queryInterface.addIndex('notification_states', ['dismissedAt']);
  },

  async down (queryInterface) {
    await queryInterface.dropTable('notification_states');
  }
};
