// models/Category.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Category = sequelize.define('Category', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: { len: [1, 100] }
    },
    description: { type: DataTypes.STRING(255) }
  }, {
    tableName: 'categories',
    timestamps: true,
    indexes: [{ unique: true, fields: ['name'] }]
  });
  return Category;
};
