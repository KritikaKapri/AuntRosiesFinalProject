import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import Table from "../components/Table";

function InventoryPage() {
    const navigate = useNavigate();

    const [inventory, setInventory] = useState([]);
    const [products, setProducts] = useState([]);
    const [message, setMessage] = useState("");

    const [form, setForm] = useState({
        size_id: "",
        adjustment_type: "Add",
        quantity: "",
        reason: ""
    });

    const authFetch = async (url, options = {}) => {
        const token = localStorage.getItem("token");

        const res = await fetch(`${API_URL}${url}`, {
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

    const loadInventory = async () => {
        const res = await authFetch("/api/inventory");
        if (!res) return;

        const data = await res.json();
        setInventory(data);
    };

    const loadProducts = async () => {
        const res = await authFetch("/api/products");
        if (!res) return;

        const data = await res.json();
        setProducts(data);
    };

    useEffect(() => {
        loadInventory();
        loadProducts();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");

        try {
            const res = await authFetch("/api/inventory/adjust", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    size_id: Number(form.size_id),
                    quantity: Number(form.quantity)
                })
            });

            if (!res) return;

            const data = await res.json();

            if (!res.ok) {
                setMessage(data.error || "Could not adjust inventory.");
                return;
            }

            setMessage(data.message || "Inventory adjusted successfully.");
            setForm({
                size_id: "",
                adjustment_type: "Add",
                quantity: "",
                reason: ""
            });
            loadInventory();
        } catch (error) {
            setMessage("Server error while adjusting inventory.");
        }
    };

    return (
        <div className="page-shell">
            <div className="page-header">
                <div>
                    <h1>Inventory</h1>
                    <p className="page-subtitle">
                        Monitor stock levels and make manual inventory adjustments when needed.
                    </p>
                </div>
            </div>

            <div className="stack-gap">
                <section className="panel">
                    <h3 className="section-title">Adjust Inventory</h3>
                    <p className="section-subtitle">
                        Use this form for stock corrections, spoilage, damaged goods, or extra stock received.
                    </p>

                    <form onSubmit={handleSubmit} className="form-card">
                        <div className="form-grid two-col">
                            <label>
                                Product Size
                                <select
                                    value={form.size_id}
                                    onChange={(e) =>
                                        setForm({ ...form, size_id: e.target.value })
                                    }
                                    required
                                >
                                    <option value="">Select a product size</option>
                                    {products.map((product) => (
                                        <option key={product.id} value={product.id}>
                                            {product.Product} - {product.Size}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                Adjustment Type
                                <select
                                    value={form.adjustment_type}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            adjustment_type: e.target.value
                                        })
                                    }
                                >
                                    <option value="Add">Add</option>
                                    <option value="Remove">Remove</option>
                                </select>
                            </label>

                            <label>
                                Quantity
                                <input
                                    type="number"
                                    min="1"
                                    value={form.quantity}
                                    onChange={(e) =>
                                        setForm({ ...form, quantity: e.target.value })
                                    }
                                    required
                                />
                            </label>

                            <label>
                                Reason
                                <select
                                    value={form.reason}
                                    onChange={(e) =>
                                        setForm({ ...form, reason: e.target.value })
                                    }
                                >
                                    <option value="">Select a reason</option>
                                    <option value="Manual stock correction">Manual stock correction</option>
                                    <option value="Damaged goods">Damaged goods</option>
                                    <option value="Spoilage">Spoilage</option>
                                    <option value="Extra stock received">Extra stock received</option>
                                </select>
                            </label>
                        </div>

                        <div className="form-footer">
                            <span className="form-message">{message}</span>
                            <button type="submit" className="primary-btn">
                                Save Adjustment
                            </button>
                        </div>
                    </form>
                </section>

                <section className="panel">
                    <h3 className="section-title">Current Inventory</h3>
                    <p className="section-subtitle">Low stock items should be prioritized</p>

                    <Table
                        columns={["Product", "Size", "Stock", "Status"]}
                        data={inventory}
                    />
                </section>
            </div>
        </div>
    );
}

export default InventoryPage;