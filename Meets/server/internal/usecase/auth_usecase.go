package usecase

import (
	"context"
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

func (uc *AuthUsecase) Register(ctx context.Context, username, password string) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user := &domain.User{
		Username:     username,
		PasswordHash: string(hashedPassword),
	}

	return uc.userRepo.Create(ctx, user)
}

func (uc *AuthUsecase) Login(ctx context.Context, username, password string) (string, error) {
	storedUser, err := uc.userRepo.GetByUsername(ctx, username)
	if err != nil {
		return "", err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(storedUser.PasswordHash), []byte(password)); err != nil {
		return "", err
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
