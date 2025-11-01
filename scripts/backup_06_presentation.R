# =========================================================
# FIKA GUILD PROJECT - Presentation Layer (Pure)
# =========================================================
# Provides user-facing summaries, reports, and comparisons.
# This script performs *no SQL*; all data is fetched via 05_queries.R
# =========================================================

library(cli)
library(dplyr)
library(lubridate)
library(here)
library(glue)
library(htmltools)
source(here("scripts", "05_queries.R"))

# ----------------------------------------------------------
# Display session summary
# ----------------------------------------------------------
present_session_summary <- function(con, session_id) {
  data <- get_session_summary_data(con, session_id)
  if (nrow(data) == 0) {
    cli_alert_warning(paste("No data found for session:", session_id))
    return(invisible(NULL))
  }

  d <- data[1, ]
  duration_minutes <- round(d$total_seconds / 60, 1)

  cli_h2(paste("Session Summary:", d$raid_name, "-", d$session_id))
  cli_alert_info(paste("Duration:", duration_minutes, "minutes"))
  cli_alert_info(paste("Parts:", d$total_parts))
  cli_alert_success(paste("Kills:", d$total_kills,
                          "| Wipes:", d$total_wipes,
                          "| Loot:", d$loot_count))
  cli_end()

  invisible(d)
}

# ----------------------------------------------------------
# Display raid clear time (derived dynamically)
# ----------------------------------------------------------
present_raid_clear_time <- function(con, raid_abbr, session_id) {
  data <- get_raid_clear_time(con, raid_abbr, session_id)
  if (nrow(data) == 0) {
    cli_alert_info(paste("No clear data available for raid:", raid_abbr))
    return(invisible(NULL))
  }

  d <- data[1, ]
  clear_minutes <- round(d$clear_seconds / 60, 1)

  cli_h2(paste("Raid Clear Time for", d$raid_name))
  cli_alert_info(paste("Started:", format(d$raid_start, "%Y-%m-%d %H:%M")))
  cli_alert_info(paste("Cleared:", format(d$clear_time, "%Y-%m-%d %H:%M")))
  cli_alert_success(paste("Time to clear:", clear_minutes, "minutes"))
  cli_end()

  invisible(d)
}

# ----------------------------------------------------------
# Display wipe summary (within session)
# ----------------------------------------------------------
present_wipe_summary <- function(con, session_id) {
  completions <- get_encounter_completions(con, session_id)
  if (nrow(completions) == 0) {
    cli_alert_info(paste("No encounter data found for session:", session_id))
    return(invisible(NULL))
  }

  summary <- completions %>%
    group_by(encounter_name) %>%
    summarise(
      total_wipes = sum(wipes, na.rm = TRUE),
      killed = any(is_kill),
      .groups = "drop"
    ) %>%
    arrange(desc(total_wipes))

  cli_h2(paste("Wipe Summary for Session:", session_id))
  cli_alert_info("Wipes and kill status per encounter:")
  print(summary)
  cli_end()

  invisible(summary)
}

# ----------------------------------------------------------
# Display loot distribution summary
# ----------------------------------------------------------
present_loot_summary <- function(con, session_id) {
  loot <- get_loot(con, session_id)
  if (nrow(loot) == 0) {
    cli_alert_info(paste("No loot found for session:", session_id))
    return(invisible(NULL))
  }

  summary <- loot %>%
    group_by(player_name, item_rarity) %>%
    summarise(total_items = n(), .groups = "drop") %>%
    arrange(desc(total_items))

  cli_h2(paste("Loot Summary for Session:", session_id))
  cli_alert_info("Items grouped by player and rarity:")
  print(summary)
  cli_end()

  invisible(summary)
}

# ----------------------------------------------------------
# Display raid progression summary (across kills)
# ----------------------------------------------------------
present_raid_progression <- function(con, raid_abbr) {
  delta_data <- get_encounter_delta_summary(con, raid_abbr)
  if (nrow(delta_data) == 0) {
    cli_alert_info(paste("No progression data found for raid:", raid_abbr))
    return(invisible(NULL))
  }

  delta_data <- delta_data %>%
    arrange(delta_seconds) %>%
    mutate(delta_minutes = round(delta_seconds / 60, 1))

  cli_h2(paste("Raid Progression Summary:", raid_abbr))
  cli_alert_info("Δ from earliest raid start to each first kill:")
  print(delta_data)
  cli_end()

  invisible(delta_data)
}

