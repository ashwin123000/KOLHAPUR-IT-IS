#pragma once

#include <crow.h>
#include <nlohmann/json.hpp>
#include <memory>
#include "../services/UserService.hpp"
#include "../models/User.hpp"

using json = nlohmann::json;

/**
 * @class AuthController
 * @brief Handles authentication and authorization API endpoints
 * REST endpoints:
 * POST /api/auth/register-freelancer
 * POST /api/auth/register-client
 * POST /api/auth/login
 * POST /api/auth/logout
 * GET  /api/auth/profile
 * PUT  /api/auth/profile
 */
class AuthController {
private:
    std::shared_ptr<UserService> userService;
    std::shared_ptr<AuthService> authService;

public:
    AuthController(std::shared_ptr<UserService> uService, std::shared_ptr<AuthService> aService)
        : userService(uService), authService(aService) {}

    virtual ~AuthController() = default;

    // Register a new freelancer
    crow::response registerFreelancer(const crow::request& req);

    // Register a new client
    crow::response registerClient(const crow::request& req);

    // User login
    crow::response login(const crow::request& req);

    // Get user profile
    crow::response getProfile(const crow::request& req);

    // Update user profile
    crow::response updateProfile(const crow::request& req);

    // Logout
    crow::response logout(const crow::request& req);

    // Mount all routes
    static void mount(crow::App<>& app, std::shared_ptr<UserService> uService,
                     std::shared_ptr<AuthService> aService);
};

/**
 * @class ProjectController
 * @brief Handles project management API endpoints
 * REST endpoints for project CRUD and lifecycle management
 */
class ProjectController {
private:
    std::shared_ptr<ProjectService> projectService;
    std::shared_ptr<BidService> bidService;

public:
    ProjectController(std::shared_ptr<ProjectService> pService,
                     std::shared_ptr<BidService> bService)
        : projectService(pService), bidService(bService) {}

    virtual ~ProjectController() = default;

    // Project endpoints
    crow::response createProject(const crow::request& req);
    crow::response getProject(const crow::request& req, const std::string& projectId);
    crow::response updateProject(const crow::request& req, const std::string& projectId);
    crow::response deleteProject(const crow::request& req, const std::string& projectId);
    crow::response getClientProjects(const crow::request& req, const std::string& clientId);
    crow::response getOpenProjects(const crow::request& req);
    crow::response searchProjects(const crow::request& req);

    // Milestone endpoints
    crow::response addMilestone(const crow::request& req, const std::string& projectId);
    crow::response completeMilestone(const crow::request& req, const std::string& milestoneId);
    crow::response getProjectMilestones(const crow::request& req, const std::string& projectId);

    // Activity log endpoints
    crow::response getActivityTimeline(const crow::request& req, const std::string& projectId);

    // Project status
    crow::response approveProject(const crow::request& req, const std::string& projectId);
    crow::response startProject(const crow::request& req, const std::string& projectId);
    crow::response completeProject(const crow::request& req, const std::string& projectId);

    static void mount(crow::App<>& app, std::shared_ptr<ProjectService> pService,
                     std::shared_ptr<BidService> bService);
};

/**
 * @class BidController
 * @brief Handles bid management API endpoints
 * REST endpoints for bid CRUD and evaluation
 */
class BidController {
private:
    std::shared_ptr<BidService> bidService;

public:
    BidController(std::shared_ptr<BidService> bService) : bidService(bService) {}

    virtual ~BidController() = default;

    crow::response submitBid(const crow::request& req);
    crow::response getBid(const crow::request& req, const std::string& bidId);
    crow::response getProjectBids(const crow::request& req, const std::string& projectId);
    crow::response getFreelancerBids(const crow::request& req, const std::string& freelancerId);
    crow::response acceptBid(const crow::request& req, const std::string& bidId);
    crow::response rejectBid(const crow::request& req, const std::string& bidId);
    crow::response getBidRanking(const crow::request& req, const std::string& projectId);

    static void mount(crow::App<>& app, std::shared_ptr<BidService> bService);
};

/**
 * @class MatchingController
 * @brief Handles freelancer matching API endpoints
 * REST endpoints for AI matching system
 */
class MatchingController {
private:
    std::shared_ptr<MatchingEngine> matchingEngine;

public:
    MatchingController(std::shared_ptr<MatchingEngine> mEngine) : matchingEngine(mEngine) {}

    virtual ~MatchingController() = default;

    crow::response getMatchesForProject(const crow::request& req, const std::string& projectId);
    crow::response getProjectsForFreelancer(const crow::request& req, const std::string& freelancerId);
    crow::response getSkillGapAnalysis(const crow::request& req, const std::string& freelancerId,
                                       const std::string& projectId);

    static void mount(crow::App<>& app, std::shared_ptr<MatchingEngine> mEngine);
};

/**
 * @class PaymentController
 * @brief Handles payment and escrow API endpoints
 * REST endpoints for payment processing
 */
class PaymentController {
private:
    std::shared_ptr<PaymentService> paymentService;

public:
    PaymentController(std::shared_ptr<PaymentService> pService) : paymentService(pService) {}

    virtual ~PaymentController() = default;

    crow::response initiatePayment(const crow::request& req);
    crow::response getPaymentDetails(const crow::request& req, const std::string& paymentId);
    crow::response processPayment(const crow::request& req, const std::string& paymentId);
    crow::response refundPayment(const crow::request& req, const std::string& paymentId);
    crow::response getPaymentHistory(const crow::request& req, const std::string& userId);
    
    // Escrow
    crow::response createEscrowAccount(const crow::request& req);
    crow::response releaseEscrowFunds(const crow::request& req, const std::string& escrowId);
    crow::response getEscrowBalance(const crow::request& req, const std::string& projectId);
    
    // Invoice
    crow::response generateInvoice(const crow::request& req);
    crow::response recordInvoicePayment(const crow::request& req, const std::string& invoiceId);
    crow::response getOutstandingInvoices(const crow::request& req);

    static void mount(crow::App<>& app, std::shared_ptr<PaymentService> pService);
};

/**
 * @class NotificationController
 * @brief Handles notification and messaging API endpoints
 * REST endpoints for real-time notifications and chat
 */
class NotificationController {
private:
    std::shared_ptr<NotificationService> notificationService;

public:
    NotificationController(std::shared_ptr<NotificationService> nService) : notificationService(nService) {}

    virtual ~NotificationController() = default;

    crow::response getUserNotifications(const crow::request& req, const std::string& userId);
    crow::response getUnreadNotifications(const crow::request& req, const std::string& userId);
    crow::response markNotificationAsRead(const crow::request& req, const std::string& notificationId);
    crow::response markAllNotificationsAsRead(const crow::request& req, const std::string& userId);
    crow::response getUnreadCount(const crow::request& req, const std::string& userId);

    // Chat endpoints
    crow::response createChatRoom(const crow::request& req);
    crow::response sendMessage(const crow::request& req);
    crow::response getChatMessages(const crow::request& req, const std::string& chatRoomId);
    crow::response getProjectChatRoom(const crow::request& req, const std::string& projectId);
    crow::response getActiveUsers(const crow::request& req, const std::string& chatRoomId);

    static void mount(crow::App<>& app, std::shared_ptr<NotificationService> nService);
};

