#pragma once

#include <string>
#include <vector>
#include <memory>
#include <nlohmann/json.hpp>

#if __cplusplus >= 201703L
#include <optional>
#else
#include <experimental/optional>
namespace std {
    using std::experimental::optional;
    using std::experimental::nullopt;
}
#endif

using json = nlohmann::json;

/**
 * @class IRepository
 * @brief Template-based interface for repository pattern
 * Defines CRUD operations for all entities
 * Implements the Repository/DAO pattern for database abstraction
 */
template<typename T>
class IRepository {
public:
    virtual ~IRepository() = default;

    // CRUD Operations
    virtual std::optional<T> getById(const std::string& id) = 0;
    virtual std::vector<T> getAll() = 0;
    virtual bool add(const T& entity) = 0;
    virtual bool update(const T& entity) = 0;
    virtual bool deleteById(const std::string& id) = 0;
    virtual std::vector<T> findBy(const std::string& field, const std::string& value) = 0;
    virtual int count() = 0;
};

/**
 * @class BaseRepository
 * @brief Base implementation of repository pattern
 * Provides in-memory storage (for development/testing)
 * In production, would extend with database drivers
 */
template<typename T>
class BaseRepository : public IRepository<T> {
protected:
    std::vector<T> storage;
    int nextId;

public:
    BaseRepository() : nextId(1) {}

    virtual ~BaseRepository() = default;

    virtual std::optional<T> getById(const std::string& id) override {
        for (const auto& entity : storage) {
            if (entity.getId() == id) {
                return entity;
            }
        }
        return std::nullopt;
    }

    virtual std::vector<T> getAll() override {
        return storage;
    }

    virtual bool add(const T& entity) override {
        storage.push_back(entity);
        return true;
    }

    virtual bool update(const T& entity) override {
        for (auto& stored : storage) {
            if (stored.getId() == entity.getId()) {
                stored = entity;
                return true;
            }
        }
        return false;
    }

    virtual bool deleteById(const std::string& id) override {
        for (auto it = storage.begin(); it != storage.end(); ++it) {
            if (it->getId() == id) {
                storage.erase(it);
                return true;
            }
        }
        return false;
    }

    virtual std::vector<T> findBy(const std::string& field, const std::string& value) override {
        // Will be specialized in derived classes
        return std::vector<T>();
    }

    virtual int count() override {
        return storage.size();
    }

    std::vector<T> getStorage() const { return storage; }
};
