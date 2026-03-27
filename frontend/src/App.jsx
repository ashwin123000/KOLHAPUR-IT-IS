import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ClientDashboard from "./pages/ClientDashboard";
import FreelancerDashboard from "./pages/FreelancerDashboard";
import ProjectDetails from "./pages/ProjectDetails";
import JobBrowsing from "./pages/JobBrowsing";
import FreelancerRecommendations from "./pages/FreelancerRecommendations";
import Homepage from "./pages/Homepage";
import Projects from "./pages/Projects";
import Clientprojects from "./pages/Clientprojects";
import BidManagerClient from "./pages/BIDMANAGER_CLIENT";
import ClientPayouts from "./pages/ClientPayouts";
import BidderManagement from "./pages/BidderManagement";
import InvoicePage from "./pages/InvoicePage";

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
          <Route path="/signup-freelancer" element={<Signup role="freelancer" />} />
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
                <Projects />
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

          <Route
            path="/client-projects"
            element={
              <ClientLayout>
                <Clientprojects />
              </ClientLayout>
            }
          />

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