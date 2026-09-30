# Inventory Backend

A simple **Amazon-style Inventory Management Backend** built with **Node.js, Express.js, and PostgreSQL**.

The project demonstrates how an e-commerce application can manage products, stock, reserved inventory, and concurrent inventory updates.

---

## 🚀 Tech Stack

- **Node.js** — Runtime
- **Express.js** — REST API
- **PostgreSQL** — Relational database
- **pg** — PostgreSQL driver
- **dotenv** — Environment variables
- **Nodemon** — Development server

---

# 📌 Features

### Product Management

- Create products
- Store product SKU
- Store product price
- Maintain product inventory

### Inventory Management

- Track total inventory
- Track reserved inventory
- Calculate available inventory
- Update stock

### Inventory Reservation

When a customer starts an order, inventory can be temporarily reserved.

```text
Available Stock = Total Stock - Reserved Stock
```

For example:

```text
Total Stock       = 100
Reserved Stock    = 20

Available Stock   = 80
```

### Database Transactions

Product creation uses a PostgreSQL transaction so that the product and its inventory are created together.

```text
BEGIN
   ↓
Create Product
   ↓
Create Inventory
   ↓
COMMIT
```

If something fails:

```text
ROLLBACK
```

---

# 🏗️ Project Structure

```text
inventory-backend/
│
├── src/
│   │
│   ├── config/
│   │   └── db.js
│   │
│   ├── controllers/
│   │   └── inventory.controller.js
│   │
│   ├── routes/
│   │   └── inventory.routes.js
│   │
│   ├── services/
│   │   └── inventory.service.js
│   │
│   ├── app.js
│   └── server.js
│
├── .env
├── .gitignore
├── package.json
└── README.md
```

---

# ⚙️ Setup

## 1. Clone the repository

```bash
git clone <your-repository-url>

cd inventory-backend
```

## 2. Install dependencies

```bash
npm install
```

## 3. Create PostgreSQL database

```bash
createdb inventory_db
```

Or create it from PostgreSQL:

```sql
CREATE DATABASE inventory_db;
```

---

# 🗄️ Database Schema

## Products

```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Inventory

```sql
CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    product_id INT UNIQUE REFERENCES products(id),
    quantity INT NOT NULL DEFAULT 0,
    reserved_quantity INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Relationship:

```text
┌──────────────┐
│   products   │
├──────────────┤
│ id           │
│ name         │
│ sku          │
│ price        │
└──────┬───────┘
       │
       │ 1 : 1
       │
┌──────▼───────┐
│  inventory   │
├──────────────┤
│ id           │
│ product_id   │
│ quantity     │
│ reserved_qty │
└──────────────┘
```

---

# 🔐 Environment Variables

Create a `.env` file:

```env
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=inventory_db
DB_USER=postgres
DB_PASSWORD=your_password
```

Never commit `.env` to Git.

Add this to `.gitignore`:

```text
node_modules
.env
```

---

# ▶️ Running the Project

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

The server will start at:

```text
http://localhost:5000
```

---

# 🔌 API Endpoints

## Create Product

```http
POST /api/inventory/products
```

Request:

```json
{
  "name": "iPhone 17",
  "sku": "IPHONE17-128",
  "price": 79999,
  "quantity": 100
}
```

Example:

```bash
curl -X POST http://localhost:5000/api/inventory/products \
-H "Content-Type: application/json" \
-d '{
    "name": "iPhone 17",
    "sku": "IPHONE17-128",
    "price": 79999,
    "quantity": 100
}'
```

---

## Get Inventory

```http
GET /api/inventory/products/:id
```

Example:

```bash
curl http://localhost:5000/api/inventory/products/1
```

Response:

```json
{
  "id": 1,
  "name": "iPhone 17",
  "sku": "IPHONE17-128",
  "price": "79999",
  "quantity": 100,
  "reserved_quantity": 10,
  "available_quantity": 90
}
```

---

# 🧠 Inventory Model

The system maintains two important values:

```text
quantity
reserved_quantity
```

Available inventory is calculated as:

```text
available_quantity =
    quantity - reserved_quantity
```

Example:

```text
quantity = 100

reserved_quantity = 25

available_quantity = 75
```

---

# 🛒 How Inventory Reservation Works

Suppose a customer wants to purchase 2 products.

Current inventory:

```text
Total       = 10
Reserved    = 3
Available   = 7
```

Customer requests:

```text
2 units
```

The system checks:

```text
7 >= 2
```

Since enough inventory exists:

```text
reserved_quantity = 3 + 2

reserved_quantity = 5
```

Now:

```text
Total       = 10
Reserved    = 5
Available   = 5
```

---

# 🔄 Order Flow

A simplified e-commerce inventory flow looks like this:

```text
Customer
   │
   ▼
Create Order
   │
   ▼
Check Inventory
   │
   ▼
Reserve Stock
   │
   ▼
Payment
   │
   ├───────────────┐
   │               │
Success          Failure
   │               │
   ▼               ▼
Confirm Order    Release Stock
   │
   ▼
Reduce Inventory
```

---

# ⚠️ The Concurrency Problem

Inventory becomes interesting when multiple customers try to purchase the last item simultaneously.

Suppose:

```text
Stock = 1
```

Two customers send requests at almost the same time:

```text
Customer A ──────┐
                  ├──> Inventory = 1
Customer B ──────┘
```

