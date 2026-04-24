import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ClientDashboard from "./pages/ClientDashboard";
import FreelancerDashboard from "./pages/FreelancerDashboard";
import ProjectDetails from "./pages/ProjectDetails";
import JobBrowsing from "./pages/JobBrowsing";
import FreelancerRecommendations from "./pages/FreelancerRecommendations";
import Homepage from "./pages/Homepage";
import MyProjects from "./pages/Projects";
import Analytics from "./pages/Analytics";
import Clientprojects from "./pages/Clientprojects";
import BidManagerClient from "./pages/BIDMANAGER_CLIENT";
import ClientPayouts from "./pages/ClientPayouts";
import BidderManagement from "./pages/BidderManagement";
import InvoicePage from "./pages/InvoicePage";
import CreateProject from "./pages/CreateProject";
import VMAnalysis from "./pages/VMAnalysis";
import CandidateReport from "./pages/CandidateReport";
import AIJobDiscovery from "./pages/AIJobDiscovery";
import AIJobDetail from "./pages/AIJobDetail";
import VMLaunch from "./pages/VMLaunch";
import VMLive from "./pages/VMLive";
import TestPage from "./pages/TestPage";
import RecruiterTestManager from "./pages/RecruiterTestManager";
import AssessmentCreate from "./pages/AssessmentCreate";
import AssessmentTake from "./pages/AssessmentTake";
import AssessmentResult from "./pages/AssessmentResult";
import AssessmentLeaderboard from "./pages/AssessmentLeaderboard";

import AIJobAnalyzer from "./pages/AIJobAnalyzer";
import AICareerRoleBuilder from "./pages/AICareerRoleBuilder";
import RegistrationFlow from "./pages/RegistrationFlow";
import GlobalAIChatbot from "./components/GlobalAIChatbot";
import ProtectedRoute from "./components/ProtectedRoute";
import { ClientLayout, FreelancerLayout } from "./components/Layouts";
import { useAuth } from "./context/AuthContext";

function AppRoutes() {
  const { user, setUser, loading } = useAuth();

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser || null);
  };

  const role = localStorage.getItem("role") || "freelancer";
  const registrationComplete = user?.registration_complete !== false;
  const dashboardPath =
    role === "client" ? "/client-dashboard" : "/freelancer-dashboard";

  return (
    <div className="font-sans">
      <GlobalAIChatbot />
      <Routes>
        <Route path="/" element={<Homepage />} />

        <Route
          path="/login-freelancer"
          element={<Login role="freelancer" onLogin={handleLogin} />}
        />
        <Route
          path="/login-client"
          element={<Login role="client" onLogin={handleLogin} />}
        />
        <Route path="/signup-freelancer" element={<RegistrationFlow />} />
        <Route path="/signup-client" element={<Signup role="client" />} />

        <Route
          path="/register"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <RegistrationFlow />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={<Navigate to={dashboardPath} replace />}
        />

        <Route
          path="/freelancer-dashboard"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <FreelancerLayout>
                <FreelancerDashboard />
              </FreelancerLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/freelancer-projects"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <FreelancerLayout>
                <JobBrowsing />
              </FreelancerLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-projects"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <FreelancerLayout>
                <MyProjects />
              </FreelancerLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/analytics"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <FreelancerLayout>
                <Analytics />
              </FreelancerLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/bidder-management"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <FreelancerLayout>
                <BidderManagement />
              </FreelancerLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-invoices"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <FreelancerLayout>
                <InvoicePage />
              </FreelancerLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/freelancer-recommendations"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <FreelancerLayout>
                <FreelancerRecommendations />
              </FreelancerLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/project/:id"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <FreelancerLayout>
                <ProjectDetails />
              </FreelancerLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/client-dashboard"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <ClientLayout>
                <ClientDashboard />
              </ClientLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/client-projects"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <Clientprojects />
            </ProtectedRoute>
          }
        />

        <Route
          path="/recommendations/project-client"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <ClientLayout>
                <FreelancerRecommendations />
              </ClientLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/client-manage-bids"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <ClientLayout>
                <BidManagerClient />
              </ClientLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/client-payouts"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <ClientLayout>
                <ClientPayouts />
              </ClientLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/create-project"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <CreateProject />
            </ProtectedRoute>
          }
        />
        <Route
          path="/post-job"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <CreateProject />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vm-analysis"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <VMAnalysis />
            </ProtectedRoute>
          }
        />
        <Route
          path="/candidate/:id"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <CandidateReport />
            </ProtectedRoute>
          }
        />

        <Route
          path="/jobs"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <AIJobDiscovery />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs/:id"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <AIJobDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ai-analyzer"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <AIJobAnalyzer />
            </ProtectedRoute>
          }
        />

        <Route
          path="/career-role-builder"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <AICareerRoleBuilder />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vm-launch"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <VMLaunch />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vm-live"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <VMLive />
            </ProtectedRoute>
          }
        />

        <Route
          path="/test/:jobId"
          element={
            <ProtectedRoute user={user} loading={loading} requiredRole="freelancer">
              <TestPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruiter/jobs/:jobId/test"
          element={
            <ProtectedRoute user={user} loading={loading} requiredRole="client">
              <RecruiterTestManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/client-assessments/create"
          element={
            <ProtectedRoute user={user} loading={loading} requiredRole="client">
              <AssessmentCreate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/client-assessments/:assessmentId/leaderboard"
          element={
            <ProtectedRoute user={user} loading={loading} requiredRole="client">
              <AssessmentLeaderboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessments/:assessmentId/take"
          element={
            <ProtectedRoute user={user} loading={loading} requiredRole="freelancer">
              <AssessmentTake />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessments/:assessmentId/result"
          element={
            <ProtectedRoute user={user} loading={loading} requiredRole="freelancer">
              <AssessmentResult />
            </ProtectedRoute>
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to={
                user
                  ? registrationComplete
                    ? dashboardPath
                    : "/register"
                  : "/login-freelancer"
              }
              replace
            />
          }
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
