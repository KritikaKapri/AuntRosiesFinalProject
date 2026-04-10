import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import Table from "../components/Table";

function ReportsPage() {
    const navigate = useNavigate();

    const [reports, setReports] = useState({
        topSellingProduct: "Loading...",
        bestMarket: "Loading...",
        lowStockItems: 0,
        totalRevenue: "0.00",
        todayRevenue: "0.00"
    });

    const [topProducts, setTopProducts] = useState([]);
    const [marketSales, setMarketSales] = useState([]);
    const [lowStock, setLowStock] = useState([]);

    const [filters, setFilters] = useState({
        from: "",
        to: ""
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

    const buildQuery = () => {
        if (filters.from && filters.to) {
            return `?from=${filters.from}&to=${filters.to}`;
        }
        return "";
    };

    const loadReports = async () => {
        const query = buildQuery();

        const summaryRes = await authFetch(`/api/reports${query}`);
        if (summaryRes) {
            const data = await summaryRes.json();
            setReports(data);
        }

        const topProductsRes = await authFetch(`/api/reports/top-products${query}`);
        if (topProductsRes) {
            const data = await topProductsRes.json();
            setTopProducts(data);
        }

        const marketSalesRes = await authFetch(`/api/reports/market-sales${query}`);
        if (marketSalesRes) {
            const data = await marketSalesRes.json();
            setMarketSales(data);
        }

        const lowStockRes = await authFetch("/api/reports/low-stock");
        if (lowStockRes) {
            const data = await lowStockRes.json();
            setLowStock(data);
        }
    };

    useEffect(() => {
        loadReports();
    }, []);

    const handleApplyFilter = (e) => {
        e.preventDefault();
        loadReports();
    };

    const handleClearFilter = async () => {
        setFilters({ from: "", to: "" });

        const summaryRes = await authFetch("/api/reports");
        if (summaryRes) {
            const data = await summaryRes.json();
            setReports(data);
        }

        const topProductsRes = await authFetch("/api/reports/top-products");
        if (topProductsRes) {
            const data = await topProductsRes.json();
            setTopProducts(data);
        }

        const marketSalesRes = await authFetch("/api/reports/market-sales");
        if (marketSalesRes) {
            const data = await marketSalesRes.json();
            setMarketSales(data);
        }
    };

    return (
        <div className="page-shell">
            <div className="page-header">
                <div>
                    <h1>Reports</h1>
                    <p className="page-subtitle">
                        Business insights for sales, markets, and inventory performance.
                    </p>
                </div>
            </div>

            <section className="panel">
                <h3 className="section-title">Report Filters</h3>
                <p className="section-subtitle">
                    Filter sales-based reports by date range
                </p>

                <form onSubmit={handleApplyFilter} className="form-card">
                    <div className="form-grid three-col">
                        <label>
                            From Date
                            <input
                                type="date"
                                value={filters.from}
                                onChange={(e) =>
                                    setFilters({ ...filters, from: e.target.value })
                                }
                            />
                        </label>

                        <label>
                            To Date
                            <input
                                type="date"
                                value={filters.to}
                                onChange={(e) =>
                                    setFilters({ ...filters, to: e.target.value })
                                }
                            />
                        </label>

                        <div className="form-footer" style={{ alignItems: "end" }}>
                            <button type="submit" className="primary-btn">
                                Apply Filter
                            </button>
                            <button
                                type="button"
                                className="secondary-btn"
                                onClick={handleClearFilter}
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </form>
            </section>

            <section className="panel">
                <div className="metric-row">
                    <div className="stat-card">
                        <p className="stat-title">Today’s Revenue</p>
                        <h3 className="stat-value">${reports.todayRevenue}</h3>
                    </div>

                    <div className="stat-card">
                        <p className="stat-title">Total Revenue</p>
                        <h3 className="stat-value">${reports.totalRevenue}</h3>
                    </div>

                    <div className="stat-card">
                        <p className="stat-title">Top Selling Product</p>
                        <h3 className="stat-value">{reports.topSellingProduct}</h3>
                    </div>

                    <div className="stat-card">
                        <p className="stat-title">Best Performing Market</p>
                        <h3 className="stat-value">{reports.bestMarket}</h3>
                    </div>

                    <div className="stat-card">
                        <p className="stat-title">Low Stock Items</p>
                        <h3 className="stat-value">{reports.lowStockItems}</h3>
                    </div>
                </div>
            </section>

            <div className="dashboard-grid">
                <section className="panel-box">
                    <h3>Top 5 Selling Products</h3>
                    <p className="section-subtitle">Best selling products by units sold</p>
                    <Table columns={["Product", "TotalSold"]} data={topProducts} />
                </section>

                <section className="panel-box">
                    <h3>Sales by Market</h3>
                    <p className="section-subtitle">Revenue generated by each market</p>
                    <Table columns={["Market", "Revenue"]} data={marketSales} />
                </section>
            </div>

            <section className="panel">
                <h3 className="section-title">Low Stock Details</h3>
                <p className="section-subtitle">Items that need restocking soon</p>
                <Table columns={["Product", "Size", "Stock"]} data={lowStock} />
            </section>
        </div>
    );
}

export default ReportsPage;