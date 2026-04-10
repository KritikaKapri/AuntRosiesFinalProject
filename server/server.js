const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("./db");

const app = express();
const PORT = 5000;
const JWT_SECRET = "aunt_rosies_super_secret_key_change_this";

app.use(cors());
app.use(express.json());

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token." });
    }
}

app.get("/", (req, res) => {
    res.send("API Working");
});

// LOGIN ROUTE
app.post("/api/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
    }

    db.get(
        `
            SELECT id, username, password, role
            FROM users
            WHERE username = ?
        `,
        [username],
        async (err, user) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (!user) {
                return res.status(401).json({ error: "Invalid username or password." });
            }

            try {
                const passwordMatch = await bcrypt.compare(password, user.password);

                if (!passwordMatch) {
                    return res.status(401).json({ error: "Invalid username or password." });
                }

                const token = jwt.sign(
                    {
                        id: user.id,
                        username: user.username,
                        role: user.role
                    },
                    JWT_SECRET,
                    { expiresIn: "2h" }
                );

                res.json({
                    message: "Login successful.",
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        role: user.role
                    }
                });
            } catch (compareErr) {
                return res.status(500).json({ error: compareErr.message });
            }
        }
    );
});

// OPTIONAL: GET CURRENT USER
app.get("/api/me", authenticateToken, (req, res) => {
    res.json({
        user: req.user
    });
});

// PRODUCTS
app.get("/api/products", authenticateToken, (req, res) => {
    db.all(
        `
            SELECT
                ps.id AS id,
                p.id AS product_id,
                p.name AS Product,
                p.category AS Category,
                ps.size_name || ps.unit_of_measure AS Size,
                CASE
                    WHEN ps.is_warm = 1 THEN 'Warm'
                    WHEN ps.is_frozen = 1 THEN 'Frozen'
                    ELSE 'Regular'
            END AS Type,
                '$' || printf('%.2f', ps.price) AS Price
            FROM products p
            JOIN product_sizes ps ON p.id = ps.product_id
            WHERE p.is_active = 1
            ORDER BY p.name, ps.id
        `,
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
});

// ADD PRODUCT
app.post("/api/products", authenticateToken, (req, res) => {
    const {
        name,
        category,
        description,
        size_name,
        unit_of_measure,
        is_frozen,
        is_warm,
        price
    } = req.body;

    if (!name || !category || !size_name || !unit_of_measure || price === undefined) {
        return res.status(400).json({ error: "Missing required product fields." });
    }

    db.serialize(() => {
        db.run(
            `
                INSERT INTO products (name, category, description, is_active)
                VALUES (?, ?, ?, 1)
            `,
            [name, category, description || ""],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                const productId = this.lastID;

                db.run(
                    `
                        INSERT INTO product_sizes (
                            product_id,
                            size_name,
                            unit_of_measure,
                            is_frozen,
                            is_warm,
                            price
                        )
                        VALUES (?, ?, ?, ?, ?, ?)
                    `,
                    [
                        productId,
                        size_name,
                        unit_of_measure,
                        is_frozen ? 1 : 0,
                        is_warm ? 1 : 0,
                        price
                    ],
                    function (sizeErr) {
                        if (sizeErr) {
                            return res.status(500).json({ error: sizeErr.message });
                        }

                        res.json({
                            message: "Product created successfully.",
                            product_id: productId,
                            size_id: this.lastID
                        });
                    }
                );
            }
        );
    });
});

