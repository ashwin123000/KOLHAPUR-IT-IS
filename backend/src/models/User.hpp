#pragma once

#include <string>
#include <vector>
#include <algorithm>
#include <nlohmann/json.hpp>
#include <ctime>
#include <sstream>
#include <iomanip>

using json = nlohmann::json;

// ==================== HELPER UTILITIES ====================
inline std::string getCurrentTimestamp() {
    auto now = std::time(nullptr);
    auto tm = *std::localtime(&now);
    std::ostringstream oss;
    oss << std::put_time(&tm, "%Y-%m-%d %H:%M:%S");
    return oss.str();
}

// ==================== USER ROLE ENUM ====================
enum class UserRole {
    FREELANCER,
    CLIENT,
    ADMIN
};

// ==================== BASE USER CLASS ====================
/**
 * @class User
 * @brief Abstract base class for all users in the system
 * Implements encapsulation and abstraction through protected members
 * and pure virtual methods for derived classes to implement
 */
class User {
protected:
    std::string id;
    std::string username;
    std::string email;
    std::string passwordHash;
    std::string phoneNumber;
    std::string profilePhotoUrl;
    std::string bio;
    UserRole role;
    bool isActive;
    double reliabilityScore;  // 0-100
    int totalProjects;
    int completedProjects;
    int failedProjects;
    double averageRating;     // 1-5 stars
    std::string createdAt;
    std::string updatedAt;
    std::string lastActiveAt;

public:
    User() : isActive(true), reliabilityScore(100.0), totalProjects(0), 
             completedProjects(0), failedProjects(0), averageRating(0.0) {
        createdAt = getCurrentTimestamp();
        updatedAt = getCurrentTimestamp();
        lastActiveAt = getCurrentTimestamp();
    }

    virtual ~User() = default;

    // Getters (Encapsulation)
    std::string getId() const { return id; }
    std::string getUsername() const { return username; }
    std::string getEmail() const { return email; }
    std::string getPasswordHash() const { return passwordHash; }
    std::string getPhoneNumber() const { return phoneNumber; }
    std::string getProfilePhotoUrl() const { return profilePhotoUrl; }
    std::string getBio() const { return bio; }
    UserRole getRole() const { return role; }
    bool getIsActive() const { return isActive; }
    double getReliabilityScore() const { return reliabilityScore; }
    int getTotalProjects() const { return totalProjects; }
    int getCompletedProjects() const { return completedProjects; }
    int getFailedProjects() const { return failedProjects; }
    double getAverageRating() const { return averageRating; }
    std::string getCreatedAt() const { return createdAt; }
    std::string getUpdatedAt() const { return updatedAt; }
    std::string getLastActiveAt() const { return lastActiveAt; }

    // Setters (Encapsulation)
    void setId(const std::string& _id) { id = _id; updateTimestamp(); }
    void setUsername(const std::string& _username) { username = _username; updateTimestamp(); }
    void setEmail(const std::string& _email) { email = _email; updateTimestamp(); }
    void setPhoneNumber(const std::string& _phone) { phoneNumber = _phone; updateTimestamp(); }
    void setProfilePhotoUrl(const std::string& _url) { profilePhotoUrl = _url; updateTimestamp(); }
    void setBio(const std::string& _bio) { bio = _bio; updateTimestamp(); }
    void setIsActive(bool _active) { isActive = _active; lastActiveAt = getCurrentTimestamp(); updateTimestamp(); }
    void setPasswordHash(const std::string& _hash) { passwordHash = _hash; updateTimestamp(); }
    void setAverageRating(double _rating) { averageRating = _rating; updateTimestamp(); }

    // Protected helper methods
    void updateTimestamp() { updatedAt = getCurrentTimestamp(); }
    void updateLastActive() { lastActiveAt = getCurrentTimestamp(); }

    // Business logic methods
    void incrementTotalProjects() { totalProjects++; updateTimestamp(); }
    void incrementCompletedProjects() { completedProjects++; updateTimestamp(); }
    void incrementFailedProjects() { failedProjects++; updateTimestamp(); }
    void addRating(double rating) {
        if (rating < 1.0) rating = 1.0;
        if (rating > 5.0) rating = 5.0;
        averageRating = (averageRating * completedProjects + rating) / (completedProjects + 1);
        updateTimestamp();
    }

