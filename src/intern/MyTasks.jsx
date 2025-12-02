import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import "../Dashboard.css";

export default function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data } = await supabase
      .from("tasks")
      .select("*, projects!project_id(title, id)")
      .eq("assignee_id", user.id)
      .order("created_at", { ascending: false });

    setTasks(data || []);

    // Load comments for all tasks
    if (data && data.length > 0) {
      const taskIds = data.map(t => t.id);
      const { data: commentsData, error: commentsError } = await supabase
        .from("task_comments")
        .select("*, profiles!user_id(full_name, email, role)")
        .in("task_id", taskIds)
        .order("created_at", { ascending: false });

      if (commentsError) {
        console.error("Error loading comments:", commentsError);
      }

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

    setLoading(false);
  }

  async function markDone(id) {
    await supabase.from("tasks").update({ status: "completed" }).eq("id", id);
    load();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  useEffect(() => { load(); }, []);

  function getStatusBadge(status) {
    const statusClass = status === "completed" ? "status-completed" : 
                       status === "in-progress" ? "status-in-progress" : 
                       "status-todo";
    return <span className={`status-badge ${statusClass}`}>{status}</span>;
  }

  const completedCount = tasks.filter(t => t.status === "completed").length;
  const totalCount = tasks.length;

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1 className="dashboard-title">My Tasks</h1>
          <div className="dashboard-nav">
            <Link to="/intern" className="nav-link">Dashboard</Link>
            <Link to="/intern/projects" className="nav-link">My Projects</Link>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">My Assigned Tasks</h2>
              {totalCount > 0 && (
                <p style={{ color: "#6b7280", margin: "0.5rem 0 0 0", fontSize: "0.9rem" }}>
                  {completedCount} of {totalCount} tasks completed
                </p>
              )}
            </div>
          </div>

          {loading ? (
            <div className="loading">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <p className="empty-state-text">No tasks assigned yet. Check back later!</p>
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
                    <p style={{ color: "#667eea", fontSize: "0.875rem", margin: "0.5rem 0" }}>
                      📁 {t.projects.title}
                    </p>
                  )}
                  {/* Comments Section */}
                  {comments[t.id] && comments[t.id].length > 0 && (
                    <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e5e7eb" }}>
                      <div style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem", color: "#1a1a1a" }}>
                        💬 Comments ({comments[t.id].length})
                      </div>
                      {comments[t.id].map(comment => (
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
                          <div style={{ color: "#6b7280", marginBottom: "0.25rem" }}>{comment.body}</div>
                          <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                            {new Date(comment.created_at).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="item-meta" style={{ marginTop: "1rem" }}>
                    {t.due_date && (
                      <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                        📅 Due: {new Date(t.due_date).toLocaleDateString()}
                      </span>
                    )}
                    {t.status !== "completed" && (
                      <button 
                        onClick={() => markDone(t.id)} 
                        className="btn-success"
                        style={{ marginLeft: "auto" }}
                      >
                        ✓ Mark Complete
                      </button>
                    )}
                    {t.status === "completed" && (
                      <span style={{ color: "#10b981", fontSize: "0.875rem", fontWeight: 600, marginLeft: "auto" }}>
                        ✓ Completed
                      </span>
                    )}
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
