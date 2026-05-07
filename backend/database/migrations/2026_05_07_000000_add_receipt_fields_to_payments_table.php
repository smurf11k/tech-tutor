<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('receipt_number')->nullable()->unique()->after('transaction_id');
            $table->timestamp('receipt_issued_at')->nullable()->after('receipt_number');
            $table->timestamp('access_granted_at')->nullable()->after('receipt_issued_at');
            $table->json('provider_payload')->nullable()->after('access_granted_at');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn([
                'receipt_number',
                'receipt_issued_at',
                'access_granted_at',
                'provider_payload',
            ]);
        });
    }
};
