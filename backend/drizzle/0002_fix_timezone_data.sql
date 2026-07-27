-- Perbaiki data attendance yang tersimpan dengan bug timezone.
-- Old code menyimpan jam WIB (09:39) seolah-olah UTC, sehingga TIMESTAMP
-- tersimpan 7 jam lebih maju. Contoh:
--   Absen 09:39 WIB → dulu tersimpan 09:39 UTC (salah)
--   Sekarang harus → 02:39 UTC (= 09:39 WIB)
--
-- Cara pakai: jalankan SEgera setelah restart backend & SEBELUM ada absen baru.

UPDATE attendances
SET
  checkin_time  = DATE_SUB(checkin_time, INTERVAL 7 HOUR),
  checkout_time = IF(checkout_time IS NOT NULL, DATE_SUB(checkout_time, INTERVAL 7 HOUR), NULL);

UPDATE teacher_attendances
SET
  checkin_time  = DATE_SUB(checkin_time, INTERVAL 7 HOUR),
  checkout_time = IF(checkout_time IS NOT NULL, DATE_SUB(checkout_time, INTERVAL 7 HOUR), NULL);
