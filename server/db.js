const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcryptjs");

const dbPath = path.join(__dirname, "auntrosies.db");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(`PRAGMA foreign_keys = ON`);

    // USERS
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
                                             id INTEGER PRIMARY KEY AUTOINCREMENT,
                                             username TEXT NOT NULL UNIQUE,
                                             password TEXT NOT NULL,
                                             role TEXT NOT NULL DEFAULT 'admin',
                                             created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // PRODUCTS
    db.run(`
        CREATE TABLE IF NOT EXISTS products (
                                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                name TEXT NOT NULL,
                                                category TEXT NOT NULL,
                                                description TEXT,
                                                is_active INTEGER DEFAULT 1
        )
    `);

    // PRODUCT SIZES
    db.run(`
        CREATE TABLE IF NOT EXISTS product_sizes (
                                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                     product_id INTEGER NOT NULL,
                                                     size_name TEXT NOT NULL,
                                                     unit_of_measure TEXT NOT NULL,
                                                     is_frozen INTEGER DEFAULT 0,
                                                     is_warm INTEGER DEFAULT 0,
                                                     price REAL NOT NULL,
                                                     FOREIGN KEY (product_id) REFERENCES products(id)
            )
    `);

    // INGREDIENTS
    db.run(`
        CREATE TABLE IF NOT EXISTS ingredients (
                                                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                   name TEXT NOT NULL,
                                                   unit_of_measure TEXT NOT NULL,
                                                   supplier_name TEXT,
                                                   is_local INTEGER DEFAULT 0
        )
    `);

    // RECIPES
    db.run(`
        CREATE TABLE IF NOT EXISTS recipes (
                                               id INTEGER PRIMARY KEY AUTOINCREMENT,
                                               product_id INTEGER NOT NULL,
                                               effective_date TEXT NOT NULL,
                                               FOREIGN KEY (product_id) REFERENCES products(id)
            )
    `);

    // RECIPE INGREDIENTS
    db.run(`
        CREATE TABLE IF NOT EXISTS recipe_ingredients (
                                                          recipe_id INTEGER NOT NULL,
                                                          ingredient_id INTEGER NOT NULL,
                                                          quantity_required REAL NOT NULL,
                                                          PRIMARY KEY (recipe_id, ingredient_id),
            FOREIGN KEY (recipe_id) REFERENCES recipes(id),
            FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
            )
    `);

    // INVENTORY
    db.run(`
        CREATE TABLE IF NOT EXISTS inventory (
                                                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                 size_id INTEGER NOT NULL,
                                                 quantity_on_hand INTEGER NOT NULL,
                                                 last_updated TEXT NOT NULL,
                                                 FOREIGN KEY (size_id) REFERENCES product_sizes(id)
            )
    `);

    // BATCHES
    db.run(`
        CREATE TABLE IF NOT EXISTS batches (
                                               id INTEGER PRIMARY KEY AUTOINCREMENT,
                                               batch_code TEXT NOT NULL,
                                               size_id INTEGER NOT NULL,
                                               quantity_produced INTEGER NOT NULL,
                                               production_date TEXT NOT NULL,
                                               expiry_date TEXT,
                                               FOREIGN KEY (size_id) REFERENCES product_sizes(id)
            )
    `);

    // MARKETS
    db.run(`
        CREATE TABLE IF NOT EXISTS markets (
                                               id INTEGER PRIMARY KEY AUTOINCREMENT,
                                               name TEXT NOT NULL,
                                               city TEXT NOT NULL,
                                               market_type TEXT NOT NULL,
                                               day_of_week TEXT NOT NULL
        )
    `);

    // STAFF
    db.run(`
        CREATE TABLE IF NOT EXISTS staff (
                                             id INTEGER PRIMARY KEY AUTOINCREMENT,
                                             first_name TEXT NOT NULL,
                                             last_name TEXT NOT NULL,
                                             phone_number TEXT,
                                             employment_type TEXT NOT NULL,
                                             hire_date TEXT
        )
    `);

    // STAFF ASSIGNMENTS
    db.run(`
        CREATE TABLE IF NOT EXISTS staff_assignments (
                                                         id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                         market_id INTEGER NOT NULL,
                                                         staff_id INTEGER NOT NULL,
                                                         work_date TEXT NOT NULL,
                                                         FOREIGN KEY (market_id) REFERENCES markets(id),
            FOREIGN KEY (staff_id) REFERENCES staff(id)
            )
    `);

    // SALES
    db.run(`
        CREATE TABLE IF NOT EXISTS sales (
                                             id INTEGER PRIMARY KEY AUTOINCREMENT,
                                             market_id INTEGER NOT NULL,
                                             sale_date TEXT NOT NULL,
                                             payment_method TEXT NOT NULL,
                                             total_amount REAL NOT NULL,
                                             FOREIGN KEY (market_id) REFERENCES markets(id)
            )
    `);

    // SALE ITEMS
    db.run(`
        CREATE TABLE IF NOT EXISTS sale_items (
                                                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                  sale_id INTEGER NOT NULL,
                                                  size_id INTEGER NOT NULL,
                                                  quantity_sold INTEGER NOT NULL,
                                                  unit_price REAL NOT NULL,
                                                  FOREIGN KEY (sale_id) REFERENCES sales(id),
            FOREIGN KEY (size_id) REFERENCES product_sizes(id)
            )
    `);

    // NUTRITION INFO
    db.run(`
        CREATE TABLE IF NOT EXISTS nutrition_info (
                                                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                      product_id INTEGER NOT NULL,
                                                      serving_size TEXT,
                                                      calories REAL,
                                                      fat REAL,
                                                      carbohydrates REAL,
                                                      protein REAL,
                                                      sodium REAL,
                                                      FOREIGN KEY (product_id) REFERENCES products(id)
            )
    `);

    // DEFAULT ADMIN USER
    db.get(
        `SELECT id FROM users WHERE username = ?`,
        ["admin"],
        async (err, row) => {
            if (err) {
                console.error("Error checking default admin user:", err.message);
                return;
            }

            if (!row) {
                try {
                    const hashedPassword = await bcrypt.hash("admin123", 10);

                    db.run(
                        `
                            INSERT INTO users (username, password, role)
                            VALUES (?, ?, ?)
                        `,
                        ["admin", hashedPassword, "admin"],
                        (insertErr) => {
                            if (insertErr) {
                                console.error("Error creating default admin user:", insertErr.message);
                            } else {
                                console.log("Default admin user created: username=admin password=admin123");
                            }
                        }
                    );
                } catch (hashErr) {
                    console.error("Error hashing default admin password:", hashErr.message);
                }
            }
        }
    );

    // SAMPLE PRODUCTS
    db.run(`
        INSERT OR IGNORE INTO products (id, name, category, description, is_active) VALUES
        (1, 'Steak & Stout Pie', 'Pie', 'Savory pie made with steak and stout', 1),
        (2, 'Steak & Kidney Pie', 'Pie', 'Traditional steak and kidney pie', 1),
        (3, 'Rosemary Chicken Pie', 'Pie', 'Chicken pie with rosemary seasoning', 1),
        (4, 'Turkey Leek Pie', 'Pie', 'Turkey and leek savory pie', 1),
        (5, 'Dill Pickles', 'Preserve', 'Homemade dill pickles', 1),
        (6, 'Sweet Peaches', 'Preserve', 'Sweet preserved peaches', 1),
        (7, 'Sugar Beets', 'Preserve', 'Pickled sugar beets', 1),
        (8, 'Hot Pepper Mix', 'Preserve', 'Mixed hot peppers in brine', 1),
        (9, 'Hot Horseradish', 'Preserve', 'Homemade hot horseradish', 1)
    `);

    // SAMPLE PRODUCT SIZES
    db.run(`
        INSERT OR IGNORE INTO product_sizes (id, product_id, size_name, unit_of_measure, is_frozen, is_warm, price) VALUES
        (1, 1, '250', 'g', 0, 1, 8.00),
        (2, 1, '1', 'kg', 1, 0, 18.00),
        (3, 2, '250', 'g', 0, 1, 8.00),
        (4, 2, '1', 'kg', 1, 0, 18.00),
        (5, 3, '250', 'g', 0, 1, 8.50),
        (6, 3, '1', 'kg', 1, 0, 19.00),
        (7, 4, '250', 'g', 0, 1, 8.50),
        (8, 4, '1', 'kg', 1, 0, 19.00),
        (9, 5, '500', 'ml', 0, 0, 6.00),
        (10, 5, '1', 'L', 0, 0, 10.00),
        (11, 9, '250', 'ml', 0, 0, 7.50),
        (12, 9, '500', 'ml', 0, 0, 12.00)
    `);

    // SAMPLE INGREDIENTS
    db.run(`
        INSERT OR IGNORE INTO ingredients (id, name, unit_of_measure, supplier_name, is_local) VALUES
        (1, 'Local Beef', 'g', 'Durham Farm Supply', 1),
        (2, 'Kidney', 'g', 'Durham Farm Supply', 1),
        (3, 'Chicken', 'g', 'Whitby Poultry', 1),
        (4, 'Turkey', 'g', 'Whitby Poultry', 1),
        (5, 'Leeks', 'g', 'Green Valley Farms', 1),
        (6, 'Onions', 'g', 'Green Valley Farms', 1),
        (7, 'Carrots', 'g', 'Green Valley Farms', 1),
        (8, 'Flour', 'g', 'Ontario Mills', 1),
        (9, 'Dill', 'g', 'Local Herbs Co.', 1),
        (10, 'Cucumbers', 'g', 'Fresh Pick Farms', 1),
        (11, 'Horseradish Root', 'g', 'Fresh Pick Farms', 1),
        (12, 'Peaches', 'g', 'Niagara Orchard Supply', 1),
        (13, 'Sugar', 'g', 'Ontario Mills', 1),
        (14, 'Beets', 'g', 'Fresh Pick Farms', 1),
        (15, 'Hot Peppers', 'g', 'Spice Valley Produce', 1),
        (16, 'Vinegar', 'ml', 'Pickling House', 0),
        (17, 'Salt', 'g', 'Pickling House', 0),
        (18, 'Stout', 'ml', 'Local Brewery Supply', 1),
        (19, 'Rosemary', 'g', 'Local Herbs Co.', 1)
    `);

    // SAMPLE RECIPES
    db.run(`
        INSERT OR IGNORE INTO recipes (id, product_id, effective_date) VALUES
        (1, 1, '2026-01-01'),
        (2, 2, '2026-01-01'),
        (3, 3, '2026-01-01'),
        (4, 4, '2026-01-01'),
        (5, 5, '2026-01-01'),
        (6, 6, '2026-01-01'),
        (7, 7, '2026-01-01'),
        (8, 8, '2026-01-01'),
        (9, 9, '2026-01-01')
    `);

    // SAMPLE RECIPE INGREDIENTS
    db.run(`
        INSERT OR IGNORE INTO recipe_ingredients (recipe_id, ingredient_id, quantity_required) VALUES
        (1, 1, 100),
        (1, 6, 50),
        (1, 7, 30),
        (1, 8, 120),
        (1, 18, 40),

        (2, 1, 80),
        (2, 2, 40),
        (2, 6, 40),
        (2, 8, 120),

        (3, 3, 120),
        (3, 19, 5),
        (3, 6, 40),
        (3, 8, 120),

        (4, 4, 120),
        (4, 5, 40),
        (4, 6, 30),
        (4, 8, 120),

        (5, 10, 200),
        (5, 9, 20),
        (5, 16, 100),
        (5, 17, 5),

        (6, 12, 200),
        (6, 13, 40),
        (6, 16, 50),

        (7, 14, 180),
        (7, 13, 35),
        (7, 16, 80),

        (8, 15, 180),
        (8, 16, 100),
        (8, 17, 5),

        (9, 11, 150),
        (9, 16, 60),
        (9, 17, 4)
    `);

    // SAMPLE INVENTORY
    db.run(`
        INSERT OR IGNORE INTO inventory (id, size_id, quantity_on_hand, last_updated) VALUES
        (1, 1, 5, '2026-04-06'),
        (2, 2, 8, '2026-04-06'),
        (3, 5, 12, '2026-04-06'),
        (4, 9, 3, '2026-04-06'),
        (5, 11, 15, '2026-04-06')
    `);

    // SAMPLE BATCHES
    db.run(`
        INSERT OR IGNORE INTO batches (id, batch_code, size_id, quantity_produced, production_date, expiry_date) VALUES
        (1, 'B001', 5, 12, '2026-03-20', '2026-03-27'),
        (2, 'B002', 9, 10, '2026-03-18', '2026-06-18'),
        (3, 'B003', 1, 20, '2026-03-25', '2026-04-01')
    `);

    // SAMPLE MARKETS
    db.run(`
        INSERT OR IGNORE INTO markets (id, name, city, market_type, day_of_week) VALUES
        (1, 'Oshawa Farmers Market', 'Oshawa', 'Farmers Market', 'Friday'),
        (2, 'Peterborough Farmers Market', 'Peterborough', 'Farmers Market', 'Saturday'),
        (3, 'Trenton Home Show', 'Trenton', 'Home Show', 'Sunday')
    `);

    // SAMPLE STAFF
    db.run(`
        INSERT OR IGNORE INTO staff (id, first_name, last_name, phone_number, employment_type, hire_date) VALUES
        (1, 'Jake', 'Thompson', '905-555-1234', 'Part Time', '2025-06-15'),
        (2, 'Maria', 'Chen', '905-555-5678', 'Full Time', '2024-03-01')
    `);

    // SAMPLE STAFF ASSIGNMENTS
    db.run(`
        INSERT OR IGNORE INTO staff_assignments (id, market_id, staff_id, work_date) VALUES
        (1, 1, 1, '2026-04-26'),
        (2, 2, 2, '2026-04-27')
    `);

    // SAMPLE SALES
    db.run(`
        INSERT OR IGNORE INTO sales (id, market_id, sale_date, payment_method, total_amount) VALUES
        (1, 1, '2026-04-06', 'Cash', 24.00),
        (2, 2, '2026-04-06', 'Card', 18.00)
    `);

    // SAMPLE SALE ITEMS
    db.run(`
        INSERT OR IGNORE INTO sale_items (id, sale_id, size_id, quantity_sold, unit_price) VALUES
        (1, 1, 1, 2, 8.00),
        (2, 1, 9, 1, 6.00),
        (3, 2, 5, 2, 9.00)
    `);

    // SAMPLE NUTRITION INFO
    db.run(`
        INSERT OR IGNORE INTO nutrition_info (id, product_id, serving_size, calories, fat, carbohydrates, protein, sodium) VALUES
        (1, 1, '250g', 450, 20, 35, 28, 700),
        (2, 3, '250g', 420, 18, 32, 30, 650),
        (3, 5, '100ml', 80, 0, 18, 1, 300),
        (4, 9, '50ml', 25, 0, 5, 1, 150)
    `);
});

module.exports = db;