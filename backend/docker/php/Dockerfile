FROM php:8.2-apache

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        unixodbc \
        unixodbc-dev \
        libzip-dev \
        zip \
    && docker-php-ext-install pdo pdo_mysql odbc \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN a2enmod rewrite

WORKDIR /var/www/html
