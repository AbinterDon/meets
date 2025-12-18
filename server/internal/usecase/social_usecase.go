package usecase

import (
	"context"

	"meets/server/internal/domain"
)

type SocialUsecase struct {
	userRepo   domain.UserRepository
	socialRepo domain.SocialRepository
}

func NewSocialUsecase(userRepo domain.UserRepository, socialRepo domain.SocialRepository) *SocialUsecase {
	return &SocialUsecase{
		userRepo:   userRepo,
		socialRepo: socialRepo,
	}
}

func (uc *SocialUsecase) GetPotentialMatchesByUsername(ctx context.Context, username string) ([]domain.User, error) {
	user, err := uc.userRepo.GetByUsername(ctx, username)
	if err != nil {
		return nil, err
	}
	return uc.userRepo.GetAllExcluding(ctx, user.ID)
}

func (uc *SocialUsecase) GetPotentialMatches(ctx context.Context, currentUserID int) ([]domain.User, error) {
	// Simple Logic: Get All except current user and already liked
	// This delegates to the Repo logic which implements the exclusion
	return uc.userRepo.GetAllExcluding(ctx, currentUserID)
}

func (uc *SocialUsecase) LikeUser(ctx context.Context, currentUsername string, likedUsername string) (bool, error) {
	currentUser, err := uc.userRepo.GetByUsername(ctx, currentUsername)
	if err != nil {
		return false, err
	}

	likedUser, err := uc.userRepo.GetByUsername(ctx, likedUsername)
	if err != nil {
		return false, err
	}

	// 1. Add Like
	if err := uc.socialRepo.AddLike(ctx, currentUser.ID, likedUser.ID); err != nil {
		return false, err
	}

	// 2. Check Match
	isMatch, err := uc.socialRepo.CheckMatch(ctx, currentUser.ID, likedUser.ID)
	if err != nil {
		return false, err
	}

	if isMatch {
		// 3. Create Match
		if err := uc.socialRepo.CreateMatch(ctx, currentUser.ID, likedUser.ID); err != nil {
			return true, err // Return true because match IS found logically
		}
	}

	return isMatch, nil
}

func (uc *SocialUsecase) GetMatches(ctx context.Context, username string) ([]domain.User, error) {
	user, err := uc.userRepo.GetByUsername(ctx, username)
	if err != nil {
		return nil, err
	}
	return uc.socialRepo.GetMatches(ctx, user.ID)
}
