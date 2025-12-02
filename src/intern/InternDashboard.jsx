import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import "../Dashboard.css";

export default function InternDashboard() {
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Intern Dashboard</h1>
          <div className="dashboard-nav">
            <Link to="/intern/tasks" className="nav-link">My Tasks</Link>
            <Link to="/intern/projects" className="nav-link">My Projects</Link>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>

        <div className="dashboard-card">
          <h2 className="card-title">Welcome!</h2>
          <p style={{ color: "#6b7280", marginBottom: "2rem" }}>
            View and complete your assigned tasks here.
          </p>

          <div className="items-grid">
            <Link to="/intern/tasks" style={{ textDecoration: "none" }}>
              <div className="item-card">
                <div className="item-title">📋 My Tasks</div>
                <div className="item-description">
                  View all tasks assigned to you and mark them as completed
                </div>
              </div>
            </Link>

            <Link to="/intern/projects" style={{ textDecoration: "none" }}>
              <div className="item-card">
                <div className="item-title">📁 My Projects</div>
                <div className="item-description">
                  View all projects you have tasks assigned to
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
  