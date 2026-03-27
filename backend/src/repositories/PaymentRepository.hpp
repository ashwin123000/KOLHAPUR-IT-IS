#pragma once

#include "IRepository.hpp"
#include "../models/Payment.hpp"
#include "../models/Notification.hpp"

/**
 * @class PaymentRepository
 * @brief Repository for Payment, EscrowAccount, and Invoice entities
 * Implements CRUD and query operations for payment-related entities
 */
class PaymentRepository : public BaseRepository<Payment> {
private:
    std::vector<EscrowAccount*> escrowStorage;
    std::vector<Invoice*> invoiceStorage;

public:
    PaymentRepository() = default;
    virtual ~PaymentRepository() {
        for (auto ptr : escrowStorage) delete ptr;
        for (auto ptr : invoiceStorage) delete ptr;
    }

    // Payment-specific queries
    std::vector<Payment> getPaymentsByProject(const std::string& projectId);
    std::vector<Payment> getPaymentsByClient(const std::string& clientId);
    std::vector<Payment> getPaymentsByFreelancer(const std::string& freelancerId);
    std::vector<Payment> getPaymentsByStatus(const std::string& status);
    double getTotalPaymentsForProject(const std::string& projectId);
    double getFreelancerEarnings(const std::string& freelancerId);

    // Escrow Account operations
    bool addEscrowAccount(const EscrowAccount& escrow);
    std::optional<EscrowAccount*> getEscrowAccountById(const std::string& id);
    std::optional<EscrowAccount*> getEscrowByProject(const std::string& projectId);
    bool updateEscrowAccount(const EscrowAccount& escrow);
    bool releaseEscrowFunds(const std::string& escrowId, double amount);

    // Invoice operations
    bool addInvoice(const Invoice& invoice);
    std::optional<Invoice*> getInvoiceById(const std::string& id);
    std::vector<Invoice*> getInvoicesByProject(const std::string& projectId);
    std::vector<Invoice*> getInvoicesByFreelancer(const std::string& freelancerId);
    std::vector<Invoice*> getOutstandingInvoices(); // Unpaid invoices
    bool recordInvoicePayment(const std::string& invoiceId, double amount);

    // Statistics
    double getTotalRevenueCollected();
    double getTotalEscrowHeld();
    int getPendingPaymentCount();
};

/**
 * @class NotificationRepository
 * @brief Repository for Notification, Message, and ChatRoom entities
 * Implements CRUD and query operations for communication entities
 */
class NotificationRepository : public BaseRepository<Notification> {
private:
    std::vector<Message*> messageStorage;
    std::vector<ChatRoom*> chatRoomStorage;

public:
    NotificationRepository() = default;
    virtual ~NotificationRepository() {
        for (auto ptr : messageStorage) delete ptr;
        for (auto ptr : chatRoomStorage) delete ptr;
    }

    // Notification-specific queries
    std::vector<Notification> getNotificationsByUser(const std::string& userId);
    std::vector<Notification> getUnreadNotificationsByUser(const std::string& userId);
    int getUnreadNotificationCount(const std::string& userId);
    bool markNotificationAsRead(const std::string& notificationId);
    bool markAllNotificationsAsRead(const std::string& userId);

    // Message operations
    bool addMessage(const Message& message);
    std::optional<Message*> getMessageById(const std::string& id);
    std::vector<Message*> getMessagesByChatRoom(const std::string& chatRoomId);
    std::vector<Message*> getMessagesByChatRoomPaginated(const std::string& chatRoomId, int page, int pageSize);
    bool markMessageAsRead(const std::string& messageId);

    // ChatRoom operations
    bool addChatRoom(const ChatRoom& room);
    std::optional<ChatRoom*> getChatRoomById(const std::string& id);
    std::optional<ChatRoom*> getChatRoomByProject(const std::string& projectId);
    std::vector<ChatRoom*> getChatRoomsByUser(const std::string& userId);
    bool addParticipantToChatRoom(const std::string& chatRoomId, const std::string& userId);
    bool updateLastMessage(const std::string& chatRoomId, const std::string& messageId);

    // Active users tracking
    std::vector<std::string> getActiveUsersInChatRoom(const std::string& chatRoomId);
    bool markUserActive(const std::string& chatRoomId, const std::string& userId);
};
