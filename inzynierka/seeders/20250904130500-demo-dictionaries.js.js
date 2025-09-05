'use strict';

// Wstępne słowniki dla widoku /dictionaries
const CAT = [
  'Elektronika','Akcesoria','Laptopy','AGD','Narzędzia',
  'Biuro','Oświetlenie','Sieci','Audio','Gaming'
];

const LOC = [
  'A1-01-01','A1-01-02','A1-02-01','A1-02-02','A1-03-01',
  'A2-01-01','A2-02-01','B1-01-01','B1-02-01','C1-01-01'
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();

    // Kategorie
    const catRows = CAT.map(name => ({
      name, description: null, createdAt: now, updatedAt: now
    }));
    // Lokacje
    const locRows = LOC.map(name => ({
      name, description: null, createdAt: now, updatedAt: now
    }));

    // Wstawiaj unikając duplikatów (try/catch jest OK w seederach)
    for (const row of catRows) {
      try { await queryInterface.bulkInsert('categories', [row], {}); } catch {}
    }
    for (const row of locRows) {
      try { await queryInterface.bulkInsert('locations', [row], {}); } catch {}
    }
  },

  down: async (queryInterface, Sequelize) => {
    const { Op } = Sequelize;
    await queryInterface.bulkDelete('categories', { name: { [Op.in]: CAT } }, {});
    await queryInterface.bulkDelete('locations',  { name: { [Op.in]: LOC } }, {});
  }
};
