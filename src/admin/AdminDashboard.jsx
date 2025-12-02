import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import "../Dashboard.css";

export default function AdminDashboard() {
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Admin Dashboard</h1>
          <div className="dashboard-nav">
            <Link to="/admin/projects" className="nav-link">Projects</Link>
            <Link to="/admin/tasks" className="nav-link">Tasks</Link>
            <Link to="/admin/interns" className="nav-link">Interns</Link>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>

        <div className="dashboard-card">
          <h2 className="card-title">Welcome, Admin!</h2>
          <p style={{ color: "#6b7280", marginBottom: "2rem" }}>
            Manage your projects and assign tasks to interns from here.
          </p>

          <div className="items-grid">
            <Link to="/admin/projects" style={{ textDecoration: "none" }}>
              <div className="item-card">
                <div className="item-title">📁 Projects</div>
                <div className="item-description">
                  View and manage all projects in the system
                </div>
              </div>
            </Link>

            <Link to="/admin/tasks" style={{ textDecoration: "none" }}>
              <div className="item-card">
                <div className="item-title">✅ Tasks</div>
                <div className="item-description">
                  View all tasks and assign them to interns
                </div>
              </div>
            </Link>

            <Link to="/admin/interns" style={{ textDecoration: "none" }}>
              <div className="item-card">
                <div className="item-title">👨‍🎓 Interns</div>
                <div className="item-description">
                  Manage interns, their tasks, and add comments
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
  