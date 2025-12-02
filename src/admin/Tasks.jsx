import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { generateTaskDescription } from "../utils/aiService";
import "../Dashboard.css";

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    project_id: "",
    assignee_id: "",
    status: "todo",
    due_date: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("tasks")
      .select("*, profiles!assignee_id(full_name, email), projects!project_id(title)")
      .order("created_at", { ascending: false });
    setTasks(data || []);
    setLoading(false);
  }

  async function loadProjects() {
    const { data } = await supabase
      .from("projects")
      .select("id, title")
      .order("title");
    setProjects(data || []);
  }

  async function loadInterns() {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "intern")
      .order("full_name");
    setInterns(data || []);
  }

  useEffect(() => { 
    load(); 
    loadProjects();
    loadInterns();
  }, []);

  function openCreateModal() {
    setEditingTask(null);
    setFormData({
      title: "",
      description: "",
      project_id: "",
      assignee_id: "",
      status: "todo",
      due_date: ""
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function openEditModal(task) {
    setEditingTask(task);
    setFormData({
      title: task.title || "",
      description: task.description || "",
      project_id: task.project_id || "",
      assignee_id: task.assignee_id || "",
      status: task.status || "todo",
      due_date: task.due_date ? task.due_date.split('T')[0] : ""
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.title || !formData.project_id || !formData.assignee_id) {
      setError("Please fill in all required fields");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (editingTask) {
      // Update existing task
      const { error: updateError } = await supabase
        .from("tasks")
        .update({
          title: formData.title,
          description: formData.description,
          project_id: formData.project_id,
          assignee_id: formData.assignee_id,
          status: formData.status,
          due_date: formData.due_date || null
        })
        .eq("id", editingTask.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess("Task updated successfully!");
    } else {
      // Create new task
      const { error: insertError } = await supabase
        .from("tasks")
        .insert({
          ...formData,
          created_by: user.id,
          due_date: formData.due_date || null
        });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setSuccess("Task created successfully!");
    }

    setShowModal(false);
    setEditingTask(null);
    setFormData({
      title: "",
      description: "",
      project_id: "",
      assignee_id: "",
      status: "todo",
      due_date: ""
    });
    load();
    setTimeout(() => setSuccess(""), 3000);
  }

  async function handleDelete(taskId) {
    if (!confirm("Are you sure you want to delete this task? This action cannot be undone.")) {
      return;
    }

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);

    if (error) {
      setError(error.message);
      setTimeout(() => setError(""), 3000);
      return;
    }

    setSuccess("Task deleted successfully!");
    load();
    setTimeout(() => setSuccess(""), 3000);
  }

  async function handleGenerateDescription() {
    if (!formData.title || formData.title.trim() === "") {
      setError("Please enter a task title first");
      return;
    }

    setGeneratingDescription(true);
    setError("");

    try {
      // Get project title if project is selected
      const selectedProject = projects.find(p => p.id === formData.project_id);
      const projectTitle = selectedProject ? selectedProject.title : null;

      const description = await generateTaskDescription(formData.title, projectTitle);
      setFormData({ ...formData, description });
      setSuccess("Description generated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to generate description. Please try again.");
      setTimeout(() => setError(""), 5000);
    } finally {
      setGeneratingDescription(false);
    }
  }

  function getStatusBadge(status) {
    const statusClass = status === "completed" ? "status-completed" : 
                       status === "in-progress" ? "status-in-progress" : 
                       "status-todo";
    return <span className={`status-badge ${statusClass}`}>{status}</span>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Tasks</h1>
          <div className="dashboard-nav">
            <Link to="/admin" className="nav-link">Dashboard</Link>
            <Link to="/admin/projects" className="nav-link">Projects</Link>
            <Link to="/admin/interns" className="nav-link">Interns</Link>
            <button onClick={() => navigate("/")} className="logout-button">
              Logout
            </button>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h2 className="card-title">All Tasks</h2>
            <button className="btn-primary" onClick={openCreateModal}>+ New Task</button>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          {loading ? (
            <div className="loading">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <p className="empty-state-text">No tasks yet. Create your first task!</p>
            </div>
          ) : (
            <div className="items-grid">
              {tasks.map(t => (
                <div key={t.id} className="item-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <h3 className="item-title" style={{ margin: 0, flex: 1 }}>{t.title}</h3>
                    {getStatusBadge(t.status)}
                  </div>
                  {t.description && (
                    <p className="item-description">{t.description}</p>
                  )}
                  {t.projects && (
                    <p style={{ color: "#6366f1", fontSize: "0.875rem", margin: "0.5rem 0", fontWeight: 500 }}>
                      📁 {t.projects.title}
                    </p>
                  )}
                  <div className="item-meta">
                    {t.profiles && (
                      <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                        👤 {t.profiles.full_name || t.profiles.email}
                      </span>
                    )}
                    {t.due_date && (
                      <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                        📅 {new Date(t.due_date).toLocaleDateString()}
                      </span>
                    )}
                    <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={() => openEditModal(t)}
                        className="btn-secondary"
                        style={{ 
                          padding: "0.5rem 1rem", 
                          fontSize: "0.875rem",
                          border: "1.5px solid #e5e7eb"
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="btn-danger"
                        style={{ 
                          padding: "0.5rem 1rem", 
                          fontSize: "0.875rem"
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Task Modal (Create/Edit) */}
        {showModal && (
          <div className="modal-overlay" onClick={() => {
            setShowModal(false);
            setEditingTask(null);
          }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="card-title">{editingTask ? "Edit Task" : "Create New Task"}</h2>
                <button className="btn-secondary" onClick={() => {
                  setShowModal(false);
                  setEditingTask(null);
                }}>✕</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Task Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <label className="form-label">Description</label>
                    <button
                      type="button"
                      onClick={handleGenerateDescription}
                      disabled={generatingDescription || !formData.title}
                      className="btn-secondary"
                      style={{
                        padding: "0.4rem 0.8rem",
                        fontSize: "0.875rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        opacity: (!formData.title || generatingDescription) ? 0.6 : 1,
                        cursor: (!formData.title || generatingDescription) ? "not-allowed" : "pointer"
                      }}
                    >
                      {generatingDescription ? (
                        <>
                          <span className="spinner" style={{
                            display: "inline-block",
                            width: "12px",
                            height: "12px",
                            border: "2px solid #e5e7eb",
                            borderTopColor: "#6366f1",
                            borderRadius: "50%",
                            animation: "spin 0.6s linear infinite"
                          }}></span>
                          Generating...
                        </>
                      ) : (
                        <>
                          ✨ Generate with AI
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    className="form-textarea"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows="3"
                    placeholder={generatingDescription ? "Generating description..." : "Enter task description or click 'Generate with AI'"}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Project *</label>
                  <select
                    className="form-select"
                    value={formData.project_id}
                    onChange={(e) => setFormData({...formData, project_id: e.target.value})}
                    required
                  >
                    <option value="">Select a project</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Assign To *</label>
                  <select
                    className="form-select"
                    value={formData.assignee_id}
                    onChange={(e) => setFormData({...formData, assignee_id: e.target.value})}
                    required
                  >
                    <option value="">Select an intern</option>
                    {interns.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.full_name || i.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="todo">Todo</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                  />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => {
                    setShowModal(false);
                    setEditingTask(null);
                  }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingTask ? "Update Task" : "Create Task"}
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
