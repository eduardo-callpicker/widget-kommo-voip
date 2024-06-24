#!/bin/bash

# Name of the output ZIP file
ZIP_FILE="widget.zip"

# Directory to compress
DIRECTORY="."

# List of files to exclude
EXCLUDE_FILES=(
  "create_zip.sh"
  ".gitignore"
  ".git/*"
  "*.DS_Store"
)

# Build the exclusion argument for the zip command
EXCLUDE_ARGS=""
for FILE in "${EXCLUDE_FILES[@]}"; do
  EXCLUDE_ARGS="$EXCLUDE_ARGS -x \"$FILE\""
done

# Remove the existing ZIP file if it exists
if [ -f "$ZIP_FILE" ]; then
  rm "$ZIP_FILE"
fi

# Create the ZIP file excluding the specified files
eval zip -r "$ZIP_FILE" "$DIRECTORY" $EXCLUDE_ARGS
