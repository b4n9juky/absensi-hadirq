#!/bin/sh
set -e

DOMAIN="absensi.mbu.sch.id"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
CERT_DIR2="/etc/letsencrypt/live/$DOMAIN-0001"

if [ ! -f "$CERT_DIR/fullchain.pem" ] && [ ! -f "$CERT_DIR2/fullchain.pem" ]; then
  echo "No SSL cert found for $DOMAIN — generating self-signed fallback..."
  mkdir -p "$CERT_DIR2"
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$CERT_DIR2/privkey.pem" \
    -out "$CERT_DIR2/fullchain.pem" \
    -subj "/CN=$DOMAIN"
elif [ -f "$CERT_DIR/fullchain.pem" ] && [ ! -f "$CERT_DIR2/fullchain.pem" ]; then
  echo "Migrating cert from $CERT_DIR to $CERT_DIR2..."
  mkdir -p "$CERT_DIR2"
  cp -L "$CERT_DIR/fullchain.pem" "$CERT_DIR2/fullchain.pem"
  cp -L "$CERT_DIR/privkey.pem" "$CERT_DIR2/privkey.pem"
fi

exec nginx -g "daemon off;"
