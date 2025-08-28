// models/Notification.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Notification = sequelize.define('Notification', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    type: {
      type: DataTypes.ENUM('low_stock', 'expiry_warning', 'system_alert', 'user_activity'),
      allowNull: false,
    },
    title: { type: DataTypes.STRING(200), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'products', key: 'id' },
    },
    userId: {
      // (opcjonalnie) użytkownik powiązany z powiadomieniem (np. autor/źródło)
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    targetRole: {
      type: DataTypes.ENUM('admin', 'manager', 'worker', 'all'),
      allowNull: true,
    },
    // UWAGA: to jest globalne isRead — zostawiamy dla kompatybilności,
    // ale logika per-user idzie przez NotificationState
    isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isSent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium',
    },
    scheduledAt: { type: DataTypes.DATE, allowNull: true },
    sentAt: { type: DataTypes.DATE, allowNull: true },
    readAt: { type: DataTypes.DATE, allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'notifications',
    timestamps: true,
    indexes: [
      { fields: ['type'] },
      { fields: ['productId'] },
      { fields: ['userId'] },
      { fields: ['targetRole'] },
      { fields: ['isRead'] },
      { fields: ['isSent'] },
      { fields: ['priority'] },
      { fields: ['scheduledAt'] },
      { fields: ['createdAt'] },
    ],
  });

  Notification.associate = (models) => {
    Notification.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
    Notification.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });

    // ⬇️ nowa asocjacja – stany per user
    Notification.hasMany(models.NotificationState, {
      foreignKey: 'notificationId',
      as: 'states',
    });
  };

  return Notification;
};