    // Virtual methods (Abstraction)
    virtual json toJson() const {
        return {
            {"id", id},
            {"username", username},
            {"email", email},
            {"role", role == UserRole::CLIENT ? "CLIENT" : "FREELANCER"},
            {"phoneNumber", phoneNumber},
            {"profilePhotoUrl", profilePhotoUrl},
            {"bio", bio},
            {"isActive", isActive},
            {"reliabilityScore", reliabilityScore},
            {"totalProjects", totalProjects},
            {"completedProjects", completedProjects},
            {"failedProjects", failedProjects},
            {"averageRating", averageRating},
            {"createdAt", createdAt},
            {"updatedAt", updatedAt},
            {"lastActiveAt", lastActiveAt}
        };
    }

    virtual void fromJson(const json& j) {
        if (j.contains("username")) username = j["username"];
        if (j.contains("email")) email = j["email"];
        if (j.contains("phoneNumber")) phoneNumber = j["phoneNumber"];
        if (j.contains("profilePhotoUrl")) profilePhotoUrl = j["profilePhotoUrl"];
        if (j.contains("bio")) bio = j["bio"];
        if (j.contains("passwordHash")) passwordHash = j["passwordHash"];
    }

    virtual std::string getType() const = 0;
};

// ==================== CLIENT CLASS ====================
/**
 * @class Client
 * @brief Derived class representing a client user
 * Encapsulates client-specific business logic and attributes
 */
class Client : public User {
private:
    std::string companyName;
    std::string companyWebsite;
    std::string industry;
    int verificationLevel;    // 0 = none, 1 = email, 2 = payment, 3 = full
    double totalSpent;
    std::vector<std::string> projectIds;
    double averageProjectBudget;
    int paymentDelays;
    int successfulProjects;
    int disputeHistory;
    std::string fraudFlag;    // "trusted", "risky", "flagged"

public:
    Client() : verificationLevel(0), totalSpent(0.0), averageProjectBudget(0.0),
               paymentDelays(0), successfulProjects(0), disputeHistory(0),
               fraudFlag("trusted") {
        role = UserRole::CLIENT;
        reliabilityScore = 50.0;
    }

    virtual ~Client() = default;

    // Getters (Encapsulation)
    std::string getCompanyName() const { return companyName; }
    std::string getCompanyWebsite() const { return companyWebsite; }
    std::string getIndustry() const { return industry; }
    int getVerificationLevel() const { return verificationLevel; }
    double getTotalSpent() const { return totalSpent; }
    std::vector<std::string> getProjectIds() const { return projectIds; }
    double getAverageProjectBudget() const { return averageProjectBudget; }
    int getPaymentDelays() const { return paymentDelays; }
    int getSuccessfulProjects() const { return successfulProjects; }
    int getDisputeHistory() const { return disputeHistory; }
    std::string getFraudFlag() const { return fraudFlag; }

    // Setters (Encapsulation)
    void setCompanyName(const std::string& _name) { companyName = _name; updateTimestamp(); }
    void setCompanyWebsite(const std::string& _website) { companyWebsite = _website; updateTimestamp(); }
    void setIndustry(const std::string& _industry) { industry = _industry; updateTimestamp(); }
    void setVerificationLevel(int _level) { verificationLevel = _level; updateTimestamp(); }
    void setFraudFlag(const std::string& _flag) { fraudFlag = _flag; updateTimestamp(); }
    void incrementPaymentDelays() { paymentDelays++; updateReliabilityScore(); updateTimestamp(); }
    void incrementSuccessfulProjects() { successfulProjects++; updateReliabilityScore(); updateTimestamp(); }
    void incrementDisputeHistory() { disputeHistory++; updateReliabilityScore(); updateTimestamp(); }

    // Business logic methods
    void addProject(const std::string& projectId) {
        projectIds.push_back(projectId);
        incrementTotalProjects();
    }

    void addSpent(double amount) {
        totalSpent += amount;
        if (completedProjects > 0) {
            averageProjectBudget = totalSpent / completedProjects;
        }
        updateTimestamp();
    }

