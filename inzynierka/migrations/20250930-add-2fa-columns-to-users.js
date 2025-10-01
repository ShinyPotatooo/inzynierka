// Plik: inzynierka/migrations/20250930-add-2fa-columns-to-users.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'users';

    // Pobierz opis tabeli – będziemy dodawać tylko brakujące kolumny
    const desc = await queryInterface.describeTable(table);

    const addIfMissing = async (colName, colDef) => {
      if (!desc[colName]) {
        await queryInterface.addColumn(table, colName, colDef);
      }
    };

    await addIfMissing('twoFactorEnabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    await addIfMissing('twoFactorEmail', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    await addIfMissing('twoFactorCodeHash', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    await addIfMissing('twoFactorExpiresAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await addIfMissing('twoFactorAttemptCount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    const table = 'users';
    // down może również być idempotentny
    const desc = await queryInterface.describeTable(table);

    const dropIfExists = async (colName) => {
      if (desc[colName]) {
        await queryInterface.removeColumn(table, colName);
      }
    };

    await dropIfExists('twoFactorEnabled');
    await dropIfExists('twoFactorEmail');
    await dropIfExists('twoFactorCodeHash');
    await dropIfExists('twoFactorExpiresAt');
    await dropIfExists('twoFactorAttemptCount');
  },
};
