# WMS API Documentation

## Overview

WMS (Warehouse Management System) API to RESTful API do zarządzania magazynem, zbudowany w Node.js z Express.js i PostgreSQL.

## Base URL

```
Development: http://localhost:3001
Production: https://your-domain.com
```

## Authentication

API używa JWT (JSON Web Tokens) do autoryzacji. Token powinien być wysyłany w nagłówku `Authorization`:

```
Authorization: Bearer <token>
```

## Response Format

Wszystkie odpowiedzi API są w formacie JSON:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

W przypadku błędu:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

## Endpoints

### Health Check

#### GET /health
Sprawdza status serwera.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600,
  "environment": "development"
}
```

### API Info

#### GET /api
Informacje o API.

**Response:**
```json
{
  "message": "WMS Backend API",
  "version": "1.0.0",
  "status": "running",
  "endpoints": {
    "auth": "/api/auth",
    "users": "/api/users",
    "products": "/api/products",
    "inventory": "/api/inventory",
    "notifications": "/api/notifications"
  }
}
```

## Authentication Endpoints

### POST /api/auth/login
Logowanie użytkownika.

**Request Body:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@wms.com",
      "firstName": "Admin",
      "lastName": "User",
      "role": "admin",
      "isActive": true,
      "lastLoginAt": "2024-01-01T12:00:00.000Z"
    },
    "message": "Login successful (JWT will be added later)"
  }
}
```

### POST /api/auth/register
Rejestracja nowego użytkownika.

**Request Body:**
```json
{
  "username": "newuser",
  "email": "newuser@wms.com",
  "password": "password123",
  "firstName": "New",
  "lastName": "User",
  "role": "worker"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 5,
      "username": "newuser",
      "email": "newuser@wms.com",
      "firstName": "New",
      "lastName": "User",
      "role": "worker",
      "isActive": true
    },
    "message": "User registered successfully"
  }
}
```

### GET /api/auth/me
Pobiera dane aktualnego użytkownika (placeholder dla JWT).

**Response:**
```json
{
  "success": false,
  "error": "JWT authentication not implemented yet",
  "message": "This endpoint will return current user data when JWT is added"
}
```

## User Management Endpoints

### GET /api/users
Pobiera listę użytkowników z paginacją.

**Query Parameters:**
- `page` (number) - Numer strony (domyślnie: 1)
- `limit` (number) - Liczba elementów na stronę (domyślnie: 10)
- `role` (string) - Filtrowanie po roli (admin, manager, worker)
- `isActive` (boolean) - Filtrowanie po statusie aktywności

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "username": "admin",
        "email": "admin@wms.com",
        "firstName": "Admin",
        "lastName": "User",
        "role": "admin",
        "isActive": true,
        "lastLoginAt": "2024-01-01T12:00:00.000Z",
        "createdAt": "2024-01-01T12:00:00.000Z",
        "updatedAt": "2024-01-01T12:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1,
      "itemsPerPage": 10
    }
  }
}
```

### GET /api/users/:id
Pobiera szczegóły użytkownika.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@wms.com",
      "firstName": "Admin",
      "lastName": "User",
      "role": "admin",
      "isActive": true,
      "activityLogs": [...]
    }
  }
}
```

### POST /api/users
Tworzy nowego użytkownika.

**Request Body:**
```json
{
  "username": "newuser",
  "email": "newuser@wms.com",
  "password": "password123",
  "firstName": "New",
  "lastName": "User",
  "role": "worker"
}
```

### PUT /api/users/:id
Aktualizuje dane użytkownika.

**Request Body:**
```json
{
  "firstName": "Updated",
  "lastName": "Name",
  "role": "manager"
}
```

### DELETE /api/users/:id
Dezaktywuje użytkownika (soft delete).

## Product Management Endpoints

### GET /api/products
Pobiera listę produktów z paginacją i filtrowaniem.

