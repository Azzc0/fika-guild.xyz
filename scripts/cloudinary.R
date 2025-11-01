# ================================================================
#  Fika Guild - Cloudinary Sync + Remote Check
#  Uploads new/changed files and can check for orphaned remote files.
#  Supports both images and videos.
# ================================================================

# ---- Library setup ----
if (!require("httr")) install.packages("httr")
if (!require("jsonlite")) install.packages("jsonlite")
if (!require("digest")) install.packages("digest")
if (!require("dotenv")) install.packages("dotenv")

library(httr)
library(jsonlite)
library(digest)
library(dotenv)

# ---- Load environment ----
load_dot_env(".env")

cloud_name <- Sys.getenv("CLOUDINARY_CLOUD_NAME")
api_key    <- Sys.getenv("CLOUDINARY_API_KEY")
api_secret <- Sys.getenv("CLOUDINARY_API_SECRET")

if (cloud_name == "" || api_key == "" || api_secret == "") {
  stop("❌ Missing Cloudinary credentials in .env file.")
}

# Base URLs for both image and video uploads
base_image_upload_url <- paste0("https://api.cloudinary.com/v1_1/", cloud_name, "/image/upload")
base_video_upload_url <- paste0("https://api.cloudinary.com/v1_1/", cloud_name, "/video/upload")
base_admin_url  <- paste0("https://api.cloudinary.com/v1_1/", cloud_name, "/resources")
cdn_folder <- "cdn"

# ---- Helper: compute file hash ----
hash_file <- function(path) digest(file = path, algo = "sha1")

# ---- Helper: upload a single file ----
upload_file_cloudinary <- function(file_path, public_id) {
  message("📤 Uploading ", file_path)
  
  # Determine resource type based on file extension
  file_ext <- tolower(tools::file_ext(file_path))
  image_exts <- c("jpg", "jpeg", "png", "gif", "webp", "bmp", "svg")
  video_exts <- c("mp4", "webm", "mov", "avi", "mkv")
  
  if (file_ext %in% image_exts) {
    base_url <- base_image_upload_url
    resource_type <- "image"
  } else if (file_ext %in% video_exts) {
    base_url <- base_video_upload_url
    resource_type <- "video"
  } else {
    warning("⚠️ Unsupported file type: ", file_ext, " for ", basename(file_path))
    return(invisible(NULL))
  }

  timestamp <- as.integer(Sys.time())
  params <- list(
    overwrite = "true",
    public_id = public_id,
    timestamp = timestamp,
    unique_filename = "false",
    use_filename = "true"
  )

  # Build the string to sign in alphabetical order of keys
  string_to_sign <- paste(
    paste0(names(params), "=", params),
    collapse = "&"
  )
  string_to_sign <- paste0(string_to_sign, api_secret)

  signature <- digest::digest(string_to_sign, algo = "sha1", serialize = FALSE)

  res <- httr::POST(
    base_url,
    body = c(params,
             list(
               file = httr::upload_file(file_path),
               api_key = api_key,
               signature = signature
             )),
    encode = "multipart"
  )

  if (httr::status_code(res) >= 300) {
    warning("⚠️ Upload failed for ", basename(file_path),
            " (HTTP ", httr::status_code(res), ")")
    msg <- tryCatch(
      httr::content(res, as = "text", encoding = "UTF-8"),
      error = function(e) "<no response body>"
    )
    message("Response from Cloudinary:\n", msg)
  } else {
    parsed <- jsonlite::fromJSON(httr::content(res, as = "text", encoding = "UTF-8"))
    message("✅ Uploaded: ", parsed$secure_url)
  }

  invisible(res)
}

