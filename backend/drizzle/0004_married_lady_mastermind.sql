CREATE TABLE `teacher_attendances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacher_id` varchar(36) NOT NULL,
	`attendance_date` date NOT NULL,
	`checkin_time` timestamp,
	`checkout_time` timestamp,
	`status` enum('PRESENT','LATE','SICK','EXCUSED','ABSENT') NOT NULL,
	`note` text,
	`is_verified` boolean NOT NULL DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teacher_attendances_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_teacher_attendance` UNIQUE(`teacher_id`,`attendance_date`)
);
--> statement-breakpoint
ALTER TABLE `teacher_attendances` ADD CONSTRAINT `teacher_attendances_teacher_id_user_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;