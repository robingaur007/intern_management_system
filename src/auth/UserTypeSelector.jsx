import { useNavigate } from "react-router-dom";
import "./Auth.css";

export default function UserTypeSelector() {
  const navigate = useNavigate();

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Intern Management System</h1>
        <p className="auth-subtitle">Select your role to continue</p>
        
        <div className="role-selector">
          <button 
            type="button"
            className="role-button admin-button"
            onClick={() => navigate("/login?role=admin")}
          >
            <div className="role-icon">👨‍💼</div>
            <h2>Admin</h2>
            <p>Manage projects and assign tasks</p>
          </button>
          
          <button 
            type="button"
            className="role-button intern-button"
            onClick={() => navigate("/login?role=intern")}
          >
            <div className="role-icon">👨‍🎓</div>
            <h2>Intern</h2>
            <p>View and complete assigned tasks</p>
          </button>
        </div>
      </div>
    </div>
  );
}

