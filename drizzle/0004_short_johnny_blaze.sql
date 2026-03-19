CREATE TABLE `friendRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fromUserId` int NOT NULL,
	`toUserId` int NOT NULL,
	`fromNickname` varchar(100) NOT NULL,
	`fromEmoji` varchar(10),
	`fromNeighborhood` varchar(50),
	`fromRole` enum('owner','caretaker') NOT NULL,
	`fromCode` varchar(20) NOT NULL,
	`status` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `friendRequests_id` PRIMARY KEY(`id`)
);
