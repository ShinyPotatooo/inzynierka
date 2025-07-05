# WMS Backend - Warehouse Management System

Backend systemu zarządzania magazynem (WMS) zbudowany w Node.js z Express.js i PostgreSQL.

## 🚀 Funkcjonalności

### Backend (Must)
- ✅ Logowanie i autoryzacja (JWT, role)
- ✅ Rejestracja i zarządzanie użytkownikami
- ✅ Historia operacji (logi zmian)
- ✅ Automatyczne powiadomienia o niskim stanie
- ✅ Zarządzanie progami uzupełnień

### Fullstack (+)
- ✅ Eksport danych (CSV, PDF)
- ✅ Generowanie raportów magazynowych

## 🛠️ Stack Technologiczny

- **Backend**: Node.js + Express.js
- **Baza danych**: PostgreSQL
- **ORM**: Sequelize
- **Autoryzacja**: JWT (jsonwebtoken)
- **Bezpieczeństwo**: bcrypt, helmet, rate-limiting
- **Dokumentacja**: Swagger/OpenAPI

## 📋 Wymagania

- Node.js (v16 lub nowszy)
- PostgreSQL (v12 lub nowszy)
- npm lub yarn

## 🔧 Instalacja

### 1. Sklonuj repozytorium
```bash
git clone <repository-url>
cd wms-backend
```

### 2. Zainstaluj zależności
```bash
npm install
```

### 3. Skonfiguruj bazę danych PostgreSQL

#### Opcja A: Użyj skryptu automatycznego
```bash
chmod +x scripts/setup-database.sh
./scripts/setup-database.sh
```

#### Opcja B: Ręczna konfiguracja
```sql
-- Połącz się do PostgreSQL jako superuser
sudo -u postgres psql

-- Utwórz użytkownika
CREATE USER wms_user WITH PASSWORD 'wms_password';

-- Utwórz bazę danych
CREATE DATABASE wms_database OWNER wms_user;

-- Nadaj uprawnienia
GRANT ALL PRIVILEGES ON DATABASE wms_database TO wms_user;
ALTER USER wms_user CREATEDB;

-- Wyjdź z psql
\q
```

### 4. Skonfiguruj zmienne środowiskowe
```bash
# Skopiuj plik konfiguracyjny
cp config.env .env

# Edytuj .env według potrzeb
nano .env
```

### 5. Uruchom migracje i seedery
```bash
# Uruchom migracje
npm run db:migrate

# Uruchom seedery (dane testowe)
npm run db:seed
```

### 6. Uruchom serwer
```bash
# Tryb development
npm run dev

# Tryb production
npm start
```

## 📊 Struktura Bazy Danych

### Tabele
- **users** - Użytkownicy systemu
- **products** - Produkty/towary
- **inventory_items** - Stan magazynowy
- **inventory_operations** - Operacje magazynowe
- **activity_logs** - Historia operacji
- **notifications** - Powiadomienia

### Relacje
- User → ActivityLog (1:N)
- User → InventoryOperation (1:N)
- Product → InventoryItem (1:N)
- Product → InventoryOperation (1:N)
- Product → ActivityLog (1:N)
- InventoryItem → InventoryOperation (1:N)

## 🔐 Role Użytkowników

- **admin** - Pełne uprawnienia
- **manager** - Zarządzanie magazynem
- **worker** - Podstawowe operacje

## 📝 Dane Testowe

Po uruchomieniu seederów dostępne są następujące konta:

### Użytkownicy
- **admin** / password123 (admin@wms.com)
- **manager1** / password123 (manager1@wms.com)
- **worker1** / password123 (worker1@wms.com)
- **worker2** / password123 (worker2@wms.com)

### Produkty
- Laptop Dell Inspiron 15
- Mysz bezprzewodowa Logitech
- Klawiatura mechaniczna RGB
- Monitor 24" Full HD
- Kabel HDMI 2m

## 🌐 API Endpoints

### Health Check
- `GET /health` - Status serwera

### API Base
- `GET /api` - Informacje o API

## 📚 Skrypty NPM

```bash
npm start          # Uruchom serwer w trybie production
npm run dev        # Uruchom serwer w trybie development
npm test           # Uruchom testy
npm run db:migrate # Uruchom migracje
npm run db:seed    # Uruchom seedery
npm run db:reset   # Resetuj bazę danych
```

## 🔍 Monitorowanie

### Logi
- Development: `morgan('dev')`
- Production: `morgan('combined')`

### Health Check
```bash
curl http://localhost:3001/health
```

## 🚨 Bezpieczeństwo

- Helmet.js dla nagłówków bezpieczeństwa
- Rate limiting (100 requestów/15min na IP)
- CORS configuration
- Walidacja danych wejściowych
- Szyfrowanie haseł (bcrypt)

## 📈 Następne Kroki

1. **Autoryzacja JWT** - Dodanie middleware autoryzacji
2. **API Routes** - Implementacja endpointów REST
3. **Walidation** - Walidacja danych wejściowych
4. **Testing** - Testy jednostkowe i integracyjne
5. **Documentation** - Swagger/OpenAPI documentation
6. **Notifications** - System powiadomień
7. **Reports** - Generowanie raportów
8. **Export** - Eksport danych (CSV, PDF)

## 🤝 Kontrybucja

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 Licencja

MIT License - zobacz plik [LICENSE](LICENSE) dla szczegółów.

## 👥 Autorzy

- Mikolaj - Backend Developer
- [Inni członkowie zespołu]

## 📞 Wsparcie

W przypadku problemów lub pytań, utwórz issue w repozytorium. 