**Query Parameters:**
- `page` (number) - Numer strony
- `limit` (number) - Liczba elementów na stronę
- `category` (string) - Filtrowanie po kategorii
- `brand` (string) - Filtrowanie po marce
- `status` (string) - Filtrowanie po statusie
- `search` (string) - Wyszukiwanie w nazwie, SKU, opisie
- `minPrice` (number) - Minimalna cena
- `maxPrice` (number) - Maksymalna cena

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "sku": "LAPTOP-001",
        "name": "Laptop Dell Inspiron 15",
        "description": "15-calowy laptop biznesowy",
        "category": "Elektronika",
        "brand": "Dell",
        "unit": "szt",
        "price": 2999.99,
        "cost": 2200.00,
        "minStockLevel": 5,
        "maxStockLevel": 50,
        "reorderPoint": 10,
        "status": "active",
        "totalStock": 15,
        "totalReserved": 2,
        "totalAvailable": 13
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1,
      "itemsPerPage": 10
    }
  }
}
```

### GET /api/products/:id
Pobiera szczegóły produktu z historią operacji.

### POST /api/products
Tworzy nowy produkt.

**Request Body:**
```json
{
  "sku": "NEW-001",
  "name": "Nowy Produkt",
  "description": "Opis produktu",
  "category": "Elektronika",
  "brand": "Brand",
  "unit": "szt",
  "price": 100.00,
  "cost": 80.00,
  "minStockLevel": 5,
  "maxStockLevel": 50,
  "reorderPoint": 10,
  "status": "active",
  "weight": 1.5,
  "dimensions": "{\"length\": 10, \"width\": 5, \"height\": 2}",
  "barcode": "1234567890123",
  "imageUrl": "https://example.com/image.jpg"
}
```

### PUT /api/products/:id
Aktualizuje produkt.

### DELETE /api/products/:id
Usuwa produkt (tylko jeśli nie ma stanu magazynowego).

### GET /api/products/:id/inventory
Pobiera szczegóły stanu magazynowego produktu.

## Inventory Management Endpoints

### GET /api/inventory
Pobiera listę pozycji magazynowych.

**Query Parameters:**
- `page` (number) - Numer strony
- `limit` (number) - Liczba elementów na stronę
- `productId` (number) - Filtrowanie po produkcie
- `location` (string) - Filtrowanie po lokalizacji
- `condition` (string) - Filtrowanie po stanie
- `supplier` (string) - Filtrowanie po dostawcy
- `lowStock` (boolean) - Tylko produkty z niskim stanem

### GET /api/inventory/:id
Pobiera szczegóły pozycji magazynowej z historią operacji.

### POST /api/inventory
Tworzy nową pozycję magazynową.

**Request Body:**
```json
{
  "productId": 1,
  "location": "A1-01-01",
  "quantity": 10,
  "reservedQuantity": 0,
  "batchNumber": "BATCH-2024-001",
  "expiryDate": "2025-12-31",
  "manufacturingDate": "2024-01-01",
  "supplier": "Dostawca",
  "purchaseOrderNumber": "PO-2024-001",
  "condition": "new",
  "notes": "Uwagi"
}
```

### PUT /api/inventory/:id
Aktualizuje pozycję magazynową.

### DELETE /api/inventory/:id
Usuwa pozycję magazynową (tylko jeśli stan = 0).

### GET /api/inventory/operations
Pobiera historię operacji magazynowych.

**Query Parameters:**
- `page` (number) - Numer strony
- `limit` (number) - Liczba elementów na stronę
- `productId` (number) - Filtrowanie po produkcie
- `operationType` (string) - Typ operacji (in, out)
- `performedBy` (number) - ID użytkownika
- `startDate` (string) - Data początkowa
- `endDate` (string) - Data końcowa

### POST /api/inventory/operations
Tworzy nową operację magazynową.

**Request Body:**
```json
{
  "inventoryItemId": 1,
  "operationType": "in",
  "quantity": 5,
  "notes": "Dostawa"
}
```

### GET /api/inventory/summary
Pobiera podsumowanie stanu magazynowego.

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalItems": 25,
      "totalProducts": 5,
      "lowStockItems": 2,
      "totalCost": 15000.50
    }
  }
}
```

