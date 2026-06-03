<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>Certificate of Completion</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap" rel="stylesheet">

    <style>
        @page {
            size: A4 landscape;
            margin: 0;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        html,
        body {
            width: 100%;
            min-height: 100vh;
            height: 210mm;
            /* A4 landscape height */
            overflow: hidden;
        }

        body {
            background: #faf8f2;
            font-family: Georgia, serif;
            color: #2e1f0e;
            display: flex;
            flex-direction: column;
        }

        .border {
            position: fixed;
            top: 8mm;
            left: 8mm;
            right: 8mm;
            bottom: 8mm;
            border: 1.5px solid #c9a96e;
            pointer-events: none;
        }

        .border-inner {
            position: fixed;
            top: 12mm;
            left: 12mm;
            right: 12mm;
            bottom: 12mm;
            border: 1px solid rgba(201, 169, 110, 0.5);
            pointer-events: none;
        }

        .content {
            flex: 1;
            padding: 40mm 30mm 10mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
        }

        .logo {
            margin-bottom: 5mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 3mm;
        }

        .logo-favicon {
            height: 25mm;
            width: auto;
        }

        .logo img {
            max-height: 25mm;
            max-width: 100mm;
        }

        .logo-text {
            font-size: 14pt;
            letter-spacing: 0.25em;
            text-transform: uppercase;
            font-weight: bold;
            color: #5a4020;
        }

        .divider {
            width: 25mm;
            height: 1px;
            background: #c9a96e;
            margin: 4mm auto 7mm;
        }

        .label {
            font-size: 10pt;
            letter-spacing: 0.4em;
            word-spacing: 0.25em;
            text-transform: uppercase;
            color: #9a7a50;
            margin-bottom: 3mm;
        }

        .title {
            font-size: 30pt;
            font-weight: normal;
            letter-spacing: 0.05em;
            margin-bottom: 6mm;
        }

        .name {
            font-size: 28pt;
            font-style: italic;
            margin-bottom: 6mm;
        }

        .course {
            font-size: 14pt;
            color: #5a4020;
            margin-top: 2mm;
        }

        .footer {
            position: absolute;
            bottom: 22mm;
            left: 22mm;
            right: 22mm;
        }

        .footer-table {
            width: 100%;
        }

        .footer-left {
            text-align: center;
            vertical-align: bottom;
            width: 50%;
        }

        .footer-right {
            text-align: center;
            vertical-align: bottom;
            width: 50%;
        }

        .footer-label {
            font-family: Georgia, serif;
            font-size: 8pt;
            letter-spacing: 0.35em;
            text-transform: uppercase;
            color: #9a7a50;
            margin-bottom: 2mm;
        }

        .footer-value {
            font-family: Georgia, serif;
            font-size: 12pt;
            color: #2e1f0e;
            margin-bottom: 2mm;
        }

        .line {
            width: 52mm;
            height: 1px;
            background: #c9a96e;
            margin: 1.5mm auto 0;
        }

        .signature-name {
            font-family: 'Dancing Script', cursive;
            font-size: 17pt;
            font-weight: 600;
            color: #2e1f0e;
            margin-bottom: 1.5mm;
        }

        .signature-role {
            font-size: 8pt;
            text-transform: uppercase;
            letter-spacing: 0.25em;
            color: #9a7a50;
            margin-bottom: 1.5mm;
        }
    </style>
</head>

<body>

    <div class="border"></div>
    <div class="border-inner"></div>

    <div class="content">

        <div class="logo">
            {{-- Favicon --}}
            @php
                $faviconPath = public_path('favicon.png');
                $faviconBase64 = file_exists($faviconPath) ? base64_encode(file_get_contents($faviconPath)) : null;
            @endphp
            @if($faviconBase64)
                <img class="logo-favicon" src="data:image/png;base64,{{ $faviconBase64 }}" alt="Logo Icon">
            @endif

            @if (!empty($logo_url))
                @php
                    $logoPath = public_path($logo_url);
                    $logoBase64 = file_exists($logoPath) ? base64_encode(file_get_contents($logoPath)) : null;
                @endphp
                @if($logoBase64)
                    <img src="data:image/png;base64,{{ $logoBase64 }}" alt="Logo">
                @endif
            @else
                <div class="logo-text">{{ $organization_name ?? 'TechTutor' }}</div>
            @endif
        </div>

        <div class="divider"></div>

        <div class="label">This is to certify that</div>
        <div class="title">Certificate of Completion</div>
        <div class="label">is proudly presented to</div>
        <div class="name">{{ $recipient_name ?? 'Recipient Name' }}</div>
        <div class="label">for successfully completing</div>
        <div class="course">{{ $course_title ?? 'Course Title' }}</div>

    </div>

    <div class="footer">
        <table class="footer-table" cellpadding="0" cellspacing="0">
            <tr>
                <td class="footer-left">
                    <div class="footer-label">Date of Completion</div>
                </td>
                <td class="footer-right">
                    <div class="footer-label">{{ $signature_role ?? 'Instructor' }}</div>
                </td>
            </tr>
            <tr>
                <td class="footer-left">
                    <div class="footer-value">
                        {{ isset($completion_date) ? \Carbon\Carbon::parse($completion_date)->format('F j, Y') : date('F j, Y') }}
                    </div>
                    <div class="line"></div>
                </td>
                <td class="footer-right">
                    <div class="signature-name">{{ $signature_name ?? 'Instructor Name' }}</div>
                    <div class="line"></div>
                </td>
            </tr>
        </table>
    </div>

</body>

</html>