# ---- Helpers to list remote/local ----
get_remote_files <- function() {
  # Get both images and videos
  image_url <- paste0(base_admin_url, "/image/upload")
  video_url <- paste0(base_admin_url, "/video/upload")
  
  # Get images
  res_img <- GET(image_url, authenticate(api_key, api_secret))
  stop_for_status(res_img)
  dat_img <- fromJSON(content(res_img, "text", encoding = "UTF-8"))$resources
  
  # Get videos
  res_vid <- GET(video_url, authenticate(api_key, api_secret))
  stop_for_status(res_vid)
  dat_vid <- fromJSON(content(res_vid, "text", encoding = "UTF-8"))$resources
  
  # Combine both
  images <- if (length(dat_img) > 0) {
    data.frame(public_id = dat_img$public_id,
               format = dat_img$format,
               url = dat_img$secure_url,
               resource_type = "image",
               stringsAsFactors = FALSE)
  } else {
    data.frame(public_id = character(), format = character(), 
               url = character(), resource_type = character())
  }
  
  videos <- if (length(dat_vid) > 0) {
    data.frame(public_id = dat_vid$public_id,
               format = dat_vid$format,
               url = dat_vid$secure_url,
               resource_type = "video",
               stringsAsFactors = FALSE)
  } else {
    data.frame(public_id = character(), format = character(), 
               url = character(), resource_type = character())
  }
  
  rbind(images, videos)
}

get_local_files <- function(base_path = cdn_folder) {
  files <- list.files(base_path, recursive = TRUE, full.names = TRUE)
  data.frame(
    path = gsub(paste0("^", base_path, "/"), "", files),
    hash = sapply(files, hash_file, USE.NAMES = FALSE),
    full = files,
    stringsAsFactors = FALSE
  )
}

# ---- Main Sync / Check function ----
sync_cloudinary <- function(mode = c("sync", "check")) {
  mode <- match.arg(mode)
  local <- get_local_files()
  remote <- get_remote_files()

  local_ids  <- tools::file_path_sans_ext(local$path)
  remote_ids <- remote$public_id

  if (mode == "sync") {
    cache_path <- file.path("private", "cloudinary_cache.json")
    if (file.exists(cache_path)) {
      cache <- fromJSON(cache_path)
    } else {
      cache <- data.frame(path = character(), hash = character())
    }

    merged <- merge(local[, c("path","hash")], cache, by="path", all.x=TRUE, suffixes=c("","_old"))
    changed <- merged[is.na(merged$hash_old) | merged$hash != merged$hash_old, ]

    if (nrow(changed) == 0) {
      message("✅ Nothing new to upload.")
    } else {
      for (p in changed$path) {
        full_path <- file.path(cdn_folder, p)
        public_id <- tools::file_path_sans_ext(p)
        upload_file_cloudinary(full_path, public_id)
      }
      write(toJSON(local[, c("path","hash")], pretty=TRUE, auto_unbox=TRUE), cache_path)
    }
  }

  if (mode == "check") {
    orphaned <- setdiff(remote_ids, local_ids)
    if (length(orphaned) == 0) {
      message("✅ No remote-only files found.")
      return(invisible())
    }

    message("⚠️ Found ", length(orphaned), " files present in Cloudinary but missing locally:")
    print(orphaned)

    choice <- readline("Type 'd' to delete, 'dl' to download, or Enter to skip: ")

    if (choice == "d") {
      for (id in orphaned) {
        # Determine resource type for deletion
        resource_type <- remote[remote$public_id == id, "resource_type"]
        url <- paste0(base_admin_url, "/", resource_type, "/upload/", id)
        DELETE(url, authenticate(api_key, api_secret))
        message("🗑️ Deleted ", id, " (", resource_type, ")")
      }
    } else if (choice == "dl") {
      for (id in orphaned) {
        rec <- remote[remote$public_id == id, ]
        local_path <- file.path(cdn_folder, paste0(id, ".", rec$format))
        dir.create(dirname(local_path), recursive = TRUE, showWarnings = FALSE)
        download.file(rec$url, local_path, mode = "wb")
        message("⬇️ Downloaded ", local_path, " (", rec$resource_type, ")")
      }
    } else {
      message("🚫 Skipped remote-only files.")
    }
  }

  message("✅ Done.")
}

# ---- Auto-run if sourced directly ----
if (sys.nframe() == 0) {
  sync_cloudinary("sync")
}