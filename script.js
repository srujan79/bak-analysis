body {
    font-family: Arial, Helvetica, sans-serif;
    background: #f4f6f9;
    margin: 30px 20px;
}

.header {
    margin-bottom: 15px;
}

.header h1 { margin-bottom: 5px; font-size: 1.8rem; }

.metrics {
    display: flex;
    gap: 15px;
    flex-wrap: wrap;
    justify-content: space-between;
}

.card {
    background: white;
    padding: 15px 20px;
    border-radius: 8px;
    flex: 1 1 180px;
    min-width: 140px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    text-align: center;
}

.card h3 { margin-bottom: 8px; font-size: 1.1rem; }

.dashboard {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
    justify-content: space-between;
    margin-top: 25px;
}

.chart-container {
    background: white;
    padding: 15px 20px;
    border-radius: 8px;
    flex: 1 1 48%;
    height: 250px;          /* fixed height */
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    display: flex;
    flex-direction: column;
}

.chart-container h3 { margin: 0 0 8px 0; font-size: 1.1rem; }

canvas { flex-grow: 1; width: 100% !important; height: 100% !important; }

table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
    background: white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    font-size: 0.9rem;
}

thead { background: #2c3e50; color: white; }

th, td { padding: 8px 10px; border-bottom: 1px solid #ddd; text-align: left; }

tr:hover { background: #f1f1f1; }
