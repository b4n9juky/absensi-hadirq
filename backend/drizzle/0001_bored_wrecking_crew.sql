ALTER TABLE `subject_attendances` DROP FOREIGN KEY `subject_attendances_teaching_schedule_id_teaching_schedules_id_fk`;
--> statement-breakpoint
ALTER TABLE `teaching_session_logs` DROP FOREIGN KEY `teaching_session_logs_teaching_schedule_id_teaching_schedules_id_fk`;
--> statement-breakpoint
ALTER TABLE `attendances` ADD `checkin_accuracy` double;--> statement-breakpoint
ALTER TABLE `students` ADD `parent_id` varchar(36);--> statement-breakpoint
ALTER TABLE `students` ADD CONSTRAINT `students_parent_id_user_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subject_attendances` ADD CONSTRAINT `sa_tsched_fk` FOREIGN KEY (`teaching_schedule_id`) REFERENCES `teaching_schedules`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teaching_session_logs` ADD CONSTRAINT `tsl_tsched_fk` FOREIGN KEY (`teaching_schedule_id`) REFERENCES `teaching_schedules`(`id`) ON DELETE no action ON UPDATE no action;