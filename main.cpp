#include <iostream>
#include <string>
#include <vector>
#include <memory>
#include <algorithm>

using namespace std;

// =========================================================
// 2. ABSTRACTION
// Abstract base class representing a generic concept of an Entity.
// It uses a pure virtual function, meaning an object of this
// class cannot be instantiated, and derived classes MUST implement it.
// =========================================================
class IDisplayable {
public:
    virtual void displayRole() const = 0; // Pure virtual function
    virtual ~IDisplayable() = default;    // Virtual destructor
};

// =========================================================
// 1. ENCAPSULATION & 3. INHERITANCE
// Base class 'User' inheriting from 'IDisplayable'.
// Data members are protected (Encapsulation), preventing direct
// external access. They are accessed via public methods (getters).
// =========================================================
class User : public IDisplayable {
protected:
    string username;
    string password;
    string email;

public:
    // Constructor
    User(const string& uname, const string& pass, const string& mail)
        : username(uname), password(pass), email(mail) {}

    virtual ~User() = default;

    // Getters for encapsulated data
    string getUsername() const { return username; }
    string getEmail() const { return email; }

    // Authentication method
    bool authenticate(const string& pass) const {
        return password == pass;
    }

    // =========================================================
    // 4. POLYMORPHISM
    // Pure virtual function. This will be overridden by Client and Freelancer.
    // Calling this on a User pointer will execute the derived class's version.
    // =========================================================
    virtual void displayMenu() = 0; 
};

// Forward declaration
class Project;

// ---------------------------------------------------------
// Encapsulation of a Bid
// ---------------------------------------------------------
class Bid {
private:
    string freelancerName;
    double amount;
    string proposal;

public:
    Bid(const string& fName, double amt, const string& prop)
        : freelancerName(fName), amount(amt), proposal(prop) {}

    string getFreelancerName() const { return freelancerName; }
    double getAmount() const { return amount; }
    string getProposal() const { return proposal; }

    void displayBid() const {
        cout << "- By " << freelancerName << " | Amount: $" << amount 
             << " | Proposal: " << proposal << "\n";
    }
};

// ---------------------------------------------------------
// Encapsulation of a Project
// ---------------------------------------------------------
class Project {
private:
    static int nextId;
    int id;
    string title;
    string description;
    double budget;
    string clientName;
    string status; // "Open", "In Progress", "Completed"
    vector<Bid> bids;
    string awardedTo;

public:
    Project(const string& t, const string& desc, double budg, const string& cName)
        : id(nextId++), title(t), description(desc), budget(budg), clientName(cName), status("Open") {}

    int getId() const { return id; }
    string getTitle() const { return title; }
    string getClientName() const { return clientName; }
    string getStatus() const { return status; }
    const vector<Bid>& getBids() const { return bids; }

    void addBid(const Bid& bid) {
        bids.push_back(bid);
    }

    void acceptBid(const string& fName) {
        awardedTo = fName;
        status = "In Progress";
    }

    void markCompleted() {
        if (status == "In Progress") {
            status = "Completed";
        }
    }

    void displayProjectBasic() const {
        cout << "ID: " << id << " | Title: " << title 
             << " | Client: " << clientName 
             << " | Budget: $" << budget 
             << " | Status: " << status << "\n";
    }

    void displayProjectDetailed() const {
        displayProjectBasic();
        cout << "Description: " << description << "\n";
        if (!awardedTo.empty()) {
            cout << "Awarded to: " << awardedTo << "\n";
        }
        cout << "Bids (" << bids.size() << "):\n";
        for (const auto& bid : bids) {
            bid.displayBid();
        }
    }
};

int Project::nextId = 1;

// Global (or system level) data to simplify menu operations for demonstration
vector<Project> allProjects;

// =========================================================
// 3. INHERITANCE
// Freelancer inherits from User. It reuses the username/password/email
// logic and adds its own specific states (skills) and behaviors (displayMenu).
// =========================================================
class Freelancer : public User {
private:
    vector<string> skills;

public:
    Freelancer(const string& uname, const string& pass, const string& mail, const vector<string>& s)
        : User(uname, pass, mail), skills(s) {}

