CREATE DATABASE IF NOT EXISTS agenda_ajustes CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE agenda_ajustes;

CREATE TABLE IF NOT EXISTS tab_estado (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nom_estado VARCHAR(100) NOT NULL,
    sgl_estado VARCHAR(2) NOT NULL,
    INDEX idx_sigla (sgl_estado)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS tab_cidade (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_estado INT NOT NULL,
    nom_cidade VARCHAR(100) NOT NULL,
    cod_municipio_ibge VARCHAR(7),
    FOREIGN KEY (id_estado) REFERENCES tab_estado (id),
    INDEX idx_estado (id_estado),
    INDEX idx_ibge (cod_municipio_ibge)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS tab_pessoas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_cidade INT NOT NULL,
    ind_status ENUM('ativo', 'inativo') NOT NULL DEFAULT 'ativo',
    ind_tipo_pessoa ENUM(
        'medico',
        'secretaria',
        'costureira',
        'paciente',
        'administrador'
    ) NOT NULL,
    nom_completo VARCHAR(255) NOT NULL,
    num_cpf VARCHAR(11) UNIQUE NOT NULL,
    num_rg VARCHAR(20) NOT NULL,
    dta_nascimento DATE NOT NULL,
    des_logradouro VARCHAR(255) NOT NULL,
    num_endereco VARCHAR(10) NOT NULL,
    des_complemento VARCHAR(100),
    num_cep VARCHAR(8) NOT NULL,
    nom_bairro VARCHAR(100) NOT NULL,
    num_celular_1 VARCHAR(15) NOT NULL,
    ind_whatsapp_1 BOOLEAN NOT NULL default(true),
    num_celular_2 VARCHAR(15),
    ind_whatsapp_2 BOOLEAN NOT NULL default(true),
    des_email_1 VARCHAR(255) NOT NULL,
    des_email_2 VARCHAR(255),
    des_senha VARCHAR(255),
    num_tentativas_login INT DEFAULT 0,
    dta_ultimo_login DATETIME,
    dta_bloqueio_login DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    FOREIGN KEY (id_cidade) REFERENCES tab_cidade (id),
    INDEX idx_cpf (num_cpf),
    INDEX idx_tipo_pessoa (ind_tipo_pessoa),
    INDEX idx_status (ind_status),
    CONSTRAINT chk_cpf_length CHECK (LENGTH(num_cpf) = 11),
    CONSTRAINT chk_cep_length CHECK (LENGTH(num_cep) = 8)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS tab_agendamentos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_paciente INT NOT NULL,
    id_costureira INT NOT NULL,
    id_secretaria INT NOT NULL,
    dta_agendamento DATETIME NOT NULL,
    des_observacoes_geral TEXT,
    des_observacoes_costureira TEXT,
    ind_status ENUM(
        'agendado',
        'confirmado',
        'concluido',
        'cancelado',
        'falta'
    ) NOT NULL DEFAULT 'agendado',
    ind_paciente_compareceu BOOLEAN DEFAULT NULL,
    dta_confirmacao DATETIME,
    dta_conclusao DATETIME,
    dta_cancelamento DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    INDEX idx_paciente (id_paciente),
    INDEX idx_costureira (id_costureira),
    INDEX idx_secretaria (id_secretaria),
    INDEX idx_data (dta_agendamento),
    INDEX idx_status (ind_status),
    INDEX idx_costureira_ativa (
        id_costureira,
        ind_status,
        deleted_at
    ),
    FOREIGN KEY (id_paciente) REFERENCES tab_pessoas (id),
    FOREIGN KEY (id_costureira) REFERENCES tab_pessoas (id),
    FOREIGN KEY (id_secretaria) REFERENCES tab_pessoas (id),
    CONSTRAINT chk_data_futura CHECK (dta_agendamento > created_at)
) ENGINE = InnoDB;

CREATE TRIGGER before_insert_agendamento_validar_costureira_ativa
BEFORE INSERT ON tab_agendamentos
FOR EACH ROW BEGIN
    DECLARE v_count_agendamentos INT;
    
    -- Verificar se costureira já tem agendamento ativo
    SELECT COUNT(*) INTO v_count_agendamentos
    FROM tab_agendamentos
    WHERE id_costureira = NEW.id_costureira
    AND ind_status IN ('agendado', 'confirmado')
    AND deleted_at IS NULL;
    
    IF v_count_agendamentos > 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Costureira já possui um agendamento ativo. Conclua o agendamento anterior antes de criar um novo.';
    END IF;
END;

CREATE TRIGGER before_update_agendamento_validar_costureira_ativa
BEFORE UPDATE ON tab_agendamentos
FOR EACH ROW BEGIN
    DECLARE v_count_agendamentos INT;
    
    -- Se está mudando a costureira ou reativando status
    IF (NEW.id_costureira != OLD.id_costureira OR NEW.ind_status != OLD.ind_status) 
       AND NEW.ind_status IN ('agendado', 'confirmado') THEN
        
        SELECT COUNT(*) INTO v_count_agendamentos
        FROM tab_agendamentos
        WHERE id_costureira = NEW.id_costureira
        AND id != NEW.id
        AND ind_status IN ('agendado', 'confirmado')
        AND deleted_at IS NULL;
        
        IF v_count_agendamentos > 0 THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = 'Costureira já possui um agendamento ativo';
        END IF;
    END IF;
END;

CREATE TABLE IF NOT EXISTS tab_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT,
    des_acao VARCHAR(100) NOT NULL,
    des_tabela VARCHAR(50) NOT NULL,
    num_registro_id INT,
    des_detalhes JSON,
    num_ip_address VARCHAR(45),
    des_user_agent TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_usuario (id_usuario),
    INDEX idx_acao (des_acao),
    INDEX idx_tabela (des_tabela),
    INDEX idx_criado (created_at),
    INDEX idx_tabela_registro (des_tabela, num_registro_id),
    FOREIGN KEY (id_usuario) REFERENCES tab_pessoas (id)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS tab_categorias_produtos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nom_categoria VARCHAR(100) NOT NULL,
    id_pai INT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    INDEX idx_pai (id_pai),
    FOREIGN KEY (id_pai) REFERENCES tab_categorias_produtos (id)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS tab_produtos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_categoria INT,
    nom_produto VARCHAR(200) NOT NULL,
    num_sku VARCHAR(50),
    des_produto TEXT,
    ref_produto VARCHAR(50) UNIQUE,
    val_preco_base DECIMAL(10, 2),
    ind_ativo BOOLEAN DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    INDEX idx_categoria (id_categoria),
    INDEX idx_sku (num_sku),
    INDEX idx_ref (ref_produto),
    FOREIGN KEY (id_categoria) REFERENCES tab_categorias_produtos (id)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS tab_variacoes_cor_estampa (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nom_cor_estampa VARCHAR(100) NOT NULL,
    ind_tipo ENUM('cor', 'estampa') NOT NULL,
    val_codigo_hex VARCHAR(7), -- Para cores: #FF0000
    des_imagem_url VARCHAR(500), -- Para estampas/imagens da cor
    num_ordem_exibicao INT DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    INDEX idx_tipo (ind_tipo),
    INDEX idx_ordem (num_ordem_exibicao)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS tab_tamanhos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cod_tamanho VARCHAR(10) NOT NULL, -- Ex: P, M, G, GG, 36, 38, etc.
    des_tamanho VARCHAR(50),
    des_categoria_tamanho ENUM(
        'vestuario',
        'calcados',
        'acessorios',
        'outros'
    ),
    num_ordem_exibicao INT DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    INDEX idx_categoria (des_categoria_tamanho),
    INDEX idx_ordem (num_ordem_exibicao)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS tab_produto_grade (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_produto INT NOT NULL,
    id_variacao_cor_estampa INT,
    id_tamanho INT NOT NULL,
    num_sku VARCHAR(50) UNIQUE,
    val_preco_variacao DECIMAL(10, 2),
    ind_ativo BOOLEAN DEFAULT TRUE,
    num_codigo_barras VARCHAR(100),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    INDEX idx_produto (id_produto),
    INDEX idx_sku (num_sku),
    FOREIGN KEY (id_produto) REFERENCES tab_produtos (id) ON DELETE CASCADE,
    FOREIGN KEY (id_variacao_cor_estampa) REFERENCES tab_variacoes_cor_estampa (id),
    FOREIGN KEY (id_tamanho) REFERENCES tab_tamanhos (id),
    UNIQUE KEY uniq_combinacao (
        id_produto,
        id_variacao_cor_estampa,
        id_tamanho
    )
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS tab_produto_imagens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_produto_grade INT,
    id_produto INT, -- Para imagens gerais do produto
    des_titulo_imagem VARCHAR(50),
    des_imagem VARCHAR(255),
    end_url_imagem VARCHAR(500) NOT NULL,
    num_ordem INT DEFAULT 0,
    ind_principal BOOLEAN DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    INDEX idx_produto (id_produto),
    INDEX idx_grade (id_produto_grade),
    INDEX idx_ordem (num_ordem),
    FOREIGN KEY (id_produto_grade) REFERENCES tab_produto_grade (id) ON DELETE CASCADE,
    FOREIGN KEY (id_produto) REFERENCES tab_produtos (id) ON DELETE CASCADE,
    CONSTRAINT chk_produto_ou_grade CHECK (
        (
            id_produto IS NOT NULL
            AND id_produto_grade IS NULL
        )
        OR (
            id_produto IS NULL
            AND id_produto_grade IS NOT NULL
        )
    )
) ENGINE = InnoDB;

CREATE TRIGGER before_insert_produto_imagem_principal
BEFORE INSERT ON tab_produto_imagens
FOR EACH ROW BEGIN
    IF NEW.ind_principal = TRUE THEN
        IF NEW.id_produto IS NOT NULL THEN
            UPDATE tab_produto_imagens 
            SET ind_principal = FALSE 
            WHERE id_produto = NEW.id_produto 
            AND ind_principal = TRUE 
            AND deleted_at IS NULL;
        END IF;
        IF NEW.id_produto_grade IS NOT NULL THEN
            UPDATE tab_produto_imagens 
            SET ind_principal = FALSE 
            WHERE id_produto_grade = NEW.id_produto_grade 
            AND ind_principal = TRUE 
            AND deleted_at IS NULL;
        END IF;
    END IF;
END;

CREATE TRIGGER before_update_produto_imagem_principal
BEFORE UPDATE ON tab_produto_imagens
FOR EACH ROW BEGIN
    IF NEW.ind_principal = TRUE AND OLD.ind_principal = FALSE THEN
        IF NEW.id_produto IS NOT NULL THEN
            UPDATE tab_produto_imagens 
            SET ind_principal = FALSE 
            WHERE id_produto = NEW.id_produto 
            AND id != NEW.id
            AND ind_principal = TRUE 
            AND deleted_at IS NULL;
        END IF;
        IF NEW.id_produto_grade IS NOT NULL THEN
            UPDATE tab_produto_imagens 
            SET ind_principal = FALSE 
            WHERE id_produto_grade = NEW.id_produto_grade 
            AND id != NEW.id
            AND ind_principal = TRUE 
            AND deleted_at IS NULL;
        END IF;
    END IF;
END;

CREATE TABLE IF NOT EXISTS tab_produto_agendamento (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_agendamento INT,
    id_produto_grade INT,
    des_ajuste_produto TEXT,
    ind_status ENUM(
        'pendente',
        'producao',
        'concluido',
        'cancelado'
    ) NOT NULL DEFAULT 'pendente',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    INDEX idx_agendamento (id_agendamento),
    INDEX idx_produto_grade (id_produto_grade),
    INDEX idx_status (ind_status),
    FOREIGN KEY (id_agendamento) REFERENCES tab_agendamentos (id),
    FOREIGN KEY (id_produto_grade) REFERENCES tab_produto_grade (id)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS tab_fotos_ajustes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_produto_agendamento INT NOT NULL,
    des_caminho_arquivo VARCHAR(500) NOT NULL,
    nom_original VARCHAR(255) NOT NULL,
    num_tamanho_bytes INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    INDEX idx_produto_agendamento (id_produto_agendamento),
    FOREIGN KEY (id_produto_agendamento) REFERENCES tab_produto_agendamento (id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- ====================
-- TRIGGERS DE VALIDAÇÃO
-- ====================

-- Validar tipos de pessoa em agendamentos
CREATE TRIGGER before_insert_agendamento_validar_tipos
BEFORE INSERT ON tab_agendamentos
FOR EACH ROW BEGIN
    DECLARE v_tipo_paciente VARCHAR(20);
    DECLARE v_tipo_costureira VARCHAR(20);
    DECLARE v_tipo_secretaria VARCHAR(20);
    DECLARE v_count_agendamentos INT;
    
    -- Validar tipos de pessoa
    SELECT ind_tipo_pessoa INTO v_tipo_paciente 
    FROM tab_pessoas WHERE id = NEW.id_paciente AND deleted_at IS NULL;
    
    SELECT ind_tipo_pessoa INTO v_tipo_costureira 
    FROM tab_pessoas WHERE id = NEW.id_costureira AND deleted_at IS NULL;
    
    SELECT ind_tipo_pessoa INTO v_tipo_secretaria 
    FROM tab_pessoas WHERE id = NEW.id_secretaria AND deleted_at IS NULL;
    
    IF v_tipo_paciente IS NULL OR v_tipo_paciente != 'paciente' THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'id_paciente deve referenciar uma pessoa do tipo paciente';
    END IF;
    
    IF v_tipo_costureira IS NULL OR v_tipo_costureira != 'costureira' THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'id_costureira deve referenciar uma pessoa do tipo costureira';
    END IF;
    
    IF v_tipo_secretaria IS NULL OR (v_tipo_secretaria != 'secretaria' AND v_tipo_secretaria != 'administrador') THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'id_secretaria deve referenciar uma pessoa do tipo secretaria ou administrador';
    END IF;
    
    -- Validar regra: apenas um agendamento ativo por costureira
    SELECT COUNT(*) INTO v_count_agendamentos
    FROM tab_agendamentos
    WHERE id_costureira = NEW.id_costureira
    AND ind_status IN ('agendado', 'confirmado')
    AND deleted_at IS NULL;
    
    IF v_count_agendamentos > 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Costureira já possui um agendamento ativo. Conclua o agendamento anterior antes de criar um novo.';
    END IF;
END;

CREATE TRIGGER before_update_agendamento_validar_costureira
BEFORE UPDATE ON tab_agendamentos
FOR EACH ROW BEGIN
    DECLARE v_count_agendamentos INT;
    
    -- Se está mudando a costureira ou o status, validar
    IF NEW.id_costureira != OLD.id_costureira OR NEW.ind_status != OLD.ind_status THEN
        IF NEW.ind_status IN ('agendado', 'confirmado') THEN
            SELECT COUNT(*) INTO v_count_agendamentos
            FROM tab_agendamentos
            WHERE id_costureira = NEW.id_costureira
            AND id != NEW.id
            AND ind_status IN ('agendado', 'confirmado')
            AND deleted_at IS NULL;
            
            IF v_count_agendamentos > 0 THEN
                SIGNAL SQLSTATE '45000' 
                SET MESSAGE_TEXT = 'Costureira já possui um agendamento ativo';
            END IF;
        END IF;
    END IF;
END;

-- ====================
-- VIEWS ÚTEIS
-- ====================

-- View de agendamentos com informações completas
CREATE OR REPLACE VIEW vw_agendamentos_completos AS
SELECT
    a.id,
    a.dta_agendamento,
    a.ind_status,
    a.ind_paciente_compareceu,
    a.des_observacoes_geral,
    a.des_observacoes_costureira,
    -- Dados do Paciente
    p.id AS paciente_id,
    p.nom_completo AS paciente_nome,
    p.num_cpf AS paciente_cpf,
    p.num_celular_1 AS paciente_celular,
    p.des_email_1 AS paciente_email,
    -- Dados da Costureira
    c.id AS costureira_id,
    c.nom_completo AS costureira_nome,
    -- Dados da Secretária
    s.id AS secretaria_id,
    s.nom_completo AS secretaria_nome,
    a.created_at,
    a.updated_at
FROM
    tab_agendamentos a
    INNER JOIN tab_pessoas p ON a.id_paciente = p.id
    INNER JOIN tab_pessoas c ON a.id_costureira = c.id
    INNER JOIN tab_pessoas s ON a.id_secretaria = s.id
WHERE
    a.deleted_at IS NULL;

-- View de pessoas com endereços
CREATE OR REPLACE VIEW vw_pessoas_enderecos AS
SELECT p.id, p.nom_completo, p.num_cpf, p.ind_tipo_pessoa, p.ind_status, p.num_endereco, p.des_complemento, p.des_logradouro, p.num_cep, p.nom_bairro, c.nom_cidade, e.nom_estado, e.sgl_estado
FROM
    tab_pessoas p
    LEFT JOIN tab_cidade c ON c.id = p.id_cidade
    LEFT JOIN tab_estado e ON e.id = c.id_estado
WHERE
    p.deleted_at IS NULL;

USE agenda_ajustes_test;
-- Criar usuário administrador padrão (senha: admin123)
INSERT INTO
    tab_pessoas (
        ind_status,
        ind_tipo_pessoa,
        nom_completo,
        num_cpf,
        num_rg,
        dta_nascimento,
        des_logradouro,
        num_endereco,
        num_cep,
        nom_bairro,
        id_cidade,
        num_celular_1,
        des_email_1,
        des_senha
    )
VALUES (
        'ativo',
        'administrador',
        'Administrador do Sistema',
        '00000000000',
        '0000000',
        '1980-01-01',
        'Rua Principal',
        '1',
        '00000000',
        'Centro',
        5418,
        '62999999999',
        'admin@sistema.com',
        '$2a$10$YourHashedPasswordHere'
    );