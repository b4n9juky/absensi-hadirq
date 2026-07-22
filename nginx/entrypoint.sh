#!/bin/sh
set -e

DOMAIN="absensi.mbu.sch.id"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"

if [ ! -f "$CERT_DIR/fullchain.pem" ]; then
  echo "No SSL cert found for $DOMAIN — generating self-signed fallback..."
  mkdir -p "$CERT_DIR"
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$CERT_DIR/privkey.pem" \
    -out "$CERT_DIR/fullchain.pem" \
    -subj "/CN=$DOMAIN"
fi

exec nginx -g "daemon off;"
