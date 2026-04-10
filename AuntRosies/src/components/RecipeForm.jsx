import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Table from "./Table";
import { API_URL } from "../config";

function RecipeForm() {
    const navigate = useNavigate();

    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState("");
    const [recipeItems, setRecipeItems] = useState([]);
    const [labelData, setLabelData] = useState(null);
    const [labelError, setLabelError] = useState("");

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

    useEffect(() => {
        const loadProducts = async () => {
            try {
                const res = await authFetch("/api/products");
                if (!res) return;

                const data = await res.json();

                const uniqueProducts = [];
                const seen = new Set();

                data.forEach((item) => {
                    if (!seen.has(item.product_id)) {
                        seen.add(item.product_id);
                        uniqueProducts.push({
                            id: item.product_id,
                            name: item.Product
                        });
                    }
                });

                setProducts(uniqueProducts);

                if (uniqueProducts.length > 0) {
                    setSelectedProduct(String(uniqueProducts[0].id));
                }
            } catch (err) {
                console.error("Error loading products:", err);
            }
        };

        loadProducts();
    }, [navigate]);

    useEffect(() => {
        if (!selectedProduct) return;

        const loadRecipe = async () => {
            try {
                const res = await authFetch(`/api/recipes/${selectedProduct}`);
                if (!res) return;

                const data = await res.json();
                setRecipeItems(data);
                setLabelData(null);
                setLabelError("");
            } catch (err) {
                console.error("Error loading recipe:", err);
            }
        };

        loadRecipe();
    }, [selectedProduct, navigate]);

    const handleGenerateLabel = async () => {
        if (!selectedProduct) return;

        try {
            setLabelError("");

            const res = await authFetch(`/api/labels/${selectedProduct}`);
            if (!res) return;

            const data = await res.json();

            if (!res.ok) {
                setLabelData(null);
                setLabelError(data.error || "Failed to generate label.");
                return;
            }

            setLabelData(data);
        } catch (err) {
            console.error("Error generating label:", err);
            setLabelData(null);
            setLabelError("Failed to generate label.");
        }
    };

    const handlePrintLabel = () => {
        window.print();
    };

    return (
        <div className="page-shell">
            <div className="page-header no-print">
                <div>
                    <h1>Recipes</h1>
                    <p className="page-subtitle">
                        View ingredient breakdowns for each Aunt Rosie product.
                    </p>
                </div>
            </div>

            <section className="panel no-print">
                <div className="form-card">
                    <div className="form-grid">
                        <label>
                            Select Product
                            <select
                                value={selectedProduct}
                                onChange={(e) => setSelectedProduct(e.target.value)}
                            >
                                {products.map((product) => (
                                    <option key={product.id} value={product.id}>
                                        {product.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="form-footer">
                        <span className="form-message">
                            Generate a printable ingredient and nutrition label preview.
                        </span>
                        <div className="inline-actions">
                            <button
                                type="button"
                                className="secondary-btn"
                                onClick={handleGenerateLabel}
                            >
                                Generate Ingredient Label
                            </button>
                        </div>
                    </div>
                </div>

                <div className="sub-section">
                    <h3 className="section-title">Recipe Ingredients</h3>
                    <p className="section-subtitle">
                        Ingredient list for the selected product
                    </p>

                    <Table
                        columns={["Ingredient", "Quantity", "Unit", "Supplier", "Local"]}
                        data={recipeItems}
                    />
                </div>

                {labelError && (
                    <div className="sub-section">
                        <p className="form-message">{labelError}</p>
                    </div>
                )}
            </section>

            {labelData && (
                <div className="sub-section print-label-only">
                    <div className="label-preview">
                        <div className="label-sticker">
                            <div className="label-sticker-header">
                                <p className="label-sticker-brand">Aunt Rosie’s Homemade</p>
                                <h4>{labelData.product_name}</h4>
                                <p className="label-sticker-subtitle">Pies & Preserves</p>
                            </div>

                            <div className="label-sticker-section">
                                <p className="label-line">
                                    <span className="label-key">Ingredients:</span>{" "}
                                    {labelData.ingredient_list.length > 0
                                        ? labelData.ingredient_list.join(", ")
                                        : "N/A"}
                                </p>

                                <p className="label-line">
                                    <span className="label-key">Locally Sourced:</span>{" "}
                                    {labelData.local_ingredient_list.length > 0
                                        ? labelData.local_ingredient_list.join(", ")
                                        : "None listed"}
                                </p>
                            </div>

                            <div className="label-sticker-section nutrition-sticker">
                                <p className="nutrition-title">Nutrition Information</p>

                                <div className="nutrition-grid">
                                    <p><span className="label-key">Serving Size:</span> {labelData.nutrition?.serving_size || "N/A"}</p>
                                    <p><span className="label-key">Calories:</span> {labelData.nutrition?.calories ?? "N/A"}</p>
                                    <p><span className="label-key">Fat:</span> {labelData.nutrition?.fat ?? "N/A"}g</p>
                                    <p><span className="label-key">Carbohydrates:</span> {labelData.nutrition?.carbohydrates ?? "N/A"}g</p>
                                    <p><span className="label-key">Protein:</span> {labelData.nutrition?.protein ?? "N/A"}g</p>
                                    <p><span className="label-key">Sodium:</span> {labelData.nutrition?.sodium ?? "N/A"}mg</p>
                                </div>
                            </div>

                            <div className="label-sticker-footer">
                                <p>Prepared by Aunt Rosie’s Homemade Pies & Preserves</p>
                            </div>
                        </div>

                        <div className="inline-actions label-actions no-print">
                            <button
                                type="button"
                                className="primary-btn"
                                onClick={handlePrintLabel}
                            >
                                Print Label
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RecipeForm;