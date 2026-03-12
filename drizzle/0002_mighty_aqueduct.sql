CREATE TABLE `chatRooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchingRequestId` int NOT NULL,
	`ownerId` int NOT NULL,
	`caretakerId` int NOT NULL,
	`lastMessageAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chatRooms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chatRoomId` int NOT NULL,
	`senderId` int NOT NULL,
	`content` text NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
