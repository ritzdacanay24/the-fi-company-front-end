#!/usr/bin/env bash
set -euo pipefail

SITE_CONF_SRC="/var/www/html/APACHE_DASHBOARD_THE_FI_COMPANY.conf"
SITE_CONF_DST="/etc/apache2/sites-available/dashboard.the-fi-company.com.conf"
FRONTEND_ROOT="/var/www/html/dist-the-fi-company"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash /var/www/html/tasks/setup-dashboard-the-fi-company.sh"
  exit 1
fi

if [[ ! -f "${SITE_CONF_SRC}" ]]; then
  echo "Missing source config: ${SITE_CONF_SRC}"
  exit 1
fi

echo "Creating frontend root: ${FRONTEND_ROOT}"
mkdir -p "${FRONTEND_ROOT}"
chown -R www-data:www-data "${FRONTEND_ROOT}"

if [[ -f "${SITE_CONF_DST}" ]]; then
  cp "${SITE_CONF_DST}" "${SITE_CONF_DST}.bak.$(date +%Y%m%d%H%M%S)"
fi

echo "Installing site config"
cp "${SITE_CONF_SRC}" "${SITE_CONF_DST}"

echo "Enabling required Apache modules"
a2enmod ssl rewrite headers alias proxy proxy_http >/dev/null

echo "Enabling new site"
a2ensite dashboard.the-fi-company.com.conf >/dev/null

echo "Testing Apache config"
apache2ctl configtest

echo "Reloading Apache"
systemctl reload apache2

echo "Done. Next steps:"
echo "1) Deploy second frontend build into ${FRONTEND_ROOT}"
echo "2) Issue certs if needed: certbot certonly --apache -d dashboard.the-fi-company.com -d www.dashboard.the-fi-company.com"
echo "3) Enable SSL site file after certs:"
echo "   cp /var/www/html/APACHE_DASHBOARD_THE_FI_COMPANY_SSL.conf /etc/apache2/sites-available/dashboard.the-fi-company.com-ssl.conf"
echo "   a2ensite dashboard.the-fi-company.com-ssl.conf && apache2ctl configtest && systemctl reload apache2"
echo "4) Validate URLs for both old and new domain"
