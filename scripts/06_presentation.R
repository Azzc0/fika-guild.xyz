# =========================================================
# FIKA GUILD PROJECT - 06_presentation.R (In-Memory Model)
# =========================================================
# Uses cached data from 05_queries.R (WEEK_CACHE)
# No SQL queries. All computations are in-memory.
# Produces presentation-ready summaries, formatted HTML,
# markdown tables, and comparisons.
# =========================================================

library(dplyr)
library(lubridate)
library(htmltools)
library(cli)
library(purrr)
library(glue)

# ---------------------------------------------------------
# Helper: find active week/session context
# ---------------------------------------------------------
get_active_week <- function() attr(WEEK_CACHE, "highlight_week")

# ---------------------------------------------------------
# Utility: Check if a given session has any wipes
# ---------------------------------------------------------
session_has_wipes <- function(session_id) {
  for (wk in WEEK_CACHE) {
    raids <- wk$raids
    if (is.null(raids)) next
    raid <- purrr::keep(raids, ~ .x$session_id == session_id)
    if (length(raid) == 0) next
    bosses <- raid[[1]]$bosses
    if (is.null(bosses) || nrow(bosses) == 0) return(FALSE)
    total_wipes <- sum(bosses$wipes, na.rm = TRUE)
    return(total_wipes > 0)
  }
  FALSE
}

# ---------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------
format_time_pretty <- function(seconds) {
  if (is.na(seconds) || seconds <= 0) return("–")

  seconds <- round(seconds)
  h <- seconds %/% 3600
  m <- (seconds %% 3600) %/% 60
  s <- seconds %% 60

  text <- if (h > 0)
    sprintf("%d:%02d:%02d", h, m, s)
  else
    sprintf("%02d:%02d", m, s)

  # Rough left padding to align with 2-digit hours
  if (h == 0) paste0("&nbsp;&nbsp;&nbsp;", text) else text
}

format_time_comparison <- function(diff_seconds) {
  if (is.na(diff_seconds)) return("")

  # Normalize float noise
  diff_seconds <- round(diff_seconds, 3)

  sign <- ifelse(diff_seconds < 0, "-", "+")
  abs_diff <- abs(diff_seconds)

  # Case 1: |Δ| < 10 s → show two decimals
  if (abs_diff < 10) {
    return(sprintf("%s%.2f", sign, abs_diff))
  }

  # Case 2: |Δ| ≥ 10 s → format to integer seconds
  abs_diff <- round(abs_diff)
  h <- abs_diff %/% 3600
  m <- (abs_diff %% 3600) %/% 60
  s <- abs_diff %% 60

  if (h > 0)
    sprintf("%s%d:%02d:%02d", sign, h, m, s)
  else
    sprintf("%s%d:%02d", sign, m, s)
}

# ---------------------------------------------------------
# Helper: safe accessor for elapsed-time column
# ---------------------------------------------------------
.get_elapsed_col <- function(df) {
  # prefer elapsed_seconds, fallback to delta_seconds
  if ("elapsed_seconds" %in% names(df)) return("elapsed_seconds")
  if ("delta_seconds"   %in% names(df)) return("delta_seconds")
  # nothing found
  return(NULL)
}


# ---------------------------------------------------------
# Format comparison delta:
# - if delta < 60s -> show seconds with two decimals: (+1.23s)
# - else if minutes only -> (+M:SS)
# ---------------------------------------------------------
format_delta_for_display <- function(delta_seconds) {
  format_time_comparison(delta_seconds)
}