    // Implement Abstract methods (Polymorphism)
    void displayRole() const override {
        cout << "[Role: Freelancer] " << username << "\n";
    }

    void displayMenu() override;

    void browseProjects() {
        cout << "\n--- Available Projects ---\n";
        bool found = false;
        for (const auto& p : allProjects) {
            if (p.getStatus() == "Open") {
                p.displayProjectBasic();
                found = true;
            }
        }
        if (!found) cout << "No open projects available.\n";
    }

    void placeBid() {
        int projId;
        double amt;
        string proposal;

        cout << "Enter Project ID to bid on: ";
        cin >> projId;

        for (auto& p : allProjects) {
            if (p.getId() == projId && p.getStatus() == "Open") {
                cout << "Enter bid amount: $";
                cin >> amt;
                cin.ignore();
                cout << "Enter proposal: ";
                getline(cin, proposal);

                p.addBid(Bid(username, amt, proposal));
                cout << "Bid placed successfully!\n";
                return;
            }
        }
        cout << "Project not found or not open for bidding.\n";
    }
};

// =========================================================
// 3. INHERITANCE
// Client inherits from User. It reuses the authentication
// logic and adds companyName.
// =========================================================
class Client : public User {
private:
    string companyName;

public:
    Client(const string& uname, const string& pass, const string& mail, const string& cName)
        : User(uname, pass, mail), companyName(cName) {}

    // Implement Abstract methods (Polymorphism)
    void displayRole() const override {
        cout << "[Role: Client] " << username << " (" << companyName << ")\n";
    }

    void displayMenu() override;

    void postProject() {
        string title, desc;
        double budget;

        cin.ignore();
        cout << "Enter project title: ";
        getline(cin, title);
        cout << "Enter description: ";
        getline(cin, desc);
        cout << "Enter budget: $";
        cin >> budget;

        allProjects.emplace_back(title, desc, budget, username);
        cout << "Project posted successfully!\n";
    }

    void viewMyProjects() {
        cout << "\n--- My Projects ---\n";
        bool found = false;
        for (const auto& p : allProjects) {
            if (p.getClientName() == username) {
                p.displayProjectDetailed();
                cout << "------------------------\n";
                found = true;
            }
        }
        if (!found) cout << "You haven't posted any projects.\n";
    }

    void manageBids() {
        int projId;
        cout << "Enter Project ID to manage bids: ";
        cin >> projId;

        for (auto& p : allProjects) {
            if (p.getId() == projId && p.getClientName() == username && p.getStatus() == "Open") {
                if (p.getBids().empty()) {
                    cout << "No bids on this project yet.\n";
                    return;
                }
                
                p.displayProjectDetailed();
                string fName;
                cout << "Enter Freelancer name to accept bid (or 'cancel'): ";
                cin >> fName;
                
                if (fName != "cancel") {
                    bool valid = false;
                    for(const auto& b : p.getBids()) {
                        if(b.getFreelancerName() == fName) {
                            valid = true; break;
                        }
                    }
                    if(valid) {
                        p.acceptBid(fName);
                        cout << "Bid accepted! Project is now In Progress.\n";
                    } else {
                        cout << "Invalid freelancer name.\n";
                    }
                }
                return;
            }
        }
        cout << "Invalid project ID or you don't own this open project.\n";
    }
    
    void markProjectCompleted() {
        int projId;
        cout << "Enter Project ID to mark as completed: ";
        cin >> projId;

        for (auto& p : allProjects) {
            if (p.getId() == projId && p.getClientName() == username && p.getStatus() == "In Progress") {
                p.markCompleted();
                cout << "Project marked as Completed!\n";
                return;
            }
        }
        cout << "Invalid project ID or project is not In Progress.\n";
    }
};

