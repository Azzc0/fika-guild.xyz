# =========================================================
# FIKA GUILD PROJECT - Raid & Encounter Registry Sync
# =========================================================
# Handles synchronization between local registry and DB
# Compatible with schema_v1.0.sql
# =========================================================
source("scripts/01_database.R")
library(DBI)
library(dplyr)
library(cli)

# ----------------------------------------------------------
# Utility functions
# ----------------------------------------------------------

connect_db <- function() {
  con <- dbConnect(
    RPostgres::Postgres(),
    host = Sys.getenv("SUPABASE_DB_HOST"),
    port = 5432,
    dbname = Sys.getenv("SUPABASE_DB_NAME"),
    user = Sys.getenv("SUPABASE_DB_USER"),
    password = Sys.getenv("SUPABASE_DB_PASSWORD"),
    sslmode = "require"
  )
  cli::cli_alert_info("🔌 Connected to Supabase Postgres")
  con
}

disconnect_db <- function(con) {
  if (DBI::dbIsValid(con)) {
    DBI::dbDisconnect(con)
    cli::cli_alert_info("🔌 Disconnected from Supabase Postgres")
  }
}

# ----------------------------------------------------------
# UPSERT HELPERS
# ----------------------------------------------------------

upsert_raid <- function(con, raid_name, raid_abbr, boss_count = 0, description = NULL) {
  dbGetQuery(con, "
    INSERT INTO raids (raid_name, raid_abbreviation, boss_count, description)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (raid_abbreviation)
    DO UPDATE SET
      raid_name = EXCLUDED.raid_name,
      boss_count = EXCLUDED.boss_count,
      description = EXCLUDED.description
    RETURNING raid_id
  ", params = list(raid_name, raid_abbr, boss_count, description))$raid_id[1]
}

upsert_encounter <- function(con, raid_id, encounter_name) {
  dbGetQuery(con, "
    INSERT INTO encounters (raid_id, encounter_name)
    VALUES ($1, $2)
    ON CONFLICT (raid_id, encounter_name)
    DO UPDATE SET encounter_name = EXCLUDED.encounter_name
    RETURNING encounter_id
  ", params = list(raid_id, encounter_name))$encounter_id[1]
}

sync_entities <- function(con, encounter_id, entity_names) {
  existing <- dbGetQuery(con, "
    SELECT entity_name FROM encounter_entities WHERE encounter_id = $1
  ", params = list(encounter_id))$entity_name

  to_add <- setdiff(entity_names, existing)
  for (e in to_add) {
    dbExecute(con, "
      INSERT INTO encounter_entities (encounter_id, entity_name)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    ", params = list(encounter_id, e))
  }

  to_remove <- setdiff(existing, entity_names)
  for (e in to_remove) {
    dbExecute(con, "
      DELETE FROM encounter_entities WHERE encounter_id=$1 AND entity_name=$2
    ", params = list(encounter_id, e))
  }
}

# ----------------------------------------------------------
# RAID + ENCOUNTER REGISTRY
# ----------------------------------------------------------

registry <- list(

  # -------------------------------
  "MC" = list(
    raid_name = "Molten Core",
    description = "40-man raid (Turtle WoW current content)",
    encounters = list(
      "Lucifron" = c("Lucifron"),
      "Magmadar" = c("Magmadar"),
      "Garr" = c("Garr"),
      "Incindis" = c("Incindis"),
      "Shazzrah" = c("Shazzrah"),
      "Baron Geddon" = c("Baron Geddon"),
      "Sulfuron Harbinger" = c("Sulfuron Harbinger"),
      "Golemagg the Incinerator" = c("Golemagg the Incinerator"),
      "Twin Golems" = c("Basalthar", "Smoldaris"),
      "Sorcerer-Thane Thaurissan" = c("Sorcerer-Thane Thaurissan"),
      "Majordomo Executus" = c("Flamewaker Healer", "Flamewaker Elite"),
      "Ragnaros" = c("Ragnaros")
    )
  ),

  # -------------------------------
  "BWL" = list(
    raid_name = "Blackwing Lair",
    description = "40-man raid",
    encounters = list(
      "Razorgore the Untamed" = c("Razorgore the Untamed"),
      "Vaelastrasz the Corrupt" = c("Vaelastrasz the Corrupt"),
      "Broodlord Lashlayer" = c("Broodlord Lashlayer"),
      "Firemaw" = c("Firemaw"),
      "Ebonroc" = c("Ebonroc"),
      "Flamegor" = c("Flamegor"),
      "Chromaggus" = c("Chromaggus"),
      "Nefarian" = c("Nefarian")
    )
  ),

  # -------------------------------
  "AQ40" = list(
    raid_name = "Temple of Ahn'Qiraj",
    description = "40-man raid",
    encounters = list(
      "The Prophet Skeram" = c("The Prophet Skeram"),
      "Silithid Royalty" = c("Vem", "Princess Yauj", "Lord Kri"),
      "Battleguard Sartura" = c("Battleguard Sartura"),
      "Fankriss the Unyielding" = c("Fankriss the Unyielding"),
      "Viscidus" = c("Viscidus"),
      "Princess Huhuran" = c("Princess Huhuran"),
      "Twin Emperors" = c("Emperor Vek'nilash", "Emperor Vek'lor"),
      "Ouro" = c("Ouro"),
      "C'Thun" = c("C'Thun")
    )
  ),

  # -------------------------------
  "Naxx" = list(
    raid_name = "Naxxramas",
    description = "40-man raid",
    encounters = list(
      "Anub'Rekhan" = c("Anub'Rekhan"),
      "Grand Widow Faerlina" = c("Grand Widow Faerlina"),
      "Maexxna" = c("Maexxna"),
      "Noth the Plaguebringer" = c("Noth the Plaguebringer"),
      "Heigan the Unclean" = c("Heigan the Unclean"),
      "Loatheb" = c("Loatheb"),
      "Instructor Razuvious" = c("Instructor Razuvious"),
      "Gothik the Harvester" = c("Gothik the Harvester"),
      "The Four Horsemen" = c("Highlord Mograine", "Thane Korth'azz", "Lady Blaumeux", "Sir Zeliek"),
      "Patchwerk" = c("Patchwerk"),
      "Grobbulus" = c("Grobbulus"),
      "Gluth" = c("Gluth"),
      "Thaddius" = c("Thaddius"),
      "Sapphiron" = c("Sapphiron"),
      "Kel'Thuzad" = c("Kel'Thuzad")
    )
  ),

  # -------------------------------
  "Kara" = list(
    raid_name = "Tower of Karazhan",
    description = "10-man raid (Turtle WoW)",
    encounters = list(
      "Keeper Gnarlmoon" = c("Keeper Gnarlmoon"),
      "Ley-Watcher Incantagos" = c("Ley-Watcher Incantagos"),
      "Anomalus" = c("Anomalus"),
      "Chess Event" = c("King"),
      "Echo of Medivh" = c("Echo of Medivh"),
      "Sanv Tas'dal" = c("Sanv Tas'dal"),
      "Kruul" = c("Kruul"),
      "Rupturan the Broken" = c("Fragment of Rupturan"),
      "Mephistroth" = c("Mephistroth")
    )
  )
)

# ----------------------------------------------------------
# SYNC FUNCTION
# ----------------------------------------------------------

sync_registry <- function(con, registry) {
  for (raid_abbr in names(registry)) {
    raid <- registry[[raid_abbr]]
    raid_id <- upsert_raid(con, raid$raid_name, raid_abbr, length(raid$encounters), raid$description)
    cli::cli_alert_info(paste("✅ Synced raid:", raid$raid_name, "(id:", raid_id, ")"))

    for (enc_name in names(raid$encounters)) {
      entities <- raid$encounters[[enc_name]]
      encounter_id <- upsert_encounter(con, raid_id, enc_name)
      sync_entities(con, encounter_id, entities)
      cli::cli_alert_success(paste("⏺ Synced encounter:", enc_name))
    }
  }
}

# ----------------------------------------------------------
# Example usage
# ----------------------------------------------------------
# con <- connect_db()
# sync_registry(con, registry)
# disconnect_db(con)
