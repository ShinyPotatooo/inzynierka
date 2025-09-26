'use strict';

module.exports = {
  async up(queryInterface) {
    const enumName = 'enum_notifications_type';

    const addIfMissing = (label) => `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = '${enumName}' AND e.enumlabel = '${label}'
  ) THEN
    ALTER TYPE "${enumName}" ADD VALUE '${label}';
  END IF;
END$$;`;

    await queryInterface.sequelize.query(addIfMissing('admin_message'));
    await queryInterface.sequelize.query(addIfMissing('manager_message'));
  },

  async down() {
    // Bezpiecznie zostaw puste (Postgres nie wspiera łatwego DROP VALUE).
  },
};
