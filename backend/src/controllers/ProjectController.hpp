#pragma once
#include <crow.h>
#include <nlohmann/json.hpp>
#include "../utils/ResponseUtils.hpp"
#include "../models/Project.hpp"
#include "../services/TrustFraudService.hpp"
#include "../services/MatchingEngine.hpp"
#include <chrono>

using json = nlohmann::json;

extern std::vector<Project> projectsDB;
extern std::vector<Bid> bidsDB;
extern std::vector<Freelancer> freelancersDB;
extern std::vector<Client> clientsDB;

class ProjectController {
public:
    static void registerRoutes(crow::App<AuthMiddleware>& app) {
        CROW_ROUTE(app, "/api/projects").methods(crow::HTTPMethod::Get)
        ([&app](const crow::request& req) {
            auto& ctx = app.get_context<AuthMiddleware>(req);
            
            json output = json::array();
            for (const auto& p : projectsDB) {
                output.push_back(p.toJson());
            }
            return ResponseUtils::success("Projects retrieved", output);
        });

        CROW_ROUTE(app, "/api/projects").methods(crow::HTTPMethod::Post)
        ([&app](const crow::request& req) {
            auto& ctx = app.get_context<AuthMiddleware>(req);
            crow::response res;
            REQUIRE_ROLE(ctx, "client", res); // Only clients can construct projects

            auto body = json::parse(req.body, nullptr, false);
            if (body.is_discarded()) return ResponseUtils::error(400, "Invalid JSON");

            Project p;
            p.id = "p_" + std::to_string(projectsDB.size() + 1);
            p.clientId = ctx.userId;
            p.title = body.value("title", "");
            p.description = body.value("description", "");
            p.budget = body.value("budget", 0.0);
            p.difficultyLevel = body.value("difficultyLevel", 1);
            p.status = "open";
            
            long long ms_deadline = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count() + (14LL * 24 * 60 * 60 * 1000); // 14 days default
            p.deadlineTimestamp = body.value("deadlineTimestamp", ms_deadline);
            p.requiresSpecificCollege = body.value("requiresSpecificCollege", false);
            p.requiredCollege = body.value("requiredCollege", "");
            p.requiresSpecificYear = body.value("requiresSpecificYear", false);
            p.requiredYear = body.value("requiredYear", 0);

            if(body.contains("requiredSkills")) {
                for(auto& s : body["requiredSkills"]) p.requiredSkills.push_back(s.get<std::string>());
            }

            projectsDB.push_back(p);
            return ResponseUtils::success("Project created successfully", p.toJson());
        });

        CROW_ROUTE(app, "/api/bid").methods(crow::HTTPMethod::Post)
        ([&app](const crow::request& req) {
            auto& ctx = app.get_context<AuthMiddleware>(req);
            crow::response res;
            REQUIRE_ROLE(ctx, "freelancer", res); 

            auto body = json::parse(req.body, nullptr, false);
            if (body.is_discarded()) return ResponseUtils::error(400, "Invalid JSON");
            
            std::string projId = body.value("projectId", "");
            double amount = body.value("amount", 0.0);
            
            // Auto reject filter
            for (const auto& p : projectsDB) {
                if (p.id == projId) {
                    if (!TrustFraudService::isBidValid(p, amount)) {
                        return ResponseUtils::error(400, "Bid amount exceeds project budget! Auto-rejected.");
                    }
                    
                    // Check eligibility if strict filtering is enabled
                    Freelancer currentF;
                    for (const auto& f : freelancersDB) { if (f.id == ctx.userId) currentF = f; }
                    
                    FreelancerMatcher matcher;
                    if (!matcher.isEligible(currentF, p)) {
                         return ResponseUtils::error(403, "Not eligible for this project due to constraints.");
                    }
                }
            }

            Bid b;
            b.id = "b_" + std::to_string(bidsDB.size() + 1);
            b.projectId = projId;
            b.freelancerId = ctx.userId;
            b.amount = amount;
            b.proposal = body.value("proposal", "");
            b.status = "pending";

            bidsDB.push_back(b);
            return ResponseUtils::success("Bid placed successfully", b.toJson());
        });

        CROW_ROUTE(app, "/api/accept-bid").methods(crow::HTTPMethod::Post)
        ([&app](const crow::request& req) {
            auto& ctx = app.get_context<AuthMiddleware>(req);
            crow::response res;
            REQUIRE_ROLE(ctx, "client", res);

            auto body = json::parse(req.body, nullptr, false);
            if (body.is_discarded()) return ResponseUtils::error(400, "Invalid JSON");

            std::string bidId = body.value("bidId", "");
            for (auto& b : bidsDB) {
                if (b.id == bidId) {
                    b.status = "accepted";
                    for (auto& p : projectsDB) {
                        if (p.id == b.projectId && p.clientId == ctx.userId) {
                            p.status = "in_progress";
                            p.awardedTo = b.freelancerId;
                            return ResponseUtils::success("Bid accepted", p.toJson());
                        }
                    }
                }
            }
            return ResponseUtils::error(404, "Bid or Project not found");
        });
        
        CROW_ROUTE(app, "/api/recommend-freelancers/<string>").methods(crow::HTTPMethod::Get)
        ([&app](const crow::request& req, std::string projectId){
            auto& ctx = app.get_context<AuthMiddleware>(req);
            crow::response res;
            REQUIRE_ROLE(ctx, "client", res); 

            Project targetProject;
            bool found = false;
            for (const auto& p : projectsDB) {
                if (p.id == projectId && p.clientId == ctx.userId) { targetProject = p; found = true; break; }
            }
            if (!found) return ResponseUtils::error(404, "Project not found or unauthorized");

            FreelancerMatcher matcher;
            json recommendations = json::array();

            for (const auto& f : freelancersDB) {
                json rec = matcher.getSkillGapReport(f, targetProject);
                if (rec["isEligible"].get<bool>() == true) {
                    rec["freelancer"] = f.toJson();
                    recommendations.push_back(rec);
                }
            }

            // Display highest score first
            std::sort(recommendations.begin(), recommendations.end(), [](const json& a, const json& b) {
                return a["finalScore"].get<double>() > b["finalScore"].get<double>();
            });

            return ResponseUtils::success("Recommendations generated", recommendations);
        });
        
        CROW_ROUTE(app, "/api/dashboard/<string>").methods(crow::HTTPMethod::Get)
        ([&app](const crow::request& req, std::string targetId){
            auto& ctx = app.get_context<AuthMiddleware>(req);
            if (ctx.userId != targetId) return ResponseUtils::error(403, "Access denied");

            if (ctx.role == "freelancer") {
                Freelancer f;
                for(auto& fr : freelancersDB) { if(fr.id == targetId) f = fr; }
                
                json dash = { 
                    {"earnings", f.totalEarnings}, 
                    {"streak", f.streak}, 
                    {"completedProjects", f.completedProjects},
                    {"reliabilityScore", f.reliabilityScore},
                    {"deadlinesMet", f.deadlinesMet},
                    {"deadlinesMissed", f.deadlinesMissed}
                };
                return ResponseUtils::success("Freelancer Dashboard", dash);
            } else {
                Client c;
                for(auto& cl : clientsDB) { if(cl.id == targetId) c = cl; }
                json dash = { 
                    {"totalSpend", 0}, // Would calculate from projects
                    {"activeProjects", c.successfulProjects}, 
                    {"trustScore", c.trustScore},
                    {"fraudFlag", c.fraudFlag}
                };
                return ResponseUtils::success("Client Dashboard", dash);
            }
        });
    }
};
