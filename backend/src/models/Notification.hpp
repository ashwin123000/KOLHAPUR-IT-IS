#pragma once

#include <string>
#include <vector>
#include <nlohmann/json.hpp>
#include <ctime>

using json = nlohmann::json;

// ==================== NOTIFICATION CLASS ====================
/**
 * @class Notification
 * @brief Represents a notification entity
 * Encapsulates notification-specific data and behavior
 */
class Notification {
private:
    std::string id;
    std::string userId;
    std::string title;
    std::string message;
    std::string type;              // "bid", "milestone", "payment", "deadline", "message", "system"
    std::string relatedEntityId;   // project/bid/payment id
    std::string relatedEntityType; // "project", "bid", "payment", etc.
    bool isRead;
    long long createdAt;
    std::string actionUrl;

public:
    Notification() : isRead(false), createdAt(std::time(nullptr)) {}

    virtual ~Notification() = default;

    // Getters
    std::string getId() const { return id; }
    std::string getUserId() const { return userId; }
    std::string getTitle() const { return title; }
    std::string getMessage() const { return message; }
    std::string getType() const { return type; }
    std::string getRelatedEntityId() const { return relatedEntityId; }
    std::string getRelatedEntityType() const { return relatedEntityType; }
    bool getIsRead() const { return isRead; }
    long long getCreatedAt() const { return createdAt; }
    std::string getActionUrl() const { return actionUrl; }

    // Setters
    void setId(const std::string& _id) { id = _id; }
    void setUserId(const std::string& _userId) { userId = _userId; }
    void setTitle(const std::string& _title) { title = _title; }
    void setMessage(const std::string& _message) { message = _message; }
    void setType(const std::string& _type) { type = _type; }
    void setRelatedEntityId(const std::string& _id) { relatedEntityId = _id; }
    void setRelatedEntityType(const std::string& _type) { relatedEntityType = _type; }
    void setActionUrl(const std::string& _url) { actionUrl = _url; }

    // Business logic
    void markAsRead() { isRead = true; }

    json toJson() const {
        return {
            {"id", id},
            {"userId", userId},
            {"title", title},
            {"message", message},
            {"type", type},
            {"relatedEntityId", relatedEntityId},
            {"relatedEntityType", relatedEntityType},
            {"isRead", isRead},
            {"createdAt", createdAt},
            {"actionUrl", actionUrl}
        };
    }

    void fromJson(const json& j) {
        if (j.contains("title")) title = j["title"];
        if (j.contains("message")) message = j["message"];
        if (j.contains("type")) type = j["type"];
    }
};

// ==================== MESSAGE CLASS ====================
/**
 * @class Message
 * @brief Represents a message in a chat
 * Encapsulates message-specific data
 */
class Message {
private:
    std::string id;
    std::string chatRoomId;
    std::string senderId;
    std::string content;
    long long sentAt;
    bool isRead;
    std::string attachmentUrl;
    std::string messageType;       // "text", "file", "image", "system"

public:
    Message() : sentAt(std::time(nullptr)), isRead(false), messageType("text") {}

    virtual ~Message() = default;

    // Getters
    std::string getId() const { return id; }
    std::string getChatRoomId() const { return chatRoomId; }
    std::string getSenderId() const { return senderId; }
    std::string getContent() const { return content; }
    long long getSentAt() const { return sentAt; }
    bool getIsRead() const { return isRead; }
    std::string getAttachmentUrl() const { return attachmentUrl; }
    std::string getMessageType() const { return messageType; }

    // Setters
    void setId(const std::string& _id) { id = _id; }
    void setChatRoomId(const std::string& _roomId) { chatRoomId = _roomId; }
    void setSenderId(const std::string& _senderId) { senderId = _senderId; }
    void setContent(const std::string& _content) { content = _content; }
    void setAttachmentUrl(const std::string& _url) { attachmentUrl = _url; }
    void setMessageType(const std::string& _type) { messageType = _type; }

    // Business logic
    void markAsRead() { isRead = true; }

    json toJson() const {
        return {
            {"id", id},
            {"chatRoomId", chatRoomId},
            {"senderId", senderId},
            {"content", content},
            {"sentAt", sentAt},
            {"isRead", isRead},
            {"attachmentUrl", attachmentUrl},
            {"messageType", messageType}
        };
    }

    void fromJson(const json& j) {
        if (j.contains("content")) content = j["content"];
        if (j.contains("attachmentUrl")) attachmentUrl = j["attachmentUrl"];
    }
};

// ==================== CHAT ROOM CLASS ====================
/**
 * @class ChatRoom
 * @brief Represents a chat room for project communication
 * Encapsulates chat room-specific attributes
 */
class ChatRoom {
private:
    std::string id;
    std::string projectId;
    std::string clientId;
    std::string freelancerId;
    std::vector<std::string> participantIds;
    std::string lastMessageId;
    long long lastMessageTime;
    long long createdAt;
    bool isActive;

public:
    ChatRoom() : lastMessageTime(0), createdAt(std::time(nullptr)), isActive(true) {}

    virtual ~ChatRoom() = default;

    // Getters
    std::string getId() const { return id; }
    std::string getProjectId() const { return projectId; }
    std::string getClientId() const { return clientId; }
    std::string getFreelancerId() const { return freelancerId; }
    std::vector<std::string> getParticipantIds() const { return participantIds; }
    std::string getLastMessageId() const { return lastMessageId; }
    long long getLastMessageTime() const { return lastMessageTime; }
    long long getCreatedAt() const { return createdAt; }
    bool getIsActive() const { return isActive; }

    // Setters
    void setId(const std::string& _id) { id = _id; }
    void setProjectId(const std::string& _projectId) { projectId = _projectId; }
    void setClientId(const std::string& _clientId) { clientId = _clientId; }
    void setFreelancerId(const std::string& _freelancerId) { freelancerId = _freelancerId; }
    void setLastMessageId(const std::string& _id) {
        lastMessageId = _id;
        lastMessageTime = std::time(nullptr);
    }
    void setIsActive(bool _active) { isActive = _active; }

    // Business logic
    void addParticipant(const std::string& userId) {
        for (const auto& id : participantIds) {
            if (id == userId) return;  // Already exists
        }
        participantIds.push_back(userId);
    }

    bool hasParticipant(const std::string& userId) const {
        for (const auto& id : participantIds) {
            if (id == userId) return true;
        }
        return false;
    }

    json toJson() const {
        return {
            {"id", id},
            {"projectId", projectId},
            {"clientId", clientId},
            {"freelancerId", freelancerId},
            {"participantIds", participantIds},
            {"lastMessageId", lastMessageId},
            {"lastMessageTime", lastMessageTime},
            {"createdAt", createdAt},
            {"isActive", isActive}
        };
    }

    void fromJson(const json& j) {
        if (j.contains("projectId")) projectId = j["projectId"];
        if (j.contains("clientId")) clientId = j["clientId"];
        if (j.contains("freelancerId")) freelancerId = j["freelancerId"];
    }
};