# ---------------------------------------------------------
# Retrieve boss kill time (relative to raid start)
# - ""   => no record at all
# - "--:--:--" => attempted but not killed (is_kill == FALSE)
# - "MM:SS" or "H:MM:SS" when killed
# - Optional: append "first" indicator if include_first = TRUE
# ---------------------------------------------------------
get_boss_time <- function(session_id, boss_name, include_first = FALSE) {
  for (wk in WEEK_CACHE) {
    raids <- wk$raids
    if (is.null(raids)) next
    for (raid in raids) {
      if (is.null(raid$session_id)) next
      if (raid$session_id != session_id) next

      bosses <- raid$bosses
      if (is.null(bosses) || nrow(bosses) == 0) return("")

      # find all rows for this boss (may be multiple parts / entries)
      b_rows <- bosses[bosses$boss_name == boss_name, , drop = FALSE]
      if (nrow(b_rows) == 0) return("")

      # if the last row for this boss is not a kill -> attempted & wiped
      last_row <- b_rows[nrow(b_rows), ]

      if (!isTRUE(last_row$is_kill)) {
        # explicit attempt but not killed
        return("--:--:--")
      }

      # killed => format elapsed column value
      col <- .get_elapsed_col(b_rows)
      if (is.null(col)) {
        # no elapsed column present – defensive fallback
        return("--:--:--")
      }
      secs <- as.numeric(last_row[[col]])
      if (is.na(secs)) return("--:--:--")
      
      time_display <- format_time_pretty(secs)
      
      # Check if this is a first kill if requested
      if (include_first) {
        raid_name <- raid$raid_name
        any_prev_kill <- FALSE
        
        for (wk2 in WEEK_CACHE) {
          raids2 <- wk2$raids
          if (is.null(raids2)) next
          for (raid2 in raids2) {
            if (!identical(raid2$raid_name, raid_name)) next
            if (isTRUE(raid2$irrelevant)) next
            if (identical(raid2$session_id, session_id)) next
            
            bosses2 <- raid2$bosses
            if (is.null(bosses2) || nrow(bosses2) == 0) next
            b_rows2 <- bosses2[bosses2$boss_name == boss_name, , drop = FALSE]
            if (nrow(b_rows2) > 0) {
              last_row2 <- b_rows2[nrow(b_rows2), ]
              if (isTRUE(last_row2$is_kill)) {
                any_prev_kill <- TRUE
                break
              }
            }
          }
          if (any_prev_kill) break
        }
        
        if (!any_prev_kill) {
          return(paste0(time_display, " ", as.character(tags$span(class = "comp first", ""))))
        }
      }
      
      return(time_display)
    }
  }

  # session not found
  ""
}

