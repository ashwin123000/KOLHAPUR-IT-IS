#pragma once
#include "../models/User.hpp"
#include "../models/Project.hpp"
#include <algorithm>
#include <iostream>

// ==========================================
// CLIENT AND FREELANCER FRAUD DETECTION & TRUST SYSTEM
// ==========================================

class TrustFraudService {
public:
    // Update Freelancer reputation upon project completion
    static void handleProjectCompletion(Freelancer& f, Project& p) {
        if (p.daysLate > 0) {
            // Penalty for being late
            f.deadlinesMissed++;
            f.reliabilityScore -= (p.daysLate * 2.5); // Dynamic penalty proportional to days late
        } else {
            f.deadlinesMet++;
            f.reliabilityScore += 5.0; // Bonus for on time
            f.streak++;
        }
        
        // Hard bounds
        f.reliabilityScore = std::clamp(f.reliabilityScore, 0.0, 100.0);
        f.completedProjects++;
        f.totalEarnings += p.budget;
        f.isActive = true;
        f.activityScore = std::min(100.0, f.activityScore + 10.0);
    }

    // Update Freelancer when they fail to deliver
    static void handleProjectFailure(Freelancer& f) {
        f.incompleteProjects++;
        f.streak = 0;
        f.reliabilityScore -= 20.0; // Heavy penalty
        f.reliabilityScore = std::max(0.0, f.reliabilityScore);
        
        if (f.incompleteProjects > 5 && f.reliabilityScore < 30.0) {
            std::cout << "WARNING: Freelancer " << f.id << " flagged for suspiciously high failure rate." << std::endl;
        }
    }

    // Update Client trust score after project payment phase
    static void evaluateClientPayment(Client& c, bool paidOnTime, int disputeCount) {
        if (paidOnTime) {
            c.successfulProjects++;
            c.trustScore += 5.0;
            c.paymentDelays = 0;
            if (c.trustScore > 75.0) c.fraudFlag = "trusted";
        } else {
            c.paymentDelays++;
            c.trustScore -= 15.0;
        }

        if (disputeCount > 0) {
            c.disputeHistory += disputeCount;
            c.trustScore -= (disputeCount * 10.0);
        }

        c.trustScore = std::clamp(c.trustScore, 0.0, 100.0);

        if (c.trustScore < 40.0 && c.trustScore >= 20.0) {
            c.fraudFlag = "risky";
        } else if (c.trustScore < 20.0) {
            c.fraudFlag = "fraud";
        }
    }
    
    static bool isBidValid(const Project& p, double bidAmount) {
        // Auto filter: Reject bid > budget
        return bidAmount <= p.budget;
    }
};