// INVENTORY
app.get("/api/inventory", authenticateToken, (req, res) => {
    db.all(
        `
            SELECT
                p.name AS Product,
                ps.size_name || ps.unit_of_measure AS Size,
                i.quantity_on_hand AS Stock,
                CASE
                    WHEN i.quantity_on_hand <= 5 THEN 'Low'
                    ELSE 'Good'
            END AS Status
            FROM inventory i
            JOIN product_sizes ps ON i.size_id = ps.id
            JOIN products p ON ps.product_id = p.id
            ORDER BY p.name
        `,
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
});

// ADJUST INVENTORY
app.post("/api/inventory/adjust", authenticateToken, (req, res) => {
    const { size_id, adjustment_type, quantity, reason } = req.body;

    if (!size_id || !adjustment_type || !quantity) {
        return res.status(400).json({
            error: "size_id, adjustment_type, and quantity are required."
        });
    }

    const qty = Number(quantity);

    if (qty <= 0) {
        return res.status(400).json({
            error: "Quantity must be greater than 0."
        });
    }

    if (!["Add", "Remove"].includes(adjustment_type)) {
        return res.status(400).json({
            error: "adjustment_type must be 'Add' or 'Remove'."
        });
    }

    db.get(
        `
            SELECT id, quantity_on_hand
            FROM inventory
            WHERE size_id = ?
        `,
        [size_id],
        (findErr, inventoryRow) => {
            if (findErr) {
                return res.status(500).json({ error: findErr.message });
            }

            if (!inventoryRow) {
                return res.status(404).json({
                    error: "Inventory record not found for the selected product size."
                });
            }

            let newQuantity = inventoryRow.quantity_on_hand;

            if (adjustment_type === "Add") {
                newQuantity += qty;
            } else {
                if (inventoryRow.quantity_on_hand < qty) {
                    return res.status(400).json({
                        error: `Cannot remove ${qty}. Only ${inventoryRow.quantity_on_hand} in stock.`
                    });
                }
                newQuantity -= qty;
            }

            db.run(
                `
                    UPDATE inventory
                    SET quantity_on_hand = ?,
                        last_updated = date('now')
                    WHERE size_id = ?
                `,
                [newQuantity, size_id],
                function (updateErr) {
                    if (updateErr) {
                        return res.status(500).json({ error: updateErr.message });
                    }

                    res.json({
                        message: `Inventory adjusted successfully. Reason: ${reason || "Not provided"}`,
                        new_quantity: newQuantity
                    });
                }
            );
        }
    );
});

// BATCHES
app.get("/api/batches", authenticateToken, (req, res) => {
    db.all(
        `
            SELECT
                b.batch_code AS Batch,
                p.name AS Product,
                ps.size_name || ps.unit_of_measure AS Size,
                b.quantity_produced AS Quantity,
                b.production_date AS Date,
                b.expiry_date AS ExpiryDate
            FROM batches b
                JOIN product_sizes ps ON b.size_id = ps.id
                JOIN products p ON ps.product_id = p.id
            ORDER BY b.production_date DESC
        `,
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
});

// CREATE BATCH
app.post("/api/batches", authenticateToken, (req, res) => {
    const { batch_code, size_id, quantity_produced, production_date, expiry_date } = req.body;

    if (!batch_code || !size_id || !quantity_produced || !production_date) {
        return res.status(400).json({
            error: "batch_code, size_id, quantity_produced, and production_date are required."
        });
    }

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        db.run(
            `
                INSERT INTO batches (batch_code, size_id, quantity_produced, production_date, expiry_date)
                VALUES (?, ?, ?, ?, ?)
            `,
            [batch_code, size_id, quantity_produced, production_date, expiry_date || null],
            function (err) {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: err.message });
                }

                const batchId = this.lastID;

                db.get(
                    `
                        SELECT id, quantity_on_hand
                        FROM inventory
                        WHERE size_id = ?
                    `,
                    [size_id],
                    (inventoryErr, inventoryRow) => {
                        if (inventoryErr) {
                            db.run("ROLLBACK");
                            return res.status(500).json({ error: inventoryErr.message });
                        }

                        if (inventoryRow) {
                            db.run(
                                `
                                    UPDATE inventory
                                    SET quantity_on_hand = quantity_on_hand + ?,
                                        last_updated = date('now')
                                    WHERE size_id = ?
                                `,
                                [quantity_produced, size_id],
                                function (updateErr) {
                                    if (updateErr) {
                                        db.run("ROLLBACK");
                                        return res.status(500).json({ error: updateErr.message });
                                    }

                                    db.run("COMMIT");
                                    return res.json({
                                        message: "Batch created and inventory updated successfully.",
                                        batch_id: batchId
                                    });
                                }
                            );
                        } else {
                            db.run(
                                `
                                    INSERT INTO inventory (size_id, quantity_on_hand, last_updated)
                                    VALUES (?, ?, date('now'))
                                `,
                                [size_id, quantity_produced],
                                function (insertErr) {
                                    if (insertErr) {
                                        db.run("ROLLBACK");
                                        return res.status(500).json({ error: insertErr.message });
                                    }

                                    db.run("COMMIT");
                                    return res.json({
                                        message: "Batch created and inventory record added successfully.",
                                        batch_id: batchId
                                    });
                                }
                            );
                        }
                    }
                );
            }
        );
    });
});