    bool isVerifiedClient() const { return verificationLevel >= 2; }
    bool isTrustedClient() const { return fraudFlag == "trusted" && paymentDelays <= 2; }

    void updateReliabilityScore() {
        reliabilityScore = 50.0;  // Base score
        reliabilityScore += (successfulProjects * 10.0);  // +10 per successful project
        reliabilityScore -= (paymentDelays * 15.0);       // -15 per payment delay
        reliabilityScore -= (disputeHistory * 20.0);      // -20 per dispute
        if (verificationLevel >= 2) reliabilityScore += 15.0;  // +15 if verified
        if (fraudFlag == "flagged") reliabilityScore -= 50.0;  // Heavy penalty if flagged
        
        if (reliabilityScore < 0.0) reliabilityScore = 0.0;
        if (reliabilityScore > 100.0) reliabilityScore = 100.0;
    }

    // Virtual methods
    virtual json toJson() const override {
        json j = User::toJson();
        j["companyName"] = companyName;
        j["companyWebsite"] = companyWebsite;
        j["industry"] = industry;
        j["verificationLevel"] = verificationLevel;
        j["totalSpent"] = totalSpent;
        j["projectIds"] = projectIds;
        j["averageProjectBudget"] = averageProjectBudget;
        j["paymentDelays"] = paymentDelays;
        j["successfulProjects"] = successfulProjects;
        j["disputeHistory"] = disputeHistory;
        j["fraudFlag"] = fraudFlag;
        return j;
    }

    virtual void fromJson(const json& j) override {
        User::fromJson(j);
        if (j.contains("companyName")) companyName = j["companyName"];
        if (j.contains("companyWebsite")) companyWebsite = j["companyWebsite"];
        if (j.contains("industry")) industry = j["industry"];
        if (j.contains("verificationLevel")) verificationLevel = j["verificationLevel"];
    }

    virtual std::string getType() const override { return "CLIENT"; }
};

// ==================== FREELANCER CLASS ====================
/**
 * @class Freelancer
 * @brief Derived class representing a freelancer user
 * Encapsulates freelancer-specific business logic and attributes
 */
class Freelancer : public User {
private:
    std::vector<std::string> skills;
    std::vector<std::string> portfolio;
    std::string collegeName;
    int studyYear;
    bool isVerified;
    int fraudDetectionFlag;  // 0 = clean, 1 = suspicious, 2 = flagged
    std::vector<std::string> completedProjectIds;
    double hourlyRate;
    int deadlinesMet;
    int deadlinesMissed;
    int incompleteProjects;
    double totalEarnings;
    int experienceLevel;     // 1-5
    int activityScore;       // 0-100

public:
    Freelancer() : studyYear(1), isVerified(false), fraudDetectionFlag(0),
                   hourlyRate(0.0), deadlinesMet(0), deadlinesMissed(0),
                   incompleteProjects(0), totalEarnings(0.0), experienceLevel(1),
                   activityScore(100) {
        role = UserRole::FREELANCER;
        reliabilityScore = 100.0;
    }

    virtual ~Freelancer() = default;

    // Getters (Encapsulation)
    std::vector<std::string> getSkills() const { return skills; }
    std::vector<std::string> getPortfolio() const { return portfolio; }
    std::string getCollegeName() const { return collegeName; }
    int getStudyYear() const { return studyYear; }
    bool getIsVerified() const { return isVerified; }
    int getFraudDetectionFlag() const { return fraudDetectionFlag; }
    std::vector<std::string> getCompletedProjectIds() const { return completedProjectIds; }
    double getHourlyRate() const { return hourlyRate; }
    int getDeadlinesMet() const { return deadlinesMet; }
    int getDeadlinesMissed() const { return deadlinesMissed; }
    int getIncompleteProjects() const { return incompleteProjects; }
    double getTotalEarnings() const { return totalEarnings; }
    int getExperienceLevel() const { return experienceLevel; }
    int getActivityScore() const { return activityScore; }

