import { BrowserRouter, Routes, Route } from "react-router-dom";

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

import AIJobAnalyzer from "./pages/AIJobAnalyzer"; // <-- New page
import RegistrationFlow from "./pages/RegistrationFlow";

import { ClientLayout, FreelancerLayout } from "./components/Layouts";

function App() {
  return (
    <BrowserRouter>
      <div className="font-sans">
        <Routes>

          {/* 🏠 Homepage */}
          <Route path="/" element={<Homepage />} />

          {/* 🔐 Auth Routes */}
          <Route path="/login-freelancer" element={<Login role="freelancer" />} />
          <Route path="/login-client" element={<Login role="client" />} />
          <Route path="/signup-freelancer" element={<RegistrationFlow />} />
          <Route path="/signup-client" element={<Signup role="client" />} />

          {/* 🧑‍💻 Freelancer Routes */}
          <Route
            path="/freelancer-dashboard"
            element={
              <FreelancerLayout>
                <FreelancerDashboard />
              </FreelancerLayout>
            }
          />

          <Route
            path="/freelancer-projects"
            element={
              <FreelancerLayout>
                <JobBrowsing />
              </FreelancerLayout>
            }
          />

          <Route
            path="/my-projects"
            element={
              <FreelancerLayout>
                <MyProjects />
              </FreelancerLayout>
            }
          />
          
          <Route
            path="/analytics"
            element={
              <FreelancerLayout>
                <Analytics />
              </FreelancerLayout>
            }
          />

          <Route
            path="/bidder-management"
            element={
              <FreelancerLayout>
                <BidderManagement />
              </FreelancerLayout>
            }
          />

          <Route
            path="/my-invoices"
            element={
              <FreelancerLayout>
                <InvoicePage />
              </FreelancerLayout>
            }
          />

          <Route
            path="/freelancer-recommendations"
            element={
              <FreelancerLayout>
                <FreelancerRecommendations />
              </FreelancerLayout>
            }
          />

          <Route
            path="/project/:id"
            element={
              <FreelancerLayout>
                <ProjectDetails />
              </FreelancerLayout>
            }
          />

          {/* 🏢 Client Routes */}
          <Route
            path="/client-dashboard"
            element={
              <ClientLayout>
                <ClientDashboard />
              </ClientLayout>
            }
          />

          <Route path="/client-projects" element={<Clientprojects />} />

          <Route
            path="/recommendations/project-client"
            element={
              <ClientLayout>
                <FreelancerRecommendations />
              </ClientLayout>
            }
          />

          <Route
            path="/client-manage-bids"
            element={
              <ClientLayout>
                <BidManagerClient />
              </ClientLayout>
            }
          />

          <Route
            path="/client-payouts"
            element={
              <ClientLayout>
                <ClientPayouts />
              </ClientLayout>
            }
          />

          <Route path="/create-project" element={<CreateProject />} />
          <Route path="/vm-analysis" element={<VMAnalysis />} />
          <Route path="/candidate/:id" element={<CandidateReport />} />

          {/* 🤖 AI Job Discovery Routes */}
          <Route path="/jobs" element={<AIJobDiscovery />} />
          <Route path="/jobs/:id" element={<AIJobDetail />} />

          {/* 🤖 AI Job Analyzer Route */}
          <Route path="/ai-analyzer" element={<AIJobAnalyzer />} />

          {/* 🖥️ Freelancer VM Test Routes */}
          <Route path="/vm-launch" element={<VMLaunch />} />
          <Route path="/vm-live" element={<VMLive />} />

          {/* ❌ 404 */}
          <Route
            path="*"
            element={
              <div className="p-10 text-red-500 font-bold text-center">
                404 - Page Not Found
              </div>
            }
          />

        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;