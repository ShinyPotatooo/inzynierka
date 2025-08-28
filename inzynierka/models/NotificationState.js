// models/NotificationState.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const NotificationState = sequelize.define('NotificationState', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    notificationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'notifications', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },

    isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    readAt: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'notification_states',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['notificationId', 'userId'] },
      { fields: ['userId'] },
      { fields: ['isRead'] },
      { fields: ['createdAt'] },
    ],
  });

  NotificationState.associate = (models) => {
    NotificationState.belongsTo(models.Notification, { foreignKey: 'notificationId', as: 'notification' });
    NotificationState.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return NotificationState;
};
