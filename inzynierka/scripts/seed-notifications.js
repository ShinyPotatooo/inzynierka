// scripts/seed-notifications.js
const path = require('path');

// Wczytaj zmienne z config.env z katalogu projektu
require('dotenv').config({ path: path.join(__dirname, '..', 'config.env') });

// Załaduj modele z katalogu projektu (poziom wyżej)
const { sequelize, Notification } = require(path.join(__dirname, '..', 'models'));

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Połączenie z DB OK. Wstawiam powiadomienia…');

    const now = new Date();

    const rows = await Notification.bulkCreate(
      [
        {
          type: 'low_stock',
          title: 'Niski stan: LAPTOP-001',
          message: 'Produkt spadł poniżej progu',
          productId: null,
          userId: null,
          targetRole: 'manager',
          isRead: false,
          isSent: false,
          priority: 'high',
          scheduledAt: null,
          sentAt: null,
          readAt: null,
          metadata: { sku: 'LAPTOP-001', min: 20, qty: 15 },
          createdAt: now,
          updatedAt: now,
        },
        {
          type: 'system_alert',
          title: 'Backup zakończony',
          message: 'Kopia zapasowa wykonana pomyślnie',
          productId: null,
          userId: null,
          targetRole: 'all',
          isRead: false,
          isSent: false,
          priority: 'low',
          scheduledAt: null,
          sentAt: null,
          readAt: null,
          metadata: { job: 'nightly_backup' },
          createdAt: now,
          updatedAt: now,
        },
      ],
      { validate: true }
    );

    console.log(`✅ Dodano ${rows.length} rekord(y) do "notifications".`);
  } catch (e) {
    console.error('❌ Seed error:', e);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

main();
