import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Table from "./Table";

function SalesForm() {
    const navigate = useNavigate();

    const [markets, setMarkets] = useState([]);
    const [products, setProducts] = useState([]);
    const [sales, setSales] = useState([]);
    const [message, setMessage] = useState("");

    const [form, setForm] = useState({
        market_id: "",
        sale_date: "",
        payment_method: "Cash"
    });

    const [currentItem, setCurrentItem] = useState({
        size_id: "",
        quantity: 1
    });

    const [items, setItems] = useState([]);

    const authFetch = async (url, options = {}) => {
        const token = localStorage.getItem("token");

        const res = await fetch(url, {
            ...options,
            headers: {
                ...(options.headers || {}),
                Authorization: `Bearer ${token}`
            }
        });

        if (res.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/");
            return null;
        }

        return res;
    };

    const loadSales = async () => {
        try {
            const res = await authFetch("/api/sales");
            if (!res) return;

            const data = await res.json();
            setSales(data);
        } catch (err) {
            console.error("Error loading sales:", err);
        }
    };

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const marketsRes = await authFetch("/api/markets");
                if (marketsRes) {
                    const marketsData = await marketsRes.json();
                    setMarkets(marketsData);
                }

                const productsRes = await authFetch("/api/products");
                if (productsRes) {
                    const productsData = await productsRes.json();
                    setProducts(productsData);
                }

                await loadSales();
            } catch (err) {
                console.error("Error loading form data:", err);
            }
        };

        loadInitialData();
    }, [navigate]);

    const selectedProduct = useMemo(
        () => products.find((item) => String(item.id) === String(currentItem.size_id)),
        [products, currentItem.size_id]
    );

    const totalAmount = items.reduce(
        (sum, item) => sum + item.quantity * item.unit_price,
        0
    );

    const handleAddItem = () => {
        if (!currentItem.size_id) return;

        const chosen = products.find(
            (item) => String(item.id) === String(currentItem.size_id)
        );

        if (!chosen) return;

        const rawPrice = Number(String(chosen.Price).replace("$", ""));
        const sizeLabel = `${chosen.Product} (${chosen.Size})`;

        setItems([
            ...items,
            {
                size_id: Number(chosen.id),
                productLabel: sizeLabel,
                quantity: Number(currentItem.quantity),
                unit_price: rawPrice
            }
        ]);

        setCurrentItem({
            size_id: "",
            quantity: 1
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");

        if (items.length === 0) {
            setMessage("Please add at least one item.");
            return;
        }

        try {
            const res = await authFetch("/api/sales", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    market_id: Number(form.market_id),
                    sale_date: form.sale_date,
                    payment_method: form.payment_method,
                    items
                })
            });

            if (!res) return;

            const data = await res.json();

            if (!res.ok) {
                setMessage(data.error || "Could not submit sale.");
                return;
            }

            setMessage("Sale submitted successfully.");
            setForm({
                market_id: "",
                sale_date: "",
                payment_method: "Cash"
            });
            setItems([]);
            loadSales();
        } catch (error) {
            setMessage("Server error while submitting sale.");
        }
    };

    return (
        <div className="page-shell">
            <div className="page-header">
                <div>
                    <h1>Sales</h1>
                    <p className="page-subtitle">
                        Record sales transactions and review recent sales history.
                    </p>
                </div>
            </div>

            <div className="stack-gap">
                <section className="panel">
                    <h3 className="section-title">Create Sale</h3>
                    <p className="section-subtitle">Enter sale details and items sold</p>

                    <form onSubmit={handleSubmit} className="form-card">
                        <div className="form-grid two-col">
                            <label>
                                Market
                                <select
                                    value={form.market_id}
                                    onChange={(e) =>
                                        setForm({ ...form, market_id: e.target.value })
                                    }
                                    required
                                >
                                    <option value="">Select a market</option>
                                    {markets.map((market) => (
                                        <option key={market.id} value={market.id}>
                                            {market.name}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                Sale Date
                                <input
                                    type="date"
                                    value={form.sale_date}
                                    onChange={(e) =>
                                        setForm({ ...form, sale_date: e.target.value })
                                    }
                                    required
                                />
                            </label>

                            <label>
                                Payment Method
                                <select
                                    value={form.payment_method}
                                    onChange={(e) =>
                                        setForm({ ...form, payment_method: e.target.value })
                                    }
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="Card">Card</option>
                                    <option value="Debit">Debit</option>
                                </select>
                            </label>
                        </div>

                        <div className="sub-section">
                            <h3 className="section-title">Add Sale Item</h3>

                            <div className="form-grid two-col">
                                <label>
                                    Product Size
                                    <select
                                        value={currentItem.size_id}
                                        onChange={(e) =>
                                            setCurrentItem({
                                                ...currentItem,
                                                size_id: e.target.value
                                            })
                                        }
                                    >
                                        <option value="">Select a product size</option>
                                        {products.map((product) => (
                                            <option key={`${product.id}-${product.Size}`} value={product.id}>
                                                {product.Product} - {product.Size} - {product.Price}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label>
                                    Quantity
                                    <input
                                        type="number"
                                        min="1"
                                        value={currentItem.quantity}
                                        onChange={(e) =>
                                            setCurrentItem({
                                                ...currentItem,
                                                quantity: e.target.value
                                            })
                                        }
                                    />
                                </label>
                            </div>

                            <div className="form-footer">
                                <span className="section-subtitle">
                                    {selectedProduct
                                        ? `Selected: ${selectedProduct.Product} (${selectedProduct.Size})`
                                        : "Choose an item to add"}
                                </span>
                                <button
                                    type="button"
                                    className="secondary-btn"
                                    onClick={handleAddItem}
                                >
                                    Add Item
                                </button>
                            </div>
                        </div>

                        <div className="sub-section">
                            <h3 className="section-title">Items in Sale</h3>

                            {items.length === 0 ? (
                                <div className="empty-state">No items added yet.</div>
                            ) : (
                                <div className="table-wrapper">
                                    <table className="custom-table">
                                        <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Quantity</th>
                                            <th>Unit Price</th>
                                            <th>Line Total</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {items.map((item, index) => (
                                            <tr key={index}>
                                                <td>{item.productLabel}</td>
                                                <td>{item.quantity}</td>
                                                <td>${item.unit_price.toFixed(2)}</td>
                                                <td>
                                                    ${(item.quantity * item.unit_price).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="form-footer">
                            <span className="form-message">{message}</span>
                            <div className="total-box">Total: ${totalAmount.toFixed(2)}</div>
                            <button type="submit" className="primary-btn">
                                Submit Sale
                            </button>
                        </div>
                    </form>
                </section>

                <section className="panel">
                    <h3 className="section-title">Recent Sales</h3>
                    <p className="section-subtitle">Saved sales transactions</p>

                    <Table
                        columns={[
                            "SaleID",
                            "Market",
                            "SaleDate",
                            "PaymentMethod",
                            "Product",
                            "Size",
                            "Quantity",
                            "UnitPrice",
                            "LineTotal"
                        ]}
                        data={sales}
                    />
                </section>
            </div>
        </div>
    );
}

export default SalesForm;