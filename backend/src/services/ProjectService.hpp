#pragma once

#include <string>
#include <vector>
#include <memory>
#include <optional>
#include "../models/Project.hpp"
#include "../repositories/ProjectRepository.hpp"

/**
 * @class ProjectService
 * @brief Service layer for project management business logic
 * Handles project lifecycle, milestone tracking, activity logging
 */
class ProjectService {
private:
    std::shared_ptr<ProjectRepository> projectRepository;

public:
    ProjectService(std::shared_ptr<ProjectRepository> repo) : projectRepository(repo) {}

    virtual ~ProjectService() = default;

    // Project CRUD
    bool createProject(Project& project);
    std::optional<Project> getProject(const std::string& projectId);
    bool updateProject(const Project& project);
    bool deleteProject(const std::string& projectId);

    // Project queries
    std::vector<Project> getClientProjects(const std::string& clientId);
    std::vector<Project> getFreelancerProjects(const std::string& freelancerId);
    std::vector<Project> getOpenProjects();
    std::vector<Project> getProjectsByStatus(const std::string& status);
    std::vector<Project> searchProjects(const std::string& keyword);
    std::vector<Project> filterProjects(const json& filterCriteria);

    // Project status management
    bool approveProject(const std::string& projectId);
    bool startProject(const std::string& projectId, const std::string& freelancerId);
    bool completeProject(const std::string& projectId);
    bool cancelProject(const std::string& projectId);

    // Milestone management
    bool addMilestone(const std::string& projectId, Milestone& milestone);
    bool completeMilestone(const std::string& milestoneId);
    std::vector<Milestone*> getProjectMilestones(const std::string& projectId);
    
    // Activity logging (logs all project events)
    void logActivity(const std::string& projectId, const std::string& userId,
                     const std::string& action, const json& metadata = nullptr);
    std::vector<ActivityLog*> getActivityTimeline(const std::string& projectId);

    // Deadline tracking
    bool updateDeadline(const std::string& projectId, long long newDeadline);
    std::vector<Project> getOverdueProjects();
    int calculateDaysLate(const std::string& projectId);

    // Advanced queries
    std::vector<Project> getProjectsRequiringSkills(const std::vector<std::string>& skills);
    std::vector<Project> getProjectsWithinBudget(double maxBudget);
    std::vector<Project> getHighPriorityProjects();  // Overdue or nearing deadline

    // Statistics
    json getProjectStatistics(const std::string& projectId);
    json getClientProjectStats(const std::string& clientId);
    int getTotalActiveProjects();
};

/**
 * @class BidService
 * @brief Service layer for bid management
 * Implements bid evaluation, scoring, and acceptance logic
 */
class BidService {
private:
    std::shared_ptr<ProjectRepository> projectRepository;

public:
    BidService(std::shared_ptr<ProjectRepository> repo) : projectRepository(repo) {}

    virtual ~BidService() = default;

    // Bid management
    bool submitBid(Bid& bid);
    std::optional<Bid*> getBid(const std::string& bidId);
    std::vector<Bid*> getProjectBids(const std::string& projectId);
    std::vector<Bid*> getFreelancerBids(const std::string& freelancerId);

    // Bid evaluation
    bool evaluateBid(Bid& bid, const std::string& projectId);
    double calculateSkillMatchScore(const std::string& freelancerId, const std::vector<std::string>& requiredSkills);
    double calculateTimelineScore(int proposedDuration, long long deadline);
    double calculatePriceValueScore(double bidAmount, double projectBudget);
    double calculateOverallScore(Bid& bid);

    // Bid actions
    bool acceptBid(const std::string& bidId);
    bool rejectBid(const std::string& bidId);
    bool shortlistBid(const std::string& bidId);
    bool withdrawBid(const std::string& bidId);

    // Bid ranking
    std::vector<Bid*> rankBidsForProject(const std::string& projectId);
    Bid* getBestValueBid(const std::string& projectId);
    Bid* getBestBudgetOptionBid(const std::string& projectId);

    // Highlighting logic
    void highlightBestValueBids(const std::string& projectId);
    void highlightBudgetOptionBids(const std::string& projectId, double maxBudget);

    // Statistics
    int getAverageBidsPerProject();
    double getAverageTimeToAcceptBid();
};