## Notification Endpoints

### GET /api/notifications
Pobiera listę powiadomień.

**Query Parameters:**
- `page` (number) - Numer strony
- `limit` (number) - Liczba elementów na stronę
- `type` (string) - Typ powiadomienia
- `priority` (string) - Priorytet
- `isRead` (boolean) - Czy przeczytane
- `targetRole` (string) - Rola docelowa
- `startDate` (string) - Data początkowa
- `endDate` (string) - Data końcowa

### GET /api/notifications/:id
Pobiera szczegóły powiadomienia.

### POST /api/notifications
Tworzy nowe powiadomienie.

**Request Body:**
```json
{
  "type": "low_stock",
  "title": "Niski stan magazynowy",
  "message": "Produkt XYZ ma niski stan magazynowy",
  "productId": 1,
  "targetRole": "manager",
  "priority": "high"
}
```

### PUT /api/notifications/:id
Aktualizuje powiadomienie.

### PATCH /api/notifications/:id/read
Oznacza powiadomienie jako przeczytane.

### PATCH /api/notifications/read-all
Oznacza wszystkie powiadomienia jako przeczytane.

### DELETE /api/notifications/:id
Usuwa powiadomienie.

### GET /api/notifications/unread/count
Pobiera liczbę nieprzeczytanych powiadomień.

## Data Models

### User Model

