# scripts/04_data_entry.R
# Manual data entry and post-parse adjustments for Supabase database
#
# Provides helper functions for:
#  - Marking an encounter as cleared (is_kill = TRUE, updates timestamp)
#  - Recording manual wipes count
#  - Adding or editing session notes
#  - Marking a session as irrelevant (e.g., post-patch outdated)
#
# Dependencies: 01_database.R, 02_registry.R

library(DBI)
source("scripts/01_database.R")

create_session <- function(session_id, raid_abbreviation, year, week_number, notes = NULL) {
  con <- connect_db()
  on.exit(disconnect_db(con), add = TRUE)

  # Get raid_id
  raid_id <- dbGetQuery(con, "
    SELECT raid_id FROM raids WHERE raid_abbreviation = $1
  ", params = list(raid_abbreviation))$raid_id

  if (length(raid_id) == 0) {
    cli::cli_abort(c("✗" = paste("Raid abbreviation not found:", raid_abbreviation)))
  }

  dbExecute(con, "
    INSERT INTO raid_sessions (session_id, raid_id, year, week_number, notes)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (session_id) DO NOTHING
  ", params = list(session_id, raid_id, year, week_number, notes))

  cli::cli_inform(c("✅" = paste0(
    "Registered new session: ", session_id,
    " (", raid_abbreviation, " ", year, "w", week_number, ")"
  )))
  TRUE
}

# ------------------------------
# Mark an encounter as cleared (defeated)
# ------------------------------
mark_encounter_cleared <- function(session_id, encounter_name, completion_time = Sys.time()) {
  con <- connect_db()
  on.exit(disconnect_db(con), add = TRUE)

  # Resolve encounter_id
  encounter_row <- dbGetQuery(con,
    "SELECT encounter_id FROM encounters WHERE encounter_name = $1",
    params = list(encounter_name)
  )
  if (nrow(encounter_row) == 0) {
    message("❌ Encounter not found: ", encounter_name)
    return(FALSE)
  }
  encounter_id <- encounter_row$encounter_id[1]

  # Check if row exists already
  existing <- dbGetQuery(con, "
    SELECT completion_id, is_kill
    FROM encounter_completions
    WHERE session_id = $1 AND encounter_id = $2
  ", params = list(session_id, encounter_id))

  if (nrow(existing) > 0) {
    dbExecute(con, "
      UPDATE encounter_completions
      SET is_kill = TRUE, completion_time = $3
      WHERE session_id = $1 AND encounter_id = $2
    ", params = list(session_id, encounter_id,
                     format(completion_time, "%Y-%m-%d %H:%M:%S%z")))
    message("✅ Updated existing encounter as cleared: ", encounter_name)
  } else {
    dbExecute(con, "
      INSERT INTO encounter_completions (session_id, encounter_id, completion_time, is_kill)
      VALUES ($1, $2, $3, TRUE)
    ", params = list(session_id, encounter_id,
                     format(completion_time, "%Y-%m-%d %H:%M:%S%z")))
    message("✅ Marked new encounter as cleared: ", encounter_name)
  }

  invisible(TRUE)
}

# ------------------------------
# Set or update manual wipe count
# ------------------------------
set_wipe_count <- function(session_id, encounter_name, wipes) {
  con <- connect_db()
  on.exit(disconnect_db(con), add = TRUE)

  encounter_row <- dbGetQuery(con,
    "SELECT encounter_id FROM encounters WHERE encounter_name = $1",
    params = list(encounter_name)
  )
  if (nrow(encounter_row) == 0) {
    message("❌ Encounter not found: ", encounter_name)
    return(FALSE)
  }
  encounter_id <- encounter_row$encounter_id[1]

  dbExecute(con, "
    INSERT INTO encounter_completions (session_id, encounter_id, wipes, is_kill)
    VALUES ($1, $2, $3, FALSE)
    ON CONFLICT (session_id, encounter_id)
    DO UPDATE SET wipes = EXCLUDED.wipes
  ", params = list(session_id, encounter_id, as.integer(wipes)))

  message("✅ Recorded ", wipes, " wipes for ", encounter_name)
  invisible(TRUE)
}

# ------------------------------
# Add or update session notes
# ------------------------------
add_session_notes <- function(session_id, notes) {
  con <- connect_db()
  on.exit(disconnect_db(con), add = TRUE)

  dbExecute(con, "
    UPDATE raid_sessions SET notes = $2 WHERE session_id = $1
  ", params = list(session_id, notes))
  message("📝 Updated session notes for ", session_id)
  invisible(TRUE)
}

# ------------------------------
# Mark a session as irrelevant (e.g., obsolete post-patch)
# ------------------------------
mark_session_irrelevant <- function(session_id, reason = NULL) {
  con <- connect_db()
  on.exit(disconnect_db(con), add = TRUE)

  dbExecute(con, "
    UPDATE raid_sessions SET irrelevant = TRUE, notes = COALESCE(notes || E'\n' || $2, notes)
    WHERE session_id = $1
  ", params = list(session_id, paste0("Marked irrelevant: ", reason)))

  message("⚠️ Marked session ", session_id, " as irrelevant (", reason, ")")
  invisible(TRUE)
}

# ------------------------------
# View all encounters in a session with kill/wipe state
# ------------------------------
session_encounter_status <- function(session_id) {
  con <- connect_db()
  on.exit(disconnect_db(con), add = TRUE)

  df <- dbGetQuery(con, "
    SELECT e.encounter_name, ec.is_kill, ec.wipes, ec.completion_time
    FROM encounter_completions ec
    JOIN encounters e ON ec.encounter_id = e.encounter_id
    WHERE ec.session_id = $1
    ORDER BY e.encounter_name
  ", params = list(session_id))

  print(df)
  invisible(df)
}