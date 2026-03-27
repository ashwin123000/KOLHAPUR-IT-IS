#pragma once
#include <string>
#include <ctime>
#include <sstream>
#include <iomanip>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

// Defined here so BaseModel is self-contained (also defined in User.hpp)
inline std::string getCurrentTimestamp() {
    auto now = std::time(nullptr);
    auto tm = *std::localtime(&now);
    std::ostringstream oss;
    oss << std::put_time(&tm, "%Y-%m-%d %H:%M:%S");
    return oss.str();
}

/**
 * @class BaseModel
 * @brief Abstract base class for all domain models
 * Provides common attributes and methods for all entities
 */
class BaseModel {
protected:
    std::string id;
    std::string createdAt;
    std::string updatedAt;
    bool isDeleted;

public:
    BaseModel() : isDeleted(false) {
        createdAt = getCurrentTimestamp();
        updatedAt = getCurrentTimestamp();
    }

    virtual ~BaseModel() = default;

    // Getters
    std::string getId() const { return id; }
    std::string getCreatedAt() const { return createdAt; }
    std::string getUpdatedAt() const { return updatedAt; }
    bool getIsDeleted() const { return isDeleted; }

    // Setters
    void setId(const std::string& _id) { id = _id; }
    void markDeleted() { isDeleted = true; updatedAt = getCurrentTimestamp(); }
    void updateTimestamp() { updatedAt = getCurrentTimestamp(); }

    // Pure virtual methods
    virtual json toJson() const = 0;
    virtual void fromJson(const json& j) = 0;
};