# ---------------------------------------------------------
# Retrieve boss time and comparison with best/worst detection
# ---------------------------------------------------------
get_boss_time_with_comparison <- function(session_id, boss_a, boss_b = NULL) {
  # internal helper: get elapsed seconds for a boss within a specific session (NA_real_ if missing)
  get_elapsed_internal <- function(session_id, boss_name) {
    for (wk in WEEK_CACHE) {
      raids <- wk$raids
      if (is.null(raids)) next
      for (raid in raids) {
        if (raid$session_id != session_id) next
        bosses <- raid$bosses
        if (is.null(bosses) || nrow(bosses) == 0) return(NA_real_)
        b_rows <- bosses[bosses$boss_name == boss_name, , drop = FALSE]
        if (nrow(b_rows) == 0) return(NA_real_)
        last_row <- b_rows[nrow(b_rows), ]
        if (!isTRUE(last_row$is_kill)) return(NA_real_)
        col <- .get_elapsed_col(b_rows)
        if (is.null(col)) return(NA_real_)
        val <- as.numeric(last_row[[col]])
        if (is.na(val)) return(NA_real_)
        return(val)
      }
    }
    NA_real_
  }

  # --- Check if boss was attempted but not killed
  # First get the raw boss data to check is_kill status
  boss_attempted <- FALSE
  for (wk in WEEK_CACHE) {
    raids <- wk$raids
    if (is.null(raids)) next
    for (raid in raids) {
      if (raid$session_id != session_id) next
      bosses <- raid$bosses
      if (is.null(bosses) || nrow(bosses) == 0) next
      b_rows <- bosses[bosses$boss_name == boss_a, , drop = FALSE]
      if (nrow(b_rows) > 0) {
        boss_attempted <- TRUE
        last_row <- b_rows[nrow(b_rows), ]
        if (!isTRUE(last_row$is_kill)) {
          return("--:--:--")  # Attempted but not killed
        }
      }
    }
  }
  
  # --- primary time (always relative to raid start)
  t_a <- get_elapsed_internal(session_id, boss_a)
  if (is.na(t_a)) return("")  # boss not killed this week

  main_display <- format_time_pretty(t_a)

  # --- find the current raid metadata
  current_raid <- NULL
  for (wk in WEEK_CACHE) {
    raids <- wk$raids
    if (is.null(raids)) next
    for (raid in raids) {
      if (raid$session_id == session_id) {
        current_raid <- raid
        break
      }
    }
    if (!is.null(current_raid)) break
  }
  if (is.null(current_raid)) return(main_display)

  # --- boss_b given => segment logic (compare same segment across weeks)
  if (!is.null(boss_b)) {
    t_b <- get_elapsed_internal(session_id, boss_b)
    if (is.na(t_b)) {
      # boss_b not killed, no valid segment
      return(paste0(main_display, " ", as.character(tags$span(class = "comp first", ""))))
    }

    segment_current <- t_a - t_b

    # collect historical segments for the same raid (both bosses must be killed, not irrelevant)
    hist_segments <- c()
    any_prev_kill <- FALSE

    for (wk in WEEK_CACHE) {
      raids <- wk$raids
      if (is.null(raids)) next
      for (raid in raids) {
        if (!identical(raid$raid_name, current_raid$raid_name)) next
        if (isTRUE(raid$irrelevant)) next
        if (identical(raid$session_id, session_id)) next

        # find historical kills
        t_a_hist <- get_elapsed_internal(raid$session_id, boss_a)
        t_b_hist <- get_elapsed_internal(raid$session_id, boss_b)

        if (!is.na(t_a_hist)) any_prev_kill <- TRUE

        if (!is.na(t_a_hist) && !is.na(t_b_hist)) {
          hist_segments <- c(hist_segments, t_a_hist - t_b_hist)
        }
      }
    }

    # if boss_a has never been killed before anywhere
    if (!any_prev_kill) {
      return(paste0(main_display, " ", as.character(tags$span(class = "comp first", ""))))
    }

    # no prior valid segment times -> treat as first segment run
    if (length(hist_segments) == 0) {
      return(paste0(main_display, " ", as.character(tags$span(class = "comp first", ""))))
    }

    # Calculate metrics
    avg_segment <- mean(hist_segments, na.rm = TRUE)
    best_segment <- min(hist_segments, na.rm = TRUE)
    worst_segment <- max(hist_segments, na.rm = TRUE)
    delta <- segment_current - avg_segment

    # Assign class based on best/worst/faster/slower
    css_class <- if (segment_current <= best_segment) {
      "comp best"
    } else if (segment_current >= worst_segment) {
      "comp worst"
    } else if (segment_current < avg_segment) {
      "comp faster"
    } else {
      "comp slower"
    }

    delta_str <- format_delta_for_display(delta)

    return(paste0(main_display, " ", as.character(tags$span(class = css_class, delta_str))))
  }

  # --- no boss_b: single boss comparison to historical average
  hist_vals <- c()
  any_prev_kill <- FALSE

  for (wk in WEEK_CACHE) {
    raids <- wk$raids
    if (is.null(raids)) next
    for (raid in raids) {
      if (!identical(raid$raid_name, current_raid$raid_name)) next
      if (isTRUE(raid$irrelevant)) next
      if (identical(raid$session_id, session_id)) next

      t_a_hist <- get_elapsed_internal(raid$session_id, boss_a)
      if (!is.na(t_a_hist)) {
        hist_vals <- c(hist_vals, t_a_hist)
        any_prev_kill <- TRUE
      }
    }
  }

  if (!any_prev_kill || length(hist_vals) == 0) {
    return(paste0(main_display, " ", as.character(tags$span(class = "comp first", ""))))
  }

  # Calculate metrics
  avg <- mean(hist_vals, na.rm = TRUE)
  best <- min(hist_vals, na.rm = TRUE)
  worst <- max(hist_vals, na.rm = TRUE)
  delta <- t_a - avg

  # Assign class based on best/worst/faster/slower
  css_class <- if (t_a <= best) {
    "comp best"
  } else if (t_a >= worst) {
    "comp worst"
  } else if (t_a < avg) {
    "comp faster"
  } else {
    "comp slower"
  }

  delta_str <- format_delta_for_display(delta)

  return(paste0(main_display, " ", as.character(tags$span(class = css_class, delta_str))))
}

# ---------------------------------------------------------
# Retrieve total wipes for a boss in the given session:
# - returns "" when zero, otherwise the integer
# ---------------------------------------------------------
get_boss_wipes <- function(session_id, boss_name) {
  for (wk in WEEK_CACHE) {
    raids <- wk$raids
    if (is.null(raids)) next
    for (raid in raids) {
      if (raid$session_id != session_id) next
      b <- raid$bosses
      if (is.null(b) || nrow(b) == 0) return("")
      total <- sum(b$wipes[b$boss_name == boss_name], na.rm = TRUE)
      if (is.na(total) || total == 0) return("")
      return(as.integer(total))
    }
  }
  ""
}

