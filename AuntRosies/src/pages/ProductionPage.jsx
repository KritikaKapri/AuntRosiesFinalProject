import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Table from "../components/Table";

function ProductionPage() {
    const navigate = useNavigate();

    const [batches, setBatches] = useState([]);
    const [products, setProducts] = useState([]);
    const [message, setMessage] = useState("");

    const [form, setForm] = useState({
        batch_code: "",
        size_id: "",
        quantity_produced: "",
        production_date: "",
        expiry_date: ""
    });

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

    const loadBatches = async () => {
        const res = await authFetch("/api/batches");
        if (!res) return;

        const data = await res.json();
        setBatches(data);
    };

    const loadProducts = async () => {
        const res = await authFetch("/api/products");
        if (!res) return;

        const data = await res.json();
        setProducts(data);
    };

    useEffect(() => {
        loadBatches();
        loadProducts();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");

        try {
            const res = await authFetch("/api/batches", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    size_id: Number(form.size_id),
                    quantity_produced: Number(form.quantity_produced)
                })
            });

            if (!res) return;

            const data = await res.json();

            if (!res.ok) {
                setMessage(data.error || "Could not create batch.");
                return;
            }

            setMessage("Batch created successfully.");
            setForm({
                batch_code: "",
                size_id: "",
                quantity_produced: "",
                production_date: "",
                expiry_date: ""
            });
            loadBatches();
        } catch (error) {
            setMessage("Server error while creating batch.");
        }
    };

    return (
        <div className="page-shell">
            <div className="page-header">
                <div>
                    <h1>Production</h1>
                    <p className="page-subtitle">
                        Create new batches and track production history.
                    </p>
                </div>
            </div>

            <div className="stack-gap">
                <section className="panel">
                    <h3 className="section-title">Create Batch</h3>
                    <p className="section-subtitle">
                        Add a new production batch and automatically update inventory
                    </p>

                    <form onSubmit={handleSubmit} className="form-card">
                        <div className="form-grid two-col">
                            <label>
                                Batch Code
                                <input
                                    type="text"
                                    value={form.batch_code}
                                    onChange={(e) =>
                                        setForm({ ...form, batch_code: e.target.value })
                                    }
                                    required
                                />
                            </label>

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
                                Quantity Produced
                                <input
                                    type="number"
                                    min="1"
                                    value={form.quantity_produced}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            quantity_produced: e.target.value
                                        })
                                    }
                                    required
                                />
                            </label>

                            <label>
                                Production Date
                                <input
                                    type="date"
                                    value={form.production_date}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            production_date: e.target.value
                                        })
                                    }
                                    required
                                />
                            </label>

                            <label>
                                Expiry Date
                                <input
                                    type="date"
                                    value={form.expiry_date}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            expiry_date: e.target.value
                                        })
                                    }
                                />
                            </label>
                        </div>

                        <div className="form-footer">
                            <span className="form-message">{message}</span>
                            <button type="submit" className="primary-btn">
                                Save Batch
                            </button>
                        </div>
                    </form>
                </section>

                <section className="panel">
                    <h3 className="section-title">Batch History</h3>
                    <p className="section-subtitle">Recent production records</p>

                    <Table
                        columns={["Batch", "Product", "Size", "Quantity", "Date", "ExpiryDate"]}
                        data={batches}
                    />
                </section>
            </div>
        </div>
    );
}

export default ProductionPage;