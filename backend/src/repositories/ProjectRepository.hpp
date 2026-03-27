#pragma once

#include "IRepository.hpp"
#include "../models/Project.hpp"

/**
 * @class ProjectRepository
 * @brief Repository for Project, Milestone, ActivityLog, and Bid entities
 * Implements CRUD and query operations for project-related entities
 */
class ProjectRepository : public BaseRepository<Project> {
private:
    std::vector<Milestone*> milestoneStorage;
    std::vector<ActivityLog*> activityLogStorage;
    std::vector<Bid*> bidStorage;

public:
    ProjectRepository() = default;
    virtual ~ProjectRepository() {
        for (auto ptr : milestoneStorage) delete ptr;
        for (auto ptr : activityLogStorage) delete ptr;
        for (auto ptr : bidStorage) delete ptr;
    }

    // Project-specific queries
    std::vector<Project> getProjectsByClient(const std::string& clientId);
    std::vector<Project> getProjectsByStatus(const std::string& status);
    std::vector<Project> getOpenProjects();
    std::vector<Project> getProjectsCheaperThan(double maxBudget);
    std::vector<Project> getProjectsRequiringSkill(const std::string& skill);

    // Milestone operations
    bool addMilestone(const Milestone& milestone);
    std::optional<Milestone*> getMilestoneById(const std::string& id);
    std::vector<Milestone*> getMilestonesByProject(const std::string& projectId);
    bool updateMilestone(const Milestone& milestone);
    bool deleteMilestone(const std::string& id);

    // Activity Log operations
    bool addActivityLog(const ActivityLog& log);
    std::optional<ActivityLog*> getActivityLogById(const std::string& id);
    std::vector<ActivityLog*> getActivityLogsByProject(const std::string& projectId);
    std::vector<ActivityLog*> getActivityLogsByUser(const std::string& userId);

    // Bid operations (stored here for project context)
    bool addBid(const Bid& bid);
    std::optional<Bid*> getBidById(const std::string& id);
    std::vector<Bid*> getBidsByProject(const std::string& projectId);
    std::vector<Bid*> getBidsByFreelancer(const std::string& freelancerId);
    std::vector<Bid*> getBidsByStatus(const std::string& status);
    bool updateBid(const Bid& bid);
    bool deleteBid(const std::string& id);
    int getBidCountForProject(const std::string& projectId);

    // Complex queries
    std::vector<Project> searchProjects(const std::string& keyword);
    std::vector<Bid*> getTopBidsForProject(const std::string& projectId, int limit = 5);
};
