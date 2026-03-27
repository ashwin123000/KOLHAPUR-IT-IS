#pragma once

#include <string>
#include <vector>
#include <nlohmann/json.hpp>
#include <ctime>

using json = nlohmann::json;

// ==================== PAYMENT CLASS ====================
/**
 * @class Payment
 * @brief Represents a payment transaction
 * Encapsulates payment-specific attributes
 */
class Payment {
private:
    std::string id;
    std::string projectId;
    std::string clientId;
    std::string freelancerId;
    double amount;
    std::string status;            // "pending", "processing", "paid", "failed", "refunded"
    std::string paymentMethod;     // "credit_card", "bank_transfer", "escrow"
    long long createdAt;
    long long paidAt;
    long long completionDeadline;
    std::string transactionId;
    std::string description;

public:
    Payment() : amount(0.0), createdAt(std::time(nullptr)), paidAt(0), completionDeadline(0) {}

    virtual ~Payment() = default;

    // Getters
    std::string getId() const { return id; }
    std::string getProjectId() const { return projectId; }
    std::string getClientId() const { return clientId; }
    std::string getFreelancerId() const { return freelancerId; }
    double getAmount() const { return amount; }
    std::string getStatus() const { return status; }
    std::string getPaymentMethod() const { return paymentMethod; }
    long long getCreatedAt() const { return createdAt; }
    long long getPaidAt() const { return paidAt; }
    long long getCompletionDeadline() const { return completionDeadline; }
    std::string getTransactionId() const { return transactionId; }
    std::string getDescription() const { return description; }

    // Setters
    void setId(const std::string& _id) { id = _id; }
    void setProjectId(const std::string& _projectId) { projectId = _projectId; }
    void setClientId(const std::string& _clientId) { clientId = _clientId; }
    void setFreelancerId(const std::string& _freelancerId) { freelancerId = _freelancerId; }
    void setAmount(double _amount) { amount = _amount; }
    void setStatus(const std::string& _status) { status = _status; }
    void setPaymentMethod(const std::string& _method) { paymentMethod = _method; }
    void setPaidAt(long long _timestamp) { paidAt = _timestamp; }
    void setCompletionDeadline(long long _timestamp) { completionDeadline = _timestamp; }
    void setTransactionId(const std::string& _id) { transactionId = _id; }
    void setDescription(const std::string& _desc) { description = _desc; }

    // Business logic
    bool isPending() const { return status == "pending"; }
    bool isProcessing() const { return status == "processing"; }
    bool isPaid() const { return status == "paid"; }
    bool isFailed() const { return status == "failed"; }

    json toJson() const {
        return {
            {"id", id},
            {"projectId", projectId},
            {"clientId", clientId},
            {"freelancerId", freelancerId},
            {"amount", amount},
            {"status", status},
            {"paymentMethod", paymentMethod},
            {"createdAt", createdAt},
            {"paidAt", paidAt},
            {"completionDeadline", completionDeadline},
            {"transactionId", transactionId},
            {"description", description}
        };
    }

    void fromJson(const json& j) {
        if (j.contains("amount")) amount = j["amount"];
        if (j.contains("paymentMethod")) paymentMethod = j["paymentMethod"];
        if (j.contains("description")) description = j["description"];
    }
};

// ==================== ESCROW ACCOUNT CLASS ====================
/**
 * @class EscrowAccount
 * @brief Manages escrow funds for a payment
 * Encapsulates escrow-specific logic
 */
class EscrowAccount {
private:
    std::string id;
    std::string projectId;
    std::string clientId;
    std::string freelancerId;
    double totalAmount;
    double releasedAmount;
    double holdAmount;
    std::string status;            // "active", "released", "disputed", "closed"
    long long createdAt;
    long long releaseDate;
    std::string description;

public:
    EscrowAccount() : totalAmount(0.0), releasedAmount(0.0), holdAmount(0.0),
                      createdAt(std::time(nullptr)), releaseDate(0) {}

    virtual ~EscrowAccount() = default;

    // Getters
    std::string getId() const { return id; }
    std::string getProjectId() const { return projectId; }
    std::string getClientId() const { return clientId; }
    std::string getFreelancerId() const { return freelancerId; }
    double getTotalAmount() const { return totalAmount; }
    double getReleasedAmount() const { return releasedAmount; }
    double getHoldAmount() const { return holdAmount; }
    std::string getStatus() const { return status; }
    long long getCreatedAt() const { return createdAt; }
    long long getReleaseDate() const { return releaseDate; }
    std::string getDescription() const { return description; }