# ----------------------------------------------------------
# Compare specific session to raid progression baseline
# ----------------------------------------------------------
present_session_vs_raid <- function(con, raid_abbr, session_id) {
  raid_summary <- get_encounter_delta_summary(con, raid_abbr)
  session_completions <- get_encounter_completions(con, session_id)

  if (nrow(raid_summary) == 0 || nrow(session_completions) == 0) {
    cli_alert_warning("Not enough data to compare session to raid progression.")
    return(invisible(NULL))
  }

  comparison <- raid_summary %>%
    left_join(session_completions, by = "encounter_name") %>%
    mutate(
      delta_minutes = round(delta_seconds / 60, 1),
      session_result = case_when(
        is_kill ~ "Killed",
        wipes > 0 ~ paste("Wiped", wipes, "times"),
        TRUE ~ "No attempt"
      )
    ) %>%
    select(encounter_name, delta_minutes, session_result) %>%
    arrange(delta_minutes)

  cli_h2(paste("Session vs Raid Comparison:", session_id, "→", raid_abbr))
  print(comparison)
  cli_end()

  invisible(comparison)
}

# =========================================================
# Presentation Layer Helpers
# =========================================================

# Format time deltas as "Xm Ys"
format_time_diff <- function(seconds) {
  if (is.na(seconds)) return("--")
  mins <- floor(seconds / 60)
  secs <- round(seconds %% 60)
  sprintf("%dm %02ds", mins, secs)
}

# ----------------------------------------------------------
# HTML-based helpers for time display
# ----------------------------------------------------------

format_main_time <- function(seconds) {
  if (is.na(seconds)) return(HTML("--"))
  hours <- floor(seconds / 3600)
  mins  <- floor((seconds %% 3600) / 60)
  secs  <- floor(seconds %% 60)
  
  time_str <- if (hours > 0) {
    sprintf("%02d:%02d:%02d", hours, mins, secs)
  } else {
    sprintf("%02d:%02d", mins, secs)
  }
  
  tags$time(
    class = "boss-time",
    datetime = glue("PT{hours}H{mins}M{secs}S"),
    time_str
  )
}

format_comparison_time <- function(delta_seconds) {
  if (is.null(delta_seconds) || is.na(delta_seconds)) return(NULL)
  
  sign <- ifelse(delta_seconds >= 0, "+", "-")
  abs_val <- abs(delta_seconds)
  cls <- if (delta_seconds < 0) "comp faster" else "comp slower"
  
  display <- if (abs_val < 10) {
    sprintf("%s%.2f", sign, abs_val)
  } else if (abs_val < 60) {
    sprintf("%s%.0f", sign, abs_val)
  } else {
    mins <- floor(abs_val / 60)
    secs <- floor(abs_val %% 60)
    sprintf("%s%02d:%02d", sign, mins, secs)
  }
  
  tags$time(
    class = cls,
    datetime = glue("PT{round(abs_val,2)}S"),
    display
  )
}

# ----------------------------------------------------------
# Get boss time (from raid start)
# ----------------------------------------------------------
get_boss_time <- function(session_id, boss) {
  delta <- get_boss_delta(session_id, boss)
  if (is.na(delta)) return("--")
  as.character(format_main_time(delta))
}

# ----------------------------------------------------------
# Get boss time with HTML comparison
# ----------------------------------------------------------
get_boss_time_with_comparison <- function(session_id, boss_b, boss_a = NULL) {
  delta_b <- get_boss_delta(session_id, boss_b)
  if (is.na(delta_b)) return(HTML(""))
  
  delta_a <- if (is.null(boss_a)) 0 else get_boss_delta(session_id, boss_a)
  delta_diff <- delta_b - delta_a
  
  base_html <- format_main_time(delta_b)
  comp_html <- if (!is.null(boss_a)) format_comparison_time(delta_diff) else NULL
  
  if (!is.null(comp_html)) {
    HTML(paste0(as.character(base_html), " (", as.character(comp_html), ")"))
  } else {
    base_html
  }
}

