-- View: datalake_prod.indicadores_servicos.vw_inventario_onsite
-- Única alteração em relação ao original: removida a linha
--   AND NOT cf.cod_peca_enviada LIKE '000000000008%'

CREATE OR REPLACE MATERIALIZED VIEW datalake_prod.indicadores_servicos.vw_inventario_onsite
SCHEDULE CRON '0 0,25,30,50 7,10,14 * * ?' AT TIME ZONE 'America/Sao_Paulo'
AS
WITH cf_base AS (SELECT
    *
  FROM
    (
      SELECT
        *,
        ROW_NUMBER() OVER (
            PARTITION BY id, tecnico_id
            ORDER BY data_montagem_lote_dev DESC NULLS LAST, status_consumo DESC
          ) AS rn
      FROM
        datalake_prod.indicadores_servicos.consolidacao_fiscal
    )
  WHERE
    rn = 1
),
ultimo_envio_aceito AS (SELECT
    iet.control_fiscal_env_id,
    et.tecnico_id AS tecnico_id_atual,
    et.env_tecnico_data_hora_recebido AS data_hora_recebido
  FROM
    datalake_prod.assist.itens_env_tecnico iet
      INNER JOIN datalake_prod.assist.env_tecnico et
        ON et.env_tecnico_id = iet.env_tecnico_id
  WHERE
    et.env_tecnico_data_hora_recebido IS NOT NULL
    AND year(et.env_tecnico_data_hora_recebido) > 1970
    AND et.env_tecnico_id
      = (
        SELECT
          MAX(iet2.env_tecnico_id)
        FROM
          datalake_prod.assist.itens_env_tecnico iet2
            INNER JOIN datalake_prod.assist.env_tecnico et2
              ON et2.env_tecnico_id = iet2.env_tecnico_id
        WHERE
          iet2.control_fiscal_env_id = iet.control_fiscal_env_id
          AND et2.env_tecnico_data_hora_recebido IS NOT NULL
          AND year(et2.env_tecnico_data_hora_recebido) > 1970
      )
),
reenvio_sem_recebimento AS (SELECT DISTINCT
    iet.control_fiscal_env_id
  FROM
    datalake_prod.assist.itens_env_tecnico iet
      INNER JOIN datalake_prod.assist.env_tecnico et
        ON et.env_tecnico_id = iet.env_tecnico_id
  WHERE
    iet.env_tecnico_id
      = (
        SELECT
          MAX(iet2.env_tecnico_id)
        FROM
          datalake_prod.assist.itens_env_tecnico iet2
        WHERE
          iet2.control_fiscal_env_id = iet.control_fiscal_env_id
      )
    AND (
      et.env_tecnico_data_hora_recebido IS NULL
      OR year(et.env_tecnico_data_hora_recebido) <= 1970
    )
    AND EXISTS (
      SELECT
        1
      FROM
        datalake_prod.assist.itens_env_tecnico iet3
          INNER JOIN datalake_prod.assist.env_tecnico et3
            ON et3.env_tecnico_id = iet3.env_tecnico_id
      WHERE
        iet3.control_fiscal_env_id = iet.control_fiscal_env_id
        AND iet3.env_tecnico_id < iet.env_tecnico_id
        AND et3.env_tecnico_data_hora_recebido IS NOT NULL
        AND year(et3.env_tecnico_data_hora_recebido) > 1970
    )
),
dev_ativo AS (
  SELECT DISTINCT
    idt.control_fiscal_env_id
  FROM
    datalake_prod.assist.itens_dev_tecnico idt
      INNER JOIN datalake_prod.assist.dev_tecnico dt
        ON dt.dev_tecnico_id = idt.dev_tecnico_id
  WHERE
    dt.dev_tecnico_data_hora_montagem IS NOT NULL
    AND year(dt.dev_tecnico_data_hora_montagem) > 1970
    AND (
      dt.dev_tecnico_data_hora_recebido IS NULL
      OR year(dt.dev_tecnico_data_hora_recebido) <= 1970
    )
    AND dt.dev_tecnico_id
      = (
        SELECT
          MAX(dt2.dev_tecnico_id)
        FROM
          datalake_prod.assist.itens_dev_tecnico idt2
            INNER JOIN datalake_prod.assist.dev_tecnico dt2
              ON dt2.dev_tecnico_id = idt2.dev_tecnico_id
        WHERE
          idt2.control_fiscal_env_id = idt.control_fiscal_env_id
          AND dt2.dev_tecnico_data_hora_montagem IS NOT NULL
          AND year(dt2.dev_tecnico_data_hora_montagem) > 1970
      )
    AND NOT EXISTS (
      SELECT
        1
      FROM
        datalake_prod.assist.itens_env_tecnico iet
      WHERE
        iet.control_fiscal_env_id = idt.control_fiscal_env_id
        AND iet.env_tecnico_id = dt.env_tecnico_id
        AND year(iet.modified_at) > 1970
        AND year(idt.created_at) > 1970
        AND iet.modified_at > idt.created_at + INTERVAL 1 HOUR
    )
),
dev_concluido AS (SELECT DISTINCT
    idt.control_fiscal_env_id,
    dt.dev_tecnico_data_hora_recebido
  FROM
    datalake_prod.assist.itens_dev_tecnico idt
      INNER JOIN datalake_prod.assist.dev_tecnico dt
        ON dt.dev_tecnico_id = idt.dev_tecnico_id
  WHERE
    dt.dev_tecnico_data_hora_montagem IS NOT NULL
    AND year(dt.dev_tecnico_data_hora_montagem) > 1970
    AND dt.dev_tecnico_data_hora_recebido IS NOT NULL
    AND year(dt.dev_tecnico_data_hora_recebido) > 1970
    AND dt.dev_tecnico_id
      = (
        SELECT
          MAX(dt2.dev_tecnico_id)
        FROM
          datalake_prod.assist.itens_dev_tecnico idt2
            INNER JOIN datalake_prod.assist.dev_tecnico dt2
              ON dt2.dev_tecnico_id = idt2.dev_tecnico_id
        WHERE
          idt2.control_fiscal_env_id = idt.control_fiscal_env_id
          AND dt2.dev_tecnico_data_hora_montagem IS NOT NULL
          AND year(dt2.dev_tecnico_data_hora_montagem) > 1970
      )
),
reenvio_pos_dev AS (SELECT DISTINCT
    dc.control_fiscal_env_id,
    et_latest.tecnico_id
  FROM
    dev_concluido dc
      INNER JOIN datalake_prod.assist.itens_env_tecnico iet_latest
        ON iet_latest.control_fiscal_env_id = dc.control_fiscal_env_id
      INNER JOIN datalake_prod.assist.env_tecnico et_latest
        ON et_latest.env_tecnico_id = iet_latest.env_tecnico_id
  WHERE
    et_latest.env_tecnico_data_hora_recebido IS NOT NULL
    AND year(et_latest.env_tecnico_data_hora_recebido) > 1970
    AND et_latest.env_tecnico_data_hora_recebido > dc.dev_tecnico_data_hora_recebido
    AND NOT EXISTS (
      SELECT
        1
      FROM
        datalake_prod.assist.itens_env_tecnico iet_newer
          INNER JOIN datalake_prod.assist.env_tecnico et_newer
            ON et_newer.env_tecnico_id = iet_newer.env_tecnico_id
      WHERE
        iet_newer.control_fiscal_env_id = dc.control_fiscal_env_id
        AND et_newer.env_tecnico_data_hora_recebido IS NOT NULL
        AND year(et_newer.env_tecnico_data_hora_recebido) > 1970
        AND et_newer.env_tecnico_data_hora_recebido > et_latest.env_tecnico_data_hora_recebido
    )
)
SELECT DISTINCT
  cf.atp_centro,
  cf.atp_nome,
  cf.tecnico_nome AS technician_name_key,
  cf.cod_peca_enviada,
  cf.descr_peca_enviada,
  cf.qtd_peca_enviada,
  'NÃO' AS consumido,
  cf.status_consumo,
  cf.chamado_consumo,
  cf.chamado_aplicado,
  cf.data_encerramento,
  cf.tecnico_tipo,
  cf.num_remessa,
  cf.data_montagem_lote_dev,
  cf.data_envio_dev,
  cf.mont_lote,
  cf.lote_devolucao,
  cf.encerramento,
  cf.id AS peca_fisica_id,
  uea.data_hora_recebido AS data_recebimento_tecnico,
  current_timestamp() AS dt_materializacao
FROM
  cf_base AS cf
    INNER JOIN ultimo_envio_aceito uea
      ON uea.control_fiscal_env_id = cf.id
      AND uea.tecnico_id_atual = cf.tecnico_id
    LEFT JOIN reenvio_sem_recebimento rsr
      ON rsr.control_fiscal_env_id = cf.id
    LEFT JOIN dev_ativo da
      ON da.control_fiscal_env_id = cf.id
    LEFT JOIN dev_concluido dc
      ON dc.control_fiscal_env_id = cf.id
    LEFT JOIN reenvio_pos_dev rpd
      ON rpd.control_fiscal_env_id = cf.id
      AND rpd.tecnico_id = cf.tecnico_id
WHERE
  cf.tecnico_tipo = 'EXTERNO'
  AND cf.status_consumo = 'NOVO'
  AND cf.data_encerramento IS NULL
  AND rsr.control_fiscal_env_id IS NULL
  AND da.control_fiscal_env_id IS NULL
  AND (
    dc.control_fiscal_env_id IS NULL
    OR rpd.control_fiscal_env_id IS NOT NULL
  )
