#pragma once
#include <crow.h>
#include <nlohmann/json.hpp>
#include <string>

using json = nlohmann::json;

class ResponseUtils {
public:
    static crow::response success(const std::string& message, const json& data = json::object()) {
        json res = {
            {"success", true},
            {"message", message},
            {"data", data}
        };
        auto response = crow::response(200, res.dump());
        response.add_header("Content-Type", "application/json");
        return response;
    }

    static crow::response error(int code, const std::string& message) {
        json res = {
            {"success", false},
            {"message", message},
            {"data", json::object()}
        };
        auto response = crow::response(code, res.dump());
        response.add_header("Content-Type", "application/json");
        return response;
    }
};
