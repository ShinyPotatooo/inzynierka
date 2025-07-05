# 🚀 WMS Backend - Quick Start Guide

Szybki przewodnik uruchomienia systemu WMS Backend.

## ⚡ Szybka Instalacja (5 minut)

### 1. Wymagania
```bash
# Sprawdź czy masz Node.js
node --version  # Powinno być v16+

# Sprawdź czy masz PostgreSQL
psql --version  # Powinno być v12+
```

### 2. Instalacja zależności
```bash
npm install
```

### 3. Konfiguracja bazy danych
```bash
# Opcja A: Automatyczna konfiguracja
npm run db:setup

# Opcja B: Ręczna konfiguracja
sudo -u postgres psql -c "CREATE USER wms_user WITH PASSWORD 'wms_password';"
sudo -u postgres psql -c "CREATE DATABASE wms_database OWNER wms_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE wms_database TO wms_user;"
```

### 4. Test połączenia z bazą
```bash
npm run db:test
```

### 5. Uruchom migracje i seedery
```bash
npm run db:migrate
npm run db:seed
```

### 6. Uruchom serwer
```bash
npm run dev
```

## ✅ Sprawdź czy wszystko działa

### Health Check
```bash
curl http://localhost:3001/health
```

### API Info
```bash
curl http://localhost:3001/api
```

## 📊 Dane Testowe

Po uruchomieniu seederów masz dostęp do:

### Użytkownicy
- **admin** / password123
- **manager1** / password123  
- **worker1** / password123
- **worker2** / password123

### Produkty
- Laptop Dell Inspiron 15
- Mysz bezprzewodowa Logitech
- Klawiatura mechaniczna RGB
- Monitor 24" Full HD
- Kabel HDMI 2m

## 🔧 Przydatne Komendy

```bash
# Uruchom serwer development
npm run dev

# Uruchom serwer production
npm start

# Test bazy danych
npm run db:test

# Reset bazy danych (usuwa wszystkie dane!)
npm run db:reset

# Tylko migracje
npm run db:migrate

# Tylko seedery
npm run db:seed
```

## 🚨 Rozwiązywanie Problemów

### Problem: "Database connection failed"
```bash
# Sprawdź czy PostgreSQL działa
sudo systemctl status postgresql

# Uruchom PostgreSQL jeśli nie działa
sudo systemctl start postgresql
```

### Problem: "Authentication failed"
```bash
# Sprawdź konfigurację w config.env
cat config.env

# Uruchom setup bazy danych
npm run db:setup
```

### Problem: "Database does not exist"
```bash
# Utwórz bazę danych
npm run db:setup
```

### Problem: "Port already in use"
```bash
# Sprawdź co używa portu 3001
lsof -i :3001

# Zmień port w config.env
echo "PORT=3002" >> config.env
```

## 📁 Struktura Projektu

```
wms-backend/
├── config/
│   └── database.js          # Konfiguracja Sequelize
├── models/                  # Modele Sequelize
│   ├── User.js
│   ├── Product.js
│   ├── InventoryItem.js
│   ├── InventoryOperation.js
│   ├── ActivityLog.js
│   ├── Notification.js
│   └── index.js
├── migrations/              # Migracje bazy danych
├── seeders/                 # Dane testowe
├── scripts/                 # Skrypty pomocnicze
├── docs/                    # Dokumentacja
├── server.js               # Główny plik serwera
├── package.json
├── config.env              # Zmienne środowiskowe
└── README.md
```

## 🔐 Następne Kroki

1. **Autoryzacja JWT** - Dodanie middleware autoryzacji
2. **API Routes** - Implementacja endpointów REST
3. **Walidation** - Walidacja danych wejściowych
4. **Testing** - Testy jednostkowe i integracyjne

## 📞 Wsparcie

- 📖 Pełna dokumentacja: `README.md`
- 📚 API Documentation: `docs/api-documentation.md`
- 🐛 Issues: Utwórz issue w repozytorium

---

**Gotowe! 🎉** Twój WMS Backend jest uruchomiony i gotowy do dalszego rozwoju. 