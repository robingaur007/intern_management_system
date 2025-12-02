import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { generateTaskDescription } from "../utils/aiService";
import "../Dashboard.css";

export default function Interns() {
  const [interns, setInterns] = useState([]);
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [internTasks, setInternTasks] = useState([]);
  const [internProjects, setInternProjects] = useState([]);
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [projects, setProjects] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    project_id: "",
    status: "todo",
    due_date: ""
  });
  const [commentText, setCommentText] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const navigate = useNavigate();

  async function loadInterns() {
    setLoading(true);
    setError("");
    const { data, error: queryError } = await supabase
      .from("profiles")
      .select("id, full_name, email, created_at")
      .eq("role", "intern")
      .order("full_name");
    
    if (queryError) {
      console.error("Error loading interns:", queryError);
      if (queryError.code === "42501" || queryError.message?.includes("permission denied")) {
        setError("Permission denied. Please ensure RLS policies allow admins to view all profiles. Check the browser console for details.");
        console.error("RLS Policy Error - You need to add this policy:");
        console.error(`
          CREATE POLICY "Admins can view all profiles"
          ON public.profiles
          FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid() AND p.role = 'admin'
            )
          );
        `);
      } else {
        setError(`Failed to load interns: ${queryError.message}`);
      }
      setInterns([]);
    } else {
      setInterns(data || []);
      if (data && data.length === 0) {
        console.log("No interns found. Make sure you have profiles with role='intern' in the database.");
      }
    }
    setLoading(false);
  }

  async function loadProjects() {
    const { data } = await supabase
      .from("projects")
      .select("id, title")
      .order("title");
    setProjects(data || []);
  }

  async function loadInternData(internId) {
    // Load tasks for this intern
    const { data: tasksData } = await supabase
      .from("tasks")
      .select("*, projects!project_id(id, title, description, status)")
      .eq("assignee_id", internId)
      .order("created_at", { ascending: false });
    setInternTasks(tasksData || []);

    // Get unique projects from tasks
    const uniqueProjects = {};
    (tasksData || []).forEach(task => {
      if (task.projects && !uniqueProjects[task.projects.id]) {
        uniqueProjects[task.projects.id] = task.projects;
      }
    });
    setInternProjects(Object.values(uniqueProjects));

    // Load comments for all tasks
    if (tasksData && tasksData.length > 0) {
      const taskIds = tasksData.map(t => t.id);
      const { data: commentsData } = await supabase
        .from("task_comments")
        .select("*, profiles!user_id(full_name, email, role)")
        .in("task_id", taskIds)
        .order("created_at", { ascending: false });

      // Group comments by task_id
      const commentsByTask = {};
      (commentsData || []).forEach(comment => {
        if (!commentsByTask[comment.task_id]) {
          commentsByTask[comment.task_id] = [];
        }
        commentsByTask[comment.task_id].push(comment);
      });
      setComments(commentsByTask);
    }
  }

  useEffect(() => {
    loadInterns();
    loadProjects();
  }, []);

  function handleSelectIntern(intern) {
    setSelectedIntern(intern);
    loadInternData(intern.id);
  }

  function openTaskModal(task = null) {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || "",
        project_id: task.project_id,
        status: task.status,
        due_date: task.due_date ? task.due_date.split('T')[0] : ""
      });
      setSelectedTask(task);
    } else {
      setFormData({
        title: "",
        description: "",
        project_id: "",
        status: "todo",
        due_date: ""
      });
      setSelectedTask(null);
    }
    setError("");
    setSuccess("");
    setShowTaskModal(true);
  }

  async function handleTaskSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.title || !formData.project_id) {
      setError("Please fill in all required fields");
      return;
    }

    if (selectedTask) {
      // Update task
      const { error: updateError } = await supabase
        .from("tasks")
        .update({
          title: formData.title,
          description: formData.description,
          project_id: formData.project_id,
          status: formData.status,
          due_date: formData.due_date || null
        })
        .eq("id", selectedTask.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess("Task updated successfully!");
    } else {
      // Create new task
      const { data: { user } } = await supabase.auth.getUser();
      const { error: insertError } = await supabase
        .from("tasks")
        .insert({
          ...formData,
          assignee_id: selectedIntern.id,
          created_by: user.id,
          due_date: formData.due_date || null
        });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setSuccess("Task created successfully!");
    }

    setShowTaskModal(false);
    loadInternData(selectedIntern.id);
    setTimeout(() => setSuccess(""), 3000);
  }

  async function handleDeleteTask(taskId) {
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess("Task deleted successfully!");
    loadInternData(selectedIntern.id);
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

  function openCommentModal(task) {
    setSelectedTask(task);
    setCommentText("");
    setError("");
    setShowCommentModal(true);
  }

  async function handleCommentSubmit(e) {
    e.preventDefault();
    setError("");

    if (!commentText.trim()) {
      setError("Please enter a comment");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    const { error: insertError } = await supabase
      .from("task_comments")
      .insert({
        task_id: selectedTask.id,
        user_id: user.id,
        body: commentText
      });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setShowCommentModal(false);
    setCommentText("");
    loadInternData(selectedIntern.id);
  }

  function getStatusBadge(status) {
    const statusClass = status === "completed" ? "status-completed" : 
                       status === "in-progress" ? "status-in-progress" : 
                       status === "planned" ? "status-planned" : "status-todo";
    return <span className={`status-badge ${statusClass}`}>{status}</span>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Manage Interns</h1>
          <div className="dashboard-nav">
            <Link to="/admin" className="nav-link">Dashboard</Link>
            <Link to="/admin/projects" className="nav-link">Projects</Link>
            <Link to="/admin/tasks" className="nav-link">Tasks</Link>
            <button onClick={() => navigate("/")} className="logout-button">
              Logout
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "2rem" }}>
          {/* Interns List */}
          <div className="dashboard-card" style={{ position: "sticky", top: "2rem", maxHeight: "calc(100vh - 4rem)", overflowY: "auto" }}>
            <h2 className="card-title" style={{ marginBottom: "1.5rem" }}>Interns</h2>
            {loading ? (
              <div className="loading">Loading...</div>
            ) : interns.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-text">No interns found</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {interns.map(intern => (
                  <button
                    key={intern.id}
                    onClick={() => handleSelectIntern(intern)}
                    style={{
                      padding: "1.25rem",
                      textAlign: "left",
                      background: selectedIntern?.id === intern.id 
                        ? "linear-gradient(135deg, #f0f4ff 0%, #e0e8ff 100%)" 
                        : "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)",
                      border: selectedIntern?.id === intern.id 
                        ? "2px solid #6366f1" 
                        : "1.5px solid #e5e7eb",
                      borderRadius: "12px",
                      cursor: "pointer",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: selectedIntern?.id === intern.id 
                        ? "0 4px 6px -1px rgba(99, 102, 241, 0.2)" 
                        : "0 1px 2px rgba(0, 0, 0, 0.05)"
                    }}
                    onMouseEnter={(e) => {
                      if (selectedIntern?.id !== intern.id) {
                        e.currentTarget.style.borderColor = "#c7d2fe";
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedIntern?.id !== intern.id) {
                        e.currentTarget.style.borderColor = "#e5e7eb";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.05)";
                      }
                    }}
                  >
                    <div style={{ 
                      fontWeight: 700, 
                      color: "#111827", 
                      fontSize: "1rem",
                      marginBottom: "0.375rem"
                    }}>
                      {intern.full_name || intern.email}
                    </div>
                    <div style={{ 
                      fontSize: "0.875rem", 
                      color: "#6b7280", 
                      fontWeight: 500
                    }}>
                      {intern.email}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Intern Details */}
          {selectedIntern ? (
            <div>
              <div className="dashboard-card">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">
                      {selectedIntern.full_name || selectedIntern.email}
                    </h2>
                    <p style={{ color: "#6b7280", margin: "0.5rem 0 0 0" }}>
                      {selectedIntern.email}
                    </p>
                  </div>
                  <button 
                    className="btn-primary" 
                    onClick={() => openTaskModal()}
                  >
                    + New Task
                  </button>
                </div>

                {/* Projects Section */}
                {internProjects.length > 0 && (
                  <div style={{ marginBottom: "2rem" }}>
                    <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>
                      Projects ({internProjects.length})
                    </h3>
                    <div className="items-grid">
                      {internProjects.map(project => (
                        <div key={project.id} className="item-card">
                          <h3 className="item-title">{project.title}</h3>
                          {project.description && (
                            <p className="item-description">{project.description}</p>
                          )}
                          <div className="item-meta">
                            {getStatusBadge(project.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tasks Section */}
                <div>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>
                    Tasks ({internTasks.length})
                  </h3>
                  {internTasks.length === 0 ? (
                    <div className="empty-state">
                      <p className="empty-state-text">No tasks assigned yet</p>
                    </div>
                  ) : (
                    <div className="items-grid">
                      {internTasks.map(task => (
                        <div key={task.id} className="item-card">
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                            <h3 className="item-title" style={{ margin: 0, flex: 1 }}>
                              {task.title}
                            </h3>
                            {getStatusBadge(task.status)}
                          </div>
                          {task.description && (
                            <p className="item-description">{task.description}</p>
                          )}
                          {task.projects && (
                            <p style={{ color: "#667eea", fontSize: "0.875rem", margin: "0.5rem 0" }}>
                              📁 {task.projects.title}
                            </p>
                          )}
                          {task.due_date && (
                            <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: "0.5rem 0" }}>
                              📅 Due: {new Date(task.due_date).toLocaleDateString()}
                            </p>
                          )}

                          {/* Comments Section */}
                          {comments[task.id] && comments[task.id].length > 0 && (
                            <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e5e7eb" }}>
                              <div style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "#1a1a1a" }}>
                                Comments ({comments[task.id].length})
                              </div>
                              {comments[task.id].slice(0, 2).map(comment => (
                                <div key={comment.id} style={{ 
                                  background: "#f9fafb", 
                                  padding: "0.75rem", 
                                  borderRadius: "6px", 
                                  marginBottom: "0.5rem",
                                  fontSize: "0.875rem"
                                }}>
                                  <div style={{ fontWeight: 600, color: "#1a1a1a", marginBottom: "0.25rem" }}>
                                    {comment.profiles?.role === "admin" 
                                      ? "Admin" 
                                      : comment.profiles?.full_name || comment.profiles?.email || "Unknown"}
                                  </div>
                                  <div style={{ color: "#6b7280" }}>{comment.body}</div>
                                  <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.25rem" }}>
                                    {new Date(comment.created_at).toLocaleString()}
                                  </div>
                                </div>
                              ))}
                              {comments[task.id].length > 2 && (
                                <div style={{ fontSize: "0.75rem", color: "#667eea", marginTop: "0.25rem" }}>
                                  +{comments[task.id].length - 2} more comments
                                </div>
                              )}
                            </div>
                          )}

                          <div className="item-meta" style={{ marginTop: "1rem" }}>
                            <button
                              className="btn-secondary"
                              onClick={() => openCommentModal(task)}
                              style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
                            >
                              💬 Add Comment
                            </button>
                            <button
                              className="btn-secondary"
                              onClick={() => openTaskModal(task)}
                              style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              className="btn-danger"
                              onClick={() => handleDeleteTask(task.id)}
                              style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="dashboard-card">
              <div className="empty-state">
                <div className="empty-state-icon">👨‍🎓</div>
                <p className="empty-state-text">Select an intern to view their details</p>
              </div>
            </div>
          )}
        </div>

        {/* Task Modal */}
        {showTaskModal && selectedIntern && (
          <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="card-title">
                  {selectedTask ? "Edit Task" : "Create New Task"}
                </h2>
                <button className="btn-secondary" onClick={() => setShowTaskModal(false)}>✕</button>
              </div>
              <form onSubmit={handleTaskSubmit}>
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
                  <button type="button" className="btn-secondary" onClick={() => setShowTaskModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {selectedTask ? "Update Task" : "Create Task"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Comment Modal */}
        {showCommentModal && selectedTask && (
          <div className="modal-overlay" onClick={() => setShowCommentModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="card-title">Add Comment</h2>
                <button className="btn-secondary" onClick={() => setShowCommentModal(false)}>✕</button>
              </div>
              <form onSubmit={handleCommentSubmit}>
                <div className="form-group">
                  <label className="form-label">Task</label>
                  <input
                    type="text"
                    className="form-input"
                    value={selectedTask.title}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Comment *</label>
                  <textarea
                    className="form-textarea"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows="4"
                    placeholder="Enter your comment..."
                    required
                  />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowCommentModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Add Comment
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

