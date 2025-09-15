# WMS Backend - Warehouse Management System

Backend systemu zarządzania magazynem (WMS) zbudowany w Node.js z Express.js i PostgreSQL.

## 🚀 Funkcjonalności

### Backend (Must)
- ✅ **Logowanie i autoryzacja (JWT, role)** - Pełna implementacja JWT z kontrolą dostępu opartą na rolach
- ✅ Rejestracja i zarządzanie użytkownikami
- ✅ Historia operacji (logi zmian)
- ✅ Automatyczne powiadomienia o niskim stanie
- ✅ Zarządzanie progami uzupełnień
- ✅ **API Endpoints** - Pełna implementacja REST API z zabezpieczeniami JWT
- ✅ **CORS Configuration** - Gotowe do integracji z frontendem

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

## 🔐 Autoryzacja JWT

System wykorzystuje tokeny JWT (JSON Web Tokens) do autoryzacji użytkowników z kontrolą dostępu opartą na rolach.

### Role użytkowników:
- **admin** - Pełny dostęp do wszystkich funkcjonalności
- **manager** - Zarządzanie produktami, inwentarzem i użytkownikami (odczyt)
- **worker** - Operacje na inwentarzu, odczyt produktów

### Domyślni użytkownicy testowi:
- **Admin**: `admin` / `password123`
- **Manager**: `manager1` / `password123`
- **Worker**: `worker1` / `password123`

### Endpoints autoryzacji:
- `POST /api/auth/login` - Logowanie (zwraca token JWT)
- `GET /api/auth/me` - Dane aktualnego użytkownika (wymaga tokenu)
- `POST /api/auth/refresh` - Odświeżenie tokenu JWT
- `POST /api/auth/register` - Rejestracja nowego użytkownika

### Konfiguracja JWT:
- **Czas ważności tokenu**: 24 godziny (konfigurowalny w `JWT_EXPIRES_IN`)
- **Klucz tajny**: Ustawiony w `JWT_SECRET` w pliku `config.env`
- **Algorytm**: HS256

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

### Produkty (seedery)
- Laptop Dell Inspiron 15
- Mysz bezprzewodowa Logitech
- Klawiatura mechaniczna RGB
- Monitor 24" Full HD
- Kabel HDMI 2m

## 🌐 API Endpoints

### Uwierzytelnianie w API

Wszystkie chronione endpointy wymagają tokenu JWT w nagłówku Authorization:

```bash
# Przykład logowania
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "admin", "password": "password123"}'

# Przykład użycia tokenu w chroniony endpoint
curl http://localhost:3001/api/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Health Check
- `GET /health` - Status serwera

### API Base
- `GET /api` - Informacje o API

### Authentication
- `POST /api/auth/login` - Logowanie użytkownika
- `POST /api/auth/register` - Rejestracja nowego użytkownika

### Users
- `GET /api/users` - Lista wszystkich użytkowników
- `GET /api/users/:id` - Szczegóły użytkownika
- `PUT /api/users/:id` - Aktualizacja użytkownika
- `DELETE /api/users/:id` - Usunięcie użytkownika

### Products
- `GET /api/products` - Lista wszystkich produktów
- `POST /api/products` - Dodanie nowego produktu
- `GET /api/products/:id` - Szczegóły produktu
- `PUT /api/products/:id` - Aktualizacja produktu
- `DELETE /api/products/:id` - Usunięcie produktu

### Inventory
- `GET /api/inventory` - Lista wszystkich pozycji magazynowych
- `POST /api/inventory` - Dodanie nowej pozycji magazynowej
- `GET /api/inventory/:id` - Szczegóły pozycji magazynowej
- `PUT /api/inventory/:id` - Aktualizacja pozycji magazynowej
- `DELETE /api/inventory/:id` - Usunięcie pozycji magazynowej
- `GET /api/inventory/summary` - Podsumowanie stanu magazynowego
- `POST /api/inventory/operations` - Wykonanie operacji magazynowej

### Notifications
- `GET /api/notifications` - Lista powiadomień
- `PUT /api/notifications/:id/read` - Oznaczenie powiadomienia jako przeczytane
- `DELETE /api/notifications/:id` - Usunięcie powiadomienia

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

## 🔗 Integracja z Frontendem

### CORS Configuration
Backend jest skonfigurowany do akceptowania żądań z:
- `http://localhost:3000` (React/Vue/Angular dev server)
- `http://localhost:8080` (Vue CLI default)
- `http://localhost:4200` (Angular CLI default)

### Response Format
Wszystkie odpowiedzi API są w formacie JSON:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Handling
Błędy są zwracane w formacie:
```json
{
  "success": false,
  "error": "Error message",
  "status": 400
}
```

## 📈 Następne Kroki

1. **Autoryzacja JWT** - Dodanie middleware autoryzacji
2. **Validation** - Walidacja danych wejściowych
3. **Testing** - Testy jednostkowe i integracyjne
4. **Documentation** - Swagger/OpenAPI documentation
5. **Notifications** - System powiadomień
6. **Reports** - Generowanie raportów
7. **Export** - Eksport danych (CSV, PDF)

## 📄 Licencja

MIT License - zobacz plik [LICENSE](LICENSE) dla szczegółów.

## 👥 Autorzy

- Mikolaj - Backend Developer

## 📞 Wsparcie

W przypadku problemów lub pytań, utwórz issue w repozytorium. 