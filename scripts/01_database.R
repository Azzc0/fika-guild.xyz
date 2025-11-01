# =========================================================
# FIKA GUILD PROJECT - Supabase Postgres Connection
# =========================================================
# Uses environment variables from .env
# Compatible with schema_v1.0.sql
# =========================================================

required_packages <- c("DBI", "RPostgres", "dotenv")

# Install missing R packages automatically
new_pkgs <- required_packages[!(required_packages %in% installed.packages()[, "Package"])]
if (length(new_pkgs)) {
  message("Installing missing packages: ", paste(new_pkgs, collapse = ", "))
  install.packages(new_pkgs, repos = "https://cran.rstudio.com")
}

# Load libraries
lapply(required_packages, library, character.only = TRUE)

# -------------------------------------------------------------------
# Ensure libpq (PostgreSQL client library) is installed
# -------------------------------------------------------------------
check_postgres_libs <- function() {
  has_pg_config <- nzchar(Sys.which("pg_config"))
  if (!has_pg_config) {
    message("ℹ️  Skipping PostgreSQL client library check (not critical).")
  }
}

check_postgres_libs()

# -------------------------------------------------------------------
# Load environment variables from nearest .env (search upward)
# -------------------------------------------------------------------
find_env_file <- function(start = getwd()) {
  dir <- normalizePath(start, winslash = "/", mustWork = TRUE)
  while (TRUE) {
    candidate <- file.path(dir, ".env")
    if (file.exists(candidate)) return(candidate)
    parent <- dirname(dir)
    if (identical(parent, dir)) return(NULL) # reached filesystem root
    dir <- parent
  }
}

env_path <- find_env_file()

if (is.null(env_path)) {
  stop("❌ No .env file found in this project or any parent folder. Please create one with your Supabase credentials.")
}

message("🔍 Loading environment variables from: ", env_path)
dotenv::load_dot_env(env_path)


# -------------------------------------------------------------------
# Construct connection parameters
# -------------------------------------------------------------------
db_host <- Sys.getenv("SUPABASE_DB_HOST")
db_port <- Sys.getenv("SUPABASE_DB_PORT", "5432")
db_name <- Sys.getenv("SUPABASE_DB_NAME")
db_user <- Sys.getenv("SUPABASE_DB_USER")
db_pass <- Sys.getenv("SUPABASE_DB_PASSWORD")

if (any(c(db_host, db_name, db_user, db_pass) == "")) {
  stop("❌ Missing one or more Supabase connection parameters in .env file.")
}

# -------------------------------------------------------------------
# Resolve IPv4 (avoid IPv6 issues on some Linux distros)
# -------------------------------------------------------------------
resolve_ipv4 <- function(host) {
  tryCatch({
    ipv4s <- system(paste("dig +short -4", host), intern = TRUE)
    ipv4s <- ipv4s[grepl("^[0-9.]+$", ipv4s)]
    if (length(ipv4s) == 0) stop("No IPv4 address found")
    ipv4s[1]
  }, error = function(e) {
    warning("⚠️ Could not resolve IPv4 address, using hostname directly: ", host)
    return(host)
  })
}

db_host_ipv4 <- resolve_ipv4(db_host)

# -------------------------------------------------------------------
# Create Supabase DB connection
# -------------------------------------------------------------------
connect_db <- function() {
  message("🔌 Connecting to Supabase Postgres ...")
  con <- DBI::dbConnect(
    RPostgres::Postgres(),
    host = db_host_ipv4,
    port = db_port,
    dbname = db_name,
    user = db_user,
    password = db_pass,
    sslmode = "require"
  )
  message("✅ Connected to Supabase database successfully.")
  return(con)
}

# -------------------------------------------------------------------
# Utility: simple health check
# -------------------------------------------------------------------
db_health_check <- function(con) {
  tryCatch({
    DBI::dbGetQuery(con, "SELECT NOW() AS server_time;")
    message("🟢 Database connection healthy.")
    TRUE
  }, error = function(e) {
    message("🔴 Database health check failed: ", e$message)
    FALSE
  })
}

# -------------------------------------------------------------------
# Generic helper functions
# -------------------------------------------------------------------
db_insert <- function(con, table, data) {
  DBI::dbWriteTable(con, table, as.data.frame(data), append = TRUE, row.names = FALSE)
}

db_insert_returning <- function(con, table, data, returning_col = "id") {
  cols <- paste(names(data), collapse = ", ")
  vals <- paste0("'", unlist(data), "'", collapse = ", ")
  query <- sprintf("INSERT INTO %s (%s) VALUES (%s) RETURNING %s;", table, cols, vals, returning_col)
  DBI::dbGetQuery(con, query)[[1]]
}

db_fetch <- function(con, query, params = list()) {
  DBI::dbGetQuery(con, DBI::sqlInterpolate(con, query, .dots = params))
}

db_disconnect <- function(con) {
  DBI::dbDisconnect(con)
  message("🔌 Disconnected from Supabase database.")
}

# -------------------------------------------------------------------
# Example usage
# -------------------------------------------------------------------
# con <- connect_db()
# db_health_check(con)
# db_disconnect(con)
