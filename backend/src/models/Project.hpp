#pragma once

#include <string>
#include <vector>
#include <nlohmann/json.hpp>
#include <ctime>
#include "User.hpp"

using json = nlohmann::json;

// ==================== MILESTONE CLASS ====================
/**
 * @class Milestone
 * @brief Represents a milestone within a project
 * Encapsulates milestone-specific data
 */
class Milestone {
private:
    std::string id;
    std::string projectId;
    std::string title;
    std::string description;
    double budget;
    long long deadlineTimestamp;
    std::string status;  // "pending", "in_progress", "completed", "approved"
    int orderIndex;
    std::string createdAt;
    std::string completedAt;

public:
    Milestone() : budget(0.0), deadlineTimestamp(0), orderIndex(0) {}

    // Getters
    std::string getId() const { return id; }
    std::string getProjectId() const { return projectId; }
    std::string getTitle() const { return title; }
    std::string getDescription() const { return description; }
    double getBudget() const { return budget; }
    long long getDeadlineTimestamp() const { return deadlineTimestamp; }
    std::string getStatus() const { return status; }
    int getOrderIndex() const { return orderIndex; }
    std::string getCreatedAt() const { return createdAt; }
    std::string getCompletedAt() const { return completedAt; }

    // Setters
    void setId(const std::string& _id) { id = _id; }
    void setProjectId(const std::string& _projectId) { projectId = _projectId; }
    void setTitle(const std::string& _title) { title = _title; }
    void setDescription(const std::string& _desc) { description = _desc; }
    void setBudget(double _budget) { budget = _budget; }
    void setDeadlineTimestamp(long long _timestamp) { deadlineTimestamp = _timestamp; }
    void setStatus(const std::string& _status) { status = _status; }
    void setOrderIndex(int _index) { orderIndex = _index; }
    void setCompletedAt(const std::string& _date) { completedAt = _date; }

    bool isOverdue() const;
    bool isCompleted() const { return status == "completed" || status == "approved"; }

    json toJson() const {
        return {
            {"id", id},
            {"projectId", projectId},
            {"title", title},
            {"description", description},
            {"budget", budget},
            {"deadlineTimestamp", deadlineTimestamp},
            {"status", status},
            {"orderIndex", orderIndex},
            {"createdAt", createdAt},
            {"completedAt", completedAt}
        };
    }
};

// ==================== ACTIVITY LOG CLASS ====================
/**
 * @class ActivityLog
 * @brief Records all activities in a project
 * Encapsulates activity tracking
 */
class ActivityLog {
private:
    std::string id;
    std::string projectId;
    std::string userId;
    std::string action;       // "created", "updated", "milestone_completed", "bid_accepted", etc.
    std::string description;
    std::string timestamp;
    json metadata;           // Additional context specific to action

public:
    ActivityLog() {}

    // Getters
    std::string getId() const { return id; }
    std::string getProjectId() const { return projectId; }
    std::string getUserId() const { return userId; }
    std::string getAction() const { return action; }
    std::string getDescription() const { return description; }
    std::string getTimestamp() const { return timestamp; }
    json getMetadata() const { return metadata; }

    // Setters
    void setId(const std::string& _id) { id = _id; }
    void setProjectId(const std::string& _projectId) { projectId = _projectId; }
    void setUserId(const std::string& _userId) { userId = _userId; }
    void setAction(const std::string& _action) { action = _action; }
    void setDescription(const std::string& _desc) { description = _desc; }
    void setTimestamp(const std::string& _ts) { timestamp = _ts; }
    void setMetadata(const json& _data) { metadata = _data; }

    json toJson() const {
        return {
            {"id", id},
            {"projectId", projectId},
            {"userId", userId},
            {"action", action},
            {"description", description},
            {"timestamp", timestamp},
            {"metadata", metadata}
        };
    }
};

// ==================== PROJECT CLASS ====================
/**
 * @class Project
 * @brief Core project entity
 * Encapsulates project state and behavior
 */
class Project {
private:
    std::string id;
    std::string title;
    std::string description;
    std::string clientId;
    double budget;
    std::string status;                    // "open", "in_progress", "completed", "cancelled"
    std::vector<std::string> requiredSkills;
    int difficultyLevel;                   // 1 (beginner) to 5 (expert)
    std::string awardedTo;                 // freelancerId
    long long deadlineTimestamp;
    int daysLate;
    bool requiresSpecificCollege;
    std::string requiredCollege;
    bool requiresSpecificYear;
    int requiredYear;
    std::vector<std::string> milestoneIds;
    std::string createdAt;
    std::string updatedAt;
    std::string completedAt;
    int bidCount;
    std::vector<std::string> activityLogIds;

public:
    Project() : budget(0.0), difficultyLevel(1), deadlineTimestamp(0), daysLate(0),
                requiresSpecificCollege(false), requiresSpecificYear(false), 
                requiredYear(0), bidCount(0) {
        createdAt = getCurrentTimestamp();
        updatedAt = getCurrentTimestamp();
    }

