#!/bin/bash

# Nombre del archivo ZIP de salida
ZIP_FILE="widget.zip"

# Directorio a comprimir
DIRECTORY="."

# Lista de archivos a excluir
EXCLUDE_FILES=(
  "create_zip.sh"
  ".gitignore"
  ".git/*"
  "*.DS_Store"
)

# Construir el argumento de exclusión para el comando zip
EXCLUDE_ARGS=""
for FILE in "${EXCLUDE_FILES[@]}"; do
  EXCLUDE_ARGS="$EXCLUDE_ARGS -x \"$FILE\""
done

# Crear el archivo ZIP excluyendo los archivos especificados
eval zip -r "$ZIP_FILE" "$DIRECTORY" $EXCLUDE_ARGS