// MARKETS
app.get("/api/markets", authenticateToken, (req, res) => {
    db.all(
        `
            SELECT id, name, city, market_type, day_of_week
            FROM markets
            ORDER BY name
        `,
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
});

// STAFF
app.get("/api/staff", authenticateToken, (req, res) => {
    db.all(
        `
            SELECT
                id,
                first_name || ' ' || last_name AS name,
                employment_type,
                phone_number,
                hire_date
            FROM staff
            ORDER BY first_name, last_name
        `,
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
});

// ADD STAFF
app.post("/api/staff", authenticateToken, (req, res) => {
    const { first_name, last_name, phone_number, employment_type, hire_date } = req.body;

    if (!first_name || !last_name || !employment_type) {
        return res.status(400).json({ error: "Missing required staff fields." });
    }

    db.run(
        `
            INSERT INTO staff (first_name, last_name, phone_number, employment_type, hire_date)
            VALUES (?, ?, ?, ?, ?)
        `,
        [first_name, last_name, phone_number || "", employment_type, hire_date || null],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({
                message: "Staff member created successfully.",
                id: this.lastID
            });
        }
    );
});

// STAFF ASSIGNMENTS
app.get("/api/staff-assignments", authenticateToken, (req, res) => {
    db.all(
        `
            SELECT
                sa.id,
                sa.work_date AS "Work Date",
                m.name AS Market,
                s.first_name || ' ' || s.last_name AS Staff,
                s.employment_type AS "Employment Type"
            FROM staff_assignments sa
                     JOIN markets m ON sa.market_id = m.id
                     JOIN staff s ON sa.staff_id = s.id
            ORDER BY sa.work_date DESC
        `,
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
});

// CREATE STAFF ASSIGNMENT
app.post("/api/staff-assignments", authenticateToken, (req, res) => {
    const { market_id, staff_id, work_date } = req.body;

    if (!market_id || !staff_id || !work_date) {
        return res.status(400).json({ error: "market_id, staff_id, and work_date are required." });
    }

    db.run(
        `
            INSERT INTO staff_assignments (market_id, staff_id, work_date)
            VALUES (?, ?, ?)
        `,
        [market_id, staff_id, work_date],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({
                message: "Staff assignment created",
                id: this.lastID
            });
        }
    );
});

// DELETE STAFF ASSIGNMENT
app.delete("/api/staff-assignments/:id", authenticateToken, (req, res) => {
    const { id } = req.params;

    db.run(
        `
            DELETE FROM staff_assignments
            WHERE id = ?
        `,
        [id],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: "Assignment not found." });
            }

            res.json({ message: "Assignment deleted successfully." });
        }
    );
});

