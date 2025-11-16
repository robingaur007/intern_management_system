import { Routes, Route, Navigate } from "react-router-dom";
import UserTypeSelector from "./auth/UserTypeSelector";
import Login from "./auth/Login";
import Signup from "./auth/Signup";
import RequireAuth from "./auth/RequireAuth";

import AdminDashboard from "./admin/AdminDashboard";
import Projects from "./admin/Projects";
import Tasks from "./admin/Tasks";
import Interns from "./admin/Interns";

import InternDashboard from "./intern/InternDashboard";
import MyTasks from "./intern/MyTasks";
import MyProjects from "./intern/MyProjects";

export default function App() {
  return (
    <Routes>
      {/* Role Selection - Landing Page */}
      <Route path="/" element={<UserTypeSelector />} />

      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Admin protected routes */}
      <Route
        path="/admin"
        element={<RequireAuth role="admin"><AdminDashboard /></RequireAuth>}
      />
      <Route
        path="/admin/projects"
        element={<RequireAuth role="admin"><Projects /></RequireAuth>}
      />
      <Route
        path="/admin/tasks"
        element={<RequireAuth role="admin"><Tasks /></RequireAuth>}
      />
      <Route
        path="/admin/interns"
        element={<RequireAuth role="admin"><Interns /></RequireAuth>}
      />

      {/* Intern routes */}
      <Route
        path="/intern"
        element={<RequireAuth role="intern"><InternDashboard /></RequireAuth>}
      />
      <Route
        path="/intern/tasks"
        element={<RequireAuth role="intern"><MyTasks /></RequireAuth>}
      />
      <Route
        path="/intern/projects"
        element={<RequireAuth role="intern"><MyProjects /></RequireAuth>}
      />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
