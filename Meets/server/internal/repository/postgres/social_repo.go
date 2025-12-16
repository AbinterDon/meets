package postgres

import (
	"context"
	"database/sql"

	"meets/server/internal/domain"
)

type socialRepository struct {
	db *sql.DB
}

func NewSocialRepository(db *sql.DB) domain.SocialRepository {
	return &socialRepository{db: db}
}

func (r *socialRepository) AddLike(ctx context.Context, userID int, likedUserID int) error {
	_, err := r.db.ExecContext(ctx, "INSERT INTO likes (user_id, liked_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", userID, likedUserID)
	return err
}

func (r *socialRepository) IsLiked(ctx context.Context, userID int, otherUserID int) (bool, error) {
	var count int
	err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM likes WHERE user_id=$1 AND liked_user_id=$2", userID, otherUserID).Scan(&count)
	return count > 0, err
}

func (r *socialRepository) CheckMatch(ctx context.Context, userID int, likedUserID int) (bool, error) {
	var count int
	// Check if likedUser also liked user
	err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM likes WHERE user_id=$1 AND liked_user_id=$2", likedUserID, userID).Scan(&count)
	return count > 0, err
}

func (r *socialRepository) CreateMatch(ctx context.Context, user1ID int, user2ID int) error {
	u1, u2 := user1ID, user2ID
	if u1 > u2 {
		u1, u2 = u2, u1
	}
	_, err := r.db.ExecContext(ctx, "INSERT INTO matches (user1_id, user2_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", u1, u2)
	return err
}

func (r *socialRepository) GetMatches(ctx context.Context, userID int) ([]domain.User, error) {
	query := `
		SELECT u.id, u.username, u.name, COALESCE(u.image_url, '')
		FROM matches m
		JOIN users u ON (CASE WHEN m.user1_id = $1 THEN m.user2_id ELSE m.user1_id END) = u.id
		WHERE m.user1_id = $1 OR m.user2_id = $1
	`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var matches []domain.User
	for rows.Next() {
		var u domain.User
		var img sql.NullString
		var name sql.NullString
		if err := rows.Scan(&u.ID, &u.Username, &name, &img); err != nil {
			continue
		}
		u.Name = name.String
		u.ImageURL = img.String
		matches = append(matches, u)
	}
	return matches, nil
}
