const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ActivityLog = sequelize.define('ActivityLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    entityType: {
      type: DataTypes.ENUM('user', 'product', 'inventory', 'operation', 'system'),
      allowNull: false
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'products',
        key: 'id'
      }
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    severity: {
      type: DataTypes.ENUM('info', 'warning', 'error', 'critical'),
      allowNull: false,
      defaultValue: 'info'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'activity_logs',
    timestamps: false,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['action']
      },
      {
        fields: ['entityType']
      },
      {
        fields: ['entityId']
      },
      {
        fields: ['productId']
      },
      {
        fields: ['severity']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  ActivityLog.associate = (models) => {
    // ActivityLog belongs to User
    ActivityLog.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    // ActivityLog belongs to Product (optional)
    ActivityLog.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product'
    });
  };

  return ActivityLog;
}; 