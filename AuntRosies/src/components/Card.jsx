function Card({ title, value, subtitle }) {
    return (
        <div className="stat-card">
            <p className="stat-title">{title}</p>
            <h3 className="stat-value">{value}</h3>
            {subtitle && <span className="stat-subtitle">{subtitle}</span>}
        </div>
    );
}

export default Card;