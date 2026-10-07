-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Oct 07, 2026 at 10:46 AM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `car_sa`
--

-- --------------------------------------------------------

--
-- Table structure for table `business_docs`
--

CREATE TABLE `business_docs` (
  `id` int(11) NOT NULL,
  `garage_id` int(11) NOT NULL,
  `doc_type` varchar(100) NOT NULL,
  `file_path` text DEFAULT NULL,
  `issued_date` datetime DEFAULT NULL,
  `expiry_date` datetime DEFAULT NULL,
  `verified` tinyint(1) DEFAULT 0,
  `verified_by_user_id` int(11) DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `business_docs`
--

INSERT INTO `business_docs` (`id`, `garage_id`, `doc_type`, `file_path`, `issued_date`, `expiry_date`, `verified`, `verified_by_user_id`, `verified_at`, `created_at`, `updated_at`) VALUES
(1, 1, 'business_license', 'http://localhost:5000/uploads/certificate-1771594035697-400790282.pdf', NULL, NULL, 0, NULL, NULL, '2026-02-20 13:27:25', '2026-02-20 13:27:25'),
(2, 1, 'registration_certificate', 'http://localhost:5000/uploads/certificate-1771594038377-85139371.pdf', NULL, NULL, 0, NULL, NULL, '2026-02-20 13:27:25', '2026-02-20 13:27:25'),
(3, 1, 'tax_clearance', 'http://localhost:5000/uploads/certificate-1771594041792-933871938.pdf', NULL, NULL, 0, NULL, NULL, '2026-02-20 13:27:25', '2026-02-20 13:27:25'),
(4, 1, 'insurance', 'http://localhost:5000/uploads/certificate-1771594044298-168496349.pdf', NULL, NULL, 0, NULL, NULL, '2026-02-20 13:27:25', '2026-02-20 13:27:25'),
(5, 2, 'business_license', 'http://localhost:5000/uploads/Screenshot from 2026-02-20 17-46-50-1771603254665-392618390.png', '2026-02-20 00:00:00', NULL, 0, NULL, NULL, '2026-02-20 16:01:16', '2026-02-20 16:01:16'),
(6, 2, 'registration_certificate', 'http://localhost:5000/uploads/certificate-1771603260715-841216365.pdf', NULL, NULL, 0, NULL, NULL, '2026-02-20 16:01:16', '2026-02-20 16:01:16'),
(7, 2, 'tax_clearance', 'http://localhost:5000/uploads/certificate-1771603266898-495248056.pdf', NULL, NULL, 0, NULL, NULL, '2026-02-20 16:01:16', '2026-02-20 16:01:16'),
(8, 2, 'insurance', 'http://localhost:5000/uploads/certificate-1771603271022-123842086.pdf', NULL, NULL, 0, NULL, NULL, '2026-02-20 16:01:16', '2026-02-20 16:01:16'),
(9, 3, 'business_license', 'http://localhost:5000/uploads/certificate_3-1773939706920-14982884.png', NULL, NULL, 0, NULL, NULL, '2026-03-19 17:02:46', '2026-03-19 17:02:46'),
(10, 3, 'registration_certificate', 'http://localhost:5000/uploads/certificate_3-1773939715638-761725454.png', NULL, NULL, 0, NULL, NULL, '2026-03-19 17:02:46', '2026-03-19 17:02:46'),
(11, 3, 'tax_clearance', 'http://localhost:5000/uploads/WhatsApp Image 2025-11-21 at 17.53.13-1773939722646-631164238.jpeg', NULL, NULL, 0, NULL, NULL, '2026-03-19 17:02:46', '2026-03-19 17:02:46'),
(12, 3, 'insurance', 'http://localhost:5000/uploads/certificate_3-1773939728287-306690117.png', NULL, NULL, 0, NULL, NULL, '2026-03-19 17:02:46', '2026-03-19 17:02:46'),
(13, 4, 'business_license', 'http://localhost:5000/uploads/certificate_1-1774031483022-453583836.png', NULL, NULL, 0, NULL, NULL, '2026-03-20 18:32:09', '2026-03-20 18:32:09'),
(14, 4, 'registration_certificate', 'http://localhost:5000/uploads/Proof of registration Eric-1774031510352-633137815.pdf', NULL, NULL, 0, NULL, NULL, '2026-03-20 18:32:09', '2026-03-20 18:32:09'),
(15, 4, 'tax_clearance', 'http://localhost:5000/uploads/BIble verse prayer-1774031518852-64111087.pdf', NULL, NULL, 0, NULL, NULL, '2026-03-20 18:32:09', '2026-03-20 18:32:09'),
(16, 4, 'insurance', 'http://localhost:5000/uploads/bible grapoh-1774031527726-997635639.png', NULL, NULL, 0, NULL, NULL, '2026-03-20 18:32:09', '2026-03-20 18:32:09');

-- --------------------------------------------------------

--
-- Table structure for table `car_register_requests`
--

CREATE TABLE `car_register_requests` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `garage_id` int(11) NOT NULL,
  `requested_by_user_id` int(11) NOT NULL,
  `status` enum('pending','confirmed','rejected','expired') NOT NULL DEFAULT 'pending',
  `expires_at` datetime DEFAULT NULL,
  `verification_code` varchar(255) DEFAULT NULL,
  `verification_code_hash` varchar(255) DEFAULT NULL,
  `code_verified` tinyint(1) NOT NULL DEFAULT 0,
  `vehicle_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`vehicle_data`)),
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `car_register_requests`
--

INSERT INTO `car_register_requests` (`id`, `user_id`, `garage_id`, `requested_by_user_id`, `status`, `expires_at`, `verification_code`, `verification_code_hash`, `code_verified`, `vehicle_data`, `created_at`, `updated_at`) VALUES
(1, 4, 2, 3, 'confirmed', '2026-03-19 23:59:28', NULL, NULL, 1, '{\"make\": \"TOYOTA\", \"year\": 2014, \"model\": \"RANDCRUISER\", \"fuel_type\": \"Diesel\", \"license_plate\": \"RAH000B\"}', '2026-03-18 23:59:28', '2026-03-19 00:01:05'),
(2, 4, 2, 3, 'confirmed', '2026-03-20 11:22:29', NULL, NULL, 1, '{\"make\": \"TOYOTA\", \"year\": 2002, \"model\": \"Colora\", \"fuel_type\": \"Diesel\", \"license_plate\": \"RAA000A\"}', '2026-03-19 11:22:29', '2026-03-19 11:23:27');

-- --------------------------------------------------------

--
-- Table structure for table `email_verifications`
--

CREATE TABLE `email_verifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `email_verifications`
--

INSERT INTO `email_verifications` (`id`, `user_id`, `token`, `expires_at`, `used`, `created_at`, `updated_at`) VALUES
(1, 2, 'a00f312833f57fe82ecf5abb3ddf8fe7fd8764cc570f0c88e910f115b7f0099f', '2026-02-20 13:42:25', 1, '2026-02-20 13:27:25', '2026-02-20 13:54:46'),
(2, 2, '041cbeda6499f4a44179d46650da131d5e76672f90829be8748b06204367fda7', '2026-02-20 14:09:46', 1, '2026-02-20 13:54:46', '2026-02-20 13:55:00'),
(3, 4, '475cabec48e223022cb809645c21dc29d1e06fd0d53a6ff9d4b4e08b4f9c7d6a', '2026-03-19 00:07:44', 0, '2026-03-18 23:52:44', '2026-03-18 23:52:44'),
(4, 6, '338092eedd3d7244e271cbfb7fbe76a7bba5ea6ffc08117acf4c8ff0990f55f2', '2026-03-19 17:17:46', 1, '2026-03-19 17:02:46', '2026-03-19 17:03:25');

-- --------------------------------------------------------

--
-- Table structure for table `garages`
--

CREATE TABLE `garages` (
  `id` int(11) NOT NULL,
  `owner_user_id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `country` varchar(100) NOT NULL DEFAULT 'Rwanda',
  `registration_number` varchar(50) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `garages`
--

INSERT INTO `garages` (`id`, `owner_user_id`, `name`, `address`, `city`, `country`, `registration_number`, `created_at`, `updated_at`) VALUES
(1, 2, 'SP Garage', 'Kigali', 'Kigali', 'Rwanda', '1928872323', '2026-02-20 13:27:25', '2026-02-20 13:27:25'),
(2, 2, 'MUMENA Garage', 'Kigali', 'Kigali', 'Rwanda', '9238923', '2026-02-20 16:01:16', '2026-02-20 16:01:16'),
(3, 6, 'Murinzi garage', 'Kigali', 'Kigali', 'Rwanda', '9832323', '2026-03-19 17:02:46', '2026-03-19 17:02:46'),
(4, 7, 'Girgar Garage', 'Kigali', 'Kigali', 'Rwanda', '89232323', '2026-03-20 18:32:09', '2026-03-20 18:32:09');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` enum('car_register_request','service_request','system','other') NOT NULL DEFAULT 'other',
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `read` tinyint(1) NOT NULL DEFAULT 0,
  `read_at` datetime DEFAULT NULL,
  `related_entity_type` varchar(255) DEFAULT NULL,
  `related_entity_id` int(11) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `type`, `title`, `message`, `read`, `read_at`, `related_entity_type`, `related_entity_id`, `metadata`, `created_at`, `updated_at`) VALUES
(1, 4, 'car_register_request', 'Vehicle Registration Request', 'MUMENA Garage is requesting to register a vehicle (RAH000B) to your account. Please confirm or reject this request.', 1, '2026-03-19 00:01:05', 'car_register_request', 1, '{\"garage_name\": \"MUMENA Garage\", \"vehicle_data\": {\"make\": \"TOYOTA\", \"year\": 2014, \"model\": \"RANDCRUISER\", \"fuel_type\": \"Diesel\", \"license_plate\": \"RAH000B\"}, \"license_plate\": \"RAH000B\"}', '2026-03-18 23:59:31', '2026-03-19 00:01:05'),
(2, 4, 'car_register_request', 'Vehicle Registration Request', 'MUMENA Garage is requesting to register a vehicle (RAA000A) to your account. Please confirm or reject this request.', 1, '2026-03-19 12:57:49', 'car_register_request', 2, '{\"garage_name\": \"MUMENA Garage\", \"vehicle_data\": {\"make\": \"TOYOTA\", \"year\": 2002, \"model\": \"Colora\", \"fuel_type\": \"Diesel\", \"license_plate\": \"RAA000A\"}, \"license_plate\": \"RAA000A\"}', '2026-03-19 11:22:32', '2026-03-19 12:57:49'),
(3, 4, 'service_request', 'Service Completed', 'MUMENA Garage completed Engine oil for your vehicle (RAA000A).', 1, '2026-03-19 12:57:56', 'service', 1, '{\"vehicle_id\": 1, \"garage_name\": \"MUMENA Garage\", \"completed_at\": \"2026-03-19T11:24:28.895Z\", \"service_name\": \"Engine oil\", \"license_plate\": \"RAA000A\", \"scheduled_date\": \"2026-03-19T00:00:00.000\"}', '2026-03-19 11:24:28', '2026-03-19 12:57:56'),
(4, 4, 'service_request', 'Service Completed', 'MUMENA Garage completed Gear box oil for your vehicle (RAA000A).', 1, '2026-03-19 14:20:44', 'service', 2, '{\"vehicle_id\": 1, \"garage_name\": \"MUMENA Garage\", \"completed_at\": \"2026-03-19T14:08:45.195Z\", \"service_name\": \"Gear box oil\", \"license_plate\": \"RAA000A\", \"scheduled_date\": \"2026-03-19T00:00:00.000\", \"mileage_at_service\": 1000, \"next_service_mileage\": 6000}', '2026-03-19 14:08:45', '2026-03-19 14:20:44'),
(5, 8, 'service_request', 'Service Completed', 'MUMENA Garage completed Engine oil for your vehicle (RAD111A).', 0, NULL, 'service', 3, '{\"garage_name\":\"MUMENA Garage\",\"service_name\":\"Engine oil\",\"license_plate\":\"RAD111A\",\"vehicle_id\":2,\"scheduled_date\":\"2026-09-25T00:00:00.000\",\"completed_at\":\"2026-09-25T11:19:50.227Z\",\"mileage_at_service\":5000,\"next_service_mileage\":10000,\"oil_product\":{\"id\":3,\"name\":\"Hash Premium\",\"brand\":\"Hash\",\"grade\":\"10W-40\",\"category\":\"engine_oil\"}}', '2026-09-25 11:19:50', '2026-09-25 11:19:50'),
(6, 8, 'service_request', 'Service Completed', 'MUMENA Garage completed Engine oil for your vehicle (RAD111A).', 0, NULL, 'service', 4, '{\"garage_name\":\"MUMENA Garage\",\"service_name\":\"Engine oil\",\"license_plate\":\"RAD111A\",\"vehicle_id\":2,\"scheduled_date\":\"2026-09-25T00:00:00.000\",\"completed_at\":\"2026-09-25T12:57:39.949Z\",\"mileage_at_service\":10000,\"next_service_mileage\":15000,\"oil_product\":{\"id\":3,\"name\":\"Hash Premium\",\"brand\":\"Hash\",\"grade\":\"10W-40\",\"category\":\"engine_oil\"}}', '2026-09-25 12:57:39', '2026-09-25 12:57:39');

-- --------------------------------------------------------

--
-- Table structure for table `oil_products`
--

CREATE TABLE `oil_products` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(150) NOT NULL,
  `brand` varchar(100) NOT NULL,
  `grade` varchar(50) DEFAULT NULL,
  `category` enum('engine_oil','gearbox_oil','transmission_oil','other') NOT NULL DEFAULT 'engine_oil',
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `oil_products`
--

INSERT INTO `oil_products` (`id`, `name`, `brand`, `grade`, `category`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Quartz 9000', 'Total', '5W-30', 'engine_oil', 'Engine oil', 1, '2026-03-19 16:55:33', '2026-03-19 16:55:33'),
(2, 'Engine Oil Standard', 'Engen', '20W-50', 'engine_oil', 'Engine oil', 1, '2026-03-19 16:55:33', '2026-03-19 16:55:33'),
(3, 'Hash Premium', 'Hash', '10W-40', 'engine_oil', 'Engine oil', 1, '2026-03-19 16:55:33', '2026-03-19 16:55:33'),
(4, 'Gear Oil GL-5', 'Total', '75W-90', 'gearbox_oil', 'Gearbox oil', 1, '2026-03-19 16:55:33', '2026-03-19 16:55:33');

-- --------------------------------------------------------

--
-- Table structure for table `push_device_tokens`
--

CREATE TABLE `push_device_tokens` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `device_token` text NOT NULL,
  `platform` enum('android','ios','web','unknown') NOT NULL DEFAULT 'unknown',
  `device_id` varchar(255) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `last_seen_at` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `services`
--

CREATE TABLE `services` (
  `id` int(11) NOT NULL,
  `vehicle_id` int(11) NOT NULL,
  `garage_id` int(11) NOT NULL,
  `service_catalog_id` int(11) NOT NULL,
  `oil_product_id` int(10) UNSIGNED DEFAULT NULL,
  `performed_by_user_id` int(11) NOT NULL,
  `status` enum('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'completed',
  `notes` text DEFAULT NULL,
  `scheduled_date` datetime DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `estimated_cost` decimal(10,2) DEFAULT NULL,
  `actual_cost` decimal(10,2) DEFAULT NULL,
  `mileage_at_service` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `next_service_mileage` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `services`
--

INSERT INTO `services` (`id`, `vehicle_id`, `garage_id`, `service_catalog_id`, `oil_product_id`, `performed_by_user_id`, `status`, `notes`, `scheduled_date`, `started_at`, `completed_at`, `estimated_cost`, `actual_cost`, `mileage_at_service`, `created_at`, `updated_at`, `next_service_mileage`) VALUES
(1, 1, 2, 1, NULL, 3, 'completed', NULL, '2026-03-18 22:00:00', '2026-03-19 11:24:28', '2026-03-19 11:24:28', NULL, NULL, 3000, '2026-03-19 11:24:28', '2026-03-19 11:24:28', NULL),
(2, 1, 2, 10, NULL, 3, 'completed', NULL, '2026-03-18 22:00:00', '2026-03-19 14:08:45', '2026-03-19 14:08:45', NULL, NULL, 1000, '2026-03-19 14:08:45', '2026-03-19 14:08:45', 6000),
(3, 2, 2, 1, 3, 3, 'completed', NULL, '2026-09-24 22:00:00', '2026-09-25 11:19:50', '2026-09-25 11:19:50', NULL, NULL, 5000, '2026-09-25 11:19:50', '2026-09-25 11:19:50', 10000),
(4, 2, 2, 1, 3, 3, 'completed', NULL, '2026-09-24 22:00:00', '2026-09-25 12:57:39', '2026-09-25 12:57:39', NULL, NULL, 10000, '2026-09-25 12:57:39', '2026-09-25 12:57:39', 15000);

-- --------------------------------------------------------

--
-- Table structure for table `service_catalog`
--

CREATE TABLE `service_catalog` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `service_kind` varchar(50) DEFAULT NULL,
  `interval_type` enum('days','km') NOT NULL,
  `recommended_interval_days` int(11) DEFAULT NULL,
  `recommended_interval_km` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `service_catalog`
--

INSERT INTO `service_catalog` (`id`, `name`, `description`, `service_kind`, `interval_type`, `recommended_interval_days`, `recommended_interval_km`, `created_at`, `updated_at`) VALUES
(1, 'Engine oil', 'Replace engine oil and filter', 'gearbox_oil_change', 'km', NULL, 5000, '2025-11-27 04:07:35', '2025-11-29 12:29:01'),
(2, 'Brake Inspection', 'Check brake pads, discs, fluid', NULL, 'km', NULL, 3000, '2025-11-27 04:07:35', '2025-11-27 04:07:35'),
(3, 'Battery Check', 'Test and replace battery if needed', NULL, 'km', NULL, 6000, '2025-11-27 04:07:35', '2025-12-01 13:13:51'),
(4, 'Tire Rotation', 'Rotate tires and balance wheels', NULL, 'km', NULL, 8000, '2025-11-27 04:07:35', '2025-11-27 04:07:35'),
(5, 'Engine Diagnostics', 'Scan engine for faults and performance issues', NULL, 'km', NULL, 5000, '2025-11-27 04:07:35', '2025-11-27 04:07:35'),
(6, 'Air Filter Replacement', 'Replace cabin and engine air filters', NULL, 'km', NULL, 6000, '2025-11-27 04:07:35', '2025-11-27 04:07:35'),
(7, 'Coolant Flush', 'Drain and refill radiator coolant', NULL, 'km', NULL, 10000, '2025-11-27 04:07:35', '2025-11-27 04:07:35'),
(8, 'Wheel Alignment', 'Adjust wheel angles for proper tracking', NULL, 'km', NULL, 6000, '2025-11-27 04:07:35', '2025-11-27 04:07:35'),
(10, 'Gear box oil', 'Flush and replace gearbox oil', 'gearbox_oil_change', 'km', NULL, 5000, '2025-11-29 12:30:52', '2025-12-01 13:13:39');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `email_verified` tinyint(1) NOT NULL DEFAULT 0,
  `phone` varchar(255) DEFAULT NULL,
  `date_of_birth` datetime DEFAULT NULL,
  `gender` varchar(10) DEFAULT NULL,
  `role` enum('super_admin','garage_admin','service_technician','car_owner') NOT NULL DEFAULT 'car_owner',
  `password_hash` text NOT NULL,
  `garage_id` int(11) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `approved` tinyint(1) NOT NULL DEFAULT 1,
  `approved_at` datetime DEFAULT NULL,
  `approved_by_user_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `email_verified`, `phone`, `date_of_birth`, `gender`, `role`, `password_hash`, `garage_id`, `active`, `approved`, `approved_at`, `approved_by_user_id`, `created_at`, `updated_at`) VALUES
(1, 'NIYOGUSHIMWA Nathanael', 'admin@carsa.com', 1, '+250781786734', '1989-12-31 22:00:00', 'male', 'super_admin', '$2b$10$Z17rS82W2Q5ko84oqIyTBO3W3OqipusrLRsdfwpdTco8us8SBIADe', NULL, 1, 1, NULL, NULL, '2026-02-20 13:25:32', '2026-02-20 13:25:32'),
(2, 'NIYOGUSHIMWA Natanael', 'nathanaelniyogushimwa@gmail.com', 1, '0781796824', '2026-02-20 00:00:00', 'male', 'garage_admin', '$2b$10$Z17rS82W2Q5ko84oqIyTBO3W3OqipusrLRsdfwpdTco8us8SBIADe', 1, 1, 1, '2026-02-20 14:11:15', 1, '2026-02-20 13:27:25', '2026-02-20 14:11:15'),
(3, 'MUMENA Tech', 'nathan00@gmail.com', 1, '0781796824', '2026-02-20 00:00:00', 'male', 'service_technician', '$2b$10$5VnoedR9GY0JewjLQTps9uzOm74ShWYfKFGiT/bLe184lL3zhtiTO', 2, 1, 1, NULL, NULL, '2026-02-20 16:06:49', '2026-02-20 16:06:49'),
(4, 'MUGABO Jean', 'jean@gmail.com', 1, '0781796824', '2026-03-19 00:00:00', 'male', 'car_owner', '$2b$10$DOipI682ymuvuCXYXvIYzOP/2uZ.9wg9lWANM9gGlb9acGUuA3x32', NULL, 1, 1, NULL, NULL, '2026-03-18 23:52:44', '2026-03-18 23:52:44'),
(6, 'MURINZI Regis', 'niyo.nathan00@gmail.com', 1, '0724728389', '2026-03-19 00:00:00', 'male', 'garage_admin', '$2b$10$RwGz8tcKzbxswr2dg01fZulib.wfN53zFz8Gu4x8hk1qdCTbTCALO', 3, 1, 1, '2026-03-19 17:04:06', 1, '2026-03-19 17:02:46', '2026-03-19 17:04:06'),
(7, 'MUGABO Jonas', 'mugabojonnas@gmail.com', 1, '0781796821', '2026-03-20 00:00:00', 'male', 'garage_admin', '$2b$10$n3LBd4KgLEKwFviAdVWtE.wruLdAJDsvJ3Jg.fi8wGPisQwH7TI5i', 4, 1, 0, NULL, NULL, '2026-03-20 18:32:09', '2026-03-20 18:32:09'),
(8, 'MURENZI Jonas', 'mujonas@gmail.com', 0, '0781796824', '1996-09-29 00:00:00', 'male', 'car_owner', '$2b$10$Ztt87/vOPlZRPnn6NJo5u.GhBtII9hQaXMmQNEa3GdENdLYVWOYIu', NULL, 1, 1, NULL, NULL, '2026-09-25 11:07:38', '2026-09-25 11:07:38');

-- --------------------------------------------------------

--
-- Table structure for table `vehicles`
--

CREATE TABLE `vehicles` (
  `id` int(11) NOT NULL,
  `owner_id` int(11) NOT NULL,
  `make` varchar(50) DEFAULT NULL,
  `model` varchar(50) DEFAULT NULL,
  `year` int(11) DEFAULT NULL,
  `vin` varchar(50) DEFAULT NULL,
  `license_plate` varchar(20) NOT NULL,
  `fuel_type` varchar(20) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `vehicles`
--

INSERT INTO `vehicles` (`id`, `owner_id`, `make`, `model`, `year`, `vin`, `license_plate`, `fuel_type`, `created_at`, `updated_at`) VALUES
(1, 4, 'TOYOTA', 'Colora', 2002, NULL, 'RAA000A', 'Diesel', '2026-03-19 11:23:27', '2026-03-19 11:23:27'),
(2, 8, 'TOYOTA', 'YARIS', 2021, NULL, 'RAD111A', 'Petrol', '2026-09-25 11:07:38', '2026-09-25 11:07:38');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `business_docs`
--
ALTER TABLE `business_docs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `garage_id` (`garage_id`);

--
-- Indexes for table `car_register_requests`
--
ALTER TABLE `car_register_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `garage_id` (`garage_id`);

--
-- Indexes for table `email_verifications`
--
ALTER TABLE `email_verifications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`);

--
-- Indexes for table `garages`
--
ALTER TABLE `garages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `owner_user_id` (`owner_user_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `oil_products`
--
ALTER TABLE `oil_products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_oil_products_unique` (`brand`,`name`,`grade`,`category`);

--
-- Indexes for table `push_device_tokens`
--
ALTER TABLE `push_device_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `push_device_tokens_device_token` (`device_token`) USING HASH,
  ADD KEY `push_device_tokens_user_id` (`user_id`);

--
-- Indexes for table `services`
--
ALTER TABLE `services`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_services_oil_product_id` (`oil_product_id`),
  ADD KEY `vehicle_id` (`vehicle_id`),
  ADD KEY `garage_id` (`garage_id`),
  ADD KEY `service_catalog_id` (`service_catalog_id`),
  ADD KEY `performed_by_user_id` (`performed_by_user_id`);

--
-- Indexes for table `service_catalog`
--
ALTER TABLE `service_catalog`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `garage_id` (`garage_id`);

--
-- Indexes for table `vehicles`
--
ALTER TABLE `vehicles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `license_plate` (`license_plate`),
  ADD UNIQUE KEY `vin` (`vin`),
  ADD KEY `owner_id` (`owner_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `business_docs`
--
ALTER TABLE `business_docs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `car_register_requests`
--
ALTER TABLE `car_register_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `email_verifications`
--
ALTER TABLE `email_verifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `garages`
--
ALTER TABLE `garages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `oil_products`
--
ALTER TABLE `oil_products`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `push_device_tokens`
--
ALTER TABLE `push_device_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `services`
--
ALTER TABLE `services`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `service_catalog`
--
ALTER TABLE `service_catalog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `vehicles`
--
ALTER TABLE `vehicles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `business_docs`
--
ALTER TABLE `business_docs`
  ADD CONSTRAINT `business_docs_ibfk_1` FOREIGN KEY (`garage_id`) REFERENCES `garages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `car_register_requests`
--
ALTER TABLE `car_register_requests`
  ADD CONSTRAINT `car_register_requests_ibfk_103` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `car_register_requests_ibfk_104` FOREIGN KEY (`garage_id`) REFERENCES `garages` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `garages`
--
ALTER TABLE `garages`
  ADD CONSTRAINT `garages_ibfk_1` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `push_device_tokens`
--
ALTER TABLE `push_device_tokens`
  ADD CONSTRAINT `push_device_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `services`
--
ALTER TABLE `services`
  ADD CONSTRAINT `services_ibfk_351` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `services_ibfk_352` FOREIGN KEY (`garage_id`) REFERENCES `garages` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `services_ibfk_353` FOREIGN KEY (`service_catalog_id`) REFERENCES `service_catalog` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `services_ibfk_354` FOREIGN KEY (`oil_product_id`) REFERENCES `oil_products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `services_ibfk_355` FOREIGN KEY (`performed_by_user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`garage_id`) REFERENCES `garages` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `vehicles`
--
ALTER TABLE `vehicles`
  ADD CONSTRAINT `vehicles_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