// INGREDIENT-LEVEL RECIPE VIEW FOR A PRODUCT
app.get("/api/recipes/:productId", authenticateToken, (req, res) => {
    const { productId } = req.params;

    db.all(
        `
            SELECT
                ing.name AS Ingredient,
                ri.quantity_required AS Quantity,
                ing.unit_of_measure AS Unit,
                ing.supplier_name AS Supplier,
                CASE
                    WHEN ing.is_local = 1 THEN 'Yes'
                    ELSE 'No'
                    END AS Local
            FROM recipes r
                JOIN recipe_ingredients ri ON r.id = ri.recipe_id
                JOIN ingredients ing ON ri.ingredient_id = ing.id
            WHERE r.product_id = ?
            ORDER BY ing.name
        `,
        [productId],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
});

// GENERATE INGREDIENT LABEL FOR A PRODUCT
app.get("/api/labels/:productId", authenticateToken, (req, res) => {
    const { productId } = req.params;

    db.get(
        `
            SELECT
                p.id,
                p.name,
                p.category,
                p.description,
                n.serving_size,
                n.calories,
                n.fat,
                n.carbohydrates,
                n.protein,
                n.sodium
            FROM products p
                     LEFT JOIN nutrition_info n ON p.id = n.product_id
            WHERE p.id = ?
        `,
        [productId],
        (productErr, productRow) => {
            if (productErr) {
                return res.status(500).json({ error: productErr.message });
            }

            if (!productRow) {
                return res.status(404).json({ error: "Product not found." });
            }

            db.all(
                `
                    SELECT
                        ing.name,
                        ing.unit_of_measure,
                        ing.supplier_name,
                        ing.is_local,
                        ri.quantity_required
                    FROM recipes r
                    JOIN recipe_ingredients ri ON r.id = ri.recipe_id
                    JOIN ingredients ing ON ri.ingredient_id = ing.id
                    WHERE r.product_id = ?
                    ORDER BY ing.name
                `,
                [productId],
                (ingredientsErr, ingredientRows) => {
                    if (ingredientsErr) {
                        return res.status(500).json({ error: ingredientsErr.message });
                    }

                    const ingredientNames = ingredientRows.map((item) => item.name);
                    const localIngredients = ingredientRows
                        .filter((item) => item.is_local === 1)
                        .map((item) => item.name);

                    const labelText = [
                        `${productRow.name}`,
                        `Ingredients: ${ingredientNames.join(", ") || "N/A"}`,
                        localIngredients.length
                            ? `Locally Sourced Ingredients: ${localIngredients.join(", ")}`
                            : `Locally Sourced Ingredients: None listed`,
                        productRow.serving_size
                            ? `Serving Size: ${productRow.serving_size}`
                            : `Serving Size: N/A`,
                        productRow.calories !== null && productRow.calories !== undefined
                            ? `Calories: ${productRow.calories}`
                            : `Calories: N/A`,
                        productRow.fat !== null && productRow.fat !== undefined
                            ? `Fat: ${productRow.fat}g`
                            : `Fat: N/A`,
                        productRow.carbohydrates !== null && productRow.carbohydrates !== undefined
                            ? `Carbohydrates: ${productRow.carbohydrates}g`
                            : `Carbohydrates: N/A`,
                        productRow.protein !== null && productRow.protein !== undefined
                            ? `Protein: ${productRow.protein}g`
                            : `Protein: N/A`,
                        productRow.sodium !== null && productRow.sodium !== undefined
                            ? `Sodium: ${productRow.sodium}mg`
                            : `Sodium: N/A`
                    ].join("\n");

                    res.json({
                        product_id: productRow.id,
                        product_name: productRow.name,
                        ingredients: ingredientRows,
                        ingredient_list: ingredientNames,
                        local_ingredient_list: localIngredients,
                        nutrition: {
                            serving_size: productRow.serving_size,
                            calories: productRow.calories,
                            fat: productRow.fat,
                            carbohydrates: productRow.carbohydrates,
                            protein: productRow.protein,
                            sodium: productRow.sodium
                        },
                        label_text: labelText
                    });
                }
            );
        }
    );
});

// SALES LIST
app.get("/api/sales", authenticateToken, (req, res) => {
    db.all(
        `
            SELECT
                s.id AS SaleID,
                m.name AS Market,
                s.sale_date AS SaleDate,
                s.payment_method AS PaymentMethod,
                p.name AS Product,
                ps.size_name || ps.unit_of_measure AS Size,
                si.quantity_sold AS Quantity,
                '$' || printf('%.2f', si.unit_price) AS UnitPrice,
                '$' || printf('%.2f', si.quantity_sold * si.unit_price) AS LineTotal
            FROM sales s
            JOIN markets m ON s.market_id = m.id
            JOIN sale_items si ON s.id = si.sale_id
            JOIN product_sizes ps ON si.size_id = ps.id
            JOIN products p ON ps.product_id = p.id
            ORDER BY s.id DESC, si.id DESC
        `,
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
});

// CREATE SALE
app.post("/api/sales", authenticateToken, (req, res) => {
    const { market_id, sale_date, payment_method, items } = req.body;

    if (!market_id || !sale_date || !payment_method) {
        return res.status(400).json({
            error: "market_id, sale_date, and payment_method are required."
        });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Sale must include at least one item." });
    }

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        let checked = 0;
        let failed = false;
        let totalAmount = 0;

        items.forEach((item) => {
            db.get(
                `SELECT quantity_on_hand FROM inventory WHERE size_id = ?`,
                [item.size_id],
                (stockErr, stockRow) => {
                    if (failed) return;

                    if (stockErr) {
                        failed = true;
                        db.run("ROLLBACK");
                        return res.status(500).json({ error: stockErr.message });
                    }

                    if (!stockRow) {
                        failed = true;
                        db.run("ROLLBACK");
                        return res.status(400).json({
                            error: `No inventory record found for size ID ${item.size_id}.`
                        });
                    }

                    if (stockRow.quantity_on_hand < item.quantity) {
                        failed = true;
                        db.run("ROLLBACK");
                        return res.status(400).json({
                            error: `Not enough stock for size ID ${item.size_id}. Available: ${stockRow.quantity_on_hand}, requested: ${item.quantity}.`
                        });
                    }

                    totalAmount += item.quantity * item.unit_price;
                    checked += 1;

                    if (checked === items.length) {
                        db.run(
                            `
                                INSERT INTO sales (market_id, sale_date, payment_method, total_amount)
                                VALUES (?, ?, ?, ?)
                            `,
                            [market_id, sale_date, payment_method, totalAmount],
                            function (err) {
                                if (err) {
                                    db.run("ROLLBACK");
                                    return res.status(500).json({ error: err.message });
                                }

                                const saleId = this.lastID;
                                let completed = 0;

                                items.forEach((item) => {
                                    db.run(
                                        `
                                            INSERT INTO sale_items (sale_id, size_id, quantity_sold, unit_price)
                                            VALUES (?, ?, ?, ?)
                                        `,
                                        [saleId, item.size_id, item.quantity, item.unit_price],
                                        function (itemErr) {
                                            if (failed) return;

                                            if (itemErr) {
                                                failed = true;
                                                db.run("ROLLBACK");
                                                return res.status(500).json({ error: itemErr.message });
                                            }

                                            db.run(
                                                `
                                                    UPDATE inventory
                                                    SET quantity_on_hand = quantity_on_hand - ?,
                                                        last_updated = date('now')
                                                    WHERE size_id = ?
                                                `,
                                                [item.quantity, item.size_id],
                                                function (inventoryErr) {
                                                    if (failed) return;

                                                    if (inventoryErr) {
                                                        failed = true;
                                                        db.run("ROLLBACK");
                                                        return res.status(500).json({ error: inventoryErr.message });
                                                    }

                                                    completed += 1;

                                                    if (completed === items.length) {
                                                        db.run("COMMIT");
                                                        return res.json({
                                                            message: "Sale submitted successfully.",
                                                            sale_id: saleId,
                                                            total_amount: totalAmount
                                                        });
                                                    }
                                                }
                                            );
                                        }
                                    );
                                });
                            }
                        );
                    }
                }
            );
        });
    });
});