// Implementations of menus (separated to prevent circular dependencies in a single file logic flow)
void Freelancer::displayMenu() {
    int choice;
    do {
        cout << "\n--- Freelancer Menu (" << username << ") ---\n"
             << "1. Browse Open Projects\n"
             << "2. Place Bid\n"
             << "3. Logout\n"
             << "Enter choice: ";
        cin >> choice;

        switch (choice) {
            case 1: browseProjects(); break;
            case 2: placeBid(); break;
            case 3: cout << "Logging out...\n"; break;
            default: cout << "Invalid choice.\n";
        }
    } while (choice != 3);
}

void Client::displayMenu() {
    int choice;
    do {
        cout << "\n--- Client Menu (" << username << ") ---\n"
             << "1. Post a Project\n"
             << "2. View My Projects & Bids\n"
             << "3. Manage/Accept Bids\n"
             << "4. Mark Project Completed\n"
             << "5. Logout\n"
             << "Enter choice: ";
        cin >> choice;

        switch (choice) {
            case 1: postProject(); break;
            case 2: viewMyProjects(); break;
            case 3: manageBids(); break;
            case 4: markProjectCompleted(); break;
            case 5: cout << "Logging out...\n"; break;
            default: cout << "Invalid choice.\n";
        }
    } while (choice != 5);
}

// ---------------------------------------------------------
// Main System Manager
// ---------------------------------------------------------
class Platform {
private:
    // Storing derived objects using base class pointers (Base for Polymorphism)
    vector<shared_ptr<User>> users;

public:
    void registerUser() {
        int type;
        string u, p, e;
        
        cout << "\n--- Register ---\n"
             << "1. Freelancer\n"
             << "2. Client\n"
             << "Select type: ";
        cin >> type;
        
        cout << "Username: "; cin >> u;
        cout << "Password: "; cin >> p;
        cout << "Email: "; cin >> e;

        if (type == 1) {
            int numSkills;
            vector<string> skills;
            cout << "How many skills? "; cin >> numSkills;
            cin.ignore();
            for(int i=0; i<numSkills; ++i) {
                string s;
                cout << "Skill " << i+1 << ": ";
                getline(cin, s);
                skills.push_back(s);
            }
            users.push_back(make_shared<Freelancer>(u, p, e, skills));
            cout << "Freelancer registered successfully!\n";
        } else if (type == 2) {
            string comp;
            cin.ignore();
            cout << "Company Name: ";
            getline(cin, comp);
            users.push_back(make_shared<Client>(u, p, e, comp));
            cout << "Client registered successfully!\n";
        } else {
            cout << "Invalid type.\n";
        }
    }

    void login() {
        string u, p;
        cout << "\n--- Login ---\n"
             << "Username: "; cin >> u;
        cout << "Password: "; cin >> p;

        for (const auto& user : users) {
            if (user->getUsername() == u && user->authenticate(p)) {
                
                // =========================================================
                // 4. POLYMORPHISM IN ACTION
                // The pointer type is `std::shared_ptr<User>`, but it knows 
                // which overridden function to call (Client's or Freelancer's)
                // =========================================================
                user->displayRole(); 
                user->displayMenu(); 
                return;
            }
        }
        cout << "Invalid credentials.\n";
    }

    void start() {
        int choice;
        // Adding dummy data for testing
        users.push_back(make_shared<Client>("client1", "pass", "c@c.com", "Acme Corp"));
        users.push_back(make_shared<Freelancer>("dev1", "pass", "d@d.com", vector<string>{"C++", "Java"}));
        allProjects.emplace_back("Build Website", "Need a responsive e-commerce web app", 1500, "client1");

        do {
            cout << "\n=== Freelance Platform ===\n"
                 << "1. Register\n"
                 << "2. Login\n"
                 << "3. Exit\n"
                 << "Choice: ";
            cin >> choice;

            switch (choice) {
                case 1: registerUser(); break;
                case 2: login(); break;
                case 3: cout << "Goodbye!\n"; break;
                default: cout << "Invalid choice.\n";
            }
        } while (choice != 3);
    }
};

int main() {
    Platform app;
    app.start();
    return 0;
}
