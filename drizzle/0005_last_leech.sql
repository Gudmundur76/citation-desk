CREATE TABLE `api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`keyHash` varchar(64) NOT NULL,
	`label` varchar(128) NOT NULL,
	`scopes` text NOT NULL DEFAULT ('["read"]'),
	`keyPrefix` varchar(16) NOT NULL,
	`lastUsedAt` timestamp,
	`revokedAt` timestamp,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_keys_keyHash_unique` UNIQUE(`keyHash`)
);