# ----------------------------------------------------------
# Get total raid duration (HTML version with comparison)
# ----------------------------------------------------------
get_raid_duration_with_comparison <- function(session_id, reference_session_id = NULL) {
  span <- get_raid_span(session_id)
  if (is.null(span)) return(HTML("--"))
  
  duration <- as.numeric(difftime(span$end_time, span$start_time, units = "secs"))
  base_html <- format_main_time(duration)
  
  if (is.null(reference_session_id)) return(base_html)
  
  ref_span <- get_raid_span(reference_session_id)
  if (is.null(ref_span)) return(base_html)
  
  ref_duration <- as.numeric(difftime(ref_span$end_time, ref_span$start_time, units = "secs"))
  delta <- duration - ref_duration
  
  comp_html <- format_comparison_time(delta)
  
  HTML(paste0(as.character(base_html), " (", as.character(comp_html), ")"))
}

# ----------------------------------------------------------
# Create markdown loot table for presentation
# ----------------------------------------------------------
create_loot_table <- function(session_id, priority_list = NULL, exclude_list = NULL, max_items = 4) {
  con <- connect_db()
  loot <- get_loot_details(con, session_id)
  DBI::dbDisconnect(con)
  
  if (nrow(loot) == 0) {
    return("Inget loot registrerat för denna räd.")
  }
  
  if (!is.null(exclude_list) && length(exclude_list) > 0) {
    loot <- loot[!loot$item_name %in% exclude_list, ]
  }
  if (nrow(loot) == 0) {
    return("Inget visningsbart loot (alla föremål exkluderade).")
  }
  
  rarity_order <- c("Legendary" = 6, "Epic" = 5, "Rare" = 4,
                    "Uncommon" = 3, "Common" = 2, "Poor" = 1)
  loot$rarity_value <- rarity_order[loot$item_rarity]
  loot$sort_priority <- loot$rarity_value
  
  if (!is.null(priority_list) && length(priority_list) > 0) {
    for (i in seq_along(priority_list)) {
      item <- priority_list[i]
      boost <- 200 + (length(priority_list) - i + 1)
      loot$sort_priority[loot$item_name == item] <- boost
    }
  }
  
  loot <- loot[order(-loot$rarity_value, -loot$sort_priority), ]
  loot <- head(loot, max_items)
  
  table_lines <- c(
    "| Loot | Karaktär |",
    "|------|----------|"
  )
  
  for (i in seq_len(nrow(loot))) {
    color <- switch(
      loot$item_rarity[i],
      "Legendary" = "#ff8000",
      "Epic" = "#a335ee",
      "Rare" = "#0070dd",
      "Uncommon" = "#1eff00",
      "#ffffff"
    )
    
    loot_cell <- paste0('<span style="color: ', color, ';">[',
                        loot$item_name[i], ']</span>')
    
    table_lines <- c(table_lines,
      paste0("| ", loot_cell, " | ", loot$player_name[i], " |")
    )
  }
  
  return(paste(table_lines, collapse = "\n"))
}

# ----------------------------------------------------------
# Convenience wrappers for loot counts
# ----------------------------------------------------------
get_total_loot_count <- function(session_id) {
  con <- connect_db()
  res <- get_total_loot_count_q(con, session_id)
  DBI::dbDisconnect(con)
  if (nrow(res) == 0 || is.na(res$total_loot[1])) return(0)
  return(as.integer(res$total_loot[1]))
}

get_loot_count_by_rarity <- function(session_id, rarity) {
  con <- connect_db()
  res <- get_loot_count_by_rarity_q(con, session_id, rarity)
  DBI::dbDisconnect(con)
  if (nrow(res) == 0 || is.na(res$rarity_count[1])) return(0)
  return(as.integer(res$rarity_count[1]))
}

get_item_count <- function(session_id, item_name) {
  con <- connect_db()
  res <- get_item_count_q(con, session_id, item_name)
  DBI::dbDisconnect(con)
  if (nrow(res) == 0 || is.na(res$item_count[1])) return(0)
  return(as.integer(res$item_count[1]))
}
