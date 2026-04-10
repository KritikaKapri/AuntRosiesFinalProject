import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "./Card";
import Table from "./Table";

function Dashboard() {
    const navigate = useNavigate();

    const [lowStock, setLowStock] = useState([]);
    const [recentBatches, setRecentBatches] = useState([]);
    const [stats, setStats] = useState({
        todaysSales: "$0.00",
        lowStockAlerts: "0 Items",
        upcomingBatches: "0"
    });

    useEffect(() => {
        const token = localStorage.getItem("token");

        fetch("/api/dashboard", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
            .then((res) => {
                if (res.status === 401) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    navigate("/");
                    return null;
                }
                return res.json();
            })
            .then((data) => {
                if (!data) return;

                setLowStock(data.lowStock || []);
                setRecentBatches(data.recentBatches || []);
                setStats(
                    data.stats || {
                        todaysSales: "$0.00",
                        lowStockAlerts: "0 Items",
                        upcomingBatches: "0"
                    }
                );
            })
            .catch((err) => console.error("Error loading dashboard:", err));
    }, [navigate]);

    return (
        <div className="page-shell">
            <div className="page-header">
                <div>
                    <h1>Dashboard</h1>
                    <p className="page-subtitle">
                        Overview of current sales, inventory alerts, and production activity.
                    </p>
                </div>
            </div>

            <section className="panel">
                <div className="stats-grid">
                    <Card
                        title="Today's Sales"
                        value={stats.todaysSales || "$0.00"}
                        subtitle="Revenue recorded today"
                    />
                    <Card
                        title="Low Stock Alerts"
                        value={stats.lowStockAlerts || "0 Items"}
                        subtitle="Items requiring attention"
                    />
                    <Card
                        title="Upcoming Batches"
                        value={stats.upcomingBatches || "0"}
                        subtitle="Scheduled production activity"
                    />
                </div>
            </section>

            <div className="dashboard-grid">
                <section className="panel-box">
                    <h3 className="section-title">Operations Summary</h3>
                    <p className="section-subtitle">
                        Quick overview of the most important activity in the system
                    </p>

                    <div className="dashboard-summary-list">
                        <div className="summary-item">
                            <span className="summary-label">Revenue status</span>
                            <span className="summary-value">
                                {stats.todaysSales || "$0.00"}
                            </span>
                        </div>

                        <div className="summary-item">
                            <span className="summary-label">Stock warnings</span>
                            <span className="summary-value">
                                {stats.lowStockAlerts || "0 Items"}
                            </span>
                        </div>

                        <div className="summary-item">
                            <span className="summary-label">Production queue</span>
                            <span className="summary-value">
                                {stats.upcomingBatches || "0"}
                            </span>
                        </div>

                        <div className="summary-note">
                            This dashboard gives Rosie a quick operational snapshot so she can
                            monitor revenue, identify low stock products, and review recent
                            production activity from one place.
                        </div>
                    </div>
                </section>

                <section className="panel-box">
                    <h3 className="section-title">Low Stock Alerts</h3>
                    <p className="section-subtitle">
                        Products that should be prioritized before the next market
                    </p>
                    <Table columns={["Product", "Size", "Stock"]} data={lowStock} />
                </section>

                <section className="panel-box full-width">
                    <h3 className="section-title">Recent Batches</h3>
                    <p className="section-subtitle">
                        Most recently produced items and quantities
                    </p>
                    <Table columns={["Product", "Quantity", "Date"]} data={recentBatches} />
                </section>
            </div>
        </div>
    );
}

export default Dashboard;