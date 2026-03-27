#pragma once

#include <string>
#include <vector>
#include <memory>
#include <algorithm>
#include "../models/User.hpp"
#include "../models/Project.hpp"

/**
 * @class SkillAnalyzer
 * @brief Analyzes skill matches between freelancers and projects
 * Implements Strategy pattern for skill matching
 */
class SkillAnalyzer {
public:
    virtual ~SkillAnalyzer() = default;

    // Calculates how many required skills a freelancer has
    int countMatchingSkills(const std::vector<std::string>& requiredSkills,
                           const std::vector<std::string>& freelancerSkills) {
        int count = 0;
        for (const auto& req : requiredSkills) {
            if (std::find(freelancerSkills.begin(), freelancerSkills.end(), req) != freelancerSkills.end()) {
                count++;
            }
        }
        return count;
    }

    // Returns skill match percentage (0-100)
    double calculateSkillMatchPercentage(const std::vector<std::string>& requiredSkills,
                                         const std::vector<std::string>& freelancerSkills) {
        if (requiredSkills.empty()) return 100.0;
        int matched = countMatchingSkills(requiredSkills, freelancerSkills);
        return (static_cast<double>(matched) / requiredSkills.size()) * 100.0;
    }

    // Determines if freelancer meets minimum skill requirements
    bool meetsMinimumSkillRequirements(const std::vector<std::string>& requiredSkills,
                                       const std::vector<std::string>& freelancerSkills,
                                       double minimumMatch = 0.5) {  // 50% match required
        double matchPercentage = calculateSkillMatchPercentage(requiredSkills, freelancerSkills);
        return matchPercentage >= (minimumMatch * 100.0);
    }
};

/**
 * @class ReliabilityCalculator
 * @brief Calculates freelancer reliability and eligibility
 * Implements Strategy pattern for reliability scoring
 */
class ReliabilityCalculator {
public:
    virtual ~ReliabilityCalculator() = default;

    // Calculates reliability score based on past performance
    double calculateReliabilityScore(const Freelancer& freelancer) {
        double score = 100.0;  // Base score
        
        // Add points for deadlines met
        score += (freelancer.getDeadlinesMet() * 2.0);
        
        // Subtract points for deadlines missed
        score -= (freelancer.getDeadlinesMissed() * 15.0);
        
        // Subtract for incomplete projects
        score -= (freelancer.getIncompleteProjects() * 20.0);
        
        // Verification bonus
        if (freelancer.getIsVerified()) {
            score += 15.0;
        }
        
        // Fraud flag penalty
        if (freelancer.getFraudDetectionFlag() > 0) {
            score -= (freelancer.getFraudDetectionFlag() * 25.0);
        }
        
        // Bound the score
        if (score < 0.0) score = 0.0;
        if (score > 100.0) score = 100.0;
        
        return score;
    }

    // Determines if freelancer is eligible for a project
    bool isEligibleForProject(const Freelancer& freelancer, const Project& project) {
        // Check fraud flag
        if (freelancer.getFraudDetectionFlag() > 0) {
            return false;
        }
        
        // Check verification status
        if (!freelancer.getIsVerified()) {
            return false;
        }
        
        // Check college requirement
        if (project.getRequiredSkills().size() > 0) {
            SkillAnalyzer analyzer;
            if (!analyzer.meetsMinimumSkillRequirements(project.getRequiredSkills(), 
                                                       freelancer.getSkills(), 0.5)) {
                return false;
            }
        }
        
        return true;
    }

    // Returns eligibility status with reasons
    std::pair<bool, std::string> getEligibilityStatus(const Freelancer& freelancer,
                                                       const Project& project) {
        if (freelancer.getFraudDetectionFlag() > 0) {
            return {false, "Freelancer flagged for fraud"};
        }
        if (!freelancer.getIsVerified()) {
            return {false, "Freelancer not verified"};
        }
        if (freelancer.getReliabilityScore() < 50.0) {
            return {false, "Reliability score too low"};
        }
        return {true, "Eligible"};
    }

    // Checks for fraud flags
    bool isFraudFlagged(const Freelancer& freelancer) {
        return freelancer.getFraudDetectionFlag() > 0;
    }

    // Checks verification status
    bool isVerified(const Freelancer& freelancer) {
        return freelancer.getIsVerified();
    }

    // Checks active status
    bool isActive(const Freelancer& freelancer) {
        return freelancer.getIsActive();
    }
};

/**
 * @class MatchScore
 * @brief Encapsulates a match score for a freelancer-project pair
 */
