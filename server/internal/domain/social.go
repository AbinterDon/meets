package domain

import "context"

type SocialRepository interface {
	AddLike(ctx context.Context, userID int, likedUserID int) error
	CheckMatch(ctx context.Context, userID int, likedUserID int) (bool, error)
	CreateMatch(ctx context.Context, user1ID int, user2ID int) error
	GetMatches(ctx context.Context, userID int) ([]User, error)
	IsLiked(ctx context.Context, userID int, otherUserID int) (bool, error)
}
