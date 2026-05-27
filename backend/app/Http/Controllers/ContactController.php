<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreContactMessageRequest;
use App\Mail\ContactFormMail;
use App\Models\ContactMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Mail;

class ContactController extends Controller
{
    public function store(StoreContactMessageRequest $request): JsonResponse
    {
        $data = $request->validated();

        ContactMessage::create($data);

        Mail::to(env('CONTACT_EMAIL'))->send(
            new ContactFormMail($data)
        );

        return response()->json([
            'message' => 'Thank you for your message. We will get back to you soon.',
        ], 201);
    }
}