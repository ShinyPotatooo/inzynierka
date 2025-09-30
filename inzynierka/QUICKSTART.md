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

### 7. Test autoryzacji JWT
```bash
# System używa tokenów JWT do autoryzacji
# Domyślni użytkownicy testowi:
# - admin/password123 (pełny dostęp)
# - manager1/password123 (zarządzanie)
# - worker1/password123 (operacje)

# Zaloguj się jako admin
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "admin", "password": "password123"}'
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

### Test logowania JWT
```bash
# Zaloguj się jako admin
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "admin", "password": "password123"}'

# Skopiuj token z odpowiedzi i użyj go w następnych zapytaniach
# Przykład: TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Test chronionego endpointu
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### Test API Endpoints
```bash
# Lista produktów
curl http://localhost:3001/api/products

# Lista użytkowników
curl http://localhost:3001/api/users

# Podsumowanie magazynu
curl http://localhost:3001/api/inventory/summary
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

## 🌐 Dostępne API Endpoints

### Authentication
- `POST /api/auth/login` - Logowanie
- `POST /api/auth/register` - Rejestracja

### Users
- `GET /api/users` - Lista użytkowników
- `GET /api/users/:id` - Szczegóły użytkownika
- `PUT /api/users/:id` - Aktualizacja użytkownika
- `DELETE /api/users/:id` - Usunięcie użytkownika

### Products
- `GET /api/products` - Lista produktów
- `POST /api/products` - Dodanie produktu
- `GET /api/products/:id` - Szczegóły produktu
- `PUT /api/products/:id` - Aktualizacja produktu
- `DELETE /api/products/:id` - Usunięcie produktu

### Inventory
- `GET /api/inventory` - Lista pozycji magazynowych
- `POST /api/inventory` - Dodanie pozycji magazynowej
- `GET /api/inventory/:id` - Szczegóły pozycji magazynowej
- `PUT /api/inventory/:id` - Aktualizacja pozycji magazynowej
- `DELETE /api/inventory/:id` - Usunięcie pozycji magazynowej
- `GET /api/inventory/summary` - Podsumowanie stanu magazynowego
- `POST /api/inventory/operations` - Wykonanie operacji magazynowej

### Notifications
- `GET /api/notifications` - Lista powiadomień
- `PUT /api/notifications/:id/read` - Oznaczenie jako przeczytane
- `DELETE /api/notifications/:id` - Usunięcie powiadomienia

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

### Problem: "Access token required" lub "Invalid token"
```bash
# Sprawdź czy używasz poprawnego formatu nagłówka
# Poprawny format: Authorization: Bearer TOKEN

# Sprawdź czy token nie wygasł (domyślnie 24h)
# Zaloguj się ponownie aby uzyskać nowy token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "admin", "password": "password123"}'
```

### Problem: "Insufficient permissions"
```bash
# Sprawdź rolę użytkownika
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Role i uprawnienia:
# - admin: pełny dostęp
# - manager: zarządzanie produktami, inwentarzem, odczyt użytkowników
# - worker: operacje inwentarzowe, odczyt produktów
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

### Problem: "nodemon app crashed"
```bash
# Zabij wszystkie procesy Node.js
pkill -f node

# Sprawdź czy port jest wolny
lsof -i :3001

# Uruchom ponownie
npm run dev
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
├── routes/                  # API Routes
│   ├── auth.js
│   ├── users.js
│   ├── products.js
│   ├── inventory.js
│   └── notifications.js
├── migrations/              # Migracje bazy danych
├── seeders/                 # Dane testowe
├── scripts/                 # Skrypty pomocnicze
├── docs/                    # Dokumentacja
│   └── api-documentation.md
├── server.js               # Główny plik serwera
├── package.json
├── config.env              # Zmienne środowiskowe
└── README.md
```

## 🔗 Integracja z Frontendem

### CORS Configuration
Backend akceptuje żądania z:
- `http://localhost:3000` (React dev server)
- `http://localhost:8080` (Vue CLI)
- `http://localhost:4200` (Angular CLI)

### Response Format
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Format
```json
{
  "success": false,
  "error": "Error message",
  "status": 400
}
```

## 🔐 Następne Kroki

1. **Autoryzacja JWT** - Dodanie middleware autoryzacji
2. **Validation** - Walidacja danych wejściowych
3. **Testing** - Testy jednostkowe i integracyjne
4. **Documentation** - Swagger/OpenAPI documentation

## 📞 Wsparcie

- 📖 Pełna dokumentacja: `README.md`
- 📚 API Documentation: `docs/api-documentation.md`
- 🚀 Quick Start: `QUICKSTART.md`
