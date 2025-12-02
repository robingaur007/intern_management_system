import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import "../Dashboard.css";

export default function MyProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    // Get unique projects from tasks assigned to this intern
    const { data: tasksData } = await supabase
      .from("tasks")
      .select("project_id, projects!project_id(id, title, description, status, created_at)")
      .eq("assignee_id", user.id);

    // Extract unique projects
    const uniqueProjects = {};
    (tasksData || []).forEach(task => {
      if (task.projects && !uniqueProjects[task.projects.id]) {
        uniqueProjects[task.projects.id] = task.projects;
      }
    });

    setProjects(Object.values(uniqueProjects));
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  useEffect(() => { load(); }, []);

  function getStatusBadge(status) {
    const statusClass = status === "completed" ? "status-completed" : 
                       status === "in-progress" ? "status-in-progress" : 
                       "status-planned";
    return <span className={`status-badge ${statusClass}`}>{status}</span>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1 className="dashboard-title">My Projects</h1>
          <div className="dashboard-nav">
            <Link to="/intern" className="nav-link">Dashboard</Link>
            <Link to="/intern/tasks" className="nav-link">My Tasks</Link>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h2 className="card-title">Assigned Projects</h2>
            <p style={{ color: "#6b7280", margin: "0.5rem 0 0 0", fontSize: "0.9rem" }}>
              Projects you have tasks assigned to
            </p>
          </div>

          {loading ? (
            <div className="loading">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📁</div>
              <p className="empty-state-text">No projects assigned yet. You'll see projects here once tasks are assigned to you.</p>
            </div>
          ) : (
            <div className="items-grid">
              {projects.map(p => (
                <div key={p.id} className="item-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <h3 className="item-title" style={{ margin: 0, flex: 1 }}>{p.title}</h3>
                    {getStatusBadge(p.status)}
                  </div>
                  {p.description && (
                    <p className="item-description">{p.description}</p>
                  )}
                  <div className="item-meta">
                    <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                      📅 Created: {new Date(p.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

