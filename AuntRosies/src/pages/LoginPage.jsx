import { useState } from "react";
import { useNavigate } from "react-router-dom";

function LoginPage() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        username: "",
        password: ""
    });

    const [message, setMessage] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");

        try {
            const res = await fetch("/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(form)
            });

            const data = await res.json();

            if (!res.ok) {
                setMessage(data.error || "Login failed.");
                return;
            }

            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            navigate("/dashboard");
        } catch (error) {
            setMessage("Server error while logging in.");
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <h1>Aunt Rosie’s</h1>
                <p className="page-subtitle">
                    Operations Management System
                </p>

                <form onSubmit={handleSubmit} className="form-card">
                    <div className="form-grid">
                        <label>
                            Username
                            <input
                                type="text"
                                value={form.username}
                                onChange={(e) =>
                                    setForm({ ...form, username: e.target.value })
                                }
                                required
                            />
                        </label>

                        <label>
                            Password
                            <input
                                type="password"
                                value={form.password}
                                onChange={(e) =>
                                    setForm({ ...form, password: e.target.value })
                                }
                                required
                            />
                        </label>
                    </div>

                    <div className="form-footer">
                        <span className="form-message">{message}</span>
                        <button type="submit" className="primary-btn">
                            Login
                        </button>
                    </div>
                </form>


            </div>
        </div>
    );
}

export default LoginPage;