    virtual ~Project() = default;

    // Getters
    std::string getId() const { return id; }
    std::string getTitle() const { return title; }
    std::string getDescription() const { return description; }
    std::string getClientId() const { return clientId; }
    double getBudget() const { return budget; }
    std::string getStatus() const { return status; }
    std::vector<std::string> getRequiredSkills() const { return requiredSkills; }
    int getDifficultyLevel() const { return difficultyLevel; }
    std::string getAwardedTo() const { return awardedTo; }
    long long getDeadlineTimestamp() const { return deadlineTimestamp; }
    int getDaysLate() const { return daysLate; }
    std::vector<std::string> getMilestoneIds() const { return milestoneIds; }
    std::string getCreatedAt() const { return createdAt; }
    std::string getUpdatedAt() const { return updatedAt; }
    std::string getCompletedAt() const { return completedAt; }
    int getBidCount() const { return bidCount; }
    std::vector<std::string> getActivityLogIds() const { return activityLogIds; }

    // Setters
    void setId(const std::string& _id) { id = _id; updateTimestamp(); }
    void setTitle(const std::string& _title) { title = _title; updateTimestamp(); }
    void setDescription(const std::string& _desc) { description = _desc; updateTimestamp(); }
    void setClientId(const std::string& _clientId) { clientId = _clientId; updateTimestamp(); }
    void setBudget(double _budget) { budget = _budget; updateTimestamp(); }
    void setStatus(const std::string& _status) { status = _status; updateTimestamp(); }
    void setRequiredSkills(const std::vector<std::string>& _skills) { requiredSkills = _skills; updateTimestamp(); }
    void setDifficultyLevel(int _level) { difficultyLevel = _level; updateTimestamp(); }
    void setAwardedTo(const std::string& _freelancerId) { awardedTo = _freelancerId; updateTimestamp(); }
    void setDeadlineTimestamp(long long _timestamp) { deadlineTimestamp = _timestamp; updateTimestamp(); }
    void setDaysLate(int _days) { daysLate = _days; updateTimestamp(); }
    void setCompletedAt(const std::string& _date) { completedAt = _date; updateTimestamp(); }
    void setBidCount(int _count) { bidCount = _count; updateTimestamp(); }

    // Business logic
    void incrementBidCount() { bidCount++; updateTimestamp(); }
    void addMilestone(const std::string& milestoneId) { 
        milestoneIds.push_back(milestoneId);
        updateTimestamp();
    }
    void addActivityLog(const std::string& logId) {
        activityLogIds.push_back(logId);
        updateTimestamp();
    }
    bool isOpen() const { return status == "open"; }
    bool isInProgress() const { return status == "in_progress"; }
    bool isCompleted() const { return status == "completed"; }
    bool isOverdue() const;

    void updateTimestamp() { updatedAt = getCurrentTimestamp(); }

    json toJson() const {
        return {
            {"id", id},
            {"title", title},
            {"description", description},
            {"clientId", clientId},
            {"budget", budget},
            {"status", status},
            {"requiredSkills", requiredSkills},
            {"difficultyLevel", difficultyLevel},
            {"awardedTo", awardedTo},
            {"deadlineTimestamp", deadlineTimestamp},
            {"daysLate", daysLate},
            {"requiresSpecificCollege", requiresSpecificCollege},
            {"requiredCollege", requiredCollege},
            {"requiresSpecificYear", requiresSpecificYear},
            {"requiredYear", requiredYear},
            {"milestoneIds", milestoneIds},
            {"createdAt", createdAt},
            {"updatedAt", updatedAt},
            {"completedAt", completedAt},
            {"bidCount", bidCount},
            {"activityLogIds", activityLogIds}
        };
    }

    void fromJson(const json& j) {
        if (j.contains("title")) title = j["title"];
        if (j.contains("description")) description = j["description"];
        if (j.contains("budget")) budget = j["budget"];
        if (j.contains("difficultyLevel")) difficultyLevel = j["difficultyLevel"];
        if (j.contains("requiredSkills")) requiredSkills = j["requiredSkills"].get<std::vector<std::string>>();
    }
};

// ==================== BID CLASS ====================
/**
 * @class Bid
 * @brief Represents a bid for a project
 * Encapsulates bid-specific business logic
 */
