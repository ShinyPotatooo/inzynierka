'use strict';

/**
 * Dodaje wartość 'empty_stock' do typu enum używanego przez notifications.type (PostgreSQL).
 * Uwaga: w DOWN odtwarzamy enum bez tej wartości (PG nie wspiera DROP VALUE),
 * więc robimy rename -> create new type -> cast -> drop old.
 */
module.exports = {
  async up (queryInterface, Sequelize) {
    // nazwa enuma utworzonego przez Sequelize dla kolumny notifications.type
    const typeName = 'enum_notifications_type';

    // Bezpiecznie dodajemy wartość jeśli jej nie ma
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_enum e ON e.enumtypid = t.oid
          WHERE t.typname = '${typeName}' AND e.enumlabel = 'empty_stock'
        ) THEN
          ALTER TYPE "${typeName}" ADD VALUE 'empty_stock';
        END IF;
      END$$;
    `);
  },

  async down (queryInterface, Sequelize) {
    const typeName = 'enum_notifications_type';
    const tmpType  = 'enum_notifications_type_old';

    // Zbuduj nowy enum bez 'empty_stock'
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = '${tmpType}') THEN
          -- porządek gdyby kiedyś coś zostało po poprzednich próbach
          DROP TYPE "${tmpType}";
        END IF;
      END$$;
    `);

    // Pobierz aktualny zestaw wartości bez 'empty_stock'
    const [rows] = await queryInterface.sequelize.query(`
      SELECT e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = '${typeName}'
      ORDER BY e.enumsortorder;
    `);

    const values = rows
      .map(r => r.enumlabel)
      .filter(v => v !== 'empty_stock')
      .map(v => `'${v}'`)
      .join(', ');

    // Tworzymy tymczasowy typ bez 'empty_stock'
    await queryInterface.sequelize.query(`
      CREATE TYPE "${tmpType}" AS ENUM (${values});
    `);

    // Przestaw kolumnę na tymczasowy typ
    await queryInterface.sequelize.query(`
      ALTER TABLE "notifications"
      ALTER COLUMN "type" TYPE "${tmpType}" USING "type"::text::"${tmpType}";
    `);

    // Usuń stary typ, utwórz nowy bez 'empty_stock' pod oryginalną nazwą
    await queryInterface.sequelize.query(`
      DROP TYPE "${typeName}";
      CREATE TYPE "${typeName}" AS ENUM (${values});
    `);

    // Przestaw kolumnę z powrotem na oryginalny typ
    await queryInterface.sequelize.query(`
      ALTER TABLE "notifications"
      ALTER COLUMN "type" TYPE "${typeName}" USING "type"::text::"${typeName}";
    `);

    // Posprzątaj
    await queryInterface.sequelize.query(`DROP TYPE "${tmpType}";`);
  }
};
