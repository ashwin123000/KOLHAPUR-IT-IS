#pragma once

#include <string>
#include <vector>
#include <memory>
#include <optional>
#include "../models/Payment.hpp"
#include "../repositories/PaymentRepository.hpp"

/**
 * @class PaymentService
 * @brief Service layer for payment and escrow management
 * Implements payment processing, escrow management, and financial logic
 */
class PaymentService {
private:
    std::shared_ptr<PaymentRepository> paymentRepository;

public:
    PaymentService(std::shared_ptr<PaymentRepository> repo) : paymentRepository(repo) {}

    virtual ~PaymentService() = default;

    // Payment operations
    bool initiatePayment(Payment& payment);
    bool processPayment(const std::string& paymentId);
    bool completePayment(const std::string& paymentId);
    bool refundPayment(const std::string& paymentId);
    std::optional<Payment> getPaymentDetails(const std::string& paymentId);

    // Escrow management
    bool createEscrowAccount(EscrowAccount& escrow);
    bool releaseEscrowFunds(const std::string& escrowId, double amount);
    bool releaseMilestonePayment(const std::string& projectId, const std::string& milestoneId);
    double getEscrowBalance(const std::string& projectId);
    double getTotalEscrowHeld();

    // Invoice management
    bool generateInvoice(Invoice& invoice);
    bool recordInvoicePayment(const std::string& invoiceId, double amount);
    std::vector<Invoice*> getOutstandingInvoices();
    std::vector<Invoice*> getOverdueInvoices();

    // Financial queries
    double getFreelancerEarnings(const std::string& freelancerId);
    double getClientTotalSpent(const std::string& clientId);
    std::vector<Payment> getPaymentHistory(const std::string& userId);

    // Payment statistics
    int getPendingPaymentCount();
    double getPendingPaymentAmount();
    json getFinancialStatistics();

    // Compliance checks
    bool validatePaymentAmount(double amount);
    bool checkPaymentLimits(const std::string& clientId, double amount);
};

/**
 * @class NotificationService
 * @brief Service layer for notifications and real-time messaging
 * Implements notification delivery, chat, and real-time updates
 */
class NotificationService {
private:
    std::shared_ptr<PaymentRepository> notificationRepository;  // Reusing as it manages notifications

public:
    NotificationService(std::shared_ptr<PaymentRepository> repo) : notificationRepository(repo) {}

    virtual ~NotificationService() = default;

    // Notification management
    bool sendNotification(Notification& notification);
    bool sendNotificationToUser(const std::string& userId, const std::string& title,
                               const std::string& message, const std::string& type);
    std::vector<Notification> getUserNotifications(const std::string& userId, int limit = 50);
    std::vector<Notification> getUnreadNotifications(const std::string& userId);
    bool markNotificationAsRead(const std::string& notificationId);
    bool markAllNotificationsAsRead(const std::string& userId);
    int getUnreadNotificationCount(const std::string& userId);

    // Alert system
    void sendBidNotification(const std::string& clientId, const std::string& bidId);
    void sendMilestoneNotification(const std::string& userId, const std::string& milestoneId);
    void sendPaymentNotification(const std::string& userId, const std::string& paymentId);
    void sendDeadlineReminderNotification(std::string const& projectId);
    void sendFraudAlertNotification(const std::string& adminId, const std::string& userId);

    // Broadcast notifications
    void broadcastToProject(const std::string& projectId, const std::string& message);
    void broadcastToFreelancers(const json& filterCriteria, const std::string& message);

    // Chat/Messaging
    bool addChatRoom(ChatRoom& room);
    bool sendMessage(Message& message);
    std::vector<Message*> getChatMessages(const std::string& chatRoomId, int limit = 100);
    std::vector<Message*> getChatMessagesPaginated(const std::string& chatRoomId, int page, int pageSize);
    std::optional<ChatRoom*> getProjectChatRoom(const std::string& projectId);
    bool markMessageAsRead(const std::string& messageId);
    std::vector<std::string> getActiveUsersInChatRoom(const std::string& chatRoomId);

    // Real-time features
    void updateUserActivityStatus(const std::string& chatRoomId, const std::string& userId, bool isActive);
    bool isUserActive(const std::string& chatRoomId, const std::string& userId);
};
