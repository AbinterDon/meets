package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"meets/server/internal/domain"

	"github.com/lib/pq"
)

type userRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) domain.UserRepository {
	return &userRepository{
		db: db,
	}
}

func (r *userRepository) Create(ctx context.Context, user *domain.User) error {
	query := `INSERT INTO users (username, password_hash, email, interests) VALUES ($1, $2, $3, $4) RETURNING id`
	// If email is empty, treat as null or empty string? DB unique constraint might fail on empty strings if multiple.
	// We'll insert NULL if empty string to avoid unique constraint violation on empty strings.
	var email interface{} = user.Email
	if user.Email == "" {
		email = nil
	}
	err := r.db.QueryRowContext(ctx, query, user.Username, user.PasswordHash, email, pq.Array(user.Interests)).Scan(&user.ID)
	return err
}

func (r *userRepository) GetByUsername(ctx context.Context, username string) (*domain.User, error) {
	query := `SELECT id, username, password_hash, COALESCE(name, ''), age, gender, COALESCE(bio, ''), COALESCE(image_url, ''), email, COALESCE(interests, '{}') FROM users WHERE username = $1`
	var user domain.User
	var email *string
	err := r.db.QueryRowContext(ctx, query, username).Scan(
		&user.ID, &user.Username, &user.PasswordHash, &user.Name, &user.Age, &user.Gender, &user.Bio, &user.ImageURL, &email, pq.Array(&user.Interests),
	)
	if err != nil {
		return nil, err
	}
	if email != nil {
		user.Email = *email
	}
	return &user, nil
}

func (r *userRepository) GetByID(ctx context.Context, id int) (*domain.User, error) {
	query := `SELECT id, username, password_hash, COALESCE(name, ''), COALESCE(age, 0), COALESCE(gender, ''), COALESCE(bio, ''), COALESCE(image_url, ''), COALESCE(email, '') FROM users WHERE id=$1`
	var u domain.User
	var email sql.NullString
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&u.ID, &u.Username, &u.Name, &u.Age, &u.Gender, &u.Bio, &u.ImageURL, &email,
	)
	if err != nil {
		return nil, err
	}
	u.Email = email.String
	return &u, nil
}

func (r *userRepository) Update(ctx context.Context, user *domain.User) error {
	query := `UPDATE users SET name = $1, age = $2, gender = $3, bio = $4, image_url = $5, email = $6, interests = $7 WHERE id = $8`
	var email *string
	if user.Email != "" {
		email = &user.Email
	}
	_, err := r.db.ExecContext(ctx, query, user.Name, user.Age, user.Gender, user.Bio, user.ImageURL, email, pq.Array(user.Interests), user.ID)
	return err
}

func (r *userRepository) GetAllExcluding(ctx context.Context, excludeUserID int) ([]domain.User, error) {
	query := `
		SELECT id, username, COALESCE(name, 'Anonymous'), COALESCE(age, 0), COALESCE(gender, ''), COALESCE(bio, ''), COALESCE(image_url, ''), COALESCE(interests, '{}')
		FROM users 
		WHERE id != $1
		AND id NOT IN (
			SELECT liked_user_id FROM likes 
			WHERE user_id = $1
		)
	`
	rows, err := r.db.QueryContext(ctx, query, excludeUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []domain.User
	for rows.Next() {
		var u domain.User
		if err := rows.Scan(&u.ID, &u.Username, &u.Name, &u.Age, &u.Gender, &u.Bio, &u.ImageURL, pq.Array(&u.Interests)); err != nil {
			fmt.Printf("Scan error: %v\n", err) // Simple logging
			continue
		}
		users = append(users, u)
	}
	return users, nil
}

func (r *userRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	query := `SELECT id, username, password_hash, COALESCE(email, ''), COALESCE(reset_token, ''), COALESCE(reset_token_expiry, '1970-01-01'::timestamp) FROM users WHERE email=$1`
	var u domain.User
	var emailVal, resetToken sql.NullString
	var resetExpiry sql.NullTime

	err := r.db.QueryRowContext(ctx, query, email).Scan(&u.ID, &u.Username, &u.PasswordHash, &emailVal, &resetToken, &resetExpiry)
	if err != nil {
		return nil, err
	}
	u.Email = emailVal.String
	u.ResetToken = resetToken.String
	u.ResetTokenExpiry = resetExpiry.Time
	return &u, nil
}

func (r *userRepository) SetResetToken(ctx context.Context, userID int, token string, expiry time.Time) error {
	_, err := r.db.ExecContext(ctx, "UPDATE users SET reset_token=$1, reset_token_expiry=$2 WHERE id=$3", token, expiry, userID)
	return err
}

func (r *userRepository) UpdatePassword(ctx context.Context, userID int, hashedPassword string) error {
	// Also clear the reset token
	_, err := r.db.ExecContext(ctx, "UPDATE users SET password_hash=$1, reset_token=NULL, reset_token_expiry=NULL WHERE id=$2", hashedPassword, userID)
	return err
}
