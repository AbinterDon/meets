package usecase

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"meets/server/internal/domain"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthUsecase struct {
	userRepo domain.UserRepository
	jwtKey   []byte
}

func NewAuthUsecase(userRepo domain.UserRepository, jwtKey []byte) *AuthUsecase {
	return &AuthUsecase{
		userRepo: userRepo,
		jwtKey:   jwtKey,
	}
}

func (uc *AuthUsecase) Register(ctx context.Context, username, password, email string) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user := &domain.User{
		Username:     username,
		PasswordHash: string(hashedPassword),
		Email:        email,
	}

	return uc.userRepo.Create(ctx, user)
}

func (uc *AuthUsecase) ForgotPassword(ctx context.Context, email string) error {
	user, err := uc.userRepo.GetByEmail(ctx, email)
	if err != nil {
		// Do not leak existence info, but for dev we might log
		fmt.Printf("Forgot Password: Email not found %s\n", email)
		return nil
	}

	// Generate 6-digit code
	code := fmt.Sprintf("%06d", rand.Intn(1000000))
	expiry := time.Now().Add(15 * time.Minute)

	if err := uc.userRepo.SetResetToken(ctx, user.ID, code, expiry); err != nil {
		return err
	}

	// SIMULATE SENDING EMAIL
	fmt.Printf("\n=====================================\n")
	fmt.Printf(" PASSWORD RESET CODE for %s: %s \n", email, code)
	fmt.Printf("=====================================\n\n")

	return nil
}

func (uc *AuthUsecase) ResetPassword(ctx context.Context, email, code, newPassword string) error {
	user, err := uc.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return fmt.Errorf("Invalid Request") // Generic error
	}

	if user.ResetToken != code {
		return fmt.Errorf("Invalid code")
	}

	if time.Now().After(user.ResetTokenExpiry) {
		return fmt.Errorf("Code expired")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	return uc.userRepo.UpdatePassword(ctx, user.ID, string(hashedPassword))
}

func (uc *AuthUsecase) Login(ctx context.Context, username, password string) (string, error) {
	storedUser, err := uc.userRepo.GetByUsername(ctx, username)
	if err != nil {
		return "", fmt.Errorf("User not found")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(storedUser.PasswordHash), []byte(password)); err != nil {
		return "", fmt.Errorf("Incorrect password")
	}

	expirationTime := time.Now().Add(24 * time.Hour)
	// Define a custom struct for claims to match Middleware
	type Claims struct {
		Username string `json:"username"`
		jwt.RegisteredClaims
	}

	claims := &Claims{
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   username,
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(uc.jwtKey)
	return tokenString, err
}
