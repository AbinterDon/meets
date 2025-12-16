package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	http_handler "meets/server/internal/delivery/http"
	websocket_handler "meets/server/internal/delivery/websocket"
	"meets/server/internal/repository/postgres"
	"meets/server/internal/usecase"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
)

// Import alias tricks to avoid package name collision if needed, but here packages are named distinct enough usually.
// Wait, I named package http as http, that conflicts with net/http.
// I should rename internal/delivery/http to something else or alias it.
// I'll assume they are imported as `http_delivery` or similar.
// In the code below I use `http_handler` and `websocket_handler` assuming I'll fix the package names or imports.

func main() {
	// 1. DB Connection
	connConfig, err := pgx.ParseConfig("postgres://postgres:password@localhost:5432/meets?sslmode=disable")
	if err != nil {
		log.Fatalf("Unable to verify connection config: %v\n", err)
	}
	db := stdlib.OpenDB(*connConfig)
	defer db.Close()

	// 2. Repositories
	userRepo := postgres.NewUserRepository(db)
	messageRepo := postgres.NewMessageRepository(db)
	socialRepo := postgres.NewSocialRepository(db)

	// 3. Usecases
	// Config
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "my_secret_key" // Fallback for local dev
		fmt.Println("Warning: Using default JWT secret. Set JWT_SECRET env var in production.")
	}
	jwtKey := []byte(jwtSecret)

	authUC := usecase.NewAuthUsecase(userRepo, jwtKey)
	profileUC := usecase.NewProfileUsecase(userRepo)
	chatUC := usecase.NewChatUsecase(userRepo, messageRepo)
	socialUC := usecase.NewSocialUsecase(userRepo, socialRepo)

	// 4. Handlers
	authHandler := http_handler.NewAuthHandler(authUC)
	profileHandler := http_handler.NewProfileHandler(profileUC)
	socialHandler := http_handler.NewSocialHandler(socialUC, chatUC)

	// 5. WebSocket
	hub := websocket_handler.NewHub(chatUC)
	go hub.Run()

	// 6. Router & Middleware
	// Helper middleware
	withAuth := func(next http.HandlerFunc) http.HandlerFunc {
		return http_handler.AuthMiddleware(jwtKey, next)
	}

	// Static files
	os.MkdirAll("./uploads", os.ModePerm)
	http.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("./uploads"))))

	// Routes
	http.HandleFunc("/api/register", authHandler.Register)
	http.HandleFunc("/api/login", authHandler.Login)
	http.HandleFunc("/api/me", withAuth(profileHandler.HandleProfile))
	http.HandleFunc("/api/upload", withAuth(profileHandler.Upload))

	http.HandleFunc("/api/profiles", withAuth(socialHandler.GetProfiles))
	http.HandleFunc("/api/like", withAuth(socialHandler.Like))
	http.HandleFunc("/api/matches", withAuth(socialHandler.GetMatches))
	http.HandleFunc("/api/messages", withAuth(socialHandler.GetMessages))

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		websocket_handler.ServeWs(hub, w, r)
	})

	// 7. Start Server
	fmt.Println("Refactored Server running on port 8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
