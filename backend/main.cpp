#include <iostream>
#include <string>
#include <vector>
#include <memory>
#include <algorithm>
#include <iomanip>

using namespace std;

// --- MODEL LAYER ---

// Base User Class (Abstraction & Encapsulation)
class User {
protected:
    string id;
    string name;
    string email;
    double reliabilityScore;
    bool isActive;

public:
    User(string id, string name, string email) 
        : id(id), name(name), email(email), reliabilityScore(100.0), isActive(true) {}
    
    virtual ~User() = default;

    string getId() const { return id; }
    string getName() const { return name; }
    virtual string getRole() const = 0; // Pure virtual (Polymorphism)

    void updateReliabilityActivity(bool isPositive) {
        if (isPositive) {
            reliabilityScore = min(100.0, reliabilityScore + 2.0);
        } else {
            reliabilityScore -= 5.0; // Penalty
        }
    }

    double getReliabilityScore() const { return reliabilityScore; }
};

class Client : public User {
public:
    Client(string id, string name, string email) : User(id, name, email) {}
    string getRole() const override { return "CLIENT"; }
};

class Freelancer : public User {
private:
    vector<string> skills;
    bool fraudFlag;

public:
    Freelancer(string id, string name, string email, vector<string> skills)
        : User(id, name, email), skills(skills), fraudFlag(false) {}

    string getRole() const override { return "FREELANCER"; }
    
    vector<string> getSkills() const { return skills; }
    void flagForFraud() { fraudFlag = true; }
    bool isEligible() const { return isActive && !fraudFlag && reliabilityScore > 50.0; }
};

class Project {
private:
    string id;
    string title;
    vector<string> requiredSkills;
    double budget;
public:
    Project(string id, string title, vector<string> reqs, double budget)
        : id(id), title(title), requiredSkills(reqs), budget(budget) {}

    string getTitle() const { return title; }
    vector<string> getRequiredSkills() const { return requiredSkills; }
    double getBudget() const { return budget; }
};

// --- SERVICE LAYER ---

// Strategy Pattern for Match Engine
class IMatchStrategy {
public:
    virtual double calculateMatchScore(const Freelancer& f, const Project& p) = 0;
    virtual ~IMatchStrategy() = default;
};

class PrecisionMatchStrategy : public IMatchStrategy {
public:
    double calculateMatchScore(const Freelancer& f, const Project& p) override {
        if (!f.isEligible()) return 0.0; 

        double score = 0.0;
        
        // Match skills
        auto fSkills = f.getSkills();
        auto pSkills = p.getRequiredSkills();
        int matched = 0;
        for (const auto& req : pSkills) {
            if (find(fSkills.begin(), fSkills.end(), req) != fSkills.end()) {
                matched++;
            }
        }
        
        score += (matched * 10); 
        score += (f.getReliabilityScore() * 0.5);

        return score;
    }
};

class MatchEngine {
private:
    shared_ptr<IMatchStrategy> strategy;

public:
    MatchEngine(shared_ptr<IMatchStrategy> strat) : strategy(strat) {}

    double evaluate(const Freelancer& f, const Project& p) {
        return strategy->calculateMatchScore(f, p);
    }
};

// --- MAIN (Simulating The Application) ---

int main() {
    cout << "=======================================\n";
    cout << "  FREELANCE MARKETPLACE ENGINE v1.0\n";
    cout << "=======================================\n\n";

    // 1. Create Users
    auto client = make_shared<Client>("C1", "Sarah Jenkins", "sarah@acme.com");
    auto free1 = make_shared<Freelancer>("F1", "Arsh Jenkins", "arsh@dev.com", vector<string>{"React", "C++", "NodeJS"});
    auto free2 = make_shared<Freelancer>("F2", "Jane Doe", "jane@ui.com", vector<string>{"React", "Figma"});
    auto free3 = make_shared<Freelancer>("F3", "Bad Actor", "fraud@spam.com", vector<string>{"React"});

    free3->flagForFraud(); // Flagging one user for fraud
    
    // 2. Create Project
    Project proj("P1", "Full Stack Migration", {"React", "C++"}, 15000.0);
    
    cout << "[PROJECT] " << proj.getTitle() << " (Budget: $" << fixed << setprecision(2) << proj.getBudget() << ")\n";
    cout << "Required Skills: React, C++\n\n";

    // 3. AI Matching Logic (Applying Strict Strategy)
    auto matchStrat = make_shared<PrecisionMatchStrategy>();
    MatchEngine engine(matchStrat);

    vector<shared_ptr<Freelancer>> allFreelancers = { free1, free2, free3 };
    
    cout << "[AI MATCHING RESULTS]\n";
    for (const auto& f : allFreelancers) {
        double score = engine.evaluate(*f, proj);
        cout << "- " << left << setw(15) << f->getName();
        if (score == 0) {
            cout << " | STATUS: REJECTED (Fraud/Ineligible)\n";
        } else {
            cout << " | SCORE: " << score << "/100\n";
        }
    }
    
    cout << "\n[SIMULATION LOG] Engine finished matching successfully based on strict guidelines.\n";
    
    return 0;
}
