-- Inicialização completa do banco de dados
SET NAMES utf8mb4;

SET FOREIGN_KEY_CHECKS = 0;

-- Criar banco de dados se não existir
CREATE DATABASE IF NOT EXISTS `agenda-ajuste` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `agenda-ajuste`;

-- Remover usuário antigo se existir (para recriação)
DROP USER IF EXISTS 'sga_user' @'%';

DROP USER IF EXISTS 'sga_user' @'localhost';

-- Criar novo usuário com privilégios
CREATE USER 'sga_user' @'%' IDENTIFIED
WITH
    mysql_native_password BY 'sga_password_2026';

CREATE USER 'sga_user' @'localhost' IDENTIFIED
WITH
    mysql_native_password BY 'sga_password_2026';

-- Conceder todos os privilégios
GRANT ALL PRIVILEGES ON `agenda-ajuste`.* TO 'sga_user' @'%';

GRANT ALL PRIVILEGES ON `agenda-ajuste`.* TO 'sga_user' @'localhost';

-- Privilégios extras
GRANT PROCESS ON *.* TO 'sga_user' @'%';

GRANT PROCESS ON *.* TO 'sga_user' @'localhost';

-- Aplicar mudanças
FLUSH PRIVILEGES;