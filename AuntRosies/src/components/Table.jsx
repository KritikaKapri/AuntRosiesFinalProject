function Table({ columns = [], data = [] }) {
    if (!data || data.length === 0) {
        return <div className="empty-state">No records available.</div>;
    }

    return (
        <div className="table-wrapper">
            <table className="custom-table">
                <thead>
                <tr>
                    {columns.map((column) => (
                        <th key={column}>{column}</th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {data.map((row, index) => (
                    <tr key={index}>
                        {columns.map((column) => (
                            <td key={column}>{row[column] ?? "-"}</td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

export default Table;