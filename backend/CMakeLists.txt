cmake_minimum_required(VERSION 3.15)
project(FreelancePlatform)

# Force C++17 standard (Both lines are crucial here)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED True)

# Include paths — crow, nlohmann, sqlite3 all live in include/
include_directories(include)

# SQLite3 is compiled from the amalgamation source bundled in src/sqlite3.c
add_executable(${PROJECT_NAME}
    src/main.cpp
    src/sqlite3.c      # SQLite amalgamation — compiled directly
)

# Suppress SQLite warnings when compiling with -Wall
set_source_files_properties(src/sqlite3.c PROPERTIES COMPILE_FLAGS "-w")

# Link networking libraries required by Crow on Windows
target_link_libraries(${PROJECT_NAME}
    PRIVATE
    ws2_32      # Winsock
    mswsock     # Microsoft Winsock Extension
)

# Enable threads (Crow multithreaded mode)
find_package(Threads REQUIRED)
target_link_libraries(${PROJECT_NAME} PRIVATE Threads::Threads)