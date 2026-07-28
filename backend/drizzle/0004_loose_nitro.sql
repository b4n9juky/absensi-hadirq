CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`student_id` int NOT NULL,
	`type` enum('CHECKIN','CHECKOUT') NOT NULL,
	`channel` varchar(20) DEFAULT 'whatsapp',
	`recipient` varchar(20) NOT NULL,
	`message` text NOT NULL,
	`status` enum('PENDING','SENT','FAILED') DEFAULT 'PENDING',
	`error` text,
	`sent_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wa_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_data` text NOT NULL,
	`status` varchar(20) DEFAULT 'disconnected',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wa_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `user` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;