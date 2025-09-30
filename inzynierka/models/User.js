const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
	const User = sequelize.define(
		'User',
		{
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			username: {
				type: DataTypes.STRING(50),
				allowNull: false,
				unique: true,
				validate: {
					len: [3, 50],
				},
			},
			email: {
				type: DataTypes.STRING(100),
				allowNull: false,
				unique: true,
				validate: {
					isEmail: true,
				},
			},
			password: {
				type: DataTypes.STRING(255),
				allowNull: false,
			},
			mustChangePassword: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: false,
			},

			passwordResetToken: {
				type: DataTypes.STRING(128),
				allowNull: true,
			},
			passwordResetExpires: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			firstName: {
				type: DataTypes.STRING(50),
				allowNull: false,
				validate: {
					len: [2, 50],
				},
			},
			lastName: {
				type: DataTypes.STRING(50),
				allowNull: false,
				validate: {
					len: [2, 50],
				},
			},
			role: {
				type: DataTypes.ENUM('admin', 'manager', 'worker'),
				allowNull: false,
				defaultValue: 'worker',
			},
			isActive: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: true,
			},
			lastLoginAt: {
				type: DataTypes.DATE,
			},
			createdAt: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: DataTypes.NOW,
			},
			updatedAt: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: DataTypes.NOW,
			},
			twoFactorEnabled: {
  type: DataTypes.BOOLEAN,
  allowNull: false,
  defaultValue: true, // 2FA domyślnie ON; zmień na false jeśli wolisz
},
twoFactorEmail: {
  type: DataTypes.STRING(255),
  allowNull: true,
},
twoFactorCodeHash: {
  type: DataTypes.STRING(255),
  allowNull: true,
},
twoFactorExpiresAt: {
  type: DataTypes.DATE,
  allowNull: true,
},
twoFactorAttemptCount: {
  type: DataTypes.INTEGER,
  allowNull: false,
  defaultValue: 0,
},
		},
		{
			tableName: 'users',
			timestamps: true,
			indexes: [
				{
					unique: true,
					fields: ['username'],
				},
				{
					unique: true,
					fields: ['email'],
				},
				{
					fields: ['role'],
				},
			],
		}
	);

	User.associate = (models) => {
		User.hasMany(models.ActivityLog, {
			foreignKey: 'userId',
			as: 'activityLogs',
		});

		User.hasMany(models.InventoryOperation, {
			foreignKey: 'userId',
			as: 'inventoryOperations',
		});
	};

	return User;
};
