package usecase

import (
	"context"

	"meets/server/internal/domain"
)

type ChatUsecase struct {
	userRepo    domain.UserRepository
	messageRepo domain.MessageRepository
}

func NewChatUsecase(userRepo domain.UserRepository, messageRepo domain.MessageRepository) *ChatUsecase {
	return &ChatUsecase{
		userRepo:    userRepo,
		messageRepo: messageRepo,
	}
}

func (uc *ChatUsecase) SaveMessage(ctx context.Context, senderUsername, receiverUsername, content string) error {
	sender, err := uc.userRepo.GetByUsername(ctx, senderUsername)
	if err != nil {
		return err
	}

	receiver, err := uc.userRepo.GetByUsername(ctx, receiverUsername)
	if err != nil {
		return err
	}

	return uc.messageRepo.Create(ctx, sender.ID, receiver.ID, content)
}

func (uc *ChatUsecase) GetHistory(ctx context.Context, username1, username2 string) ([]domain.Message, error) {
	u1, err := uc.userRepo.GetByUsername(ctx, username1)
	if err != nil {
		return nil, err
	}

	u2, err := uc.userRepo.GetByUsername(ctx, username2)
	if err != nil {
		return nil, err
	}

	return uc.messageRepo.GetHistory(ctx, u1.ID, u2.ID)
}