struct MatchScore {
    std::string freelancerId;
    double skillScore;            // 0-100
    double reliabilityScore;      // 0-100
    double activityScore;         // 0-100
    double overallScore;          // 0-100 (weighted average)
    bool isEligible;
    std::string eligibilityReason;

    json toJson() const {
        return {
            {"freelancerId", freelancerId},
            {"skillScore", skillScore},
            {"reliabilityScore", reliabilityScore},
            {"activityScore", activityScore},
            {"overallScore", overallScore},
            {"isEligible", isEligible},
            {"eligibilityReason", eligibilityReason}
        };
    }
};

/**
 * @class MatchingEngine
 * @brief AI-powered matching system for freelancers and projects
 * Core system for matching freelancers to projects
 * Uses Strategy pattern for skill analysis and reliability calculation
 */
class MatchingEngine {
private:
    std::unique_ptr<SkillAnalyzer> skillAnalyzer;
    std::unique_ptr<ReliabilityCalculator> reliabilityCalculator;

    // Weighting factors for overall score calculation
    static constexpr double SKILL_WEIGHT = 0.40;
    static constexpr double RELIABILITY_WEIGHT = 0.35;
    static constexpr double ACTIVITY_WEIGHT = 0.25;

public:
    MatchingEngine()
        : skillAnalyzer(std::make_unique<SkillAnalyzer>()),
          reliabilityCalculator(std::make_unique<ReliabilityCalculator>()) {}

    virtual ~MatchingEngine() = default;

    // Core matching algorithm
    MatchScore calculateMatchScore(const Freelancer& freelancer, const Project& project) {
        MatchScore score;
        score.freelancerId = freelancer.getId();
        
        // Calculate component scores
        score.skillScore = calculateSkillScore(freelancer, project);
        score.reliabilityScore = calculateReliabilityScore(freelancer);
        score.activityScore = calculateActivityScore(freelancer);
        
        // Calculate overall weighted score
        score.overallScore = (score.skillScore * SKILL_WEIGHT + 
                             score.reliabilityScore * RELIABILITY_WEIGHT + 
                             score.activityScore * ACTIVITY_WEIGHT);
        
        // Check eligibility
        auto [eligible, reason] = reliabilityCalculator->getEligibilityStatus(freelancer, project);
        score.isEligible = eligible;
        score.eligibilityReason = reason;
        
        // If not eligible, overall score is 0
        if (!score.isEligible) {
            score.overallScore = 0.0;
        }
        
        return score;
    }

    // Match score components (for transparency)
    double calculateSkillScore(const Freelancer& freelancer, const Project& project) {
        return skillAnalyzer->calculateSkillMatchPercentage(project.getRequiredSkills(), 
                                                           freelancer.getSkills());
    }

    double calculateReliabilityScore(const Freelancer& freelancer) {
        return reliabilityCalculator->calculateReliabilityScore(freelancer);
    }

    double calculateActivityScore(const Freelancer& freelancer) {
        return static_cast<double>(freelancer.getActivityScore());
    }

    // Fraud and risk detection
    bool isFraudRisk(const Freelancer& freelancer) {
        return reliabilityCalculator->isFraudFlagged(freelancer);
    }

    bool wouldExceedContractorBudgetLimit(const Freelancer& freelancer, double projectBudget) {
        // Freelancer can't work on projects where pay is less than their hourly rate
        if (freelancer.getHourlyRate() > 0 && projectBudget > 0) {
            return projectBudget < (freelancer.getHourlyRate() * 40);  // Assuming 40 hour project
        }
        return false;
    }

    // Skill gap report for transparency
    json getSkillGapReport(const Freelancer& freelancer, const Project& project) {
        std::vector<std::string> matched;
        std::vector<std::string> missing;
        
        for (const auto& req : project.getRequiredSkills()) {
            if (freelancer.hasSkill(req)) {
                matched.push_back(req);
            } else {
                missing.push_back(req);
            }
        }
        
        double matchPercentage = project.getRequiredSkills().empty() ? 100.0 :
            (static_cast<double>(matched.size()) / project.getRequiredSkills().size()) * 100.0;
        
        MatchScore score = calculateMatchScore(freelancer, project);
        
        return {
            {"freelancerId", freelancer.getId},
            {"matchedSkills", matched},
            {"missingSkills", missing},
            {"matchPercentage", matchPercentage},
            {"skillScore", score.skillScore},
            {"reliabilityScore", score.reliabilityScore},
            {"activityScore", score.activityScore},
            {"overallScore", score.overallScore},
            {"isEligible", score.isEligible},
            {"eligibilityReason", score.eligibilityReason}
        };
    }
};
