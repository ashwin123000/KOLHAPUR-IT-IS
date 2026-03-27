#pragma once

#include <string>
#include <vector>
#include <memory>
#include <optional>
#include <algorithm>
#include "../models/User.hpp"
#include "../repositories/UserRepository.hpp"

/**
 * @class UserService
 * @brief Service layer for user-related business logic
 * Implements authentication, profile management, and user analytics
 * No direct database access - delegates to UserRepository
 */
class UserService {
private:
    std::shared_ptr<UserRepository> userRepository;

public:
    UserService(std::shared_ptr<UserRepository> repo) : userRepository(repo) {}

    virtual ~UserService() = default;

    // Authentication
    bool registerFreelancer(const Freelancer& freelancer);
    bool registerClient(const Client& client);
    std::optional<User*> login(const std::string& email, const std::string& password);
    
    // User profile management
    bool updateUserProfile(const std::string& userId, const json& profileData);
    std::optional<User*> getUserProfile(const std::string& userId);
    bool updateUserStatus(const std::string& userId, bool isActive);

    // Freelancer-specific operations
    std::vector<Freelancer*> findFreelancersBySkill(const std::string& skill);
    std::vector<Freelancer*> findEligibleFreelancers(double minReliability = 70.0);
    std::vector<Freelancer*> findActiveFreelancers();
    bool updateFreelancerReliabilityScore(const std::string& freelancerId);
    bool flagFreelancerForFraud(const std::string& freelancerId, int flagLevel);

    // Client-specific operations
    bool updateClientReliabilityScore(const std::string& clientId);
    std::vector<Client*> findTrustedClients();

    // Rating and reviews
    bool addRatingToUser(const std::string& userId, double rating);
    double getAverageRating(const std::string& userId);

    // Activity tracking
    void recordActivity(const std::string& userId);  // Update lastActiveAt
    std::vector<Freelancer*> getFreelancersActiveInLast(int days);

    // Search and filter
    std::vector<User*> searchUsers(const std::string& keyword);
    std::vector<Freelancer*> filterFreelancers(const json& filterCriteria);

    // Statistics
    json getUserStatistics(const std::string& userId);
    json getSystemStatistics();
};

/**
 * @class AuthService
 * @brief Dedicated service for authentication and authorization
 * Handles JWT token generation and validation
 */
class AuthService {
private:
    std::shared_ptr<UserRepository> userRepository;
    std::string jwtSecret;

public:
    AuthService(std::shared_ptr<UserRepository> repo, const std::string& secret = "default_secret_key")
        : userRepository(repo), jwtSecret(secret) {}

    // Authentication
    std::string generateJWT(const std::string& userId, const std::string& role);
    std::optional<std::string> validateAndExtractUserId(const std::string& token);
    bool verifyPassword(const std::string& plainPassword, const std::string& hash);
    std::string hashPassword(const std::string& password);

    // Authorization
    bool hasRole(const std::string& token, const std::string& requiredRole);
    bool hasPermission(const std::string& userId, const std::string& resource, const std::string& action);
};