    // Setters (Encapsulation)
    void setSkills(const std::vector<std::string>& _skills) { skills = _skills; updateTimestamp(); }
    void addSkill(const std::string& skill) { skills.push_back(skill); updateTimestamp(); }
    void removeSkill(const std::string& skill);
    void setPortfolio(const std::vector<std::string>& _portfolio) { portfolio = _portfolio; updateTimestamp(); }
    void setCollegeName(const std::string& _name) { collegeName = _name; updateTimestamp(); }
    void setStudyYear(int _year) { studyYear = _year; updateTimestamp(); }
    void setIsVerified(bool _verified) { isVerified = _verified; updateTimestamp(); }
    void setFraudDetectionFlag(int _flag) { fraudDetectionFlag = _flag; updateTimestamp(); }
    void setHourlyRate(double _rate) { hourlyRate = _rate; updateTimestamp(); }
    void setExperienceLevel(int _level) { experienceLevel = _level; updateTimestamp(); }
    void setActivityScore(int _score) { activityScore = _score; updateTimestamp(); }

    // Business logic methods
    void addCompletedProject(const std::string& projectId) {
        completedProjectIds.push_back(projectId);
        incrementCompletedProjects();
        updateReliabilityScore();
    }

    void addIncompleteProject() {
        incompleteProjects++;
        incrementFailedProjects();
        updateReliabilityScore();
    }

    void recordDeadlineMet() {
        deadlinesMet++;
        updateReliabilityScore();
    }

    void recordDeadlineMissed() {
        deadlinesMissed++;
        updateReliabilityScore();
    }

    void addEarnings(double amount) {
        totalEarnings += amount;
        updateTimestamp();
    }

    bool hasSkill(const std::string& skill) const;
    bool isEligible() const {
        return (fraudDetectionFlag == 0) && isVerified && isActive;
    }

    bool isActiveFreelancer() const { return isActive && activityScore >= 70; }

    void updateReliabilityScore() {
        reliabilityScore = 100.0;  // Base score
        reliabilityScore += (deadlinesMet * 5.0);         // +5 per deadline met
        reliabilityScore -= (deadlinesMissed * 15.0);     // -15 per deadline missed
        reliabilityScore -= (incompleteProjects * 20.0);  // -20 per incomplete project
        if (isVerified) reliabilityScore += 15.0;         // +15 if verified
        if (fraudDetectionFlag > 0) reliabilityScore -= (fraudDetectionFlag == 1 ? 25.0 : 50.0);
        
        reliabilityScore *= (activityScore / 100.0);  // Scale by activity
        
        if (reliabilityScore < 0.0) reliabilityScore = 0.0;
        if (reliabilityScore > 100.0) reliabilityScore = 100.0;
    }

    // Virtual methods
    virtual json toJson() const override {
        json j = User::toJson();
        j["skills"] = skills;
        j["portfolio"] = portfolio;
        j["collegeName"] = collegeName;
        j["studyYear"] = studyYear;
        j["isVerified"] = isVerified;
        j["fraudDetectionFlag"] = fraudDetectionFlag;
        j["completedProjectIds"] = completedProjectIds;
        j["hourlyRate"] = hourlyRate;
        j["deadlinesMet"] = deadlinesMet;
        j["deadlinesMissed"] = deadlinesMissed;
        j["incompleteProjects"] = incompleteProjects;
        j["totalEarnings"] = totalEarnings;
        j["experienceLevel"] = experienceLevel;
        j["activityScore"] = activityScore;
        return j;
    }

    virtual void fromJson(const json& j) override {
        User::fromJson(j);
        if (j.contains("skills")) {
            skills.clear();
            for (const auto& skill : j["skills"]) {
                skills.push_back(skill);
            }
        }
        if (j.contains("collegeName")) collegeName = j["collegeName"];
        if (j.contains("studyYear")) studyYear = j["studyYear"];
        if (j.contains("hourlyRate")) hourlyRate = j["hourlyRate"];
    }

    virtual std::string getType() const override { return "FREELANCER"; }
};

// Inline helper method implementation
inline bool Freelancer::hasSkill(const std::string& skill) const {
    for (const auto& s : skills) {
        if (s == skill) return true;
    }
    return false;
}

inline void Freelancer::removeSkill(const std::string& skill) {
    skills.erase(
        std::remove(skills.begin(), skills.end(), skill),
        skills.end()
    );
    updateTimestamp();
}
