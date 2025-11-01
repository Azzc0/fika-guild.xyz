# =========================================================
# FIKA GUILD PROJECT - 05_queries.R (Raid Span–Aware Model)
# =========================================================
library(DBI)
library(dplyr)
library(lubridate)
library(glue)
library(purrr)
library(tibble)
library(stringr)
library(here)

if (!exists("WEEK_CACHE")) WEEK_CACHE <- list()

# ---------------------------------------------------------
# Helper: Resolve the full raid span (across all sessions)
# ---------------------------------------------------------
get_raid_span <- function(con, raid_id) {
  res <- dbGetQuery(con, glue("
    SELECT
      MIN(sp.part_start) AS raid_start,
      MAX(sp.part_end)   AS raid_end
    FROM session_parts sp
    JOIN raid_sessions rs ON sp.session_id = rs.session_id
    WHERE rs.raid_id = '{raid_id}';
  "))
  list(
    raid_start = as.POSIXct(res$raid_start[1], tz = "UTC"),
    raid_end   = as.POSIXct(res$raid_end[1], tz = "UTC")
  )
}

# ---------------------------------------------------------
# MASTER: Prepare and cache all week data
# ---------------------------------------------------------
prepare_week_data <- function(year, week, include_history = NULL) {
  con <- connect_db()
  on.exit(DBI::dbDisconnect(con), add = TRUE)

  if (is.null(include_history)) {
    # Include all prior weeks across years (not future)
    available_weeks <- dbGetQuery(con, glue("
      SELECT DISTINCT year, week_number
      FROM raid_sessions
      WHERE (year < {year}) OR (year = {year} AND week_number <= {week})
      ORDER BY year, week_number;
    "))
    target_weeks <- sprintf("%04dW%02d", available_weeks$year, available_weeks$week_number)
  } else {
    target_weeks <- sprintf("%04dW%02d", year, seq(week - include_history, week))
  }

  cli::cli_h2(paste("Preparing week data for:", paste(target_weeks, collapse = ", ")))
  for (wk in target_weeks) {
    cli::cli_alert_info(paste("Fetching data for", wk))
    WEEK_CACHE[[wk]] <<- fetch_week_data(con, wk)
  }

  invisible(WEEK_CACHE)
}

# ---------------------------------------------------------
# Fetch all raids, bosses, and loot for a specific week
# ---------------------------------------------------------
fetch_week_data <- function(con, week_key) {
  year <- as.numeric(str_sub(week_key, 1, 4))
  week <- as.numeric(str_sub(week_key, 6, 7))

  sessions <- dbGetQuery(con, glue("
    SELECT
      rs.session_id, rs.raid_id,
      r.raid_abbreviation AS raid_abbr,
      r.raid_name,
      rs.week_number AS week,
      rs.year,
      rs.was_cleared,
      rs.irrelevant
    FROM raid_sessions rs
    JOIN raids r ON rs.raid_id = r.raid_id
    WHERE rs.year = {year} AND rs.week_number = {week}
    ORDER BY r.raid_name;
  "))

  if (nrow(sessions) == 0)
    return(list(meta = list(year = year, week = week, prepared_at = Sys.time())))

  raids <- list()

  for (i in seq_len(nrow(sessions))) {
    s <- sessions[i, ]
    session_id <- s$session_id
    raid_id <- s$raid_id

    # --- Determine full raid span across sessions ---
    parts <- dbGetQuery(con, glue("
      SELECT part_start, part_end
      FROM session_parts
      WHERE session_id = '{session_id}'
      ORDER BY part_start;
    "))

    if (nrow(parts) == 0) {
      raid_start <- NA
      raid_end <- NA
      total_duration <- NA_real_
    } else {
      raid_start <- min(parts$part_start, na.rm = TRUE)
      raid_end <- max(parts$part_end, na.rm = TRUE)
      total_duration <- sum(as.numeric(difftime(parts$part_end, parts$part_start, units = "secs")), na.rm = TRUE)
    }

    # --- Fetch all parts for this session ---
    parts <- dbGetQuery(con, glue("
      SELECT part_id, part_start, part_end
      FROM session_parts
      WHERE session_id = '{session_id}'
      ORDER BY part_id;
    "))

    if (nrow(parts) == 0) {
      cli::cli_alert_warning(paste("No session_parts for", session_id))
      next
    }

    # Ensure parts are sequential and cumulative offsets are well defined
    parts <- parts %>%
      arrange(part_id) %>%
      mutate(
        part_duration = as.numeric(difftime(part_end, part_start, units = "secs")),
        cumulative_offset = c(0, cumsum(head(part_duration, -1)))
      )

    # --- Boss completions ---
    bosses <- dbGetQuery(con, glue("
      SELECT
        e.encounter_name AS boss_name,
        ec.part_id,
        ec.is_kill,
        ec.wipes,
        ec.completion_time
      FROM encounter_completions ec
      JOIN encounters e ON ec.encounter_id = e.encounter_id
      JOIN session_parts sp ON ec.part_id = sp.part_id
      WHERE sp.session_id = '{session_id}'
      ORDER BY ec.completion_time;
    "))

    if (nrow(bosses) > 0) {
      bosses <- bosses %>%
        left_join(parts %>% select(part_id, part_start, cumulative_offset), by = "part_id") %>%
        mutate(
          local_seconds = as.numeric(difftime(completion_time, part_start, units = "secs")),
          elapsed_seconds = cumulative_offset + local_seconds
        ) %>%
        mutate(
          elapsed_seconds = ifelse(is.na(elapsed_seconds) | elapsed_seconds < 0, 0, elapsed_seconds),
          local_seconds = ifelse(is.na(local_seconds) | local_seconds < 0, 0, local_seconds)
        ) %>%
        select(-part_start, -cumulative_offset)
    } else {
      bosses <- tibble(
        boss_name = character(),
        part_id = integer(),
        is_kill = logical(),
        wipes = numeric(),
        completion_time = as.POSIXct(character()),
        elapsed_seconds = numeric(),
        local_seconds = numeric()
      )
    }

    # --- Loot ---
    loot <- dbGetQuery(con, glue("
      SELECT l.item_name, l.item_rarity, l.player_name, l.part_id
      FROM loot l
      JOIN session_parts sp ON l.part_id = sp.part_id
      WHERE sp.session_id = '{session_id}'
      ORDER BY l.part_id;
    "))

    # Getting metadata, turtlog and vod links for presentation
    parts <- dbGetQuery(con, glue("
      SELECT part_id, part_number, part_start, part_end, 
            raidhelper, raidres, turtlogs, vod_link
      FROM session_parts
      WHERE session_id = '{session_id}'
      ORDER BY part_id;
    "))

    # Store links metadata
    links_metadata <- parts %>%
      select(part_number, turtlogs, vod_link) %>%
      filter(!is.na(turtlogs) | !is.na(vod_link))

    if (nrow(links_metadata) == 0) {
      links_metadata <- NULL
    }

    loot_summary <- if (nrow(loot) == 0) list(
      total_loot = 0,
      rarity_counts = tibble(),
      frequency = tibble()
    ) else list(
      total_loot = nrow(loot),
      rarity_counts = loot %>% count(item_rarity, name = "count"),
      frequency = loot %>% count(item_name, name = "count")
    )

    raids[[s$raid_abbr]] <- list(
      session_id = session_id,
      raid_id = raid_id,
      raid_name = s$raid_name,
      was_cleared = s$was_cleared,
      irrelevant = s$irrelevant,
      raid_start = raid_start,
      raid_end = raid_end,
      total_duration = total_duration,
      bosses = bosses,
      loot = loot,
      loot_summary = loot_summary,
      links = links_metadata
    )
  }

  list(
    meta = list(
      year = year, week = week, prepared_at = Sys.time(),
      total_raids = nrow(sessions)
    ),
    raids = raids
  )
}

# ---------------------------------------------------------
# Utility: Get raid/session data
# ---------------------------------------------------------
get_session_id <- function(raid_abbr, year, week) {
  key <- sprintf("%04dW%02d", year, week)
  wk <- WEEK_CACHE[[key]]
  if (is.null(wk)) stop("Week not loaded: ", key)
  wk$raids[[raid_abbr]]$session_id
}

get_raid_data <- function(raid_abbr, year, week) {
  key <- sprintf("%04dW%02d", year, week)
  wk <- WEEK_CACHE[[key]]
  if (is.null(wk)) stop("Week not loaded: ", key)
  wk$raids[[raid_abbr]]
}

get_session_id_cached <- function(raid_abbr, year, week) {
  key <- sprintf("%04dW%02d", year, week)
  wk <- WEEK_CACHE[[key]]
  if (is.null(wk)) {
    warning("Week not loaded: ", key); return(NULL)
  }
  raid <- wk$raids[[raid_abbr]]
  if (is.null(raid)) return(NULL)
  raid$session_id
}

get_global_loot_frequency <- function() {
  all_loot <- map(WEEK_CACHE, ~ .x$raids) %>%
    compact() %>%
    map(~ map(.x, "loot")) %>%
    flatten() %>%
    bind_rows()
  if (nrow(all_loot) == 0) return(tibble(item_name = character(), count = integer()))
  all_loot %>% count(item_name, name = "count") %>% arrange(desc(count))
}
