# scripts/07_debug.R
# ----------------------------------------------------------
# Global debug helpers
# ----------------------------------------------------------
DEBUG_TIMING <- tolower(Sys.getenv("DEBUG_TIMING", "false")) == "true"

debug_timing <- function(label, elapsed = NULL) {
  if (!DEBUG_TIMING) return(invisible(Sys.time()))

  now <- Sys.time()
  if (!is.null(elapsed)) {
    cli::cli_alert_info(paste0("[⏱ ", label, "] took ", round(elapsed, 3), "s"))
  } else {
    cli::cli_alert_info(paste0("[⏱ ", label, "]"))
  }
  invisible(now)
}
debug_log <- function(...) {
  msg <- paste(...)
  timestamp <- format(Sys.time(), "%Y-%m-%d %H:%M:%S")
  cat(paste0("[", timestamp, "] ", msg, "\n"))
}
