package usecase

import (
	"context"

	"meets/server/internal/domain"
)

type ProfileUsecase struct {
	userRepo domain.UserRepository
}

func NewProfileUsecase(userRepo domain.UserRepository) *ProfileUsecase {
	return &ProfileUsecase{userRepo: userRepo}
}

func (uc *ProfileUsecase) GetMe(ctx context.Context, username string) (*domain.User, error) {
	return uc.userRepo.GetByUsername(ctx, username)
}

func (uc *ProfileUsecase) UpdateProfile(ctx context.Context, user *domain.User) error {
	return uc.userRepo.Update(ctx, user)
}
