ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `kakaoId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `appRole` enum('owner','walker') DEFAULT 'owner' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_kakaoId_unique` UNIQUE(`kakaoId`);