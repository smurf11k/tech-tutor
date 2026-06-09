<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Contact Message</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;">
        <tr>
            <td align="center" style="padding:40px 16px;">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
                    <tr>
                        <td style="background-color:#00e574;padding:24px 32px;">
                            <h1 style="margin:0;font-size:22px;font-weight:700;color:#001a0d;letter-spacing:-0.02em;">New Contact Message</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                <tr>
                                    <td style="padding:12px 0;border-bottom:1px solid #eeeeee;">
                                        <span style="display:inline-block;width:80px;font-weight:600;color:#555555;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Name</span>
                                        <span style="color:#1a1a1a;font-size:15px;">{{ $data['name'] }}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:12px 0;border-bottom:1px solid #eeeeee;">
                                        <span style="display:inline-block;width:80px;font-weight:600;color:#555555;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Email</span>
                                        <a href="mailto:{{ $data['email'] }}" style="color:#00a854;text-decoration:none;font-size:15px;">{{ $data['email'] }}</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:12px 0;border-bottom:1px solid #eeeeee;">
                                        <span style="display:inline-block;width:80px;font-weight:600;color:#555555;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Subject</span>
                                        <span style="color:#1a1a1a;font-size:15px;">{{ $data['subject'] }}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:16px 0 0 0;">
                                        <span style="display:block;font-weight:600;color:#555555;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Message</span>
                                        <div style="background-color:#f9f9f9;border:1px solid #eeeeee;border-radius:6px;padding:16px;font-size:15px;color:#333333;line-height:1.7;white-space:pre-wrap;">{!! nl2br(e($data['message'])) !!}</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:16px 32px;background-color:#fafafa;border-top:1px solid #eeeeee;">
                            <p style="margin:0;font-size:12px;color:#888888;text-align:center;">This message was sent via the TechTutor contact form.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>