# ---------------------------------------------------------
# Raid duration comparison (exclude active session)
# ---------------------------------------------------------
get_raid_duration_with_comparison <- function(session_id) {
  raid <- NULL
  for (wk in WEEK_CACHE)
    for (r in wk$raids)
      if (r$session_id == session_id) raid <- r
  if (is.null(raid)) return("–")

  raid_name <- raid$raid_name
  raid_time <- raid$total_duration

  # If raid not cleared, just display duration (no comparison)
  if (isFALSE(raid$was_cleared)) {
    return(format_time_pretty(raid_time))
  }

  # Gather all other cleared sessions of same raid
  all_raids <- map(WEEK_CACHE, "raids") %>%
    compact() %>%
    flatten() %>%
    keep(~ .x$raid_name == raid_name &&
         isFALSE(.x$irrelevant) &&
         .x$session_id != session_id &&
         isTRUE(.x$was_cleared))

  # No prior data → mark as first clear
  if (length(all_raids) == 0) {
    return(paste0(
      format_time_pretty(raid_time),
      " ",
      as.character(tags$span(class = "comp first", " "))
    ))
  }

  # Historical metrics
  times <- map_dbl(all_raids, "total_duration")
  avg <- mean(times)
  best <- min(times)
  worst <- max(times)

  is_best  <- raid_time <= best
  is_worst <- raid_time >= worst

  # Build CSS class logic
  if (is_best) {
    css <- "comp best"
  } else if (is_worst) {
    css <- "comp worst"
  } else if (raid_time < avg) {
    css <- "comp faster"
  } else {
    css <- "comp slower"
  }

  paste0(
    format_time_pretty(raid_time),
    " ",
    as.character(tags$span(
      class = css,
      format_time_comparison(raid_time - avg)
    ))
  )
}



# ---------------------------------------------------------
# Loot Table (session_id-based)
# ---------------------------------------------------------
create_loot_table <- function(session_id,
                              priority_list = NULL,
                              exclude_list = NULL,
                              max_items = 4) {
  for (wk in WEEK_CACHE)
    for (raid in wk$raids)
      if (raid$session_id == session_id) {
        loot <- raid$loot
        if (is.null(loot) || nrow(loot) == 0)
          return(tags$p("Inget loot registrerat för denna räd."))
        if (!is.null(exclude_list))
          loot <- loot[!loot$item_name %in% exclude_list, ]
        if (nrow(loot) == 0)
          return(tags$p("Inget visningsbart loot (alla föremål exkluderade)."))

        rarity_order <- c(
          "Legendary" = 6, "Epic" = 5, "Rare" = 4,
          "Uncommon" = 3, "Common" = 2, "Poor" = 1
        )
        loot$rarity_value <- rarity_order[loot$item_rarity]
        loot$sort_priority <- loot$rarity_value

        if (!is.null(priority_list)) {
          for (i in seq_along(priority_list)) {
            item <- priority_list[i]
            boost <- 200 + (length(priority_list) - i + 1)
            loot$sort_priority[loot$item_name == item] <- boost
          }
        }

        loot <- loot[order(-loot$sort_priority), ]
        loot <- head(loot, max_items)

        rows <- purrr::pmap(
          loot,
          function(item_name, item_rarity, player_name, ...) {
            color <- switch(
              item_rarity,
              "Legendary" = "#ff8000",
              "Epic" = "#a335ee",
              "Rare" = "#0070dd",
              "Uncommon" = "#1eff00",
              "#ffffff"
            )
            tags$tr(
              tags$td(tags$span(style = glue("color:{color}"), glue("[{item_name}]"))),
              tags$td(player_name)
            )
          }
        )

        return(tags$table(
          class = "loot-table",
          tags$thead(tags$tr(tags$th("Loot"), tags$th("Karaktär"))),
          tags$tbody(rows)
        ))
      }

  warning("Session ID not found in cache: ", session_id)
  tags$p("Räd ej hittad i cache.")
}

# ---------------------------------------------------------
# Loot Count Helpers (session_id-based)
# ---------------------------------------------------------
get_total_loot_count <- function(session_id) {
  for (wk in WEEK_CACHE)
    for (raid in wk$raids)
      if (raid$session_id == session_id) {
        loot <- raid$loot
        if (is.null(loot) || nrow(loot) == 0) return(0)
        return(nrow(loot))
      }
  warning("Session ID not found in cache: ", session_id)
  0
}

get_loot_count_by_rarity <- function(session_id, rarity) {
  for (wk in WEEK_CACHE)
    for (raid in wk$raids)
      if (raid$session_id == session_id) {
        loot <- raid$loot
        if (is.null(loot) || nrow(loot) == 0) return(0)
        return(sum(loot$item_rarity == rarity, na.rm = TRUE))
      }
  warning("Session ID not found in cache: ", session_id)
  0
}

