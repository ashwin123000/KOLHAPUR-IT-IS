import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, user, loading, requiredRole }) {
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-semibold text-slate-600 shadow-sm">
          Loading...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login-freelancer" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === "client" ? "/client-dashboard" : "/freelancer-dashboard"} replace />;
  }

  return children;
}
