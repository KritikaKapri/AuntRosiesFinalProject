import { useEffect, useState } from "react";
import { API_URL } from "../config";
import Table from "../components/Table";

function CustomersPage() {
    const [customers, setCustomers] = useState([]);

    useEffect(() => {
        fetch(`${API_URL}/api/customers`)
            .then((res) => res.json())
            .then((data) => setCustomers(data))
            .catch((err) => console.error("Error loading customers:", err));
    }, []);

    return (
        <section className="panel">
            <h2 className="panel-title">Customers</h2>
            <Table columns={["Name", "Email", "Market"]} data={customers} />
        </section>
    );
}

export default CustomersPage;