// DASHBOARD
app.get("/api/dashboard", authenticateToken, (req, res) => {
    const dashboard = {};

    db.all(
        `
            SELECT
                p.name AS Product,
                ps.size_name || ps.unit_of_measure AS Size,
                i.quantity_on_hand AS Stock
            FROM inventory i
                JOIN product_sizes ps ON i.size_id = ps.id
                JOIN products p ON ps.product_id = p.id
            WHERE i.quantity_on_hand <= 5
            ORDER BY i.quantity_on_hand ASC
        `,
        [],
        (err, lowStockRows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            dashboard.lowStock = lowStockRows;

            db.all(
                `
                    SELECT
                        p.name AS Product,
                        b.quantity_produced AS Quantity,
                        b.production_date AS Date
                    FROM batches b
                        JOIN product_sizes ps ON b.size_id = ps.id
                        JOIN products p ON ps.product_id = p.id
                    ORDER BY b.production_date DESC
                        LIMIT 5
                `,
                [],
                (err2, batchRows) => {
                    if (err2) {
                        return res.status(500).json({ error: err2.message });
                    }

                    dashboard.recentBatches = batchRows;

                    db.get(
                        `
                            SELECT COALESCE(SUM(total_amount), 0) AS todaysSales
                            FROM sales
                            WHERE sale_date = date('now')
                        `,
                        [],
                        (err3, salesRow) => {
                            if (err3) {
                                return res.status(500).json({ error: err3.message });
                            }

                            db.get(
                                `
                                    SELECT COUNT(*) AS upcomingBatches
                                    FROM batches
                                    WHERE production_date >= date('now')
                                `,
                                [],
                                (err4, batchCountRow) => {
                                    if (err4) {
                                        return res.status(500).json({ error: err4.message });
                                    }

                                    dashboard.stats = {
                                        todaysSales: `$${Number(salesRow.todaysSales).toFixed(2)}`,
                                        lowStockAlerts: `${lowStockRows.length} Items`,
                                        upcomingBatches: `${batchCountRow.upcomingBatches}`
                                    };

                                    res.json(dashboard);
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});

// REPORT SUMMARY
app.get("/api/reports", authenticateToken, (req, res) => {
    const { from, to } = req.query;

    const hasDateFilter = from && to;
    const salesFilter = hasDateFilter ? "WHERE s.sale_date BETWEEN ? AND ?" : "";
    const salesParams = hasDateFilter ? [from, to] : [];

    const reports = {};

    db.get(
        `
            SELECT p.name AS topSellingProduct
            FROM sale_items si
                     JOIN sales s ON si.sale_id = s.id
                     JOIN product_sizes ps ON si.size_id = ps.id
                     JOIN products p ON ps.product_id = p.id
                ${salesFilter}
            GROUP BY p.id, p.name
            ORDER BY SUM(si.quantity_sold) DESC
                LIMIT 1
        `,
        salesParams,
        (err, topProductRow) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            reports.topSellingProduct = topProductRow
                ? topProductRow.topSellingProduct
                : "N/A";

            db.get(
                `
                    SELECT m.name AS bestMarket
                    FROM sales s
                    JOIN markets m ON s.market_id = m.id
                    ${salesFilter}
                    GROUP BY m.id, m.name
                    ORDER BY SUM(s.total_amount) DESC
                    LIMIT 1
                `,
                salesParams,
                (err2, bestMarketRow) => {
                    if (err2) {
                        return res.status(500).json({ error: err2.message });
                    }

                    reports.bestMarket = bestMarketRow
                        ? bestMarketRow.bestMarket
                        : "N/A";

                    db.get(
                        `
                            SELECT COUNT(*) AS lowStockItems
                            FROM inventory
                            WHERE quantity_on_hand <= 5
                        `,
                        [],
                        (err3, lowStockRow) => {
                            if (err3) {
                                return res.status(500).json({ error: err3.message });
                            }

                            reports.lowStockItems = lowStockRow.lowStockItems;

                            db.get(
                                `
                                    SELECT COALESCE(SUM(total_amount), 0) AS totalRevenue
                                    FROM sales s
                                    ${hasDateFilter ? "WHERE s.sale_date BETWEEN ? AND ?" : ""}
                                `,
                                salesParams,
                                (err4, totalRevenueRow) => {
                                    if (err4) {
                                        return res.status(500).json({ error: err4.message });
                                    }

                                    reports.totalRevenue = Number(
                                        totalRevenueRow.totalRevenue
                                    ).toFixed(2);

                                    if (hasDateFilter) {
                                        reports.todayRevenue = Number(
                                            totalRevenueRow.totalRevenue
                                        ).toFixed(2);
                                        return res.json(reports);
                                    }

                                    db.get(
                                        `
                                            SELECT COALESCE(SUM(total_amount), 0) AS todayRevenue
                                            FROM sales
                                            WHERE sale_date = date('now')
                                        `,
                                        [],
                                        (err5, todayRevenueRow) => {
                                            if (err5) {
                                                return res.status(500).json({ error: err5.message });
                                            }

                                            reports.todayRevenue = Number(
                                                todayRevenueRow.todayRevenue
                                            ).toFixed(2);

                                            res.json(reports);
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});

// REPORT: TOP SELLING PRODUCTS
app.get("/api/reports/top-products", authenticateToken, (req, res) => {
    const { from, to } = req.query;

    const hasDateFilter = from && to;
    const salesFilter = hasDateFilter ? "WHERE s.sale_date BETWEEN ? AND ?" : "";
    const params = hasDateFilter ? [from, to] : [];

    db.all(
        `
            SELECT
                p.name AS Product,
                SUM(si.quantity_sold) AS TotalSold
            FROM sale_items si
                     JOIN sales s ON si.sale_id = s.id
                     JOIN product_sizes ps ON si.size_id = ps.id
                     JOIN products p ON ps.product_id = p.id
                ${salesFilter}
            GROUP BY p.id, p.name
            ORDER BY TotalSold DESC
                LIMIT 5
        `,
        params,
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
});

// REPORT: SALES BY MARKET
app.get("/api/reports/market-sales", authenticateToken, (req, res) => {
    const { from, to } = req.query;

    const hasDateFilter = from && to;
    const salesFilter = hasDateFilter ? "WHERE s.sale_date BETWEEN ? AND ?" : "";
    const params = hasDateFilter ? [from, to] : [];

    db.all(
        `
            SELECT
                m.name AS Market,
                '$' || printf('%.2f', SUM(s.total_amount)) AS Revenue
            FROM sales s
                     JOIN markets m ON s.market_id = m.id
                ${salesFilter}
            GROUP BY m.id, m.name
            ORDER BY SUM(s.total_amount) DESC
        `,
        params,
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
});

// REPORT: LOW STOCK DETAILS
app.get("/api/reports/low-stock", authenticateToken, (req, res) => {
    db.all(
        `
            SELECT
                p.name AS Product,
                ps.size_name || ps.unit_of_measure AS Size,
                i.quantity_on_hand AS Stock
            FROM inventory i
                JOIN product_sizes ps ON i.size_id = ps.id
                JOIN products p ON ps.product_id = p.id
            WHERE i.quantity_on_hand <= 5
            ORDER BY i.quantity_on_hand ASC, p.name
        `,
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
});

// DELETE PRODUCT SIZE / PRODUCT
app.delete("/api/products/:id", authenticateToken, (req, res) => {
    const { id } = req.params;

    db.get(
        `
            SELECT id, product_id
            FROM product_sizes
            WHERE id = ?
        `,
        [id],
        (findErr, sizeRow) => {
            if (findErr) {
                return res.status(500).json({ error: findErr.message });
            }

            if (!sizeRow) {
                return res.status(404).json({ error: "Product size not found." });
            }

            db.get(
                `
                    SELECT
                        (SELECT COUNT(*) FROM inventory WHERE size_id = ?) AS inventoryCount,
                        (SELECT COUNT(*) FROM batches WHERE size_id = ?) AS batchCount,
                        (SELECT COUNT(*) FROM sale_items WHERE size_id = ?) AS saleCount
                `,
                [id, id, id],
                (usageErr, usageRow) => {
                    if (usageErr) {
                        return res.status(500).json({ error: usageErr.message });
                    }

                    const isUsed =
                        usageRow.inventoryCount > 0 ||
                        usageRow.batchCount > 0 ||
                        usageRow.saleCount > 0;

                    if (isUsed) {
                        return res.status(400).json({
                            error: "This product size cannot be deleted because it is already used in inventory, batches, or sales."
                        });
                    }

                    db.run(
                        `
                            DELETE FROM product_sizes
                            WHERE id = ?
                        `,
                        [id],
                        function (deleteErr) {
                            if (deleteErr) {
                                return res.status(500).json({ error: deleteErr.message });
                            }

                            db.get(
                                `
                                    SELECT COUNT(*) AS remainingSizes
                                    FROM product_sizes
                                    WHERE product_id = ?
                                `,
                                [sizeRow.product_id],
                                (countErr, countRow) => {
                                    if (countErr) {
                                        return res.status(500).json({ error: countErr.message });
                                    }

                                    if (countRow.remainingSizes === 0) {
                                        db.run(
                                            `
                                                DELETE FROM products
                                                WHERE id = ?
                                            `,
                                            [sizeRow.product_id],
                                            function (productDeleteErr) {
                                                if (productDeleteErr) {
                                                    return res.status(500).json({ error: productDeleteErr.message });
                                                }

                                                return res.json({
                                                    message: "Product size deleted. Parent product was also removed because it had no remaining sizes."
                                                });
                                            }
                                        );
                                    } else {
                                        return res.json({
                                            message: "Product size deleted successfully."
                                        });
                                    }
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});