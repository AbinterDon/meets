package domain

import "context"

type User struct {
	ID           int    `json:"id"`
	Username     string `json:"username"`
	PasswordHash string `json:"-"` // Not in JSON
	Name         string `json:"name"`
	Age          int    `json:"age"`
	Gender       string `json:"gender"`
	Bio          string `json:"bio"`
	ImageURL     string `json:"image_url"`
}

type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByUsername(ctx context.Context, username string) (*User, error)
	GetByID(ctx context.Context, id int) (*User, error)
	Update(ctx context.Context, user *User) error
	GetAllExcluding(ctx context.Context, excludeUserID int) ([]User, error)
}
