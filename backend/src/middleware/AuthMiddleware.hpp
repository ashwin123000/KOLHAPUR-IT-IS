#pragma once
#include <crow.h>
#include <jwt-cpp/jwt.h>
#include "../utils/ResponseUtils.hpp"

// ==========================================
// ROLE-BASED ACCESS CONTROL (MIDDLEWARE)
// ==========================================

struct AuthMiddleware {
    struct context {
        std::string userId;
        std::string role;
    };

    void before_handle(crow::request& req, crow::response& res, context& ctx) {
        auto authHeader = req.get_header_value("Authorization");
        if (authHeader.empty() || authHeader.substr(0, 7) != "Bearer ") {
            res = ResponseUtils::error(401, "Missing or invalid Authorization header");
            res.end();
            return;
        }

        std::string token = authHeader.substr(7);
        try {
            // Simplified decoding without secure secret checking for demonstration
            // In production: verify signature using matching secret key
            auto decoded = jwt::decode(token);
            ctx.userId = decoded.get_payload_claim("userId").as_string();
            ctx.role = decoded.get_payload_claim("role").as_string();
        } catch (const std::exception& e) {
            res = ResponseUtils::error(401, "Invalid or expired token");
            res.end();
        }
    }

    void after_handle(crow::request& req, crow::response& res, context& ctx) {}
};

// Macro helper to strictly enforce Role-Based Access Control inside handlers
#define REQUIRE_ROLE(ctx, requiredRole, res) \
    if (ctx.role != requiredRole) { \
        res = ResponseUtils::error(403, std::string("Access denied. Requires role: ") + requiredRole); \
        res.end(); \
        return; \
    }
