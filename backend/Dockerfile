# ---------------------------
# 1. Dependencies (Composer)
# ---------------------------
FROM composer:2 AS vendor

WORKDIR /app

# Copy full Laravel app (required for artisan + scripts)
COPY . .

# Install PHP dependencies
RUN composer install \
    --no-dev \
    --prefer-dist \
    --no-interaction \
    --no-progress \
    --optimize-autoloader


# ---------------------------
# 2. Runtime (Apache + PHP)
# ---------------------------
FROM php:8.4-apache-bookworm

ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
ENV APP_ENV=production
ENV APP_DEBUG=false

# System dependencies + PHP extensions
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        ffmpeg \
        git \
        unzip \
        zip \
        libpq-dev \
        libicu-dev \
        libzip-dev \
        libonig-dev \
        libpng-dev \
        libjpeg62-turbo-dev \
        libfreetype6-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install \
        bcmath \
        exif \
        gd \
        intl \
        pcntl \
        pdo_pgsql \
        zip \
        mbstring \
    && { \
        echo 'file_uploads=On'; \
        echo 'upload_max_filesize=4096M'; \
        echo 'post_max_size=4096M'; \
        echo 'memory_limit=512M'; \
        echo 'max_execution_time=14400'; \
        echo 'max_input_time=14400'; \
    } > /usr/local/etc/php/conf.d/uploads.ini \
    && echo 'Timeout 14400' > /etc/apache2/conf-available/tech-tutor-timeout.conf \
    && a2enconf tech-tutor-timeout \
    && a2enmod rewrite headers \
    && sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

# Copy application from builder
COPY --from=vendor /app /var/www/html

# Ensure Laravel writable directories exist
RUN mkdir -p \
        storage/logs \
        storage/framework/cache \
        storage/framework/sessions \
        storage/framework/views \
        bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# IMPORTANT: fail fast if Laravel is broken
CMD ["sh", "-c", "\
php artisan config:cache && \
php artisan route:cache && \
php artisan view:cache && \
apache2-foreground"]