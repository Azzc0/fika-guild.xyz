# =========================================================
# FIKA GUILD PROJECT - Log Parser & Raid Orchestration
# =========================================================
# Updated 2025-10-14
#  - Fixed entity deaths parsing and insertion
#  - Fixed timestamp extraction from combat logs
#  - Fixed player name extraction in loot parsing
#  - Fixed duplicate key conflicts in entity_deaths
# =========================================================

library(DBI)
library(dplyr)
library(stringr)
library(cli)
library(dotenv)
library(lubridate)

source("scripts/01_database.R")

# ----------------------------------------------------------
# Helper: Convert R vectors to Postgres array literals
# ----------------------------------------------------------
to_pg_array <- function(x) {
  if (is.null(x) || length(x) == 0) return("{}")
  if (is.logical(x)) x <- ifelse(is.na(x), "NULL", tolower(as.character(x)))
  if (is.character(x)) x[is.na(x)] <- "NULL"
  paste0("{", paste(x, collapse = ","), "}")
}

# ----------------------------------------------------------
# DB helper functions
# ----------------------------------------------------------

session_exists <- function(con, session_id) {
  query <- "SELECT COUNT(*) FROM raid_sessions WHERE session_id = $1;"
  count <- dbGetQuery(con, query, list(session_id))$count
  return(count > 0)
}

delete_session <- function(session_id) {
  con <- connect_db()
  on.exit(disconnect_db(con), add = TRUE)

  dbExecute(con, "BEGIN;")
  part_ids <- dbGetQuery(con, "SELECT part_id FROM session_parts WHERE session_id = $1;", list(session_id))$part_id
  if (length(part_ids) > 0) {
    pg_part_ids <- to_pg_array(part_ids)
    dbExecute(con, "DELETE FROM entity_deaths WHERE part_id = ANY($1::int[]);", list(pg_part_ids))
    dbExecute(con, "DELETE FROM loot WHERE part_id = ANY($1::int[]);", list(pg_part_ids))
    dbExecute(con, "DELETE FROM encounter_completions WHERE part_id = ANY($1::int[]);", list(pg_part_ids))
  }
  dbExecute(con, "DELETE FROM session_parts WHERE session_id = $1;", list(session_id))
  dbExecute(con, "DELETE FROM raid_sessions WHERE session_id = $1;", list(session_id))
  dbExecute(con, "COMMIT;")
  cli_alert_success(paste0("🧹 Cleared previous data for session '", session_id, "'"))
}

