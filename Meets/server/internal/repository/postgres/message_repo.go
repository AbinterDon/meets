package postgres

import (
	"context"
	"database/sql"

	"meets/server/internal/domain"
)

type messageRepository struct {
	db *sql.DB
}

func NewMessageRepository(db *sql.DB) domain.MessageRepository {
	return &messageRepository{db: db}
}

func (r *messageRepository) Create(ctx context.Context, senderID int, receiverID int, content string) error {
	_, err := r.db.ExecContext(ctx, "INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3)", senderID, receiverID, content)
	return err
}

func (r *messageRepository) GetHistory(ctx context.Context, userID int, otherUserID int) ([]domain.Message, error) {
	query := `
		SELECT m.id, u1.username, u2.username, m.content, m.created_at, m.is_read
		FROM messages m
		JOIN users u1 ON m.sender_id = u1.id
		JOIN users u2 ON m.receiver_id = u2.id
		WHERE (m.sender_id = $1 AND m.receiver_id = $2)
		   OR (m.sender_id = $2 AND m.receiver_id = $1)
		ORDER BY m.created_at ASC
	`
	rows, err := r.db.QueryContext(ctx, query, userID, otherUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []domain.Message
	for rows.Next() {
		var m domain.Message
		if err := rows.Scan(&m.ID, &m.Sender, &m.Receiver, &m.Content, &m.CreatedAt, &m.IsRead); err != nil {
			continue
		}
		msgs = append(msgs, m)
	}
	return msgs, nil
}

func (r *messageRepository) MarkAsRead(ctx context.Context, userID int, otherUserID int) error {
	// Mark messages received by userID from otherUserID as read
	query := `
		UPDATE messages 
		SET is_read = TRUE 
		WHERE receiver_id = $1 AND sender_id = $2 AND is_read = FALSE
	`
	_, err := r.db.ExecContext(ctx, query, userID, otherUserID)
	return err
}
