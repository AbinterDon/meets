package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"meets/server/internal/domain"
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
	query := `INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id`
	err := r.db.QueryRowContext(ctx, query, user.Username, user.PasswordHash).Scan(&user.ID)
	return err
}

func (r *userRepository) GetByUsername(ctx context.Context, username string) (*domain.User, error) {
	query := `SELECT id, username, password_hash, COALESCE(name, ''), COALESCE(age, 0), COALESCE(gender, ''), COALESCE(bio, ''), COALESCE(image_url, '') FROM users WHERE username=$1`
	var u domain.User
	err := r.db.QueryRowContext(ctx, query, username).Scan(
		&u.ID, &u.Username, &u.PasswordHash, &u.Name, &u.Age, &u.Gender, &u.Bio, &u.ImageURL,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *userRepository) GetByID(ctx context.Context, id int) (*domain.User, error) {
	query := `SELECT id, username, COALESCE(name, ''), COALESCE(age, 0), COALESCE(gender, ''), COALESCE(bio, ''), COALESCE(image_url, '') FROM users WHERE id=$1`
	var u domain.User
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&u.ID, &u.Username, &u.Name, &u.Age, &u.Gender, &u.Bio, &u.ImageURL,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *userRepository) Update(ctx context.Context, user *domain.User) error {
	query := `UPDATE users SET name=$1, age=$2, gender=$3, bio=$4, image_url=$5 WHERE username=$6`
	_, err := r.db.ExecContext(ctx, query, user.Name, user.Age, user.Gender, user.Bio, user.ImageURL, user.Username)
	return err
}

func (r *userRepository) GetAllExcluding(ctx context.Context, excludeUserID int) ([]domain.User, error) {
	query := `
		SELECT id, username, COALESCE(name, 'Anonymous'), COALESCE(age, 0), COALESCE(gender, ''), COALESCE(bio, ''), COALESCE(image_url, '') 
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
		if err := rows.Scan(&u.ID, &u.Username, &u.Name, &u.Age, &u.Gender, &u.Bio, &u.ImageURL); err != nil {
			fmt.Printf("Scan error: %v\n", err) // Simple logging
			continue
		}
		users = append(users, u)
	}
	return users, nil
}
