# =========================================================
# FIKA GUILD PROJECT - Data Access Layer
# =========================================================
# Centralized queries for presentation, reports, and summaries.
# Compatible with schema_v1.0.sql
# =========================================================

library(DBI)
library(dplyr)
if (!requireNamespace("here", quietly = TRUE)) install.packages("here")
library(here)
source(here("scripts", "01_database.R"))

# ----------------------------------------------------------
# Get all raids
# ----------------------------------------------------------
get_raids <- function(con) {
  dbGetQuery(con, "
    SELECT raid_id, raid_name, raid_abbreviation, boss_count
    FROM raids
    ORDER BY raid_name;
  ")
}

# ----------------------------------------------------------
# Get all sessions (optionally filtered)
# ----------------------------------------------------------
get_sessions <- function(con, raid_abbr = NULL, include_irrelevant = FALSE) {
  query <- "
    SELECT s.session_id, s.year, s.week_number, s.was_cleared, s.irrelevant,
           r.raid_name, r.raid_abbreviation
    FROM raid_sessions s
    JOIN raids r ON s.raid_id = r.raid_id
    WHERE ($1 IS NULL OR r.raid_abbreviation = $1)
      AND ($2 OR s.irrelevant = FALSE)
    ORDER BY s.year DESC, s.week_number DESC;
  "
  dbGetQuery(con, query, params = list(raid_abbr, include_irrelevant))
}

# ----------------------------------------------------------
# Get parts for a specific session
# ----------------------------------------------------------
get_session_parts <- function(con, session_id) {
  dbGetQuery(con, "
    SELECT p.part_id, p.part_number, p.log_filename, p.part_start, p.part_end,
           p.raidhelper, p.raidres, p.turtlogs
    FROM session_parts p
    WHERE p.session_id = $1
    ORDER BY p.part_number ASC;
  ", params = list(session_id))
}

# ----------------------------------------------------------
# Get encounter list for a raid
# ----------------------------------------------------------
get_encounters <- function(con, raid_abbr) {
  dbGetQuery(con, "
    SELECT e.encounter_id, e.encounter_name, r.raid_abbreviation
    FROM encounters e
    JOIN raids r ON e.raid_id = r.raid_id
    WHERE r.raid_abbreviation = $1
    ORDER BY e.encounter_id ASC;
  ", params = list(raid_abbr))
}

# ----------------------------------------------------------
# Get all completions for a raid session
# ----------------------------------------------------------
get_encounter_completions <- function(con, session_id) {
  dbGetQuery(con, "
    SELECT c.completion_id, c.part_id, c.encounter_id, e.encounter_name,
           c.completion_time, c.is_kill, c.wipes
    FROM encounter_completions c
    JOIN session_parts p ON c.part_id = p.part_id
    JOIN encounters e ON c.encounter_id = e.encounter_id
    WHERE p.session_id = $1
    ORDER BY c.completion_time ASC;
  ", params = list(session_id))
}

# ----------------------------------------------------------
# Get entity death summaries
# ----------------------------------------------------------
get_entity_deaths <- function(con, session_id) {
  dbGetQuery(con, "
    SELECT d.part_id, p.part_number, d.entity_name, d.death_count, d.last_death_time
    FROM entity_deaths d
    JOIN session_parts p ON d.part_id = p.part_id
    WHERE p.session_id = $1
    ORDER BY p.part_number, d.entity_name;
  ", params = list(session_id))
}

# ----------------------------------------------------------
# Get loot data for a given session
# ----------------------------------------------------------
get_loot <- function(con, session_id) {
  dbGetQuery(con, "
    SELECT l.loot_id, l.part_id, p.part_number, l.player_name, l.item_name,
           l.item_rarity, l.item_quantity, l.item_id, l.is_transmog, l.traded_from
    FROM loot l
    JOIN session_parts p ON l.part_id = p.part_id
    WHERE p.session_id = $1
    ORDER BY p.part_number, l.player_name;
  ", params = list(session_id))
}

# ----------------------------------------------------------
# Get raid progress summary (Δ times and kill tracking)
# ----------------------------------------------------------
get_encounter_delta_summary <- function(con, raid_abbr) {
  dbGetQuery(con, "
    WITH raid_span AS (
      SELECT r.raid_id,
             MIN(p.part_start) AS raid_start,
             MAX(p.part_end) AS raid_end
      FROM session_parts p
      JOIN raid_sessions s ON p.session_id = s.session_id
      JOIN raids r ON s.raid_id = r.raid_id
      WHERE r.raid_abbreviation = $1 AND s.irrelevant = FALSE
      GROUP BY r.raid_id
    ),
    kills AS (
      SELECT e.encounter_id, e.encounter_name, MIN(c.completion_time) AS first_kill
      FROM encounter_completions c
      JOIN encounters e ON c.encounter_id = e.encounter_id
      JOIN session_parts p ON c.part_id = p.part_id
      JOIN raid_sessions s ON p.session_id = s.session_id
      JOIN raids r ON s.raid_id = r.raid_id
      WHERE r.raid_abbreviation = $1 AND c.is_kill = TRUE
      GROUP BY e.encounter_id, e.encounter_name
    )
    SELECT k.encounter_name,
           EXTRACT(EPOCH FROM (k.first_kill - rs.raid_start)) AS delta_seconds
    FROM kills k
    JOIN raid_span rs ON TRUE
    ORDER BY delta_seconds;
  ", params = list(raid_abbr))
}

# =========================================================
# Derived Query Extensions
# =========================================================

get_raid_clear_time <- function(con, raid_abbr, session_id) {
  dbGetQuery(con, "
    SELECT
      s.session_id,
      r.raid_name,
      MIN(p.part_start) AS raid_start,
      MAX(c.completion_time) FILTER (WHERE c.is_kill = TRUE) AS clear_time,
      EXTRACT(EPOCH FROM (MAX(c.completion_time) - MIN(p.part_start))) AS clear_seconds
    FROM raid_sessions s
    JOIN raids r ON s.raid_id = r.raid_id
    JOIN session_parts p ON s.session_id = p.session_id
    JOIN encounter_completions c ON p.part_id = c.part_id
    WHERE s.session_id = $1
      AND r.raid_abbreviation = $2
    GROUP BY s.session_id, r.raid_name;
  ", params = list(session_id, raid_abbr))
}

get_session_summary_data <- function(con, session_id) {
  dbGetQuery(con, "
    SELECT
      s.session_id,
      r.raid_name,
      COUNT(DISTINCT p.part_id) AS total_parts,
      MIN(p.part_start) AS start_time,
      MAX(p.part_end) AS end_time,
      COUNT(DISTINCT c.encounter_id) FILTER (WHERE c.is_kill = TRUE) AS total_kills,
      SUM(c.wipes) AS total_wipes,
      COUNT(DISTINCT l.loot_id) AS loot_count,
      EXTRACT(EPOCH FROM (MAX(p.part_end) - MIN(p.part_start))) AS total_seconds
    FROM raid_sessions s
    JOIN raids r ON s.raid_id = r.raid_id
    JOIN session_parts p ON s.session_id = p.session_id
    LEFT JOIN encounter_completions c ON p.part_id = c.part_id
    LEFT JOIN loot l ON p.part_id = l.part_id
    WHERE s.session_id = $1
    GROUP BY s.session_id, r.raid_name;
  ", params = list(session_id))
}

# ======================================================================
# New helper functions for raid session handling and time deltas
# ======================================================================

get_session_id <- function(raid_abbr, year, week) {
  con <- connect_db()
  query <- glue::glue("
    SELECT rs.session_id
    FROM raid_sessions rs
    JOIN raids r ON rs.raid_id = r.raid_id
    WHERE r.raid_abbreviation = '{raid_abbr}'
      AND rs.year = {year}
      AND rs.week_number = {week}
    LIMIT 1;
  ")
  result <- DBI::dbGetQuery(con, query)
  DBI::dbDisconnect(con)
  if (nrow(result) == 0) return(NULL)
  return(result$session_id[1])
}

get_raid_span <- function(session_id) {
  con <- connect_db()
  query <- glue::glue("
    SELECT MIN(part_start) AS start_time, MAX(part_end) AS end_time
    FROM session_parts
    WHERE session_id = '{session_id}';
  ")
  span <- DBI::dbGetQuery(con, query)
  DBI::dbDisconnect(con)
  if (nrow(span) == 0 || is.na(span$start_time) || is.na(span$end_time)) {
    return(NULL)
  }
  return(list(
    start_time = as.POSIXct(span$start_time, tz = "UTC"),
    end_time = as.POSIXct(span$end_time, tz = "UTC")
  ))
}

get_boss_delta <- function(session_id, boss_b, boss_a = NULL) {
  con <- connect_db()
  get_boss_ts <- function(boss) {
    boss_safe <- gsub("'", "''", boss)
    q <- glue::glue("
      SELECT MIN(c.completion_time) AS kill_time
      FROM encounter_completions c
      JOIN session_parts p ON c.part_id = p.part_id
      JOIN encounters e ON c.encounter_id = e.encounter_id
      WHERE p.session_id = '{session_id}'
        AND e.encounter_name = '{boss_safe}'
        AND c.is_kill = TRUE;
    ")
    res <- DBI::dbGetQuery(con, q)
    if (nrow(res) == 0 || is.na(res$kill_time[1])) return(NA)
    return(as.POSIXct(res$kill_time[1], tz = "UTC"))
  }
  b_time <- get_boss_ts(boss_b)
  if (is.null(boss_a)) {
    span <- get_raid_span(session_id)
    a_time <- span$start_time
  } else {
    a_time <- get_boss_ts(boss_a)
  }
  DBI::dbDisconnect(con)
  if (is.na(b_time) || is.na(a_time)) return(NA)
  return(as.numeric(difftime(b_time, a_time, units = "secs")))
}

session_has_wipes <- function(session_id) {
  con <- connect_db()
  query <- "
    SELECT SUM(c.wipes) AS total_wipes
    FROM encounter_completions c
    JOIN session_parts p ON c.part_id = p.part_id
    WHERE p.session_id = $1;
  "
  res <- DBI::dbGetQuery(con, query, params = list(session_id))
  DBI::dbDisconnect(con)
  total_wipes <- ifelse(is.na(res$total_wipes[1]), 0, res$total_wipes[1])
  return(total_wipes > 0)
}

get_boss_wipes <- function(session_id, boss) {
  con <- connect_db()
  boss_safe <- gsub("'", "''", boss)
  query <- glue::glue("
    SELECT SUM(c.wipes) AS total_wipes
    FROM encounter_completions c
    JOIN session_parts p ON c.part_id = p.part_id
    JOIN encounters e ON c.encounter_id = e.encounter_id
    WHERE p.session_id = '{session_id}'
      AND e.encounter_name = '{boss_safe}';
  ")
  res <- DBI::dbGetQuery(con, query)
  DBI::dbDisconnect(con)
  if (nrow(res) == 0 || is.na(res$total_wipes[1])) return(0)
  return(as.integer(res$total_wipes[1]))
}

get_loot_count_by_rarity <- function(session_id, rarity) {
  con <- connect_db()
  rarity_safe <- gsub("'", "''", rarity)
  query <- glue::glue("
    SELECT COUNT(*) AS count
    FROM loot l
    JOIN session_parts p ON l.part_id = p.part_id
    WHERE p.session_id = '{session_id}'
      AND l.item_rarity = '{rarity_safe}';
  ")
  res <- DBI::dbGetQuery(con, query)
  DBI::dbDisconnect(con)
  if (nrow(res) == 0 || is.na(res$count[1])) return(0)
  return(as.integer(res$count[1]))
}

# ----------------------------------------------------------
# New: Get boss kill time and time with comparison
# ----------------------------------------------------------
get_boss_time <- function(session_id, boss_name) {
  con <- connect_db()
  boss_safe <- gsub("'", "''", boss_name)
  query <- glue::glue("
    SELECT MIN(c.completion_time) AS kill_time
    FROM encounter_completions c
    JOIN session_parts p ON c.part_id = p.part_id
    JOIN encounters e ON c.encounter_id = e.encounter_id
    WHERE p.session_id = '{session_id}'
      AND e.encounter_name = '{boss_safe}'
      AND c.is_kill = TRUE;
  ")
  res <- DBI::dbGetQuery(con, query)
  DBI::dbDisconnect(con)
  if (nrow(res) == 0 || is.na(res$kill_time[1])) return("-")
  return(format(as.POSIXct(res$kill_time[1], tz = "UTC"), "%H:%M:%S"))
}

get_boss_time_with_comparison <- function(session_id, boss_b, boss_a = NULL) {
  delta <- get_boss_delta(session_id, boss_b, boss_a)
  if (is.na(delta)) return("-")
  formatted <- sprintf("%d:%02d", floor(delta / 60), round(delta %% 60))
  return(formatted)
}

# ----------------------------------------------------------
# Get detailed loot for presentation
# ----------------------------------------------------------
get_loot_details <- function(con, session_id) {
  dbGetQuery(con, "
    SELECT 
      l.item_name,
      l.item_rarity,
      l.player_name,
      COALESCE(l.item_quantity, 1) AS item_quantity,
      COALESCE(l.traded_from, '') AS traded_from,
      p.part_number,
      l.loot_id
    FROM loot l
    JOIN session_parts p ON l.part_id = p.part_id
    WHERE p.session_id = $1
    ORDER BY p.part_number ASC, l.player_name ASC;
  ", params = list(session_id))
}
# ==========================================================
# Loot-related count queries (Query Layer)
# ==========================================================

# Count total loot items in a given session
get_total_loot_count_q <- function(con, session_id) {
  dbGetQuery(con, "
    SELECT COUNT(*) AS total_loot
    FROM loot l
    JOIN session_parts p ON l.part_id = p.part_id
    WHERE p.session_id = $1;
  ", params = list(session_id))
}

# Count how many of a specific rarity were looted
get_loot_count_by_rarity_q <- function(con, session_id, rarity) {
  dbGetQuery(con, "
    SELECT COUNT(*) AS rarity_count
    FROM loot l
    JOIN session_parts p ON l.part_id = p.part_id
    WHERE p.session_id = $1
      AND l.item_rarity = $2;
  ", params = list(session_id, rarity))
}

# Count how many times a specific item was looted
get_item_count_q <- function(con, session_id, item_name) {
  dbGetQuery(con, "
    SELECT COUNT(*) AS item_count
    FROM loot l
    JOIN session_parts p ON l.part_id = p.part_id
    WHERE p.session_id = $1
      AND l.item_name = $2;
  ", params = list(session_id, item_name))
}
