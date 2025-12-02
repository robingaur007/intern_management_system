import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import "../Dashboard.css";

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "planned"
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    setProjects(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreateModal() {
    setEditingProject(null);
    setFormData({ title: "", description: "", status: "planned" });
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function openEditModal(project) {
    setEditingProject(project);
    setFormData({
      title: project.title,
      description: project.description || "",
      status: project.status
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.title) {
      setError("Please enter a project title");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (editingProject) {
      // Update existing project
      const { error: updateError } = await supabase
        .from("projects")
        .update({
          title: formData.title,
          description: formData.description,
          status: formData.status
        })
        .eq("id", editingProject.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess("Project updated successfully!");
    } else {
      // Create new project
      const { error: insertError } = await supabase
        .from("projects")
        .insert({
          title: formData.title,
          description: formData.description,
          status: formData.status,
          created_by: user.id
        });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setSuccess("Project created successfully!");
    }

    setShowModal(false);
    load();
    setTimeout(() => setSuccess(""), 3000);
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this project? This will also delete all associated tasks.")) {
      return;
    }

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess("Project deleted successfully!");
    load();
    setTimeout(() => setSuccess(""), 3000);
  }

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
          <h1 className="dashboard-title">Projects</h1>
          <div className="dashboard-nav">
            <Link to="/admin" className="nav-link">Dashboard</Link>
            <Link to="/admin/tasks" className="nav-link">Tasks</Link>
            <Link to="/admin/interns" className="nav-link">Interns</Link>
            <button onClick={() => navigate("/")} className="logout-button">
              Logout
            </button>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h2 className="card-title">All Projects</h2>
            <button className="btn-primary" onClick={openCreateModal}>+ New Project</button>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          {loading ? (
            <div className="loading">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📁</div>
              <p className="empty-state-text">No projects yet. Create your first project!</p>
            </div>
          ) : (
            <div className="items-grid">
              {projects.map(p => (
                <div key={p.id} className="item-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <h3 className="item-title" style={{ margin: 0, flex: 1 }}>{p.title}</h3>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button 
                        className="btn-secondary" 
                        onClick={() => openEditModal(p)}
                        style={{ padding: "0.5rem", fontSize: "0.875rem" }}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn-danger" 
                        onClick={() => handleDelete(p.id)}
                        style={{ padding: "0.5rem", fontSize: "0.875rem" }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {p.description && (
                    <p className="item-description">{p.description}</p>
                  )}
                  <div className="item-meta">
                    {getStatusBadge(p.status)}
                    <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                      {new Date(p.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Project Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="card-title">{editingProject ? "Edit Project" : "Create New Project"}</h2>
                <button className="btn-secondary" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Project Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows="4"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="planned">Planned</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingProject ? "Update Project" : "Create Project"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