class Bid {
private:
    std::string id;
    std::string projectId;
    std::string freelancerId;
    double amount;
    std::string proposal;
    std::string status;          // "pending", "accepted", "rejected", "withdrawn"
    long long proposedDeadlineTimestamp;
    int proposedDuration;        // days
    std::string createdAt;
    std::string respondedAt;
    double skillMatchScore;
    double timelineScore;
    double priceValueScore;
    bool isHighlightedBudgetOption;
    bool isHighlightedBestValue;

public:
    Bid() : amount(0.0), proposedDeadlineTimestamp(0), proposedDuration(0),
            skillMatchScore(0.0), timelineScore(0.0), priceValueScore(0.0),
            isHighlightedBudgetOption(false), isHighlightedBestValue(false) {
        createdAt = getCurrentTimestamp();
    }

    virtual ~Bid() = default;

    // Getters
    std::string getId() const { return id; }
    std::string getProjectId() const { return projectId; }
    std::string getFreelancerId() const { return freelancerId; }
    double getAmount() const { return amount; }
    std::string getProposal() const { return proposal; }
    std::string getStatus() const { return status; }
    long long getProposedDeadlineTimestamp() const { return proposedDeadlineTimestamp; }
    int getProposedDuration() const { return proposedDuration; }
    std::string getCreatedAt() const { return createdAt; }
    std::string getRespondedAt() const { return respondedAt; }
    double getSkillMatchScore() const { return skillMatchScore; }
    double getTimelineScore() const { return timelineScore; }
    double getPriceValueScore() const { return priceValueScore; }
    bool getIsHighlightedBudgetOption() const { return isHighlightedBudgetOption; }
    bool getIsHighlightedBestValue() const { return isHighlightedBestValue; }

    // Setters
    void setId(const std::string& _id) { id = _id; }
    void setProjectId(const std::string& _projectId) { projectId = _projectId; }
    void setFreelancerId(const std::string& _freelancerId) { freelancerId = _freelancerId; }
    void setAmount(double _amount) { amount = _amount; }
    void setProposal(const std::string& _proposal) { proposal = _proposal; }
    void setStatus(const std::string& _status) { status = _status; respondedAt = getCurrentTimestamp(); }
    void setProposedDeadlineTimestamp(long long _timestamp) { proposedDeadlineTimestamp = _timestamp; }
    void setProposedDuration(int _days) { proposedDuration = _days; }
    void setSkillMatchScore(double _score) { skillMatchScore = (_score < 0) ? 0 : (_score > 100) ? 100 : _score; }
    void setTimelineScore(double _score) { timelineScore = (_score < 0) ? 0 : (_score > 100) ? 100 : _score; }
    void setPriceValueScore(double _score) { priceValueScore = (_score < 0) ? 0 : (_score > 100) ? 100 : _score; }
    void setIsHighlightedBudgetOption(bool _flag) { isHighlightedBudgetOption = _flag; }
    void setIsHighlightedBestValue(bool _flag) { isHighlightedBestValue = _flag; }

    // Business logic
    double calculateOverallScore() const {
        return (skillMatchScore * 0.4 + timelineScore * 0.3 + priceValueScore * 0.3);
    }

    bool isPending() const { return status == "pending"; }
    bool isAccepted() const { return status == "accepted"; }
    bool isRejected() const { return status == "rejected"; }

    json toJson() const {
        return {
            {"id", id},
            {"projectId", projectId},
            {"freelancerId", freelancerId},
            {"amount", amount},
            {"proposal", proposal},
            {"status", status},
            {"proposedDeadlineTimestamp", proposedDeadlineTimestamp},
            {"proposedDuration", proposedDuration},
            {"createdAt", createdAt},
            {"respondedAt", respondedAt},
            {"skillMatchScore", skillMatchScore},
            {"timelineScore", timelineScore},
            {"priceValueScore", priceValueScore},
            {"isHighlightedBudgetOption", isHighlightedBudgetOption},
            {"isHighlightedBestValue", isHighlightedBestValue}
        };
    }

    void fromJson(const json& j) {
        if (j.contains("amount")) amount = j["amount"];
        if (j.contains("proposal")) proposal = j["proposal"];
        if (j.contains("proposedDuration")) proposedDuration = j["proposedDuration"];
    }
};

// Inline helper methods
inline bool Project::isOverdue() const {
    auto now = std::time(nullptr);
    return (now > static_cast<time_t>(deadlineTimestamp)) && status != "completed";
}

inline bool Milestone::isOverdue() const {
    auto now = std::time(nullptr);
    return (now > static_cast<time_t>(deadlineTimestamp)) && status != "completed";
}