Without proper concurrency control, both requests could read:

```text
available_quantity = 1
```

Both may then attempt to purchase the item.

This can result in **overselling**.

---

# 🔒 PostgreSQL Row Locking

To prevent this, PostgreSQL can lock the inventory row during the transaction.

```sql
BEGIN;

SELECT *
FROM inventory
WHERE product_id = $1
FOR UPDATE;
```

`FOR UPDATE` locks the selected row until the transaction completes.

The flow becomes:

```text
Transaction A
     │
     ▼
Lock inventory row
     │
     ▼
Check stock
     │
     ▼
Reserve stock
     │
     ▼
COMMIT
     │
     ▼
Transaction B
     │
     ▼
Acquire lock
     │
     ▼
Check updated stock
```

This prevents two concurrent transactions from modifying the same inventory row incorrectly.

---

# 💳 Reservation vs Actual Inventory

Reservation and final inventory deduction are different concepts.

For example:

```text
Initial:

quantity = 10
reserved = 0
available = 10
```

Customer starts checkout:

```text
quantity = 10
reserved = 2
available = 8
```

Payment succeeds:

```text
quantity = 8
reserved = 0
available = 8
```

Payment fails:

```text
quantity = 10
reserved = 0
available = 10
```

So reservation allows the system to temporarily hold inventory while an order is being completed.

---

# 🧩 Service Layer

Business logic is kept inside the service layer rather than directly inside routes.

```text
HTTP Request
     │
     ▼
Route
     │
     ▼
Controller
     │
     ▼
Service
     │
     ▼
PostgreSQL
```

For example:

```text
POST /products
       ↓
inventory.routes.js
       ↓
inventory.controller.js
       ↓
inventory.service.js
       ↓
PostgreSQL
```

This keeps the application easier to maintain and test.

---

# 🛡️ Why Use Transactions?

Creating a product requires two database operations:

```text
1. Create product
2. Create inventory
```

Without a transaction:

```text
Create Product ✅
Create Inventory ❌

Database:

Product exists
Inventory doesn't
```

This leaves inconsistent data.

With a transaction:

```text
BEGIN

Create Product
Create Inventory

COMMIT
```

If anything fails:

```text
ROLLBACK
```

Both operations are undone.

---

# 📈 Future Improvements

This project is intentionally simple. A production-grade inventory system could add:

### Orders

```text
orders
order_items
```

### Inventory Reservations

```text
reservations
reservation_items
```

### Payments

```text
payments
```

### Multiple Warehouses

```text
warehouses
warehouse_inventory
```

### Redis

Use Redis for:

- Fast inventory reads
- Distributed locks
- Temporary reservations
- Caching

### Background Jobs

Use BullMQ for:

- Expiring reservations
- Inventory synchronization
- Notifications

### Messaging

Use Kafka/RabbitMQ for events:

```text
OrderCreated
StockReserved
PaymentCompleted
StockReleased
OrderCancelled
```

---

# 🏭 Production Architecture

A more realistic architecture could look like:

```text
                  ┌───────────────┐
                  │    Client     │
                  └───────┬───────┘
                          │
                          ▼
                  ┌───────────────┐
                  │ API Gateway   │
                  └───────┬───────┘
                          │
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
       ┌─────────────┐         ┌─────────────┐
       │ Order       │         │ Inventory   │
       │ Service     │         │ Service     │
       └──────┬──────┘         └──────┬──────┘
              │                       │
              │                       ▼
              │                ┌─────────────┐
              │                │ PostgreSQL  │
              │                └─────────────┘
              │
              ▼
       ┌─────────────┐
       │ Payment     │
       │ Service     │
       └─────────────┘

              │
              ▼
          ┌────────┐
          │ Kafka  │
          └────────┘
```

---

# 🎯 Interview Concepts Covered

This project can be used to discuss:

- REST API design
- Express.js architecture
- PostgreSQL
- Database relationships
- Transactions
- ACID properties
- Row-level locking
- `SELECT FOR UPDATE`
- Race conditions
- Concurrent requests
- Inventory reservation
- Overselling
- Idempotency
- Redis
- Distributed locking
- Event-driven architecture
- Order lifecycle
- Payment failure handling
- Database consistency

---

# 🚧 Roadmap

### Phase 1 — Basic Inventory

- [x] Product creation
- [x] Inventory creation
- [x] Get inventory
- [x] PostgreSQL transactions

### Phase 2 — Concurrency

- [ ] Update stock
- [ ] Reserve inventory
- [ ] Release inventory
- [ ] `SELECT FOR UPDATE`
- [ ] Prevent overselling

### Phase 3 — Orders

- [ ] Create order
- [ ] Order items
- [ ] Order states
- [ ] Cancel order
- [ ] Payment integration

### Phase 4 — Scalability

- [ ] Redis caching
- [ ] Distributed locks
- [ ] Idempotency keys
- [ ] BullMQ
- [ ] Kafka
- [ ] Multiple warehouses

---

# 📚 Key Takeaway

The main challenge in an inventory system is not CRUD.

The difficult part is maintaining **correct inventory when many users simultaneously attempt to purchase the same product**.

The fundamental invariant is:

```text
available_quantity =
    quantity - reserved_quantity
```

And the system must ensure that concurrent requests cannot cause:

```text
available_quantity < 0
```

This project starts with a simple Express + PostgreSQL implementation and can progressively evolve into a production-style distributed inventory system.