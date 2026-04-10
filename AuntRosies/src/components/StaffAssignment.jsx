import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Table from "./Table";

function StaffAssignment() {
    const navigate = useNavigate();

    const [assignments, setAssignments] = useState([]);
    const [markets, setMarkets] = useState([]);
    const [staff, setStaff] = useState([]);
    const [assignmentMessage, setAssignmentMessage] = useState("");
    const [staffMessage, setStaffMessage] = useState("");

    const [assignmentForm, setAssignmentForm] = useState({
        market_id: "",
        staff_id: "",
        work_date: ""
    });

    const [staffForm, setStaffForm] = useState({
        first_name: "",
        last_name: "",
        phone_number: "",
        employment_type: "Part Time",
        hire_date: ""
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

    const loadData = async () => {
        try {
            const assignmentsRes = await authFetch("/api/staff-assignments");
            if (assignmentsRes) {
                const assignmentsData = await assignmentsRes.json();
                setAssignments(assignmentsData);
            }

            const marketsRes = await authFetch("/api/markets");
            if (marketsRes) {
                const marketsData = await marketsRes.json();
                setMarkets(marketsData);
            }

            const staffRes = await authFetch("/api/staff");
            if (staffRes) {
                const staffData = await staffRes.json();
                setStaff(staffData);
            }
        } catch (err) {
            console.error("Error loading staff/market data:", err);
        }
    };

    useEffect(() => {
        loadData();
    }, [navigate]);

    const handleAssignmentSubmit = async (e) => {
        e.preventDefault();
        setAssignmentMessage("");

        try {
            const res = await authFetch("/api/staff-assignments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(assignmentForm)
            });

            if (!res) return;

            const data = await res.json();

            if (!res.ok) {
                setAssignmentMessage(data.error || "Could not create assignment.");
                return;
            }

            setAssignmentMessage("Assignment created successfully.");
            setAssignmentForm({
                market_id: "",
                staff_id: "",
                work_date: ""
            });
            loadData();
        } catch (error) {
            setAssignmentMessage("Server error while saving assignment.");
        }
    };

    const handleStaffSubmit = async (e) => {
        e.preventDefault();
        setStaffMessage("");

        try {
            const res = await authFetch("/api/staff", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(staffForm)
            });

            if (!res) return;

            const data = await res.json();

            if (!res.ok) {
                setStaffMessage(data.error || "Could not add staff.");
                return;
            }

            setStaffMessage("Staff member added successfully.");
            setStaffForm({
                first_name: "",
                last_name: "",
                phone_number: "",
                employment_type: "Part Time",
                hire_date: ""
            });
            loadData();
        } catch (error) {
            setStaffMessage("Server error while adding staff.");
        }
    };

    const handleDeleteAssignment = async (id) => {
        const confirmed = window.confirm("Delete this staff assignment?");
        if (!confirmed) return;

        try {
            const res = await authFetch(`/api/staff-assignments/${id}`, {
                method: "DELETE"
            });

            if (!res) return;

            const data = await res.json();

            if (!res.ok) {
                setAssignmentMessage(data.error || "Could not delete assignment.");
                return;
            }

            setAssignmentMessage("Assignment deleted successfully.");
            loadData();
        } catch (error) {
            setAssignmentMessage("Server error while deleting assignment.");
        }
    };

    return (
        <div className="page-shell">
            <div className="page-header">
                <div>
                    <h1>Markets & Staff</h1>
                    <p className="page-subtitle">
                        Manage staff records and assign team members to market dates.
                    </p>
                </div>
            </div>

            <div className="stack-gap">
                <div className="page-grid">
                    <section className="panel">
                        <h3 className="section-title">Create Staff Assignment</h3>
                        <p className="section-subtitle">Assign a staff member to a market</p>

                        <form onSubmit={handleAssignmentSubmit} className="form-card">
                            <div className="form-grid">
                                <label>
                                    Market
                                    <select
                                        value={assignmentForm.market_id}
                                        onChange={(e) =>
                                            setAssignmentForm({
                                                ...assignmentForm,
                                                market_id: e.target.value
                                            })
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
                                    Staff Member
                                    <select
                                        value={assignmentForm.staff_id}
                                        onChange={(e) =>
                                            setAssignmentForm({
                                                ...assignmentForm,
                                                staff_id: e.target.value
                                            })
                                        }
                                        required
                                    >
                                        <option value="">Select staff</option>
                                        {staff.map((member) => (
                                            <option key={member.id} value={member.id}>
                                                {member.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label>
                                    Work Date
                                    <input
                                        type="date"
                                        value={assignmentForm.work_date}
                                        onChange={(e) =>
                                            setAssignmentForm({
                                                ...assignmentForm,
                                                work_date: e.target.value
                                            })
                                        }
                                        required
                                    />
                                </label>
                            </div>

                            <div className="form-footer">
                                <span className="form-message">{assignmentMessage}</span>
                                <button type="submit" className="primary-btn">
                                    Save Assignment
                                </button>
                            </div>
                        </form>
                    </section>

                    <section className="panel">
                        <h3 className="section-title">Add New Staff Member</h3>
                        <p className="section-subtitle">Create a staff profile for assignments</p>

                        <form onSubmit={handleStaffSubmit} className="form-card">
                            <div className="form-grid two-col">
                                <label>
                                    First Name
                                    <input
                                        type="text"
                                        value={staffForm.first_name}
                                        onChange={(e) =>
                                            setStaffForm({
                                                ...staffForm,
                                                first_name: e.target.value
                                            })
                                        }
                                        required
                                    />
                                </label>

                                <label>
                                    Last Name
                                    <input
                                        type="text"
                                        value={staffForm.last_name}
                                        onChange={(e) =>
                                            setStaffForm({
                                                ...staffForm,
                                                last_name: e.target.value
                                            })
                                        }
                                        required
                                    />
                                </label>

                                <label>
                                    Phone Number
                                    <input
                                        type="text"
                                        value={staffForm.phone_number}
                                        onChange={(e) =>
                                            setStaffForm({
                                                ...staffForm,
                                                phone_number: e.target.value
                                            })
                                        }
                                    />
                                </label>

                                <label>
                                    Employment Type
                                    <select
                                        value={staffForm.employment_type}
                                        onChange={(e) =>
                                            setStaffForm({
                                                ...staffForm,
                                                employment_type: e.target.value
                                            })
                                        }
                                    >
                                        <option value="Part Time">Part Time</option>
                                        <option value="Full Time">Full Time</option>
                                    </select>
                                </label>

                                <label>
                                    Hire Date
                                    <input
                                        type="date"
                                        value={staffForm.hire_date}
                                        onChange={(e) =>
                                            setStaffForm({
                                                ...staffForm,
                                                hire_date: e.target.value
                                            })
                                        }
                                    />
                                </label>
                            </div>

                            <div className="form-footer">
                                <span className="form-message">{staffMessage}</span>
                                <button type="submit" className="primary-btn">
                                    Add Staff Member
                                </button>
                            </div>
                        </form>
                    </section>
                </div>

                <section className="panel">
                    <h3 className="section-title">Staff Directory</h3>
                    <p className="section-subtitle">Available staff members</p>

                    <Table
                        columns={["name", "employment_type", "phone_number", "hire_date"]}
                        data={staff}
                    />
                </section>

                <section className="panel">
                    <h3 className="section-title">Assignment Schedule</h3>
                    <p className="section-subtitle">Current market staff assignments</p>

                    <div className="table-wrapper">
                        <table className="custom-table">
                            <thead>
                            <tr>
                                <th>Work Date</th>
                                <th>Market</th>
                                <th>Staff</th>
                                <th>Employment Type</th>
                                <th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {assignments.map((assignment) => (
                                <tr key={assignment.id}>
                                    <td>{assignment["Work Date"]}</td>
                                    <td>{assignment.Market}</td>
                                    <td>{assignment.Staff}</td>
                                    <td>{assignment["Employment Type"]}</td>
                                    <td>
                                        <button
                                            type="button"
                                            className="danger-btn"
                                            onClick={() =>
                                                handleDeleteAssignment(assignment.id)
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

export default StaffAssignment;