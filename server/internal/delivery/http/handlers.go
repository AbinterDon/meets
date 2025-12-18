package http

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"meets/server/internal/usecase"
)

// --- CORS Helper ---
func enableCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

// --- Auth Handler ---
type AuthHandler struct {
	authUsecase *usecase.AuthUsecase
}

func NewAuthHandler(uc *usecase.AuthUsecase) *AuthHandler {
	return &AuthHandler{authUsecase: uc}
}

type Credentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Email    string `json:"email"` // Optional for now?
}

type TokenResponse struct {
	Token    string `json:"token"`
	Username string `json:"username"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	if r.Method == "OPTIONS" {
		return
	}
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var creds Credentials
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	if err := h.authUsecase.Register(r.Context(), creds.Username, creds.Password, creds.Email); err != nil {
		http.Error(w, "Username or Email likely taken", http.StatusConflict)
		return
	}
	w.WriteHeader(http.StatusCreated)
}

type ForgotRequest struct {
	Email string `json:"email"`
}

func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	if r.Method == "OPTIONS" {
		return
	}
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ForgotRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	if err := h.authUsecase.ForgotPassword(r.Context(), req.Email); err != nil {
		// Log internal err
		fmt.Println("Forgot Password Error:", err)
	}
	// Always return OK to prevent enumeration
	w.WriteHeader(http.StatusOK)
}

type ResetRequest struct {
	Email       string `json:"email"`
	Code        string `json:"code"`
	NewPassword string `json:"new_password"`
}

func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	if r.Method == "OPTIONS" {
		return
	}
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ResetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	if err := h.authUsecase.ResetPassword(r.Context(), req.Email, req.Code, req.NewPassword); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	if r.Method == "OPTIONS" {
		return
	}
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var creds Credentials
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	token, err := h.authUsecase.Login(r.Context(), creds.Username, creds.Password)
	if err != nil {
		// Taking user feedback seriously: return specific error
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	json.NewEncoder(w).Encode(TokenResponse{Token: token, Username: creds.Username})
}

// --- Profile Handler ---
type ProfileHandler struct {
	profileUsecase *usecase.ProfileUsecase
}

func NewProfileHandler(uc *usecase.ProfileUsecase) *ProfileHandler {
	return &ProfileHandler{profileUsecase: uc}
}

func (h *ProfileHandler) HandleProfile(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	username := r.Context().Value("username").(string)

	if r.Method == "GET" {
		user, err := h.profileUsecase.GetMe(r.Context(), username)
		if err != nil {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		json.NewEncoder(w).Encode(user)
	} else if r.Method == "PUT" {
		user, err := h.profileUsecase.GetMe(r.Context(), username)
		if err != nil {
			http.Error(w, "User not found", http.StatusInternalServerError)
			return
		}
		if err := json.NewDecoder(r.Body).Decode(user); err != nil {
			http.Error(w, "Bad request", http.StatusBadRequest)
			return
		}
		if err := h.profileUsecase.UpdateProfile(r.Context(), user); err != nil {
			http.Error(w, "Update failed", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
	} else {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *ProfileHandler) Upload(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	if r.Method == "OPTIONS" {
		return
	}
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	r.ParseMultipartForm(10 << 20)
	file, handler, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Error retrieving file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), handler.Filename)
	uploadPath := filepath.Join("uploads", filename)
	os.MkdirAll("uploads", os.ModePerm)

	dst, err := os.Create(uploadPath)
	if err != nil {
		http.Error(w, "Error saving file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()
	io.Copy(dst, file)

	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	url := fmt.Sprintf("%s://%s/uploads/%s", scheme, r.Host, filename)
	json.NewEncoder(w).Encode(map[string]string{"url": url})
}

// --- Social Handler ---

type SocialHandler struct {
	socialUsecase *usecase.SocialUsecase
	chatUsecase   *usecase.ChatUsecase
}

func NewSocialHandler(socialUC *usecase.SocialUsecase, chatUC *usecase.ChatUsecase) *SocialHandler {
	return &SocialHandler{
		socialUsecase: socialUC,
		chatUsecase:   chatUC,
	}
}

type LikeRequest struct {
	LikedUsername string `json:"liked_username"`
}

func (h *SocialHandler) Like(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	if r.Method == "OPTIONS" {
		return
	}
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	username := r.Context().Value("username").(string)
	var req LikeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	if req.LikedUsername == username {
		http.Error(w, "Cannot like yourself", http.StatusBadRequest)
		return
	}

	matched, err := h.socialUsecase.LikeUser(r.Context(), username, req.LikedUsername)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]bool{"match": matched})
}

func (h *SocialHandler) GetProfiles(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	username := r.Context().Value("username").(string)
	profiles, err := h.socialUsecase.GetPotentialMatchesByUsername(r.Context(), username)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(profiles)
}

func (h *SocialHandler) GetMatches(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	username := r.Context().Value("username").(string)
	matches, err := h.socialUsecase.GetMatches(r.Context(), username)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(matches)
}

func (h *SocialHandler) GetMessages(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	username := r.Context().Value("username").(string)
	otherUser := r.URL.Query().Get("other_user")
	if otherUser == "" {
		http.Error(w, "Missing other_user param", http.StatusBadRequest)
		return
	}

	msgs, err := h.chatUsecase.GetHistory(r.Context(), username, otherUser)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(msgs)
}

type MarkReadRequest struct {
	OtherUser string `json:"other_user"`
}

func (h *SocialHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	if r.Method == "OPTIONS" {
		return
	}
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	username := r.Context().Value("username").(string)
	var req MarkReadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	if err := h.chatUsecase.MarkMessagesAsRead(r.Context(), username, req.OtherUser); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
