// models/Location.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Location = sequelize.define('Location', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: { len: [1, 100] }
    },
    description: { type: DataTypes.STRING(255) }
  }, {
    tableName: 'locations',
    timestamps: true,
    indexes: [{ unique: true, fields: ['name'] }]
  });
  return Location;
};
