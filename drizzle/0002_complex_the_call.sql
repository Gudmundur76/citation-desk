CREATE TABLE `scheduledJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`taskUid` varchar(65) NOT NULL,
	`description` text,
	`lastRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scheduledJobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `scheduledJobs_name_unique` UNIQUE(`name`)
);
