package domain

import (
	"context"
	"time"
)

type Message struct {
	ID        int       `json:"id"`
	Sender    string    `json:"sender"`   // Username
	Receiver  string    `json:"receiver"` // Username
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

type MessageRepository interface {
	Create(ctx context.Context, senderID int, receiverID int, content string) error
	GetHistory(ctx context.Context, userID int, otherUserID int) ([]Message, error)
}
