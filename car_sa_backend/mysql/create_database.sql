CREATE DATABASE IF NOT EXISTS car_sa
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'car_sa_user'@'localhost'
  IDENTIFIED BY 'change_me_strong_password';

GRANT ALL PRIVILEGES ON car_sa.* TO 'car_sa_user'@'localhost';

FLUSH PRIVILEGES;
