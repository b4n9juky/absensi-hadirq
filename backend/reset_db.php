<?php
$db = new mysqli("localhost", "berk_absensi", "Masterwong**123", null);
if ($db->connect_error) die("Connect error: " . $db->connect_error . "\n");
echo "Connected\n";
$db->query("DROP DATABASE IF EXISTS berk_absensi");
echo "Dropped\n";
$db->query("CREATE DATABASE berk_absensi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
echo "Created\n";
$db->close();
echo "OK\n";
