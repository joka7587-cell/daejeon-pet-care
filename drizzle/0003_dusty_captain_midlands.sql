CREATE TABLE `friendCodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`code` varchar(20) NOT NULL,
	`nickname` varchar(100) NOT NULL,
	`profileEmoji` varchar(10),
	`neighborhood` varchar(50),
	`role` enum('owner','caretaker') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `friendCodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `friendCodes_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `friendCodes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `friendships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`friendUserId` int NOT NULL,
	`friendNickname` varchar(100) NOT NULL,
	`friendEmoji` varchar(10),
	`friendNeighborhood` varchar(50),
	`friendRole` enum('owner','caretaker') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `friendships_id` PRIMARY KEY(`id`)
);
