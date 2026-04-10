import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function ProductsPage() {
    const navigate = useNavigate();

    const [products, setProducts] = useState([]);
    const [message, setMessage] = useState("");
    const [form, setForm] = useState({
        name: "",
        category: "Pie",
        description: "",
        size_name: "",
        unit_of_measure: "g",
        is_frozen: false,
        is_warm: false,
        price: ""
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

    const loadProducts = async () => {
        const res = await authFetch("/api/products");
        if (!res) return;

        const data = await res.json();
        setProducts(data);
    };

    useEffect(() => {
        loadProducts();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");

        try {
            const res = await authFetch("/api/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    price: Number(form.price)
                })
            });

            if (!res) return;

            const data = await res.json();

            if (!res.ok) {
                setMessage(data.error || "Could not add product.");
                return;
            }

            setMessage("Product added successfully.");
            setForm({
                name: "",
                category: "Pie",
                description: "",
                size_name: "",
                unit_of_measure: "g",
                is_frozen: false,
                is_warm: false,
                price: ""
            });
            loadProducts();
        } catch (error) {
            setMessage("Server error while adding product.");
        }
    };

    const handleDeleteProduct = async (id, productName, size) => {
        const confirmed = window.confirm(`Delete ${productName} (${size})?`);
        if (!confirmed) return;

        try {
            const res = await authFetch(`/api/products/${id}`, {
                method: "DELETE"
            });

            if (!res) return;

            const data = await res.json();

            if (!res.ok) {
                setMessage(data.error || "Could not delete product.");
                return;
            }

            setMessage(data.message || "Product deleted successfully.");
            loadProducts();
        } catch (error) {
            setMessage("Server error while deleting product.");
        }
    };

    return (
        <div className="page-shell">
            <div className="page-header">
                <div>
                    <h1>Products</h1>
                    <p className="page-subtitle">
                        Manage products, pricing, and available size options.
                    </p>
                </div>
            </div>

            <div className="stack-gap">
                <section className="panel">
                    <h3 className="section-title">Add New Product</h3>
                    <p className="section-subtitle">Create a product and its initial size option</p>

                    <form onSubmit={handleSubmit} className="form-card">
                        <div className="form-grid">
                            <label>
                                Product Name
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                            </label>

                            <div className="form-grid two-col">
                                <label>
                                    Category
                                    <select
                                        value={form.category}
                                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    >
                                        <option value="Pie">Pie</option>
                                        <option value="Preserve">Preserve</option>
                                    </select>
                                </label>

                                <label>
                                    Price
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={form.price}
                                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                                        required
                                    />
                                </label>
                            </div>

                            <label>
                                Description
                                <textarea
                                    value={form.description}
                                    onChange={(e) =>
                                        setForm({ ...form, description: e.target.value })
                                    }
                                />
                            </label>

                            <div className="form-grid three-col">
                                <label>
                                    Size Value
                                    <input
                                        type="text"
                                        value={form.size_name}
                                        onChange={(e) =>
                                            setForm({ ...form, size_name: e.target.value })
                                        }
                                        required
                                    />
                                </label>

                                <label>
                                    Unit
                                    <select
                                        value={form.unit_of_measure}
                                        onChange={(e) =>
                                            setForm({ ...form, unit_of_measure: e.target.value })
                                        }
                                    >
                                        <option value="g">g</option>
                                        <option value="kg">kg</option>
                                        <option value="ml">ml</option>
                                        <option value="L">L</option>
                                    </select>
                                </label>

                                <label>
                                    Product Type
                                    <select
                                        value={
                                            form.is_warm
                                                ? "warm"
                                                : form.is_frozen
                                                    ? "frozen"
                                                    : "regular"
                                        }
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setForm({
                                                ...form,
                                                is_warm: value === "warm",
                                                is_frozen: value === "frozen"
                                            });
                                        }}
                                    >
                                        <option value="regular">Regular</option>
                                        <option value="warm">Warm</option>
                                        <option value="frozen">Frozen</option>
                                    </select>
                                </label>
                            </div>
                        </div>

                        <div className="form-footer">
                            <span className="form-message">{message}</span>
                            <button type="submit" className="primary-btn">
                                Save Product
                            </button>
                        </div>
                    </form>
                </section>

                <section className="panel">
                    <h3 className="section-title">Product Catalogue</h3>
                    <p className="section-subtitle">Current products and available sizes</p>

                    <div className="table-wrapper">
                        <table className="custom-table">
                            <thead>
                            <tr>
                                <th>Product</th>
                                <th>Category</th>
                                <th>Size</th>
                                <th>Type</th>
                                <th>Price</th>
                                <th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {products.map((product) => (
                                <tr key={`${product.id}-${product.Size}`}>
                                    <td>{product.Product}</td>
                                    <td>{product.Category}</td>
                                    <td>{product.Size}</td>
                                    <td>{product.Type}</td>
                                    <td>{product.Price}</td>
                                    <td>
                                        <button
                                            type="button"
                                            className="danger-btn"
                                            onClick={() =>
                                                handleDeleteProduct(
                                                    product.id,
                                                    product.Product,
                                                    product.Size
                                                )
                                            }
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default ProductsPage;