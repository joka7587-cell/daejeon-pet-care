CREATE TABLE `matchingHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`ownerId` int NOT NULL,
	`caretakerId` int NOT NULL,
	`status` enum('matched','completed','cancelled') NOT NULL DEFAULT 'matched',
	`ownerRating` int,
	`ownerReview` text,
	`caretakerRating` int,
	`caretakerReview` text,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `matchingHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `matchingRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requesterId` int NOT NULL,
	`type` enum('walk_partner','find_caretaker','walk_request','emergency','short_care') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`neighborhood` varchar(50) NOT NULL,
	`requestDate` varchar(20) NOT NULL,
	`requestTime` varchar(20) NOT NULL,
	`duration` varchar(50) NOT NULL,
	`isUrgent` boolean NOT NULL DEFAULT false,
	`status` enum('pending','accepted','completed','cancelled') NOT NULL DEFAULT 'pending',
	`acceptedCaretakerId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `matchingRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`breed` varchar(100) NOT NULL,
	`age` int NOT NULL,
	`size` enum('소형','중형','대형') NOT NULL,
	`emoji` varchar(10),
	`specialNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userLocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`neighborhood` varchar(50) NOT NULL,
	`latitude` varchar(20) NOT NULL,
	`longitude` varchar(20) NOT NULL,
	`addressDetail` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userLocations_id` PRIMARY KEY(`id`),
	CONSTRAINT `userLocations_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `userProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','caretaker') NOT NULL,
	`nickname` varchar(100) NOT NULL,
	`bio` text,
	`profileEmoji` varchar(10),
	`rating` int NOT NULL DEFAULT 0,
	`reviewCount` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `userProfiles_userId_unique` UNIQUE(`userId`)
);