ensure_raid_session <- function(con, raid_id, session_id, year, week_number) {
  dbExecute(con, "
    INSERT INTO raid_sessions (session_id, raid_id, year, week_number)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (session_id) DO NOTHING;
  ", list(session_id, raid_id, year, week_number))
}

ensure_session_part <- function(con, session_id, part_number, part_start, part_end,
                                raidhelper = NULL, raidres = NULL, turtlogs = NULL, vod_link = NULL) {
  # Normalize optional fields
  raidhelper <- if (is.null(raidhelper)) NA else raidhelper
  raidres    <- if (is.null(raidres)) NA else raidres
  turtlogs   <- if (is.null(turtlogs)) NA else turtlogs
  vod_link   <- if (is.null(vod_link)) NA else vod_link

  query <- "
    INSERT INTO session_parts (session_id, part_number, part_start, part_end, raidhelper, raidres, turtlogs, vod_link)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (session_id, part_number) DO UPDATE
      SET part_start = EXCLUDED.part_start,
          part_end   = EXCLUDED.part_end,
          raidhelper = EXCLUDED.raidhelper,
          raidres    = EXCLUDED.raidres,
          turtlogs   = EXCLUDED.turtlogs,
          vod_link   = EXCLUDED.vod_link
    RETURNING part_id;
  "

  # Get the returned part_id from Postgres
  result <- DBI::dbGetQuery(
    con,
    query,
    params = list(session_id, part_number, part_start, part_end, raidhelper, raidres, turtlogs, vod_link)
  )

  # Ensure a valid ID is always returned
  if (nrow(result) == 0 || is.na(result$part_id[1])) {
    stop("Failed to retrieve part_id for session part ", part_number, " (", session_id, ")")
  }

  return(result$part_id[1])
}

# ----------------------------------------------------------
# Insert helpers
# ----------------------------------------------------------

insert_loot_batch <- function(con, part_id, loot_df) {
  # ── Guard clause ────────────────────────────────────────────────
  if (is.null(loot_df) || nrow(loot_df) == 0) {
    cli_alert_info(paste("💤 No loot entries to insert for part", part_id))
    return(invisible())
  }

  # ── Deduplicate by unique key (part_id, player_name, item_id) ──
  loot_df <- loot_df %>%
    mutate(
      player_name = trimws(player_name),
      item_name   = trimws(item_name)
    ) %>%
    group_by(player_name, item_id) %>%
    summarise(
      item_name     = first(na.omit(item_name)),
      item_rarity   = first(na.omit(item_rarity)),
      item_quantity = sum(item_quantity, na.rm = TRUE),
      .groups = "drop"
    )

  # ── Sanity check for duplicates ─────────────────────────────────
  dupes <- loot_df %>%
    group_by(player_name, item_id) %>%
    filter(n() > 1)
  if (nrow(dupes) > 0) {
    cli_alert_warning("⚠️ Duplicate loot keys detected prior to insert:")
    print(dupes)
  }

  # ── Build SQL ───────────────────────────────────────────────────
  sql <- "
    INSERT INTO loot (
      part_id, player_name, item_name, item_rarity, item_quantity, item_id
    )
    SELECT UNNEST($1::int[]),
           UNNEST($2::text[]),
           UNNEST($3::text[]),
           UNNEST($4::text[]),
           UNNEST($5::int[]),
           UNNEST($6::int[])
    ON CONFLICT (part_id, player_name, item_id)
    DO UPDATE
      SET item_quantity = loot.item_quantity + EXCLUDED.item_quantity;
  "

  # ── Execute safely ──────────────────────────────────────────────
  tryCatch({
    dbExecute(con, sql, list(
      to_pg_array(rep(part_id, nrow(loot_df))),
      to_pg_array(loot_df$player_name),
      to_pg_array(loot_df$item_name),
      to_pg_array(loot_df$item_rarity),
      to_pg_array(loot_df$item_quantity),
      to_pg_array(loot_df$item_id)
    ))
    cli_alert_success(paste("💰 Inserted", nrow(loot_df),
                            "unique loot entries for part", part_id))
  },
  error = function(e) {
    cli_alert_danger(paste("❌ Failed to insert loot for part", part_id, ":", e$message))
    stop(e)
  })
}


insert_entity_deaths_batch <- function(con, part_id, deaths_df) {
  if (nrow(deaths_df) == 0) return(invisible())
  
  # Ensure death_count column exists and is integer
  if (!"death_count" %in% names(deaths_df)) {
    deaths_df$death_count <- 1L
  }
  
  # Convert to integer to be safe
  deaths_df$death_count <- as.integer(deaths_df$death_count)
  
  # Use proper conflict handling - update only if new count is higher
  sql <- "
    INSERT INTO entity_deaths (part_id, entity_name, death_count, last_death_time)
    SELECT UNNEST($1::int[]),
           UNNEST($2::text[]),
           UNNEST($3::int[]),
           NOW()
    ON CONFLICT (part_id, entity_name)
    DO UPDATE SET
      death_count = GREATEST(entity_deaths.death_count, EXCLUDED.death_count),
      last_death_time = NOW()
    WHERE EXCLUDED.death_count > entity_deaths.death_count;
  "
  
  dbExecute(con, sql, list(
    to_pg_array(rep(part_id, nrow(deaths_df))),
    to_pg_array(deaths_df$entity_name),
    to_pg_array(deaths_df$death_count)
  ))
  
  cli_alert_success(paste("💀 Inserted", nrow(deaths_df), "entity death records for part", part_id))
}

insert_encounter_completions_batch <- function(con, session_id, encounters_df) {
  if (nrow(encounters_df) == 0) {
    cli_alert_warning("⚠️ No encounters found to insert into encounter_completions.")
    return(invisible())
  }

  # 🧩 Guarantee required columns exist
  required_cols <- c("part_id", "encounter_id", "completion_time", "is_kill", "wipes")
  for (col in required_cols) {
    if (!col %in% names(encounters_df)) {
      encounters_df[[col]] <- NA
    }
  }

  # Remove rows without a valid part_id
  encounters_df <- encounters_df %>%
    filter(!is.na(part_id)) %>%
    mutate(
      part_id = as.integer(part_id),
      encounter_id = as.integer(encounter_id),
      wipes = as.integer(wipes),
      is_kill = as.logical(is_kill)
    )

  if (nrow(encounters_df) == 0) {
    cli_alert_warning("⚠️ All encounters missing part_id — skipping encounter_completions insert.")
    return(invisible())
  }

  # Parse times safely
  parsed_times <- suppressWarnings(lubridate::parse_date_time(
    encounters_df$completion_time,
    orders = c("ymd HMSOS", "ymd HMS", "m/d H:M:S.OS", "m/d H:M:S"),
    tz = "UTC"
  ))

  encounters_df <- encounters_df %>%
    mutate(
      completion_time = ifelse(
        is.na(parsed_times),
        NA_character_,
        # Use full precision for timestamptz
        format(as.POSIXct(parsed_times, tz = "UTC"), "%Y-%m-%d %H:%M:%OS6%z")
      )
    )

  cli_alert_info(paste0("[DEBUG] Preparing encounter_completions insert batch with ", nrow(encounters_df), " rows"))

  sql <- "
    INSERT INTO encounter_completions (part_id, encounter_id, completion_time, is_kill, wipes)
    SELECT UNNEST($1::int[]),
           UNNEST($2::int[]),
           UNNEST($3::timestamp[]),
           UNNEST($4::bool[]),
           UNNEST($5::int[])
    ON CONFLICT (part_id, encounter_id)
    DO UPDATE SET
      completion_time = COALESCE(EXCLUDED.completion_time, encounter_completions.completion_time),
      is_kill          = COALESCE(EXCLUDED.is_kill, encounter_completions.is_kill),
      wipes            = COALESCE(EXCLUDED.wipes, encounter_completions.wipes);
  "

  dbExecute(con, sql, list(
    to_pg_array(encounters_df$part_id),
    to_pg_array(encounters_df$encounter_id),
    to_pg_array(encounters_df$completion_time),
    to_pg_array(encounters_df$is_kill),
    to_pg_array(encounters_df$wipes)
  ))

  cli_alert_success("✔ Inserted encounter_completions successfully.")
}

# ----------------------------------------------------------
# Core parser
# ----------------------------------------------------------

parse_combat_log_local <- function(filepath, entity_map, known_bosses, part_start = NULL, part_end = NULL) {
  cli_alert_info(paste("📜 Parsing combat log:", basename(filepath)))
  lines <- readLines(filepath, warn = FALSE)

  # Parse deaths with proper timestamps
  deaths <- tibble()
  if (length(lines) > 0) {
    death_lines <- lines[str_detect(lines, "dies\\.$")]
    if (length(death_lines) > 0) {
      deaths <- tibble(raw = death_lines) %>%
        mutate(
          entity_name = str_match(raw, "\\s{2}(.*?) dies\\.$")[, 2],
          # Extract timestamp with milliseconds
          time_raw = str_match(raw, "^(\\d+/\\d+ \\d+:\\d+:\\d+(?:\\.\\d+)?)")[, 2]
        ) %>%
        filter(!is.na(entity_name)) %>%
        # Parse timestamp properly with milliseconds
        mutate(
          death_time = as.POSIXct(
            paste0(lubridate::year(part_start), "/", time_raw),
            format = "%Y/%m/%d %H:%M:%OS",
            tz = "UTC"
          )
        ) %>%
        # Count deaths per entity but keep timestamps for boss analysis
        group_by(entity_name) %>%
        summarise(
          death_count = n(),
          last_death_time = max(death_time, na.rm = TRUE),
          .groups = "drop"
        )
    }
  }

  # Validate death times fall within the part window
  if (!is.null(part_start) && nrow(deaths) > 0) {
    deaths <- deaths %>%
      mutate(
        outside_window = last_death_time < as.POSIXct(part_start, tz = "UTC") |
                         last_death_time > as.POSIXct(part_end, tz = "UTC")
      )
    bad <- deaths %>% filter(outside_window)
    if (nrow(bad) > 0) {
      cli_alert_warning(paste(
        "⚠️", nrow(bad), "deaths occurred outside expected time range!"
      ))
    }
  }

  # Map deaths to encounters and store real completion times
  if (!is.data.frame(entity_map)) stop("entity_map must be a data frame; got ", class(entity_map)[1])

  encounter_hits <- entity_map %>% filter(entity_name %in% deaths$entity_name)
  encounters_df <- tibble()
  if (nrow(encounter_hits) > 0) {
    # Get the actual death times from the combat log
    death_times <- deaths %>%
      select(entity_name, last_death_time) %>%
      distinct()
    
    encounters_df <- encounter_hits %>%
      left_join(death_times, by = "entity_name") %>%
      group_by(encounter_id, encounter_name) %>%
      summarise(
        # Use microsecond precision format for timestamptz
        completion_time = format(max(last_death_time, na.rm = TRUE), "%Y-%m-%d %H:%M:%OS6"),
        is_kill = TRUE,
        wipes = 0,
        .groups = "drop"
      ) %>%
      # Filter out encounters with invalid times (when max returns -Inf)
      filter(completion_time != "" & !grepl("^-Inf$", completion_time))
  }

  # Parse loot with stricter regex
  loot_lines  <- lines[str_detect(lines, "receives loot:")]
  trade_lines <- lines[str_detect(lines, "trades item")]

  loot_df <- tibble()
  if (length(loot_lines) > 0) {
    loot_df <- tibble(raw = loot_lines) %>%
      mutate(
        # More robust player name extraction
        player_name = str_match(raw, "&([A-Za-zÀ-ÖØ-öø-ÿ'\\-]+) receives loot:")[, 2],
        item_id = as.integer(str_match(raw, "\\|Hitem:(\\d+):")[, 2]),
        item_name = str_match(raw, "\\|h\\[(.*?)\\]\\|h")[, 2],
        item_quantity = ifelse(
          is.na(str_match(raw, "\\|rx(\\d+)")[, 2]),
          1L,
          as.integer(str_match(raw, "\\|rx(\\d+)")[, 2])
        ),
        item_rarity = case_when(
          str_detect(raw, "\\|cffffffff") ~ "Common",
          str_detect(raw, "\\|cff1eff00") ~ "Uncommon",
          str_detect(raw, "\\|cff0070dd") ~ "Rare",
          str_detect(raw, "\\|cffa335ee") ~ "Epic",
          str_detect(raw, "\\|cffff8000") ~ "Legendary",
          TRUE ~ "Unknown"
        )
      ) %>%
      filter(!is.na(player_name) & player_name != "") %>%
      select(player_name, item_name, item_id, item_quantity, item_rarity)
  }

  trade_df <- tibble()
  if (length(trade_lines) > 0) {
    trade_df <- tibble(raw = trade_lines) %>%
      mutate(
        from_player = str_match(raw, "&([A-Za-zÀ-ÖØ-öø-ÿ'-]+) trades item")[, 2],
        to_player   = str_match(raw, "to ([A-Za-zÀ-ÖØ-öø-ÿ'-]+)\\.$")[, 2],
        item_name   = str_match(raw, "trades item (.*?) to")[, 2]
      ) %>%
      filter(!is.na(from_player) & !is.na(to_player))
  }
  
  if (nrow(trade_df) > 0) {
    cli_alert_info(paste("📦 Parsed", nrow(trade_df), "trade transactions."))
  }

  cli_alert_success(paste(
    "Parsed", nrow(encounters_df), "encounters,",
    nrow(loot_df), "loot entries,",
    nrow(deaths), "entities."
  ))

  list(encounters = encounters_df, loot = loot_df, deaths = deaths)
}

# ----------------------------------------------------------
# Orchestrator
# ----------------------------------------------------------

parse_raid_session <- function(raid, session_id, parts, excluded_encounters = NULL) {
  cli::cli_h1(paste("🧩 Parsing raid session:", session_id, "for", raid))
  con <- connect_db()
  on.exit(disconnect_db(con), add = TRUE)

  if (session_exists(con, session_id)) {
    cli_alert_warning(paste0("⚠️ Existing session '", session_id, "' found — deleting old data before re-import..."))
    delete_session(session_id)
  }

  raid_info <- dbGetQuery(con, "SELECT raid_id FROM raids WHERE raid_abbreviation = $1;", list(raid))
  if (nrow(raid_info) == 0) stop(paste("Unknown raid:", raid))
  raid_id <- raid_info$raid_id[1]

  bosses <- dbGetQuery(con, "SELECT encounter_id, encounter_name FROM encounters WHERE raid_id = $1;", list(raid_id))
  entity_map <- dbGetQuery(con, "
    SELECT ee.encounter_id, e.encounter_name, ee.entity_name
    FROM encounter_entities ee
    JOIN encounters e ON ee.encounter_id = e.encounter_id
    WHERE e.raid_id = $1;", list(raid_id))
  debug_log("Loaded", nrow(entity_map), "entity mappings for this raid")

  first_start <- as.POSIXct(parts[[1]]$start, tz = "UTC")
  year <- as.integer(format(first_start, "%Y"))

  # Get the most recent Wednesday (raid week start)
  get_raid_week <- function(date) {
    date <- as.Date(date)
    days_since_wednesday <- (as.numeric(format(date, "%u")) + 4) %% 7  # %u: 1=Mon,7=Sun
    raid_week_start <- date - days_since_wednesday
    as.integer(format(raid_week_start, "%V"))
  }

  week_number <- get_raid_week(first_start)
  ensure_raid_session(con, raid_id, session_id, year, week_number)

  encounter_completions <- tibble()

  for (i in seq_along(parts)) {
    part <- parts[[i]]
    cli_alert_info(paste("Processing part", i, "-", basename(part$file)))

    result <- parse_combat_log_local(part$file, entity_map, bosses$encounter_name, part$start, part$end)
    part_id <- ensure_session_part(con, session_id, i, part$start, part$end,
                              raidhelper = part$raidhelper,
                              raidres = part$raidres, 
                              turtlogs = part$turtlogs,
                              vod_link = part$vod_link)

    # attach part_id to all parsed encounters
    if (nrow(result$encounters) > 0) result$encounters$part_id <- part_id

    # integrate wipes manually (independent of kills)
    wipe_df <- tibble()
    if (!is.null(part$wipes) && length(part$wipes) > 0) {
      wipe_df <- tibble(
        encounter_name = names(part$wipes),
        wipes = as.integer(unlist(part$wipes))
      ) %>%
        left_join(bosses, by = "encounter_name") %>%
        filter(!is.na(encounter_id)) %>%
        mutate(
          completion_time = NA_character_,
          is_kill = FALSE,
          part_id = part_id
        )
    }

    # combine log kills + manual wipes
    combined <- bind_rows(result$encounters, wipe_df) %>%
      group_by(encounter_id) %>%
      summarise(
        encounter_name = first(na.omit(encounter_name)),
        completion_time = first(na.omit(completion_time)),
        # is_kill = TRUE if any TRUE, else FALSE
        is_kill = any(is_kill == TRUE, na.rm = TRUE),
        wipes = max(wipes, na.rm = TRUE),
        part_id = first(part_id),
        .groups = "drop"
      ) %>%
      mutate(wipes = ifelse(is.infinite(wipes), NA_integer_, wipes))

    # now merge with excluded encounters
    if (!is.null(excluded_encounters) && length(excluded_encounters) > 0) {
      combined <- combined %>%
        mutate(
          is_kill = ifelse(encounter_name %in% excluded_encounters, FALSE, is_kill)
        )
    }

    encounter_completions <- bind_rows(encounter_completions, combined)

    insert_loot_batch(con, part_id, result$loot)
    if (nrow(result$deaths) > 0) {
      # Ensure we have the required columns
      deaths_for_insert <- result$deaths %>% 
        mutate(
          part_id = part_id,
          death_count = as.integer(death_count),  # Ensure this exists
          entity_name = as.character(entity_name)
        ) %>%
        select(part_id, entity_name, death_count)
      
      # Remove any potential duplicates within this batch
      deaths_for_insert <- deaths_for_insert %>%
        group_by(part_id, entity_name) %>%
        summarise(death_count = max(death_count, na.rm = TRUE), .groups = "drop")
      
      insert_entity_deaths_batch(con, part_id, deaths_for_insert)
    }
  }

  # final cleanup for NA and types
  encounter_completions <- encounter_completions %>%
    mutate(
      part_id = as.integer(part_id),
      encounter_id = as.integer(encounter_id),
      completion_time = as.character(completion_time),
      is_kill = as.logical(is_kill),
      wipes = as.integer(ifelse(is.na(wipes), 0L, wipes))
    )

  # insert to DB
  if (nrow(encounter_completions) > 0) {
    insert_encounter_completions_batch(
      con,
      encounter_completions$part_id[1],
      encounter_completions %>% select(encounter_id, completion_time, is_kill, wipes, part_id)
    )
  }

  # determine cleared status (only true kills)
  killed_names <- encounter_completions %>%
    filter(is_kill == TRUE) %>%
    pull(encounter_name) %>%
    unique()
  missing <- setdiff(bosses$encounter_name, killed_names)

  if (length(missing) == 0) {
    dbExecute(con, "UPDATE raid_sessions SET was_cleared = TRUE WHERE session_id = $1;", list(session_id))
    cli_alert_success("🎉 Raid fully cleared and marked as such!")
  } else {
    cli_alert_info(paste("⚠️ Raid not fully cleared. Missing kills for:", paste(missing, collapse = ", ")))
  }
}