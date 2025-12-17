package domain

import (
	"context"
	"time"
)

type User struct {
	ID           int      `json:"id"`
	Username     string   `json:"username"`
	PasswordHash string   `json:"-"` // Not in JSON
	Name         string   `json:"name"`
	Age          int      `json:"age"`
	Gender       string   `json:"gender"`
	Bio          string   `json:"bio"`
	ImageURL     string   `json:"image_url"`
	Interests    []string `json:"interests"`
	Email        string   `json:"email"`
	// Chat Metadata (for MatchList)
	LastMessage     string    `json:"last_message,omitempty"`
	LastMessageTime time.Time `json:"last_message_time,omitempty"`
	UnreadCount     int       `json:"unread_count,omitempty"`

	// Password Reset (Internal)
	ResetToken       string    `json:"-"`
	ResetTokenExpiry time.Time `json:"-"`
}

type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByUsername(ctx context.Context, username string) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	GetByID(ctx context.Context, id int) (*User, error)
	Update(ctx context.Context, user *User) error
	UpdatePassword(ctx context.Context, userID int, hashedPassword string) error
	SetResetToken(ctx context.Context, userID int, token string, expiry time.Time) error
	GetAllExcluding(ctx context.Context, excludeUserID int) ([]User, error)
}
