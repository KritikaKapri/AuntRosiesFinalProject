import "./App.css";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import SalesForm from "./components/SalesForm";
import RecipeForm from "./components/RecipeForm";
import StaffAssignment from "./components/StaffAssignment";
import ProductsPage from "./pages/ProductsPage";
import ProductionPage from "./pages/ProductionPage";
import InventoryPage from "./pages/InventoryPage";
import ReportsPage from "./pages/ReportsPage";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";

function ProtectedLayout({ children }) {
    return (
        <div className="app-shell">
            <Sidebar />
            <main className="main-content">{children}</main>
        </div>
    );
}

function App() {
    return (
        <Routes>
            <Route path="/" element={<LoginPage />} />

            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <ProtectedLayout>
                            <Dashboard />
                        </ProtectedLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/products"
                element={
                    <ProtectedRoute>
                        <ProtectedLayout>
                            <ProductsPage />
                        </ProtectedLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/recipes"
                element={
                    <ProtectedRoute>
                        <ProtectedLayout>
                            <RecipeForm />
                        </ProtectedLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/production"
                element={
                    <ProtectedRoute>
                        <ProtectedLayout>
                            <ProductionPage />
                        </ProtectedLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/inventory"
                element={
                    <ProtectedRoute>
                        <ProtectedLayout>
                            <InventoryPage />
                        </ProtectedLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/sales"
                element={
                    <ProtectedRoute>
                        <ProtectedLayout>
                            <SalesForm />
                        </ProtectedLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/markets-staff"
                element={
                    <ProtectedRoute>
                        <ProtectedLayout>
                            <StaffAssignment />
                        </ProtectedLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/reports"
                element={
                    <ProtectedRoute>
                        <ProtectedLayout>
                            <ReportsPage />
                        </ProtectedLayout>
                    </ProtectedRoute>
                }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;