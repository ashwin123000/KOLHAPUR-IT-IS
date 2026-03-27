#pragma once

#include "IRepository.hpp"
#include "../models/User.hpp"

/**
 * @class UserRepository
 * @brief Repository for User, Client, and Freelancer entities
 * Implements CRUD and query operations for user-related entities
 */
class UserRepository : public IRepository<User> {
private:
    std::vector<User*> userStorage;  // Polymorphic storage
    std::vector<Client*> clientStorage;
    std::vector<Freelancer*> freelancerStorage;

public:
    UserRepository() = default;
    virtual ~UserRepository() {
        for (auto ptr : userStorage) delete ptr;
        for (auto ptr : clientStorage) delete ptr;
        for (auto ptr : freelancerStorage) delete ptr;
    }

    // User operations
    std::optional<User*> getUserById(const std::string& id);
    std::optional<User*> getUserByEmail(const std::string& email);
    std::optional<User*> getUserByUsername(const std::string& username);

    // Client-specific operations
    bool addClient(const Client& client);
    std::optional<Client*> getClientById(const std::string& id);
    std::vector<Client*> getAllClients();
    bool updateClient(const Client& client);

    // Freelancer-specific operations
    bool addFreelancer(const Freelancer& freelancer);
    std::optional<Freelancer*> getFreelancerById(const std::string& id);
    std::vector<Freelancer*> getAllFreelancers();
    std::vector<Freelancer*> getFreelancersBySkill(const std::string& skill);
    std::vector<Freelancer*> getActiveFreelancers();
    std::vector<Freelancer*> getEligibleFreelancers();  // Filter by fraud flag, verification
    bool updateFreelancer(const Freelancer& freelancer);

    // Authentication
    bool verifyPassword(const std::string& email, const std::string& password);

    // Statistics
    int getTotalUsers() const { return userStorage.size(); }
    int getTotalClients() const { return clientStorage.size(); }
    int getTotalFreelancers() const { return freelancerStorage.size(); }

    // IRepository interface (for User*)
    virtual std::optional<User> getById(const std::string& id) override { return std::nullopt; }
    virtual std::vector<User> getAll() override { return std::vector<User>(); }
    virtual bool add(const User& entity) override { return false; }
    virtual bool update(const User& entity) override { return false; }
    virtual bool deleteById(const std::string& id) override { return false; }
    virtual std::vector<User> findBy(const std::string& field, const std::string& value) override { return std::vector<User>(); }
    virtual int count() override { return userStorage.size(); }
};