```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@wms.com",
  "firstName": "Admin",
  "lastName": "User",
  "role": "admin",
  "isActive": true,
  "lastLoginAt": "2024-01-01T12:00:00.000Z",
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

**Fields:**
- `id` (integer) - Unique identifier
- `username` (string, 3-50 chars) - Unique username
- `email` (string, valid email) - Unique email
- `password` (string, 255 chars) - Hashed password
- `firstName` (string, 2-50 chars) - First name
- `lastName` (string, 2-50 chars) - Last name
- `role` (enum: admin, manager, worker) - User role
- `isActive` (boolean) - Account status
- `lastLoginAt` (datetime) - Last login timestamp
- `createdAt` (datetime) - Creation timestamp
- `updatedAt` (datetime) - Last update timestamp

### Product Model

```json
{
  "id": 1,
  "sku": "LAPTOP-001",
  "name": "Laptop Dell Inspiron 15",
  "description": "15-calowy laptop biznesowy",
  "category": "Elektronika",
  "brand": "Dell",
  "unit": "szt",
  "price": 2999.99,
  "cost": 2200.00,
  "minStockLevel": 5,
  "maxStockLevel": 50,
  "reorderPoint": 10,
  "status": "active",
  "weight": 2.5,
  "dimensions": {
    "length": 35,
    "width": 24,
    "height": 2
  },
  "barcode": "1234567890123",
  "imageUrl": "https://example.com/image.jpg",
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

**Fields:**
- `id` (integer) - Unique identifier
- `sku` (string, 3-50 chars) - Stock Keeping Unit
- `name` (string, 2-200 chars) - Product name
- `description` (text) - Product description
- `category` (string, 100 chars) - Product category
- `brand` (string, 100 chars) - Product brand
- `unit` (string, 20 chars) - Unit of measurement
- `price` (decimal, 10,2) - Selling price
- `cost` (decimal, 10,2) - Purchase cost
- `minStockLevel` (integer) - Minimum stock level
- `maxStockLevel` (integer) - Maximum stock level
- `reorderPoint` (integer) - Reorder point
- `status` (enum: active, inactive, discontinued) - Product status
- `weight` (decimal, 8,3) - Product weight
- `dimensions` (json) - Product dimensions
- `barcode` (string, 50 chars) - Product barcode
- `imageUrl` (string, 500 chars) - Product image URL

### Inventory Item Model

```json
{
  "id": 1,
  "productId": 1,
  "location": "A1-01-01",
  "quantity": 15,
  "reservedQuantity": 2,
  "availableQuantity": 13,
  "batchNumber": "BATCH-2024-001",
  "expiryDate": null,
  "manufacturingDate": "2024-01-15T00:00:00.000Z",
  "supplier": "Dell Poland",
  "purchaseOrderNumber": "PO-2024-001",
  "condition": "new",
  "notes": "Laptopy biznesowe",
  "lastUpdatedBy": 1,
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

**Fields:**
- `id` (integer) - Unique identifier
- `productId` (integer) - Reference to Product
- `location` (string, 50 chars) - Warehouse location
- `quantity` (integer) - Total quantity
- `reservedQuantity` (integer) - Reserved quantity
- `availableQuantity` (virtual) - Available quantity
- `batchNumber` (string, 50 chars) - Batch number
- `expiryDate` (datetime) - Expiry date
- `manufacturingDate` (datetime) - Manufacturing date
- `supplier` (string, 100 chars) - Supplier name
- `purchaseOrderNumber` (string, 50 chars) - PO number
- `condition` (enum: new, good, fair, damaged, expired) - Item condition
- `notes` (text) - Additional notes
- `lastUpdatedBy` (integer) - Reference to User

### Inventory Operation Model

```json
{
  "id": 1,
  "operationType": "in",
  "productId": 1,
  "inventoryItemId": 1,
  "userId": 1,
  "quantity": 10,
  "quantityBefore": 5,
  "quantityAfter": 15,
  "fromLocation": null,
  "toLocation": "A1-01-01",
  "referenceNumber": "IN-2024-001",
  "referenceType": "purchase_order",
  "notes": "Dostawa z zamówienia",
  "operationDate": "2024-01-01T12:00:00.000Z",
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

**Fields:**
- `id` (integer) - Unique identifier
- `operationType` (enum: in, out, transfer, adjustment, reservation, release) - Operation type
- `productId` (integer) - Reference to Product
- `inventoryItemId` (integer) - Reference to InventoryItem
- `userId` (integer) - Reference to User
- `quantity` (integer) - Operation quantity
- `quantityBefore` (integer) - Quantity before operation
- `quantityAfter` (integer) - Quantity after operation
- `fromLocation` (string, 50 chars) - Source location
- `toLocation` (string, 50 chars) - Destination location
- `referenceNumber` (string, 50 chars) - Reference number
- `referenceType` (enum: purchase_order, sales_order, transfer_order, adjustment, inventory_count) - Reference type
- `notes` (text) - Operation notes
- `operationDate` (datetime) - Operation timestamp

### Activity Log Model

```json
{
  "id": 1,
  "userId": 1,
  "action": "product_created",
  "entityType": "product",
  "entityId": 1,
  "productId": 1,
  "details": {
    "productName": "Laptop Dell",
    "sku": "LAPTOP-001"
  },
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "severity": "info",
  "createdAt": "2024-01-01T12:00:00.000Z"
}
```

**Fields:**
- `id` (integer) - Unique identifier
- `userId` (integer) - Reference to User
- `action` (string, 100 chars) - Action performed
- `entityType` (enum: user, product, inventory, operation, system) - Entity type
- `entityId` (integer) - Entity identifier
- `productId` (integer) - Reference to Product
- `details` (json) - Additional details
- `ipAddress` (string, 45 chars) - User IP address
- `userAgent` (text) - User agent string
- `severity` (enum: info, warning, error, critical) - Log severity
- `createdAt` (datetime) - Log timestamp

### Notification Model

```json
{
  "id": 1,
  "type": "low_stock",
  "title": "Niski stan magazynowy",
  "message": "Produkt LAPTOP-001 ma niski stan magazynowy",
  "productId": 1,
  "userId": null,
  "targetRole": "manager",
  "isRead": false,
  "isSent": true,
  "priority": "high",
  "scheduledAt": null,
  "sentAt": "2024-01-01T12:00:00.000Z",
  "readAt": null,
  "metadata": {
    "currentStock": 3,
    "minStockLevel": 5
  },
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

**Fields:**
- `id` (integer) - Unique identifier
- `type` (enum: low_stock, expiry_warning, system_alert, user_activity) - Notification type
- `title` (string, 200 chars) - Notification title
- `message` (text) - Notification message
- `productId` (integer) - Reference to Product
- `userId` (integer) - Reference to User
- `targetRole` (enum: admin, manager, worker, all) - Target role
- `isRead` (boolean) - Read status
- `isSent` (boolean) - Sent status
- `priority` (enum: low, medium, high, urgent) - Priority level
- `scheduledAt` (datetime) - Scheduled send time
- `sentAt` (datetime) - Actual send time
- `readAt` (datetime) - Read timestamp
- `metadata` (json) - Additional metadata

## Error Codes

### Validation Errors (422)
- `VALIDATION_ERROR` - Data validation failed
- `REQUIRED_FIELD` - Required field missing
- `INVALID_FORMAT` - Invalid data format
- `UNIQUE_CONSTRAINT` - Duplicate value

### Authentication Errors (401)
- `INVALID_TOKEN` - Invalid JWT token
- `TOKEN_EXPIRED` - JWT token expired
- `MISSING_TOKEN` - No token provided

### Authorization Errors (403)
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `ROLE_REQUIRED` - Specific role required

### Resource Errors (404)
- `RESOURCE_NOT_FOUND` - Requested resource not found
- `USER_NOT_FOUND` - User not found
- `PRODUCT_NOT_FOUND` - Product not found

### Business Logic Errors (400)
- `INSUFFICIENT_STOCK` - Insufficient stock for operation
- `INVALID_OPERATION` - Invalid operation type
- `DUPLICATE_OPERATION` - Duplicate operation detected

## Rate Limiting

API ma ograniczenia rate limiting:
- **Limit**: 100 requestów na 15 minut na IP
- **Headers**: 
  - `X-RateLimit-Limit` - Limit requestów
  - `X-RateLimit-Remaining` - Pozostałe requesty
  - `X-RateLimit-Reset` - Czas resetu

## Pagination

Endpointy zwracające listy używają paginacji:

**Query Parameters:**
- `page` (integer, default: 1) - Page number
- `limit` (integer, default: 10, max: 100) - Items per page
- `sort` (string) - Sort field
- `order` (enum: asc, desc, default: desc) - Sort order

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Filtering

Endpointy obsługują filtrowanie przez query parameters:

**Examples:**
- `?category=Elektronika` - Filter by category
- `?status=active` - Filter by status
- `?createdAt[gte]=2024-01-01` - Filter by date range
- `?search=laptop` - Search in name/description

## Future Endpoints

Następne endpointy do implementacji:

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh token

### Users
- `GET /api/users` - List users
- `GET /api/users/:id` - Get user
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Products
- `GET /api/products` - List products
- `GET /api/products/:id` - Get product
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Inventory
- `GET /api/inventory` - List inventory items
- `GET /api/inventory/:id` - Get inventory item
- `POST /api/inventory/operations` - Create operation
- `GET /api/inventory/operations` - List operations

### Reports
- `GET /api/reports/stock` - Stock report
- `GET /api/reports/movements` - Movement report
- `GET /api/reports/low-stock` - Low stock report

### Export
- `GET /api/export/products/csv` - Export products to CSV
- `GET /api/export/inventory/pdf` - Export inventory to PDF

## Testing

API można testować używając:

1. **Postman** - Import collection
2. **cURL** - Command line
3. **Swagger UI** - Interactive documentation (po implementacji)

## Support

W przypadku problemów z API:
1. Sprawdź dokumentację
2. Sprawdź logi serwera
3. Utwórz issue w repozytorium 