get_item_count <- function(session_id, item_name) {
  for (wk in WEEK_CACHE)
    for (raid in wk$raids)
      if (raid$session_id == session_id) {
        loot <- raid$loot
        if (is.null(loot) || nrow(loot) == 0) return(0)
        return(sum(loot$item_name == item_name, na.rm = TRUE))
      }
  warning("Session ID not found in cache: ", session_id)
  0
}

# ---------------------------------------------------------
# Link functions using cached WEEK_CACHE data
# ---------------------------------------------------------

# Check if session has any links
session_has_links <- function(session_id) {
  for (wk in WEEK_CACHE) {
    raids <- wk$raids
    if (is.null(raids)) next
    for (raid in raids) {
      if (raid$session_id == session_id) {
        return(!is.null(raid$links) && nrow(raid$links) > 0)
      }
    }
  }
  return(FALSE)
}

# Get all Turtle WoW logs links
get_all_turtlogs_links <- function(session_id) {
  for (wk in WEEK_CACHE) {
    raids <- wk$raids
    if (is.null(raids)) next
    for (raid in raids) {
      if (raid$session_id == session_id && !is.null(raid$links)) {
        log_parts <- raid$links %>% 
          filter(!is.na(turtlogs) & turtlogs != "")
        if (nrow(log_parts) == 0) return("")
        
        log_links <- c()
        for (i in 1:nrow(log_parts)) {
          part <- log_parts[i, ]
          log_url <- paste0("https://turtlogs.com/viewer/", part$turtlogs, "/base")
          log_links <- c(log_links, sprintf("[%d](%s){.log}", part$part_number, log_url))
        }
        return(paste(log_links, collapse = " "))
      }
    }
  }
  return("")
}

# Get all VOD links
get_all_vod_links <- function(session_id) {
  for (wk in WEEK_CACHE) {
    raids <- wk$raids
    if (is.null(raids)) next
    for (raid in raids) {
      if (raid$session_id == session_id && !is.null(raid$links)) {
        vod_parts <- raid$links %>% 
          filter(!is.na(vod_link) & vod_link != "")
        if (nrow(vod_parts) == 0) return("")
        
        vod_links <- c()
        for (i in 1:nrow(vod_parts)) {
          part <- vod_parts[i, ]
          vod_links <- c(vod_links, sprintf("[%d](%s){.vod}", part$part_number, part$vod_link))
        }
        return(paste(vod_links, collapse = " "))
      }
    }
  }
  return("")
}

# ---------------------------------------------------------
# Generate raid schedule presentation markup
# ---------------------------------------------------------
# @param schedule List of raid entries with day, time, title, img
# @param cdn CDN path template (default uses Quarto meta variable)
# @return HTML/markdown string for raid schedule
# 
# Example usage:
# schedule <- list(
#   list(day = "Onsdag", time = "20:00", title = "Chill MC", img = "mc.png"),
#   list(day = "Torsdag", time = "19:30", title = "⭐Kara40", img = "returntokara.png"),
#   list(day = "Tisdag", time = "19:30", title = "⭐Naxx main", img = "naxx.png"),
#   list(day = "Tisdag", time = "22:00", title = "Naxx alt", img = "naxx.png")
# )
# schedule_presentation(schedule)
schedule_presentation <- function(schedule, cdn = "https://res.cloudinary.com/dhmmkvcpy/image/upload/q_auto,f_auto") {
  # Group raids by day while preserving order
  days_order <- unique(sapply(schedule, function(x) x$day))
  grouped <- lapply(days_order, function(d) {
    Filter(function(x) x$day == d, schedule)
  })
  names(grouped) <- days_order
  
  # Build output
  output <- c(":::: {.raid-schedule}", "")
  
  for (day in days_order) {
    raids <- grouped[[day]]
    
    # Start raid box
    output <- c(output, "::: {.raid-box}", "")
    
    # Day label (only once per box)
    output <- c(output, paste0("**", day, "**"), "")
    
    # Add each raid entry
    for (raid in raids) {
      output <- c(output, raid$title, "")
      img_path <- paste0(cdn, "/raid/", raid$img)
      output <- c(output, paste0("![", raid$time, "](", img_path, ")"), "")
    }
    
    # Close raid box
    output <- c(output, ":::", "")
  }
  
  # Close schedule container
  output <- c(output, "::::")
  
  # Return as single string for knitr
  paste(output, collapse = "\n")
}