    // Setters
    void setId(const std::string& _id) { id = _id; }
    void setProjectId(const std::string& _projectId) { projectId = _projectId; }
    void setClientId(const std::string& _clientId) { clientId = _clientId; }
    void setFreelancerId(const std::string& _freelancerId) { freelancerId = _freelancerId; }
    void setTotalAmount(double _amount) { totalAmount = _amount; holdAmount = _amount; }
    void setReleaseDate(long long _timestamp) { releaseDate = _timestamp; }
    void setStatus(const std::string& _status) { status = _status; }
    void setDescription(const std::string& _desc) { description = _desc; }

    // Business logic
    bool releasePartial(double amount) {
        if (amount > holdAmount) return false;
        releasedAmount += amount;
        holdAmount -= amount;
        return true;
    }

    bool releaseFull() {
        releasedAmount = totalAmount;
        holdAmount = 0.0;
        status = "released";
        return true;
    }

    json toJson() const {
        return {
            {"id", id},
            {"projectId", projectId},
            {"clientId", clientId},
            {"freelancerId", freelancerId},
            {"totalAmount", totalAmount},
            {"releasedAmount", releasedAmount},
            {"holdAmount", holdAmount},
            {"status", status},
            {"createdAt", createdAt},
            {"releaseDate", releaseDate},
            {"description", description}
        };
    }
};

// ==================== INVOICE CLASS ====================
/**
 * @class Invoice
 * @brief Represents an invoice
 * Encapsulates invoice-specific attributes
 */
class Invoice {
private:
    std::string id;
    std::string projectId;
    std::string freelancerId;
    std::string clientId;
    double totalAmount;
    double amountPaid;
    double amountDue;
    std::string status;            // "draft", "sent", "pending", "paid", "overdue", "cancelled"
    long long invoiceDate;
    long long dueDate;
    long long paidDate;
    std::string description;
    std::vector<std::pair<std::string, double>> lineItems;  // description, amount

public:
    Invoice() : totalAmount(0.0), amountPaid(0.0), amountDue(0.0),
                invoiceDate(std::time(nullptr)), dueDate(0), paidDate(0) {}

    virtual ~Invoice() = default;

    // Getters
    std::string getId() const { return id; }
    std::string getProjectId() const { return projectId; }
    std::string getFreelancerId() const { return freelancerId; }
    std::string getClientId() const { return clientId; }
    double getTotalAmount() const { return totalAmount; }
    double getAmountPaid() const { return amountPaid; }
    double getAmountDue() const { return amountDue; }
    std::string getStatus() const { return status; }
    long long getInvoiceDate() const { return invoiceDate; }
    long long getDueDate() const { return dueDate; }
    long long getPaidDate() const { return paidDate; }
    std::string getDescription() const { return description; }
    std::vector<std::pair<std::string, double>> getLineItems() const { return lineItems; }

    // Setters
    void setId(const std::string& _id) { id = _id; }
    void setProjectId(const std::string& _projectId) { projectId = _projectId; }
    void setFreelancerId(const std::string& _freelancerId) { freelancerId = _freelancerId; }
    void setClientId(const std::string& _clientId) { clientId = _clientId; }
    void setStatus(const std::string& _status) { status = _status; }
    void setDueDate(long long _date) { dueDate = _date; }
    void setDescription(const std::string& _desc) { description = _desc; }

    // Business logic
    void addLineItem(const std::string& description, double amount) {
        lineItems.push_back({description, amount});
        totalAmount += amount;
        amountDue = totalAmount - amountPaid;
    }

    void recordPayment(double amount) {
        amountPaid += amount;
        amountDue = totalAmount - amountPaid;
        if (amountDue <= 0) {
            status = "paid";
            paidDate = std::time(nullptr);
        }
    }

    bool isOverdue() const {
        auto now = std::time(nullptr);
        return (now > dueDate) && status != "paid";
    }

    json toJson() const {
        json items = json::array();
        for (const auto& item : lineItems) {
            items.push_back({{"description", item.first}, {"amount", item.second}});
        }

        return {
            {"id", id},
            {"projectId", projectId},
            {"freelancerId", freelancerId},
            {"clientId", clientId},
            {"totalAmount", totalAmount},
            {"amountPaid", amountPaid},
            {"amountDue", amountDue},
            {"status", status},
            {"invoiceDate", invoiceDate},
            {"dueDate", dueDate},
            {"paidDate", paidDate},
            {"description", description},
            {"lineItems", items}
        };
    }
};
