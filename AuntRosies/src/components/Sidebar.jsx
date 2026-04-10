import { NavLink, useNavigate } from "react-router-dom";

const menuItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Products", path: "/products" },
    { label: "Recipes", path: "/recipes" },
    { label: "Production", path: "/production" },
    { label: "Inventory", path: "/inventory" },
    { label: "Sales", path: "/sales" },
    { label: "Markets & Staff", path: "/markets-staff" },
    { label: "Reports", path: "/reports" }
];

function Sidebar() {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
    };

    return (
        <aside className="sidebar">
            <div className="logo-box">
                <div className="logo-pill">AR</div>
                <div>
                    <h2>Aunt Rosie’s</h2>
                    <p>Operations Management System</p>
                </div>
            </div>

            <div className="sidebar-group">
                <p className="sidebar-section-title">Navigation</p>

                <nav className="sidebar-nav">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `nav-item ${isActive ? "active" : ""}`
                            }
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
            </div>

            <div className="sidebar-footer">
                <button type="button" className="secondary-btn logout-btn" onClick={handleLogout}>
                    Logout
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;